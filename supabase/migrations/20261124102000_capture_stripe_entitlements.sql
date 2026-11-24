create function capture_private.capture_billing_term_is_current(
  p_status text, p_period_end timestamptz, p_at timestamptz
)
returns boolean
language sql immutable
set search_path = ''
as $$
  select coalesce(p_status in ('active', 'trialing') and p_period_end > p_at, false);
$$;

create function capture_private.capture_assign_verified_billing_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stripe_customer_id is not null and new.stripe_subscription_id is not null
    and new.stripe_price_id is not null and capture_private.capture_billing_term_is_current(
      new.status, new.period_end, statement_timestamp()
    )
  then
    new.plan := 'pro';
  else
    new.plan := 'free';
  end if;
  return new;
end;
$$;

revoke execute on function
  capture_private.capture_billing_term_is_current(text, timestamptz, timestamptz),
  capture_private.capture_assign_verified_billing_plan()
from public, anon, authenticated, service_role;

-- The verified webhook transaction advances this field when it writes Stripe state.
create trigger subscriptions_assign_verified_billing_plan
before update of stripe_revision on public.subscriptions
for each row execute function capture_private.capture_assign_verified_billing_plan();

-- Reconcile previously verified events before enabling the entitlement.
update public.subscriptions set stripe_revision = stripe_revision
where stripe_revision > 0;

create or replace function capture_private.capture_monthly_limit(p_owner_id uuid, p_at timestamptz)
returns integer
language sql stable
set search_path = ''
as $$
  select case when exists (
    select 1 from public.subscriptions s
    where s.user_id = p_owner_id and s.plan = 'pro'
      and capture_private.capture_billing_term_is_current(s.status, s.period_end, p_at)
  ) then 300 else 20 end;
$$;

create or replace function public.capture_extension_account()
returns table (id uuid, email text, display_name text, plan text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not capture_private.is_capture_extension_session() then
    raise insufficient_privilege;
  end if;
  return query
    select u.id, u.email::text, p.display_name,
      case when capture_private.capture_monthly_limit(u.id, statement_timestamp()) > 20
        then 'pro' else 'free' end
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = (select auth.uid());
end;
$$;
