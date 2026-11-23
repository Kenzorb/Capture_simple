do $$
declare
  member uuid := gen_random_uuid();
  article uuid;
  stuck_article uuid;
  job uuid;
  stuck_job uuid;
  period uuid;
  initial text := gen_random_uuid()::text;
  recovered text := gen_random_uuid()::text;
  source text := 'Leaves collect light.';
  hash text := encode(extensions.digest(source, 'sha256'), 'hex');
  chunk text := 'ch_' || left(hash, 16) || '_1';
  note jsonb := jsonb_build_object(
    'schema_version', 1, 'model', 'fixture-model', 'language', 'en', 'summary', source,
    'key_takeaways', jsonb_build_array(source), 'tags', '[]'::jsonb,
    'concepts', '[]'::jsonb, 'suggested_topic_paths', '[]'::jsonb,
    'sections', jsonb_build_array(jsonb_build_object('heading', 'Leaves',
      'points', jsonb_build_array(source), 'evidence_chunk_ids', jsonb_build_array(chunk))));
begin
  begin
    insert into auth.users (id, email) values (member, member || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (member, 'https://example.test/crash', 'https://example.test/crash',
      'Crash fixture', 'example.test', 'processing') returning id into article;
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (member, 'https://example.test/stuck', 'https://example.test/stuck',
      'Dead letter fixture', 'example.test', 'queued') returning id into stuck_article;
    insert into public.usage_periods (user_id, period_start, period_end, article_limit, reserved)
    values (member, '2026-11-01 00:00+00', '2026-12-01 00:00+00', 20, 2) returning id into period;
    insert into public.processing_jobs (user_id, article_id, idempotency_key, execution_id, status, updated_at)
    values (member, article, 'crash-fixture', initial, 'processing', now() - interval '16 minutes') returning id into job;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (member, stuck_article, 'stuck-fixture') returning id into stuck_job;
    insert into public.usage_events (user_id, usage_period_id, job_id)
    values (member, period, job), (member, period, stuck_job);
    insert into public.job_outbox (job_id, status, generation, dispatched_at)
    values (job, 'dispatched', 1, now() - interval '16 minutes'),
      (stuck_job, 'dispatched', 3, now() - interval '16 minutes');
    if has_function_privilege('authenticated', 'public.capture_reconcile_jobs(uuid)', 'EXECUTE')
      or has_function_privilege('anon', 'public.capture_start_delivery(uuid,text,integer)', 'EXECUTE')
    then raise exception 'Recovery privileges are too broad'; end if;
    if public.capture_reconcile_jobs(job) <> 1 or public.capture_reconcile_jobs(job) <> 0
    then raise exception 'Crash reconciliation was not idempotent'; end if;
    if (select generation from public.capture_claim_dispatch(job)) is distinct from 2
      or public.capture_start_delivery(job, initial, 1)
      or public.capture_finish_job(job, initial, 'ready')
      or not public.capture_start_delivery(job, recovered, 2)
      or public.capture_start_delivery(job, gen_random_uuid()::text, 2)
    then raise exception 'A stale or duplicate worker was accepted'; end if;
    if not public.capture_store_source(job, recovered, source, hash, 'capture',
      jsonb_build_array(jsonb_build_object('chunk_id', chunk, 'position', 0,
        'start_byte', 0, 'end_byte', octet_length(source), 'text', source)))
      or not public.capture_publish_note(job, recovered, note)
      or not public.capture_publish_note(job, recovered, note)
    then raise exception 'Replacement worker did not publish its note once'; end if;
    if public.capture_reconcile_jobs(stuck_job) <> 1
    then raise exception 'Exhausted work did not reconcile'; end if;
    if public.capture_reconcile_jobs(stuck_job) <> 0
    then raise exception 'Exhausted work reconciled twice'; end if;
    if not exists (select 1 from public.job_outbox where job_id = stuck_job and status = 'dead')
      or not exists (select 1 from public.articles where id = stuck_article and status = 'failed')
    then raise exception 'Exhausted work was not dead-lettered'; end if;
    if (select count(*) from public.article_ai_notes where user_id = member) <> 1
      or not exists (select 1 from public.usage_periods where id = period and used = 1 and reserved = 0)
    then raise exception 'Recovery duplicated note or quota'; end if;
    raise sqlstate 'Z0059';
  exception when sqlstate 'Z0059' then
    raise notice 'CAP-059 assertions passed and fixtures rolled back';
  end;
end;
$$;
