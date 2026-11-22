do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  article uuid;
  second_article uuid;
  job uuid;
  period uuid;
  other_period uuid;
  rows_reserved integer;
begin
  begin
    insert into auth.users (id, email)
    values (owner_id, owner_id || '@example.test'), (other_id, other_id || '@example.test');

    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (owner_id, 'https://example.test/one', 'https://example.test/one', 'One', 'example.test')
    returning id into article;
    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (owner_id, 'https://example.test/two', 'https://example.test/two', 'Two', 'example.test')
    returning id into second_article;
    insert into public.processing_jobs (user_id, article_id, idempotency_key)
    values (owner_id, article, 'fixture-request') returning id into job;
    insert into public.job_outbox (job_id) values (job);
    begin
      insert into public.processing_jobs (user_id, article_id, idempotency_key)
      values (owner_id, second_article, 'fixture-request');
      raise exception 'Reused job idempotency key accepted';
    exception when unique_violation then null;
    end;
    begin
      insert into public.job_outbox (job_id) values (job);
      raise exception 'Duplicate outbox job accepted';
    exception when unique_violation then null;
    end;

    insert into public.usage_periods (user_id, period_start, period_end, article_limit)
    values (owner_id, '2026-11-01', '2026-12-01', 1) returning id into period;
    insert into public.usage_periods (user_id, period_start, period_end, article_limit)
    values (other_id, '2026-11-01', '2026-12-01', 1) returning id into other_period;

    update public.usage_periods set reserved = reserved + 1
    where id = period and used + reserved < article_limit;
    get diagnostics rows_reserved = row_count;
    if rows_reserved <> 1 then raise exception 'First reservation was not available'; end if;

    update public.usage_periods set reserved = reserved + 1
    where id = period and used + reserved < article_limit;
    get diagnostics rows_reserved = row_count;
    if rows_reserved <> 0 then raise exception 'Second reservation exceeded the allowance'; end if;
    begin
      update public.usage_periods set reserved = reserved + 1 where id = period;
      raise exception 'Unconditional update exceeded the allowance';
    exception when check_violation then null;
    end;

    begin
      insert into public.usage_events (user_id, usage_period_id, job_id)
      values (owner_id, other_period, job);
      raise exception 'Cross-owner usage event accepted';
    exception when foreign_key_violation then null;
    end;
    insert into public.usage_events (user_id, usage_period_id, job_id)
    values (owner_id, period, job);
    begin
      insert into public.usage_events (user_id, usage_period_id, job_id)
      values (owner_id, period, job);
      raise exception 'Duplicate usage reservation accepted';
    exception when unique_violation then null;
    end;

    update public.usage_events set state = 'consumed' where job_id = job;
    update public.usage_periods set used = used + 1, reserved = reserved - 1 where id = period;
    if not exists (select from public.usage_periods where id = period and used = 1 and reserved = 0)
    then raise exception 'Reservation did not convert to usage'; end if;

    raise sqlstate 'Z0019'; -- Roll back the synthetic fixtures.
  exception when sqlstate 'Z0019' then
    raise notice 'CAP-019 schema assertions passed; fixtures rolled back';
  end;
end;
$$;
