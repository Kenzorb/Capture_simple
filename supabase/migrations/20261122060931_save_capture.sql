create table public.capture_requests (
  user_id uuid not null,
  request_id uuid not null,
  article_id uuid not null,
  primary key (user_id, request_id),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade
);

create index capture_requests_article_id_idx on public.capture_requests (article_id);
alter table public.capture_requests enable row level security;
revoke all on table public.capture_requests from public, anon, authenticated;
grant all on table public.capture_requests to service_role;

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
  saved public.articles%rowtype;
  was_duplicate boolean;
begin
  if owner_id is null or not exists (
    select 1
    from auth.sessions s
    where s.id = (auth.jwt() ->> 'session_id')::uuid and s.user_id = owner_id
  ) then
    raise insufficient_privilege;
  end if;
  if p_request_id is null
    or p_url is null or char_length(p_url) > 4096 or p_url !~ '^https?://[^/[:space:]]'
    or p_canonical_url is null or char_length(p_canonical_url) > 4096
    or p_canonical_url !~ '^https?://[^/[:space:]]'
    or p_domain is null or char_length(p_domain) not between 1 and 253
    or p_title is null or char_length(btrim(p_title)) not between 1 and 500
    or p_source is null or p_source not in ('chrome_extension', 'manual_url')
    or char_length(p_extracted_text) > 100000
    or char_length(p_personal_note) > 4000 then
    raise invalid_parameter_value;
  end if;

  -- Serialize retries for a request ID before changing any article data.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(owner_id::text || ':' || p_request_id::text, 0)
  );
  select a.* into saved
  from public.capture_requests r
  join public.articles a on (a.user_id, a.id) = (r.user_id, r.article_id)
  where r.user_id = owner_id and r.request_id = p_request_id;
  if found then
    if saved.canonical_url <> p_canonical_url then
      raise unique_violation using message = 'Capture request ID is already in use';
    end if;
    return query select saved.id, saved.status, true;
    return;
  end if;

  insert into public.articles (user_id, url, canonical_url, domain, title)
  values (owner_id, p_url, p_canonical_url, p_domain, p_title)
  on conflict on constraint articles_owner_canonical_url_key do nothing
  returning * into saved;
  was_duplicate := not found;

  if was_duplicate then
    select a.* into saved
    from public.articles a
    where a.user_id = owner_id
      and a.canonical_url_hash = extensions.digest(p_canonical_url, 'sha256')
      and a.canonical_url = p_canonical_url
    for key share;
    if not found then
      raise serialization_failure using message = 'Capture must be retried';
    end if;
  else
    if nullif(btrim(p_extracted_text), '') is not null then
      insert into public.article_contents (article_id, user_id, cleaned_text, extraction_method)
      values (saved.id, owner_id, p_extracted_text, p_source);
    end if;
    if nullif(btrim(p_personal_note), '') is not null then
      insert into public.personal_notes (article_id, user_id, body)
      values (saved.id, owner_id, p_personal_note);
    end if;
  end if;

  insert into public.capture_requests (user_id, request_id, article_id)
  values (owner_id, p_request_id, saved.id);
  return query select saved.id, saved.status, was_duplicate;
end;
$$;

revoke execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  to authenticated;
