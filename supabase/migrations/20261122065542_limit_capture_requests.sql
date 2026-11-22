create table public.capture_rate_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 20)
);

alter table public.capture_rate_limits enable row level security;
revoke all on public.capture_rate_limits from public, anon, authenticated;
grant all on public.capture_rate_limits to service_role;

create schema capture_private;
revoke all on schema capture_private from public, anon, authenticated, service_role;
alter function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  set schema capture_private;
revoke execute on function capture_private.capture_save_article(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;

create function public.capture_save_article(
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
  request_time timestamptz := clock_timestamp();
  window_length constant interval := interval '1 minute';
  retry_seconds integer;
begin
  if owner_id is null or not exists (
    select 1 from auth.sessions s
    where s.id = (auth.jwt() ->> 'session_id')::uuid and s.user_id = owner_id
  ) then
    raise insufficient_privilege;
  end if;
  if octet_length(p_url) > 4096 or octet_length(p_canonical_url) > 4096
     or octet_length(p_extracted_text) > 100000 then
    raise sqlstate 'PT413' using message = 'Capture payload limit exceeded';
  end if;

  insert into public.capture_rate_limits as limits (user_id, window_started_at, request_count)
  values (owner_id, request_time, 1)
  on conflict (user_id) do update set
    window_started_at = case
      when limits.window_started_at <= excluded.window_started_at - window_length
      then excluded.window_started_at else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= excluded.window_started_at - window_length
      then 1 else limits.request_count + 1
    end
  where limits.window_started_at <= excluded.window_started_at - window_length
     or limits.request_count < 20;

  if not found then
    select greatest(1, ceil(extract(epoch from
      limits.window_started_at + window_length - clock_timestamp()
    )))::integer into retry_seconds
    from public.capture_rate_limits limits where limits.user_id = owner_id;
    raise sqlstate 'PT429' using message = 'Capture rate limit exceeded', detail = retry_seconds::text;
  end if;

  return query select * from capture_private.capture_save_article(
    p_request_id, p_url, p_canonical_url, p_domain, p_title,
    p_source, p_extracted_text, p_personal_note
  );
end;
$$;

revoke execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  to authenticated;
