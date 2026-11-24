alter table public.subscriptions
  add column stripe_revision bigint not null default 0;

create function public.capture_apply_stripe_event(
  p_event_id text,
  p_event_type text,
  p_customer_id text,
  p_revision bigint,
  p_subscription_id text,
  p_price_id text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
) returns text
language plpgsql
set search_path = ''
as $$
declare
  billing public.subscriptions%rowtype;
begin
  if exists (select from public.billing_events where stripe_event_id = p_event_id) then
    return 'duplicate';
  end if;

  select * into billing from public.subscriptions
    where stripe_customer_id = p_customer_id for update;
  if not found then
    return 'unmapped';
  end if;
  if billing.stripe_revision is distinct from p_revision then
    return 'retry';
  end if;

  insert into public.billing_events (stripe_event_id, event_type)
    values (p_event_id, p_event_type)
    on conflict (stripe_event_id) do nothing;
  if not found then
    return 'duplicate';
  end if;

  update public.subscriptions
    set stripe_revision = stripe_revision + 1,
        stripe_subscription_id = p_subscription_id,
        stripe_price_id = p_price_id,
        status = p_status,
        period_end = p_period_end,
        cancel_at_period_end = p_cancel_at_period_end,
        plan = case when p_subscription_id is null then 'free' else plan end
    where user_id = billing.user_id;

  return 'applied';
end;
$$;

revoke execute on function public.capture_apply_stripe_event(
  text, text, text, bigint, text, text, text, timestamptz, boolean
) from public, anon, authenticated;
grant execute on function public.capture_apply_stripe_event(
  text, text, text, bigint, text, text, text, timestamptz, boolean
) to service_role;
