alter table public.processing_jobs add column execution_id text
  check (execution_id ~ '^[A-Za-z0-9_-]{16,128}$');

-- Lock the article before the job so concurrent deletion takes locks in the same order.
create function capture_private.lock_processing_article(p_job_id uuid)
returns public.articles
language sql
set search_path = ''
as $$
  select a.* from public.processing_jobs j
  join public.articles a on (a.user_id, a.id) = (j.user_id, j.article_id)
  where j.id = p_job_id
  for update of a;
$$;
revoke execute on function capture_private.lock_processing_article(uuid)
  from public, anon, authenticated, service_role;

create function public.capture_start_job(p_job_id uuid, p_execution_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  article public.articles;
  job public.processing_jobs;
begin
  if p_execution_id is null or p_execution_id !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise invalid_parameter_value;
  end if;

  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null then return false; end if;
  select * into job from public.processing_jobs where id = p_job_id for update;

  if job.status = 'processing' and article.status = 'processing' then
    return job.execution_id is not distinct from p_execution_id;
  end if;
  if job.status is distinct from 'queued' or article.status <> 'queued' then
    return false;
  end if;

  update public.processing_jobs set
    status = 'processing', execution_id = p_execution_id, attempts = attempts + 1
  where id = p_job_id;
  update public.articles set status = 'processing' where id = article.id;
  return true;
end;
$$;

create function public.capture_finish_job(
  p_job_id uuid, p_execution_id text, p_status public.article_status, p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  article public.articles;
  job public.processing_jobs;
  final_job_status public.processing_job_status;
  quota_period uuid;
begin
  if p_execution_id is null or p_execution_id !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_status is null or p_status not in ('ready', 'failed', 'unsupported')
    or (p_status = 'ready' and p_error_code is not null)
    or (p_status <> 'ready' and (p_error_code is null or p_error_code !~ '^[a-z][a-z0-9_]{0,63}$'))
  then raise invalid_parameter_value;
  end if;

  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null then return false; end if;
  select * into job from public.processing_jobs where id = p_job_id for update;
  if job.execution_id is distinct from p_execution_id then return false; end if;

  final_job_status := case when p_status = 'ready' then 'succeeded' else 'failed' end;
  if job.status = final_job_status and article.status = p_status
    and job.error_code is not distinct from p_error_code
  then return true;
  end if;

  if job.status is distinct from 'processing' or article.status <> 'processing' then
    return false;
  end if;

  update public.usage_events set
    state = case when p_status = 'ready' then 'consumed' else 'released' end::public.usage_reservation_state
  where job_id = p_job_id and user_id = article.user_id and state = 'reserved'
  returning usage_period_id into quota_period;
  if not found then raise check_violation using message = 'Processing reservation missing'; end if;
  update public.usage_periods set
    reserved = reserved - 1, used = used + case when p_status = 'ready' then 1 else 0 end
  where id = quota_period and user_id = article.user_id and reserved > 0;
  if not found then raise check_violation using message = 'Processing quota is inconsistent'; end if;

  update public.processing_jobs set
    status = final_job_status, error_code = p_error_code, finished_at = statement_timestamp()
  where id = p_job_id;
  update public.articles set status = p_status where id = article.id;
  return true;
end;
$$;

revoke execute on function public.capture_start_job(uuid, text),
  public.capture_finish_job(uuid, text, public.article_status, text) from public, anon, authenticated;
grant execute on function public.capture_start_job(uuid, text),
  public.capture_finish_job(uuid, text, public.article_status, text) to service_role;
