create function public.capture_save_personal_note(
  p_article_id uuid, p_expected_body text default null, p_body text default null
)
returns table (result text, body text)
language plpgsql security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  stored text;
begin
  if owner_id is null or (select auth.jwt() ->> 'client_id') is not null or not exists (
    select 1 from auth.sessions s where s.user_id = owner_id
      and s.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise insufficient_privilege; end if;
  if char_length(p_expected_body) > 4000 or char_length(p_body) > 4000
  then raise invalid_parameter_value; end if;

  perform 1 from public.articles a
    where a.id = p_article_id and a.user_id = owner_id for update;
  if not found then return; end if;
  select n.body into stored from public.personal_notes n
    where n.article_id = p_article_id and n.user_id = owner_id for update;
  if stored is distinct from p_expected_body then
    return query select 'conflict'::text, stored;
    return;
  end if;

  if p_body is null then
    delete from public.personal_notes n where n.article_id = p_article_id and n.user_id = owner_id;
  elsif stored is null then
    insert into public.personal_notes (user_id, article_id, body)
    values (owner_id, p_article_id, p_body)
    on conflict (article_id) do nothing;
    if not found then
      select n.body into stored from public.personal_notes n
        where n.article_id = p_article_id and n.user_id = owner_id;
      return query select 'conflict'::text, stored;
      return;
    end if;
  elsif stored is distinct from p_body then
    update public.personal_notes n set body = p_body
      where n.article_id = p_article_id and n.user_id = owner_id;
  end if;
  return query select 'saved'::text, p_body;
end;
$$;

revoke execute on function public.capture_save_personal_note(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_save_personal_note(uuid, text, text)
  to authenticated;
