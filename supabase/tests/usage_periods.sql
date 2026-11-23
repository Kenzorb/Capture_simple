do $$
declare
  member uuid := gen_random_uuid();
  paid uuid := gen_random_uuid();
  feb uuid;
  march uuid;
  same_feb uuid;
  paid_feb uuid;
  paid_march uuid;
begin
  begin
    insert into auth.users (id, email)
    values (member, member || '@example.test'), (paid, paid || '@example.test');
    insert into public.subscriptions (user_id, plan, status, stripe_customer_id,
      stripe_subscription_id, stripe_price_id, period_end, cancel_at_period_end)
    values (paid, 'pro', 'active', 'cus_' || paid, 'sub_' || paid, 'test_annual',
      '2024-11-01 00:00+00', true);

    perform set_config('timezone', 'America/Los_Angeles', true);
    feb := capture_private.capture_usage_period(member, '2024-02-29 15:59:59.999999-08');
    update public.usage_periods set used = 18, reserved = 2 where id = feb;
    perform set_config('timezone', 'Asia/Singapore', true);
    same_feb := capture_private.capture_usage_period(member, '2024-03-01 07:59:59.999999+08');
    march := capture_private.capture_usage_period(member, '2024-03-01 08:00+08');
    if feb <> same_feb or feb = march
      or not exists (select 1 from public.usage_periods where id = feb
        and period_start = '2024-02-01 00:00+00' and period_end = '2024-03-01 00:00+00'
        and article_limit = 20 and used = 18 and reserved = 2)
      or not exists (select 1 from public.usage_periods where id = march
        and period_start = '2024-03-01 00:00+00' and period_end = '2024-04-01 00:00+00'
        and article_limit = 20 and used = 0 and reserved = 0)
    then raise exception 'Leap month, timezone or usage reset mismatch'; end if;

    same_feb := capture_private.capture_usage_period(member, '2025-02-28 23:59:59+00');
    if not exists (select 1 from public.usage_periods where id = same_feb
      and period_end = '2025-03-01 00:00+00')
    then raise exception 'Non-leap February mismatch'; end if;
    perform capture_private.capture_usage_period(member, '2025-04-30 23:59:59+00');
    if not exists (select 1 from public.usage_periods where user_id = member
      and period_start = '2025-04-01 00:00+00' and period_end = '2025-05-01 00:00+00')
    then raise exception 'Thirty-day month mismatch'; end if;

    paid_feb := capture_private.capture_usage_period(paid, '2024-02-01 00:00+00');
    paid_march := capture_private.capture_usage_period(paid, '2024-03-01 00:00+00');
    update public.usage_periods set used = 24, reserved = 3 where id = paid_march;
    if paid_feb = paid_march or (select count(*) from public.usage_periods
      where id in (paid_feb, paid_march) and article_limit = 300) <> 2
    then raise exception 'Annual Pro did not get separate monthly allowances'; end if;

    update public.subscriptions set period_end = '2024-03-15 00:00+00' where user_id = paid;
    perform capture_private.capture_usage_period(paid, '2024-03-15 00:00+00');
    if not exists (select 1 from public.usage_periods where id = paid_march
      and article_limit = 27 and used = 24 and reserved = 3)
    then raise exception 'Term expiry discarded usage or allowed more reservations'; end if;
    update public.subscriptions set period_end = '2025-03-15 00:00+00' where user_id = paid;
    perform capture_private.capture_usage_period(paid, '2024-03-15 00:00+00');
    if not exists (select 1 from public.usage_periods where id = paid_march
      and article_limit = 300 and used = 24 and reserved = 3)
    then raise exception 'Renewal reset the current month or kept the wrong limit'; end if;
    raise sqlstate 'Z0077';
  exception when sqlstate 'Z0077' then
    raise notice 'CAP-077 assertions passed and fixtures rolled back';
  end;
end;
$$;
