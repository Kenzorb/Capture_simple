alter table public.usage_periods
  add column prior_deleted_usage integer not null default 0
  check (prior_deleted_usage between 0 and used);

-- Older capture deletions removed their event but did not refund a consumed unit.
update public.usage_periods p
set prior_deleted_usage = greatest(p.used - (
  select count(*) from public.usage_events e
  where e.user_id = p.user_id and e.usage_period_id = p.id and e.state = 'consumed'
), 0);

alter table public.usage_events
  alter column job_id drop not null,
  drop constraint usage_events_user_id_job_id_fkey,
  add constraint usage_events_user_id_job_id_fkey
    foreign key (user_id, job_id) references public.processing_jobs (user_id, id)
    on delete set null (job_id),
  add constraint usage_events_active_job check (job_id is not null or state <> 'reserved');

create function capture_private.release_orphaned_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usage_periods p set reserved = p.reserved - old.units
  where p.user_id = old.user_id and p.id = old.usage_period_id and p.reserved >= old.units;
  new.state := 'released';
  return new;
end;
$$;

revoke execute on function capture_private.release_orphaned_reservation()
  from public, anon, authenticated, service_role;
create trigger release_orphaned_reservation before update of job_id on public.usage_events
for each row when (old.job_id is not null and new.job_id is null and old.state = 'reserved')
execute function capture_private.release_orphaned_reservation();

create function public.capture_usage_audit(p_owner_id uuid)
returns table (period_id uuid, used integer, reserved integer, ledger_used bigint, ledger_reserved bigint)
language sql stable
set search_path = ''
as $$
  select p.id, p.used, p.reserved,
    p.prior_deleted_usage + coalesce(sum(e.units) filter (where e.state = 'consumed'), 0),
    coalesce(sum(e.units) filter (where e.state = 'reserved'), 0)
  from public.usage_periods p
  left join public.usage_events e on e.user_id = p.user_id and e.usage_period_id = p.id
  where p.user_id = p_owner_id
  group by p.id;
$$;

revoke execute on function public.capture_usage_audit(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_usage_audit(uuid) to service_role;
