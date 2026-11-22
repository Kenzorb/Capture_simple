do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  owner_root uuid;
  owner_child uuid;
  other_root uuid;
  article uuid;
begin
  begin
    insert into auth.users (id, email)
    values (owner_id, owner_id || '@example.test'), (other_id, other_id || '@example.test');
    insert into public.topics (user_id, name) values (owner_id, 'Science') returning id into owner_root;
    insert into public.topics (user_id, name) values (other_id, 'Science') returning id into other_root;
    insert into public.topics (user_id, parent_id, name)
    values (owner_id, owner_root, 'Geology') returning id into owner_child;

    begin
      insert into public.topics (user_id, name) values (owner_id, ' science ');
      raise exception 'Duplicate root accepted';
    exception when unique_violation then null;
    end;
    begin
      insert into public.topics (user_id, parent_id, name) values (owner_id, owner_root, 'geology');
      raise exception 'Duplicate sibling accepted';
    exception when unique_violation then null;
    end;
    begin
      update public.topics set parent_id = owner_child where id = owner_root;
      raise exception 'Topic cycle accepted';
    exception when check_violation then null;
    end;
    begin
      update public.topics set parent_id = other_root where id = owner_child;
      raise exception 'Cross-owner parent accepted';
    exception when foreign_key_violation then null;
    end;

    insert into public.articles (user_id, url, canonical_url, title, domain)
    values (owner_id, 'https://example.test', 'https://example.test', 'Rocks', 'example.test')
    returning id into article;
    insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
    values (owner_id, article, owner_root, true, 'manual');
    begin
      insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
      values (owner_id, article, owner_child, true, 'manual');
      raise exception 'Second primary topic accepted';
    exception when unique_violation then null;
    end;
    begin
      insert into public.article_topics (user_id, article_id, topic_id, assignment_source)
      values (owner_id, article, other_root, 'ai');
      raise exception 'Cross-owner article link accepted';
    exception when foreign_key_violation then null;
    end;

    delete from auth.users where id = owner_id;
    if exists (select from public.topics where user_id = owner_id)
      or exists (select from public.topic_tree_versions where user_id = owner_id)
      or exists (select from public.article_topics where user_id = owner_id)
      or not exists (select from public.topics where id = other_root)
    then
      raise exception 'Topic deletion did not cascade within the owning account';
    end if;

    raise sqlstate 'Z0018'; -- Roll back the synthetic fixtures.
  exception when sqlstate 'Z0018' then
    raise notice 'CAP-018 schema assertions passed; fixtures rolled back';
  end;
end;
$$;
