create table public.article_source_chunks (
  user_id uuid not null,
  article_id uuid not null,
  chunk_id text not null,
  position integer not null check (position >= 0),
  start_byte integer not null check (start_byte >= 0),
  end_byte integer not null check (end_byte > start_byte and end_byte <= 12000 and end_byte - start_byte <= 1800),
  text text not null check (octet_length(text) = end_byte - start_byte),
  primary key (article_id, chunk_id),
  unique (article_id, position),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade
);
alter table public.article_source_chunks enable row level security;
revoke all on public.article_source_chunks from public, anon, authenticated;
grant all on public.article_source_chunks to service_role;

create function public.capture_store_source(
  p_job_id uuid, p_execution_id text, p_text text, p_hash text, p_method text, p_chunks jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  article public.articles;
  source_bytes bytea;
begin
  if p_text is null or octet_length(p_text) not between 1 and 524288
    or p_method is null or p_method not in ('capture', 'http')
    or p_hash is distinct from encode(extensions.digest(p_text, 'sha256'), 'hex')
    or jsonb_typeof(p_chunks) is distinct from 'array'
  then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_chunks) not between 1 and 24 then raise invalid_parameter_value; end if;

  article := capture_private.lock_processing_article(p_job_id);
  if article.id is null or article.status <> 'processing' or not exists (
    select 1 from public.processing_jobs j where j.id = p_job_id
      and j.status = 'processing' and j.execution_id = p_execution_id
  ) then return false; end if;

  source_bytes := convert_to(p_text, 'UTF8');
  if exists (
    select 1 from (
      select c.*, row_number() over (order by c.position) - 1 as expected_position,
        lag(c.end_byte, 1, 0) over (order by c.position) as expected_start
      from jsonb_to_recordset(p_chunks) c(chunk_id text, position integer, start_byte integer, end_byte integer, text text)
    ) chunk
    where chunk.position is distinct from chunk.expected_position
      or chunk.start_byte is distinct from chunk.expected_start
      or chunk.end_byte is null or chunk.end_byte <= chunk.start_byte
      or chunk.end_byte > least(12000, octet_length(source_bytes))
      or chunk.end_byte - chunk.start_byte > 1800
      or chunk.chunk_id is distinct from 'ch_' || left(p_hash, 16) || '_' || (chunk.position + 1)
      or convert_to(chunk.text, 'UTF8') is distinct from
        substring(source_bytes from chunk.start_byte + 1 for chunk.end_byte - chunk.start_byte)
  ) then raise invalid_parameter_value; end if;

  insert into public.article_contents (article_id, user_id, cleaned_text, content_hash, extraction_method)
  values (article.id, article.user_id, p_text, p_hash, p_method)
  on conflict (article_id) do update set cleaned_text = excluded.cleaned_text,
    content_hash = excluded.content_hash, extraction_method = excluded.extraction_method,
    updated_at = statement_timestamp();
  delete from public.article_source_chunks where article_id = article.id;
  insert into public.article_source_chunks (user_id, article_id, chunk_id, position, start_byte, end_byte, text)
  select article.user_id, article.id, c.chunk_id, c.position, c.start_byte, c.end_byte, c.text
  from jsonb_to_recordset(p_chunks) c(chunk_id text, position integer, start_byte integer, end_byte integer, text text);
  return true;
end;
$$;
revoke execute on function public.capture_store_source(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.capture_store_source(uuid, text, text, text, text, jsonb)
  to service_role;
