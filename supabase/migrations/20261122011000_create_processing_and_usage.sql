create type public.processing_job_status as enum ('queued', 'processing', 'succeeded', 'failed', 'canceled');
create type public.dispatch_status as enum ('pending', 'dispatched', 'dead');
create type public.usage_reservation_state as enum ('reserved', 'consumed', 'released');

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid not null,
  status public.processing_job_status not null default 'queued',
  attempts integer not null default 0 check (attempts >= 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 1 and 200),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, id),
  unique (user_id, idempotency_key),
  foreign key (user_id, article_id) references public.articles (user_id, id) on delete cascade,
  check ((status in ('succeeded', 'failed', 'canceled')) = (finished_at is not null))
);

create index processing_jobs_owner_article_idx on public.processing_jobs (user_id, article_id);
create unique index processing_jobs_one_active_article_idx on public.processing_jobs (article_id)
where status in ('queued', 'processing');

create trigger processing_jobs_touch_updated_at before update on public.processing_jobs
for each row execute function public.capture_touch_updated_at();

create table public.job_outbox (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.processing_jobs (id) on delete cascade,
  status public.dispatch_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'dispatched') = (dispatched_at is not null))
);

create index job_outbox_pending_idx on public.job_outbox (next_attempt_at) where status = 'pending';

create table public.usage_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  used integer not null default 0 check (used >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  article_limit integer not null check (article_limit >= 0),
  unique (user_id, id),
  unique (user_id, period_start),
  check (period_end > period_start),
  check (used::bigint + reserved <= article_limit)
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  usage_period_id uuid not null,
  job_id uuid not null unique,
  state public.usage_reservation_state not null default 'reserved',
  units integer not null default 1 check (units = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, usage_period_id) references public.usage_periods (user_id, id) on delete cascade,
  foreign key (user_id, job_id) references public.processing_jobs (user_id, id) on delete cascade
);

create index usage_events_owner_period_idx on public.usage_events (user_id, usage_period_id);
create trigger usage_events_touch_updated_at before update on public.usage_events
for each row execute function public.capture_touch_updated_at();

alter table public.processing_jobs enable row level security;
alter table public.job_outbox enable row level security;
alter table public.usage_periods enable row level security;
alter table public.usage_events enable row level security;
