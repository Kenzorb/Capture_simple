# Capture production release runbook

## Release record

Before provisioning production, have the owner approve the deployment target, provider budgets, and release operator. Record the approval and these values in the release record.

| Record               | Required value                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Release              | Git commit, operator, deployment window, and rollback deployment ID                                                                |
| Hosting              | Approved account, dedicated Vercel project, production HTTPS origin, and DNS owner                                                 |
| Data and jobs        | Supabase production project reference, recovery point and expiry, and Inngest production environment                               |
| Monitoring and spend | Sentry project and recipient, provider budgets and thresholds, and who can pause job intake                                        |
| Support              | Owner-approved support mailbox or form, the person who monitors it, and a private escalation route for privacy or security reports |
| Publication          | Beta cohort, authorized Chrome Web Store publisher, store listing URL, and approvals required for billing or publishing            |

Production provider projects, spend limits, and the customer-facing support contact are owner decisions at the production gate. Record the final contact in the app and store materials before inviting users. Verify the channel with an approved test message and record who received it.

## Environment and credentials

Use separate provider environments and keys for staging and production. Verify the environment, project reference, and public origin on every provider before setting credentials. Enter secret values in the deployment's secret store.

| Area       | Production configuration and verification                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web        | Use the repository's Node and pnpm versions, with `apps/web` as the Next.js root and the workspace packages included. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS origin.                                                                                                                                   |
| Supabase   | Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` from the production project. Set the Auth site URL and allow the confirmation and recovery paths on that origin, including the documented flow suffix.                                        |
| Inngest    | Set the production `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. Sync the production HTTPS `/api/inngest` route to the matching environment. Verify the dispatcher and processing functions, signed callbacks, and a completed run.                                                                              |
| Model      | Set a production project `OPENAI_API_KEY`. Use `OPENAI_MODEL` only when an alternative model was explicitly evaluated and approved.                                                                                                                                                                               |
| Monitoring | Set `SENTRY_DSN` and `CAPTURE_MONITOR_ENVIRONMENT=production`. Scope the alert filter to production Capture events and verify the approved recipient and a controlled test.                                                                                                                                       |
| Extension  | Use the production extension ID, the production Supabase public OAuth client ID, the exact Chrome callback, and `/oauth/consent`. Set `CAPTURE_EXTENSION_ID` and `CAPTURE_EXTENSION_CLIENT_ID`, and build the package with the matching web and Supabase origins. Verify both allowed and denied CORS preflights. |
| Billing    | Leave the production Stripe variables unset for the current deferred launch. A separate approval under CAP-092 is required before installing live keys, price IDs, webhook credentials, and portal configuration.                                                                                                 |

The detailed environment and Chrome settings are in [Setup](SETUP.md) and [Extension authentication](EXTENSION_AUTH.md).

## Release and rollback

1. Reproduce the staging checks for the release commit. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:browser`, and `pnpm build`. Record the hosted and browser evidence in the release record. See [release regression](RELEASE_QA.md) for the previous baseline.
2. Verify the production backup, restore access, expiry, and last known good recovery point. Confirm the hosted restore drill and deletion reconciliation before customer beta. Review the migration dry run against the explicit production project reference. Follow the [database recovery runbook](RECOVERY.md) for applying migrations, choosing rollback or roll-forward, and restoring data.
3. Deploy the reviewed commit through the approved production project. Verify the deployment and HTTPS aliases. Check Auth redirects, protected route access, the signed worker callback, and the registered extension's CORS response. Confirm live billing remains off.
4. With owner-approved smoke accounts and a public source, verify sign-in, save, analysis, Knowledge Tree placement, search, quota, and export. Record the deployed commit and results and clean up the fixture data. Open beta only after verifying support and privacy readiness.
5. If verification fails, pause intake where the incident requires it and record the affected release, migration version, and time range. Use the preceding web and worker release together if the schema remains compatible. Verify that the stable URL and Inngest registration point to the restored release and rerun the critical checks before resuming. Use the recovery runbook for destructive migrations or damaged data.

## Alerts and spend

- For repeated queue failures, use the internal job ID to locate the Inngest run and outbox state. Confirm deployment sync, signing and event key environment, and the Supabase service boundary before replaying work. Check that a replacement run settles quota and publishes once.
- For systemic model errors, check credentials, provider availability, and spending or rate limits. Use [Setup and recovery alerts](SETUP.md#worker-monitoring-and-recovery) for event handling. Keep capture content, account data, and credentials out of operational logs.
- Record provider budgets for Vercel, Supabase, Inngest, OpenAI, and monitoring. Configure provider alerts or enforcement where available and record the operational stop action for each ceiling. Verify that the alert recipient can act on it. Use [the pricing model](PRICING_MODEL.md) as the planning baseline, including the scheduled dispatch cost when the queue is empty.
- Check the Free allowance of 20 analyses per UTC month and the 300-analysis Pro allowance before enabling paid entitlements. Confirm tests demonstrate successful, single-debit analysis, link-only saving at the limit, and safe replay. Escalate unexpected usage before expanding the beta.

## Chrome Web Store submission

- Confirm the owner-approved publisher and extension identity. Verify the versioned production build's exact allowed origins, permissions, content security policy, and credential-free package. Exercise sign-in, capture, and reconnect on an approved Chrome version.
- Prepare screenshots with disposable data, description, permissions rationale, verified privacy and retention text, and the owner-approved support contact. Check that what the listing promises matches the release.
- Record the final archive hash and reviewer instructions, then request explicit publication approval. A staging ZIP is suitable for unpacked testing. Build and review the production package before submission.
