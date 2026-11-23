do $$
declare
  owner uuid := gen_random_uuid();
  other uuid := gen_random_uuid();
  own_job uuid;
  future_job uuid;
  foreign_job uuid;
  results uuid[];
begin
  begin
    insert into auth.users (id, email)
    values (owner, owner || '@example.test'), (other, other || '@example.test');
    with inserted as (
      insert into public.articles (user_id, url, canonical_url, title, domain, status)
      values (owner, 'https://example.test/due', 'https://example.test/due', 'Due', 'example.test', 'queued')
      returning id
    )
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    select owner, id, 'due' from inserted returning id into own_job;
    with inserted as (
      insert into public.articles (user_id, url, canonical_url, title, domain, status)
      values (owner, 'https://example.test/future', 'https://example.test/future', 'Future', 'example.test', 'queued')
      returning id
    )
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    select owner, id, 'future' from inserted returning id into future_job;
    with inserted as (
      insert into public.articles (user_id, url, canonical_url, title, domain, status)
      values (other, 'https://example.test/other', 'https://example.test/other', 'Other', 'example.test', 'queued')
      returning id
    )
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    select other, id, 'other' from inserted returning id into foreign_job;
    insert into public.job_outbox (job_id, next_attempt_at)
    values (own_job, now()), (future_job, now() + interval '5 minutes'), (foreign_job, now());
    select array_agg(job_id) into results from public.capture_due_owner_jobs(owner);
    if results is distinct from array[own_job] then raise exception 'Local queue selected the wrong jobs'; end if;
    select array_agg(job_id) into results from public.capture_due_owner_jobs(other);
    if results is distinct from array[foreign_job] then raise exception 'Local queue failed to isolate accounts'; end if;
    if has_function_privilege('authenticated', 'public.capture_due_owner_jobs(uuid)', 'EXECUTE')
      or has_function_privilege('anon', 'public.capture_due_owner_jobs(uuid)', 'EXECUTE')
    then raise exception 'Local queue discovery exposed to a client role'; end if;
    raise sqlstate 'Z0069';
  exception when sqlstate 'Z0069' then
    raise notice 'Owner queue assertions passed and fixtures rolled back';
  end;
end;
$$;
