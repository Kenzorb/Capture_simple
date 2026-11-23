create index articles_title_search_idx on public.articles
  using gin (to_tsvector('simple', title));
create index article_ai_notes_search_idx on public.article_ai_notes
  using gin (to_tsvector('simple',
    coalesce(payload ->> 'summary', '') || ' ' ||
    jsonb_path_query_array(payload, '$.concepts[*].name')::text));
create index personal_notes_search_idx on public.personal_notes
  using gin (to_tsvector('simple', body));
create index topics_name_search_idx on public.topics
  using gin (to_tsvector('simple', name));

create function public.capture_search_articles(
  p_query text,
  p_limit integer default 20,
  p_status public.article_status default null,
  p_topic uuid default null,
  p_domain text default null,
  p_archived boolean default false,
  p_ascending boolean default false,
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid, url text, title text, domain text, author text,
  published_at timestamptz, captured_at timestamptz, archived_at timestamptz,
  status public.article_status
)
language plpgsql stable
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  terms tsquery;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_query is null or char_length(btrim(p_query)) not between 1 and 200
    or p_query ~ '[[:cntrl:]]' or p_limit is null or p_limit not between 1 and 100
    or (p_cursor_at is null) <> (p_cursor_id is null)
  then raise invalid_parameter_value; end if;
  terms := websearch_to_tsquery('simple', p_query);
  if querytree(terms) in ('', 'T') then return; end if;

  return query
  with matching as (
    select a.id from public.articles a
    where a.user_id = owner_id and to_tsvector('simple', a.title) @@ terms
    union
    select n.article_id from public.article_ai_notes n
    where n.user_id = owner_id and to_tsvector('simple',
      coalesce(n.payload ->> 'summary', '') || ' ' ||
      jsonb_path_query_array(n.payload, '$.concepts[*].name')::text) @@ terms
    union
    select n.article_id from public.personal_notes n
    where n.user_id = owner_id and to_tsvector('simple', n.body) @@ terms
    union
    select link.article_id
    from public.topics t
    join public.article_topics link on link.user_id = t.user_id and link.topic_id = t.id
    where t.user_id = owner_id and to_tsvector('simple', t.name) @@ terms
  )
  select a.id, a.url, a.title, a.domain, a.author, a.published_at,
    a.captured_at, a.archived_at, a.status
  from matching m join public.articles a on a.id = m.id and a.user_id = owner_id
  where (a.archived_at is not null) = coalesce(p_archived, false)
    and (p_status is null or a.status = p_status)
    and (p_domain is null or a.domain = lower(p_domain))
    and (p_topic is null or exists (
      select 1 from public.article_topics link
      where link.user_id = a.user_id and link.article_id = a.id and link.topic_id = p_topic
    ))
    and (p_cursor_at is null or case when p_ascending
      then (a.captured_at, a.id) > (p_cursor_at, p_cursor_id)
      else (a.captured_at, a.id) < (p_cursor_at, p_cursor_id)
    end)
  order by
    case when p_ascending then a.captured_at end asc,
    case when p_ascending then a.id end asc,
    a.captured_at desc, a.id desc
  limit p_limit + 1;
end;
$$;

revoke execute on function public.capture_search_articles(text, integer, public.article_status, uuid, text, boolean, boolean, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_search_articles(text, integer, public.article_status, uuid, text, boolean, boolean, timestamptz, uuid)
  to authenticated;
