create function public.capture_remove_source_text(p_article_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  article_status public.article_status;
begin
  if owner_id is null or (select auth.jwt() ->> 'client_id') is not null
    or not exists (
      select 1 from auth.sessions s where s.user_id = owner_id
        and s.id::text = (select auth.jwt() ->> 'session_id')
    ) then raise insufficient_privilege; end if;

  select a.status into article_status
    from public.articles a
    where a.user_id = owner_id and a.id = p_article_id for update;
  if not found then return 'missing'; end if;
  if article_status in ('queued', 'processing') then return 'busy'; end if;

  delete from public.article_contents
    where user_id = owner_id and article_id = p_article_id;
  if article_status <> 'ready' then
    delete from public.article_source_chunks
      where user_id = owner_id and article_id = p_article_id;
  end if;
  return 'removed';
end;
$$;

revoke execute on function public.capture_remove_source_text(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_remove_source_text(uuid) to authenticated;
