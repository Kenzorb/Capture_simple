do $$
declare
  member uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  source uuid := gen_random_uuid();
  topic_and_note uuid := gen_random_uuid();
  topic_only uuid := gen_random_uuid();
  concept_only uuid := gen_random_uuid();
  tag_only uuid := gen_random_uuid();
  archived uuid := gen_random_uuid();
  foreign_article uuid := gen_random_uuid();
  branch uuid;
  actual uuid[];
  started timestamptz;
  elapsed interval;
  note_metadata jsonb := '{"schema_version":1,"model":"fixture"}';
begin
  begin
    insert into auth.users (id, email) values
      (member, member || '@example.test'), (other, other || '@example.test');
    insert into public.topics (user_id, name) values (member, 'Plants') returning id into branch;
    insert into public.articles (id, user_id, url, canonical_url, title, domain, captured_at, archived_at)
    select id, owner, 'https://example.test/' || id, 'https://example.test/' || id,
      'Related article fixture', 'example.test', stamp, archived_at
    from (values
      (source, member, now(), null::timestamptz),
      (topic_and_note, member, now() - interval '3 hours', null),
      (topic_only, member, now() - interval '10 years', null),
      (concept_only, member, now() - interval '2 hours', null),
      (tag_only, member, now() - interval '1 hour', null),
      (archived, member, now(), now()),
      (foreign_article, other, now(), null)
    ) as fixture(id, owner, stamp, archived_at);
    insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
    select member, id, branch, true, 'manual' from unnest(array[source, topic_and_note, topic_only, archived]) id;

    insert into public.article_ai_notes (user_id, article_id, payload, schema_version, model)
    select owner, id, note_metadata || signals, 1, 'fixture'
    from (values
      (member, source, '{"tags":["Botany","botany"],"concepts":[{"name":"Photosynthesis"}]}'::jsonb),
      (member, topic_and_note, '{"tags":[" botany "],"concepts":[{"name":"photosynthesis"}]}'),
      (member, concept_only, '{"concepts":[{"name":"Photosynthesis"}]}'),
      (member, tag_only, '{"tags":["botany"]}'),
      (member, archived, '{"tags":["Botany"],"concepts":[{"name":"Photosynthesis"}]}'),
      (other, foreign_article, '{"tags":["Botany"],"concepts":[{"name":"Photosynthesis"}]}')
    ) as fixture(owner, id, signals);

    with library as (
      insert into public.articles (user_id, url, canonical_url, title, domain, captured_at)
      select member, 'https://example.test/library/' || n, 'https://example.test/library/' || n,
        'Unrelated capture ' || n, 'example.test', now() - interval '1 day'
      from generate_series(1, 2500) as n returning id
    )
    insert into public.article_ai_notes (user_id, article_id, payload, schema_version, model)
    select member, id, note_metadata || '{"tags":["astronomy"],"concepts":[{"name":"Orbit"}]}'::jsonb, 1, 'fixture'
    from library;

    perform set_config('request.jwt.claims', jsonb_build_object('sub', member)::text, true);
    set local role authenticated;
    started := clock_timestamp();
    select array_agg(related.id order by result_order) into actual
    from public.capture_related_articles(source) with ordinality related(id, title, domain, result_order);
    elapsed := clock_timestamp() - started;
    if actual is distinct from array[topic_and_note, topic_only, concept_only, tag_only]
    then raise exception 'Unexpected ranked related articles: %', actual; end if;
    if elapsed > interval '750 milliseconds'
    then raise exception 'Related query exceeded 750 ms on fixture library: %', elapsed; end if;
    if exists (select 1 from public.capture_related_articles(foreign_article))
      or exists (select 1 from public.capture_related_articles(gen_random_uuid()))
    then raise exception 'Unavailable source returned related articles'; end if;
    reset role;
    if has_function_privilege('anon', 'public.capture_related_articles(uuid)', 'EXECUTE')
    then raise exception 'Anonymous role can execute related article query'; end if;
    raise sqlstate 'Z0071';
  exception when sqlstate 'Z0071' then
    raise notice 'CAP-071 ranking and isolation verified on 2,500 unrelated captures in %; fixtures rolled back', elapsed;
  end;
end;
$$;
