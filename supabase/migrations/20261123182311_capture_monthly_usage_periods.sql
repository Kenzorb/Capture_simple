create function capture_private.capture_usage_period(p_owner_id uuid, p_at timestamptz)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  month_start timestamp := date_trunc('month', p_at at time zone 'UTC');
  entitlement integer;
  period_id uuid;
begin
  select case when exists (
    select 1 from public.subscriptions s
    where s.user_id = p_owner_id and s.plan = 'pro'
      and s.status in ('active', 'trialing') and s.period_end > p_at
  ) then 300 else 20 end into entitlement;

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

revoke execute on function capture_private.capture_usage_period(uuid, timestamptz)
  from public, anon, authenticated, service_role;

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
    quota_period := capture_private.capture_usage_period(owner_id, statement_timestamp());

    update public.usage_periods p set reserved = p.reserved + 1
    where p.user_id = owner_id and p.id = quota_period
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
  if article.status <> 'failed' then return 'not_retryable'; end if;
  if (select count(*) from public.processing_jobs j where j.article_id = article.id) >= 3
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
