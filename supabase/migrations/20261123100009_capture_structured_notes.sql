create table public.article_ai_notes (
  article_id uuid primary key,
  user_id uuid not null,
  schema_version integer not null check (schema_version > 0),
  model text not null check (model ~ '^[a-zA-Z0-9._:-]{1,120}$'),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload -> 'schema_version' is not distinct from to_jsonb(schema_version)
    and payload ->> 'model' is not distinct from model
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade
);
create trigger article_ai_notes_touch_updated_at before update on public.article_ai_notes
for each row execute function public.capture_touch_updated_at();
alter table public.article_ai_notes enable row level security;
revoke all on public.article_ai_notes from public, anon, authenticated;
grant select on public.article_ai_notes to authenticated;
grant all on public.article_ai_notes to service_role;
create policy article_ai_notes_read_own on public.article_ai_notes for select to authenticated
using (user_id = (select auth.uid()) and (select auth.jwt() ->> 'client_id') is null);
