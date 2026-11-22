create type public.capture_plan as enum ('free', 'pro');

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text,
  plan public.capture_plan not null default 'free',
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    plan = 'free' or (
      stripe_customer_id is not null and stripe_subscription_id is not null
      and stripe_price_id is not null and status is not null
    )
  )
);

create trigger subscriptions_touch_updated_at before update on public.subscriptions
for each row execute function public.capture_touch_updated_at();

create table public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
