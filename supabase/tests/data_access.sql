do $$
declare
  first_user uuid := gen_random_uuid();
  second_user uuid := gen_random_uuid();
  first_article uuid;
  second_article uuid;
  second_article_without_note uuid;
  affected integer;
begin
  begin
    insert into auth.users (id, email) values
      (first_user, first_user || '@example.test'), (second_user, second_user || '@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (first_user, 'https://example.test', 'https://example.test', 'First', 'example.test')
    returning id into first_article;
    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (second_user, 'https://example.test', 'https://example.test', 'Second', 'example.test')
    returning id into second_article;
    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (second_user, 'https://example.test/other', 'https://example.test/other', 'Other', 'example.test')
    returning id into second_article_without_note;
    insert into public.personal_notes (user_id, article_id, body)
    values (second_user, second_article, 'Second note');

    set local role authenticated;
    perform set_config('request.jwt.claim.sub', first_user::text, true);

    if not exists (select from public.articles where id = first_article)
      or exists (select from public.articles where id = second_article)
      or exists (select from public.profiles where id = second_user)
      or exists (select from public.personal_notes where article_id = second_article)
    then raise exception 'First account could not read own data or saw foreign data'; end if;

    insert into public.personal_notes (user_id, article_id, body)
    values (first_user, first_article, 'First note');
    update public.personal_notes set body = 'Updated first note' where article_id = first_article;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Own note update was denied'; end if;

    update public.personal_notes set body = 'Foreign update' where article_id = second_article;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Foreign note was updated'; end if;
    delete from public.personal_notes where article_id = second_article;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Foreign note was deleted'; end if;

    begin
      insert into public.personal_notes (user_id, article_id, body)
      values (first_user, second_article_without_note, 'Foreign article reference');
      raise exception 'Foreign article reference accepted';
    exception when foreign_key_violation then null;
    end;
    begin
      insert into public.personal_notes (user_id, article_id, body)
      values (second_user, second_article_without_note, 'Spoofed owner');
      raise exception 'Spoofed note owner accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      update public.articles set status = 'ready' where id = first_article;
      raise exception 'Client managed processing status';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.subscriptions (user_id) values (first_user);
      raise exception 'Client managed billing state';
    exception when insufficient_privilege then null;
    end;

    perform set_config('request.jwt.claim.sub', second_user::text, true);
    if not exists (select from public.personal_notes where article_id = second_article and body = 'Second note')
      or exists (select from public.articles where id = first_article)
    then raise exception 'Second account isolation failed'; end if;

    set local role anon;
    perform set_config('request.jwt.claim.sub', '', true);
    begin
      perform 1 from public.articles;
      raise exception 'Anonymous article read accepted';
    exception when insufficient_privilege then null;
    end;
    reset role;

    raise sqlstate 'Z0021'; -- Roll back the synthetic fixtures.
  exception when sqlstate 'Z0021' then
    raise notice 'CAP-021 access assertions passed; fixtures rolled back';
  end;
end;
$$;
