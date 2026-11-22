# Capture setup

## Local startup

1. Follow the [README startup commands](../README.md#run-locally) from the repository root and check that the landing page opens at `http://localhost:3000`.
2. For integrations, copy the root `.env.example` to `apps/web/.env.local`. Fill values for the integrations you are exercising and restart the web server after changes.
3. In a second terminal at the repository root, run `pnpm --filter extension build`. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `apps/extension/.output/chrome-mv3`. Open the Capture popup from the Extensions menu. After another build, reload Capture on the extensions page.
4. Run `pnpm test`. Install the test browser with `pnpm exec playwright install chromium`, then run `pnpm test:browser`. These tests start a separate web server on port 3173.

### Hosted Supabase development

Capture can use a dedicated hosted development project. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local` using the development project's connection settings. Keep database credentials and privileged keys in your local secret store.

From the repository root, sign in to the Supabase CLI and dry-run the versioned migrations against the development project. Replace `DEV_PROJECT_REF` with the project reference and confirm the target before running the apply command.

```sh
npx supabase@3.2.0 login
npx supabase@3.2.0 db push --remote=DEV_PROJECT_REF --dry-run --skip-vault
npx supabase@3.2.0 db push --remote=DEV_PROJECT_REF --skip-vault
```

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

Database integration tests begin with CAP-016. Use a disposable local Supabase stack with versioned migrations and synthetic seed data. Integration suites should preflight the target as local and reset the local schema and seed before a suite. Use unique test identities or transaction isolation between cases. For two-user isolation cases, insert as each test identity and exercise user-facing operations with each user's token. After verification, discard the disposable database and volume or reset the local schema. Preserve local developer data by using a separate test project and database volume. Staging and production have separate smoke-test procedures and must never be targeted by local reset commands.
