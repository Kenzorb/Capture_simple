create function capture_private.topic_label_key(p_label text)
returns text
language sql immutable strict
set search_path = ''
as $$
  select lower(btrim(regexp_replace(normalize(p_label, NFKC),
    '[[:space:]_‐‑‒–—−-]+', ' ', 'g')));
$$;

create function capture_private.topic_alias_key(p_key text)
returns text
language sql immutable strict
set search_path = ''
as $$
  select case
    when p_key in ('ai', 'artificial intelligence') then 'artificial intelligence'
    when p_key in ('ml', 'machine learning') then 'machine learning'
    when p_key in ('javascript', 'java script', 'js', 'ecmascript') then 'javascript'
    when p_key in ('node.js', 'nodejs', 'node js') then 'node.js'
    when p_key in ('api', 'apis', 'application programming interface', 'application programming interfaces') then 'api'
    when p_key in ('backend development', 'back end development', 'backend dev') then 'backend development'
    when p_key in ('frontend development', 'front end development', 'frontend dev') then 'frontend development'
    when p_key in ('web development', 'web dev') then 'web development'
    else p_key end;
$$;

create function capture_private.match_topic_sibling(
  p_owner_id uuid, p_parent_id uuid, p_label text
)
returns uuid
language sql stable
set search_path = ''
as $$
  with wanted as (
    select btrim(p_label) as label, capture_private.topic_label_key(p_label) as key
  ), siblings as (
    select t.id, t.name, t.normalized_name, t.created_at,
      capture_private.topic_label_key(t.name) as key
    from public.topics t
    where t.user_id = p_owner_id and t.parent_id is not distinct from p_parent_id
  )
  select s.id from siblings s cross join wanted w
  where w.key <> '' and capture_private.topic_alias_key(s.key) = capture_private.topic_alias_key(w.key)
  order by case
      when s.name = w.label then 0
      when s.normalized_name = lower(w.label) then 1
      when s.key = w.key then 2
      when s.key = capture_private.topic_alias_key(w.key) then 3
      else 4 end,
    s.created_at, s.id
  limit 1;
$$;

-- Resolve only the existing prefix. A missing sibling must not jump to a different branch.
create function public.capture_match_topic_path(p_owner_id uuid, p_labels text[])
returns uuid[]
language plpgsql stable security definer
set search_path = ''
as $$
declare
  labels text[] := p_labels;
  label text;
  parent uuid;
  matched uuid[] := '{}';
begin
  if p_owner_id is null or labels is null or cardinality(labels) not between 1 and 4
    or exists (select 1 from unnest(labels) item
      where item is null or char_length(btrim(item)) not between 1 and 120
        or capture_private.topic_label_key(item) = '')
  then raise invalid_parameter_value; end if;

  foreach label in array labels loop
    parent := capture_private.match_topic_sibling(p_owner_id, parent, label);
    exit when parent is null;
    matched := array_append(matched, parent);
  end loop;
  return matched;
end;
$$;

revoke execute on function capture_private.topic_label_key(text),
  capture_private.topic_alias_key(text), capture_private.match_topic_sibling(uuid, uuid, text),
  public.capture_match_topic_path(uuid, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.capture_match_topic_path(uuid, text[]) to service_role;
