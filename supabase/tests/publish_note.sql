do $$
declare
  member uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  article uuid;
  job uuid;
  period uuid;
  secondary uuid;
  manual uuid;
  foreign_topic uuid;
  execution text := gen_random_uuid()::text;
  source text := 'Leaves collect light.';
  hash text := encode(extensions.digest(source, 'sha256'), 'hex');
  chunk text := 'ch_' || left(hash, 16) || '_1';
  note jsonb := jsonb_build_object(
    'schema_version', 1, 'model', 'fixture-model', 'language', 'en', 'summary', source,
    'key_takeaways', jsonb_build_array(source), 'tags', '[]'::jsonb,
    'concepts', '[]'::jsonb,
    'suggested_topic_paths', '[["Web Development","API"],["Statistics"],["statistics"],["Missing secondary"]]'::jsonb,
    'sections', jsonb_build_array(jsonb_build_object('heading', 'Leaves',
      'points', jsonb_build_array(source), 'evidence_chunk_ids', jsonb_build_array(chunk)))
  );
begin
  begin
    insert into auth.users (id, email)
    values (member, member || '@example.test'), (other, other || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (member, 'https://example.test/publish', 'https://example.test/publish',
      'Publication fixture', 'example.test', 'queued') returning id into article;
    insert into public.personal_notes (article_id, user_id, body)
    values (article, member, 'Keep my own notes');
    insert into public.topics (user_id, name) values (member, 'Statistics') returning id into secondary;
    insert into public.topics (user_id, name) values (member, 'Manual') returning id into manual;
    insert into public.topics (user_id, name) values (other, 'Statistics') returning id into foreign_topic;
    insert into public.article_topics (user_id, article_id, topic_id, assignment_source, confidence)
    values (member, article, manual, 'manual', 0.85);
    begin
      insert into public.article_topics (user_id, article_id, topic_id, assignment_source)
      values (member, article, foreign_topic, 'ai');
      raise exception 'Cross-account membership accepted';
    exception when foreign_key_violation then null;
    end;
    insert into public.usage_periods (user_id, period_start, period_end, article_limit, reserved)
    values (member, '2026-11-01 00:00+00', '2026-12-01 00:00+00', 20, 1) returning id into period;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (member, article, 'publish-fixture') returning id into job;
    insert into public.usage_events (user_id, usage_period_id, job_id) values (member, period, job);
    if not public.capture_start_job(job, execution) then raise exception 'Fixture start failed'; end if;
    if not public.capture_store_source(job, execution, source, hash, 'capture',
      jsonb_build_array(jsonb_build_object('chunk_id', chunk, 'position', 0,
        'start_byte', 0, 'end_byte', octet_length(source), 'text', source)))
    then raise exception 'Fixture evidence store failed'; end if;
    if public.capture_publish_note(job, gen_random_uuid()::text, note) then
      raise exception 'Stale execution published a note';
    end if;
    begin
      perform public.capture_publish_note(job, execution, jsonb_set(note,
        '{sections,0,evidence_chunk_ids}', '["ch_0000000000000000_1"]'::jsonb));
      raise exception 'Invented evidence accepted';
    exception when invalid_parameter_value then null;
    end;
    if exists (select 1 from public.article_ai_notes where article_id = article)
      or exists (select 1 from public.article_topics where article_id = article and assignment_source = 'ai')
      or not exists (select 1 from public.usage_periods where id = period and used = 0 and reserved = 1)
    then raise exception 'Rejected publication changed the note or quota'; end if;
    if not public.capture_publish_note(job, execution, note)
      or not public.capture_publish_note(job, execution, note)
      or public.capture_publish_note(job, execution, jsonb_set(note, '{summary}', '"Different output"'))
    then raise exception 'Publication replay was incorrect'; end if;
    if not exists (
      select 1 from public.article_ai_notes a join public.personal_notes p on p.article_id = a.article_id
      join public.articles c on c.id = a.article_id
      where a.article_id = article and a.payload = note and c.status = 'ready'
        and p.body = 'Keep my own notes'
    ) or not exists (select 1 from public.usage_periods where id = period and used = 1 and reserved = 0)
    then raise exception 'Expected one durable note and one consumed reservation'; end if;
    if (select count(*) from public.article_topics where article_id = article) <> 3
      or (select count(*) from public.article_topics where article_id = article and is_primary) <> 1
      or not exists (
        select 1 from public.article_topics link join public.topics t on t.id = link.topic_id
        where link.article_id = article and link.is_primary and link.assignment_source = 'ai'
          and t.name = 'API' and t.user_id = member and link.confidence is null
      )
      or not exists (select 1 from public.article_topics where article_id = article
        and topic_id = secondary and not is_primary and assignment_source = 'ai')
      or not exists (select 1 from public.article_topics where article_id = article
        and topic_id = manual and assignment_source = 'manual' and confidence = 0.85)
      or exists (select 1 from public.topics where user_id = member and name = 'Missing secondary')
    then raise exception 'Publication did not assign one primary and preserve the distinct existing memberships'; end if;
    raise sqlstate 'Z0057';
  exception when sqlstate 'Z0057' then
    raise notice 'CAP-057 assertions passed and fixtures rolled back';
  end;
end;
$$;
