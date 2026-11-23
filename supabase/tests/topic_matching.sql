do $$
declare
  member uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  root uuid;
  backend uuid;
  api uuid;
  existing_short uuid;
  another_root uuid;
  foreign_root uuid;
begin
  begin
    insert into auth.users (id, email)
    values (member, member || '@example.test'), (other, other || '@example.test');
    insert into public.topics (user_id, name) values (member, 'Web Development') returning id into root;
    insert into public.topics (user_id, parent_id, name) values (member, root, 'Backend Development') returning id into backend;
    insert into public.topics (user_id, parent_id, name) values (member, backend, 'API') returning id into api;
    insert into public.topics (user_id, name) values (member, 'Other Branch') returning id into another_root;
    insert into public.topics (user_id, parent_id, name) values (member, another_root, 'API');
    insert into public.topics (user_id, name) values (other, 'Web Dev') returning id into foreign_root;

    -- Two article suggestions resolve to the branch already used by the owner.
    if public.capture_match_topic_path(member, array['Web Development','BACKEND DEVELOPMENT','APIs'])
        is distinct from array[root,backend,api]
      or public.capture_match_topic_path(member, array['  Ｗｅｂ　Ｄｅｖ ','Back‑end development','Application Programming Interfaces'])
        is distinct from array[root,backend,api]
    then raise exception 'Related article paths did not reuse the same existing branch'; end if;
    if public.capture_match_topic_path(member, array['Web Dev','API']) is distinct from array[root]
      or public.capture_match_topic_path(other, array['Web Development','Backend Development']) is distinct from array[foreign_root]
    then raise exception 'Matching escaped the current owner or parent'; end if;

    insert into public.topics (user_id, parent_id, name)
    values (member, backend, 'APIs') returning id into existing_short;
    if public.capture_match_topic_path(member, array['Web Dev','Backend Dev','APIs'])
        is distinct from array[root,backend,existing_short]
      or public.capture_match_topic_path(member, array['Web Dev','Backend Dev','Application Programming Interfaces'])
        is distinct from array[root,backend,api]
    then raise exception 'Exact or canonical match did not win over an alternate alias'; end if;
    if capture_private.topic_label_key('C++') = capture_private.topic_label_key('C')
      or has_function_privilege('authenticated', 'public.capture_match_topic_path(uuid,text[])', 'EXECUTE')
    then raise exception 'Normalization lost a distinguishing character or allowed client access'; end if;
    raise sqlstate 'Z0063';
  exception when sqlstate 'Z0063' then
    raise notice 'CAP-063 assertions passed and fixtures rolled back';
  end;
end;
$$;
