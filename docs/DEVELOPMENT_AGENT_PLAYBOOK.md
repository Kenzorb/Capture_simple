# CAPTURE — Development Agent Execution Playbook

> **Purpose:** An end-to-end, executable build plan for an autonomous or human-assisted coding agent, with a **mandatory, durable checklist and progress log after every individual step**.
>
> **Project:** Capture — AI-powered article capture, structured notes, and personal knowledge tree (Chrome extension + web application).
>
> **Created:** 21 November 2026  
> **Status:** See [§11 Live progress state](#11-live-progress-state) for the current task and verification evidence.
> **Canonical product reference:** `docs/PRODUCT_SPEC.md` (copy from `Capture_Product_and_Technical_Specification.md`).  
> **Canonical execution file:** `docs/DEVELOPMENT_AGENT_PLAYBOOK.md` (this document).

**Agent entry instruction:** Before writing code, read this entire playbook, the product specification, the latest progress-log entries, the current repository state, and all open blockers. Work in numbered order. Every task requires implementation, verification, a checked checkbox, a progress-log entry, and a Git commit (when Git is available). Never claim completion based on code alone.

## Navigation

- [1. Mission, scope and completion criteria](#1-mission-scope-and-completion-criteria)
- [2. Non-negotiable agent operating rules](#2-non-negotiable-agent-operating-rules)
- [3. Persistent progress protocol](#3-persistent-progress-protocol)
- [4. Architecture and implementation defaults](#4-architecture-and-implementation-defaults)
- [5. Phase gates and checkpoints](#5-phase-gates-and-checkpoints)
- [6. Detailed step-by-step build sequence](#6-detailed-step-by-step-build-sequence)
- [7. End-to-end acceptance scenarios](#7-end-to-end-acceptance-scenarios)
- [8. Troubleshooting and blocked-work procedure](#8-troubleshooting-and-blocked-work-procedure)
- [9. Restart/handoff procedure](#9-restarthandoff-procedure)
- [10. Change control and future backlog](#10-change-control-and-future-backlog)
- [11. Live progress state](#11-live-progress-state)
- [12. Append-only execution log](#12-append-only-execution-log)

---

## 1. Mission, scope and completion criteria

### 1.1 Build the actual product, not a mock-up

A user can install the Capture Chrome extension, authenticate, intentionally save a real article with one click, see that article in the Next.js dashboard immediately, receive trustworthy AI-generated structured notes asynchronously, and navigate a dynamically populated personal knowledge tree. They can search, edit personal notes, correct topics, view processing status, manage Free/Pro usage, export their saved knowledge, and—when billing is enabled—upgrade with Stripe. The app should be deployable and usable by an initial beta cohort.

### 1.2 Boundaries

**Launch MVP includes:** account authentication; Chrome extension; manual URL capture; durable capture records; readable source extraction; duplicate handling; background AI processing; note validation; topic hierarchy and sidebar; article detail; basic related articles; search; personal notes; Markdown/JSON export; monthly processing allowances; security, tests, observability, onboarding; beta deployment.

**Paid-launch scope:** Stripe Checkout, webhook-driven subscriptions, billing portal, subscription cancellation/downgrade tests, correct monthly Pro quotas. Billing can be released after a free beta but must be completed before accepting money.

**Explicitly outside MVP:** full knowledge graph visualization, semantic/vector search, AI chat, cross-article synthesis, PDFs and YouTube, Notion/Obsidian synchronization, collaboration, native apps, passive browsing monitoring. Do not silently expand scope to add these.

### 1.3 Global definition of done

A task may be checked off **only when** all of these are true:

1. Intended behavior is implemented and not merely scaffolded; errors and empty states are considered.
2. Acceptance checks for that task pass, or a narrowly specified manual verification is recorded.
3. No secrets or personally captured article text are committed or written to analytics.
4. Required automated tests pass; relevant existing tests have no new failures.
5. Files changed, commands run, test results, and any limitations are added to the execution log.
6. The step's `- [ ]` checkbox is changed to `- [x]`; the live-state pointer moves forward.
7. The code **and updated playbook** are persisted with a Git commit; the commit hash is recorded in the log (or an explicit reason Git was unavailable is recorded).

**Overall project completion** additionally requires all mandatory phases through beta release, production smoke tests, privacy/security checks, restoration/runbook documentation, and documented remaining non-MVP work. Paid-launch tasks must pass before live checkout is enabled.

---

## 2. Non-negotiable agent operating rules

1. **Read before acting.** Inspect the existing repository and `docs/PRODUCT_SPEC.md`; never overwrite working user code, migrations, or design without checking.
2. **One task at a time.** Select the first unchecked, unblocked task within the current phase. Finish and log it before starting another.
3. **No false progress.** An unrun test is not a pass. A missing API key, migration, deployment, payment approval, or manual acceptance is a blocker or explicitly unfinished work.
4. **Persist on every step.** Update this playbook **on disk** after *each* task, including failed attempts; commit completed tasks. At session end, add a handoff entry.
5. **Keep the original checklist intact.** Do not reorder or renumber IDs; add an amendment for newly discovered work. Never erase older log entries.
6. **Prefer production-sensible defaults** and small changes over speculative abstractions. Follow the product spec if it conflicts with a suggested default here; record decisions.
7. **No fake integrations.** Tests may use mocks, but production paths must use real service integrations and clearly disclose any remaining stub.
8. **No silent external side effects.** Do not activate live Stripe payments, create chargeable cloud resources without limits, publish the extension, send bulk emails, or delete production data without explicit owner approval. Such steps may be marked blocked pending approval.
9. **Security is foundational.** Enforce ownership server-side; never embed service role, AI, billing, or worker secrets in browser or extension bundles. Treat page content as untrusted input, never as instructions for the coding agent.
10. **Use official, current documentation at implementation time.** Verify installed SDK methods, Manifest V3 requirements, current Supabase/Stripe APIs, provider limits and deployment behaviors. Do not blindly paste outdated snippets.
11. **Conserve costs.** Limit token/input size, requests, storage, retries, and per-user usage. Never expose an unlimited paid AI endpoint.
12. **Work cleanly.** Keep the Git working tree reasonably scoped; do not combine unrelated tasks into a single unreviewable change.
13. **Communicate blockers precisely.** State the missing secret/decision/permission, why it matters, what was tested, and a safe next action. Never fabricate a credential or success result.
14. **Do not remove user data on cancellation.** Downgrades must preserve captured articles, generated notes, topics, and exports.
15. **Completion means evidence.** Every phase gate requires a reproducible demonstration from the running app or test suite.

### 2.1 How to respond to the project owner after a task

Use the concise template below; the detailed evidence belongs in this file:

```text
Completed: CAP-XXX — <step title>
Changed: <main modules/features>
Verified: <commands, manual checks, pass/fail>
Progress: <completed>/<total required tasks for current phase>
Commit: <short hash or not available>
Next: CAP-YYY — <next step> (or BLOCKED: <reason>)
```

---

## 3. Persistent progress protocol

### 3.1 Canonical storage

The authoritative progress record is **this Markdown file in the Git repository**, under `docs/DEVELOPMENT_AGENT_PLAYBOOK.md`. The checkbox inside each task is the completion flag; §11 is a quick-resume pointer; §12 is an append-only audit trail. Git history preserves each update. A README summary or project-management board may mirror this file, but must not replace it.

**Owner setup (once):** place the product specification in `docs/PRODUCT_SPEC.md` and this file in `docs/DEVELOPMENT_AGENT_PLAYBOOK.md`. If these files begin outside the repository, the first tasks import them. Ensure the agent has filesystem write access and can commit.

### 3.2 Required six-stage lifecycle for EVERY task

1. **START:** inspect task requirements and dependencies; record `IN_PROGRESS` and the task ID in §11; append a `STARTED` log entry in §12, then save the file.
2. **IMPLEMENT:** make the smallest coherent code/schema/docs change. Do not begin unrelated tasks.
3. **VERIFY:** execute the task's command/check, run relevant regression checks, and capture proof (test names, build results, manual screenshot/file path, or reproducible steps).
4. **RECORD:** append a `COMPLETED`, `BLOCKED`, or `FAILED` log entry in §12 with what changed, test evidence, decisions, costs and next step. If blocked or failed, leave the checkbox unchecked.
5. **CHECK:** for a verified completion, change exactly that task's checkbox to `[x]` and update §11 (`Last completed`, `Current/next step`, `Last verified`, blockers). If incomplete, keep `[ ]` and set `BLOCKED` or `IN_PROGRESS` as appropriate.
6. **PERSIST:** save on disk and create a Git commit containing the work and this updated playbook; record its hash in a new one-line `COMMIT` addendum if needed, since a commit cannot know its own hash. If commit fails, record the reason and do **not** pretend changes are durable in version control.

**Important:** Never replace `STARTED` or failure log entries—append a new line. If a task spans multiple sessions, append `RESUMED` entries. An unverified change stays unchecked.

### 3.3 Suggested Git workflow

```bash
# Confirm location and inspect work before starting
git status --short
git branch --show-current

# After implementing, testing, checking the box, and appending the log
git diff --check
git status --short
# Stage only intended files; don't blindly add .env or unrelated changes
git add <specific-code-files> docs/DEVELOPMENT_AGENT_PLAYBOOK.md
git commit -m "feat(capture): CAP-XXX <short task description>"
git rev-parse --short HEAD

# Append a COMMIT addendum with the resulting hash, then persist it
# (Include that addendum in the next task's commit, or make a docs-only commit.)
```

Before the first commit, ensure `.gitignore` excludes `.env`, `.env.*` except safe examples, build outputs, logs, uploaded source content, browser profiles, and local secrets. A commit can record only what was written before it; the subsequent hash addendum explicitly solves that ordering issue.

### 3.4 Required log fields

For **every** task attempt include: timestamp with timezone, task ID and title, actor/session (if known), `STARTED|RESUMED|COMPLETED|BLOCKED|FAILED|COMMIT`, files changed, commands/checks with actual results, screenshot/report paths (if any), unresolved issues, Git hash if known, and next task. Record decisions in the relevant log entry; do not invent test output.

### 3.5 Crash and restart safety

At the beginning of every new agent session:

```bash
pwd && git status --short && git log -5 --oneline
# Read:
# - docs/PRODUCT_SPEC.md
# - docs/DEVELOPMENT_AGENT_PLAYBOOK.md (§11, last §12 entries, then task)
# - any relevant source/test files
```

If §11 indicates `IN_PROGRESS` but the task checkbox is empty, inspect `git diff`, recent commits and logs before resuming. If a checkbox is marked complete but its tests or commit cannot be verified, append a discrepancy entry, change it back to `[ ]`, and repair or retest. Do not rerun schema changes or payment operations blindly.

---

## 4. Architecture and implementation defaults

These are **implementation defaults**, not claims that cloud accounts or credentials already exist. Record any divergence in §12 before building around it.

| Area | Default | Notes |
|---|---|---|
| Package manager | `pnpm` workspaces | One lockfile; pin runtime via `.nvmrc`/package engines |
| Web | Next.js App Router + React + TypeScript | Server-side API routes, accessible responsive UI |
| Styling | Tailwind + accessible component primitives | Keep the tree keyboard accessible |
| Extension | WXT + TypeScript, Chrome Manifest V3 | Minimal `activeTab`, `storage`, `scripting` and API host access |
| Authentication | Supabase Auth | Same user identity for web and extension; PKCE or verified one-time handoff |
| Database | Supabase PostgreSQL with migrations + RLS | User-owned relations; composite ownership safeguards |
| Article extraction | Mozilla Readability in permitted tab context | Sanitize content and normalize metadata |
| Job processor | One **durable** job provider (default: Inngest) | Verify limits, retries and deployment integration before committing |
| AI | Server-side structured-output-capable model provider (default: OpenAI) | Zod validation; configurable model/cost ceilings |
| Payments | Stripe | Checkout, Billing Portal, signed webhooks, server-entitlement checks |
| Hosting | Vercel for web + suitable worker runtime | Separate dev/staging/prod configs |
| Tests | Vitest + Testing Library + Playwright | SQL/RLS checks and extension manual smoke tests as needed |
| Observability | Hosted logs and error monitoring | No article bodies or secret tokens in telemetry |
| Data lifecycle | Save immediately, process asynchronously | Always preserve the article if extraction/AI fails |

### 4.1 Suggested repository layout

```text
capture/
├── apps/
│   ├── web/                  # Next.js app, API, dashboard, billing
│   └── extension/            # Chrome MV3 (WXT)
├── packages/
│   ├── shared/               # types, Zod schemas, constants
│   └── database/             # DB types / typed queries
├── supabase/
│   ├── migrations/          # versioned SQL (source of truth)
│   └── seed.sql              # safe test data (never real user content)
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── DEVELOPMENT_AGENT_PLAYBOOK.md  # this file, modified each step
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── RUNBOOK.md
│   └── API.md
├── .env.example             # placeholders only
├── .gitignore
├── pnpm-workspace.yaml
└── README.md
```

### 4.2 Canonical processing state model

`SAVED → QUEUED → PROCESSING → READY`, with recoverable/terminal alternatives `FAILED`, `QUOTA_LIMITED`, and `UNSUPPORTED`. The article record survives **all** states. Worker retries must not duplicate usage or notes, and a late worker must not overwrite a newer reprocessing result. Store traceable error codes but expose safe, friendly messages to users.

### 4.3 Minimum API surface

`GET /api/me`; `POST /api/captures`; `GET /api/articles`; `GET/PATCH/DELETE /api/articles/:id`; `POST /api/articles/:id/process`; `GET/POST /api/topics`; `PATCH /api/topics/:id`; `POST /api/articles/:id/topics`; `GET /api/search`; `GET /api/usage`; `GET /api/export`; `POST /api/billing/checkout`; `POST /api/billing/portal`; `POST /api/webhooks/stripe`.

Apply request schemas, authentication/authorization, ownership checks, pagination, rate limits, and predictable error envelopes. Do not take `user_id` from request bodies as authority.

### 4.4 Quotas and pricing configuration (proposed—not final pricing)

- Free: 20 successfully processed articles per monthly period.
- Pro: 300 successfully processed articles per monthly period.
- Pro test-mode prices are USD $11.99 monthly and $107.88 yearly. Live pricing requires a separate decision.
- Unlimited **link saving** subject to fair use; AI analysis is limited and server-metered.
- Quota reservation happens atomically on enqueue, a success consumes it, a terminal failure releases it, a retry reuses it, and duplicates do not charge.
- Monthly processing-period reset must also happen for annual subscribers, independent of annual billing renewal.
- Price/currency, taxes, Stripe account availability, and cost viability must be verified before paid launch.

---

## 5. Phase gates and checkpoints

| Phase | Outcome / proof required before moving on |
|---|---|
| P0 — Discovery & plan | Product documents imported, choices recorded, prerequisites inventoried |
| P1 — Repository & CI | Clean installation, local web + extension builds, scripts and CI passing |
| P2 — Database & authentication | Two users sign in; ownership isolation verified with RLS tests |
| P3 — Capture API & persistence | Real capture stored, deduplicated and retrieved without AI |
| P4 — Web library | Authenticated library, article details and manual capture work |
| P5 — Chrome extension | One-click real-page capture via secure authenticated extension |
| P6 — AI pipeline | Durable background notes with retries, validated output and states |
| P7 — Knowledge tree | Relevant articles route into a stable, editable, dynamic hierarchy |
| P8 — UX, search & quotas | Core revisit loop passes; quota enforced under concurrency; export works |
| P9 — Paid readiness | Stripe test-mode lifecycle correctly sets/revokes entitlements |
| P10 — Quality & security | Regression, isolation, abuse, accessibility and cost checks pass |
| P11 — Beta deployment & release | Staging/production smoke tests, runbook, owner approval and release record |

**Mandatory MVP beta release gates:** P0–P8, P10 and P11. **P9 is mandatory before charging users**; a free-only beta may defer P9 after explicitly gating billing features off. No advanced/post-MVP feature is required for these gates.

---

## 6. Detailed step-by-step build sequence

**Each checkbox below is the authoritative completion flag.** Do not mark any until implemented, verified, logged and persisted as defined in §3. `CAP-XXX` IDs are immutable. Every task’s acceptance check must be backed by tests and/or reproducible manual evidence.

### P0 — Discover, align, and secure prerequisites

**Goal:** Establish an unambiguous baseline without destroying existing work.

#### CAP-001 — Inventory the repository

- [x] **CAP-001 complete** (implemented, verified, logged, and persisted).

**Implement:** Inspect directory tree, Git history, existing packages, configs, tests, and any work already completed. Record discrepancies with the spec rather than replacing code.

**Verify / acceptance:** A short current-state inventory is appended to §12; any existing changes are identified.

**Record:** Append a start and outcome entry for `CAP-001` in §12; update §11; check this box and commit only on verified success.

#### CAP-002 — Import and cross-check source documents

- [x] **CAP-002 complete** (implemented, verified, logged, and persisted).

**Implement:** Place product spec at `docs/PRODUCT_SPEC.md` and this playbook at its canonical path. Compare feature IDs F01–F23 with the phase tasks and flag any contradictions.

**Verify / acceptance:** Both files readable in repo; changes to filenames are documented.

**Record:** Append a start and outcome entry for `CAP-002` in §12; update §11; check this box and commit only on verified success.

#### CAP-003 — Lock MVP and paid-release scope

- [x] **CAP-003 complete** (implemented, verified, logged, and persisted).

**Implement:** Document MVP vs paid vs post-MVP scopes and the initial beta audience; avoid prematurely building semantic search, AI chat, PDFs, or graph UI.

**Verify / acceptance:** Scope table in `docs/ARCHITECTURE.md`; no unresolved architecture blocker.

**Record:** Append a start and outcome entry for `CAP-003` in §12; update §11; check this box and commit only on verified success.

#### CAP-004 — Make a decision register

- [x] **CAP-004 complete** (implemented, verified, logged, and persisted).

**Implement:** Choose/confirm app origin, dev/staging/prod environments, extension build tool, one job provider, AI provider and beta payment strategy. Record tradeoffs and owner approvals.

**Verify / acceptance:** Decision log lists selected defaults and unresolved decisions, each with owner/impact.

**Record:** Append a start and outcome entry for `CAP-004` in §12; update §11; check this box and commit only on verified success.

#### CAP-005 — Verify accounts and access safely

- [x] **CAP-005 complete** (implemented, verified, logged, and persisted).

**Implement:** Check which Supabase, hosting, background-jobs, AI, GitHub, monitoring and Stripe accounts are available. List required secrets by variable name only; do not request passwords in chat or commit them.

**Verify / acceptance:** `docs/SETUP.md` lists account prerequisites and safe local setup; secrets remain private.

**Record:** Append a start and outcome entry for `CAP-005` in §12; update §11; check this box and commit only on verified success.

#### CAP-006 — Create implementation risk checklist

- [x] **CAP-006 complete** (implemented, verified, logged, and persisted).

**Implement:** List RLS leakage, extension auth, page extraction, SSRF, hallucinations, concurrent quotas, webhook replays, costs, and copyright/data retention risks.

**Verify / acceptance:** `docs/SECURITY.md` has measurable mitigations and owners.

**Record:** Append a start and outcome entry for `CAP-006` in §12; update §11; check this box and commit only on verified success.

#### CAP-007 — Define environments and release policy

- [x] **CAP-007 complete** (implemented, verified, logged, and persisted).

**Implement:** Write a dev/staging/prod boundary with migration, test-data, secrets, and release-approval rules; confirm free beta can run with billing disabled.

**Verify / acceptance:** No action in dev can accidentally affect production; documented release decision policy.

**Record:** Append a start and outcome entry for `CAP-007` in §12; update §11; check this box and commit only on verified success.

**P0 gate:** All mandatory P0 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P1 — Initialize repository, tooling, and CI

**Goal:** Create a reproducible development setup with no credentials in source control.

#### CAP-008 — Initialize Git and workspace

- [x] **CAP-008 complete** (implemented, verified, logged, and persisted).

**Implement:** Preserve existing repository if present. Add `pnpm-workspace.yaml`, root package scripts, runtime pinning, `.editorconfig` and safe `.gitignore`.

**Verify / acceptance:** Fresh clone installs; `git status` does not expose env/secrets.

**Record:** Append a start and outcome entry for `CAP-008` in §12; update §11; check this box and commit only on verified success.

#### CAP-009 — Scaffold Next.js web app

- [x] **CAP-009 complete** (implemented, verified, logged, and persisted).

**Implement:** Create App Router, TypeScript and Tailwind setup; add home, sign-in placeholder and protected dashboard route structure.

**Verify / acceptance:** `pnpm --filter web dev` serves initial pages; `pnpm --filter web build` succeeds.

**Record:** Append a start and outcome entry for `CAP-009` in §12; update §11; check this box and commit only on verified success.

#### CAP-010 — Scaffold MV3 Chrome extension

- [x] **CAP-010 complete** (implemented, verified, logged, and persisted).

**Implement:** Create WXT/TypeScript extension workspace with popup, background entrypoint, manifest, extension icon placeholders and minimal permissions.

**Verify / acceptance:** Extension builds and loads unpacked in Chrome; manifest permissions audited.

**Record:** Append a start and outcome entry for `CAP-010` in §12; update §11; check this box and commit only on verified success.

#### CAP-011 — Create shared schemas/types package

- [x] **CAP-011 complete** (implemented, verified, logged, and persisted).

**Implement:** Define shared API request/response contracts, error structure, processing statuses, plan enums, article/topic types and Zod schemas.

**Verify / acceptance:** TypeScript consumers compile from both web and extension without server secrets.

**Record:** Append a start and outcome entry for `CAP-011` in §12; update §11; check this box and commit only on verified success.

#### CAP-012 — Configure formatting and quality scripts

- [x] **CAP-012 complete** (implemented, verified, logged, and persisted).

**Implement:** Set up ESLint/formatting/typecheck/test/build commands and root shortcuts; document exact commands in README.

**Verify / acceptance:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` work (or safe no-test baseline is explicit).

**Record:** Append a start and outcome entry for `CAP-012` in §12; update §11; check this box and commit only on verified success.

#### CAP-013 — Set up testing harness

- [x] **CAP-013 complete** (implemented, verified, logged, and persisted).

**Implement:** Add Vitest, DOM/component testing, Playwright E2E scaffold, fixtures, a local test DB strategy and seed cleanup guidance.

**Verify / acceptance:** One meaningful unit, component, and smoke test runs in CI-equivalent mode.

**Record:** Append a start and outcome entry for `CAP-013` in §12; update §11; check this box and commit only on verified success.

#### CAP-014 — Set up CI workflow

- [x] **CAP-014 complete** (implemented, verified, logged, and persisted).

**Implement:** Add GitHub Actions (or selected CI) for install, format/lint, typecheck, tests and builds; cache dependencies safely.

**Verify / acceptance:** CI passes in a clean environment and fails on intentional test failure.

**Record:** Append a start and outcome entry for `CAP-014` in §12; update §11; check this box and commit only on verified success.

#### CAP-015 — Document local developer startup

- [x] **CAP-015 complete** (implemented, verified, logged, and persisted).

**Implement:** Create README/SETUP instructions: env template, Supabase local commands, web server, extension load, job dev mode, test run.

**Verify / acceptance:** An unfamiliar developer can follow instructions without undocumented steps.

**Record:** Append a start and outcome entry for `CAP-015` in §12; update §11; check this box and commit only on verified success.

**P1 gate:** All mandatory P1 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P2 — Build database, RLS, and sign-in

**Goal:** Prove authenticated identity and tenant isolation before connecting public APIs.

#### CAP-016 — Initialize Supabase and migrations

- [x] **CAP-016 complete** (implemented, verified, logged, and persisted).

**Implement:** Set up Supabase project/local instance and versioned SQL migrations; keep schema changes reversible when practical.

**Verify / acceptance:** Fresh database is reproducible from migrations; no manual console-only schema.

**Record:** Append a start and outcome entry for `CAP-016` in §12; update §11; check this box and commit only on verified success.

#### CAP-017 — Create users and article tables

- [x] **CAP-017 complete** (implemented, verified, logged, and persisted).

**Implement:** Add profiles, articles, article_contents, personal_notes and relevant indexes, timestamps, canonical URL uniqueness, ownership and delete rules.

**Verify / acceptance:** SQL tests create one article/user; duplicates cannot violate integrity.

**Record:** Append a start and outcome entry for `CAP-017` in §12; update §11; check this box and commit only on verified success.

#### CAP-018 — Create topic and relationship tables

- [x] **CAP-018 complete** (implemented, verified, logged, and persisted).

**Implement:** Add topics, article_topics, concepts/article_concepts if needed, with valid parent relations, ownership constraints, one primary topic/article, and cycle protections.

**Verify / acceptance:** Cross-owner FK attacks fail; topic cycles and duplicate sibling names are rejected.

**Record:** Append a start and outcome entry for `CAP-018` in §12; update §11; check this box and commit only on verified success.

#### CAP-019 — Create processing and usage tables

- [x] **CAP-019 complete** (implemented, verified, logged, and persisted).

**Implement:** Add processing_jobs, durable-dispatch/outbox if required, usage_periods and usage_events with unique idempotency keys and reservation states.

**Verify / acceptance:** Concurrent reservation schema/invariants can be exercised in DB tests.

**Record:** Append a start and outcome entry for `CAP-019` in §12; update §11; check this box and commit only on verified success.

#### CAP-020 — Create billing tables

- [x] **CAP-020 complete** (implemented, verified, logged, and persisted).

**Implement:** Add subscriptions and billing_events with unique Stripe event IDs and internal plan fields; do not grant Pro just because client says so.

**Verify / acceptance:** Migrations apply with billing disabled; duplicate event IDs are rejected.

**Record:** Append a start and outcome entry for `CAP-020` in §12; update §11; check this box and commit only on verified success.

#### CAP-021 — Enable and test RLS everywhere

- [x] **CAP-021 complete** (implemented, verified, logged, and persisted).

**Implement:** Create narrowly scoped select/insert/update/delete policies for user-owned tables. Private worker/billing writes use server-side checks and restricted roles.

**Verify / acceptance:** Two authenticated test users cannot read, edit, delete or reference one another’s records; anon denied.

**Record:** Append a start and outcome entry for `CAP-021` in §12; update §11; check this box and commit only on verified success.

#### CAP-022 — Implement Supabase client/server adapters

- [x] **CAP-022 complete** (implemented, verified, logged, and persisted).

**Implement:** Create typed browser/server clients, middleware or equivalent session refresh strategy, and authorization helpers; keep privileged client server-only.

**Verify / acceptance:** No privileged env variable lands in the browser bundle; authenticated request resolves user correctly.

**Record:** Append a start and outcome entry for `CAP-022` in §12; update §11; check this box and commit only on verified success.

#### CAP-023 — Implement sign-up/sign-in/sign-out

- [ ] **CAP-023 complete** (implemented, verified, logged, and persisted).

**Implement:** Create auth screens, validation, loading, passwordless/OAuth flow as selected, session refresh and logout behavior.

**Verify / acceptance:** New user can sign up, sign in again, navigate protected routes, sign out and lose access.

**Owner-approved deferral:** Fresh signup email confirmation is deferred. Continue with the existing confirmed development account. Leave CAP-023 unchecked until the full signup acceptance flow passes.

**Record:** Append a start and outcome entry for `CAP-023` in §12; update §11; check this box and commit only on verified success.

#### CAP-024 — Protect dashboard/API boundaries

- [x] **CAP-024 complete** (implemented, verified, logged, and persisted).

**Implement:** Redirect unauthenticated dashboard use, enforce API authentication independently of UI, and handle expired/revoked sessions.

**Verify / acceptance:** Direct unauthenticated API calls fail; refresh and logout tested.

**Record:** Append a start and outcome entry for `CAP-024` in §12; update §11; check this box and commit only on verified success.

#### CAP-025 — Generate typed database access

- [x] **CAP-025 complete** (implemented, verified, logged, and persisted).

**Implement:** Generate DB types from migrations and expose owner-scoped query helpers; avoid ad-hoc SQL hidden in route handlers.

**Verify / acceptance:** Types compile, tests pass, and queries require authenticated user context.

**Record:** Append a start and outcome entry for `CAP-025` in §12; update §11; check this box and commit only on verified success.

**P2 gate:** All mandatory P2 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P3 — Capture API and reliable storage

**Goal:** Durably save real sources without depending on AI availability.

#### CAP-026 — Specify capture and article API contracts

- [x] **CAP-026 complete** (implemented, verified, logged, and persisted).

**Implement:** Create request/response schemas and `docs/API.md`; include optional content, manual URLs, request IDs, duplicate flag, statuses, error envelope and pagination.

**Verify / acceptance:** Contract tests reject malformed payloads and match documented examples.

**Record:** Append a start and outcome entry for `CAP-026` in §12; update §11; check this box and commit only on verified success.

#### CAP-027 — Implement safe URL validation and canonicalization

- [x] **CAP-027 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow only supported HTTP(S) URLs, remove tracking params conservatively, keep content-affecting params/hash routes, normalize domain, reject invalid/dangerous protocols.

**Verify / acceptance:** URL fixture tests cover redirects, tracking params, query distinctions, fragments, international domains and edge cases.

**Record:** Append a start and outcome entry for `CAP-027` in §12; update §11; check this box and commit only on verified success.

#### CAP-028 — Implement POST /api/captures

- [x] **CAP-028 complete** (implemented, verified, logged, and persisted).

**Implement:** Authenticate and validate; create article with status SAVED immediately and idempotency key; accept bounded user-initiated extracted content; support URL-only saves.

**Verify / acceptance:** Authorized real capture persists and returns article ID even with AI offline.

**Record:** Append a start and outcome entry for `CAP-028` in §12; update §11; check this box and commit only on verified success.

#### CAP-029 — Make deduplication atomic

- [x] **CAP-029 complete** (implemented, verified, logged, and persisted).

**Implement:** Enforce `(user_id,canonical_url)` uniqueness with upsert/transaction handling; repeat requests return existing article and never double-charge.

**Verify / acceptance:** Concurrent duplicate request test produces exactly one article for the user.

**Record:** Append a start and outcome entry for `CAP-029` in §12; update §11; check this box and commit only on verified success.

#### CAP-030 — Implement article list and detail APIs

- [x] **CAP-030 complete** (implemented, verified, logged, and persisted).

**Implement:** Add cursor/limit pagination, status filters, sorting, safe fields, detail notes/topics retrieval; avoid returning other users’ sources.

**Verify / acceptance:** Two-user API tests verify own records and reject cross-user IDs.

**Record:** Append a start and outcome entry for `CAP-030` in §12; update §11; check this box and commit only on verified success.

#### CAP-031 — Implement edits, archive, and delete

- [x] **CAP-031 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow permitted title/personal note/archive operations, user-scoped deletion, cascading cleanup and clear confirmation behavior.

**Verify / acceptance:** Create/edit/archive/restore/delete lifecycle tests pass without orphaned personal data.

**Record:** Append a start and outcome entry for `CAP-031` in §12; update §11; check this box and commit only on verified success.

#### CAP-032 — Implement manual URL capture path

- [x] **CAP-032 complete** (implemented, verified, logged, and persisted).

**Implement:** Support pasted public URLs in the web app; save even if extraction cannot run; server fetching needs SSRF defenses and strict request timeouts.

**Verify / acceptance:** URL-only capture reliably saves, with unsupported/unsafe fetch errors handled safely.

**Record:** Append a start and outcome entry for `CAP-032` in §12; update §11; check this box and commit only on verified success.

#### CAP-033 — Add rate limiting and request budgets

- [x] **CAP-033 complete** (implemented, verified, logged, and persisted).

**Implement:** Rate-limit capture per account/IP as appropriate, cap extracted_text bytes and URL length, restrict content types, and log safe error codes.

**Verify / acceptance:** Oversized payload and request burst yield predictable rejections, not crashes or provider charges.

**Record:** Append a start and outcome entry for `CAP-033` in §12; update §11; check this box and commit only on verified success.

**P3 gate:** All mandatory P3 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P4 — Web dashboard and captured-article experience

**Goal:** Make captured knowledge visible and usable before AI enrichment.

#### CAP-034 — Implement authenticated dashboard shell

- [x] **CAP-034 complete** (implemented, verified, logged, and persisted).

**Implement:** Build responsive layout, top search, user menu, left sidebar, loading skeletons, empty states, and routing; use accessible components.

**Verify / acceptance:** Desktop and narrow-screen routes work without layout overflows.

**Record:** Append a start and outcome entry for `CAP-034` in §12; update §11; check this box and commit only on verified success.

#### CAP-035 — Build overview and empty-state onboarding

- [x] **CAP-035 complete** (implemented, verified, logged, and persisted).

**Implement:** Display recent captures, status counts and prompt to save first article; do not invent topics when an account has no articles.

**Verify / acceptance:** New account displays honest empty state; populated account shows real DB data.

**Record:** Append a start and outcome entry for `CAP-035` in §12; update §11; check this box and commit only on verified success.

#### CAP-036 — Build All Captures library

- [x] **CAP-036 complete** (implemented, verified, logged, and persisted).

**Implement:** Render paginated article list/cards, source domain, capture time, processing badge, status and filters.

**Verify / acceptance:** Real API data updates after saving; pagination and empty filters are tested.

**Record:** Append a start and outcome entry for `CAP-036` in §12; update §11; check this box and commit only on verified success.

#### CAP-037 — Build manual URL-save form

- [x] **CAP-037 complete** (implemented, verified, logged, and persisted).

**Implement:** Validate and submit a URL; show immediate saved confirmation and link to detail; expose sensible errors.

**Verify / acceptance:** Manual URL appears in library without waiting for analysis.

**Record:** Append a start and outcome entry for `CAP-037` in §12; update §11; check this box and commit only on verified success.

#### CAP-038 — Build article detail baseline

- [x] **CAP-038 complete** (implemented, verified, logged, and persisted).

**Implement:** Show original URL, title, source metadata, status, personal notes editor, archive/delete controls and fallback when no AI output exists.

**Verify / acceptance:** User can create/edit notes, open source, archive and delete using own records.

**Record:** Append a start and outcome entry for `CAP-038` in §12; update §11; check this box and commit only on verified success.

#### CAP-039 — Add responsive UI and accessibility baseline

- [x] **CAP-039 complete** (implemented, verified, logged, and persisted).

**Implement:** Use accessible labels, keyboard navigation, focus management, loading announcements and clear color-independent status indicators.

**Verify / acceptance:** Automated accessibility checks plus manual keyboard tab-through pass on key screens.

**Record:** Append a start and outcome entry for `CAP-039` in §12; update §11; check this box and commit only on verified success.

**P4 gate:** All mandatory P4 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P5 — Chrome extension and secure account connection

**Goal:** Prove the central one-click workflow using real pages, safely.

#### CAP-040 — Implement extension connection/auth contract

- [x] **CAP-040 complete** (implemented, verified, logged, and persisted).

**Implement:** Pick supported OAuth/PKCE or a verified one-use authorization code handoff. Document state/redirect validation, token exchange, refresh, revocation and extension origin allowlisting.

**Verify / acceptance:** Threat-model review shows no durable credential in URL and no insecure cross-origin messaging.

**Record:** Append a start and outcome entry for `CAP-040` in §12; update §11; check this box and commit only on verified success.

#### CAP-041 — Connect extension to signed-in user

- [x] **CAP-041 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement sign-in/connect button, session persistence in extension-restricted storage, expiry/refresh handling, and disconnect/logout.

**Verify / acceptance:** Extension sends authenticated API request and receives correct user identity; revoke/logout invalidates it.

**Record:** Append a start and outcome entry for `CAP-041` in §12; update §11; check this box and commit only on verified success.

#### CAP-042 — Read active tab metadata only on click

- [x] **CAP-042 complete** (implemented, verified, logged, and persisted).

**Implement:** When user invokes capture, obtain URL/title/domain and optional metadata. Do not passively scan tab history or request all-site access without justification.

**Verify / acceptance:** Permissions test confirms no background browsing monitoring; restricted pages show clear state.

**Record:** Append a start and outcome entry for `CAP-042` in §12; update §11; check this box and commit only on verified success.

#### CAP-043 — Extract readable page content

- [x] **CAP-043 complete** (implemented, verified, logged, and persisted).

**Implement:** Run Readability or comparable parser on a safe snapshot of the chosen tab; sanitize, strip scripts, limit text size, preserve title/byline where possible.

**Verify / acceptance:** Real article fixtures include news, blogs, documentation and non-article pages; extraction failures degrade to URL save.

**Record:** Append a start and outcome entry for `CAP-043` in §12; update §11; check this box and commit only on verified success.

#### CAP-044 — Build minimal popup UX

- [x] **CAP-044 complete** (implemented, verified, logged, and persisted).

**Implement:** Show current page, optional personal note, save button, loading, already-saved, queued, quota-limited, unsupported and error states.

**Verify / acceptance:** Popup supports keyboard, shows actionable messages and remains fast.

**Record:** Append a start and outcome entry for `CAP-044` in §12; update §11; check this box and commit only on verified success.

#### CAP-045 — Send idempotent capture requests

- [x] **CAP-045 complete** (implemented, verified, logged, and persisted).

**Implement:** Call authenticated POST /api/captures, guard double click/timeouts, maintain request ID across retries and show stored article link.

**Verify / acceptance:** Repeated click or retry produces one capture; server and extension handle network failure.

**Record:** Append a start and outcome entry for `CAP-045` in §12; update §11; check this box and commit only on verified success.

#### CAP-046 — Deep-link to captured article

- [x] **CAP-046 complete** (implemented, verified, logged, and persisted).

**Implement:** Open web app article in a new tab and support “Open library”; build URL only from trusted application origin and server-returned IDs.

**Verify / acceptance:** Saved button opens correct account’s article; missing/unauthorized target handled.

**Record:** Append a start and outcome entry for `CAP-046` in §12; update §11; check this box and commit only on verified success.

#### CAP-047 — Test extension across browser edge cases

- [x] **CAP-047 complete** (implemented, verified, logged, and persisted).

**Implement:** Cover dynamic pages, article with images, heavy scripts, unsupported chrome:// pages, offline API, expired session and large content.

**Verify / acceptance:** Manual test matrix records pass/fail with browser version, URLs or fixtures, and evidence.

**Record:** Append a start and outcome entry for `CAP-047` in §12; update §11; check this box and commit only on verified success.

#### CAP-048 — Audit extension build and permissions

- [x] **CAP-048 complete** (implemented, verified, logged, and persisted).

**Implement:** Inspect manifest, CSP, bundled output and cross-origin handling; verify no AI/Stripe/service-role key in build; prepare safe development ID settings.

**Verify / acceptance:** Security check yields minimal permissions and clean secret scan.

**Record:** Append a start and outcome entry for `CAP-048` in §12; update §11; check this box and commit only on verified success.

**P5 gate:** All mandatory P5 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P6 — Background extraction and AI note generation

**Goal:** Turn saved content into trustworthy, structured knowledge without blocking capture.

#### CAP-049 — Select and configure durable background jobs

- [x] **CAP-049 complete** (implemented, verified, logged, and persisted).

**Implement:** Set up chosen provider, environment-specific credentials, timeouts, concurrency limits and worker deployment; avoid fire-and-forget serverless calls.

**Verify / acceptance:** A simple durable job survives API response and completes after intentional retry.

**Record:** Append a start and outcome entry for `CAP-049` in §12; update §11; check this box and commit only on verified success.

#### CAP-050 — Build transactional job dispatch

- [x] **CAP-050 complete** (implemented, verified, logged, and persisted).

**Implement:** Create the initial Free monthly usage period and, on eligible capture, atomically create a job + quota reservation + durable outbox/work item; prevent “saved but never queued” gaps. Later quota tasks harden reset and paid entitlements.

**Verify / acceptance:** Simulated provider outage retains recoverable job; recovery dispatches it once.

**Record:** Append a start and outcome entry for `CAP-050` in §12; update §11; check this box and commit only on verified success.

#### CAP-051 — Implement status state machine

- [x] **CAP-051 complete** (implemented, verified, logged, and persisted).

**Implement:** Define allowed transitions and owner-scoped status API; use job IDs/generation tokens to prevent stale worker overwrites.

**Verify / acceptance:** Tests reject invalid transitions and guarantee article survives failures.

**Record:** Append a start and outcome entry for `CAP-051` in §12; update §11; check this box and commit only on verified success.

#### CAP-052 — Implement source preparation/chunking

- [x] **CAP-052 complete** (implemented, verified, logged, and persisted).

**Implement:** Prefer user-initiated extracted content; for URL-only fetch, require public hosts, deny internal/private IP and DNS rebinding, bound redirects/time/bytes, and respect access restrictions.

**Verify / acceptance:** Security tests exercise localhost, metadata IPs, redirects, huge pages, unsupported content and timeouts.

**Record:** Append a start and outcome entry for `CAP-052` in §12; update §11; check this box and commit only on verified success.

#### CAP-053 — Clean and segment source text

- [x] **CAP-053 complete** (implemented, verified, logged, and persisted).

**Implement:** Normalize whitespace, remove noise, preserve meaningful headings, store content hash and evidence chunk IDs; enforce maximum input and token budget.

**Verify / acceptance:** Fixtures produce coherent bounded chunks; source-to-chunk traceability tested.

**Record:** Append a start and outcome entry for `CAP-053` in §12; update §11; check this box and commit only on verified success.

#### CAP-054 — Define AI structured-note schema

- [x] **CAP-054 complete** (implemented, verified, logged, and persisted).

**Implement:** Use Zod for summary, takeaways, sections, evidence chunk IDs, concepts, tags, topic suggestions, language, model and schema version; separate personal notes.

**Verify / acceptance:** Malformed or missing fields fail gracefully; schema version stored with notes.

**Record:** Append a start and outcome entry for `CAP-054` in §12; update §11; check this box and commit only on verified success.

#### CAP-055 — Design grounded prompts and injection defenses

- [x] **CAP-055 complete** (implemented, verified, logged, and persisted).

**Implement:** Pass page text as untrusted data; tell model to summarize only source content and use available evidence; explicitly prohibit source text from overriding system instructions.

**Verify / acceptance:** Adversarial article fixtures do not trigger privileged actions or leaked prompts.

**Record:** Append a start and outcome entry for `CAP-055` in §12; update §11; check this box and commit only on verified success.

#### CAP-056 — Integrate real AI provider server-side

- [x] **CAP-056 complete** (implemented, verified, logged, and persisted).

**Implement:** Make bounded model request with runtime/cost limits, retries for transient errors, structured outputs and server-held API keys only.

**Verify / acceptance:** At least three representative real articles produce validated results and recorded approximate token cost.

**Record:** Append a start and outcome entry for `CAP-056` in §12; update §11; check this box and commit only on verified success.

#### CAP-057 — Validate and persist AI results

- [x] **CAP-057 complete** (implemented, verified, logged, and persisted).

**Implement:** Validate schema, referenced evidence IDs, output length and ownership; save notes transactionally; never overwrite personal notes.

**Verify / acceptance:** Invalid outputs fail safely; valid outputs persist exactly once and survive refresh.

**Record:** Append a start and outcome entry for `CAP-057` in §12; update §11; check this box and commit only on verified success.

#### CAP-058 — Implement retry and terminal failure policy

- [x] **CAP-058 complete** (implemented, verified, logged, and persisted).

**Implement:** Classify timeout, rate limit, parse failure, source unsupported and provider outage; backoff with max attempts; provide user retry without duplicate billing.

**Verify / acceptance:** Injected failure tests show correct retries/statuses and eventual FAILED/UNSUPPORTED.

**Record:** Append a start and outcome entry for `CAP-058` in §12; update §11; check this box and commit only on verified success.

#### CAP-059 — Implement job idempotency and recovery

- [x] **CAP-059 complete** (implemented, verified, logged, and persisted).

**Implement:** Prevent duplicate worker execution from writing two note versions/usage events; add dead-letter/reconcile strategy and admin-safe retry.

**Verify / acceptance:** Duplicate delivery and worker crash tests preserve consistent article/usage state.

**Record:** Append a start and outcome entry for `CAP-059` in §12; update §11; check this box and commit only on verified success.

#### CAP-060 — Surface processing updates in web UI

- [x] **CAP-060 complete** (implemented, verified, logged, and persisted).

**Implement:** Use polling or authorized realtime feed; display saved/queued/processing/ready/failed/quota-limited, retry action and helpful explanation.

**Verify / acceptance:** Article transitions from SAVED to READY on-screen without a manual page reload.

**Record:** Append a start and outcome entry for `CAP-060` in §12; update §11; check this box and commit only on verified success.

#### CAP-061 — Run full capture-to-notes vertical slice

- [x] **CAP-061 complete** (implemented, verified, logged, and persisted).

**Implement:** Use a real article (not only mock content) from extension or manual save through API, queue, provider, database and dashboard.

**Verify / acceptance:** Record demo evidence, latency, output quality and provider cost. Phase gate must pass.

**Record:** Append a start and outcome entry for `CAP-061` in §12; update §11; check this box and commit only on verified success.

**P6 gate:** All mandatory P6 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P7 — Topic organization and dynamic knowledge tree

**Goal:** Organize newly processed articles without creating unstable or duplicate topic branches.

#### CAP-062 — Define hierarchy rules and topic API

- [x] **CAP-062 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement tree fetch, owner-scoped create, rename, move, and delete rules; define root vs child unique names, maximum depth and cycle detection.

**Verify / acceptance:** A full tree can be retrieved and invalid/malicious moves are rejected.

**Record:** Append a start and outcome entry for `CAP-062` in §12; update §11; check this box and commit only on verified success.

#### CAP-063 — Implement topic normalization and matching

- [x] **CAP-063 complete** (implemented, verified, logged, and persisted).

**Implement:** Normalize labels/aliases, prioritize exact or existing matching topics, keep matching deterministic where possible.

**Verify / acceptance:** Related example articles reuse existing branch instead of making near-duplicates.

**Record:** Append a start and outcome entry for `CAP-063` in §12; update §11; check this box and commit only on verified success.

#### CAP-064 — Resolve AI-suggested topic paths

- [x] **CAP-064 complete** (implemented, verified, logged, and persisted).

**Implement:** Provide bounded candidate topics to model if needed; validate returned IDs against owner; create sensible new topic or Unsorted fallback transactionally.

**Verify / acceptance:** AI output with foreign topic ID is rejected; valid fallback always assigns safely.

**Record:** Append a start and outcome entry for `CAP-064` in §12; update §11; check this box and commit only on verified success.

#### CAP-065 — Attach primary and secondary topics

- [x] **CAP-065 complete** (implemented, verified, logged, and persisted).

**Implement:** Enforce one primary topic per article, support additional relevant topics and track AI vs manual source/confidence.

**Verify / acceptance:** Relationships have no cross-user links and no duplicate article-topic rows.

**Record:** Append a start and outcome entry for `CAP-065` in §12; update §11; check this box and commit only on verified success.

#### CAP-066 — Build dynamic sidebar navigation

- [x] **CAP-066 complete** (implemented, verified, logged, and persisted).

**Implement:** Load user's real topic hierarchy into expandable/collapsible left nav with counts, loading and empty states.

**Verify / acceptance:** New topic appears after AI processing; sidebar persists navigation state sensibly.

**Record:** Append a start and outcome entry for `CAP-066` in §12; update §11; check this box and commit only on verified success.

#### CAP-067 — Build Knowledge Tree view

- [x] **CAP-067 complete** (implemented, verified, logged, and persisted).

**Implement:** Render nested topics and article leaves; allow expand/collapse, keyboard navigation, route to article/topic and avoid unbounded tree rendering.

**Verify / acceptance:** A user with multiple nested levels can find and open an article accessibly.

**Record:** Append a start and outcome entry for `CAP-067` in §12; update §11; check this box and commit only on verified success.

#### CAP-068 — Build topic detail pages

- [x] **CAP-068 complete** (implemented, verified, logged, and persisted).

**Implement:** Show topic description, child topics, article list, primary/secondary membership and relevant concept labels.

**Verify / acceptance:** Topic view matches DB relations and reflects article corrections.

**Record:** Append a start and outcome entry for `CAP-068` in §12; update §11; check this box and commit only on verified success.

#### CAP-069 — Implement manual topic corrections

- [x] **CAP-069 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow user to move/reassign an article and rename/move topics; preserve manual decisions against automatic reprocessing.

**Verify / acceptance:** Manual reassignment survives reprocess, refresh and unrelated new captures.

**Record:** Append a start and outcome entry for `CAP-069` in §12; update §11; check this box and commit only on verified success.

#### CAP-070 — Add safe topic merge or documented alternative

- [x] **CAP-070 complete** (implemented, verified, logged, and persisted).

**Implement:** If merge is in MVP scope, move article links and children transactionally with conflict resolution; otherwise defer explicitly and offer rename/move as baseline.

**Verify / acceptance:** No data loss under merge tests, or deferral and minimum substitute documented.

**Record:** Append a start and outcome entry for `CAP-070` in §12; update §11; check this box and commit only on verified success.

#### CAP-071 — Implement basic related-article suggestions

- [x] **CAP-071 complete** (implemented, verified, logged, and persisted).

**Implement:** Compute shared topics/concepts/tag overlap with bounded candidate queries, owner filters and no LLM-all-pairs explosion.

**Verify / acceptance:** Related links are relevant, scoped to user and fast with seeded larger libraries.

**Record:** Append a start and outcome entry for `CAP-071` in §12; update §11; check this box and commit only on verified success.

#### CAP-072 — Test evolving tree with a research corpus

- [x] **CAP-072 complete** (implemented, verified, logged, and persisted).

**Implement:** Capture multiple real pages across CS, entrepreneurship and history, including multi-disciplinary and duplicate-topic examples.

**Verify / acceptance:** Knowledge tree is stable, navigable and editable; taxonomy quality issues logged.

**Record:** Append a start and outcome entry for `CAP-072` in §12; update §11; check this box and commit only on verified success.

**P7 gate:** All mandatory P7 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P8 — Search, quotas, export, onboarding and usability

**Goal:** Finish the everyday capture → organize → revisit loop and fair Free plan.

#### CAP-073 — Add keyword search query/indexes

- [x] **CAP-073 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement server-scoped full-text/keyword search over titles, summaries, notes and topic names, with pagination and safe search input.

**Verify / acceptance:** Relevant results returned for own data; cross-user content absent; search latency measured.

**Record:** Append a start and outcome entry for `CAP-073` in §12; update §11; check this box and commit only on verified success.

#### CAP-074 — Build search UI and filters

- [x] **CAP-074 complete** (implemented, verified, logged, and persisted).

**Implement:** Provide search input, result previews, status/topic filters, empty/loading/error states and accessible navigation.

**Verify / acceptance:** A user can retrieve an article by concept or remembered title and open it.

**Record:** Append a start and outcome entry for `CAP-074` in §12; update §11; check this box and commit only on verified success.

#### CAP-075 — Implement personal note editing

- [x] **CAP-075 complete** (implemented, verified, logged, and persisted).

**Implement:** Autosave or explicit save with conflict/error handling; separate personal notes from regenerated AI notes.

**Verify / acceptance:** User-written notes survive model retries and topic changes.

**Record:** Append a start and outcome entry for `CAP-075` in §12; update §11; check this box and commit only on verified success.

#### CAP-076 — Implement Markdown/JSON export

- [x] **CAP-076 complete** (implemented, verified, logged, and persisted).

**Implement:** Export only authorized articles, source links, AI notes, personal notes, topics and timestamps in a portable format; handle large libraries safely.

**Verify / acceptance:** Export opens correctly; data belongs only to current user; deleted items absent.

**Record:** Append a start and outcome entry for `CAP-076` in §12; update §11; check this box and commit only on verified success.

#### CAP-077 — Implement usage-period creation/reset

- [x] **CAP-077 complete** (implemented, verified, logged, and persisted).

**Implement:** Create a documented UTC monthly quota anchor for Free and paid users, including monthly periods during annual Pro billing.

**Verify / acceptance:** Clock-boundary tests cover months of differing length, renewal, timezones and leap year.

**Record:** Append a start and outcome entry for `CAP-077` in §12; update §11; check this box and commit only on verified success.

#### CAP-078 — Harden and audit atomic reserve/use/release

- [x] **CAP-078 complete** (implemented, verified, logged, and persisted).

**Implement:** Extend the initial queue quota logic with concurrency-safe `used + reserved < limit` enforcement, reconciliation, paid limits, and reset behavior; success commits one used unit, terminal failure releases; retries reuse the same reservation.

**Verify / acceptance:** Parallel requests cannot overspend quota; event log reconciles to counters.

**Record:** Append a start and outcome entry for `CAP-078` in §12; update §11; check this box and commit only on verified success.

#### CAP-079 — Implement quota-limited save behavior

- [x] **CAP-079 complete** (implemented, verified, logged, and persisted).

**Implement:** When limit reached, keep saved link, mark QUOTA_LIMITED, show next reset/upgrade affordance; no unapproved automatic backlog processing.

**Verify / acceptance:** Capture is successful at quota limit and future AI call is blocked server-side.

**Record:** Append a start and outcome entry for `CAP-079` in §12; update §11; check this box and commit only on verified success.

#### CAP-080 — Build usage/settings view

- [x] **CAP-080 complete** (implemented, verified, logged, and persisted).

**Implement:** Show plan, used/reserved/limit, next reset, allowed retries, profile, privacy controls and export entry point.

**Verify / acceptance:** Values match server accounting and are never trusted from client state.

**Record:** Append a start and outcome entry for `CAP-080` in §12; update §11; check this box and commit only on verified success.

#### CAP-081 — Implement first-run onboarding

- [x] **CAP-081 complete** (implemented, verified, logged, and persisted).

**Implement:** Guide user through installing/connecting extension and capturing one real article; skipable, accessible, no fake example counts.

**Verify / acceptance:** New user completes onboarding and sees their first real knowledge branch.

**Record:** Append a start and outcome entry for `CAP-081` in §12; update §11; check this box and commit only on verified success.

#### CAP-082 — Add clear incomplete/error recovery UX

- [x] **CAP-082 complete** (implemented, verified, logged, and persisted).

**Implement:** Cover unsupported content, revoked extension session, quota exhausted, worker failure, empty tree, deleted article, offline and timeout.

**Verify / acceptance:** Usability walkthrough records no dead-end workflow.

**Record:** Append a start and outcome entry for `CAP-082` in §12; update §11; check this box and commit only on verified success.

#### CAP-083 — Verify MVP workflow with real users/testers

- [x] **CAP-083 complete** (implemented, verified, logged, and persisted).

**Implement:** Recruit a small consented beta sample, observe one capture/revisit session, record feedback separately from private page contents, and triage defects.

**Verify / acceptance:** At least one documented real-user walkthrough and prioritized issue list.

**Record:** Append a start and outcome entry for `CAP-083` in §12; update §11; check this box and commit only on verified success.

**P8 gate:** All mandatory P8 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P9 — Stripe monetization and entitlement integrity

**Goal:** Complete **before taking payment**; keep live money movement disabled until approved.

#### CAP-084 — Finalize pricing/currency and cost assumptions

- [x] **CAP-084 complete** (implemented, verified, logged, and persisted).

**Implement:** Estimate average AI spend per successful article at 20/300 volumes, hosting/job costs, fees, support and fair-use caps; obtain owner decision on USD prices.

**Verify / acceptance:** Pricing decision and margin scenario documented; no unsupported profitability claim.

**Record:** Append a start and outcome entry for `CAP-084` in §12; update §11; check this box and commit only on verified success.

#### CAP-085 — Configure Stripe test-mode products/prices

- [x] **CAP-085 complete** (implemented, verified, logged, and persisted).

**Implement:** Create test products for monthly/yearly Pro, store IDs in server-only environment configuration, never trust price IDs from browser.

**Verify / acceptance:** Test Checkout price/currency match documented plan; no live keys used.

**Record:** Append a start and outcome entry for `CAP-085` in §12; update §11; check this box and commit only on verified success.

#### CAP-086 — Implement authenticated Checkout endpoint

- [ ] **CAP-086 complete** (implemented, verified, logged, and persisted).

**Implement:** Create Stripe customer or retrieve existing, map authenticated user to server-selected Price ID, set safe success/cancel URLs.

**Verify / acceptance:** Free user can enter test checkout; tampered plan price/other-user ID rejected.

**Record:** Append a start and outcome entry for `CAP-086` in §12; update §11; check this box and commit only on verified success.

#### CAP-087 — Implement raw-body verified Stripe webhook

- [ ] **CAP-087 complete** (implemented, verified, logged, and persisted).

**Implement:** Verify signature, dedupe event IDs, handle out-of-order deliveries through current Stripe state when necessary; safely persist billing state.

**Verify / acceptance:** Forged/replayed/out-of-order events never grant unauthorized Pro.

**Record:** Append a start and outcome entry for `CAP-087` in §12; update §11; check this box and commit only on verified success.

#### CAP-088 — Implement server-side entitlements

- [ ] **CAP-088 complete** (implemented, verified, logged, and persisted).

**Implement:** Derive Pro allowance from verified subscription state and active entitlement dates; apply cancel-at-period-end, payment failure and downgrade behavior.

**Verify / acceptance:** User cannot set plan via client request; test status transitions change quota correctly.

**Record:** Append a start and outcome entry for `CAP-088` in §12; update §11; check this box and commit only on verified success.

#### CAP-089 — Implement customer billing portal

- [ ] **CAP-089 complete** (implemented, verified, logged, and persisted).

**Implement:** Create authenticated Stripe portal session for user’s own customer; expose manage/cancel/update payment actions.

**Verify / acceptance:** Test customer can reach portal and return to billing state safely.

**Record:** Append a start and outcome entry for `CAP-089` in §12; update §11; check this box and commit only on verified success.

#### CAP-090 — Build billing UI

- [ ] **CAP-090 complete** (implemented, verified, logged, and persisted).

**Implement:** Show Free/Pro, limits, proposed prices, checkout/manage links, billing status and error states; do not advertise planned features as live.

**Verify / acceptance:** Displayed amounts and entitlements match server config and test Stripe values.

**Record:** Append a start and outcome entry for `CAP-090` in §12; update §11; check this box and commit only on verified success.

#### CAP-091 — Test full billing lifecycle

- [ ] **CAP-091 complete** (implemented, verified, logged, and persisted).

**Implement:** Use Stripe test mode/CLI fixtures for subscribe, monthly reset, annual plan, cancel, past_due, downgrade, duplicate webhooks and stale events.

**Verify / acceptance:** Integration suite passes; captured knowledge remains after downgrade.

**Record:** Append a start and outcome entry for `CAP-091` in §12; update §11; check this box and commit only on verified success.

#### CAP-092 — Gate live billing behind owner approval

- [ ] **CAP-092 complete** (implemented, verified, logged, and persisted).

**Implement:** Verify tax/legal/merchant readiness, production webhook endpoint, live price IDs, refund/support policy and service limits before enabling checkout.

**Verify / acceptance:** Owner approval and launch state logged; otherwise billing remains disabled and task unchecked/blocked.

**Record:** Append a start and outcome entry for `CAP-092` in §12; update §11; check this box and commit only on verified success.

**P9 gate:** All mandatory P9 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P10 — Reliability, security, performance, and beta QA

**Goal:** Catch failures that are easy to miss in a happy-path demo.

#### CAP-093 — Audit authorization end to end

- [ ] **CAP-093 complete** (implemented, verified, logged, and persisted).

**Implement:** Exercise anonymous, expired, signed-out, standard Free and Pro sessions against every API; verify RLS on every new table.

**Verify / acceptance:** All private reads/writes require correct owner; access-control tests pass.

**Record:** Append a start and outcome entry for `CAP-093` in §12; update §11; check this box and commit only on verified success.

#### CAP-094 — Threat-test extraction and untrusted content

- [ ] **CAP-094 complete** (implemented, verified, logged, and persisted).

**Implement:** Attack URL-only fetching, redirects, DNS/IP validation, script injection, HTML sanitization, prompt injection and file-size boundaries.

**Verify / acceptance:** Security tests block internal network fetches and malicious source instructions.

**Record:** Append a start and outcome entry for `CAP-094` in §12; update §11; check this box and commit only on verified success.

#### CAP-095 — Test concurrency and event retries

- [ ] **CAP-095 complete** (implemented, verified, logged, and persisted).

**Implement:** Simulate simultaneous captures, repeated jobs, stale workers, outage recovery, quota racing, Stripe webhook replay and partial writes.

**Verify / acceptance:** Database invariants hold with no double charge or lost article.

**Record:** Append a start and outcome entry for `CAP-095` in §12; update §11; check this box and commit only on verified success.

#### CAP-096 — Test full browser/mobile accessibility

- [ ] **CAP-096 complete** (implemented, verified, logged, and persisted).

**Implement:** Run Playwright E2E in supported browsers, check responsive UI, focus traps, keyboard tree operation, labels, and actionable errors.

**Verify / acceptance:** Critical user flows have automated checks and documented manual accessibility pass.

**Record:** Append a start and outcome entry for `CAP-096` in §12; update §11; check this box and commit only on verified success.

#### CAP-097 — Performance-test realistic library sizes

- [ ] **CAP-097 complete** (implemented, verified, logged, and persisted).

**Implement:** Seed 100/1,000+ articles per test account, nested topics and longer articles; profile pagination, tree and search queries.

**Verify / acceptance:** Critical pages stay responsive within documented budgets; no N+1 explosion.

**Record:** Append a start and outcome entry for `CAP-097` in §12; update §11; check this box and commit only on verified success.

#### CAP-098 — Implement privacy lifecycle

- [ ] **CAP-098 complete** (implemented, verified, logged, and persisted).

**Implement:** Account deletion, content deletion, source retention controls, analytics exclusion of source text/URLs, scoped backups/retention and export.

**Verify / acceptance:** Privacy checklist passes; a test account can export then delete all its own data.

**Record:** Append a start and outcome entry for `CAP-098` in §12; update §11; check this box and commit only on verified success.

#### CAP-099 — Add observability and recovery alerts

- [ ] **CAP-099 complete** (implemented, verified, logged, and persisted).

**Implement:** Log safe job IDs/errors, failures, queue lag, retries and model costs; configure alerts for systemic failures with no source-body logging.

**Verify / acceptance:** Synthetic failure appears in monitoring; runbook explains remediation.

**Record:** Append a start and outcome entry for `CAP-099` in §12; update §11; check this box and commit only on verified success.

#### CAP-100 — Document backup/recovery and migrations

- [ ] **CAP-100 complete** (implemented, verified, logged, and persisted).

**Implement:** Create safe migration procedure, rollback/roll-forward strategy, recovery behavior and backup restore drill plan.

**Verify / acceptance:** Recovery drill or dry run documented with data-integrity checks.

**Record:** Append a start and outcome entry for `CAP-100` in §12; update §11; check this box and commit only on verified success.

#### CAP-101 — Run automated and manual release regression

- [ ] **CAP-101 complete** (implemented, verified, logged, and persisted).

**Implement:** Run lint, types, unit, integration, E2E, builds, RLS tests, extension tests, cost/performance checks; record exact commands/outcomes.

**Verify / acceptance:** Release checklist has actual evidence; failures triaged before deployment.

**Record:** Append a start and outcome entry for `CAP-101` in §12; update §11; check this box and commit only on verified success.

**P10 gate:** All mandatory P10 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P11 — Deploy, pilot, and close implementation

**Goal:** Make the app usable by an approved beta cohort with repeatable operations.

#### CAP-102 — Provision and verify staging infrastructure

- [ ] **CAP-102 complete** (implemented, verified, logged, and persisted).

**Implement:** Create staging Supabase, Next.js hosting, jobs, monitoring, HTTPS origins and test credentials, with separate secrets and budgets.

**Verify / acceptance:** Staging deploy and worker callbacks function; environment boundary verified.

**Record:** Append a start and outcome entry for `CAP-102` in §12; update §11; check this box and commit only on verified success.

#### CAP-103 — Deploy and test staged web and workers

- [ ] **CAP-103 complete** (implemented, verified, logged, and persisted).

**Implement:** Apply migrations, build/deploy, ensure auth redirect URLs, CORS/extension API host and jobs provider webhook endpoints align.

**Verify / acceptance:** Staging executes complete capture-to-tree scenario with real article.

**Record:** Append a start and outcome entry for `CAP-103` in §12; update §11; check this box and commit only on verified success.

#### CAP-104 — Build release candidate extension

- [ ] **CAP-104 complete** (implemented, verified, logged, and persisted).

**Implement:** Create signed/versioned unpacked/test extension package and verify production/staging origins, Manifest V3 constraints and permission prompts.

**Verify / acceptance:** Extension is installable on approved test browsers and connects to correct deployment.

**Record:** Append a start and outcome entry for `CAP-104` in §12; update §11; check this box and commit only on verified success.

#### CAP-105 — Run staging smoke-test matrix

- [ ] **CAP-105 complete** (implemented, verified, logged, and persisted).

**Implement:** With two users: sign in, extension capture, duplicate, AI notes, hierarchy, search, export, deletion, quota limit and billing in test mode (if enabled).

**Verify / acceptance:** Evidence and defects recorded; critical flows pass without admin workarounds.

**Record:** Append a start and outcome entry for `CAP-105` in §12; update §11; check this box and commit only on verified success.

#### CAP-106 — Prepare production release runbook

- [ ] **CAP-106 complete** (implemented, verified, logged, and persisted).

**Implement:** Write env setup, deploy, migration, rollback, alert triage, budget caps, Stripe live gating, support contact and extension store submission checklist.

**Verify / acceptance:** `docs/RUNBOOK.md` reviewed; no production release depends on hidden knowledge.

**Record:** Append a start and outcome entry for `CAP-106` in §12; update §11; check this box and commit only on verified success.

#### CAP-107 — Provision production after approval

- [ ] **CAP-107 complete** (implemented, verified, logged, and persisted).

**Implement:** With explicit owner approval, configure production Supabase, hosting, jobs, monitoring, secrets, backups, DNS and migration procedure.

**Verify / acceptance:** Production architecture works and follows documented budgets and isolation.

**Record:** Append a start and outcome entry for `CAP-107` in §12; update §11; check this box and commit only on verified success.

#### CAP-108 — Deploy production with safe feature flags

- [ ] **CAP-108 complete** (implemented, verified, logged, and persisted).

**Implement:** Deploy web/API/worker with billing off unless explicitly approved; set redirects, webhook auth, rate limits and environment-specific extension origin.

**Verify / acceptance:** Production basic health checks pass; no secrets exposed.

**Record:** Append a start and outcome entry for `CAP-108` in §12; update §11; check this box and commit only on verified success.

#### CAP-109 — Perform approved production smoke tests

- [ ] **CAP-109 complete** (implemented, verified, logged, and persisted).

**Implement:** Use consented sample article/test accounts to verify capture-to-notes-to-tree, auth, quota, search and export; avoid test purchases on live Stripe.

**Verify / acceptance:** Smoke test passes; cleanup respects account/data retention.

**Record:** Append a start and outcome entry for `CAP-109` in §12; update §11; check this box and commit only on verified success.

#### CAP-110 — Prepare Chrome Web Store beta submission

- [ ] **CAP-110 complete** (implemented, verified, logged, and persisted).

**Implement:** Create accurate listing/privacy information, permissions rationale, screenshots, support contact and final package; seek approval before publication.

**Verify / acceptance:** Submission materials reviewed; store publishing itself remains approval-gated.

**Record:** Append a start and outcome entry for `CAP-110` in §12; update §11; check this box and commit only on verified success.

#### CAP-111 — Launch limited beta and document feedback path

- [ ] **CAP-111 complete** (implemented, verified, logged, and persisted).

**Implement:** Invite an approved small tester cohort, capture bug reports without private page content and monitor errors/costs with configured alerts.

**Verify / acceptance:** At least one tester completes end-to-end flow; issues stored in backlog.

**Record:** Append a start and outcome entry for `CAP-111` in §12; update §11; check this box and commit only on verified success.

#### CAP-112 — Close MVP implementation and hand off

- [ ] **CAP-112 complete** (implemented, verified, logged, and persisted).

**Implement:** Verify P0–P8, P10–P11, plus P9 if charging, reconcile unfinished steps, publish runbook and backlog, and append final release/limitations summary.

**Verify / acceptance:** Owner receives release URL, extension installation steps, test proof, known issues, cost controls and next priorities.

**Record:** Append a start and outcome entry for `CAP-112` in §12; update §11; check this box and commit only on verified success.

**P11 gate:** All mandatory P11 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

---

## 7. End-to-end acceptance scenarios

Run these at phase gates and again in staging/production as applicable. Every case must record **environment, test user(s), build/commit, exact outcome, and evidence**. Never use real private articles in screenshots, CI fixtures or analytics.

| ID | Scenario | Expected outcome | Related steps |
|---|---|---|---|
| E2E-01 | Create a new account, sign out, sign back in | Correct identity and protected data | 021–025 |
| E2E-02 | User A tries User B article/topic IDs | 403/404 or equivalent; no data exposure | 021, 030, 093 |
| E2E-03 | Save a real article from extension | Fast confirmation; record appears immediately | 040–047 |
| E2E-04 | Double-click Save or retry after timeout | One article; no duplicate processing charge | 027–029, 045 |
| E2E-05 | Save while AI provider is unavailable | Capture retained; failed/queued status and retry | 049–060 |
| E2E-06 | Process an article with complex markup | Bounded, validated notes backed by source | 052–058 |
| E2E-07 | Save three related and one unrelated article | Coherent, nonduplicated topic branches | 063–072 |
| E2E-08 | Correct topic placement and regenerate | User’s manual placement remains in place | 065, 069 |
| E2E-09 | Search title, topic and note phrase | Own relevant results; no foreign content | 073–074 |
| E2E-10 | Save at monthly AI quota limit | Link saved; AI blocked until eligible | 077–080 |
| E2E-11 | Trigger concurrent queued jobs at last quota unit | Only permitted jobs reserve quota | 078, 095 |
| E2E-12 | Job fails then retries | No double consumption; status accurate | 058–059, 078 |
| E2E-13 | Export, then delete article/account | Portable export and no lingering user-facing data | 076, 098 |
| E2E-14 | Extension token expires or is revoked | Reauthentication; no unauthorized access | 040–041, 047 |
| E2E-15 | Attempt URL targeting localhost/private service | No server-side private network access | 032, 052, 094 |
| E2E-16 | Inject malicious text into article content | Model treats it as data, not instructions | 055, 094 |
| E2E-17 | Checkout monthly/yearly in Stripe test mode | Verified subscription updates entitlement | 085–091 |
| E2E-18 | Cancel/downgrade/past-due payment | Correct allowance; knowledge is retained | 088, 091 |
| E2E-19 | Replay invalid/old Stripe webhook | No unauthorized entitlement or duplication | 087, 091, 095 |
| E2E-20 | Deploy new version and test rollback path | Safe migration and documented recovery | 100, 102–109 |

### 7.1 Release readiness (master checklist)

- [ ] Every mandatory MVP phase gate passed; no critical/security blocker remains.
- [ ] All mandatory automated suites and manual critical-path checks have evidence.
- [ ] A real webpage was captured from the real extension into the deployed web app.
- [ ] Cross-user isolation and input/SSRF/prompt injection boundaries were exercised.
- [ ] Async processing works after temporary provider failures; quota is concurrency-safe.
- [ ] Free-plan limits and link-only capture behavior are proven.
- [ ] Stripe test lifecycle passes **before** enabling paid features.
- [ ] Privacy terms, data/export/delete pathways and support contact are prepared.
- [ ] Production secrets, backups, alerts, budget ceilings and rollback instructions are set.
- [ ] User/owner explicitly approved any live billing, production resources, or store publication.
- [ ] `docs/RUNBOOK.md`, release evidence, known issues and next owner action are complete.

---

## 8. Troubleshooting and blocked-work procedure

**Blocking conditions include:** no access to a required account/secret; unavailable database; ambiguous pricing or live-payment approval; failing migrations/RLS; brittle auth handoff; broken real article extraction; unsustainable AI costs; failed security test; unresolved release/privacy obligations.

1. Preserve all current code and progress-log entries; do not erase partially completed work.
2. Append an outcome entry with status `BLOCKED` or `FAILED`, the exact failed command/result and a proposed corrective action.
3. Leave the task checkbox unchecked and put the blocked task ID in §11.
4. Make the smallest safe fix and rerun acceptance tests, appending `RESUMED` and then `COMPLETED` entries as appropriate.
5. If an external decision or credential is truly required, explain precisely what the owner needs to provide. Work on other **independent** tasks only if no conflicting phase dependency exists; log the deviation explicitly.
6. If a risky workaround would bypass auth, RLS, quotas, webhook verification, or deployment approvals, **do not apply the workaround**.

### 8.1 Troubleshooting matrix

| Symptom | Investigate | Do not do |
|---|---|---|
| Capture saved but notes never arrive | job dispatch/outbox, worker logs, quota reservation, status transitions | silently rerun unlimited AI requests |
| Duplicate article rows | canonical URL, transaction, unique constraint, retries | deduplicate only in UI |
| Tree creates similar topics repeatedly | normalization, candidate matching, alias logic, AI confidence | send full user library to LLM every time |
| Extension 401 | auth state, refresh, redirect allowlist, API CORS | add server secret to extension |
| Supabase permission error | session identity, RLS, grants, owner-aware joins | disable RLS globally |
| AI summary contains invented content | evidence chunk checks, truncation, output validation | present AI answer as a verified quotation |
| Monthly usage overrun | atomic reservation transaction, retries, concurrency tests | trust client counters |
| Stripe entitlement mismatch | verified webhook event, provider current state, replay/out-of-order | trust browser plan flag |
| URL-only save reaches internal host | DNS/IP/redirect validation, fetch runtime | allow arbitrary server URL fetch |
| Unexpected provider bill | token caps, rate limits, retry storms, alert limits | leave production key unrestricted |

---

## 9. Restart/handoff procedure

### 9.1 At the beginning of every new session

1. Read `docs/PRODUCT_SPEC.md` (source of truth for product intent).
2. Read this document’s §11 state snapshot and the **last 10–20 entries** of §12.
3. Check `git status --short`, `git log -5 --oneline`, and any uncommitted diffs.
4. Identify the earliest unchecked task whose dependencies are complete (normally `Current task` in §11).
5. Rerun the latest relevant test if prior results cannot be reproduced.
6. Append a `RESUMED` entry before editing code and proceed with only that task.

### 9.2 At the end of every session (even unfinished)

- [ ] Save all intended code changes and this document.
- [ ] Record last command/tests and their actual status.
- [ ] Record `Current task` / `Next task` and blockers in §11.
- [ ] Append a `HANDOFF` entry with modified files, decisions, and exact next action.
- [ ] Commit safely when changes are verified; if work is incomplete, do not falsely check it off.

**One-minute next-agent prompt (copy/paste):**

> Continue building Capture from `docs/DEVELOPMENT_AGENT_PLAYBOOK.md`. First read `docs/PRODUCT_SPEC.md`, §11 Live Progress State and the latest §12 log entries, then inspect Git status and recent commits. Resume the first unchecked/unblocked CAP task. Implement and verify **only that step**, append start/completion or blocker logs, check its box only if acceptance criteria truly pass, update §11 and persist with a Git commit. Repeat in order. Do not assume previous tests passed unless there is evidence.

---

## 10. Change control and future backlog

### 10.1 If implementation discovers missing work

Do **not** renumber existing `CAP-001` through `CAP-112` items. Instead add `CAP-A001`, `CAP-A002`, etc. under this subsection with a dependency, acceptance criterion and checkbox. Link the amendment from the affected parent task and record the decision in §12. A security-critical discovered task must be resolved before the parent task can be considered done.

**Amendments (append new entries below):**

_None at document creation._

### 10.2 Post-MVP backlog (not a launch gate)

- [ ] **F17:** Semantic search with embeddings and scoped pgvector retrieval.
- [ ] **F18:** Knowledge chat with citations and independent cost/usage limits.
- [ ] **F19:** Multi-article synthesis with source evidence and conflict handling.
- [ ] **F20:** Learning insights, topic review and optional refresh prompts.
- [ ] **F21:** PDF and YouTube ingestion after source/licensing analysis.
- [ ] **F22:** Notion/Obsidian export/sync, with user-controlled connection scopes.
- [ ] **F23:** Interactive knowledge graph after actual demand is demonstrated.
- [ ] Multi-browser support, sharing and collaborative spaces only after validation.

---

## 11. Live progress state

> **THIS SECTION MUST BE EDITED AFTER EVERY TASK ATTEMPT.** It is a fast-restart pointer, not a substitute for checkboxes or the audit trail. Never pre-fill success or dates that have not occurred.

| Field | Current value |
|---|---|
| Overall status | `IN PROGRESS` |
| Current phase | `P9 — Stripe monetization and entitlement integrity` |
| Current task | `CAP-086 — Implement authenticated Checkout endpoint` |
| Last verified completed task | `CAP-085` |
| Last verification executed | `Stripe sandbox Checkout previews displayed US$11.99 per month and US$107.88 per year. Confirmed both price IDs in ignored server environment configuration.` |
| Last successful Git commit | `90574ca` |
| Active blockers | `Live verification of the Capture Checkout endpoint will require a server-side Stripe sandbox API key. Fresh signup acceptance remains deferred under CAP-023.` |
| MVP launch gate | `NOT READY` |
| Paid launch gate | `NOT READY — Stripe test lifecycle + explicit approval required` |
| Next action | `Implement authenticated Checkout with server-selected monthly and annual prices.` |

### 11.1 Phase progress overview

Counts below refer to tasks in the immutable numbered checklist. **Agents must update these counts only after verifying checkbox status**; never infer completion from the presence of files.

| Phase | Steps | Complete | State |
|---|---|---:|---|
| P0 | CAP-001–007 | 7/7 | Complete |
| P1 | CAP-008–015 | 8/8 | Complete |
| P2 | CAP-016–025 | 9/10 | Gate passed with CAP-023 deferred |
| P3 | CAP-026–033 | 8/8 | Complete |
| P4 | CAP-034–039 | 6/6 | Complete |
| P5 | CAP-040–048 | 9/9 | Complete |
| P6 | CAP-049–061 | 13/13 | Complete |
| P7 | CAP-062–072 | 11/11 | Complete |
| P8 | CAP-073–083 | 11/11 | Complete |
| P9 | CAP-084–092 | 2/9 | In progress |
| P10 | CAP-093–101 | 0/9 | Not started |
| P11 | CAP-102–112 | 0/11 | Not started |
| **Total** | **CAP-001–112** | **84/112** | **In progress** |

### 11.2 Decisions and blockers requiring owner input

Record answers here as decisions are made; record private keys only in secret stores or local ignored env files.

| Topic | Default / open question | Status |
|---|---|---|
| Supabase project | Which dev/staging/prod project? | Hosted capture-dev verified; staging and production unconfirmed |
| GitHub repository | Repo name, owner and CI access? | Unconfirmed |
| AI provider/model | OpenAI structured output, capped budgets | Default proposed; verify |
| Background jobs | Inngest, one durable provider | Selected and verified locally in CAP-049 |
| Payment plan | Free-only beta or paid beta? | Unconfirmed |
| Pricing/currency | USD $11.99 monthly / $107.88 annually | Sandbox decision recorded in CAP-084 |
| Production launch | Deployment/account approvals | Required when reached |
| Chrome Web Store | Publisher account/permissions | Required when reached |

---

## 12. Append-only execution log

> **THIS SECTION MUST GROW AFTER EVERY TASK ATTEMPT.** Do not rewrite past events. Use timezone-aware ISO timestamps (e.g. `2026-11-21T22:07:00+08:00`). Each completed task normally has at least a `STARTED` and a `COMPLETED` event, plus a subsequent commit-hash addendum. The template is **not** a record of actual progress.

### 12.1 Log entry template — copy once per event

```markdown
### [YYYY-MM-DDTHH:mm:ss+08:00] CAP-XXX — <title> — STARTED|RESUMED|COMPLETED|BLOCKED|FAILED|COMMIT|HANDOFF
- **Agent/session:** <agent name or session ID if known>
- **Context/dependencies:** <what was already verified>
- **Changes:** <files and behavior changed, or none>
- **Verification:** <exact command / test / manual action and actual PASS/FAIL/SKIPPED result>
- **Evidence:** <test report, screenshot path, link, commit diff or none>
- **Decisions:** <reasons and tradeoffs, or none>
- **Blockers/risks:** <exact item, or none>
- **Git commit:** <short SHA, pending addendum, or unavailable with reason>
- **Next action:** <next CAP ID and precise step>
```

### 12.2 Real execution history

_No tasks have been started or completed as of playbook creation. New entries MUST be appended below this line._


### [2026-11-21T22:55:04+08:00] CAP-001 — Inventory the repository — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** First unchecked task in P0. Both canonical documents were present at session start.
- **Changes:** Began baseline inventory and added a root `.gitignore` required by ?3.3 before the first commit.
- **Verification:** `rg --files --hidden` and `Get-ChildItem -Force` found the two planning documents, a zero-byte README, and empty `apps/web`, `apps/extension`, `packages`, and `supabase` directories. No application code, dependencies, configuration, migrations, tests, or CI are present. The initial `git status --short --branch` and `git log -5 --oneline` reported no repository. After `git init -b main`, explicit `--git-dir=.git --work-tree=.` status confirmed there were only untracked baseline files and no commits. `git remote -v` showed no remote.
- **Evidence:** `README.md`, `docs/PRODUCT_SPEC.md`, `docs/DEVELOPMENT_AGENT_PLAYBOOK.md`, and the empty directories above. The scaffold is earlier than the product specification's proposed repository structure.
- **Decisions:** Preserve the existing documents and empty scaffold. Initialize local Git to satisfy the per-task commit requirement.
- **Blockers/risks:** Git auto-discovery reports dubious ownership under the sandbox identity. Explicit repository arguments allow reads. Staging fails with permission denied on `.git/index.lock`.
- **Git commit:** Pending repository metadata write access.
- **Next action:** Persist the verified baseline before starting CAP-002.

### [2026-11-21T22:55:55+08:00] CAP-001 — Inventory the repository — COMPLETED
- **Agent/session:** Codex
- **Changes:** Recorded the baseline inventory and added `.gitignore`.
- **Verification:** File enumeration, directory inspection and explicit Git status passed the inventory acceptance check. Approved repository metadata access allowed staging.
- **Evidence:** CAP-001 STARTED entry and baseline files.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-002 — Import and cross-check source documents.

### [2026-11-21T22:56:10+08:00] CAP-001 — Inventory the repository — COMMIT
- **Git commit:** 9cc723b

### [2026-11-21T22:56:18+08:00] CAP-002 — Import and cross-check source documents — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-001 verified and committed. Both source documents already occupy the canonical paths.
- **Next action:** Cross-check all feature IDs and document scope discrepancies.

### [2026-11-21T22:57:00+08:00] CAP-002 — Import and cross-check source documents — COMPLETED
- **Agent/session:** Codex
- **Changes:** Corrected the illustrative `PRODUCT.md` name to `PRODUCT_SPEC.md` in spec §17. Both actual files were already at their canonical paths.
- **Verification:** `Get-Content -Encoding UTF8 -Raw` read both documents. A PowerShell regex check passed for all 23 feature rows, all seven post-MVP backlog entries, and removal of the stale name. Manually checked MVP coverage against §6.
- **Evidence:** F01 → 017/023/024/080; F02 → 040–048; F03 → 032/037; F04 → 043/052–053; F05 → 027–029; F06 → 030/036; F07 → 054–057; F08 → 063–065; F09 → 066–068; F10 → 069–070; F11 → 073–074; F12 → 051/060/079/082; F13 → 076; F14 → 084–092; F15 → 077–080; F16 → 071; F17–F23 → §10.2.
- **Decisions:** The phase labels in spec §18 describe roadmap milestones. Use playbook P0–P11 for execution order. Treat profile editing as part of CAP-080 and manual text fallback as a CAP-082 recovery path under spec §6.4. Billing lifecycle is a paid launch gate, and topic merging may follow if CAP-070 verifies an alternative.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-003 — Lock MVP and paid-release scope.

### [2026-11-21T22:57:06+08:00] CAP-002 — Import and cross-check source documents — COMMIT
- **Git commit:** 6a73f8d

### [2026-11-21T22:57:37+08:00] CAP-003 — Lock MVP and paid-release scope — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-002 mapped the specification features to the playbook.
- **Next action:** Document the launch scope and audience.

### [2026-11-21T22:57:43+08:00] CAP-003 — Lock MVP and paid-release scope — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added the release scope and beta audience to docs/ARCHITECTURE.md.
- **Verification:** Read docs/ARCHITECTURE.md as UTF-8 and checked scope rows, beta audience, and gate references with PowerShell. Manual comparison against spec §§7 and 18 and playbook §5 passed.
- **Evidence:** docs/ARCHITECTURE.md § Release scope.
- **Decisions:** Use the Free beta as the development baseline. Keep live billing approval separate. No unresolved architecture issue prevents the documented functional scope.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-004 — Make a decision register.

### [2026-11-21T22:57:48+08:00] CAP-003 — Lock MVP and paid-release scope — COMMIT
- **Git commit:** 9487054

### [2026-11-21T22:58:09+08:00] CAP-004 — Make a decision register — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-003 established the beta scope.
- **Next action:** Record implementation defaults and owner decisions.

### [2026-11-21T22:58:14+08:00] CAP-004 — Make a decision register — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added the decision register to docs/ARCHITECTURE.md.
- **Verification:** UTF-8 document check passed for all required choices. Manually reviewed each row for a default, owner, and impact.
- **Evidence:** docs/ARCHITECTURE.md § Decision register.
- **Decisions:** Use localhost:3000, WXT, Inngest, OpenAI and a Free beta baseline. Hosted account access, spend, domains, prices, and launch approvals remain open.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-005 — Verify accounts and access safely.

### [2026-11-21T22:58:20+08:00] CAP-004 — Make a decision register — COMMIT
- **Git commit:** 1948136

### [2026-11-21T22:58:47+08:00] CAP-005 — Verify accounts and access safely — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-004 recorded local defaults and open owner decisions.
- **Next action:** Inventory visible access without inspecting credential values.

### [2026-11-21T22:58:58+08:00] CAP-005 — Verify accounts and access safely — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added prerequisites, availability, configuration names, and safe credential handling to docs/SETUP.md.
- **Verification:** `git remote -v` listed no remote. Environment name-only inspection and ignored-file inventory showed no configured provider variables or local env files. Setup coverage and key-literal scan passed. Hosted access was not verified.
- **Evidence:** docs/SETUP.md § Account prerequisites.
- **Decisions:** Proceed with local planning. Hosted access and secrets are required when their verification steps are reached.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-006 — Create implementation risk checklist.

### [2026-11-21T22:59:03+08:00] CAP-005 — Verify accounts and access safely — COMMIT
- **Git commit:** f72851b

### [2026-11-21T22:59:27+08:00] CAP-006 — Create implementation risk checklist — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-005 recorded account availability and prerequisites.
- **Next action:** Document measurable safeguards and responsible roles.

### [2026-11-21T22:59:32+08:00] CAP-006 — Create implementation risk checklist — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added docs/SECURITY.md.
- **Verification:** UTF-8 checklist coverage check passed. Manually confirmed each row has an observable result, owner role, and numbered verification task.
- **Evidence:** Nine risk rows in docs/SECURITY.md.
- **Decisions:** Risk controls have documented acceptance checks. Runtime verification is scheduled in the referenced tasks.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-007 — Define environments and release policy.

### [2026-11-21T22:59:38+08:00] CAP-006 — Create implementation risk checklist — COMMIT
- **Git commit:** 9a05292

### [2026-11-21T23:00:01+08:00] CAP-007 — Define environments and release policy — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-006 established security verification criteria.
- **Next action:** Document credential boundaries, migration policy, and approval gates.

### [2026-11-21T23:00:05+08:00] CAP-007 — Define environments and release policy — COMPLETED
- **Agent/session:** Codex
- **Changes:** Documented environment isolation, migration and promotion policy, and free-beta billing gates in docs/ARCHITECTURE.md.
- **Verification:** Read the environment matrix and checked dev/staging/prod boundaries, target verification, secret isolation, approval policy, billing-off design, and six previous P0 checkboxes. All checks passed. No production resources or credentials are configured.
- **Evidence:** docs/ARCHITECTURE.md § Environments and release policy.
- **Decisions:** P0 gate passed for local work. Hosted verification and runtime enforcement remain scheduled in their numbered tasks.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-008 — Initialize Git and workspace.

### [2026-11-21T23:00:11+08:00] CAP-007 — Define environments and release policy — COMMIT
- **Git commit:** 3e0aa54

### [2026-11-21T23:01:09+08:00] CAP-008 — Initialize Git and workspace — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** P0 gate passed. Git is already initialized and has the verified P0 commits.
- **Next action:** Add the pinned pnpm workspace and verify a clean install.

### [2026-11-21T23:02:46+08:00] CAP-008 — Initialize Git and workspace — FAILED
- **Agent/session:** Codex
- **Verification:** Frozen pnpm 10.19.0 install and all five git check-ignore fixtures passed. Clean status assertion failed with `M pnpm-lock.yaml`; Git showed no content diff.
- **Next action:** Set LF explicitly for the lockfile and repeat the fresh-clone test.

### [2026-11-21T23:02:47+08:00] CAP-008 — Initialize Git and workspace — RESUMED
- **Agent/session:** Codex
- **Next action:** Make Git checkouts preserve the lockfile's LF line endings.

### [2026-11-21T23:03:13+08:00] CAP-008 — Initialize Git and workspace — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added pnpm-workspace.yaml, package.json, pnpm-lock.yaml, .nvmrc, .editorconfig, and a lockfile LF rule in .gitattributes. Kept the existing local history and ignore rules.
- **Verification:** A disposable Git clone of the candidate passed npx --yes pnpm@10.19.0 install --frozen-lockfile, git check-ignore for five synthetic local/secret fixtures, and clean git status --porcelain. Node v22.15.0 and working diff check passed.
- **Evidence:** CAP-008 FAILED and RESUMED events record the Windows checkout fix. Fresh-clone install and clean status both passed after the fix.
- **Decisions:** Pin pnpm 10.19.0 and the available Node 22.15.0 runtime. Public registry access worked with approved sandbox escalation.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-009 — Scaffold Next.js web app.

### [2026-11-21T23:03:18+08:00] CAP-008 — Initialize Git and workspace — COMMIT
- **Git commit:** 8a5ee2f

### [2026-11-21T23:03:33+08:00] CAP-009 — Scaffold Next.js web app — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-008 passed the frozen workspace install.
- **Next action:** Set up the web workspace and exercise each initial route.

### [2026-11-21T23:08:43+08:00] CAP-009 — Scaffold Next.js web app — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added the Next.js App Router workspace with TypeScript, Tailwind/PostCSS, landing page, sign-in placeholder, and dashboard route group that always requires sign-in until auth is implemented.
- **Verification:** Pinned pnpm install passed. pnpm --filter web dev served HTTP 200 for / and /sign-in and HTTP 307 to /sign-in for /dashboard. pnpm --filter web build compiled and type-checked successfully. Verified the build ID and clean generated-file boundary.
- **Evidence:** capture-web-dev.log (local ignored) and apps/web/.next/BUILD_ID. Final smoke test and production build passed with the committed config.
- **Decisions:** Used Next.js 16.4.6 and Tailwind CSS 4.3.5. Disabled framework-generated agent rules to keep the project playbook authoritative. Supabase sign-in remains assigned to CAP-023.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-010 — Scaffold MV3 Chrome extension.

### [2026-11-21T23:08:48+08:00] CAP-009 — Scaffold Next.js web app — COMMIT
- **Git commit:** a4078b5

### [2026-11-21T23:08:59+08:00] CAP-010 — Scaffold MV3 Chrome extension — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-009 web scaffold passed route and build checks.
- **Next action:** Create and load a minimal WXT extension.

### [2026-11-21T23:12:44+08:00] CAP-010 — Scaffold MV3 Chrome extension — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added the WXT TypeScript extension workspace, Chrome MV3 manifest configuration, popup, background entrypoint and four placeholder icons.
- **Verification:** pnpm --filter extension build passed. Node assertions checked manifest version 3, no requested permissions or content scripts, popup and worker assets, and four correct PNG sizes. A CDP smoke test loaded the unpacked build into Chrome/153.0.8010.12 (Playwright Chromium), identified the Capture worker via chrome.runtime.getManifest(), opened popup.html from the worker, and verified rendered text.
- **Evidence:** apps/extension/.output/chrome-mv3/manifest.json and Chrome runtime verification. Initial dependency install hit Windows EBUSY and passed on retry. Initial popup probe could select the wrong worker; the passing probe verified Capture's manifest identity before opening it.
- **Decisions:** The scaffold requests zero browser and host permissions. P5 introduces each permission with the feature that requires it.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-011 — Create shared schemas/types package.

### [2026-11-21T23:12:49+08:00] CAP-010 — Scaffold MV3 Chrome extension — COMMIT
- **Git commit:** b6d6d47

### [2026-11-21T23:13:00+08:00] CAP-011 — Create shared schemas/types package — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-010 verified the Chrome extension scaffold.
- **Next action:** Add portable schemas and type-check imports in both apps.

### [2026-11-21T23:15:49+08:00] CAP-011 — Create shared schemas/types package — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added @capture/shared with schemas and inferred types for capture, errors, articles, topics, processing states, and plans. Linked both workspaces and enabled Next.js transpilation of shared TS.
- **Verification:** Temporary imports and typed fixtures compiled with pnpm --filter web exec tsc --noEmit and pnpm --filter extension exec tsc --noEmit. Node --experimental-strip-types runtime assertions passed for valid capture, quota-limited response, and rejection of user_id, non-HTTP URLs, oversized text, and an invalid plan. Shared package has only Zod as a runtime dependency.
- **Evidence:** packages/shared/src/index.ts and both consumer type-check commands. Temporary probes were removed.
- **Decisions:** Expose plain TypeScript and browser-safe Zod only. Enforce server authorization and URL destination validation in later tasks.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-012 — Configure formatting and quality scripts.

### [2026-11-21T23:15:56+08:00] CAP-011 — Create shared schemas/types package — COMMIT
- **Git commit:** 71bc1f5

### [2026-11-21T23:16:10+08:00] CAP-012 — Configure formatting and quality scripts — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-011 verified both workspaces can compile the shared contracts.
- **Next action:** Add root lint, format, type-check, test baseline, and build commands.

### [2026-11-21T23:21:14+08:00] CAP-012 — Configure formatting and quality scripts — FAILED
- **Agent/session:** Codex
- **Verification:** pnpm format:check passed; pnpm lint exited 1 with import/no-anonymous-default-export warning in apps/web/postcss.config.mjs.
- **Next action:** Name the exported configuration and rerun all checks.

### [2026-11-21T23:21:17+08:00] CAP-012 — Configure formatting and quality scripts — RESUMED
- **Agent/session:** Codex
- **Next action:** Name the PostCSS config export and verify the quality scripts.

### [2026-11-21T23:22:42+08:00] CAP-012 — Configure formatting and quality scripts — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added root ESLint, Prettier, type-check, test, and build scripts and documented them in README.md. Set consistent LF checkout rules.
- **Verification:** Root pnpm format:check, pnpm lint, pnpm typecheck, pnpm test, and pnpm build all exited 0. Type checks covered web, extension, and shared code. Both builds passed. pnpm test is the documented no-suite baseline before CAP-013.
- **Evidence:** CAP-012 FAILED and RESUMED events record the warning fix. The final command sequence passed.
- **Decisions:** Kept ESLint 9 to match the explicit peer range of the Next.js React lint plugin. Prettier preserves the two canonical planning documents and generated lockfile.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-013 — Set up testing harness.

### [2026-11-21T23:22:48+08:00] CAP-012 — Configure formatting and quality scripts — COMMIT
- **Git commit:** 967b03b

### [2026-11-21T23:23:07+08:00] CAP-013 — Set up testing harness — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-012 verified root quality commands and both builds.
- **Next action:** Add and run unit, component, and browser smoke tests.

### [2026-11-21T23:27:58+08:00] CAP-013 — Set up testing harness — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added Vitest, jsdom, React Testing Library, Playwright, schema fixture, baseline tests, and local database test/reset guidance. Replaced the no-suite test script.
- **Verification:** CI=true pnpm test passed four tests across two files (three schema unit cases, one jsdom React Testing Library case). CI=true pnpm test:browser passed one Chromium smoke test using installed Chromium 153. pnpm typecheck passed, and ESLint/Prettier passed against the final file scope.
- **Evidence:** tests/unit/capture.test.ts, apps/web/tests/home.test.tsx, and tests/browser/sign-in.spec.ts. Browser test covered sign-in navigation and protected dashboard redirect.
- **Decisions:** Use synthetic fixtures and isolate the browser server. The documented database strategy is implemented with the database phase; this harness uses no hosted credentials.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-014 — Set up CI workflow.

### [2026-11-21T23:28:04+08:00] CAP-013 — Set up testing harness — COMMIT
- **Git commit:** 84f456d

### [2026-11-21T23:28:24+08:00] CAP-014 — Set up CI workflow — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-013 verified Vitest and Playwright suites.
- **Next action:** Add a GitHub Actions workflow and verify the check sequence in a clean checkout.

### [2026-11-21T23:36:48+08:00] CAP-014 — Set up CI workflow — FAILED
- **Agent/session:** Codex
- **Verification:** Clean Windows clone passed frozen install, format, lint, types, Vitest, Chromium and both builds. Injected Vitest failure exited 1 in disposable clone. Native act workflow reached pnpm/action-setup and exited 1: No pnpm version is specified despite a pinned root packageManager.
- **Next action:** Diagnose act's native workspace environment, then rerun the workflow.

### [2026-11-21T23:38:39+08:00] CAP-014 — Set up CI workflow — RESUMED
- **Agent/session:** Codex
- **Verification:** Native act workspace probe identified that --bind left the host executor empty. Removing --bind populated the manifest. The next attempt found the pin and then failed because the action invoked Node from a path containing spaces.
- **Next action:** Run setup-node first, use the runner temp directory for pnpm and cache its store, then retry the exact workflow.

### [2026-11-21T23:54:33+08:00] CAP-014 — Set up CI workflow — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added GitHub Actions CI for pull requests, main and CI verification branches, and manual dispatch. It reads runtime pins, uses read-only permissions, and configures the pnpm store cache.
- **Verification:** act 0.2.92 workflow_dispatch -P windows-2025=-self-hosted passed the actual workflow in a clean local Windows checkout, including frozen install, format, lint, types, four Vitest tests, browser installation, one Chromium test, and both builds. A separate fixture workflow failed at pnpm test with exit 1 on the named intentional assertion as expected. Workflow formatting passed.
- **Evidence:** Two native act runs using disposable checkouts and temporary caches. The negative log is capture-cap014-act-0.2.92/negative-act.log under the temporary directory. The normal job exited 0.
- **Decisions:** Used windows-2025 and cmd, with the locally executed workflow as acceptance evidence. Hosted execution is pending repository access. Native runner cache uploads warned because gzip was missing from its PATH. The main workflow steps passed.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-015 — Document local developer startup.

### [2026-11-21T23:54:41+08:00] CAP-014 — Set up CI workflow — COMMIT
- **Git commit:** f1fdfd9

### [2026-11-21T23:54:54+08:00] CAP-015 — Document local developer startup — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-014 verified the GitHub Actions workflow in a local runner.
- **Next action:** Document the current scaffold and phase-gated local services; verify the startup path.

### [2026-11-21T23:58:57+08:00] CAP-015 — Document local developer startup — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added .env.example and step-by-step README/SETUP startup and test guidance. Documented the Supabase and Inngest commands with their implementation phases.
- **Verification:** Followed documented startup in a fresh clone with an offline cached frozen install. The copied apps/web/.env.local was ignored, the template was trackable, pnpm dev served localhost:3000, the extension built to the documented folder, four Vitest tests and one Chromium test passed, and Prettier passed. P1 prerequisite check and env placeholder check passed after correcting the scalar PowerShell probe.
- **Evidence:** Disposable startup checkout and Playwright Chromium 156. Prior CAP-010 verified unpacked extension loading. Verified proposed Supabase and Inngest command syntax against their official documentation.
- **Decisions:** P1 gate passed using the verified CI workflow and scaffold. Runtime checks for Supabase and Inngest belong to CAP-016 and CAP-049.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-016 — Initialize Supabase and migrations.

### [2026-11-21T23:59:03+08:00] CAP-015 — Document local developer startup — COMMIT
- **Git commit:** a4e3c2c

### [2026-11-21T23:59:16+08:00] CAP-016 — Initialize Supabase and migrations — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** P1 gate passed with clean install, both builds, tests, local CI, and startup instructions.
- **Next action:** Initialize versioned local Supabase configuration and verify a disposable database reset.

### [2026-11-22T00:02:18+08:00] CAP-016 — Initialize Supabase and migrations — BLOCKED
- **Agent/session:** Codex
- **Context/dependencies:** P0 and P1 are complete. The local database starts the P2 dependency chain.
- **Changes:** Generated supabase/config.toml and supabase/.gitignore with Supabase CLI 3.2.0. Added a versioned public-schema permission migration and a local seed file, and aligned the local Auth origin with the README.
- **Verification:** `npx --offline --yes supabase@3.2.0 init --agent no` and `migration new capture_schema_boundary --agent no` passed. `npx --offline --yes supabase@3.2.0 start --agent no` exited 1 with `docker: command not found (podman also not found)`. `db reset --local` could not run. Python tomllib, migration naming/layout, and Git ignore checks passed.
- **Evidence:** supabase/migrations/20261121160117_capture_schema_boundary.sql and the local config. No Docker CLI, standard Docker executable, service, or configured endpoint was found. Official native artifacts exclude Windows x64.
- **Blockers/risks:** Provide a running local Docker or Podman engine. CAP-016 has no database runtime verification.
- **Git commit:** Task code remains in the working tree pending runtime verification. Last verified task commit: a4e3c2c.
- **Next action:** With the engine running, repeat `npx --yes supabase@3.2.0 start --agent no`, then `npx --yes supabase@3.2.0 db reset --local --agent no` against the disposable local project and inspect migration history and schema privileges.

### [2026-11-22T00:02:20+08:00] CAP-016 — Initialize Supabase and migrations — HANDOFF
- **Agent/session:** Codex
- **Context/dependencies:** 15 of 112 tasks verified. CAP-001 through CAP-015 each have a task commit. P2 begins at CAP-016.
- **Changes:** Four untracked Supabase task files remain as prepared local work. This handoff persists the verified CAP-015 commit addendum and the CAP-016 blocker.
- **Verification:** CAP-016 stopped at the local container-runtime dependency. The last completed CI workflow passed through both builds and the smoke test in act, and failed on the intentional test assertion in a separate run. Native cache upload warned about missing gzip.
- **Git commit:** a4e3c2c (CAP-015); handoff recorded in a separate docs commit.
- **Next action:** Resume CAP-016 once the engine is available. Leave its checkbox unchecked until clean replay passes.

### [2026-11-22T08:49:51+08:00] CAP-016 — Initialize Supabase and migrations — RESUMED
- **Agent/session:** Codex
- **Context/dependencies:** Owner supplied a new hosted development project in place of a local Windows container engine.
- **Verification:** Supabase CLI project listing confirmed capture-dev is active and running PostgreSQL 17. A read-only query against project gbkuuimhbuyzaaxbhvxb found zero public tables and no migration history.
- **Next action:** Dry-run the baseline migration, apply it to capture-dev, and verify history and privileges.

### [2026-11-22T08:51:17+08:00] CAP-016 — Initialize Supabase and migrations — COMPLETED
- **Agent/session:** Codex
- **Context/dependencies:** Owner supplied the dedicated hosted capture-dev project, ref gbkuuimhbuyzaaxbhvxb.
- **Changes:** Versioned the Supabase project config, seed entry point, and baseline permission migration. Documented the hosted setup alongside local development.
- **Verification:** Supabase CLI 3.2.0 read-only preflight found zero public tables and no migration history. `db push --remote=gbkuuimhbuyzaaxbhvxb --dry-run --skip-vault` listed only the baseline. The confirmed push applied migration 20261121160117. Read-only SQL confirmed the history row, denied CREATE on public to anon and authenticated, and retained anon USAGE. A second dry run reported the remote database up to date.
- **Decisions:** Used a fresh hosted development project to verify code-based replay. The CLI labels this project's main branch production; the target was verified by name and exact project ref as the owner's dedicated development project.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-017 — Create users and article tables.

### [2026-11-22T08:51:48+08:00] CAP-016 — Initialize Supabase and migrations — COMMIT
- **Git commit:** cdcd51a

### [2026-11-22T08:51:48+08:00] CAP-016 — Initialize Supabase and migrations — HANDOFF
- **Agent/session:** Codex
- **Verification:** Baseline migration and role permission checks passed against the fresh hosted development database. The hosted migration is current.
- **Next action:** Start CAP-017 from the current progress pointer.

### [2026-11-22T09:02:18+08:00] CAP-017 — Create users and article tables — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** CAP-016 baseline verified on dedicated hosted capture-dev.
- **Next action:** Version profile and article tables and run integrity tests on capture-dev.

### [2026-11-22T09:04:08+08:00] CAP-017 — Create users and article tables — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added auth-backed profiles, articles, content and personal notes with owner-scoped constraints and cascades.
- **Verification:** Hosted Supabase db push and db query --file supabase/tests/article_schema.sql exited 0. Assertions covered one capture per user, long URLs, duplicate rejection, cross-owner note rejection, and deletion cascades. All fixtures rolled back.
- **Decisions:** Use a generated SHA-256 canonical URL key to support long URLs. Enable RLS at table creation; client policies follow in CAP-021.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-018 — Create topic and relationship tables

### [2026-11-22T09:04:18+08:00] CAP-017 — Create users and article tables — COMMIT
- **Git commit:** 978477e

### [2026-11-22T09:04:50+08:00] CAP-018 — Create topic and relationship tables — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Add owner-scoped topic trees, article links, and concepts with database constraints.

### [2026-11-22T09:05:53+08:00] CAP-018 — Create topic and relationship tables — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added the topic tree, article-topic assignments, concepts, and article-concept relations with owner-aware foreign keys.
- **Verification:** Hosted Supabase migration and db query --file supabase/tests/topic_schema.sql passed. Assertions covered normalized sibling and root uniqueness, cycles, owner-scoped links, one primary topic, and delete cascades.
- **Decisions:** Serialize hierarchy checks per owner through a private RLS-protected revision row to prevent conflicting concurrent moves.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-019 — Create processing and usage tables

### [2026-11-22T09:06:03+08:00] CAP-018 — Create topic and relationship tables — COMMIT
- **Git commit:** 8d56fa9

### [2026-11-22T09:06:58+08:00] CAP-019 — Create processing and usage tables — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Add job idempotency, durable dispatch and quota accounting constraints.

### [2026-11-22T09:07:33+08:00] CAP-019 — Create processing and usage tables — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added processing jobs, outbox, usage periods and per-job reservations.
- **Verification:** Hosted migration and db query --file supabase/tests/processing_schema.sql passed. Assertions covered idempotency, outbox uniqueness, owner scope, atomic conditional reservation capacity, over-cap rejection and conversion to used quota. Fixtures rolled back.
- **Decisions:** This task verifies schema invariants in one test session. Multi-session contention belongs to CAP-078 and CAP-095.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-020 — Create billing tables

### [2026-11-22T09:07:43+08:00] CAP-019 — Create processing and usage tables — COMMIT
- **Git commit:** 2753fb9

### [2026-11-22T09:08:06+08:00] CAP-020 — Create billing tables — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Add private subscription and verified-event persistence without enabling billing.

### [2026-11-22T09:08:48+08:00] CAP-020 — Create billing tables — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added subscription state and billing-event deduplication with RLS enabled.
- **Verification:** Hosted migration and db query --file supabase/tests/billing_schema.sql passed with billing disabled. The fixture verified Free defaults, rejection of Pro without billing identifiers, and duplicate event rejection.
- **Decisions:** Keep Stripe credentials, checkout and event handling outside this schema task.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-021 — Enable and test RLS everywhere

### [2026-11-22T09:08:59+08:00] CAP-020 — Create billing tables — COMMIT
- **Git commit:** edacafa

### [2026-11-22T09:09:44+08:00] CAP-021 — Enable and test RLS everywhere — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Assign least-privilege authenticated access and verify two tenant identities and the anonymous role.

### [2026-11-22T09:10:26+08:00] CAP-021 — Enable and test RLS everywhere — FAILED
- **Agent/session:** Codex
- **Verification:** Migration applied. The first negative fixture hit an existing note's unique constraint (23505) before reaching the intended foreign-key check.
- **Next action:** Use a foreign article with no note for the reference checks and rerun.

### [2026-11-22T09:11:01+08:00] CAP-021 — Enable and test RLS everywhere — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added authenticated owner-scoped reads and restricted profile and note writes. Kept billing, dispatch and processing writes service-side.
- **Verification:** Hosted migration and db query --file supabase/tests/data_access.sql passed after correcting the FK fixture. Two authenticated roles verified own reads, note create/edit, and foreign read/edit/delete/reference denial. Anonymous reads and direct billing and article-status writes were denied.
- **Decisions:** Use service-side capture and topic mutations to support transactional quotas and hierarchy rules. RLS remains enabled on each app table.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-022 — Implement Supabase client/server adapters

### [2026-11-22T09:11:10+08:00] CAP-021 — Enable and test RLS everywhere — COMMIT
- **Git commit:** f9b43b2

### [2026-11-22T09:11:35+08:00] CAP-022 — Implement Supabase client/server adapters — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Add typed adapters and session refresh, then verify a real authenticated request and browser build.

### [2026-11-22T09:17:05+08:00] CAP-022 — Implement Supabase client/server adapters — FAILED
- **Agent/session:** Codex
- **Verification:** Production build and browser asset scan passed. The test identity setup failed with HTTP 401 because CLI output used a masked secret key.
- **Next action:** Retry with the CLI’s authorized secret-key retrieval captured only into the test process environment.

### [2026-11-22T09:19:38+08:00] CAP-022 — Implement Supabase client/server adapters — COMPLETED
- **Agent/session:** Codex
- **Changes:** Added typed browser, cookie-based server and privileged Supabase clients, generated public schema types and Next.js Proxy refresh.
- **Verification:** Hosted Auth smoke passed: a temporary real identity signed in, Next.js returned HTTP 401 without a session and 200 with the correct user after sign-in, and cleanup deleted the identity. The production browser probe included the publishable key and no privileged key or env reference. Final format, lint, four Vitest tests and both builds passed without the probe.
- **Decisions:** Scoped Proxy to app auth/dashboard/API routes. Prefer getUser for server-verified identity and mark privileged code server-only. Test keys stayed in process memory.
- **Git commit:** Pending commit addendum.
- **Next action:** CAP-023 — Implement sign-up/sign-in/sign-out

### [2026-11-22T09:19:46+08:00] CAP-022 — Implement Supabase client/server adapters — COMMIT
- **Git commit:** 1ab6e29

### [2026-11-22T09:19:58+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — STARTED
- **Agent/session:** Codex
- **Context/dependencies:** Previous task verified and committed. Use the dedicated capture-dev project.
- **Next action:** Implement email/password forms, email confirmation, dashboard sign-in and sign-out.

### [2026-11-22T09:25:09+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Changes:** Implemented email/password sign-up and sign-in forms, PKCE confirmation route, dashboard session gate, and current-session sign-out. Added hosted redirect setup notes.
- **Verification:** pnpm lint, typecheck, test (4 passed), build (web and extension), Prettier, and git diff --check passed. Chromium against capture-dev passed server-side sign-up validation, missing confirmation code handling, invalid credentials, sign-in, protected dashboard access, sign-out, signed-out denial and repeat sign-in. Initial alert locator matched Next.js route announcer; scoped to app content and reran successfully. Disposable confirmed Auth users were removed.
- **Blockers/risks:** Full new-account sign-up requires a real confirmation email. The default hosted sender is limited to organization member addresses. Requested the approved test recipient. Successful signup and confirmation are pending.
- **Git commit:** CAP-023 files remain in the working tree. CAP-022 was last verified at 1ab6e29.
- **Next action:** Complete the hosted signup and confirmation test before checking off CAP-023.

### [2026-11-22T09:25:13+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — HANDOFF
- **Agent/session:** Codex
- **Context/dependencies:** CAP-017 through CAP-022 individually verified and committed. Hosted capture-dev contains the applied schema. 22/112 tasks complete.
- **Changes:** Uncommitted CAP-023 app routes and setup documentation are preserved in the working tree.
- **Next action:** Use authorized hosted signup email test evidence to finish CAP-023.

### [2026-11-22T09:44:52+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — RESUMED
- **Agent/session:** Codex
- **Context/dependencies:** The owner supplied a test recipient. The dev database preflight found no existing account at that address.
- **Next action:** Submit one signup through Capture and verify email confirmation in the same browser session.

### [2026-11-22T09:56:27+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Verification:** Playwright submitted a single signup through Capture for the authorized recipient. Capture reached the confirmation notice. A read-only query found one newly registered account with no confirmation timestamp. No confirmation callback reached the app during the 10-minute Chromium wait, and the run timed out and stopped the test server. Prettier and git diff --check passed.
- **Blockers/risks:** Connected Gmail was for a different inbox and no matching forwarded confirmation was found. The confirmation session has closed. The unconfirmed development test account was left in place.
- **Git commit:** Task remains unchecked. Auth implementation is saved in the existing checkpoint; this handoff records the actual test result.
- **Next action:** Arrange a reachable test inbox and an authorized confirmation attempt in a fresh browser session.

### [2026-11-22T10:04:10+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Verification:** User reported Safari could not connect to the localhost callback. Read-only Supabase query verified one account and one confirmed email. This proves provider confirmation. The original test browser had closed and the end-to-end callback session remains unverified. Vitest passed all four tests and Prettier passed.
- **Changes:** Clarified the signup notice and local setup instructions to keep Capture running and confirm from the same browser on the same device.
- **Next action:** Verify a fresh authorized signup with a reachable callback and the original browser session before marking the task complete.

### [2026-11-22T10:09:02+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Changes:** Expired or used links now redirect to Capture sign-in with recovery guidance. Added a browser regression and documented using the same reachable IPv4 origin for development callbacks.
- **Verification:** Live IPv4 Capture returned HTTP 200 while IPv6 localhost returned 404. IPv4 expired callback redirected with HTTP 303. Both Chromium cases passed against the existing IPv4 server using a temporary Playwright config. Prettier and diff checks passed. The original link returned otp_expired after provider confirmation.
- **Next action:** Use the reachable origin with a fresh authorized signup and verify successful code exchange in the signup browser.

### [2026-11-22T10:27:22+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Changes:** Added password reset request and authenticated password form, and routed verified recovery exchanges to the password form. Configured local Capture with the hosted development publishable key in an ignored environment file.
- **Verification:** Supabase confirmed the email and recorded the authorized reset request from the user's Chrome session on the localhost IPv4 origin. Type checking, formatting, lint, four Vitest tests, and three live Chromium cases passed. Signed-out access to the password update page redirects to reset request. Password entry is with the user.
- **Next action:** Finish the user-driven recovery and separately verify a successful new-account confirmation callback before marking CAP-023 complete.

### [2026-11-22T10:51:41+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Changes:** Set the hosted development site URL to the working IPv4 origin and allowlisted the signup and recovery callbacks. Added a dedicated recovery callback and guidance for expired links. Kept Supabase’s default email templates after the hosted service rejected custom templates on the current plan.
- **Verification:** The hosted config comparison reported zero updates for the two scoped settings. Disposable admin-generated signup and recovery links verified both hosted redirects. Chromium exercised sign-in, protected pages, sign-out, password change, rejection of the old password, and acceptance of the new one. Supabase rejected reuse of the recovery link and the disposable account was removed. TypeScript, ESLint, Prettier, seven Vitest tests, and four browser regression cases passed. Supabase also recorded the owner’s fresh reset request from Chrome on Windows.
- **Blockers/risks:** Admin-generated links do not exercise the browser code exchange used by real signup emails. The owner needs to open the fresh reset email in the requesting Chrome profile and enter the new password.
- **Next action:** Complete signup from an actual confirmation email and verify the browser code exchange and repeat sign-in before checking off CAP-023.

### [2026-11-22T11:08:05+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Findings:** Hosted Auth logged a mismatched PKCE verifier at 10:51 AM Singapore time and throttled later recovery requests. Capture had presented a generic email notice for throttled requests.
- **Changes:** Enabled Supabase’s flow IDs and selected the verifier matching the callback. Clarified the reset notice without exposing whether an email address has an account. The hosted Site URL already matches the Capture origin.
- **Verification:** The installed Supabase SDK selected the later signup’s verifier without a flow ID and selected the original recovery verifier with the ID. Eight Vitest tests, four Chromium cases, TypeScript, ESLint, Prettier, and the diff check passed.
- **Next action:** Retest with an actual reset email after the limit clears, then verify fresh mailbox signup and repeat sign-in before checking off CAP-023.

### [2026-11-22T11:09:19+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — VERIFIED CHECKPOINT
- **Agent/session:** Codex
- **Verification:** Hosted Supabase preserved `sb_flow_id` on both admin-generated redirects with the existing Site URL. The disposable account was deleted. No email was sent in this check.
- **Git commit:** The tested fix is in `9a16861`.
- **Next action:** Resume actual email delivery and callback verification when the hosted mail limit clears. CAP-023 remains unchecked.

### [2026-11-22T12:10:23+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — VERIFIED CHECKPOINT
- **Agent/session:** Codex
- **Findings:** The hosted recovery request and redirect succeeded, but the user’s callback still failed to finish signing in. The hosted project rejected the code-template update with the default-provider entitlement error.
- **Changes:** Added a verification form for signup and password recovery. It verifies one-time codes or copied Supabase email links without depending on the browser cookie that initiated the request. Kept the hosted templates as they were and documented optional code templates.
- **Verification:** Disposable hosted credentials confirmed signup in a clean Chromium context and reset a password by pasting a provider link in another context. The new password worked, the old password and reused link were rejected, and the account was deleted. TypeScript, ESLint, Prettier, ten Vitest tests, and five Chromium tests passed. Supabase accepted one fresh reset request for the owner.
- **Next action:** The owner needs to verify their new reset email and enter the new password. Verify a fresh signup from actual email delivery before checking off CAP-023.

### [2026-11-22T13:13:31+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — VERIFIED CHECKPOINT
- **Agent/session:** Codex
- **Verification:** The owner configured another Gmail SMTP sender and reported receiving the reset email and opening the Capture password form directly from the link. Supabase recorded HTTP 200 for the recovery request at 1:10:29 PM, the browser code exchange at 1:10:56 PM, and the account update at 1:11:12 PM Singapore time. The account's sign-in and update timestamps matched the last two events.
- **Next action:** Recovery is verified with real delivery. Keep CAP-023 unchecked until actual fresh signup email confirmation and the remaining sign-in acceptance checks pass.

### [2026-11-22T13:20:39+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — VERIFIED CHECKPOINT
- **Agent/session:** Codex
- **Changes:** Removed the separate recovery verification link from the normal reset email notice. The notice directs users to their inbox, and the callback error offers the code or copied-link fallback.
- **Verification:** Six Chromium tests passed, including the normal reset email notice with no extra link and recovery fallback access after an expired link. TypeScript passed.
- **Next action:** Keep CAP-023 unchecked while the actual fresh signup email acceptance check is pending.

### [2026-11-22T13:24:55+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — RESUMED
- **Agent/session:** Codex
- **Context/dependencies:** Live password recovery was verified after the owner changed the SMTP sender. The owner approved one new signup test using a Gmail alias that delivers to their existing inbox.
- **Next action:** Submit through Capture and verify the real email callback in the same test browser, then exercise repeat sign-in, protected navigation, and sign-out.

### [2026-11-22T13:34:12+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — BLOCKED
- **Agent/session:** Codex
- **Verification:** The live signup form created the approved test account and displayed its confirmation notice. The matching confirmation arrived in Gmail. Windows browser automation could open the message but could not control the isolated Chrome for Testing window. The browser timed out after eight minutes, and the hosted account remained unconfirmed. Ten Vitest tests, TypeScript, and ESLint passed.
- **Next action:** Repeat the actual confirmation in a normal Chrome profile that can access both Capture and Gmail. Verify repeat sign-in and sign-out before checking off CAP-023.

### [2026-11-22T13:52:05+08:00] CAP-023 — Implement sign-up/sign-in/sign-out — DEFERRED
- **Agent/session:** Codex
- **Decision:** The owner explicitly asked to skip fresh signup verification and continue with the existing confirmed development account. The CAP-023 checkbox remains open. Live recovery and signup email delivery are already verified.
- **Next action:** Proceed to CAP-024.

### [2026-11-22T13:52:05+08:00] CAP-024 — Protect dashboard/API boundaries — STARTED
- **Agent/session:** Codex
- **Next action:** Verify a server-side dashboard guard and an independently authenticated API response, including refresh, revocation, and logout.

### [2026-11-22T13:57:24+08:00] CAP-024 — Protect dashboard/API boundaries — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added private, non-cacheable `GET /api/me`. The dashboard and API both validate the current Supabase user, and the API scopes its profile and plan lookups to that user.
- **Verification:** The owner’s existing signed-in Chrome profile received the expected account and plan. A disposable hosted test verified anonymous HTTP 401, stale access-cookie refresh and rotation, dashboard access, sign-out, and HTTP 401 plus dashboard redirect when replaying the revoked cookie. Seven Chromium cases, ten unit tests, TypeScript, and ESLint passed.
- **Next action:** CAP-025 — Generate typed database access.

### [2026-11-22T13:58:09+08:00] CAP-025 — Generate typed database access — STARTED
- **Agent/session:** Codex
- **Next action:** Match TypeScript database types to the hosted migration set and move account lookup into an authenticated owner-scoped helper.

### [2026-11-22T14:02:07+08:00] CAP-025 — Generate typed database access — COMPLETE
- **Agent/session:** Codex
- **Changes:** Moved profile and plan reads into a typed server helper that requires a verified session and scopes both queries to its owner.
- **Verification:** All six hosted migrations matched the repository. The Supabase CLI regenerated public schema types identical to the checked-in file after formatting. Two disposable hosted accounts with distinct names and plans each received only their own data. Direct database cross-owner reads returned no rows, and the signed-out API returned HTTP 401. Lint, TypeScript, and ten unit tests passed.
- **Decision:** The P2 gate passes with the owner-approved CAP-023 fresh-signup deferral. CAP-023 remains unchecked.
- **Next action:** CAP-026 — Specify capture and article API contracts.

### [2026-11-22T14:03:17+08:00] CAP-026 — Specify capture and article API contracts — STARTED
- **Agent/session:** Codex
- **Next action:** Extend the shared capture and article schemas and test the examples in the API documentation.

### [2026-11-22T14:06:17+08:00] CAP-026 — Specify capture and article API contracts — COMPLETE
- **Agent/session:** Codex
- **Changes:** Reused shared capture and error schemas. Added validated article IDs, pagination, filter and sort options, and list and detail response schemas. Added request and response examples to `docs/API.md`.
- **Verification:** Thirteen Vitest tests passed. The contract tests validated every documented JSON example and rejected malformed values. Shared and test TypeScript checks and ESLint passed.
- **Next action:** CAP-027 — Implement safe URL validation and canonicalization.

### [2026-11-22T14:06:57+08:00] CAP-027 — Implement safe URL validation and canonicalization — STARTED
- **Agent/session:** Codex
- **Next action:** Validate HTTP(S) capture targets and preserve query and fragment values that distinguish article content.

### [2026-11-22T14:08:41+08:00] CAP-027 — Implement safe URL validation and canonicalization — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added shared validation and canonicalization for absolute HTTP(S) URLs. Canonical URLs drop known tracking keys and section anchors while retaining content query values, encoding, and hash routes.
- **Verification:** Twenty-six Vitest tests passed, including redirect targets, tracking keys, distinct queries, hash routes, international hostnames, malformed URLs, credentials, and length limits. Shared and test TypeScript checks and lint passed.
- **Next action:** CAP-028 — Implement POST /api/captures.

### [2026-11-22T14:09:31+08:00] CAP-028 — Implement POST /api/captures — STARTED
- **Agent/session:** Codex
- **Next action:** Save a capture and its request ID in one database transaction after authenticating and validating the request.

### [2026-11-22T14:14:26+08:00] CAP-028 — Implement POST /api/captures — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added the authenticated cookie and bearer capture endpoint and transactional save function in `20261122060931_save_capture.sql`. The database derives ownership from a live session. The transaction stores the article, optional text and note, and request ID without AI processing.
- **Verification:** Reviewed the hosted migration dry-run, applied only that migration, and regenerated schema types. A disposable hosted account saved full and URL-only captures and read back the expected records. Anonymous and invalid requests were rejected. A retry returned the original ID and reuse for another URL returned HTTP 409. Eight Chromium cases, 26 Vitest tests, TypeScript, and ESLint passed.
- **Next action:** CAP-029 — Make deduplication atomic.

### [2026-11-22T14:15:10+08:00] CAP-029 — Make deduplication atomic — STARTED
- **Agent/session:** Codex
- **Next action:** Stress the transaction with concurrent shared request IDs and canonical URL variants.

### [2026-11-22T14:17:20+08:00] CAP-029 — Make deduplication atomic — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added a reproducible integration test for concurrent retries and distinct request IDs that share a canonical URL. The save transaction uses the existing owner and canonical URL uniqueness constraint, stores each request ID once, and returns the existing article for duplicates.
- **Verification:** The hosted test passed twice. Ten concurrent requests produced one article and nine duplicates sharing its ID. Six distinct request keys were bound to that article. The second owner received a separate article for the same URL and request ID. No usage events were recorded, and both disposable accounts were cleaned up. ESLint and Prettier passed.
- **Next action:** CAP-030 — Implement article list and detail APIs.

### [2026-11-22T14:25:47+08:00] CAP-030 — Implement article list and detail APIs — STARTED
- **Agent/session:** Codex
- **Next action:** Add authenticated article list and detail routes. Verify stable pagination and isolation with two hosted test accounts.

### [2026-11-22T14:30:52+08:00] CAP-030 — Implement article list and detail APIs — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added private `GET /api/articles` and `GET /api/articles/:id` routes with cookie and bearer authentication. Lists support status, domain, title search, and stable cursor sorting. Detail returns the owner's personal note and topics along with safe article fields.
- **Verification:** The hosted two-user integration test passed for signed-out rejection, owner lists, cross-owner detail HTTP 404, cookie and bearer reads, note and topic isolation, filters, invalid inputs, and both sort directions with tied timestamps. The hosted deduplication regression, 26 Vitest tests, web and shared TypeScript checks, ESLint, and Prettier passed.
- **Next action:** CAP-031 — Implement edits, archive, and delete.

### [2026-11-22T14:34:31+08:00] CAP-031 — Implement edits, archive, and delete — STARTED
- **Agent/session:** Codex
- **Next action:** Add authenticated, transactional article updates and explicit permanent deletion, then verify the lifecycle and cascading cleanup.

### [2026-11-22T14:39:38+08:00] CAP-031 — Implement edits, archive, and delete — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added owner-scoped article edit, archive, restore, and confirmed deletion APIs. Active article lists exclude archived items by default. Applied the additive `20261122063431_edit_and_delete_articles.sql` migration to capture-dev and regenerated database types.
- **Verification:** The hosted lifecycle test used two disposable accounts and exercised create, title and note updates, note removal, archive, restore, required deletion confirmation, cross-owner denial, and cleanup of related text, notes, topic assignments, and request IDs. The hosted deduplication regression, 27 Vitest tests, TypeScript, ESLint, and Prettier passed.
- **Next action:** CAP-032 — Implement manual URL capture path.

### [2026-11-22T14:43:37+08:00] CAP-032 — Implement manual URL capture path — STARTED
- **Agent/session:** Codex
- **Next action:** Add the dashboard URL form and use the existing durable save transaction for link-only captures. CAP-052 owns server fetching and its network safeguards.

### [2026-11-22T14:48:00+08:00] CAP-032 — Implement manual URL capture path — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added a dashboard URL form with save, duplicate, and validation feedback. The dashboard and capture API share the durable save helper. Manual capture validates public domain syntax and saves the link without fetching the site. CAP-052 owns server fetching and its SSRF and timeout protections.
- **Verification:** A disposable hosted Chromium session saved a URL on an unavailable port, verified persisted source and canonical URLs with no extracted content, rejected an IP and reserved local domain, reported a duplicate, and saved distinct links consecutively. Signed-out access was denied. Both hosted regressions, 37 Vitest tests, eight Chromium auth tests, TypeScript, ESLint, and Prettier passed.
- **Next action:** CAP-033 — Add rate limiting and request budgets.

### [2026-11-22T14:55:42+08:00] CAP-033 — Add rate limiting and request budgets — STARTED
- **Agent/session:** Codex
- **Next action:** Bound JSON and extracted-text sizes, then enforce a per-account save budget in the database transaction shared by the API and dashboard.

### [2026-11-22T15:01:48+08:00] CAP-033 — Add rate limiting and request budgets — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added streamed 128 KiB JSON limits, URL and extracted-text UTF-8 byte limits, and safe rejection codes. The reviewed `20261122065542_limit_capture_requests.sql` migration enforces 20 saves per account per minute across the API, dashboard, and direct RPC. Oversized payloads return HTTP 413, and rate-limited API calls return HTTP 429 with Retry-After.
- **Verification:** Hosted integration tests rejected oversized fixed-length and chunked payloads, unsupported content types and encodings, and excess concurrent saves. The test verified another account retained its own budget, expired windows reopened, direct RPC remained limited, and no usage was charged. Chromium verified the dashboard warning and an allowed retry. The hosted article lifecycle test, 41 Vitest tests, TypeScript, and ESLint passed.
- **Decision:** All eight P3 tasks are verified. Move to P4.
- **Next action:** CAP-034 — Implement authenticated dashboard shell.

### [2026-11-22T15:05:28+08:00] CAP-034 — Implement authenticated dashboard shell — STARTED
- **Agent/session:** Codex
- **Next action:** Add authenticated navigation, top search, account controls, loading and empty states, then verify desktop and narrow-screen routes.

### [2026-11-22T15:10:51+08:00] CAP-034 — Implement authenticated dashboard shell — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added protected Overview and All captures navigation, top title search, an account menu, keyboard skip navigation, a loading skeleton, and empty and no-result states. The All captures route reads the signed-in user's article titles and source links.
- **Verification:** A disposable hosted account exercised desktop and mobile routes in Chromium at 1440px, 390px, and 320px without horizontal overflow. Long titles wrapped, keyboard skip and active navigation worked, search showed matching saved articles, the save form persisted a new link, and signing out blocked library access. Reviewed desktop and mobile screenshots. Eight Chromium auth tests, 41 Vitest tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-035 — Build overview and empty-state onboarding.

### [2026-11-22T15:13:56+08:00] CAP-035 — Build overview and empty-state onboarding — STARTED
- **Agent/session:** Codex
- **Next action:** Show recent captures and status totals from the signed-in account, and guide empty accounts to their first save.

### [2026-11-22T15:16:46+08:00] CAP-035 — Build overview and empty-state onboarding — COMPLETE
- **Agent/session:** Codex
- **Changes:** Overview shows up to five recent active captures, their source links and statuses, and exact counts for Saved, In progress, Ready, and Needs attention. Empty accounts receive first-capture guidance based on real data. Missing count data is shown as unavailable.
- **Verification:** A disposable hosted Chromium account started empty, saved its first link, and immediately displayed it and the updated count. Populated fixtures verified all status groups, chronological ordering, archive and cross-account isolation, 320px rendering, and View all navigation. Eight Chromium auth tests, 41 Vitest tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-036 — Build All Captures library.

### [2026-11-22T15:22:50+08:00] CAP-036 — Build All Captures library — STARTED
- **Agent/session:** Codex
- **Next action:** Add library filters and capture metadata, then verify pagination and save-to-library updates against the hosted backend.

### [2026-11-22T15:25:44+08:00] CAP-036 — Build All Captures library — COMPLETE
- **Agent/session:** Codex
- **Changes:** All captures displays source domains, UTC capture times, and processing badges. Status, source domain, collection, sorting, and title search are retained across cursor pages. Empty results have distinct messages, and reset clears the active filters.
- **Verification:** Disposable accounts on the hosted backend verified capture metadata, filtered pagination across 21 matching results, empty filters and reset, archived results and account isolation, 320px layout, and immediate visibility of a new manual save in the library and API. Eight Chromium auth tests, 41 Vitest tests, ESLint, and TypeScript passed.
- **Next action:** CAP-037 — Build manual URL-save form.

### [2026-11-22T15:29:17+08:00] CAP-037 — Build manual URL-save form — STARTED
- **Agent/session:** Codex
- **Next action:** Link the manual save confirmation to the persisted capture and verify validation, duplicates, and immediate library visibility.

### [2026-11-22T15:33:55+08:00] CAP-037 — Build manual URL-save form — COMPLETE
- **Agent/session:** Codex
- **Changes:** The save and duplicate confirmations link to the persisted capture. The initial detail page shows the title, source, and processing status for the owner. Invalid IDs and other accounts' captures show the same unavailable view.
- **Verification:** Hosted Chromium with disposable accounts verified invalid and non-public URLs, immediate manual-save visibility in the library and API while processing status was Saved, the original source link, canonical duplicate handling, and signed-out and cross-account access. Eight Chromium auth tests, 41 Vitest tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-038 — Build article detail baseline.

### [2026-11-22T15:38:56+08:00] CAP-038 — Build article detail baseline — STARTED
- **Agent/session:** Codex
- **Next action:** Add source metadata, personal notes, archive and delete controls, and the no-analysis view. Verify the full owner flow on the hosted backend.

### [2026-11-22T15:43:26+08:00] CAP-038 — Build article detail baseline — COMPLETE
- **Agent/session:** Codex
- **Changes:** Capture titles open the detail page, which shows the original URL, source, capture time, optional author and publication date, processing status, and the AI notes fallback. Owners can create, edit, or clear a personal note, archive or restore a capture, and permanently delete it after confirmation. The API and dashboard use the same owner-scoped mutations.
- **Verification:** Hosted Chromium with disposable accounts verified source navigation, metadata and empty AI notes, multiline note persistence across reloads, note clearing, archive and restore, deletion blocked until confirmed, and permanent deletion. A second account could neither view nor mutate the capture. The detail page fit at 320px with a long source URL. Eight Chromium auth tests, 41 Vitest tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-039 — Add responsive UI and accessibility baseline.

### [2026-11-22T15:45:51+08:00] CAP-039 — Add responsive UI and accessibility baseline — STARTED
- **Agent/session:** Codex
- **Next action:** Audit the key screens with automated accessibility scans and a manual keyboard pass, then correct and retest any issues.

### [2026-11-22T16:01:44+08:00] CAP-039 — Add responsive UI and accessibility baseline — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added consistent visible focus outlines and moved focus to the new heading after dashboard navigation and filter changes. The Account disclosure closes on Escape and when focus leaves it. Pending forms announce submission while their submit button is disabled.
- **Verification:** Manual keyboard tab-through in Chrome covered sign-in, the dashboard skip link and save form, library filters and capture links, and the detail note and management controls. Axe reported zero violations across four screens at 320px and 1440px with no horizontal overflow. Production-build Chromium verified client navigation and filter focus, skip link, Account dismissal and focus return, and the pending live announcement. Eight browser auth tests, 41 unit tests, build, lint, TypeScript, and formatting passed.
- **Environment:** The existing port 3000 dev server failed its hot-reload WebSocket handshake and used full-page navigation. Client-side acceptance passed on the local production build connected to the hosted development backend.
- **Next action:** P4 gate passed with all six tasks verified. Begin CAP-040 — Implement extension connection/auth contract.

### [2026-11-22T16:06:11+08:00] CAP-040 — Implement extension connection/auth contract — STARTED
- **Agent/session:** Codex
- **Next action:** Select the provider-backed extension handoff and review the credential, redirect, storage, and revocation boundaries.

### [2026-11-22T16:10:29+08:00] CAP-040 — Implement extension connection/auth contract — COMPLETE
- **Agent/session:** Codex
- **Changes:** Selected Supabase OAuth 2.1 authorization code with PKCE for the Chrome extension. Documented the exact registered callback, consent and token exchange, trusted extension storage and messaging, API and database boundaries, refresh, and web grant revocation.
- **Verification:** Reviewed each handoff against the Chrome Identity and storage contracts, Supabase OAuth and session documentation, and the current Capture manifest, routes, and database permissions. The review confirmed that durable credentials and the verifier stay outside URLs and that authentication uses no page-to-extension message bridge. The installed SDK exposes the required OAuth methods. The PKCE known-vector, configuration and document checks, formatting, and Git diff checks passed.
- **Environment:** Public OAuth discovery on the linked hosted development project returned 404. No hosted settings changed. Runtime connection, refresh, and revocation remain CAP-041 acceptance.
- **Next action:** CAP-041 — Connect extension to signed-in user.

### [2026-11-22T16:11:57+08:00] CAP-041 — Connect extension to signed-in user — STARTED
- **Agent/session:** Codex
- **Next action:** Implement the OAuth consent, extension session, API authorization, and revocation paths before enabling a hosted test client.

### [2026-11-22T20:03:41+08:00] CAP-041 — Connect extension to signed-in user — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added Chrome Connect Capture and Disconnect, web consent and grant revocation, and trusted extension session storage with refresh. Limited extension credentials to the account and capture APIs and their owner-scoped database operations. Applied the migration on capture-dev and registered its exact public Chrome callback using the local public build identifiers.
- **Verification:** The built extension opened the real Chrome OAuth consent window, exchanged its code with capture-dev, and returned the disposable account's correct identity from the API. It submitted a fixture capture and refreshed its session. Direct article access was denied. Disconnect cleared extension storage, and web revocation rejected the old access token for account and capture requests and the old refresh token at Supabase. The separate web session stayed authenticated. Eight Chromium auth tests, two hosted API regression suites, 47 unit tests, web and extension builds, ESLint, TypeScript, formatting, and the bundle scan passed.
- **Next action:** CAP-042 — Read active tab metadata only on click.

### [2026-11-22T20:12:40+08:00] CAP-042 — Read active tab metadata only on click — STARTED
- **Agent/session:** Codex
- **Next action:** Add a popup Capture action with temporary active-tab permission and verify click-only collection and restricted-page handling in Chrome.

### [2026-11-22T20:18:56+08:00] CAP-042 — Read active tab metadata only on click — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added a connected popup action that queries only the active, current-window tab when clicked. It previews the URL, title, and domain using temporary `activeTab` permission and shows a clear message for restricted or unavailable pages. The metadata stays in the popup.
- **Verification:** Chromium with an isolated synthetic account state exercised the real toolbar action on a fixture outside the configured hosts. The extension had no tab URL or title before invocation. The popup opened with an empty preview, queried once after Capture was clicked, and showed the correct fields. Access ended on cross-origin navigation, and `chrome://version/` showed the restricted-page message. The manifest contains no broad tab, history, or all-site access. The test observed no metadata in storage or network requests. The extension build, 47 unit tests, ESLint, TypeScript, and formatting passed.
- **Next action:** CAP-043 — Extract readable page content.

### [2026-11-22T20:28:15+08:00] CAP-043 — Extract readable page content — STARTED
- **Agent/session:** Codex
- **Next action:** Add on-demand extraction from a bounded, inert tab snapshot and verify real article and URL-only fallback behavior.

### [2026-11-22T20:36:59+08:00] CAP-043 — Extract readable page content — COMPLETE
- **Agent/session:** Codex
- **Changes:** Capture page runs a bounded snapshot function in the active tab's isolated top frame and parses the result with Mozilla Readability. The popup shows a plain-text excerpt and available author, with a link-only preview for non-articles or extraction failures. The extension and API share the UTF-8 text limit.
- **Verification:** Chromium exercised the built extension using published NASA news, Chrome blog, MDN documentation and a public non-article page replayed with external assets blocked. A synthetic fixture verified script, event handler, hidden text, form, navigation, and iframe exclusions before parsing, along with plain-text rendering and author preservation. Visible modal, restricted-page, non-article, and forced script-failure states passed, and the extraction issued no content request. The web and extension builds, 50 unit tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-044 — Build minimal popup UX.

### [2026-11-22T21:04:16+08:00] CAP-044 — Build minimal popup UX — STARTED
- **Agent/session:** Codex
- **Next action:** Implement and test the popup preview, optional note, save form, and user-facing status transitions. Leave authenticated submission to CAP-045.

### [2026-11-22T21:09:53+08:00] CAP-044 — Build minimal popup UX — COMPLETE
- **Agent/session:** Codex
- **Changes:** Added keyboard focus from Capture to the page preview, a collapsible personal note field, the Save control and accessible feedback for pending, successful, duplicate, queued, quota-limited, unsupported, and retryable outcomes. The current build explains Save availability and keeps the control disabled until CAP-045 supplies authenticated submission.
- **Verification:** Chromium exercised the built popup with Tab, Enter, and Shift+Tab, confirmed focus after capture, entered a note, and verified that the UI made no capture request. The fixture preview appeared in 49 ms. Unit tests used simulated save responses with the production form controller, verified that status messages reflect the result and that failed saves preserve the note. The extension build, 57 unit tests, ESLint, TypeScript, and Prettier passed.
- **Next action:** CAP-045 — Send idempotent capture requests.

### [2026-11-22T21:19:24+08:00] CAP-045 — Send idempotent capture requests — STARTED
- **Agent/session:** Codex
- **Next action:** Connect the popup form to the worker, retain request IDs across retries, and verify a hosted save whose first response is lost.

### [2026-11-22T21:33:09+08:00] CAP-045 — Send idempotent capture requests — COMPLETE
- **Agent/session:** Codex
- **Changes:** Save to Capture sends an authenticated request through the worker and shows a link formed from the configured web origin and the returned article ID. The worker coalesces matching saves, reuses a stored request ID for recent matching drafts in the Chrome session, and bounds each POST. Retry metadata contains fingerprints and IDs only.
- **Verification:** Chromium used a disposable account with real hosted OAuth and a real capture request. Rapid resubmission produced one POST. The test dropped the response after a confirmed 201, closed and reopened the popup, and forced a 401 before the retry reached the API. Refresh and retry kept the same request ID, and Supabase contained one article, one personal note, and one request record. The popup showed the stored article link. A stalled POST reached its timeout and restored Save with the note available. The extension build, 57 unit tests, ESLint, TypeScript, Prettier, and bundle checks passed.
- **Next action:** CAP-046 — Deep-link to captured article.

### [2026-11-22T21:52:31+08:00] CAP-046 — Deep-link to captured article — STARTED

- **Plan:** Add Open library, constrain saved article destinations to the configured web origin and a validated article ID, and verify new tabs and account isolation in Chrome.

### [2026-11-22T21:55:34+08:00] CAP-046 — Deep-link to captured article — COMPLETE

- **Changes:** Added Open library to the extension popup and restricted saved article links to the configured origin and validated IDs returned by Capture. Both links open in a new tab.
- **Verification:** Chromium with hosted Supabase clicked both popup links and confirmed that the owner could see the saved article and note. Missing captures and captures opened under a second account showed the same recovery screen. Signed-out visitors landed at sign-in. The Chrome build, all 59 tests, lint, TypeScript, formatting, and diff checks passed.
- **Next action:** CAP-047 — Test extension across browser edge cases.

### [2026-11-22T23:48:39+08:00] CAP-047 — Test extension across browser edge cases — STARTED

- **Plan:** Exercise the built extension in headed Chromium using controlled page, network, and session fixtures. Record browser version, fixtures, and measured outcomes.

### [2026-11-22T23:50:55+08:00] CAP-047 — Test extension across browser edge cases — COMPLETE

- **Verification:** Ran the popup in headed Chromium 156.0.8078.4 on Windows with the MV3 build from `8009db2`, the local web app, and a disposable account on hosted Supabase. HTTPS fixtures were served through Playwright at `https://popup.example.test/cap047/<run-id>/`. Each save below was initiated through the popup.

| Case | URL or fixture | Result | Observed evidence |
|---|---|---|---|
| Dynamic article | `/dynamic`. A page script inserts the article after 150 ms. | Pass | Popup preview included the inserted article. The API returned HTTP 201 with 2,880 extracted bytes. |
| Article with images | `/images`. Article includes a loaded SVG and a caption. | Pass | Popup preview included article text. The API returned HTTP 201 with 2,902 extracted bytes, and the image alt-text marker was absent from the submitted text. |
| Heavy scripts | `/scripts`. A roughly 680 KiB script runs one million loop iterations and sets a DOM marker. | Pass | The script completed and the popup preview included the article. HTTP 201 with 2,886 extracted bytes. Script and hidden-text markers were absent from the submission. |
| Unsupported Chrome page | `chrome://version/` | Pass | Popup directed the user to a regular website, kept the save form hidden, and sent no capture request. |
| Offline capture API | `/offline`. Simulated a network failure before the worker could send the capture POST. | Pass | Popup showed retry feedback, preserved the note, and re-enabled Save. Restoring the API and retrying reused the same request ID and created exactly one hosted article with the note. |
| Expired access session | `/expired`. Set the extension session's stored expiry to the past with its valid refresh token. | Pass | Hosted refresh restored the session. Save returned HTTP 201. |
| Expired session with rejected refresh | `/expired`. Set stored expiry to the past and supplied an invalid refresh token in the disposable profile. | Pass | No capture POST was sent. The extension cleared the stale session and offered Connect Capture when the popup reopened. |
| Large content | `/large`. Over 200,000 bytes of article content including multibyte Unicode. | Pass | HTTP 201 with exactly 100,000 extracted UTF-8 bytes and no replacement characters. |
| Link-only fallback | `/link`. Short page with insufficient article text. | Pass | Popup explained the link-only fallback. HTTP 201 with zero extracted bytes. |

- **Outcome:** All nine checks passed. The test removed its disposable account. No application code changes were needed.
- **Next action:** CAP-048 — Audit extension build and permissions.

### [2026-11-22T23:52:28+08:00] CAP-048 — Audit extension build and permissions — STARTED

- **Plan:** Review the built manifest, CSP, credential boundaries, and public development ID. Verify the bundle and repeat the Chrome runtime checks before closing P5.

### [2026-11-23T00:02:59+08:00] CAP-048 — Audit extension build and permissions — COMPLETE

- **Changes:** The packaged MV3 CSP allows packaged scripts, blocks embedded objects and base URL overrides, and permits connections only to the configured Capture and Supabase Auth origins. The build accepts only an RSA SPKI public key for the stable unpacked ID. Development registration steps are in [Extension authentication](EXTENSION_AUTH.md).
- **Manifest and bundle:** Ran the WXT Chrome MV3 build and inspected its nine output files. Verified four permissions for OAuth (`identity`), local sessions (`storage`), and explicit page capture (`activeTab`, `scripting`). Host access was limited to the configured hosts. There were no declared content scripts, public extension resources, or external messaging configuration. The local scan checked configured secret values, credential variable names, known AI, Stripe, Supabase and private-key formats, and legacy JWTs with the `service_role` claim. It found no matches. The public key produced the configured unpacked ID. A separate unconfigured build had no host permissions and blocked all connections. A synthetic private-key input was rejected without being printed.
- **Chromium runtime:** Chromium 156.0.8078.4 on Windows with hosted Supabase completed OAuth, saved an article, and opened the library. Chrome enforced the connection policy on an unrelated host. The captured `GET /api/me` sent no Origin header, and `POST /api/captures` sent the Chrome extension origin. Neither sent a Cookie header. Both API routes allowed their configured method and extension origin in preflight, rejected an unrelated origin and wrong method, and omitted credentialed CORS. An unauthenticated account request returned 401. An unrelated page had no extension messaging or storage access. Disposable accounts were removed.
- **Other checks:** All 59 tests passed, along with extension TypeScript, lint, formatting, and diff checks.
- **P5 gate:** Passed. All nine extension tasks are verified. Fresh signup remains deferred under CAP-023.
- **Next action:** CAP-049 — Select and configure durable background jobs.

### [2026-11-23T00:05:10+08:00] CAP-049 — Select and configure durable background jobs — STARTED

- **Plan:** Register Inngest in the web app, configure local and hosted worker settings, and verify a development job completes after the event acknowledgement and an intentional retry.

### [2026-11-23T00:22:29+08:00] CAP-049 — Select and configure durable background jobs — COMPLETE

- **Changes:** Pinned Inngest SDK 4.26.2 and compatible OpenTelemetry dependencies. Registered the Node.js `/api/inngest` handler with a 60-second request limit. The development smoke job allows one concurrent step and one retry, with a 30-second start limit and a one-minute finish limit. Documented local startup and hosted deployment and credentials in [Setup](SETUP.md).
- **Verification:** Inngest Dev Server 1.53.0 acknowledged event `01M820V4RD2JRB63F4FV8C7CNS` with HTTP 200. The run was unfinished at acknowledgement. Run `01M820V4RS5CFS6H053CHPFFY4` recorded one failed attempt and one successful retry, then completed 35.9 seconds after acknowledgement with `{"status":"completed","attempt":1}`. The provider registered the configured retry, concurrency, and timeout limits.
- **Production verification:** A local production Next.js build stayed in cloud mode even with `INNGEST_DEV=1`, registered no development smoke function, rejected unsigned GET and POST requests with HTTP 401, and accepted a signed inspection with a synthetic key. Frozen lockfile validation, all 59 tests, web TypeScript, lint, formatting, and diff checks passed.
- **Environment:** No hosted Inngest deployment was made. Hosted sync requires the target environment's real credentials and a deployed hosted function.
- **Next action:** CAP-050 — Build transactional job dispatch.

### [2026-11-23T09:24:27+08:00] CAP-050 — Build transactional job dispatch — STARTED

- **Plan:** Reserve Free quota and write jobs and outbox rows in the save transaction. Dispatch leased outbox rows through Inngest and verify recovery from lost acknowledgements and a provider outage.

### [2026-11-23T09:35:30+08:00] CAP-050 — Build transactional job dispatch — COMPLETE

- **Changes:** New eligible captures atomically save the article, reserve one unit in a 20-article UTC calendar month, and create one job and outbox row. Duplicates reuse the saved status. Chrome captures without readable text and captures at the quota limit still retain the link. Deleting an article releases any unused reservation.
- **Dispatch:** A hosted minute-by-minute Inngest trigger claims due rows with expiring leases and sends fixed event IDs derived from job IDs. Provider failures back off without losing the queued work. A late acknowledgement cannot finalize an expired and reclaimed lease. Local development can dispatch a specific job without draining a shared project.
- **Verification:** Applied `20261123092427_transactional_capture_dispatch.sql` to the connected development project after its dry run. With Inngest Dev Server 1.53.0 and a simulated HTTP 503, a capture returned HTTP 201 and retained one queued job, one reservation, and one pending outbox row. After backoff, two recovery triggers produced one provider event. A separate fixture dropped the first acknowledgement after successful provider delivery. The retry reused its event ID and one subscriber run completed.
- **Regression checks:** Hosted fixtures verified UTC period boundaries, one winner for the last quota slot, unsupported links, role restrictions, expired lease fencing, deletion release, and concurrent capture deduplication without consuming quota. The processing schema test and all 59 unit tests passed, along with web TypeScript, lint, formatting, and diff checks. Disposable accounts were removed.
- **Environment:** Hosted Inngest sync remains pending. The processing consumer and status transitions are part of CAP-051.
- **Next action:** CAP-051 — Implement status state machine.

### [2026-11-23T09:47:06+08:00] CAP-051 — Implement status state machine — STARTED

- **Plan:** Add database-guarded processing transitions and verify that the existing owner-scoped article API exposes status without worker metadata.

### [2026-11-23T09:50:23+08:00] CAP-051 — Implement status state machine — COMPLETE

- **Changes:** Added service-only transition RPCs that bind a processing job to one execution. Terminal outcomes are applied with the reservation change in one transaction. The existing owner-scoped article API supplies status for clients.
- **Verification:** Applied the migration to capture-dev. A rollback-only SQL fixture passed invalid transition, stale generation, replay, quota accounting, and failure retention checks. Two disposable accounts verified the API reads queued, processing, and failed states for the owner, preserves the personal note, omits worker metadata, and returns 404 to other accounts. All 59 unit tests, web TypeScript, formatting, and diff checks passed.
- **Next action:** CAP-052 — Implement source preparation/chunking.

### [2026-11-23T09:50:43+08:00] CAP-052 — Implement source preparation/chunking — STARTED

- **Plan:** Prefer provided text and implement public-only, DNS-pinned source retrieval with bounded redirects, transfer size, and elapsed time.

### [2026-11-23T09:54:50+08:00] CAP-052 — Implement source preparation/chunking — COMPLETE

- **Changes:** Source preparation uses supplied text before making any network request. URL-only fetches accept public domain names on the default HTTP(S) ports, reject restricted DNS answers on every hop, and pin the connection to an approved IP. Connections send no credentials, allow three redirects, and enforce 12 seconds and 512 KiB. HTML is parsed without running scripts. Access-restricted, oversized, and unsupported sources return a safe outcome.
- **Verification:** Controlled network fixtures exercised direct localhost and metadata addresses, mixed public/private DNS answers, redirect rebinding, redirect limits, oversized declared and streaming bodies, restricted and unsupported responses, and DNS and request timeouts. All 87 tests, web and test TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-053 — Clean and segment source text.

### [2026-11-23T09:55:40+08:00] CAP-053 — Clean and segment source text — STARTED

- **Plan:** Normalize source text and headings, enforce a conservative input budget, and persist evidence with stable IDs and verifiable byte offsets.

### [2026-11-23T09:59:32+08:00] CAP-053 — Clean and segment source text — COMPLETE

- **Changes:** Normalized whitespace and removed common standalone navigation labels. Retained HTML headings and split normalized text into chunks bounded to 1,800 UTF-8 bytes each and 12,000 evidence bytes total. Chunk IDs derive from the source hash and position. Stored byte ranges refer to the full normalized source.
- **Verification:** Applied the evidence migration to capture-dev. The rollback-only SQL fixture rejected altered evidence and a stale execution ID, then verified idempotent evidence persistence and the matching source hash. Multibyte fixtures verified the input bounds and round-tripped each chunk through its byte range. All 89 tests, web and test TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-054 — Define AI structured-note schema.

### [2026-11-23T10:00:09+08:00] CAP-054 — Define AI structured-note schema — STARTED

- **Plan:** Define the strict model output and stored note schemas, and verify versioned storage separate from personal notes.

### [2026-11-23T10:02:19+08:00] CAP-054 — Define AI structured-note schema — COMPLETE

- **Changes:** Added bounded Zod schemas for language, summary, takeaways, evidenced sections and concepts, tags, and suggested topic paths. A stored note adds server-assigned model and version metadata. The AI note table holds that version separately from personal notes and restricts client writes.
- **Verification:** Applied the additive migration to capture-dev. Hosted SQL verified the stored version and model, rejected invalid metadata, and preserved the personal note. Fixtures rejected malformed, missing, oversized and unexpected fields. All 99 tests, shared/web/test TypeScript, lint and diff checks passed.
- **Next action:** CAP-055 — Design grounded prompts and injection defenses.

### [2026-11-23T10:02:55+08:00] CAP-055 — Design grounded prompts and injection defenses — STARTED

- **Plan:** Put evidence in a separate user message, disable tools, and verify that malformed or echoed policy content is rejected.

### [2026-11-23T10:04:54+08:00] CAP-055 — Design grounded prompts and injection defenses — COMPLETE

- **Changes:** Fixed grounding rules in the system message and supplied only the evidence IDs and article text as serialized user data. Disabled tool access, enforced a serialized prompt budget, and rejected output with unexpected fields or verbatim policy lines.
- **Verification:** Adversarial fixtures supplied forged role markers and command requests and verified that they stayed data. Fixtures confirmed no tools or private note fields in requests and rejected attempted tool invocations and prompt echoes in responses. All 102 tests, TypeScript, lint, formatting, and diff checks passed. Live provider verification belongs to CAP-056.
- **Next action:** CAP-056 — Integrate real AI provider server-side.

### [2026-11-23T10:05:41+08:00] CAP-056 — Integrate real AI provider server-side — STARTED

- **Plan:** Implement bounded structured Responses API requests and measure usage on three public articles once a development API key is available.

### [2026-11-23T10:08:14+08:00] CAP-056 — Integrate real AI provider server-side — AWAITING LIVE VERIFICATION

- **Progress:** Implemented the server-side Responses API client with a fixed provider destination, disabled tools and storage, bounded input and output, timeout, transient retries, structured validation, and usage reporting. GPT-6.1 Terra is the default. Added a three-article acceptance check.
- **Verification so far:** Mocked provider tests and regressions passed. The three live cases are gated because no development API key is configured. No model requests were made, and the task remains unchecked and uncommitted.
- **Next action:** Configure the development key and run the three live checks before continuing to CAP-057.

### [2026-11-23T10:23:11+08:00] CAP-056 — Integrate real AI provider server-side — COMPLETE

- **Changes:** Integrated bounded server-only Responses calls with structured validation, transient retries, no tools and no response storage. The configured project could authenticate but the originally selected Terra model was unavailable. Selected GPT-5.6 Luna from the project's listed models.
- **Verification:** All three public articles returned validated notes with existing evidence IDs in two successful runs. The second run enabled the console reporter because the first suppressed usage output. The defaults and live command are documented in [Setup](SETUP.md). All 108 local tests, web TypeScript, formatting, and diff checks passed.

| Article | Input tokens | Output tokens | Estimated USD |
|---|---:|---:|---:|
| Robots Exclusion Protocol | 3,742 | 1,273 | 0.002276 |
| Normal distribution | 1,298 | 1,181 | 0.001677 |
| What is a black hole? | 1,573 | 967 | 0.001475 |
| Measured total | 6,613 | 3,421 | 0.005428 |

- **Cost basis:** Standard uncached GPT-5.6 Luna token rates. The total covers the three measured successful responses. [Pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- **Next action:** CAP-057 — Validate and persist AI results.

### [2026-11-23T10:23:45+08:00] CAP-057 — Validate and persist AI results — STARTED

- **Plan:** Validate output schema and evidence before writing, publish notes and finalize quota together, and verify owner reads and replay.

### [2026-11-23T10:28:51+08:00] CAP-057 — Validate and persist AI results — COMPLETE

- **Changes:** Registered the real capture worker with Inngest. The worker prepares evidence, validates structured output and references, and publishes one note in the same transaction that marks the article ready and consumes its reservation. The owner-scoped article API returns the note separately from the personal note.
- **Verification:** Applied the migration to capture-dev. The rollback-only SQL fixture rejected stale execution and unknown evidence, preserved quota on rejected writes, and accepted replay without changing the original note or consuming additional quota. The local Inngest worker with controlled model responses published one verified note across duplicate dispatch and HTTP refresh, marked a bad citation failed, kept both personal notes, and denied access to a second account. All 108 local tests, web TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-058 — Implement retry and terminal failure policy.

### [2026-11-23T10:30:14+08:00] CAP-058 — Implement retry and terminal failure policy — STARTED

- **Plan:** Bound automatic source and provider retries and add an owner-scoped retry for failed analysis with a new reservation only when work is queued.

### [2026-11-23T10:33:37+08:00] CAP-058 — Implement retry and terminal failure policy — COMPLETE

- **Changes:** Classified timeouts, rate limits, provider outages, malformed model output, and unsupported sources. Added bounded source and provider backoff and a library retry action with at most two user retries. Retry queues and reserves atomically without charging failed work.
- **Verification:** Applied the migration to capture-dev after dry run. Local Inngest with injected failures verified three source attempts, immediate unsupported status, terminal provider failure with quota released, owner-only concurrent retry, one replacement reservation, personal-note retention, and the retry cap. All 113 local tests, web TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-059 — Implement job idempotency and recovery.

### [2026-11-23T10:34:30+08:00] CAP-059 — Implement job idempotency and recovery — STARTED

- **Plan:** Reconcile stale jobs with durable dispatch generations, fence abandoned workers, and verify duplicate delivery and crash recovery.

### [2026-11-23T10:38:07+08:00] CAP-059 — Implement job idempotency and recovery — COMPLETE

- **Changes:** Dispatch generations separate legitimate recovery from duplicate delivery. Recovery requeues abandoned jobs while retaining their reservation and fences stale executions. A further abandonment after three generations dead-letters the outbox record, marks the capture failed, and releases quota. Operators can reconcile a specific stale job through the service-only RPC.
- **Verification:** Applied the migration to capture-dev. Rollback-only SQL simulated a crashed worker, rejected obsolete deliveries and late writes, verified quota and note counts on replay, and verified dead-lettering. A real local Inngest fixture recovered an acknowledged but abandoned delivery through two overlapping dispatch triggers and published one note at generation 2 with one quota unit. All 113 local tests, web TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-060 — Surface processing updates in web UI.

### [2026-11-23T10:38:50+08:00] CAP-060 — Surface processing updates in web UI — STARTED

- **Plan:** Poll authorized article status while work is pending, show updated outcomes and notes, and verify the page updates without reloading.

### [2026-11-23T10:46:44+08:00] CAP-060 — Surface processing updates in web UI — COMPLETE

- **Changes:** The open capture detail polls the owner-scoped endpoint for pending status, refreshes the existing view when it changes, and displays explanations and validated notes. The personal-note editor retains its draft during a status update.
- **Verification:** Chromium on Windows with hosted Supabase, local Inngest, and a controlled model response observed Saved, Queued, Processing, and Ready. Notes appeared without document reload, and an unsaved personal-note edit remained in the editor. All 113 local tests, web TypeScript, lint, formatting, and diff checks passed.
- **Next action:** CAP-061 — Run full capture-to-notes vertical slice.

### [2026-11-23T10:47:05+08:00] CAP-061 — Run full capture-to-notes vertical slice — STARTED

- **Plan:** Save a public article in Chromium, dispatch its real job, and verify grounded notes appear without reload. Record latency, evidence, and provider token usage.

### [2026-11-23T10:49:28+08:00] CAP-061 — Run full capture-to-notes vertical slice — COMPLETE

- **Demo:** In Chromium 156.0.8078.4 on Windows, a disposable user saved [NIST's Normal Distribution article](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm) through the dashboard form. Capture saved it on hosted Supabase and created a durable job. A targeted local Inngest trigger ran public-source retrieval, evidence preparation, GPT-5.6 Luna, and transactional note publication. Notes appeared in the existing browser document.
- **Timing:** The save acknowledgement appeared in 1.92 seconds. Notes were visible 15.79 seconds after dispatch and 31.69 seconds after clicking Save, including opening the detail page in the development build.
- **Quality and cost:** The note identified the normal distribution and its statistical characteristics, included five takeaways and five sections, and cited IDs from the three stored evidence chunks. The owner API returned the same ready note. Exactly one quota unit was used and no reservation remained. The successful response used 1,298 input tokens and 997 output tokens, estimated at USD 0.001456 at the standard uncached rate. [Pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- **P6 gate:** Passed. All 13 tasks are verified. Hosted Inngest sync remains pending for deployment.
- **Next action:** CAP-062 — Define hierarchy rules and topic API.

### [2026-11-23T14:35:56+08:00] Local queue follow-up — VERIFIED

- **Changes:** Configured loopback development workers and added an optional account-scoped local schedule. Increased the model request timeout while bounding total retry time.
- **Verification:** The connected development database confirmed the reported article was Ready with one stored note and a successful dispatched job. Local Inngest registered the minute schedule. Hosted SQL verified account isolation and deferred work handling. All 113 local tests, web TypeScript, formatting, and diff checks passed.
- **Next action:** CAP-062 — Define hierarchy rules and topic API.

### [2026-11-23T14:36:56+08:00] CAP-062 — Define hierarchy rules and topic API — STARTED

- **Plan:** Add owner-scoped tree retrieval and topic mutations. Verify sibling uniqueness, maximum depth, cycle rejection, and cross-account isolation.

### [2026-11-23T14:41:23+08:00] CAP-062 — Define hierarchy rules and topic API — COMPLETE

- **Changes:** Added authenticated tree reads and create, rename, move, and leaf-delete operations. Root and child names are unique within their parent. The database enforces a four-level depth limit on whole subtrees and rejects cycles. Deleting a leaf unlinks its articles and keeps the articles in the library.
- **Verification:** Applied the migration to capture-dev. The two-account HTTP fixture retrieved both complete trees and verified owner isolation, duplicate names, depth overflow, invalid cross-account moves, self and descendant cycles, opposing concurrent moves, and article retention after leaf deletion. All 113 local tests, shared and web TypeScript, ESLint, formatting, and diff checks passed.
- **Next action:** CAP-063 — Implement topic normalization and matching.

### [2026-11-23T14:42:19+08:00] CAP-063 — Implement topic normalization and matching — STARTED

- **Plan:** Match owner-scoped siblings by exact labels, normalized labels, and explicit aliases. Verify related paths reuse the same existing branch.

### [2026-11-23T14:43:54+08:00] CAP-063 — Implement topic normalization and matching — COMPLETE

- **Changes:** Added sibling matching that prefers exact names, then normalized labels, then known aliases. It stays within the owner's current parent and returns the existing prefix when a path stops matching. Normalization preserves distinguishing characters such as the plus signs in C++.
- **Verification:** Applied the migration to capture-dev. Rollback-only SQL verified two related article suggestions resolved to the same branch through Unicode, case, spacing, and alias variations. It also verified exact-name precedence, parent and account isolation, and service-only access. Web TypeScript, formatting, and diff checks passed.
- **Next action:** CAP-064 — Resolve AI-suggested topic paths.

### [2026-11-23T14:44:37+08:00] CAP-064 — Resolve AI-suggested topic paths — STARTED

- **Plan:** Resolve bounded topic suggestions in one account-scoped transaction. Reject foreign candidate IDs and create or reuse Unsorted when no usable path exists.

### [2026-11-23T14:46:16+08:00] CAP-064 — Resolve AI-suggested topic paths — COMPLETE

- **Changes:** Added a service-only resolver that matches existing paths, creates a missing branch transactionally, and falls back to the owner's Unsorted topic for missing or unusable suggestions. Candidate IDs must belong to the owner.
- **Verification:** Applied the migration to capture-dev. Rollback-only SQL verified alias reuse across related article paths, a stable account-specific fallback, foreground user creation with no empty topics, correct local candidates, foreign candidate rejection, and service-only access. Web TypeScript, formatting, and diff checks passed.
- **Next action:** CAP-065 — Attach primary and secondary topics.

### [2026-11-23T14:46:58+08:00] CAP-065 — Attach primary and secondary topics — STARTED

- **Plan:** Assign topics in the note publication transaction. Verify one primary, deduplicated secondary links, account isolation, and replay protection.

### [2026-11-23T14:50:36+08:00] CAP-065 — Attach primary and secondary topics — COMPLETE

- **Changes:** Published primary and secondary article topic assignments in the same transaction as validated AI notes. Preserved manual assignments and left AI confidence unset while suggestions carry no confidence score.
- **Verification:** Applied the migration to capture-dev. Rollback-only publication and recovery SQL verified one primary, deduplicated secondary paths, account isolation, preserved manual links, rollback on invalid evidence, and safe replay. Vitest passed 113 tests with three opt-in tests skipped. The diff check passed.
- **Next action:** CAP-066 — Build dynamic sidebar navigation.

### [2026-11-23T14:51:00+08:00] CAP-066 — Build dynamic sidebar navigation — STARTED

- **Plan:** Show owner-scoped topics and active article counts in the sidebar, remember expanded branches, and verify newly published topics appear without a page reload.

### [2026-11-23T15:03:15+08:00] CAP-066 — Build dynamic sidebar navigation — COMPLETE

- **Changes:** Added expandable topic branches, direct active article counts, loading and empty states, and account-specific expansion settings. Topic links filter the existing captures view.
- **Verification:** Applied the count migration to capture-dev. Chromium on the production build verified that the real publication transaction with a fixture note made its topic appear without a document reload. Keyboard expansion and navigation, filtered API shape, exclusion of unrelated captures, persistence across reload, and count updates after archiving passed. The development server repeatedly reloaded during initial browser runs, so the complete check used the production build. Two-account HTTP coverage, the production build and web type check, lint, formatting, and 113 automated tests passed. Three opt-in tests were skipped in the Vitest run.
- **Next action:** CAP-067 — Build Knowledge Tree view.

### [2026-11-23T15:25:02+08:00] CAP-067 — Build Knowledge Tree view — STARTED

- **Plan:** Add a dashboard tree with expandable nested topics, bounded article previews, and keyboard navigation to articles and topic results.

### [2026-11-23T15:29:03+08:00] CAP-067 — Build Knowledge Tree view — COMPLETE

- **Changes:** Added a Knowledge Tree dashboard view with nested disclosures, article links, bounded previews, and access to each topic's capture results. Groups start with 12 topics, and expanded article lists preview eight active captures.
- **Verification:** Chromium on the production build used the keyboard to open a four-level topic, collapse and reopen it, and reach its article detail. It also verified focus after showing more topics, that closed branches do not fetch previews, that previews stay bounded, and the destination for the full topic capture list. Production build and TypeScript, lint, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped.
- **Next action:** CAP-068 — Build topic detail pages.

### [2026-11-23T15:30:16+08:00] CAP-068 — Build topic detail pages — STARTED

- **Plan:** Add owner-scoped topic pages with descriptions, subtopics, membership labels, and concepts from the displayed captures. Verify the page follows changes to article memberships.

### [2026-11-23T15:35:05+08:00] CAP-068 — Build topic detail pages — COMPLETE

- **Changes:** Linked sidebar and Knowledge Tree topics to an owner-scoped detail route. The route shows the description, immediate subtopics, direct active captures with primary or secondary membership, and up to 12 deduplicated concepts from the current page of notes.
- **Verification:** Chromium on the production build verified navigation, a 20-capture page plus the remaining captures, membership labels, concept deduplication, and a foreign topic returning the not-found view. An article title edit and a fixture membership move were reflected in both topics, including the concept labels. Production build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped.
- **Next action:** CAP-069 — Implement manual topic corrections.

### [2026-11-23T16:15:12+08:00] CAP-069 — Implement manual topic corrections — STARTED

- **Plan:** Add capture reassignment and topic edit controls. Verify account isolation, refresh and reprocessing persistence, and continued automatic placement for other articles.

### [2026-11-23T16:20:04+08:00] CAP-069 — Implement manual topic corrections — COMPLETE

- **Changes:** Added capture reassignment and topic rename and move controls. Manual primary placement replaces the previous primary and preserves secondary links. Reprocessing refreshes notes and retains assignments once a primary topic has been chosen manually.
- **Verification:** Chromium used disposable accounts to move an AI-assigned capture, rename and move its new topic with a descendant, and reload the capture. A second valid publication kept the manual topic without restoring its previous automatic placement. An unrelated capture still received its automatic topic. Cross-account, anonymous, and missing target checks passed. Applied the hosted migration, passed rollback-only publication and worker recovery SQL, and verified the production build, lint, formatting, and 113 Vitest tests. Three opt-in tests were skipped.
- **Next action:** CAP-070 — Add safe topic merge or documented alternative.

### [2026-11-23T16:20:25+08:00] CAP-070 — Add safe topic merge or documented alternative — STARTED

- **Plan:** Defer bulk merge as allowed by the product spec. Document the rename, move, and individual capture reassignment workflow and verify it against the dashboard.

### [2026-11-23T16:21:29+08:00] CAP-070 — Add safe topic merge or documented alternative — COMPLETE

- **Decision:** Bulk topic merge is deferred as allowed by product spec F10. The README documents moving and renaming branches and consolidating primary captures individually.
- **Verification:** Chromium verified the documented controls with a disposable account. Renaming, moving under a parent, and moving back to the top level retained the descendant. Capture reassignment retained the capture and its notes, and invalid descendant placement was rejected. README formatting and the diff check passed.
- **Next action:** CAP-071 — Implement basic related-article suggestions.

### [2026-11-23T16:22:16+08:00] CAP-071 — Implement basic related-article suggestions — STARTED

- **Plan:** Rank a bounded set of same-account captures by shared topic, concept, and tag signals. Verify ranking, isolation, and performance on a larger fixture library.

### [2026-11-23T16:28:28+08:00] CAP-071 — Implement basic related-article suggestions — COMPLETE

- **Changes:** Added up to six active related captures to article detail pages. The query considers up to 100 direct topic candidates and 200 recent captures with notes, and ranks shared topics, concepts, and tags within the account.
- **Verification:** Hosted rollback-only SQL with 2,500 unrelated captures verified topic, concept, and tag ranking, archived and foreign exclusion, and a query under 750 ms. The initial plan exceeded that target by recalculating scores per row, so the final query computes them once. Chromium verified link order and navigation, archive exclusion, and the empty state. Production build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped.
- **Next action:** CAP-072 — Test evolving tree with a research corpus.

### [2026-11-23T17:25:51+08:00] CAP-072 — Test evolving tree with a research corpus — STARTED

- **Plan:** Capture public pages in a disposable account and run their jobs through local Inngest and the configured note provider. Verify duplicate capture handling, tree stability, browser navigation, and manual topic corrections. Record the source list and taxonomy observations.

### [2026-11-23T17:33:17+08:00] CAP-072 — Test evolving tree with a research corpus — COMPLETE

- **Corpus** — PostgreSQL's [index introduction](https://www.postgresql.org/docs/current/indexes-intro.html) and [index types](https://www.postgresql.org/docs/current/indexes-types.html), Paul Graham's [early growth essay](https://www.paulgraham.com/ds.html) and [startup ideas essay](https://www.paulgraham.com/startupideas.html), NASA's [Apollo 11 overview](https://www.nasa.gov/history/apollo-11-mission-overview/) and [Apollo 8 history](https://www.nasa.gov/mission/apollo-8/), and the Computer History Museum's [1976 timeline](https://www.computerhistory.org/timeline/1976/).
- **Verification** — All seven URL captures reached Ready through local Inngest and the configured model, with saved notes and one primary topic each. The tree used 17 topics with no duplicate sibling names or cycles and stayed within four levels. Both PostgreSQL pages reused Databases / PostgreSQL / Indexes. Recapturing the introduction with a tracking parameter returned the same capture and enqueued no extra job.
- **Browser check** — Chromium opened a real timeline capture from the nested tree using the keyboard, reassigned it, confirmed the choice survived reload, and found the capture on the destination topic page. The first browser run's final locator matched both a topic and a related article named Apollo 8. A repeat URL run hit source timeouts for PostgreSQL, so the completed two-page browser follow-up targeted the exact topic link and supplied extracted text from the public pages while keeping Inngest and note generation live. All disposable accounts were removed.
- **Taxonomy observations** — Both entrepreneurship pages began under Business but divided between Startups and Entrepreneurship / Startups. Apollo pages split between Space / Human Spaceflight / Apollo Program and Humans In Space / Apollo Program / Apollo 8. The timeline received the narrower CP/M topic on direct extraction and the broader Computer history label when the follow-up supplied extracted text. These are examples to use when improving cross-branch reuse and reviewing how much of a long source reaches analysis.
- **P7 gate** — Passed with all 11 tasks verified. Resume at CAP-073 in P8.

### [2026-11-23T17:51:30+08:00] CAP-073 — Add keyword search query/indexes — STARTED

- **Plan:** Index capture titles, summaries and concepts, personal notes, and topic names. Verify owner-scoped results, filter composition, cursor pagination, and measured search latency.

### [2026-11-23T17:55:40+08:00] CAP-073 — Add keyword search query/indexes — COMPLETE

- **Changes** — Added indexed, owner-scoped keyword search over titles, AI summaries and concept names, personal notes, and topic names. The search endpoint and library query share validation, filters, and stable cursor sorting.
- **Verification** — Applied the migration to Capture development. The two-account HTTP check verified phrase, concept, summary, note and topic matches, invalid and negative-only queries, status and topic filters, archive and note changes, isolation, and paging across identical timestamps. The first timed HTTP page on a seeded library of 1,253 captures took 231 ms. Production build, lint, formatting, and 113 Vitest tests passed with three opt-in tests skipped in that run.
- **Next action** — CAP-074 — Build search UI and filters.

### [2026-11-23T17:56:14+08:00] CAP-074 — Build search UI and filters — STARTED

- **Plan:** Add editable keyword search, topic filter choices, safe result previews, and accessible result feedback to the existing capture library. Verify discovery and opening by concept and title in Chromium.

### [2026-11-23T18:00:56+08:00] CAP-074 — Build search UI and filters — COMPLETE

- **Changes** — Added editable keywords and hierarchical topic choices to the existing library filters. Search results show short text previews drawn from the signed-in user's summaries, concepts, personal notes, and topics. Added an accessible loading status and search-specific empty feedback.
- **Verification** — Chromium on the production build found and opened captures by concept and remembered title. It also verified concept and personal note previews, combined topic and status filters, keyboard submission and focus, no-results feedback, and a 390 px viewport without horizontal overflow. The production build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped in the Vitest run.
- **Next action** — CAP-075 — Implement personal note editing.

### [2026-11-23T18:04:10+08:00] CAP-075 — Implement personal note editing — STARTED

- **Plan:** Keep explicit save and prevent stale edits from overwriting a newer note. Verify an extension-origin note through browser edits, a topic move, and worker retry and publication.

### [2026-11-23T18:08:20+08:00] CAP-075 — Implement personal note editing — COMPLETE

- **Changes** — Added an atomic compare-and-save operation. A stale editor keeps its draft and shows the latest saved note with an explicit choice. Personal notes remain separate from generated notes.
- **Verification** — Chromium saved and edited a note sent through the extension capture API, verified both conflict choices in two tabs, moved the capture, retried a failed worker, and published a fixture AI note without changing the user's note. Clearing and reload worked. The hosted integration verified simultaneous saves produce one success and one conflict and that foreign accounts cannot edit. The publication SQL, production build and TypeScript, lint, formatting, and 113 Vitest tests passed. Three opt-in tests were skipped in the Vitest run.
- **Next action** — CAP-076 — Implement Markdown/JSON export.

### [2026-11-23T18:09:15+08:00] CAP-076 — Implement Markdown/JSON export — STARTED

- **Plan:** Provide private downloads of saved captures, notes and topics in both portable formats. Verify browser downloads, account isolation, deletion, and delivery across multiple pages.

### [2026-11-23T18:13:56+08:00] CAP-076 — Implement Markdown/JSON export — COMPLETE

- **Changes** — Added downloads to the Account menu and a private export route. Both formats include active and archived captures, source links, personal and AI notes, topic assignments, and timestamps. The exporter reads and streams stable pages of up to 50 rows.
- **Verification** — Chromium downloaded and opened both formats. Two-account HTTP coverage verified a 1,253-capture and 53-topic export, topic and capture page boundaries, distinct records, structured notes, archived articles, escaped Markdown, private attachment headers, and the absence of deleted and foreign captures. The production build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped in Vitest.
- **Next action** — CAP-077 — Implement usage-period creation/reset.

### [2026-11-23T18:23:11+08:00] CAP-077 — Implement usage-period creation/reset — STARTED

- **Plan** — Share UTC calendar-month period creation between initial captures and retries. Verify Free and annual Pro allowances, boundaries, and plan changes while retaining prior usage.

### [2026-11-23T18:25:52+08:00] CAP-077 — Implement usage-period creation/reset — COMPLETE

- **Changes** — Initial capture and manual retry use the same lazily created UTC calendar-month period. Free receives 20 analyses and an active or trialing Pro term receives 300 per month, including during annual billing. Plan changes preserve existing usage and reservations, and late completions settle against the original period.
- **Verification** — Applied the hosted migration. Rollback SQL verified leap and non-leap February, 30- and 31-day months, Los Angeles and Singapore timezone settings, separate monthly periods within an annual Pro term, scheduled cancellation, term expiry, and renewal. Processing schema, recovery, publication, and live capture deduplication checks passed. Documentation formatting and diff checks passed.
- **Next action** — CAP-078 — Harden and audit atomic reserve/use/release.

### [2026-11-23T18:26:27+08:00] CAP-078 — Harden and audit atomic reserve/use/release — STARTED

- **Plan** — Keep usage history when a capture is deleted and verify the ledger against quota counters. Exercise parallel admission, retry redelivery, settlement, and deletion at the Free and Pro limits.

### [2026-11-23T18:29:50+08:00] CAP-078 — Harden and audit atomic reserve/use/release — COMPLETE

- **Changes** — Usage events retain account-level quota metadata when their capture and job are deleted. Deleting a queued capture releases its reservation, and deleting a processed capture retains its debit. The service-only audit compares period counters with event totals and the baseline retained from legacy deleted captures.
- **Verification** — Hosted HTTP tests raced six captures for the last slot on each plan. One queued per plan and the others saved at quota. Terminal failure released the slot, replay settled it once, and deleting queued and processed jobs left reconciled counters. Hosted processing transitions, recovery and period SQL, web TypeScript, lint, formatting, and 113 Vitest tests passed. Three opt-in tests were skipped in the Vitest run.
- **Next action** — CAP-079 — Implement quota-limited save behavior.

### [2026-11-23T18:30:39+08:00] CAP-079 — Implement quota-limited save behavior — STARTED

- **Plan** — Keep over-limit captures in the library and show the UTC reset. Let an owner request analysis explicitly after quota becomes available and verify that blocked requests create no job.

### [2026-11-23T18:34:05+08:00] CAP-079 — Implement quota-limited save behavior — COMPLETE

- **Changes** — Confirmed quota-limited saves in the dashboard, added the next UTC reset to capture details, and let owners request analysis for a selected capture. The paid launch gate keeps checkout deferred.
- **Verification** — Chromium saved a manual URL at quota, opened the saved link, displayed the UTC reset, and verified an analysis request was denied without creating a job. After freeing a reservation, only the explicitly selected capture queued. The Free and Pro hosted integrations, production build and TypeScript, lint, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped in the Vitest run.
- **Next action** — CAP-080 — Build usage/settings view.

### [2026-11-23T18:46:06+08:00] CAP-080 — Build usage/settings view — STARTED

- **Plan** — Expose the current account's quota counters, entitlement and reset, and add profile, extension access, capture deletion, and export entry points. Verify values and updates against hosted accounting.

### [2026-11-23T18:51:27+08:00] CAP-080 — Build usage/settings view — COMPLETE

- **Changes** — Added Settings under Account and linked it from quota-limited captures. The page shows effective plan, used and reserved units, monthly limit, UTC reset, and retry policy from server accounting, along with display name editing, extension access, capture deletion navigation, and exports.
- **Verification** — Chromium on the production build verified the 390 px layout, settings values against two accounts, profile editing through reload, privacy links, and a JSON download. Hosted Free and Pro tests verified current counters, plan expiry, zero usage without a period, and that forged request fields are ignored. Anonymous requests were denied. Boundary SQL, build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped in Vitest.
- **Next action** — CAP-081 — Implement first-run onboarding.

### [2026-11-23T18:52:52+08:00] CAP-081 — Implement first-run onboarding — STARTED

- **Plan** — Guide new accounts from Chrome setup or manual save to their first real knowledge branch. Verify that skipping persists and that fresh accounts see real processing progress.

### [2026-11-23T20:14:18+08:00] CAP-081 — Implement first-run onboarding — COMPLETE

- **Changes** — Added a skippable first-capture guide with Chrome setup instructions, a manual save option, and links to processing progress and the first populated Knowledge Tree branch. The skip preference belongs to the account.
- **Verification** — Chromium on the production build verified that one disposable account could skip and reload without seeing the guide and that a separate fresh account started with an empty tree and no example counts. The second account used the keyboard to follow the manual URL path, saved a real public article, reached Ready through local Inngest and the live note provider, and found its capture in the populated Knowledge Tree at 390 px. The run checked the Chrome setup instructions and used manual URL capture for the live path. Build and TypeScript, lint, formatting, diff checks, and 113 Vitest tests passed. Three opt-in tests were skipped in Vitest.
- **Next action** — CAP-082 — Add clear incomplete/error recovery UX.

### [2026-11-23T20:24:21+08:00] CAP-082 — Add clear incomplete/error recovery UX — STARTED

- **Plan** — Close recovery gaps for unsupported sources and interrupted status checks. Verify each listed recovery state against the web or extension workflow.

### [2026-11-23T20:29:06+08:00] CAP-082 — Add clear incomplete/error recovery UX — COMPLETE

- **Changes** — Added pasted-text recovery for unsupported and failed captures, with ownership, retry, and quota checks in the same transaction. The capture page offers explicit recovery for offline and failed status checks, deletion, and expired access. The extension exposes reconnect after an unauthorized save and retains the draft when offline.
- **Verification** — Chromium found a way forward from an empty tree, recovered an unsupported capture with pasted text, retained the draft without writing text or creating a job when quota was full, and queued the same capture after capacity returned. It also verified timeout, offline and reconnect, deletion during polling, direct access to a deleted capture, and analysis retry from a failed state. Extension popup tests checked revoked-session feedback and offline draft retention. The Free and Pro hosted quota integration, production build, TypeScript, lint, formatting, diff checks, and 115 Vitest tests passed. Three opt-in tests were skipped in Vitest.
- **Next action** — CAP-083 requires a consented real-user capture and revisit session before the P8 gate can pass.

### [2026-11-23T22:37:20+08:00] Analysis failure investigation

- **Finding** — Three recent attempts on the same capture recorded the legacy `invalid_response` code. That code did not distinguish a rejected request from an incomplete, refused, or invalid note. A live synthetic article returned valid notes. The original cause remains unconfirmed because the stored source was excluded from the replay.
- **Changes** — New failures distinguish provider rejection, refusal, incomplete output, and output-token exhaustion. Token exhaustion triggers one shorter-note attempt within the existing request and time budgets. The worker records the bounded failure code and continues to validate notes before publishing.
- **Verification** — Provider metadata from the live synthetic check showed a completed, validated response. Automated tests covered the fallback, its attempt limit, and distinct terminal outcomes. The CAP-083 walkthrough remains pending.

### [2026-11-23T22:40:32+08:00] Analysis failure investigation — authorized replay

- **Result** — One read-only replay of the affected capture returned HTTP 200 with an incomplete response at exactly 1,800 output tokens. The provider reported `max_output_tokens`, and the truncated output did not parse as JSON. This reproduced a failure covered by the shorter-note fallback in `e5fdeaa`. The earlier jobs still carry only the older generic error code.
- **Scope** — The replay sent one provider request, logged metadata only, and left the saved capture, job history, and quota unchanged. The shorter fallback on this capture remains unverified because it requires a second provider request.

### [2026-11-23T22:49:26+08:00] CAP-083 — Verify MVP workflow with real users/testers — STARTED

- **Plan** — The tester consented to a capture and revisit walkthrough using a public article. Record observed steps and friction separately from article text. Wait for actual observations before marking acceptance.

### [2026-11-23T22:57:23+08:00] CAP-083 — Verify MVP workflow with real users/testers — COMPLETE

- **Walkthrough** — One consenting tester reported that analysis worked and that they found the article again through both Knowledge Tree and Search. The record contains the workflow observations only.
- **Triage** — The tester reported no new blockers. The previously confirmed output truncation was addressed in `e5fdeaa`. Monitor recurrence using the distinct output-limit status.
- **P8 gate** — Passed with all 11 tasks verified. Next is CAP-084 to estimate costs and obtain a USD pricing decision.

### [2026-11-23T23:00:56+08:00] CAP-084 — Finalize pricing/currency and cost assumptions — STARTED

- **Prepared** — The [pricing model](PRICING_MODEL.md) uses measured AI token usage and compares baseline, stress, and adverse costs, payment fees, hosted infrastructure, and support reserves. Recommended USD $7.99 monthly and $71.88 annually for test mode.
- **Pending** — Obtain the owner's pricing decision before completing CAP-084 or configuring the test catalog.

### [2026-11-23T23:23:24+08:00] CAP-084 — Finalize pricing/currency and cost assumptions — COMPLETE

- **Decision** — The owner approved USD $11.99 monthly for test mode. The companion price is USD $107.88 yearly, equivalent to $8.99 monthly. The model retains the prior proposals for comparison and leaves live pricing subject to launch approval.
- **Verification** — Recomputed payment fees, per-subscriber contribution and the 100-Pro/400-Free cohort under baseline and stress assumptions. The [pricing model](PRICING_MODEL.md) records inputs and excludes tax, refunds and acquisition costs from contribution. The product spec and playbook agree on the test prices.
- **Next action** — CAP-085 — Configure Stripe test-mode products/prices.

### [2026-11-23T23:26:00+08:00] CAP-085 — Configure Stripe test-mode products/prices — STARTED

- **Plan** — Create one Capture Pro product with two recurring USD prices in the signed-in Stripe sandbox. Store the price IDs in the web app's ignored server environment and compare each against the Stripe Checkout preview.

### [2026-11-23T23:30:14+08:00] CAP-085 — Configure Stripe test-mode products/prices — COMPLETE

- **Verification** — Confirmed both active recurring prices on the Stripe sandbox product and checked the matching sandbox Checkout previews. Monthly displayed US$11.99 per month and annual displayed US$107.88 per year. No payment was submitted and no live keys were used.
- **Configuration** — Stored the two verified sandbox Price IDs in the existing server-only variables in `apps/web/.env.local`. The authenticated endpoint will select the price server-side in CAP-086.
- **Next action** — CAP-086 — Implement authenticated Checkout endpoint.
