do $$
declare
  member uuid := gen_random_uuid();
  article uuid;
  job uuid;
  execution text := gen_random_uuid()::text;
  source text := 'Heading' || chr(10) || 'Café';
  hash text := encode(extensions.digest(source, 'sha256'), 'hex');
  chunks jsonb := jsonb_build_array(jsonb_build_object(
    'chunk_id', 'ch_' || left(hash, 16) || '_1', 'position', 0,
    'start_byte', 0, 'end_byte', octet_length(source), 'text', source
  ));
begin
  begin
    insert into auth.users (id, email) values (member, member || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (member, 'https://example.test/source', 'https://example.test/source',
      'Evidence fixture', 'example.test', 'queued') returning id into article;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (member, article, 'evidence-fixture') returning id into job;
    if not public.capture_start_job(job, execution) then raise exception 'Could not start job'; end if;
    if public.capture_store_source(job, gen_random_uuid()::text, source, hash, 'capture', chunks)
    then raise exception 'Stale execution wrote evidence'; end if;

    begin
      perform public.capture_store_source(job, execution, source, hash, 'capture',
        jsonb_set(chunks, '{0,text}', to_jsonb('Invalid evidence'::text)));
      raise exception 'Invalid evidence was accepted';
    exception when invalid_parameter_value then null;
    end;
    if not public.capture_store_source(job, execution, source, hash, 'capture', chunks)
      or not public.capture_store_source(job, execution, source, hash, 'capture', chunks)
    then raise exception 'Valid source could not be persisted'; end if;
    if not exists (select 1 from public.article_contents where article_id = article and content_hash = hash)
      or (select count(*) from public.article_source_chunks
          where article_id = article and user_id = member and text = source) <> 1
    then raise exception 'Expected one durable evidence chunk and matching source hash'; end if;
    raise sqlstate 'Z0053';
  exception when sqlstate 'Z0053' then
    raise notice 'CAP-053 assertions passed and fixtures rolled back';
  end;
end;
$$;
