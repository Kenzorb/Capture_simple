alter table public.profiles add column onboarding_dismissed_at timestamptz;
grant update (onboarding_dismissed_at) on public.profiles to authenticated;
