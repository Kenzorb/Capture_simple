create function public.capture_resolve_topic_path(
  p_owner_id uuid, p_labels text[] default null, p_candidate_topic_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  labels text[] := p_labels;
  label text;
  parent uuid;
  matched uuid;
begin
  if p_owner_id is null then raise invalid_parameter_value; end if;
  perform 1 from public.profiles where id = p_owner_id for no key update;
  if not found then raise insufficient_privilege; end if;

  if p_candidate_topic_id is not null then
    if not exists (select 1 from public.topics t where t.id = p_candidate_topic_id and t.user_id = p_owner_id)
    then raise insufficient_privilege; end if;
    return p_candidate_topic_id;
  end if;

  if labels is null or array_ndims(labels) is distinct from 1 or cardinality(labels) not between 1 and 4
    or exists (select 1 from unnest(labels) item
      where item is null or char_length(normalize(item, NFKC)) > 120
        or capture_private.topic_label_key(item) = '')
  then labels := array['Unsorted']; end if;

  foreach label in array labels loop
    label := btrim(regexp_replace(normalize(label, NFKC), '[[:space:]]+', ' ', 'g'));
    matched := capture_private.match_topic_sibling(p_owner_id, parent, label);
    if matched is null then
      insert into public.topics (user_id, parent_id, name)
      values (p_owner_id, parent, label)
      returning id into matched;
    end if;
    parent := matched;
  end loop;
  return parent;
end;
$$;

revoke execute on function public.capture_resolve_topic_path(uuid, text[], uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_resolve_topic_path(uuid, text[], uuid) to service_role;
