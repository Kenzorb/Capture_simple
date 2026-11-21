# Capture architecture

## Release scope

| Scope | Included | Release evidence |
|---|---|---|
| Free beta MVP | F01–F13 and F15–F16. Shared account, intentional Chrome capture, manual URL save, deduplicated persistence, library, async source-backed notes, dynamic knowledge tree, topic corrections, keyword search, processing and recovery states, usage limits, related articles, and export. | P0–P8, P10 and P11 gates, including capture from the real extension, data isolation, and beta smoke tests. |
| Paid launch | F14. Stripe Checkout and Customer Portal, verified subscription events, and server-managed Free/Pro entitlements. | P9 test-mode lifecycle, measured processing costs, approved prices, and explicit approval for live billing. |
| Post-MVP | F17–F23. Semantic search, chat, cross-source synthesis, learning review, PDF/YouTube, third-party sync, and interactive knowledge graphs. Collaboration, passive capture, and additional clients are outside the launch scope. | Separate product validation after the beta. |

The initial cohort is students, developers, and self-directed learners who already save articles regularly. The beta tests whether structured notes and a growing, editable tree make those articles easier to revisit.

Users can continue saving links after reaching the AI allowance. Failed extraction or AI processing preserves the saved link and presents the applicable recovery path. The first release supports topic renaming, moving, and article reassignment. CAP-070 verifies a safe merge or documents a manual alternative.

## Decision register

| Decision | Development default | Owner and impact of open items |
|---|---|---|
| Web origin and hosting | Next.js at `http://localhost:3000`. Vercel is the intended host for staging and production. Configure explicit HTTPS origins in deployed environments. | Project owner selects hosted projects, domains, and approved redirects before CAP-102. Origin configuration also controls extension connectivity. |
| Environment isolation | Local Supabase for development. Separate Supabase, hosting, job, and monitoring projects or isolated environments for staging and production. | Project owner confirms account access and spend limits. Release operator verifies isolation before deployment. |
| Extension toolchain | WXT with TypeScript and Chrome Manifest V3. Share types and request validation with web. | Engineering verifies the unpacked build and permission prompts before CAP-010 closes. |
| Background processing | Inngest with a local dev server and a transactional dispatch mechanism. A durable provider supports retries while processing remains independent of capture. | Engineering verifies runtime limits and callback integration in CAP-049. Owner supplies hosted access for staging. |
| AI provider | OpenAI structured output, server-side only. Keep model selection configurable and cap input, output and retries. | Engineering benchmarks candidate models in CAP-056 and CAP-061. Owner supplies scoped access and approves spending before real use. |
| Beta payments | Free-only beta by default. Keep checkout disabled and use Stripe test mode for P9. | Project owner confirms cohort and billing strategy. Prices, currency, tax treatment, and live billing approval are pending. |
| Source control and CI | Local Git and GitHub Actions workflow. | Project owner supplies the GitHub repository and runner access before remote CI verification. |

## Environments and release policy

| Environment | Data and credentials | Changes and verification |
|---|---|---|
| Development | Local Supabase, synthetic seed accounts and content, local job runner, scoped AI development key if real calls are needed, and Stripe test mode. Keep production credentials out of developer env files and local tooling. | Test migrations from an empty local database and on representative prior schemas. Run unit, integration, and browser checks locally or on disposable CI runners. |
| Staging | Dedicated HTTPS origin, isolated database and job targets, scoped staging credentials, disposable accounts, and approved public article fixtures. Stripe uses test mode. | Apply reviewed migrations and verify callbacks, auth redirects, extension origins, a two-account smoke test, alerts, and recovery before promoting the same code revision. |
| Production | Separate production origin, database, job and monitoring targets, private backups, and deployment-scoped credentials. Limit production mutation to the protected release workflow or authorized release operators. | Apply reviewed migrations after a verified backup. Run consented smoke tests, monitor errors and spend, and follow the recovery plan if a release fails. |

GitHub pull requests and development scripts must have no production secret or deployment credential. Production deploys and database migrations must verify the target project and require an approved release environment. Keep callback and extension allowlists specific to each environment. Use forward-compatible migrations where practical and document recovery before applying data-changing releases.

Free beta can run with billing disabled. The server must default billing off, disable checkout and portal routes and billing UI when off, and allow startup with Stripe configuration absent. Free allowances and saved knowledge remain available. Verify these conditions in CAP-092 and CAP-108. Live payments require a passing P9 gate and explicit owner approval.

Get owner approval before provisioning production resources, enabling live billing, or publishing the extension. Confirm the pilot cohort, staging and production budgets, retention policy, and support path before inviting testers.
