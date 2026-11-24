import assert from "node:assert/strict";
import console from "node:console";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL, URL } from "node:url";

const packagePath = resolve(
  process.argv[2] ??
    "node_modules/capture-recovery-drill/node_modules/@electric-sql/pglite",
);
const { PGlite } = await import(
  pathToFileURL(resolve(packagePath, "dist/index.js")).href
);
const { pgcrypto } = await import(
  pathToFileURL(resolve(packagePath, "dist/contrib/pgcrypto.js")).href
);
const extensions = { pgcrypto };
const migrations = new URL("../migrations/", import.meta.url);
const firstUser = "01000000-0000-4000-8000-000000000001";
const secondUser = "01000000-0000-4000-8000-000000000002";

async function fingerprint(db) {
  const { rows } = await db.query(`
    select schemaname, tablename from pg_tables
    where schemaname = 'public' or schemaname = 'auth'
    order by schemaname, tablename
  `);
  const state = {};
  for (const { schemaname, tablename } of rows) {
    assert.match(schemaname, /^[a-z_]+$/);
    assert.match(tablename, /^[a-z_]+$/);
    const table = `${schemaname}.${tablename}`;
    const result = await db.query(
      `select to_jsonb(t)::text as row from ${table} t order by row`,
    );
    state[table] = {
      count: result.rows.length,
      hash: createHash("sha256")
        .update(JSON.stringify(result.rows))
        .digest("hex"),
    };
  }
  return state;
}

const source = await PGlite.create({ extensions });
let backup;
let expected;
let reconciled;
const files = (await readdir(migrations))
  .filter((file) => file.endsWith(".sql"))
  .sort();
try {
  // Minimal stand-ins for the Supabase-managed roles and auth interfaces.
  await source.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema extensions;
    create schema auth;
    create table auth.users (id uuid primary key, email text unique);
    create table auth.sessions (
      id uuid primary key,
      user_id uuid references auth.users on delete cascade,
      oauth_client_id uuid,
      not_after timestamptz
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `);
  for (const file of files) {
    await source.exec(await readFile(new URL(file, migrations), "utf8"));
  }

  await source.exec(`
    insert into auth.users (id, email) values
      ('${firstUser}', 'keep@example.test'),
      ('${secondUser}', 'delete@example.test');
    insert into public.articles (user_id, url, canonical_url, title, domain)
    select id, 'https://example.test', 'https://example.test', 'Recovery fixture', 'example.test'
    from auth.users;
    insert into public.personal_notes (article_id, user_id, body)
    select id, user_id, 'Synthetic personal note' from public.articles;
    insert into public.article_contents (article_id, user_id, cleaned_text)
    select id, user_id, 'Synthetic source' from public.articles;
  `);
  expected = await fingerprint(source);
  assert.equal(expected["public.articles"].count, 2);
  assert.equal(expected["public.personal_notes"].count, 2);
  backup = await source.dumpDataDir();

  // Simulate a deletion accepted after the backup point.
  await source.query("delete from auth.users where id = $1", [secondUser]);
  reconciled = await fingerprint(source);
  for (const table of [
    "auth.users",
    "public.profiles",
    "public.articles",
    "public.personal_notes",
    "public.article_contents",
  ]) {
    assert.equal(reconciled[table].count, 1, table);
  }
} finally {
  await source.close();
}

const restored = await PGlite.create({ extensions, loadDataDir: backup });
try {
  assert.deepEqual(await fingerprint(restored), expected);
  await assert.rejects(
    restored.transaction(async (tx) => {
      await tx.exec("alter table public.articles add column drill_marker text");
      await tx.exec("select 1 / 0");
    }),
    /division by zero/,
  );
  const { rows } = await restored.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'articles' and column_name = 'drill_marker'",
  );
  assert.equal(rows.length, 0, "The failed migration left a schema change");
  assert.deepEqual(await fingerprint(restored), expected);

  for (const file of ["data_access.sql", "worker_recovery.sql"]) {
    await restored.exec(await readFile(new URL(file, import.meta.url), "utf8"));
  }
  assert.deepEqual(await fingerprint(restored), expected);

  await restored.query("delete from auth.users where id = $1", [secondUser]);
  await restored.query("delete from auth.users where id = $1", [secondUser]);
  assert.deepEqual(await fingerprint(restored), reconciled);
  console.log(
    `Backup recovery passed: ${files.length} migrations, ${Object.keys(expected).length} table fingerprints, migration rollback, RLS, worker reconciliation, and deletion replay.`,
  );
} finally {
  await restored.close();
}
