do $$
declare
  member uuid := gen_random_uuid();
  article uuid;
  note jsonb := '{"schema_version":1,"model":"fixture-model","summary":"Leaves collect light."}';
begin
  begin
    insert into auth.users (id, email) values (member, member || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (member, 'https://example.test/note', 'https://example.test/note', 'Note fixture', 'example.test')
    returning id into article;
    insert into public.personal_notes (article_id, user_id, body)
    values (article, member, 'Keep the personal note');

    begin
      insert into public.article_ai_notes (article_id, user_id, schema_version, model, payload)
      values (article, member, 2, 'fixture-model', note);
      raise exception 'Version mismatch accepted';
    exception when check_violation then null;
    end;
    begin
      insert into public.article_ai_notes (article_id, user_id, schema_version, model, payload)
      values (article, member, 1, 'fixture-model', note - 'model');
      raise exception 'Missing model metadata accepted';
    exception when check_violation then null;
    end;
    insert into public.article_ai_notes (article_id, user_id, schema_version, model, payload)
    values (article, member, 1, 'fixture-model', note);
    if not exists (
      select 1 from public.article_ai_notes a join public.personal_notes p on p.article_id = a.article_id
      where a.article_id = article and a.payload = note and a.schema_version = 1
        and p.body = 'Keep the personal note'
    ) then raise exception 'Stored note metadata or personal note was lost'; end if;
    if has_table_privilege('authenticated', 'public.article_ai_notes', 'INSERT') then
      raise exception 'Client can insert privileged analysis';
    end if;
    raise sqlstate 'Z0054';
  exception when sqlstate 'Z0054' then
    raise notice 'CAP-054 assertions passed and fixtures rolled back';
  end;
end;
$$;
