do $$
declare
  member uuid := gen_random_uuid();
  article uuid;
  job uuid;
  newer_job uuid;
  period uuid;
  first_run text := gen_random_uuid()::text;
  second_run text := gen_random_uuid()::text;
begin
  begin
    insert into auth.users (id, email) values (member, member || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain, status)
    values (member, 'https://example.test/process', 'https://example.test/process',
      'Processing fixture', 'example.test', 'queued') returning id into article;
    insert into public.personal_notes (article_id, user_id, body)
    values (article, member, 'Keep this note');
    insert into public.usage_periods (user_id, period_start, period_end, article_limit, reserved)
    values (member, '2026-11-01 00:00:00+00', '2026-12-01 00:00:00+00', 20, 1) returning id into period;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (member, article, 'first') returning id into job;
    insert into public.usage_events (user_id, usage_period_id, job_id) values (member, period, job);

    if has_function_privilege('authenticated', 'public.capture_start_job(uuid,text)', 'EXECUTE')
      or has_function_privilege('authenticated', 'public.capture_finish_job(uuid,text,public.article_status,text)', 'EXECUTE')
      or not has_function_privilege('service_role', 'public.capture_start_job(uuid,text)', 'EXECUTE')
      or not has_function_privilege('service_role', 'public.capture_finish_job(uuid,text,public.article_status,text)', 'EXECUTE')
    then raise exception 'Transition grants are incorrect'; end if;
    if public.capture_finish_job(job, first_run, 'ready') then
      raise exception 'Job skipped processing';
    end if;
    if not public.capture_start_job(job, first_run) or not public.capture_start_job(job, first_run)
      or public.capture_start_job(job, second_run)
    then raise exception 'Processing claim was incorrect'; end if;
    if public.capture_finish_job(job, second_run, 'failed', 'provider_unavailable') then
      raise exception 'Different execution could finish the job';
    end if;
    begin
      perform public.capture_finish_job(job, first_run, 'queued');
      raise exception 'Invalid transition accepted';
    exception when invalid_parameter_value then null;
    end;
    if not public.capture_finish_job(job, first_run, 'failed', 'provider_unavailable')
      or not public.capture_finish_job(job, first_run, 'failed', 'provider_unavailable')
      or public.capture_finish_job(job, first_run, 'ready')
    then raise exception 'Failure transition was incorrect'; end if;
    if not exists (select 1 from public.articles a join public.personal_notes n on n.article_id = a.id
      where a.id = article and a.status = 'failed' and n.body = 'Keep this note')
      or not exists (select 1 from public.usage_periods where id = period and used = 0 and reserved = 0)
      or not exists (select 1 from public.processing_jobs where id = job and attempts = 1 and status = 'failed')
    then raise exception 'Failure lost article data or miscounted reserved quota'; end if;

    update public.articles set status = 'queued' where id = article;
    update public.usage_periods set reserved = 1 where id = period;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (member, article, 'second') returning id into newer_job;
    insert into public.usage_events (user_id, usage_period_id, job_id) values (member, period, newer_job);
    if not public.capture_start_job(newer_job, second_run)
      or public.capture_finish_job(job, first_run, 'failed', 'provider_unavailable')
      or not public.capture_finish_job(newer_job, second_run, 'ready')
      or not public.capture_finish_job(newer_job, second_run, 'ready')
    then raise exception 'A stale job overwrote a newer execution'; end if;
    if not exists (select 1 from public.articles where id = article and status = 'ready')
      or not exists (select 1 from public.usage_periods where id = period and used = 1 and reserved = 0)
    then raise exception 'Successful replay consumed the wrong quota'; end if;
    raise sqlstate 'Z0051';
  exception when sqlstate 'Z0051' then
    raise notice 'CAP-051 assertions passed and fixtures rolled back';
  end;
end;
$$;
