-- Keep public schema changes with the migration role.
revoke create on schema public from public, anon, authenticated;
