create or replace function public.capture_check_topic_cycle()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.topic_tree_versions (user_id)
  values (new.user_id)
  on conflict (user_id) do update
    set revision = public.topic_tree_versions.revision + 1;

  if exists (
    with recursive ancestors (id, parent_id) as (
      select id, parent_id from public.topics where user_id = new.user_id and id = new.parent_id
      union
      select topic.id, topic.parent_id from ancestors
      join public.topics as topic on topic.user_id = new.user_id and topic.id = ancestors.parent_id
    )
    select from ancestors where id = new.id
  ) then
    raise exception 'A topic cannot be its own ancestor' using errcode = '23514';
  end if;

  if (
    with recursive ancestors (id, parent_id, depth) as (
      select new.id, new.parent_id, 1
      union all
      select t.id, t.parent_id, a.depth + 1 from ancestors a
      join public.topics t on t.user_id = new.user_id and t.id = a.parent_id
      where a.depth < 5
    ), descendants (id, depth) as (
      select new.id, 1
      union all
      select t.id, d.depth + 1 from descendants d
      join public.topics t on t.user_id = new.user_id and t.parent_id = d.id
      where d.depth < 5
    )
    select (select max(depth) from ancestors) + (select max(depth) from descendants) - 1 > 4
  ) then
    raise exception 'Topics may have at most four levels' using errcode = '23514';
  end if;
  return null;
end;
$$;

-- A single JSON result avoids truncating the owner's full tree at the table API row limit.
create function public.capture_topic_tree()
returns jsonb
language sql stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(t order by lower(t.name), t.id), '[]'::jsonb)
  from (
    select id, parent_id, name, description, created_at
    from public.topics where user_id = (select auth.uid())
  ) t;
$$;

create function public.capture_mutate_topic(
  p_operation text, p_fields jsonb, p_topic_id uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  changed public.topics;
begin
  if owner_id is null or (select auth.jwt() ->> 'client_id') is not null or not exists (
    select 1 from auth.sessions s where s.user_id = owner_id
      and s.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise insufficient_privilege; end if;

  if p_operation is null or p_operation not in ('create', 'edit', 'delete')
    or (p_topic_id is null) <> (p_operation = 'create')
    or jsonb_typeof(p_fields) is distinct from 'object'
    or (p_fields - array['name','parent_id','description']) <> '{}'::jsonb
    or (p_operation = 'create' and not p_fields ? 'name')
    or (p_operation = 'edit' and p_fields = '{}'::jsonb)
    or (p_operation = 'delete' and p_fields <> '{}'::jsonb)
    or (p_fields ? 'name' and jsonb_typeof(p_fields -> 'name') <> 'string')
    or (p_fields ? 'description' and jsonb_typeof(p_fields -> 'description') not in ('string','null'))
    or (p_fields ? 'parent_id' and jsonb_typeof(p_fields -> 'parent_id') not in ('string','null'))
  then raise invalid_parameter_value; end if;

  -- Serialize API mutations for one account, including moves that change a subtree.
  perform 1 from public.profiles where id = owner_id for no key update;
  if p_operation = 'create' then
    insert into public.topics (user_id, name, description, parent_id)
    values (owner_id, btrim(p_fields ->> 'name'), p_fields ->> 'description',
      (p_fields ->> 'parent_id')::uuid)
    returning * into changed;
  elsif p_operation = 'edit' then
    update public.topics t set
      name = coalesce(btrim(p_fields ->> 'name'), t.name),
      description = case when p_fields ? 'description' then p_fields ->> 'description' else t.description end,
      parent_id = case when p_fields ? 'parent_id' then (p_fields ->> 'parent_id')::uuid else t.parent_id end
    where t.user_id = owner_id and t.id = p_topic_id returning * into changed;
  else
    if exists (select 1 from public.topics t where t.user_id = owner_id and t.parent_id = p_topic_id) then
      raise sqlstate 'PT409' using message = 'Move child topics before deleting their parent';
    end if;
    delete from public.topics t where t.user_id = owner_id and t.id = p_topic_id returning * into changed;
  end if;

  if changed.id is null then return null; end if;
  return jsonb_build_object('id', changed.id, 'parent_id', changed.parent_id,
    'name', changed.name, 'description', changed.description, 'created_at', changed.created_at);
end;
$$;

revoke execute on function public.capture_topic_tree(), public.capture_mutate_topic(text, jsonb, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_topic_tree(), public.capture_mutate_topic(text, jsonb, uuid)
  to authenticated;
