create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text generated always as (lower(btrim(name))) stored,
  description text check (char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_owner_id_key unique (user_id, id),
  constraint topics_owner_sibling_name_key unique nulls not distinct (user_id, parent_id, normalized_name),
  constraint topics_parent_fk foreign key (user_id, parent_id)
    references public.topics (user_id, id) on delete restrict
);

-- Concurrent moves for one account must observe each other's committed tree.
create table public.topic_tree_versions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  revision bigint not null default 1
);

create function public.capture_check_topic_cycle()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.topic_tree_versions (user_id)
  values (new.user_id)
  on conflict (user_id) do update
    set revision = public.topic_tree_versions.revision + 1;

  if exists (
    with recursive ancestors (id, parent_id) as (
      select id, parent_id from public.topics where user_id = new.user_id and id = new.parent_id
      union
      select topic.id, topic.parent_id from ancestors
      join public.topics as topic on topic.user_id = new.user_id and topic.id = ancestors.parent_id
    )
    select from ancestors where id = new.id
  ) then
    raise exception 'A topic cannot be its own ancestor' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke execute on function public.capture_check_topic_cycle() from public, anon, authenticated;
create trigger topics_check_cycle
after insert or update of user_id, parent_id on public.topics
for each row when (new.parent_id is not null)
execute function public.capture_check_topic_cycle();

create trigger topics_touch_updated_at before update on public.topics
for each row execute function public.capture_touch_updated_at();

create table public.article_topics (
  user_id uuid not null,
  article_id uuid not null,
  topic_id uuid not null,
  is_primary boolean not null default false,
  assignment_source text not null check (assignment_source in ('ai', 'manual')),
  confidence numeric check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (article_id, topic_id),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade,
  foreign key (user_id, topic_id) references public.topics (user_id, id) on delete cascade
);

create unique index article_topics_one_primary_idx on public.article_topics (article_id) where is_primary;
create index article_topics_owner_topic_idx on public.article_topics (user_id, topic_id);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text generated always as (lower(btrim(name))) stored,
  definition text,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, normalized_name)
);

create table public.article_concepts (
  user_id uuid not null,
  article_id uuid not null,
  concept_id uuid not null,
  evidence_chunk_ids text[] not null default '{}',
  primary key (article_id, concept_id),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade,
  foreign key (user_id, concept_id) references public.concepts (user_id, id) on delete cascade
);

create index article_concepts_owner_concept_idx on public.article_concepts (user_id, concept_id);

alter table public.topics enable row level security;
alter table public.topic_tree_versions enable row level security;
alter table public.article_topics enable row level security;
alter table public.concepts enable row level security;
alter table public.article_concepts enable row level security;
