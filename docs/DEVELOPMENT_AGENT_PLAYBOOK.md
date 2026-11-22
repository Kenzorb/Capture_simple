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
- Standard proposed Pro: USD $7.99 monthly or $71.88 yearly; alternative founding price requires a documented decision.
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

- [ ] **CAP-026 complete** (implemented, verified, logged, and persisted).

**Implement:** Create request/response schemas and `docs/API.md`; include optional content, manual URLs, request IDs, duplicate flag, statuses, error envelope and pagination.

**Verify / acceptance:** Contract tests reject malformed payloads and match documented examples.

**Record:** Append a start and outcome entry for `CAP-026` in §12; update §11; check this box and commit only on verified success.

#### CAP-027 — Implement safe URL validation and canonicalization

- [ ] **CAP-027 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow only supported HTTP(S) URLs, remove tracking params conservatively, keep content-affecting params/hash routes, normalize domain, reject invalid/dangerous protocols.

**Verify / acceptance:** URL fixture tests cover redirects, tracking params, query distinctions, fragments, international domains and edge cases.

**Record:** Append a start and outcome entry for `CAP-027` in §12; update §11; check this box and commit only on verified success.

#### CAP-028 — Implement POST /api/captures

- [ ] **CAP-028 complete** (implemented, verified, logged, and persisted).

**Implement:** Authenticate and validate; create article with status SAVED immediately and idempotency key; accept bounded user-initiated extracted content; support URL-only saves.

**Verify / acceptance:** Authorized real capture persists and returns article ID even with AI offline.

**Record:** Append a start and outcome entry for `CAP-028` in §12; update §11; check this box and commit only on verified success.

#### CAP-029 — Make deduplication atomic

- [ ] **CAP-029 complete** (implemented, verified, logged, and persisted).

**Implement:** Enforce `(user_id,canonical_url)` uniqueness with upsert/transaction handling; repeat requests return existing article and never double-charge.

**Verify / acceptance:** Concurrent duplicate request test produces exactly one article for the user.

**Record:** Append a start and outcome entry for `CAP-029` in §12; update §11; check this box and commit only on verified success.

#### CAP-030 — Implement article list and detail APIs

- [ ] **CAP-030 complete** (implemented, verified, logged, and persisted).

**Implement:** Add cursor/limit pagination, status filters, sorting, safe fields, detail notes/topics retrieval; avoid returning other users’ sources.

**Verify / acceptance:** Two-user API tests verify own records and reject cross-user IDs.

**Record:** Append a start and outcome entry for `CAP-030` in §12; update §11; check this box and commit only on verified success.

#### CAP-031 — Implement edits, archive, and delete

- [ ] **CAP-031 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow permitted title/personal note/archive operations, user-scoped deletion, cascading cleanup and clear confirmation behavior.

**Verify / acceptance:** Create/edit/archive/restore/delete lifecycle tests pass without orphaned personal data.

**Record:** Append a start and outcome entry for `CAP-031` in §12; update §11; check this box and commit only on verified success.

#### CAP-032 — Implement manual URL capture path

- [ ] **CAP-032 complete** (implemented, verified, logged, and persisted).

**Implement:** Support pasted public URLs in the web app; save even if extraction cannot run; server fetching needs SSRF defenses and strict request timeouts.

**Verify / acceptance:** URL-only capture reliably saves, with unsupported/unsafe fetch errors handled safely.

**Record:** Append a start and outcome entry for `CAP-032` in §12; update §11; check this box and commit only on verified success.

#### CAP-033 — Add rate limiting and request budgets

- [ ] **CAP-033 complete** (implemented, verified, logged, and persisted).

**Implement:** Rate-limit capture per account/IP as appropriate, cap extracted_text bytes and URL length, restrict content types, and log safe error codes.

**Verify / acceptance:** Oversized payload and request burst yield predictable rejections, not crashes or provider charges.

**Record:** Append a start and outcome entry for `CAP-033` in §12; update §11; check this box and commit only on verified success.

**P3 gate:** All mandatory P3 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P4 — Web dashboard and captured-article experience

**Goal:** Make captured knowledge visible and usable before AI enrichment.

#### CAP-034 — Implement authenticated dashboard shell

- [ ] **CAP-034 complete** (implemented, verified, logged, and persisted).

**Implement:** Build responsive layout, top search, user menu, left sidebar, loading skeletons, empty states, and routing; use accessible components.

**Verify / acceptance:** Desktop and narrow-screen routes work without layout overflows.

**Record:** Append a start and outcome entry for `CAP-034` in §12; update §11; check this box and commit only on verified success.

#### CAP-035 — Build overview and empty-state onboarding

- [ ] **CAP-035 complete** (implemented, verified, logged, and persisted).

**Implement:** Display recent captures, status counts and prompt to save first article; do not invent topics when an account has no articles.

**Verify / acceptance:** New account displays honest empty state; populated account shows real DB data.

**Record:** Append a start and outcome entry for `CAP-035` in §12; update §11; check this box and commit only on verified success.

#### CAP-036 — Build All Captures library

- [ ] **CAP-036 complete** (implemented, verified, logged, and persisted).

**Implement:** Render paginated article list/cards, source domain, capture time, processing badge, status and filters.

**Verify / acceptance:** Real API data updates after saving; pagination and empty filters are tested.

**Record:** Append a start and outcome entry for `CAP-036` in §12; update §11; check this box and commit only on verified success.

#### CAP-037 — Build manual URL-save form

- [ ] **CAP-037 complete** (implemented, verified, logged, and persisted).

**Implement:** Validate and submit a URL; show immediate saved confirmation and link to detail; expose sensible errors.

**Verify / acceptance:** Manual URL appears in library without waiting for analysis.

**Record:** Append a start and outcome entry for `CAP-037` in §12; update §11; check this box and commit only on verified success.

#### CAP-038 — Build article detail baseline

- [ ] **CAP-038 complete** (implemented, verified, logged, and persisted).

**Implement:** Show original URL, title, source metadata, status, personal notes editor, archive/delete controls and fallback when no AI output exists.

**Verify / acceptance:** User can create/edit notes, open source, archive and delete using own records.

**Record:** Append a start and outcome entry for `CAP-038` in §12; update §11; check this box and commit only on verified success.

#### CAP-039 — Add responsive UI and accessibility baseline

- [ ] **CAP-039 complete** (implemented, verified, logged, and persisted).

**Implement:** Use accessible labels, keyboard navigation, focus management, loading announcements and clear color-independent status indicators.

**Verify / acceptance:** Automated accessibility checks plus manual keyboard tab-through pass on key screens.

**Record:** Append a start and outcome entry for `CAP-039` in §12; update §11; check this box and commit only on verified success.

**P4 gate:** All mandatory P4 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P5 — Chrome extension and secure account connection

**Goal:** Prove the central one-click workflow using real pages, safely.

#### CAP-040 — Implement extension connection/auth contract

- [ ] **CAP-040 complete** (implemented, verified, logged, and persisted).

**Implement:** Pick supported OAuth/PKCE or a verified one-use authorization code handoff. Document state/redirect validation, token exchange, refresh, revocation and extension origin allowlisting.

**Verify / acceptance:** Threat-model review shows no durable credential in URL and no insecure cross-origin messaging.

**Record:** Append a start and outcome entry for `CAP-040` in §12; update §11; check this box and commit only on verified success.

#### CAP-041 — Connect extension to signed-in user

- [ ] **CAP-041 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement sign-in/connect button, session persistence in extension-restricted storage, expiry/refresh handling, and disconnect/logout.

**Verify / acceptance:** Extension sends authenticated API request and receives correct user identity; revoke/logout invalidates it.

**Record:** Append a start and outcome entry for `CAP-041` in §12; update §11; check this box and commit only on verified success.

#### CAP-042 — Read active tab metadata only on click

- [ ] **CAP-042 complete** (implemented, verified, logged, and persisted).

**Implement:** When user invokes capture, obtain URL/title/domain and optional metadata. Do not passively scan tab history or request all-site access without justification.

**Verify / acceptance:** Permissions test confirms no background browsing monitoring; restricted pages show clear state.

**Record:** Append a start and outcome entry for `CAP-042` in §12; update §11; check this box and commit only on verified success.

#### CAP-043 — Extract readable page content

- [ ] **CAP-043 complete** (implemented, verified, logged, and persisted).

**Implement:** Run Readability or comparable parser on a safe snapshot of the chosen tab; sanitize, strip scripts, limit text size, preserve title/byline where possible.

**Verify / acceptance:** Real article fixtures include news, blogs, documentation and non-article pages; extraction failures degrade to URL save.

**Record:** Append a start and outcome entry for `CAP-043` in §12; update §11; check this box and commit only on verified success.

#### CAP-044 — Build minimal popup UX

- [ ] **CAP-044 complete** (implemented, verified, logged, and persisted).

**Implement:** Show current page, optional personal note, save button, loading, already-saved, queued, quota-limited, unsupported and error states.

**Verify / acceptance:** Popup supports keyboard, shows actionable messages and remains fast.

**Record:** Append a start and outcome entry for `CAP-044` in §12; update §11; check this box and commit only on verified success.

#### CAP-045 — Send idempotent capture requests

- [ ] **CAP-045 complete** (implemented, verified, logged, and persisted).

**Implement:** Call authenticated POST /api/captures, guard double click/timeouts, maintain request ID across retries and show stored article link.

**Verify / acceptance:** Repeated click or retry produces one capture; server and extension handle network failure.

**Record:** Append a start and outcome entry for `CAP-045` in §12; update §11; check this box and commit only on verified success.

#### CAP-046 — Deep-link to captured article

- [ ] **CAP-046 complete** (implemented, verified, logged, and persisted).

**Implement:** Open web app article in a new tab and support “Open library”; build URL only from trusted application origin and server-returned IDs.

**Verify / acceptance:** Saved button opens correct account’s article; missing/unauthorized target handled.

**Record:** Append a start and outcome entry for `CAP-046` in §12; update §11; check this box and commit only on verified success.

#### CAP-047 — Test extension across browser edge cases

- [ ] **CAP-047 complete** (implemented, verified, logged, and persisted).

**Implement:** Cover dynamic pages, article with images, heavy scripts, unsupported chrome:// pages, offline API, expired session and large content.

**Verify / acceptance:** Manual test matrix records pass/fail with browser version, URLs or fixtures, and evidence.

**Record:** Append a start and outcome entry for `CAP-047` in §12; update §11; check this box and commit only on verified success.

#### CAP-048 — Audit extension build and permissions

- [ ] **CAP-048 complete** (implemented, verified, logged, and persisted).

**Implement:** Inspect manifest, CSP, bundled output and cross-origin handling; verify no AI/Stripe/service-role key in build; prepare safe development ID settings.

**Verify / acceptance:** Security check yields minimal permissions and clean secret scan.

**Record:** Append a start and outcome entry for `CAP-048` in §12; update §11; check this box and commit only on verified success.

**P5 gate:** All mandatory P5 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P6 — Background extraction and AI note generation

**Goal:** Turn saved content into trustworthy, structured knowledge without blocking capture.

#### CAP-049 — Select and configure durable background jobs

- [ ] **CAP-049 complete** (implemented, verified, logged, and persisted).

**Implement:** Set up chosen provider, environment-specific credentials, timeouts, concurrency limits and worker deployment; avoid fire-and-forget serverless calls.

**Verify / acceptance:** A simple durable job survives API response and completes after intentional retry.

**Record:** Append a start and outcome entry for `CAP-049` in §12; update §11; check this box and commit only on verified success.

#### CAP-050 — Build transactional job dispatch

- [ ] **CAP-050 complete** (implemented, verified, logged, and persisted).

**Implement:** Create the initial Free monthly usage period and, on eligible capture, atomically create a job + quota reservation + durable outbox/work item; prevent “saved but never queued” gaps. Later quota tasks harden reset and paid entitlements.

**Verify / acceptance:** Simulated provider outage retains recoverable job; recovery dispatches it once.

**Record:** Append a start and outcome entry for `CAP-050` in §12; update §11; check this box and commit only on verified success.

#### CAP-051 — Implement status state machine

- [ ] **CAP-051 complete** (implemented, verified, logged, and persisted).

**Implement:** Define allowed transitions and owner-scoped status API; use job IDs/generation tokens to prevent stale worker overwrites.

**Verify / acceptance:** Tests reject invalid transitions and guarantee article survives failures.

**Record:** Append a start and outcome entry for `CAP-051` in §12; update §11; check this box and commit only on verified success.

#### CAP-052 — Implement source preparation/chunking

- [ ] **CAP-052 complete** (implemented, verified, logged, and persisted).

**Implement:** Prefer user-initiated extracted content; for URL-only fetch, require public hosts, deny internal/private IP and DNS rebinding, bound redirects/time/bytes, and respect access restrictions.

**Verify / acceptance:** Security tests exercise localhost, metadata IPs, redirects, huge pages, unsupported content and timeouts.

**Record:** Append a start and outcome entry for `CAP-052` in §12; update §11; check this box and commit only on verified success.

#### CAP-053 — Clean and segment source text

- [ ] **CAP-053 complete** (implemented, verified, logged, and persisted).

**Implement:** Normalize whitespace, remove noise, preserve meaningful headings, store content hash and evidence chunk IDs; enforce maximum input and token budget.

**Verify / acceptance:** Fixtures produce coherent bounded chunks; source-to-chunk traceability tested.

**Record:** Append a start and outcome entry for `CAP-053` in §12; update §11; check this box and commit only on verified success.

#### CAP-054 — Define AI structured-note schema

- [ ] **CAP-054 complete** (implemented, verified, logged, and persisted).

**Implement:** Use Zod for summary, takeaways, sections, evidence chunk IDs, concepts, tags, topic suggestions, language, model and schema version; separate personal notes.

**Verify / acceptance:** Malformed or missing fields fail gracefully; schema version stored with notes.

**Record:** Append a start and outcome entry for `CAP-054` in §12; update §11; check this box and commit only on verified success.

#### CAP-055 — Design grounded prompts and injection defenses

- [ ] **CAP-055 complete** (implemented, verified, logged, and persisted).

**Implement:** Pass page text as untrusted data; tell model to summarize only source content and use available evidence; explicitly prohibit source text from overriding system instructions.

**Verify / acceptance:** Adversarial article fixtures do not trigger privileged actions or leaked prompts.

**Record:** Append a start and outcome entry for `CAP-055` in §12; update §11; check this box and commit only on verified success.

#### CAP-056 — Integrate real AI provider server-side

- [ ] **CAP-056 complete** (implemented, verified, logged, and persisted).

**Implement:** Make bounded model request with runtime/cost limits, retries for transient errors, structured outputs and server-held API keys only.

**Verify / acceptance:** At least three representative real articles produce validated results and recorded approximate token cost.

**Record:** Append a start and outcome entry for `CAP-056` in §12; update §11; check this box and commit only on verified success.

#### CAP-057 — Validate and persist AI results

- [ ] **CAP-057 complete** (implemented, verified, logged, and persisted).

**Implement:** Validate schema, referenced evidence IDs, output length and ownership; save notes transactionally; never overwrite personal notes.

**Verify / acceptance:** Invalid outputs fail safely; valid outputs persist exactly once and survive refresh.

**Record:** Append a start and outcome entry for `CAP-057` in §12; update §11; check this box and commit only on verified success.

#### CAP-058 — Implement retry and terminal failure policy

- [ ] **CAP-058 complete** (implemented, verified, logged, and persisted).

**Implement:** Classify timeout, rate limit, parse failure, source unsupported and provider outage; backoff with max attempts; provide user retry without duplicate billing.

**Verify / acceptance:** Injected failure tests show correct retries/statuses and eventual FAILED/UNSUPPORTED.

**Record:** Append a start and outcome entry for `CAP-058` in §12; update §11; check this box and commit only on verified success.

#### CAP-059 — Implement job idempotency and recovery

- [ ] **CAP-059 complete** (implemented, verified, logged, and persisted).

**Implement:** Prevent duplicate worker execution from writing two note versions/usage events; add dead-letter/reconcile strategy and admin-safe retry.

**Verify / acceptance:** Duplicate delivery and worker crash tests preserve consistent article/usage state.

**Record:** Append a start and outcome entry for `CAP-059` in §12; update §11; check this box and commit only on verified success.

#### CAP-060 — Surface processing updates in web UI

- [ ] **CAP-060 complete** (implemented, verified, logged, and persisted).

**Implement:** Use polling or authorized realtime feed; display saved/queued/processing/ready/failed/quota-limited, retry action and helpful explanation.

**Verify / acceptance:** Article transitions from SAVED to READY on-screen without a manual page reload.

**Record:** Append a start and outcome entry for `CAP-060` in §12; update §11; check this box and commit only on verified success.

#### CAP-061 — Run full capture-to-notes vertical slice

- [ ] **CAP-061 complete** (implemented, verified, logged, and persisted).

**Implement:** Use a real article (not only mock content) from extension or manual save through API, queue, provider, database and dashboard.

**Verify / acceptance:** Record demo evidence, latency, output quality and provider cost. Phase gate must pass.

**Record:** Append a start and outcome entry for `CAP-061` in §12; update §11; check this box and commit only on verified success.

**P6 gate:** All mandatory P6 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P7 — Topic organization and dynamic knowledge tree

**Goal:** Organize newly processed articles without creating unstable or duplicate topic branches.

#### CAP-062 — Define hierarchy rules and topic API

- [ ] **CAP-062 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement tree fetch, owner-scoped create, rename, move, and delete rules; define root vs child unique names, maximum depth and cycle detection.

**Verify / acceptance:** A full tree can be retrieved and invalid/malicious moves are rejected.

**Record:** Append a start and outcome entry for `CAP-062` in §12; update §11; check this box and commit only on verified success.

#### CAP-063 — Implement topic normalization and matching

- [ ] **CAP-063 complete** (implemented, verified, logged, and persisted).

**Implement:** Normalize labels/aliases, prioritize exact or existing matching topics, keep matching deterministic where possible.

**Verify / acceptance:** Related example articles reuse existing branch instead of making near-duplicates.

**Record:** Append a start and outcome entry for `CAP-063` in §12; update §11; check this box and commit only on verified success.

#### CAP-064 — Resolve AI-suggested topic paths

- [ ] **CAP-064 complete** (implemented, verified, logged, and persisted).

**Implement:** Provide bounded candidate topics to model if needed; validate returned IDs against owner; create sensible new topic or Unsorted fallback transactionally.

**Verify / acceptance:** AI output with foreign topic ID is rejected; valid fallback always assigns safely.

**Record:** Append a start and outcome entry for `CAP-064` in §12; update §11; check this box and commit only on verified success.

#### CAP-065 — Attach primary and secondary topics

- [ ] **CAP-065 complete** (implemented, verified, logged, and persisted).

**Implement:** Enforce one primary topic per article, support additional relevant topics and track AI vs manual source/confidence.

**Verify / acceptance:** Relationships have no cross-user links and no duplicate article-topic rows.

**Record:** Append a start and outcome entry for `CAP-065` in §12; update §11; check this box and commit only on verified success.

#### CAP-066 — Build dynamic sidebar navigation

- [ ] **CAP-066 complete** (implemented, verified, logged, and persisted).

**Implement:** Load user's real topic hierarchy into expandable/collapsible left nav with counts, loading and empty states.

**Verify / acceptance:** New topic appears after AI processing; sidebar persists navigation state sensibly.

**Record:** Append a start and outcome entry for `CAP-066` in §12; update §11; check this box and commit only on verified success.

#### CAP-067 — Build Knowledge Tree view

- [ ] **CAP-067 complete** (implemented, verified, logged, and persisted).

**Implement:** Render nested topics and article leaves; allow expand/collapse, keyboard navigation, route to article/topic and avoid unbounded tree rendering.

**Verify / acceptance:** A user with multiple nested levels can find and open an article accessibly.

**Record:** Append a start and outcome entry for `CAP-067` in §12; update §11; check this box and commit only on verified success.

#### CAP-068 — Build topic detail pages

- [ ] **CAP-068 complete** (implemented, verified, logged, and persisted).

**Implement:** Show topic description, child topics, article list, primary/secondary membership and relevant concept labels.

**Verify / acceptance:** Topic view matches DB relations and reflects article corrections.

**Record:** Append a start and outcome entry for `CAP-068` in §12; update §11; check this box and commit only on verified success.

#### CAP-069 — Implement manual topic corrections

- [ ] **CAP-069 complete** (implemented, verified, logged, and persisted).

**Implement:** Allow user to move/reassign an article and rename/move topics; preserve manual decisions against automatic reprocessing.

**Verify / acceptance:** Manual reassignment survives reprocess, refresh and unrelated new captures.

**Record:** Append a start and outcome entry for `CAP-069` in §12; update §11; check this box and commit only on verified success.

#### CAP-070 — Add safe topic merge or documented alternative

- [ ] **CAP-070 complete** (implemented, verified, logged, and persisted).

**Implement:** If merge is in MVP scope, move article links and children transactionally with conflict resolution; otherwise defer explicitly and offer rename/move as baseline.

**Verify / acceptance:** No data loss under merge tests, or deferral and minimum substitute documented.

**Record:** Append a start and outcome entry for `CAP-070` in §12; update §11; check this box and commit only on verified success.

#### CAP-071 — Implement basic related-article suggestions

- [ ] **CAP-071 complete** (implemented, verified, logged, and persisted).

**Implement:** Compute shared topics/concepts/tag overlap with bounded candidate queries, owner filters and no LLM-all-pairs explosion.

**Verify / acceptance:** Related links are relevant, scoped to user and fast with seeded larger libraries.

**Record:** Append a start and outcome entry for `CAP-071` in §12; update §11; check this box and commit only on verified success.

#### CAP-072 — Test evolving tree with a research corpus

- [ ] **CAP-072 complete** (implemented, verified, logged, and persisted).

**Implement:** Capture multiple real pages across CS, entrepreneurship and history, including multi-disciplinary and duplicate-topic examples.

**Verify / acceptance:** Knowledge tree is stable, navigable and editable; taxonomy quality issues logged.

**Record:** Append a start and outcome entry for `CAP-072` in §12; update §11; check this box and commit only on verified success.

**P7 gate:** All mandatory P7 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P8 — Search, quotas, export, onboarding and usability

**Goal:** Finish the everyday capture → organize → revisit loop and fair Free plan.

#### CAP-073 — Add keyword search query/indexes

- [ ] **CAP-073 complete** (implemented, verified, logged, and persisted).

**Implement:** Implement server-scoped full-text/keyword search over titles, summaries, notes and topic names, with pagination and safe search input.

**Verify / acceptance:** Relevant results returned for own data; cross-user content absent; search latency measured.

**Record:** Append a start and outcome entry for `CAP-073` in §12; update §11; check this box and commit only on verified success.

#### CAP-074 — Build search UI and filters

- [ ] **CAP-074 complete** (implemented, verified, logged, and persisted).

**Implement:** Provide search input, result previews, status/topic filters, empty/loading/error states and accessible navigation.

**Verify / acceptance:** A user can retrieve an article by concept or remembered title and open it.

**Record:** Append a start and outcome entry for `CAP-074` in §12; update §11; check this box and commit only on verified success.

#### CAP-075 — Implement personal note editing

- [ ] **CAP-075 complete** (implemented, verified, logged, and persisted).

**Implement:** Autosave or explicit save with conflict/error handling; separate personal notes from regenerated AI notes.

**Verify / acceptance:** User-written notes survive model retries and topic changes.

**Record:** Append a start and outcome entry for `CAP-075` in §12; update §11; check this box and commit only on verified success.

#### CAP-076 — Implement Markdown/JSON export

- [ ] **CAP-076 complete** (implemented, verified, logged, and persisted).

**Implement:** Export only authorized articles, source links, AI notes, personal notes, topics and timestamps in a portable format; handle large libraries safely.

**Verify / acceptance:** Export opens correctly; data belongs only to current user; deleted items absent.

**Record:** Append a start and outcome entry for `CAP-076` in §12; update §11; check this box and commit only on verified success.

#### CAP-077 — Implement usage-period creation/reset

- [ ] **CAP-077 complete** (implemented, verified, logged, and persisted).

**Implement:** Create a documented UTC monthly quota anchor for Free and paid users, including monthly periods during annual Pro billing.

**Verify / acceptance:** Clock-boundary tests cover months of differing length, renewal, timezones and leap year.

**Record:** Append a start and outcome entry for `CAP-077` in §12; update §11; check this box and commit only on verified success.

#### CAP-078 — Harden and audit atomic reserve/use/release

- [ ] **CAP-078 complete** (implemented, verified, logged, and persisted).

**Implement:** Extend the initial queue quota logic with concurrency-safe `used + reserved < limit` enforcement, reconciliation, paid limits, and reset behavior; success commits one used unit, terminal failure releases; retries reuse the same reservation.

**Verify / acceptance:** Parallel requests cannot overspend quota; event log reconciles to counters.

**Record:** Append a start and outcome entry for `CAP-078` in §12; update §11; check this box and commit only on verified success.

#### CAP-079 — Implement quota-limited save behavior

- [ ] **CAP-079 complete** (implemented, verified, logged, and persisted).

**Implement:** When limit reached, keep saved link, mark QUOTA_LIMITED, show next reset/upgrade affordance; no unapproved automatic backlog processing.

**Verify / acceptance:** Capture is successful at quota limit and future AI call is blocked server-side.

**Record:** Append a start and outcome entry for `CAP-079` in §12; update §11; check this box and commit only on verified success.

#### CAP-080 — Build usage/settings view

- [ ] **CAP-080 complete** (implemented, verified, logged, and persisted).

**Implement:** Show plan, used/reserved/limit, next reset, allowed retries, profile, privacy controls and export entry point.

**Verify / acceptance:** Values match server accounting and are never trusted from client state.

**Record:** Append a start and outcome entry for `CAP-080` in §12; update §11; check this box and commit only on verified success.

#### CAP-081 — Implement first-run onboarding

- [ ] **CAP-081 complete** (implemented, verified, logged, and persisted).

**Implement:** Guide user through installing/connecting extension and capturing one real article; skipable, accessible, no fake example counts.

**Verify / acceptance:** New user completes onboarding and sees their first real knowledge branch.

**Record:** Append a start and outcome entry for `CAP-081` in §12; update §11; check this box and commit only on verified success.

#### CAP-082 — Add clear incomplete/error recovery UX

- [ ] **CAP-082 complete** (implemented, verified, logged, and persisted).

**Implement:** Cover unsupported content, revoked extension session, quota exhausted, worker failure, empty tree, deleted article, offline and timeout.

**Verify / acceptance:** Usability walkthrough records no dead-end workflow.

**Record:** Append a start and outcome entry for `CAP-082` in §12; update §11; check this box and commit only on verified success.

#### CAP-083 — Verify MVP workflow with real users/testers

- [ ] **CAP-083 complete** (implemented, verified, logged, and persisted).

**Implement:** Recruit a small consented beta sample, observe one capture/revisit session, record feedback separately from private page contents, and triage defects.

**Verify / acceptance:** At least one documented real-user walkthrough and prioritized issue list.

**Record:** Append a start and outcome entry for `CAP-083` in §12; update §11; check this box and commit only on verified success.

**P8 gate:** All mandatory P8 tasks are verified (or a narrowly justified, owner-approved deferral is recorded); update §11 before moving to the next phase.

### P9 — Stripe monetization and entitlement integrity

**Goal:** Complete **before taking payment**; keep live money movement disabled until approved.

#### CAP-084 — Finalize pricing/currency and cost assumptions

- [ ] **CAP-084 complete** (implemented, verified, logged, and persisted).

**Implement:** Estimate average AI spend per successful article at 20/300 volumes, hosting/job costs, fees, support and fair-use caps; obtain owner decision on USD prices.

**Verify / acceptance:** Pricing decision and margin scenario documented; no unsupported profitability claim.

**Record:** Append a start and outcome entry for `CAP-084` in §12; update §11; check this box and commit only on verified success.

#### CAP-085 — Configure Stripe test-mode products/prices

- [ ] **CAP-085 complete** (implemented, verified, logged, and persisted).

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
| Current phase | `P3 — Capture API and reliable storage` |
| Current task | `CAP-026 — Specify capture and article API contracts` |
| Last verified completed task | `CAP-025` |
| Last verification executed | `All six local and hosted migrations matched. Regenerated database types matched the repository. Hosted two-user checks verified owner isolation and signed-out rejection. TypeScript, lint, and ten unit tests passed.` |
| Last successful Git commit | `382a520` |
| Active blockers | `None for CAP-026. Fresh signup acceptance remains deferred by the owner under CAP-023.` |
| MVP launch gate | `NOT READY` |
| Paid launch gate | `NOT READY — Stripe test lifecycle + explicit approval required` |
| Next action | `Add and verify the capture and article API contracts.` |

### 11.1 Phase progress overview

Counts below refer to tasks in the immutable numbered checklist. **Agents must update these counts only after verifying checkbox status**; never infer completion from the presence of files.

| Phase | Steps | Complete | State |
|---|---|---:|---|
| P0 | CAP-001–007 | 7/7 | Complete |
| P1 | CAP-008–015 | 8/8 | Complete |
| P2 | CAP-016–025 | 9/10 | Gate passed with CAP-023 deferred |
| P3 | CAP-026–033 | 0/8 | In progress |
| P4 | CAP-034–039 | 0/6 | Not started |
| P5 | CAP-040–048 | 0/9 | Not started |
| P6 | CAP-049–061 | 0/13 | Not started |
| P7 | CAP-062–072 | 0/11 | Not started |
| P8 | CAP-073–083 | 0/11 | Not started |
| P9 | CAP-084–092 | 0/9 | Not started |
| P10 | CAP-093–101 | 0/9 | Not started |
| P11 | CAP-102–112 | 0/11 | Not started |
| **Total** | **CAP-001–112** | **22/112** | **In progress** |

### 11.2 Decisions and blockers requiring owner input

Record answers here as decisions are made; record private keys only in secret stores or local ignored env files.

| Topic | Default / open question | Status |
|---|---|---|
| Supabase project | Which dev/staging/prod project? | Hosted capture-dev verified; staging and production unconfirmed |
| GitHub repository | Repo name, owner and CI access? | Unconfirmed |
| AI provider/model | OpenAI structured output, capped budgets | Default proposed; verify |
| Background jobs | Inngest, one durable provider | Default proposed; verify |
| Payment plan | Free-only beta or paid beta? | Unconfirmed |
| Pricing/currency | USD $7.99 monthly / $71.88 annually proposed | Unconfirmed |
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
