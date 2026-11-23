alter table public.job_outbox
  add column lease_id uuid,
  add constraint job_outbox_lease_pending check (lease_id is null or status = 'pending');
create index job_outbox_lease_idx on public.job_outbox (lease_id) where lease_id is not null;

create or replace function public.capture_save_article(
  p_request_id uuid,
  p_url text,
  p_canonical_url text,
  p_domain text,
  p_title text,
  p_source text,
  p_extracted_text text default null,
  p_personal_note text default null
)
returns table (article_id uuid, processing_status public.article_status, duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved record;
  month_start timestamp := date_trunc('month', statement_timestamp() at time zone 'UTC');
  quota_period uuid;
  queued_job uuid;
begin
  if (select auth.jwt() ->> 'client_id') is not null and (
    p_source is distinct from 'chrome_extension' or
    not capture_private.is_capture_extension_session()
  ) then
    raise insufficient_privilege;
  end if;

  select * into strict saved from capture_private.capture_rate_limited_save_article(
    p_request_id, p_url, p_canonical_url, p_domain, p_title,
    p_source, p_extracted_text, p_personal_note
  );

  if saved.duplicate then
    return query select saved.article_id, saved.processing_status, true;
    return;
  end if;

  if p_source = 'chrome_extension' and not exists (
    select 1 from public.article_contents c
    where c.article_id = saved.article_id and c.user_id = owner_id
      and c.cleaned_text ~ '[^[:space:]]'
  ) then
    saved.processing_status := 'unsupported';
  else
    insert into public.usage_periods (user_id, period_start, period_end, article_limit)
    values (owner_id, month_start at time zone 'UTC',
      (month_start + interval '1 month') at time zone 'UTC', 20)
    on conflict (user_id, period_start) do nothing;

    update public.usage_periods p set reserved = p.reserved + 1
    where p.user_id = owner_id and p.period_start = month_start at time zone 'UTC'
      and p.used::bigint + p.reserved < p.article_limit
    returning p.id into quota_period;

    if quota_period is null then
      saved.processing_status := 'quota_limited';
    else
      insert into public.processing_jobs (user_id, article_id, idempotency_key)
      values (owner_id, saved.article_id, 'initial:' || saved.article_id::text)
      returning id into queued_job;
      insert into public.usage_events (user_id, usage_period_id, job_id)
      values (owner_id, quota_period, queued_job);
      insert into public.job_outbox (job_id) values (queued_job);
      saved.processing_status := 'queued';
    end if;
  end if;

  update public.articles a set status = saved.processing_status
  where a.id = saved.article_id and a.user_id = owner_id;
  return query select saved.article_id, saved.processing_status, false;
end;
$$;

-- Deleting a capture cascades to the reservation. Release only unused quota.
create function capture_private.release_deleted_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usage_periods p set reserved = p.reserved - old.units
  where p.user_id = old.user_id and p.id = old.usage_period_id and p.reserved >= old.units;
  return old;
end;
$$;
revoke execute on function capture_private.release_deleted_reservation()
  from public, anon, authenticated, service_role;

create trigger release_deleted_reservation after delete on public.usage_events
for each row when (old.state = 'reserved')
execute function capture_private.release_deleted_reservation();

create function public.capture_claim_dispatch(p_job_id uuid default null)
returns table (job_id uuid, lease_id uuid)
language sql
set search_path = ''
as $$
  with due as (
    select o.id
    from public.job_outbox o
    where o.status = 'pending' and o.next_attempt_at <= statement_timestamp()
      and (p_job_id is null or o.job_id = p_job_id)
    order by o.next_attempt_at, o.id
    limit 20
    for update skip locked
  ), lease as materialized (
    select gen_random_uuid() as id
  )
  update public.job_outbox o
  set lease_id = lease.id, attempts = o.attempts + 1,
    next_attempt_at = statement_timestamp() + interval '2 minutes'
  from due, lease
  where o.id = due.id
  returning o.job_id, o.lease_id;
$$;

create function public.capture_finish_dispatch(p_lease_id uuid, p_dispatched boolean)
returns integer
language sql
set search_path = ''
as $$
  with finished as (
    update public.job_outbox o
    set status = case when p_dispatched then 'dispatched' else 'pending' end::public.dispatch_status,
      dispatched_at = case when p_dispatched then statement_timestamp() else null end,
      next_attempt_at = case when p_dispatched then o.next_attempt_at else
        statement_timestamp() + make_interval(secs =>
          least(900, 30 * (1 << least(o.attempts - 1, 5))))
        end,
      lease_id = null
    where o.lease_id = p_lease_id and o.status = 'pending' and p_dispatched is not null
    returning 1
  )
  select count(*)::integer from finished;
$$;

revoke execute on function public.capture_claim_dispatch(uuid),
  public.capture_finish_dispatch(uuid, boolean) from public, anon, authenticated;
grant execute on function public.capture_claim_dispatch(uuid),
  public.capture_finish_dispatch(uuid, boolean) to service_role;
