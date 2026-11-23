create function capture_private.capture_monthly_limit(p_owner_id uuid, p_at timestamptz)
returns integer
language sql stable
set search_path = ''
as $$
  select case when exists (
    select 1 from public.subscriptions s
    where s.user_id = p_owner_id and s.plan = 'pro'
      and s.status in ('active', 'trialing') and s.period_end > p_at
  ) then 300 else 20 end;
$$;

create function capture_private.capture_job_limit()
returns integer
language sql immutable
set search_path = ''
as $$ select 3 $$;

revoke execute on function capture_private.capture_monthly_limit(uuid, timestamptz),
  capture_private.capture_job_limit() from public, anon, authenticated, service_role;

create or replace function capture_private.capture_usage_period(p_owner_id uuid, p_at timestamptz)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  month_start timestamp := date_trunc('month', p_at at time zone 'UTC');
  entitlement integer;
  period_id uuid;
begin
  entitlement := capture_private.capture_monthly_limit(p_owner_id, p_at);

  insert into public.usage_periods as usage (user_id, period_start, period_end, article_limit)
  values (p_owner_id, month_start at time zone 'UTC',
    (month_start + interval '1 month') at time zone 'UTC', entitlement)
  on conflict (user_id, period_start) do update
  -- Existing used units and in-flight reservations survive changes in plan.
  set article_limit = greatest(excluded.article_limit, usage.used::bigint + usage.reserved)
  returning id into period_id;
  return period_id;
end;
$$;

create or replace function public.capture_retry_article(p_article_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  article public.articles;
  quota_period uuid;
  queued_job uuid;
begin
  if owner_id is null or (select auth.jwt() ->> 'client_id') is not null or not exists (
    select 1 from auth.sessions s
    where s.id::text = (select auth.jwt() ->> 'session_id') and s.user_id = owner_id
  ) then raise insufficient_privilege; end if;

  select * into article from public.articles a where a.id = p_article_id and a.user_id = owner_id for update;
  if not found then return null; end if;
  if article.status in ('queued', 'processing') then return 'queued'; end if;
  if article.status not in ('failed', 'quota_limited') then return 'not_retryable'; end if;
  if (select count(*) from public.processing_jobs j where j.article_id = article.id) >= capture_private.capture_job_limit()
  then return 'retry_limit'; end if;

  quota_period := capture_private.capture_usage_period(owner_id, statement_timestamp());

  update public.usage_periods p set reserved = p.reserved + 1
  where p.user_id = owner_id and p.id = quota_period
    and p.used::bigint + p.reserved < p.article_limit
  returning p.id into quota_period;
  if quota_period is null then return 'quota_limited'; end if;

  insert into public.processing_jobs (user_id, article_id, idempotency_key)
  values (owner_id, article.id, 'retry:' || gen_random_uuid()::text) returning id into queued_job;
  insert into public.usage_events (user_id, usage_period_id, job_id) values (owner_id, quota_period, queued_job);
  insert into public.job_outbox (job_id) values (queued_job);
  update public.articles set status = 'queued' where id = article.id;
  return 'queued';
end;
$$;

create function public.capture_current_usage()
returns table (
  plan public.capture_plan, used integer, reserved integer, article_limit integer,
  next_reset timestamptz, manual_retry_limit integer
)
language sql stable security definer
set search_path = ''
as $$
  with account as (
    select auth.uid() as owner_id, statement_timestamp() as at,
      date_trunc('month', statement_timestamp() at time zone 'UTC') as month_start
    where auth.uid() is not null and (auth.jwt() ->> 'client_id') is null
  )
  select
    (case when limits.entitlement = 300 then 'pro' else 'free' end)::public.capture_plan,
    coalesce(p.used, 0), coalesce(p.reserved, 0), limits.entitlement,
    (a.month_start + interval '1 month') at time zone 'UTC',
    capture_private.capture_job_limit() - 1
  from account a
  cross join lateral (
    select capture_private.capture_monthly_limit(a.owner_id, a.at) as entitlement
  ) limits
  left join public.usage_periods p on p.user_id = a.owner_id
    and p.period_start = a.month_start at time zone 'UTC';
$$;

revoke execute on function public.capture_current_usage()
  from public, anon, authenticated, service_role;
grant execute on function public.capture_current_usage() to authenticated;
