create or replace function public.capture_related_articles(p_article_id uuid)
returns table (id uuid, title text, domain text)
language sql stable
set search_path = ''
set jit = off
as $$
  with source as materialized (
    select a.user_id, a.id
    from public.articles a
    where a.user_id = (select auth.uid()) and a.id = p_article_id
  ),
  topic_candidates as materialized (
    select other.article_id, count(*) as shared_topics
    from source s
    join public.article_topics original on original.user_id = s.user_id and original.article_id = s.id
    join public.article_topics other on other.user_id = s.user_id and other.topic_id = original.topic_id
    join public.articles a on a.user_id = s.user_id and a.id = other.article_id
    where other.article_id <> s.id and a.archived_at is null
    group by other.article_id, a.captured_at
    order by shared_topics desc, a.captured_at desc, other.article_id
    limit 100
  ),
  recent_notes as materialized (
    select a.id
    from source s
    join public.articles a on a.user_id = s.user_id
    join public.article_ai_notes n on n.user_id = s.user_id and n.article_id = a.id
    where a.id <> s.id and a.archived_at is null
    order by a.captured_at desc, a.id
    limit 200
  ),
  candidates as materialized (
    select article_id as id from topic_candidates
    union
    select id from recent_notes
  ),
  notes as materialized (
    select n.article_id, n.payload
    from (
      select id from source
      union all
      select id from candidates
    ) selected
    join public.article_ai_notes n on n.article_id = selected.id and n.user_id = (select auth.uid())
  ),
  labels as materialized (
    select distinct n.article_id, signal.kind, lower(btrim(signal.label)) as label
    from notes n
    cross join lateral (
      select 'tag' as kind, tag.value #>> '{}' as label
      from jsonb_array_elements(case when jsonb_typeof(n.payload -> 'tags') = 'array'
        then n.payload -> 'tags' else '[]'::jsonb end) as tag(value)
      where jsonb_typeof(tag.value) = 'string'
      union all
      select 'concept', concept.value ->> 'name'
      from jsonb_array_elements(case when jsonb_typeof(n.payload -> 'concepts') = 'array'
        then n.payload -> 'concepts' else '[]'::jsonb end) as concept(value)
      where jsonb_typeof(concept.value -> 'name') = 'string'
    ) signal
    where btrim(signal.label) <> ''
  ),
  source_labels as materialized (
    select kind, label from labels where article_id = p_article_id
  ),
  -- Compute all candidate scores once before joining them to display rows.
  label_scores as materialized (
    select other.article_id, sum(case other.kind when 'concept' then 2 else 1 end) as score
    from source_labels original
    join labels other on other.label = original.label and other.kind = original.kind
    where other.article_id <> p_article_id
    group by other.article_id
  )
  select a.id, a.title, a.domain
  from candidates c
  join public.articles a on a.id = c.id and a.user_id = (select auth.uid())
  left join topic_candidates t on t.article_id = c.id
  left join label_scores l on l.article_id = c.id
  where t.shared_topics is not null or l.score is not null
  order by (coalesce(t.shared_topics, 0) * 4 + coalesce(l.score, 0)) desc, a.captured_at desc, a.id
  limit 6;
$$;
