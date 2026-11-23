create function capture_private.capture_queue_article(p_article_id uuid, p_text text)
returns text
language plpgsql

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

  if p_text is not null and (octet_length(p_text) > 100000 or p_text !~ '[^[:space:]]')
  then raise invalid_parameter_value; end if;

  select * into article from public.articles a where a.id = p_article_id and a.user_id = owner_id for update;
  if not found then return null; end if;
  if article.status in ('queued', 'processing') then return 'queued'; end if;
  if article.status not in ('failed', 'quota_limited') and (article.status <> 'unsupported' or p_text is null)
  then return 'not_retryable'; end if;
  if (select count(*) from public.processing_jobs j where j.article_id = article.id) >= capture_private.capture_job_limit()
  then return 'retry_limit'; end if;

  quota_period := capture_private.capture_usage_period(owner_id, statement_timestamp());

  update public.usage_periods p set reserved = p.reserved + 1
  where p.user_id = owner_id and p.id = quota_period
    and p.used::bigint + p.reserved < p.article_limit
  returning p.id into quota_period;
  if quota_period is null then return 'quota_limited'; end if;

  if p_text is not null then
    insert into public.article_contents (article_id, user_id, cleaned_text, extraction_method)
    values (article.id, owner_id, p_text, 'capture')
    on conflict (article_id) do update set cleaned_text = excluded.cleaned_text,
      extraction_method = excluded.extraction_method, content_hash = null,
      language = null, word_count = null, updated_at = statement_timestamp();
    delete from public.article_source_chunks where article_id = article.id and user_id = owner_id;
  end if;

  insert into public.processing_jobs (user_id, article_id, idempotency_key)
  values (owner_id, article.id, 'retry:' || gen_random_uuid()::text) returning id into queued_job;
  insert into public.usage_events (user_id, usage_period_id, job_id) values (owner_id, quota_period, queued_job);
  insert into public.job_outbox (job_id) values (queued_job);
  update public.articles set status = 'queued' where id = article.id;
  return 'queued';
end;
$$;

revoke execute on function capture_private.capture_queue_article(uuid, text)
  from public, anon, authenticated, service_role;

create or replace function public.capture_retry_article(p_article_id uuid)
returns text language sql security definer set search_path = ''
as $$ select capture_private.capture_queue_article(p_article_id, null); $$;

create function public.capture_submit_article_text(p_article_id uuid, p_text text)
returns text language sql security definer set search_path = ''
as $$
  select capture_private.capture_queue_article(p_article_id, coalesce(p_text, ''));
$$;

revoke execute on function public.capture_submit_article_text(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_submit_article_text(uuid, text) to authenticated;
