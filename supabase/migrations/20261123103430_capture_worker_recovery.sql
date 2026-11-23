alter table public.job_outbox add column generation integer not null default 1
  check (generation between 1 and 3);
create index processing_jobs_stale_idx on public.processing_jobs (updated_at, id)
  where status = 'processing';

drop function public.capture_claim_dispatch(uuid);
create function public.capture_claim_dispatch(p_job_id uuid default null)
returns table (job_id uuid, lease_id uuid, generation integer)
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
  returning o.job_id, o.lease_id, o.generation;
$$;

create function public.capture_start_delivery(p_job_id uuid, p_execution_id text, p_generation integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  article public.articles;
begin
  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null or not exists (
    select 1 from public.job_outbox o
    where o.job_id = p_job_id and o.generation = p_generation and o.status <> 'dead'
  ) then return false; end if;
  return public.capture_start_job(p_job_id, p_execution_id);
end;
$$;

create function public.capture_reconcile_jobs(p_job_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate uuid;
  job public.processing_jobs;
  outbox public.job_outbox;
  cutoff timestamptz := statement_timestamp() - interval '15 minutes';
  handled integer := 0;
  execution text;
begin
  for candidate in
    select j.id from public.processing_jobs j
    join public.articles a on (a.id, a.user_id) = (j.article_id, j.user_id)
    join public.job_outbox o on o.job_id = j.id
    where (p_job_id is null or p_job_id = j.id)
      and ((j.status = 'queued' and a.status = 'queued' and o.dispatched_at <= cutoff)
        or (j.status = 'processing' and a.status = 'processing' and j.updated_at <= cutoff and o.status <> 'dead'))
    order by j.updated_at, j.id limit 20 for update of a skip locked
  loop
    select * into strict job from public.processing_jobs where id = candidate for update;
    select * into strict outbox from public.job_outbox where job_id = candidate for update;
    if not ((job.status = 'queued' and coalesce(outbox.dispatched_at <= cutoff, false))
      or (job.status = 'processing' and job.updated_at <= cutoff and outbox.status <> 'dead'))
    then continue; end if;

    if outbox.generation = 3 then
      execution := job.execution_id;
      if job.status = 'queued' then
        execution := 'recovery-' || job.id::text;
        if not public.capture_start_job(job.id, execution) then continue; end if;
      end if;
      if not public.capture_finish_job(job.id, execution, 'failed', 'worker_recovery_exhausted')
      then continue; end if;
      update public.job_outbox set status = 'dead', dispatched_at = null, lease_id = null
      where job_id = job.id;
    else
      update public.processing_jobs set status = 'queued', execution_id = null where id = job.id;
      update public.articles set status = 'queued' where id = job.article_id and user_id = job.user_id;
      update public.job_outbox set generation = generation + 1, status = 'pending',
        dispatched_at = null, lease_id = null, next_attempt_at = statement_timestamp()
      where job_id = job.id;
    end if;
    handled := handled + 1;
  end loop;
  return handled;
end;
$$;

revoke execute on function public.capture_claim_dispatch(uuid),
  public.capture_start_delivery(uuid, text, integer), public.capture_reconcile_jobs(uuid)
  from public, anon, authenticated;
grant execute on function public.capture_claim_dispatch(uuid),
  public.capture_start_delivery(uuid, text, integer), public.capture_reconcile_jobs(uuid)
  to service_role;
