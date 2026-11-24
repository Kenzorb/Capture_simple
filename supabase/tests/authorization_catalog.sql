-- A passing audit returns no rows.
with app_tables as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'capture_private') and c.relkind in ('r', 'p')
)
select relname::text as object, 'Missing RLS' as issue
from app_tables
where not relrowsecurity
union all
select relname::text, 'Anonymous table access'
from app_tables
where has_any_column_privilege('anon', oid, 'SELECT, INSERT, UPDATE, REFERENCES')
  or has_table_privilege('anon', oid, 'DELETE, TRUNCATE, TRIGGER')
union all
select relname::text, 'Direct authenticated writes'
from app_tables
where relname not in ('profiles', 'personal_notes') and (
  has_any_column_privilege('authenticated', oid, 'INSERT, UPDATE')
  or has_table_privilege('authenticated', oid, 'DELETE, TRUNCATE, TRIGGER')
)
union all
select 'subscriptions', 'Authenticated read of private Stripe fields'
where has_column_privilege('authenticated', 'public.subscriptions', 'stripe_customer_id', 'SELECT')
  or has_column_privilege('authenticated', 'public.subscriptions', 'stripe_revision', 'SELECT')
union all
select p.proname::text, 'Anonymous routine execution'
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'capture_private')
  and (p.proname like 'capture\_%' escape '\' or p.proname like 'is\_capture\_%' escape '\')
  and has_function_privilege('anon', p.oid, 'EXECUTE');
