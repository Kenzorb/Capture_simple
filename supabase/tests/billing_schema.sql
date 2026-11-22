do $$
declare
  owner_id uuid := gen_random_uuid();
  event_id text := 'evt_fixture_' || gen_random_uuid();
begin
  begin
    insert into auth.users (id, email) values (owner_id, owner_id || '@example.test');
    begin
      insert into public.subscriptions (user_id, plan) values (owner_id, 'pro');
      raise exception 'Pro subscription accepted without billing state';
    exception when check_violation then null;
    end;
    insert into public.subscriptions (user_id) values (owner_id);
    if not exists (select from public.subscriptions where user_id = owner_id and plan = 'free')
    then raise exception 'Subscription did not default to Free'; end if;

    insert into public.billing_events (stripe_event_id, event_type)
    values (event_id, 'fixture.event');
    begin
      insert into public.billing_events (stripe_event_id, event_type)
      values (event_id, 'fixture.event');
      raise exception 'Duplicate provider event accepted';
    exception when unique_violation then null;
    end;

    raise sqlstate 'Z0020'; -- Roll back the synthetic fixtures.
  exception when sqlstate 'Z0020' then
    raise notice 'CAP-020 schema assertions passed; fixtures rolled back';
  end;
end;
$$;
