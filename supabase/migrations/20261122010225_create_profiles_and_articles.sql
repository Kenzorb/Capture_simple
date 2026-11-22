create extension if not exists pgcrypto with schema extensions;

create type public.article_status as enum (
  'saved', 'queued', 'processing', 'ready', 'failed', 'quota_limited', 'unsupported'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  canonical_url text not null,
  -- Long URLs can exceed the B-tree index tuple limit.
  canonical_url_hash bytea generated always as (extensions.digest(canonical_url, 'sha256')) stored,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  domain text not null check (char_length(btrim(domain)) > 0),
  author text,
  published_at timestamptz,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.article_status not null default 'saved',
  archived_at timestamptz,
  constraint articles_owner_canonical_url_key unique (user_id, canonical_url_hash),
  constraint articles_owner_id_key unique (user_id, id)
);

create index articles_owner_captured_at_idx on public.articles (user_id, captured_at desc);
create index articles_owner_status_idx on public.articles (user_id, status);

create table public.article_contents (
  article_id uuid primary key,
  user_id uuid not null,
  cleaned_text text not null,
  content_hash text,
  extraction_method text,
  language text,
  word_count integer check (word_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade
);

create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique,
  user_id uuid not null,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade
);

create function public.capture_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.capture_touch_updated_at();
create trigger articles_touch_updated_at before update on public.articles
for each row execute function public.capture_touch_updated_at();
create trigger article_contents_touch_updated_at before update on public.article_contents
for each row execute function public.capture_touch_updated_at();
create trigger personal_notes_touch_updated_at before update on public.personal_notes
for each row execute function public.capture_touch_updated_at();

create function public.capture_create_profile()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.capture_create_profile() from public, anon, authenticated;
create trigger capture_create_profile after insert on auth.users
for each row execute function public.capture_create_profile();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.article_contents enable row level security;
alter table public.personal_notes enable row level security;
