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

After CAP-049 adds the Inngest endpoint, start the web app first. Run the dev server in a second terminal and open `http://localhost:8288` to inspect local events and function runs.

```sh
npx --ignore-scripts=false inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Local Inngest development uses the local endpoint and requires no hosted keys. Hosted event and signing keys belong in the corresponding staging or production deployment.

## Account prerequisites

This workspace has local Git and no configured remote. Hosted access is unconfirmed for each service below.

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

## Local credentials

Use an ignored local environment file for development values. Keep provider keys, Supabase privileged keys, and signing secrets server-side. Use local database credentials and dedicated scoped development keys, and store hosted secrets in the corresponding deployment environment. Use Stripe test credentials during paid readiness. Transfer account access through provider invitations and credentials through a secret store.

## Test environments

Run `pnpm test` for deterministic schema and DOM tests. Install Playwright Chromium with `pnpm exec playwright install chromium`, then run `pnpm test:browser`. The browser suite launches an isolated server at `http://127.0.0.1:3173` and uses a fresh browser context per test. An existing compatible test Chromium can be selected with `CAPTURE_TEST_CHROMIUM_EXECUTABLE`.

To verify capture deduplication against a development database, run Capture locally with that database, set `CAPTURE_TEST_SUPABASE_URL`, `CAPTURE_TEST_SUPABASE_PUBLIC`, and `CAPTURE_TEST_SUPABASE_SECRET` for the disposable test project, then run `node --test apps/web/tests/capture-deduplication.integration.mjs`. The test uses `http://127.0.0.1:3000` unless `CAPTURE_TEST_APP_URL` specifies another local port. It creates and cleans up two test accounts without sending email.

Run `node --test apps/web/tests/article-access.integration.mjs` with the same test configuration to check article filters, cursor pagination, and access across two disposable accounts. It also verifies edit, archive, restore, and permanent deletion with cascading cleanup.

Database integration tests begin with CAP-016. Use a disposable local Supabase stack with versioned migrations and synthetic seed data. Integration suites should preflight the target as local and reset the local schema and seed before a suite. Use unique test identities or transaction isolation between cases. For two-user isolation cases, insert as each test identity and exercise user-facing operations with each user's token. After verification, discard the disposable database and volume or reset the local schema. Preserve local developer data by using a separate test project and database volume. Staging and production have separate smoke-test procedures and must never be targeted by local reset commands.
