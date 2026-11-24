do $$
declare
  owner_id uuid := gen_random_uuid();
  customer_id text := 'cus_fixture_' || owner_id;
  subscription_id text := 'sub_fixture_' || owner_id;
  event_prefix text := 'evt_entitlement_' || owner_id || '_';
  at timestamptz := statement_timestamp();
  term_end timestamptz := at + interval '30 days';
  usage_id uuid;
  reconciled_usage_id uuid;
  revision integer := 0;
  expected_plan text;
  expected_limit integer;
  next_status text;
begin
  begin
    insert into auth.users (id, email) values (owner_id, owner_id || '@example.test');
    insert into public.subscriptions (user_id, stripe_customer_id)
      values (owner_id, customer_id);
    if capture_private.capture_monthly_limit(owner_id, at) <> 20 then
      raise exception 'A new Stripe customer should still be Free';
    end if;

    foreach next_status in array array['active', 'past_due', 'active', 'unpaid', 'paused', 'canceled']
    loop
      if public.capture_apply_stripe_event(
        event_prefix || revision, 'fixture.subscription', customer_id, revision,
        subscription_id, 'price_fixture', next_status, term_end, true
      ) <> 'applied' then
        raise exception 'Billing state was not applied for status %', next_status;
      end if;
      revision := revision + 1;

      expected_plan := case when next_status = 'active' then 'pro' else 'free' end;
      expected_limit := case when next_status = 'active' then 300 else 20 end;
      if capture_private.capture_monthly_limit(owner_id, at) <> expected_limit
        or (select plan::text from public.subscriptions where user_id = owner_id) <> expected_plan
      then raise exception 'Incorrect entitlement for status %', next_status; end if;

      if next_status = 'active'
        and capture_private.capture_monthly_limit(owner_id, term_end) <> 20
      then raise exception 'The Pro allowance must expire at the end of the term'; end if;

      if usage_id is null then
        usage_id := capture_private.capture_usage_period(owner_id, at);
        update public.usage_periods set used = 24, reserved = 3 where id = usage_id;
      else
        reconciled_usage_id := capture_private.capture_usage_period(owner_id, at);
        if usage_id <> reconciled_usage_id
          or not exists (select 1 from public.usage_periods where id = usage_id
            and used = 24 and reserved = 3 and article_limit = greatest(expected_limit, 27))
        then raise exception 'Usage or in-flight reservations changed for %', next_status; end if;
      end if;
    end loop;

    raise sqlstate 'Z0088';
  exception when sqlstate 'Z0088' then
    raise notice 'CAP-088 entitlement transitions passed and fixtures rolled back';
  end;
end;
$$;
