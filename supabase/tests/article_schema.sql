do $$
declare
  first_user uuid := gen_random_uuid();
  second_user uuid := gen_random_uuid();
  first_article uuid;
  long_url text;
  duplicate_blocked boolean := false;
  wrong_owner_blocked boolean := false;
begin
  begin
    select 'https://example.test/?q=' || string_agg(md5(i::text), '' order by i)
    into long_url from generate_series(1, 125) as i;

    insert into auth.users (id, email)
    values (first_user, first_user || '@example.test'), (second_user, second_user || '@example.test');

    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (first_user, long_url, long_url, 'First capture', 'example.test')
    returning id into first_article;

    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (second_user, long_url, long_url, 'Second capture', 'example.test');

    begin
      insert into public.articles (user_id, url, canonical_url, title, domain)
      values (first_user, long_url, long_url, 'Duplicate capture', 'example.test');
    exception when unique_violation then
      duplicate_blocked := true;
    end;
    if not duplicate_blocked then raise exception 'Duplicate capture accepted'; end if;

    begin
      insert into public.personal_notes (user_id, article_id, body)
      values (second_user, first_article, 'Wrong owner');
    exception when foreign_key_violation then
      wrong_owner_blocked := true;
    end;
    if not wrong_owner_blocked then raise exception 'Cross-owner note accepted'; end if;

    insert into public.article_contents (user_id, article_id, cleaned_text)
    values (first_user, first_article, 'Extracted text');
    insert into public.personal_notes (user_id, article_id, body)
    values (first_user, first_article, 'Personal note');

    delete from auth.users where id = first_user;
    if exists (select from public.profiles where id = first_user)
      or exists (select from public.articles where id = first_article)
      or exists (select from public.article_contents where article_id = first_article)
      or exists (select from public.personal_notes where article_id = first_article)
      or not exists (select from public.articles where user_id = second_user)
    then
      raise exception 'Account deletion did not cascade within the owning account';
    end if;

    raise sqlstate 'Z0017'; -- Roll back all fixtures after the assertions pass.
  exception when sqlstate 'Z0017' then
    raise notice 'CAP-017 schema assertions passed; fixtures rolled back';
  end;
end;
$$;
