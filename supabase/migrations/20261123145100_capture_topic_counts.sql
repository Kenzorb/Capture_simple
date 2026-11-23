create or replace function public.capture_topic_tree()
returns jsonb
language sql stable
set search_path = ''
as $$
  with owner as (select auth.uid() as id),
  counts as (
    select link.topic_id, count(*) as article_count
    from public.article_topics link
    join public.articles article on article.id = link.article_id and article.user_id = link.user_id
    where link.user_id = (select id from owner) and article.archived_at is null
    group by link.topic_id
  )
  select coalesce(jsonb_agg(t order by lower(t.name), t.id), '[]'::jsonb)
  from (
    select topic.id, topic.parent_id, topic.name, topic.description, topic.created_at,
      coalesce(counts.article_count, 0) as article_count
    from public.topics topic
    left join counts on counts.topic_id = topic.id
    where topic.user_id = (select id from owner)
  ) t;
$$;
