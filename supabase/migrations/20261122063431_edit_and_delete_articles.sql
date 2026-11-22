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
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists (
    select 1 from auth.sessions s
    where s.id = (auth.jwt() ->> 'session_id')::uuid and s.user_id = owner_id
  ) then
    raise insufficient_privilege;
  end if;
  if (p_title is null and p_update_note is not true and p_archived is null)
    or char_length(btrim(p_title)) not between 1 and 500
    or char_length(p_personal_note) > 4000 then
    raise invalid_parameter_value;
  end if;

  update public.articles a
  set title = coalesce(btrim(p_title), a.title),
      archived_at = case
        when p_archived is true then coalesce(a.archived_at, statement_timestamp())
        when p_archived is false then null
        else a.archived_at
      end
  where a.user_id = owner_id and a.id = p_article_id;
  if not found then
    return false;
  end if;

  if p_update_note is true then
    if p_personal_note is null then
      delete from public.personal_notes n
      where n.user_id = owner_id and n.article_id = p_article_id;
    else
      insert into public.personal_notes (user_id, article_id, body)
      values (owner_id, p_article_id, p_personal_note)
      on conflict (article_id) do update set body = excluded.body;
    end if;
  end if;
  return true;
end;
$$;

create function public.capture_delete_article(p_article_id uuid, p_confirmed boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null or not exists (
    select 1 from auth.sessions s
    where s.id = (auth.jwt() ->> 'session_id')::uuid and s.user_id = owner_id
  ) then
    raise insufficient_privilege;
  end if;
  if p_confirmed is not true then
    raise invalid_parameter_value;
  end if;

  delete from public.articles a where a.user_id = owner_id and a.id = p_article_id;
  return found;
end;
$$;

revoke execute on function public.capture_edit_article(uuid, text, text, boolean, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.capture_delete_article(uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_edit_article(uuid, text, text, boolean, boolean)
  to authenticated;
grant execute on function public.capture_delete_article(uuid, boolean)
  to authenticated;
