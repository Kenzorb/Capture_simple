create table public.capture_extension_client (
  singleton boolean primary key default true check (singleton),
  client_id uuid not null
);
alter table public.capture_extension_client enable row level security;
revoke all on public.capture_extension_client from public, anon, authenticated;
grant all on public.capture_extension_client to service_role;

-- OAuth clients use the two narrow RPCs below. Ordinary web sessions retain their policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'articles', 'article_contents', 'personal_notes', 'topics',
    'topic_tree_versions', 'article_topics', 'concepts', 'article_concepts',
    'usage_periods', 'subscriptions'
  ] loop
    execute format(
      'create policy web_sessions_only on public.%I as restrictive for all to authenticated
       using ((select auth.jwt() ->> ''client_id'') is null)
       with check ((select auth.jwt() ->> ''client_id'') is null)',
      table_name
    );
  end loop;
end;
$$;

create function capture_private.is_capture_extension_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    join public.capture_extension_client c on c.client_id = s.oauth_client_id
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt() ->> 'session_id')
      and c.client_id::text = (select auth.jwt() ->> 'client_id')
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke execute on function capture_private.is_capture_extension_session()
  from public, anon, authenticated, service_role;

create function public.capture_extension_account()
returns table (id uuid, email text, display_name text, plan text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not capture_private.is_capture_extension_session() then
    raise insufficient_privilege;
  end if;
  return query
    select u.id, u.email::text, p.display_name, coalesce(b.plan::text, 'free')
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.subscriptions b on b.user_id = u.id
    where u.id = (select auth.uid());
end;
$$;
revoke execute on function public.capture_extension_account()
  from public, anon, authenticated, service_role;
grant execute on function public.capture_extension_account() to authenticated;

alter function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  rename to capture_rate_limited_save_article;
alter function public.capture_rate_limited_save_article(uuid, text, text, text, text, text, text, text)
  set schema capture_private;
revoke execute on function capture_private.capture_rate_limited_save_article(uuid, text, text, text, text, text, text, text)
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
begin
  if (select auth.jwt() ->> 'client_id') is not null and (
    p_source is distinct from 'chrome_extension' or
    not capture_private.is_capture_extension_session()
  ) then
    raise insufficient_privilege;
  end if;
  return query select * from capture_private.capture_rate_limited_save_article(
    p_request_id, p_url, p_canonical_url, p_domain, p_title,
    p_source, p_extracted_text, p_personal_note
  );
end;
$$;
revoke execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_save_article(uuid, text, text, text, text, text, text, text)
  to authenticated;

alter function public.capture_edit_article(uuid, text, text, boolean, boolean)
  set schema capture_private;
alter function public.capture_delete_article(uuid, boolean)
  set schema capture_private;
revoke execute on function capture_private.capture_edit_article(uuid, text, text, boolean, boolean),
  capture_private.capture_delete_article(uuid, boolean) from public, anon, authenticated, service_role;

create function public.capture_edit_article(
  p_article_id uuid,
  p_title text default null,
  p_personal_note text default null,
  p_update_note boolean default false,
  p_archived boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'client_id') is not null then
    raise insufficient_privilege;
  end if;
  return capture_private.capture_edit_article(
    p_article_id, p_title, p_personal_note, p_update_note, p_archived
  );
end;
$$;

create function public.capture_delete_article(p_article_id uuid, p_confirmed boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'client_id') is not null then
    raise insufficient_privilege;
  end if;
  return capture_private.capture_delete_article(p_article_id, p_confirmed);
end;
$$;
revoke execute on function public.capture_edit_article(uuid, text, text, boolean, boolean),
  public.capture_delete_article(uuid, boolean) from public, anon, authenticated, service_role;
grant execute on function public.capture_edit_article(uuid, text, text, boolean, boolean),
  public.capture_delete_article(uuid, boolean) to authenticated;
