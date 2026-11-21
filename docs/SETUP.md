# Capture setup

## Account prerequisites

This workspace has local Git and no configured remote. The session found no provider environment-variable names or local environment files. Hosted access is unconfirmed for each service below.

| Provider | Needed for | Configuration names |
|---|---|---|
| GitHub | Remote source control and CI verification at CAP-014 | Repository access through the owner-approved GitHub identity. CI uses `GITHUB_TOKEN` where needed. |
| Supabase | Local Auth and database work from CAP-016, separate hosted projects from CAP-102 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Vercel | Hosted staging and production releases | `NEXT_PUBLIC_APP_URL`. Hosting access and environment variables managed through the approved deployment project. |
| Inngest | Durable job delivery and callbacks from CAP-049 | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` for hosted environments |
| OpenAI | Real server-side note generation from CAP-056 | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Monitoring | Error and availability alerts from CAP-099 | `SENTRY_DSN` if Sentry is selected |
| Stripe | Paid readiness in P9 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID` |
| Chrome Web Store | Approved beta submission from CAP-110 | Publisher access through the owner-approved Google identity |

Names describe the planned configuration. The environment template and startup instructions will follow in CAP-015 and be kept in sync with each integration.

## Local credentials

Use an ignored local environment file for development values. Keep provider keys, Supabase privileged keys, and signing secrets server-side. Use local database credentials and dedicated scoped development keys, and store hosted secrets in the corresponding deployment environment. Use Stripe test credentials during paid readiness. Transfer account access through provider invitations and credentials through a secret store.
