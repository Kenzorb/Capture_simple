create function public.capture_set_primary_topic(p_article_id uuid, p_topic_id uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null or (select auth.jwt() ->> 'client_id') is not null or not exists (
    select 1 from auth.sessions s where s.user_id = owner_id
      and s.id::text = (select auth.jwt() ->> 'session_id')
  ) then raise insufficient_privilege; end if;
  -- Match publication's article-then-owner locking order.
  perform 1 from public.articles
    where id = p_article_id and user_id = owner_id for update;
  if not found then return false; end if;
  perform 1 from public.profiles where id = owner_id for no key update;
  if not exists (select 1 from public.topics where id = p_topic_id and user_id = owner_id)
  then return false; end if;

  delete from public.article_topics
    where user_id = owner_id and article_id = p_article_id
      and is_primary and topic_id <> p_topic_id;
  insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
  values (owner_id, p_article_id, p_topic_id, true, 'manual')
  on conflict (article_id, topic_id)
  do update set is_primary = true, assignment_source = 'manual', confidence = null;
  return true;
end;
$$;

revoke execute on function public.capture_set_primary_topic(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_set_primary_topic(uuid, uuid) to authenticated;

create or replace function public.capture_publish_note(p_job_id uuid, p_execution_id text, p_note jsonb)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  article public.articles;
  suggestions jsonb;
  candidate jsonb;
  labels text[];
  matched uuid[];
  primary_topic uuid;
begin
  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null then return false; end if;
  if not capture_private.capture_publish_note(p_job_id, p_execution_id, p_note)
  then return false; end if;

  -- The transaction may be replaying an acknowledged publication.
  if article.status <> 'processing' then return true; end if;

  perform 1 from public.profiles where id = article.user_id for no key update;
  -- Manual placement takes precedence over new AI suggestions for this capture.
  if exists (
    select 1 from public.article_topics
    where user_id = article.user_id and article_id = article.id
      and is_primary and assignment_source = 'manual'
  ) then return true; end if;

  delete from public.article_topics
    where user_id = article.user_id and article_id = article.id and assignment_source = 'ai';
  select t.topic_id into primary_topic from public.article_topics t
    where t.user_id = article.user_id and t.article_id = article.id and t.is_primary;

  suggestions := case when jsonb_typeof(p_note -> 'suggested_topic_paths') = 'array'
    then p_note -> 'suggested_topic_paths' else '[]'::jsonb end;

  for candidate in
    select item.value from jsonb_array_elements(suggestions) with ordinality item(value, sort)
    order by item.sort limit 5
  loop
    if jsonb_typeof(candidate) <> 'array' then continue; end if;
    if jsonb_array_length(candidate) not between 1 and 4
      or exists (
        select 1 from jsonb_array_elements(candidate) item
        where jsonb_typeof(item) <> 'string'
          or char_length(normalize(item #>> '{}', NFKC)) > 120
          or capture_private.topic_label_key(item #>> '{}') = ''
      )
    then continue; end if;

    select array_agg(item.value order by item.sort) into labels
      from jsonb_array_elements_text(candidate) with ordinality item(value, sort);

    if primary_topic is null then
      primary_topic := public.capture_resolve_topic_path(article.user_id, labels);
      insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
      values (article.user_id, article.id, primary_topic, true, 'ai')
      on conflict (article_id, topic_id) do update set is_primary = true;
    else
      -- Additional suggestions may reuse complete paths without creating extra branches.
      matched := public.capture_match_topic_path(article.user_id, labels);
      if cardinality(matched) = cardinality(labels) then
        insert into public.article_topics (user_id, article_id, topic_id, assignment_source)
        values (article.user_id, article.id, matched[cardinality(matched)], 'ai')
        on conflict (article_id, topic_id) do nothing;
      end if;
    end if;
  end loop;

  if primary_topic is null then
    primary_topic := public.capture_resolve_topic_path(article.user_id);
    insert into public.article_topics (user_id, article_id, topic_id, is_primary, assignment_source)
    values (article.user_id, article.id, primary_topic, true, 'ai')
    on conflict (article_id, topic_id) do update set is_primary = true;
  end if;
  return true;
end;
$$;

revoke execute on function public.capture_publish_note(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_publish_note(uuid, text, jsonb) to service_role;
