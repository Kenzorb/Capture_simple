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
