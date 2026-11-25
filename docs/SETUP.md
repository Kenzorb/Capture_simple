# Capture setup

## Local startup

1. Follow the [README startup commands](../README.md#run-locally) from the repository root and check that the landing page opens at `http://127.0.0.1:3000`.
2. For integrations, copy the root `.env.example` to `apps/web/.env.local`. Fill values for the integrations you are exercising and restart the web server after changes.
3. In a second terminal at the repository root, run `pnpm --filter extension build`. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `apps/extension/.output/chrome-mv3`. Open the Capture popup from the Extensions menu. After another build, reload Capture on the extensions page.
4. Run `pnpm test`. Install the test browser with `pnpm exec playwright install chromium`, then run `pnpm test:browser`. These tests start a separate web server on port 3173.

### Hosted Supabase development

Capture can use a dedicated hosted development project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local` using the development project's connection settings. Keep database credentials and privileged keys in your local secret store.

For local signup and password recovery, open `http://127.0.0.1:3000` and set both `NEXT_PUBLIC_APP_URL` and the Supabase Auth Site URL to that origin. Allow both `http://127.0.0.1:3000/auth/confirm` and `http://127.0.0.1:3000/auth/recovery` in the development project's Auth redirect settings. If you use another origin, allow the callback URLs with the `?sb_flow_id=*` suffix for that origin so Supabase preserves the browser flow ID. The built-in hosted email service sends to organization members and allows two messages per hour across the project.

With the default email templates, open the link from the newest email in the browser that requested it. If a reset link fails, request a new email, copy the new link address without opening it, and paste it into Capture at `/verify-email?flow=recovery`. Hosted projects can optionally install the confirmation and recovery templates in `supabase/templates` to send one-time codes. Enter a signup code at `/verify-email` or a reset code at `/verify-email?flow=recovery` along with the email address.

From the repository root, sign in to the Supabase CLI and dry-run the versioned migrations against the development project. Replace `DEV_PROJECT_REF` with the project reference and confirm the target before running the apply command.

```sh
npx supabase@3.2.0 login
npx supabase@3.2.0 db push --remote=DEV_PROJECT_REF --dry-run --skip-vault
npx supabase@3.2.0 db push --remote=DEV_PROJECT_REF --skip-vault
```

### Chrome extension connection

Configure the extension using `apps/extension/.env.example` and the two `CAPTURE_EXTENSION_*` values in the web environment. The same public client ID and extension ID must be used in both builds. The development extension can use a public manifest key to keep its unpacked ID stable across machines. Copy only the public key into the extension configuration.

Apply the extension authorization migration before enabling OAuth. In the dedicated Supabase project, configure OAuth with registration restricted to the operator, point consent to `/oauth/consent`, and register one public client with the exact Chrome callback. Set that same client ID in the database's single `capture_extension_client` row via the trusted release operator. Verify the account and revocation flow with disposable accounts. See the [extension authentication contract](EXTENSION_AUTH.md).

### Local Supabase development

To run the database locally, start a Docker-compatible container engine and run these commands from the repository root.

```sh
npx supabase start
npx supabase status
```

Use the local API URL and publishable key in `apps/web/.env.local`. Add the local service-role key only for flows that require server-side access. `npx supabase status -o env` shows the local machine-readable key names. Use `npx supabase db reset` on a disposable local database to reapply migrations and seeds. It discards local database changes. Use `npx supabase stop` to stop local services.

### Background jobs

Set `INNGEST_DEV=1` in `apps/web/.env.local` and start or restart the web app on `127.0.0.1`. Leave the Inngest signing and event keys empty for local development. Run the Dev Server in a second terminal.

```sh
npx --yes --ignore-scripts=false inngest-cli@1.53.0 dev --host 127.0.0.1 --no-discovery -u http://127.0.0.1:3000/api/inngest
```

Open `http://127.0.0.1:8288` and send the development event `capture/dev.durability-smoke` with an empty data object. The event request returns before the job finishes. The run waits two seconds, records one intentional failure, and completes on retry with `{"status":"completed","attempt":1}`. The smoke function runs only in local development and makes no database or AI calls.

In staging and production, deploy the Node.js web app and sync its public HTTPS `/api/inngest` URL in the matching Inngest environment. Store that environment's `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, and matching Supabase `SUPABASE_SERVICE_ROLE_KEY` in the deployment's server-only secret settings. The signing key authenticates callbacks and the event key authorizes event submission. Hosted callbacks use signature verification even if `INNGEST_DEV` is present. The route's execution limit is 60 seconds per request. Configure Inngest retry, concurrency, and start and finish limits on each registered function. [Inngest keys](https://www.inngest.com/docs/platform-and-operations/keys-and-access)

After a new capture, analysis retry, or pasted-text request commits, Capture sends a `capture/job.queued` event for that job. The dispatcher runs on demand. Set the server-only `SUPABASE_SERVICE_ROLE_KEY` and the Inngest keys for hosted processing, then sync the deployment in Inngest and verify the dispatcher has an event trigger. With `INNGEST_DEV=1`, set `INNGEST_DEV_OWNER_ID` to restrict local dispatch to the development account's Supabase user UUID. The development runner also accepts `capture/dev.dispatch-job` with an existing job UUID as `data.jobId`. The dispatcher reuses the delivery event ID on retry. Inngest deduplicates starts within 24 hours, and the database checks the job and delivery generation across redelivery. [Inngest event idempotency](https://www.inngest.com/docs/durable-execution/guides-and-advanced/idempotency)

If the wake event is missed, the job remains committed in the outbox. The capture detail page offers **Retry analysis** once a pending job has waited at least two minutes and its dispatch lease has expired, or once an acknowledged delivery or running job has stalled for 15 minutes. This sends another wake for the existing job. The dispatcher reconciles abandoned deliveries, increments the delivery generation when applicable, and retains the reservation. After three generations, a further abandonment marks the outbox dead and releases the reservation. An operator can send `capture/job.queued` with the job UUID to target the same recovery.

## Account prerequisites

This workspace has local Git and no configured remote. Hosted access is unconfirmed for each service below.

For the OpenAI acceptance check, place a development project's `OPENAI_API_KEY` in `apps/web/.env.local`. Leave `OPENAI_MODEL` empty to use GPT-5.6 Luna. The live check makes billable requests for three public articles and prints only usage and approximate cost. Run it from the repository root in PowerShell after authorizing those requests. [Model pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)

```powershell
$env:CAPTURE_TEST_AI_LIVE = '1'
node --env-file=apps/web/.env.local node_modules/vitest/vitest.mjs run --reporter=default --silent=false tests/unit/openai-notes-live.test.ts
Remove-Item Env:CAPTURE_TEST_AI_LIVE
```

| Provider         | Needed for                                                                       | Configuration names                                                                                              |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GitHub           | Remote source control and hosted CI                                              | Repository access through the owner-approved GitHub identity. CI uses `GITHUB_TOKEN` where needed.               |
| Supabase         | Local Auth and database work from CAP-016, separate hosted projects from CAP-102 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`                  |
| Vercel           | Hosted staging and production releases                                           | `NEXT_PUBLIC_APP_URL`. Hosting access and environment variables managed through the approved deployment project. |
| Inngest          | Durable job delivery and callbacks from CAP-049                                  | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` for hosted environments                                               |
| OpenAI           | Real server-side note generation from CAP-056                                    | `OPENAI_API_KEY`, `OPENAI_MODEL`                                                                                 |
| Monitoring       | Error and availability alerts from CAP-099                                       | `SENTRY_DSN` if Sentry is selected                                                                               |
| Stripe           | Paid readiness in P9                                                             | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`        |
| Chrome Web Store | Approved beta submission from CAP-110                                            | Publisher access through the owner-approved Google identity                                                      |

The environment template lists the planned configuration. Integration tasks should keep the template in sync with their actual configuration.

Set `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` to a sandbox customer portal configuration that enables payment method updates, invoice history, and cancellation at the end of the billing period.

## Local credentials

Use an ignored local environment file for development values. Keep provider keys, Supabase privileged keys, and signing secrets server-side. Use local database credentials and dedicated scoped development keys, and store hosted secrets in the corresponding deployment environment. Use Stripe test credentials during paid readiness. Transfer account access through provider invitations and credentials through a secret store.

## Test environments

Run `pnpm test` for deterministic schema and DOM tests. Install Playwright Chromium with `pnpm exec playwright install chromium`, then run `pnpm test:browser`. The browser suite launches an isolated server at `http://127.0.0.1:3173` and uses a fresh browser context per test. An existing compatible test Chromium can be selected with `CAPTURE_TEST_CHROMIUM_EXECUTABLE`.

To verify capture deduplication against a development database, run Capture locally with that database, set `CAPTURE_TEST_SUPABASE_URL`, `CAPTURE_TEST_SUPABASE_PUBLIC`, and `CAPTURE_TEST_SUPABASE_SECRET` for the disposable test project, then run `node --test apps/web/tests/capture-deduplication.integration.mjs`. The test uses `http://127.0.0.1:3000` unless `CAPTURE_TEST_APP_URL` specifies another local port. It creates and cleans up two test accounts without sending email.

To verify the billing lifecycle, use the same development database credentials and set `STRIPE_SECRET_KEY` and both Capture Pro Price IDs for the Stripe sandbox. Run the Stripe CLI listener with `stripe listen --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to http://127.0.0.1:3000/api/webhooks/stripe`. Set `STRIPE_WEBHOOK_SECRET` in the local app and test process to the listener's signing secret. With the app and listener running, execute `node --test apps/web/tests/billing-lifecycle.integration.mjs`. The test creates and cleans up sandbox clocks and disposable Capture accounts.

### Privacy lifecycle

Account deletion requires an authenticated account, password verification, and typed confirmation. Export JSON or Markdown from Settings before deletion if you need a copy. If the account still has a subscription to manage, end it through Stripe first. Delete a capture to remove its saved link, source, notes, and associations. On an idle capture, remove stored full source text separately to keep the link and notes. Completed analysis retains its evidence excerpts. Starting analysis again can retrieve a new copy of the source.

Keep backups private and scoped to each deployment environment. Record the backup location, access roles, expiry, and restore procedure before onboarding beta users. State the verified backup expiry in customer-facing retention information. A restored backup can contain data deleted after its snapshot, so check deletion reconciliation before returning a restored environment to service. Use only synthetic data in test backups and exclude captured URLs, excerpts, and notes from analytics. Follow the [database recovery runbook](RECOVERY.md) for migrations and restore drills.

### Worker monitoring and recovery

Capture emits structured server logs for queue age at job start, source retries, terminal outcomes, deferred dispatches, provider token usage, and an estimated Luna request cost. The cost estimate uses the rates documented in the [pricing model](PRICING_MODEL.md) and does not capture unreported costs. Logs contain the internal job UUID, known error codes, and numeric counters. Source bodies, URLs, notes, user identifiers, and provider responses stay out of telemetry.

Set `SENTRY_DSN` to the hosted Sentry project DSN in the server environment. Set `CAPTURE_MONITOR_ENVIRONMENT` to `staging` or `production` for that deployment. Capture sends grouped events for infrastructure failures, deferred dispatch, and systemic model-provider failures. In Sentry, scope the alert to the matching environment and notify the approved on-call destination when one of these issues occurs at least three times in 15 minutes. Throttle notifications to one per hour per issue. Keep the development synthetic event out of production alert routes. [Sentry alert setup](https://docs.sentry.io/product/monitors-and-alerts/alerts/create-alerts/)

To verify delivery with a development DSN, set `CAPTURE_TEST_MONITOR_LIVE=1` and run `node --env-file=apps/web/.env.local node_modules/vitest/vitest.mjs run apps/web/tests/processing-telemetry.test.tsx -t "Sentry accepts"`. Search the development project for `synthetic_monitor_failure` or the event ID printed by the test. Verify the intended alert route separately with the approved operator.

If a job is delayed, use its internal UUID to inspect the Inngest run and Capture outbox. For deferred dispatch, check Inngest availability, the app sync, and the environment keys. Inngest retries failures after it accepts a wake event. For missed events or exhausted dispatcher retries, use **Retry analysis** when the capture becomes eligible. For repeated model errors, check the provider credential, rate limits, and budget. After recovery, verify a new disposable capture reaches Ready and its quota reservation settles exactly once. Treat `capture_monitor_unavailable` in server logs as a separate delivery issue and check the DSN and Sentry project before relying on alerts.

Run `node --test apps/web/tests/article-access.integration.mjs` with the same test configuration to check article filters, cursor pagination, and access across two disposable accounts. It also verifies edit, archive, restore, and permanent deletion with cascading cleanup.

Database integration tests begin with CAP-016. Use a disposable local Supabase stack with versioned migrations and synthetic seed data. Integration suites should preflight the target as local and reset the local schema and seed before a suite. Use unique test identities or transaction isolation between cases. For two-user isolation cases, insert as each test identity and exercise user-facing operations with each user's token. After verification, discard the disposable database and volume or reset the local schema. Preserve local developer data by using a separate test project and database volume. Staging and production have separate smoke-test procedures and must never be targeted by local reset commands.
