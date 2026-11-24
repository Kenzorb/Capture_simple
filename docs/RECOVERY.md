# Capture database recovery runbook

## Release and migration

1. Record the target environment, Supabase project reference, release commit, current migration versions, and operator. Use deployment-scoped credentials and compare both the application and worker targets to the recorded project before writing.
2. Review the pending migration files and compare them with the target's migration history. Rehearse against disposable staging data first, including owner isolation and worker recovery. For a schema change that affects both versions of the app, first extend the schema in a backwards-compatible release, backfill in bounded batches, switch callers, then remove old fields in a later release.
3. Before changing a shared environment, record the verified backup or recovery point, its UTC timestamp, the expected recovery window, and who can restore it. Check that the backup covers the tables, roles, grants, and migration history the release needs. Record how to reconstruct provider settings and secrets separately through approved deployment configuration.
4. Apply the reviewed migrations once through the release workflow. Confirm the resulting migration history, run the authorization and worker checks, then release the web app and worker. Verify a disposable capture reaches Ready with one note and one quota debit. Record the migration versions and smoke-test outcome before reopening paused writes.

## Rollback and roll-forward

- If a migration fails inside a transaction, confirm its schema and migration history match the pre-change state before retrying. Check separately for any step that ran outside that transaction.
- If the schema still supports the prior versions, roll back the web app and worker together. Leave additive changes in place and ship a reviewed corrective migration for schema or data defects. Verify processing callbacks and outbox recovery on the restored app version.
- If the data is damaged or a destructive change committed, pause mutating traffic, job dispatch, and billing webhooks at the affected deployment. Record the last known good time and the suspected write window. Determine which later writes would be lost and get incident owner approval before promoting a restore. Preserve the original environment for comparison under the incident access and retention rules.

## Backup restore drill

Run a hosted drill with synthetic staging data before beta, and repeat it after a backup or database architecture change. Record the project's backup mode, retention and expiry, restore permissions, snapshot time, start and finish times, and any data loss measured against the snapshot. Approve recovery time and data-loss targets with the deployment owner. Keep snapshot access private, and record table counts and checksums without exposing capture content.

1. Prepare two disposable owners, saved captures, notes, and a queued job with a quota reservation. Record migration versions and expected counts and fingerprints. Remove a synthetic account or source text after the backup point and retain its identifiers for reconciliation.
2. Restore into an isolated recovery target. Keep app writes, Inngest workers, outbound email, payment webhooks, and external model calls disabled until validation. Confirm the target project and environment before running any reconciliation. Check schema and migration versions, table counts, record checksums, foreign keys, and access policies. An owner should see only their own captures and notes. Anonymous users should have no access to private data.
3. Reconcile approved post-snapshot writes and privacy deletions before restoring traffic. Use incident records and authoritative provider state to identify affected jobs and billing events. If deletion coverage or the scope of missing writes is uncertain, keep customer access paused until the incident owner resolves it. Verify removed accounts and source text stay removed after reconciliation and their unaffected neighbors still match the baseline.
4. In staging, enable the isolated worker and check that an abandoned execution recovers, stale delivery is rejected, and duplicate delivery settles quota and publishes the note once. Confirm the restored app can save and analyze a new synthetic capture. Keep production endpoints and secrets out of the drill.
5. Record the measured restore interval, recoverable point, checks, and any follow-up. Retire the temporary target and copy according to their approved retention policy. Publish the verified deployment backup expiry in customer-facing retention information before beta.

## Local synthetic dry run

The local drill applies all repository migrations to an in-memory PostgreSQL snapshot using PGlite and minimal Supabase Auth stand-ins. It compares table counts and SHA-256 fingerprints after restoring to a fresh instance, forces a transactional migration to fail and verifies schema and row integrity, then runs the existing owner-isolation and worker-recovery SQL. Finally, it replays a post-snapshot account deletion twice and compares the result to the original database's post-deletion state.

From the repository root:

```sh
npm install --prefix node_modules/capture-recovery-drill --no-save --package-lock=false @electric-sql/pglite@0.6.0
node supabase/tests/backup-recovery.mjs
```

An existing installation of the pinned package can be passed as the script's first argument. The local run verifies Capture's schema, data, and recovery invariants. Supabase-managed backup expiry, Auth service settings, and hosted restore timing require the staging drill.
