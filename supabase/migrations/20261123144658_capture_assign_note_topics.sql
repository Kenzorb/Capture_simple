alter function public.capture_publish_note(uuid, text, jsonb) set schema capture_private;
revoke execute on function capture_private.capture_publish_note(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create function public.capture_publish_note(p_job_id uuid, p_execution_id text, p_note jsonb)
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
