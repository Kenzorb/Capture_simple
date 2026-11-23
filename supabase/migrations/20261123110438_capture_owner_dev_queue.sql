create function public.capture_due_owner_jobs(p_owner_id uuid)
returns table (job_id uuid)
language sql
set search_path = ''
as $$
  select j.id
  from public.processing_jobs j
  join public.job_outbox o on o.job_id = j.id
  where j.user_id = p_owner_id and j.status in ('queued', 'processing')
    and (
      (o.status = 'pending' and o.next_attempt_at <= statement_timestamp())
      or (j.status = 'queued' and o.dispatched_at <= statement_timestamp() - interval '15 minutes')
      or (j.status = 'processing' and j.updated_at <= statement_timestamp() - interval '15 minutes'
        and o.status <> 'dead')
    )
  order by o.next_attempt_at, j.id
  limit 20;
$$;

revoke execute on function public.capture_due_owner_jobs(uuid) from public, anon, authenticated;
grant execute on function public.capture_due_owner_jobs(uuid) to service_role;
