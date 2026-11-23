do $$
declare
  member uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  first uuid;
  second uuid;
  fallback uuid;
  other_fallback uuid;
  root uuid;
begin
  begin
    insert into auth.users (id, email)
    values (member, member || '@example.test'), (other, other || '@example.test');
    if exists (select from public.topics where user_id in (member, other))
    then raise exception 'Signup created empty topics'; end if;
    root := public.capture_resolve_topic_path(member, array['Web Development']);
    first := public.capture_resolve_topic_path(member, array['Web Dev', 'Back-end Development', 'API']);
    second := public.capture_resolve_topic_path(member, array[' Ｗｅｂ　Ｄｅｖ ', 'Backend Development', 'APIs']);
    if first is null or first is distinct from second
      or (select count(*) from public.topics where user_id = member) <> 3
      or public.capture_resolve_topic_path(member, p_candidate_topic_id => root) is distinct from root
    then raise exception 'Suggestions did not reuse the owned branch'; end if;

    fallback := public.capture_resolve_topic_path(member);
    other_fallback := public.capture_resolve_topic_path(other);
    if fallback is null or other_fallback is null or fallback = other_fallback
      or public.capture_resolve_topic_path(member, array['---']) is distinct from fallback
      or public.capture_resolve_topic_path(member, array['one','two','three','four','five']) is distinct from fallback
      or not exists (select 1 from public.topics where id = fallback and user_id = member
        and name = 'Unsorted' and parent_id is null)
    then raise exception 'Fallback was not stable and owner-scoped'; end if;

    begin
      perform public.capture_resolve_topic_path(member, array['Web Development'], other_fallback);
      raise exception 'Another user''s AI candidate was accepted';
    exception when insufficient_privilege then null;
    end;
    if has_function_privilege('authenticated', 'public.capture_resolve_topic_path(uuid,text[],uuid)', 'EXECUTE')
    then raise exception 'Topic resolution exposed a service-only operation'; end if;
    raise sqlstate 'Z0064';
  exception when sqlstate 'Z0064' then
    raise notice 'CAP-064 assertions passed and fixtures rolled back';
  end;
end;
$$;
