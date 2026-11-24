do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  article uuid;
  job uuid;
  first_lease uuid;
  retry_lease uuid;
  event_id text := 'evt_fixture_' || gen_random_uuid();
  customer text := 'cus_fixture_' || owner_id;
  foreign_subscription text := 'sub_fixture_' || other_id;
  own_subscription text := 'sub_fixture_' || owner_id;
  event_type text := 'customer.subscription.updated';
begin
  begin
    insert into auth.users (id, email)
    values (owner_id, owner_id || '@example.test'), (other_id, other_id || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (owner_id, 'https://example.test/retry', 'https://example.test/retry',
      'Retained capture fixture', 'example.test', 'queued') returning id into article;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (owner_id, article, 'outage-fixture') returning id into job;
    insert into public.job_outbox (job_id) values (job);

    select lease_id into first_lease from public.capture_claim_dispatch(job);
    if first_lease is null or public.capture_finish_dispatch(first_lease, false) <> 1
      or exists (select 1 from public.capture_claim_dispatch(job))
    then raise exception 'Provider outage did not defer the dispatch'; end if;
    if not exists (select 1 from public.job_outbox where job_id = job and status = 'pending'
      and lease_id is null and attempts = 1 and next_attempt_at > statement_timestamp())
    then raise exception 'The outbox did not retain the deferred job'; end if;

    update public.job_outbox set next_attempt_at = statement_timestamp() where job_id = job;
    select lease_id into retry_lease from public.capture_claim_dispatch(job);
    if retry_lease is null or retry_lease = first_lease
      or public.capture_finish_dispatch(first_lease, true) <> 0
      or public.capture_finish_dispatch(retry_lease, true) <> 1
      or public.capture_finish_dispatch(retry_lease, true) <> 0
    then raise exception 'A stale lease or repeated dispatch changed the final state'; end if;
    if not exists (select 1 from public.job_outbox where job_id = job and status = 'dispatched'
      and attempts = 2 and generation = 1)
      or not exists (select 1 from public.articles where id = article and status = 'queued')
    then raise exception 'Recovering delivery changed the capture or duplicated its job'; end if;

    insert into public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id)
    values (owner_id, customer, null), (other_id, 'cus_fixture_' || other_id, foreign_subscription);
    begin
      perform public.capture_apply_stripe_event(event_id, event_type, customer, 0,
        foreign_subscription, 'price_fixture', 'active', now() + interval '30 days', false);
      raise exception 'Conflicting subscription write should have failed';
    exception when unique_violation then null;
    end;
    if exists (select 1 from public.billing_events where stripe_event_id = event_id)
      or not exists (select 1 from public.subscriptions where user_id = owner_id
        and stripe_revision = 0 and stripe_subscription_id is null and plan = 'free')
    then raise exception 'A failed billing transaction partially committed'; end if;

    if public.capture_apply_stripe_event(event_id, event_type, customer, 0,
      own_subscription, 'price_fixture', 'active', now() + interval '30 days', false) <> 'applied'
      or public.capture_apply_stripe_event(event_id, event_type, customer, 1,
        own_subscription, 'price_fixture', 'active', now() + interval '30 days', false) <> 'duplicate'
    then raise exception 'A failed billing event could not be retried exactly once'; end if;
    if not exists (select 1 from public.subscriptions where user_id = owner_id
      and stripe_revision = 1 and stripe_subscription_id = own_subscription and plan = 'pro')
      or not exists (select 1 from public.subscriptions where user_id = other_id
        and stripe_revision = 0 and stripe_subscription_id = foreign_subscription)
    then raise exception 'Billing replay changed the expected revision or a foreign subscription'; end if;
    raise sqlstate 'Z0095';
  exception when sqlstate 'Z0095' then
    raise notice 'CAP-095 retry atomicity assertions passed and fixtures rolled back';
  end;
end;
$$;
