create function public.capture_publish_note(
  p_job_id uuid, p_execution_id text, p_note jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  article public.articles;
  job public.processing_jobs;
begin
  if jsonb_typeof(p_note) is distinct from 'object' or octet_length(p_note::text) > 24000
    or p_note -> 'schema_version' is distinct from '1'::jsonb
    or coalesce(p_note ->> 'model', '') !~ '^[a-zA-Z0-9._:-]{1,120}$'
    or jsonb_typeof(p_note -> 'summary') is distinct from 'string'
    or jsonb_typeof(p_note -> 'sections') is distinct from 'array'
    or jsonb_typeof(p_note -> 'concepts') is distinct from 'array'
  then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_note -> 'sections') not between 1 and 8
    or jsonb_array_length(p_note -> 'concepts') > 12
  then raise invalid_parameter_value; end if;

  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null then return false; end if;
  select * into job from public.processing_jobs where id = p_job_id for update;
  if job.execution_id is null or job.execution_id is distinct from p_execution_id then return false; end if;

  if job.status = 'succeeded' and article.status = 'ready' then
    return exists (
      select 1 from public.article_ai_notes n
      where n.article_id = article.id and n.user_id = article.user_id and n.payload = p_note
    );
  end if;
  if job.status is distinct from 'processing' or article.status <> 'processing' then
    return false;
  end if;

  if exists (
    select 1 from jsonb_array_elements((p_note -> 'sections') || (p_note -> 'concepts')) item
    where case
      when jsonb_typeof(item -> 'evidence_chunk_ids') = 'array'
        then jsonb_array_length(item -> 'evidence_chunk_ids') not between 1 and 8
      else true end
  ) then raise invalid_parameter_value; end if;

  if exists (
    select 1 from jsonb_array_elements((p_note -> 'sections') || (p_note -> 'concepts')) item
    cross join lateral jsonb_array_elements_text(item -> 'evidence_chunk_ids') evidence(id)
    where not exists (
      select 1 from public.article_source_chunks c
      where c.article_id = article.id and c.user_id = article.user_id and c.chunk_id = evidence.id
    )
  ) then raise invalid_parameter_value; end if;

  insert into public.article_ai_notes (article_id, user_id, schema_version, model, payload)
  values (article.id, article.user_id, 1, p_note ->> 'model', p_note)
  on conflict (article_id) do update set schema_version = excluded.schema_version,
    model = excluded.model, payload = excluded.payload;

  if not public.capture_finish_job(p_job_id, p_execution_id, 'ready') then
    raise check_violation using message = 'Note cannot be published for an inactive job';
  end if;
  return true;
end;
$$;
revoke execute on function public.capture_publish_note(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.capture_publish_note(uuid, text, jsonb) to service_role;
