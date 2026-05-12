# Studio Zero — Sitemap (M5-launch web app)

**Phase:** 3 — Information Architecture
**Owner:** Optic (UX/UI lead, this file) + Trace (user-flows, sibling files)
**Version:** 0.1
**Date:** 2026-05-11
**Status:** First draft for Phase 3 Jury exit gate
**Scope:** every route in the M5 product surface. V1.5 (Auto-PR) and V2 (Build) routes are marked `(V1.5)` / `(V2)` so the M5 launch doesn't accidentally ship them.

> **Method.** Routes are derived from PRD v0.4 §6 (Product Surface), §7 (Workflows), §11 (Fix Delivery), §12 (Pricing), §14.5–14.7 (Compliance, A11y, AUP), §17 (Decisions). Where the PRD is silent the route is tagged `(proposed)`. Role/state gating is documented per route so Atlas/Shield can map gates to RLS policies in Phase 5. Every claim is cited to a PRD section, Nielsen heuristic, or WCAG SC.

---

## At-a-glance tree

```
studiozero.com
├── /  (landing — Marketing, anon, indexable)
├── /pricing  (Marketing, anon, indexable, canonical)
├── /how-it-works  (Marketing, anon, indexable)
├── /audit  (Marketing, anon, indexable — what the audit covers)
├── /build  (Marketing, anon, indexable — V2 teaser, demand-gate signup)
├── /modes  (Marketing, anon, indexable — BYOK / CLI / Managed)
├── /security  (Marketing, anon, indexable)
├── /accessibility  (Conformance statement, anon, indexable — PRD §14.6)
├── /privacy  (Legal, anon, indexable)
├── /terms  (Legal, anon, indexable)
├── /aup  (Legal, anon, indexable — PRD §14.7)
├── /subprocessors  (Legal, anon, indexable — PRD §14.5 / Decision #17)
├── /dpa  (Legal, anon, indexable — PRD Decision #17)
├── /ai-system-card  (Legal/transparency, anon, indexable — PRD §14.5 / Decision #18)
├── /dmca  (Legal, anon, indexable — PRD §14.5)
├── /blog  (Marketing, anon, indexable)
│   └── /blog/[slug]
├── /changelog  (Marketing, anon, indexable)
├── /status  (Marketing, anon, indexable, but read-only mirror of statuspage.io)
│
├── /signup  (Auth, anon→authed, noindex)
├── /login  (Auth, anon→authed, noindex)
├── /login/magic-link/[token]  (Auth callback, noindex)
├── /login/reset  (Auth, anon, noindex)
├── /login/reset/[token]  (Auth callback, noindex)
├── /auth/callback/google  (OAuth callback, noindex)
├── /auth/callback/github  (OAuth callback, noindex)
├── /auth/verify-email  (Auth gate, authed-unverified, noindex)
├── /auth/install/github  (GitHub App install callback, authed, noindex — PRD Decision D1)
├── /onboarding/mode  (post-signup picker, authed-no-mode, noindex)
├── /onboarding/byok  (BYOK key entry, authed, noindex)
├── /onboarding/cli  (CLI pairing, authed, noindex)
├── /onboarding/managed  (Managed checkout handoff, authed, noindex)
│
├── /app  (App shell — dashboard, authed, noindex)
│   ├── /app/projects  (project list)
│   │   ├── /app/projects/new  (project create — collapses into intake per OPT-C1)
│   │   └── /app/projects/[project-id]
│   │       ├── /app/projects/[project-id]/audits  (audit history)
│   │       ├── /app/projects/[project-id]/settings  (per-project)
│   │       └── /app/projects/[project-id]/delete  (danger-zone modal, not a real route)
│   ├── /app/audits/new  (2-step intake — OPT-C1)
│   ├── /app/audits/[run-id]  (live run detail)
│   │   ├── /app/audits/[run-id]/findings  (default tab)
│   │   ├── /app/audits/[run-id]/findings/[finding-id]
│   │   ├── /app/audits/[run-id]/timeline  (per-agent timeline — OPT-C3)
│   │   ├── /app/audits/[run-id]/score  (radar + table — HC3)
│   │   ├── /app/audits/[run-id]/evidence/[evidence-id]
│   │   ├── /app/audits/[run-id]/share/[share-token]  (PASS share — proposed)
│   │   ├── /app/audits/[run-id]/upgrade  (Code-SKU upsell from Surface — PRD §6.3 E2)
│   │   └── /app/audits/[run-id]/pr/[pr-id]  (V1.5 Auto-PR tracker)
│   ├── /app/builds  (V2 — Build mode list)
│   │   ├── /app/builds/new  (V2 — 6-step intake form)
│   │   ├── /app/builds/[build-id]  (V2 — live layer dashboard)
│   │   └── /app/builds/[build-id]/output  (V2 — final deliverables)
│   ├── /app/notifications  (in-app drawer route — OPT-M1)
│   ├── /app/settings
│   │   ├── /app/settings/account  (profile, email, password)
│   │   ├── /app/settings/account/notifications
│   │   ├── /app/settings/account/consent  (cookie + AI-training opt-in — PRD §6.1, §14.4)
│   │   ├── /app/settings/account/export  (GDPR Art. 20 portability — PRD §14.4)
│   │   ├── /app/settings/account/delete  (GDPR Art. 17 — PRD §14.4)
│   │   ├── /app/settings/integrations/byok  (BYOK key — HC5)
│   │   ├── /app/settings/integrations/cli  (paired CLI devices — PRD §6.4)
│   │   ├── /app/settings/integrations/github  (GitHub App install/uninstall — Decision D1)
│   │   ├── /app/settings/billing/plan  (current plan + change)
│   │   ├── /app/settings/billing/invoices
│   │   ├── /app/settings/billing/payment-method
│   │   ├── /app/settings/billing/cancel  (FTC Click-to-Cancel — Decision #20)
│   │   ├── /app/settings/billing/dispute  (chargeback prevention path — Decision #20)
│   │   ├── /app/settings/data/retention  (per PRD §14.4 retention slider)
│   │   ├── /app/settings/data/findings-export
│   │   └── /app/settings/team  (V2 placeholder — feature-flagged)
│   ├── /app/billing/checkout  (Stripe Checkout return, authed)
│   ├── /app/billing/upgrade  (plan picker for in-app upgrade — Decision #20)
│   └── /app/help  (in-app help center deep-links — H10)
│
├── /admin  (Admin shell, role=admin only, noindex, robots-disallow)
│   ├── /admin/runs
│   ├── /admin/runs/[run-id]
│   ├── /admin/users
│   ├── /admin/users/[user-id]
│   ├── /admin/tenants
│   ├── /admin/tenants/[tenant-id]
│   ├── /admin/financial
│   ├── /admin/audit-action-log  (PRD §14.3)
│   └── /admin/breach-events  (PRD §13.2 / Art. 33 runbook)
│
├── /healthz  (admin-only, noindex, no consent gate)
├── /status  (public read-only — see above; just the route)
├── /robots.txt  (system)
├── /sitemap.xml  (system)
│
├── /401  (not-authed)
├── /403  (no permission)
├── /404
├── /410  (deleted)
├── /429
├── /500
├── /503  (maintenance / outage)
├── /offline  (PWA — browser is offline)
│
└── /cli/handshake  (CLI ↔ web pairing handshake page — PRD §6.4, §17 D6)
```

---

## Marketing site

Public, Astro-or-Next, indexable. Cookie banner blocks PostHog/analytics until consent (PRD §6.1, §13.6). Brand voice owned by Herald (`agents/growth/herald-brand-voice.md`).

| Path                                   | Purpose                                                                          | Gate | Parent → children                        | SEO posture                                                                                     | Consent gate                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/`                                    | Landing — wedge statement + Surface-audit free-tier hook                         | anon | — → `/pricing`, `/audit`, `/signup`      | **indexable**, canonical=`https://studiozero.com/`                                              | Cookie banner on first paint; analytics fires only on `consent.analytics=true` |
| `/pricing`                             | Tier table, 7 SKUs (PRD §12)                                                     | anon | `/` → `/signup`                          | **indexable**, canonical=`/pricing`; structured data `Product` per tier                         | same                                                                           |
| `/how-it-works`                        | Visual explainer of the audit→fix→re-audit loop                                  | anon | `/` → `/audit`, `/build`                 | indexable                                                                                       | same                                                                           |
| `/audit`                               | What the 7 reviewers cover                                                       | anon | `/how-it-works` → `/signup`              | indexable                                                                                       | same                                                                           |
| `/build`                               | V2 teaser; collects demand-gate emails                                           | anon | `/how-it-works` → `/signup?intent=build` | indexable                                                                                       | same                                                                           |
| `/modes`                               | BYOK / CLI / Managed comparison                                                  | anon | `/audit` → `/pricing`                    | indexable                                                                                       | same                                                                           |
| `/security`                            | Trust page: sandbox, RLS, retention, BYOK vault                                  | anon | `/` → `/dpa`, `/subprocessors`           | indexable                                                                                       | same                                                                           |
| `/accessibility`                       | WCAG 2.2 AA conformance statement                                                | anon | footer                                   | indexable (legal req per PRD §14.6)                                                             | same                                                                           |
| `/privacy`                             | Privacy policy + plain-English summary at top (Herald §6)                        | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/terms`                               | ToS incl. BYOK pass-through (Decision #19) + Anthropic ToS pass-through          | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/aup`                                 | Acceptable Use Policy incl. URL-audit attestation (PRD §14.7)                    | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/subprocessors`                       | Subprocessor list (PRD §14.5 / Decision #17)                                     | anon | footer                                   | indexable; **mirrors `subprocessors.json` so RSS/atom feed enables 30-day change notification** | same                                                                           |
| `/subprocessors/feed.xml` _(proposed)_ | RSS feed for subprocessor changes — 30-day notification mechanism (Decision #17) | anon | footer                                   | noindex (RSS)                                                                                   | none                                                                           |
| `/dpa`                                 | Data Processing Agreement template (Art. 28, Decision #17)                       | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/ai-system-card`                      | AI System Card v0.1 → v1.0 (PRD §14.5 / Decision #18)                            | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/dmca`                                | DMCA designated agent + procedure                                                | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/blog`                                | Lens-owned SEO cluster: "How to audit your AI-generated app" (PRD §15.5)         | anon | `/` → `/blog/[slug]`                     | indexable                                                                                       | same                                                                           |
| `/blog/[slug]`                         | Individual post                                                                  | anon | `/blog` → next-prev                      | indexable; canonical per post                                                                   | same                                                                           |
| `/changelog`                           | Dry, possibly wry release log (Herald §6)                                        | anon | footer                                   | indexable                                                                                       | same                                                                           |
| `/status`                              | Public statuspage mirror (synthetic uptime, incident timeline)                   | anon | footer                                   | indexable; **no analytics gate even pre-consent** (operational transparency)                    | none                                                                           |

**Landing-CTA Hick's-Law note.** The landing baseline at `project-template/studiozero/project/Studio Zero - Landing.html` and Herald's canonical example specify **one primary CTA** ("Run a free Surface audit →") and **one secondary low-friction action** ("See how it works"). That is the locked landing-CTA budget; the heuristic-budget file enforces it (Optic-HB-1).

---

## Auth

All noindex, no marketing cookies, no analytics until session established AND consent granted.

| Path                        | Purpose                                                         | Gate                       | Parent → children                           | SEO                                                                                                            | Consent             |
| --------------------------- | --------------------------------------------------------------- | -------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------- |
| `/signup`                   | Email + OAuth Google + OAuth GitHub                             | anon                       | `/` → `/auth/verify-email`                  | **noindex, nofollow** (per PRD §12 SEO Crits — pricing+canonical rules don't apply but auth flows are private) | session cookie only |
| `/login`                    | Email + magic-link + OAuth                                      | anon                       | `/` → `/app`                                | noindex, nofollow                                                                                              | session cookie only |
| `/login/magic-link/[token]` | Token-handoff page                                              | anon→authed (token in URL) | `/login` → `/app`                           | noindex, nofollow                                                                                              | session cookie only |
| `/login/reset`              | Initiate password reset                                         | anon                       | `/login` → email                            | noindex, nofollow                                                                                              | session cookie only |
| `/login/reset/[token]`      | Set new password                                                | anon (token-bound)         | email → `/login`                            | noindex, nofollow                                                                                              | session cookie only |
| `/auth/callback/google`     | Google OAuth return                                             | anon→authed                | external → `/onboarding/mode` _(or `/app`)_ | noindex, nofollow                                                                                              | session cookie only |
| `/auth/callback/github`     | GitHub OAuth return                                             | anon→authed                | external → `/onboarding/mode`               | noindex, nofollow                                                                                              | session cookie only |
| `/auth/verify-email`        | Gate page for unverified users; resend link CTA                 | authed-unverified          | `/signup` → `/onboarding/mode`              | noindex, nofollow                                                                                              | session only        |
| `/auth/install/github`      | GitHub App install callback (Decision D1, per-repo permissions) | authed                     | external → `/app/projects/new`              | noindex, nofollow                                                                                              | session only        |

**Onboarding mode picker** (Hick's: 3 choices = PASS — see `heuristic-budget.md` HB-2):

| Path                  | Purpose                                           | Gate                                         | Parent → children                                     | SEO               | Consent      |
| --------------------- | ------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | ----------------- | ------------ |
| `/onboarding/mode`    | Pick BYOK / CLI / Managed (PRD §7.1)              | authed-verified, mode=null                   | `/auth/verify-email` → mode-specific                  | noindex, nofollow | session only |
| `/onboarding/byok`    | Paste Anthropic API key (HC5)                     | authed, mode=byok                            | `/onboarding/mode` → `/app`                           | noindex, nofollow | session only |
| `/onboarding/cli`     | Pairing code + install instructions               | authed, mode=cli (Decision D6 — ships in M3) | `/onboarding/mode` → `/cli/handshake` → `/app`        | noindex, nofollow | session only |
| `/onboarding/managed` | Stripe Checkout handoff (HC6 — hosted, not embed) | authed, mode=managed                         | `/onboarding/mode` → `/app/billing/checkout` → `/app` | noindex, nofollow | session only |

---

## App shell — Dashboard

Auth required; tenant-scoped JWT (PRD §13.5). RLS enforces multi-tenant isolation at the DB.

| Path                                  | Purpose                                                             | Gate                                         | Parent → children                        | SEO                                     | Consent                                |
| ------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------- | --------------------------------------- | -------------------------------------- |
| `/app`                                | Dashboard — first-run empty state OR project summary cards          | authed                                       | `/onboarding/*` → `/app/projects`        | **noindex, nofollow** (entire `/app/*`) | session + consent for in-app analytics |
| `/app/projects`                       | Project list                                                        | authed                                       | `/app` → `/app/projects/[id]`            | noindex                                 | session+consent                        |
| `/app/projects/new`                   | Add project — collapses into intake when no project exists (OPT-C1) | authed, payment-valid OR free-tier-available | `/app/projects` → `/app/audits/new`      | noindex                                 | session+consent                        |
| `/app/projects/[project-id]`          | Project detail, audit history, project settings link                | authed, RLS-scoped to tenant                 | `/app/projects` → `/app/audits/[run-id]` | noindex                                 | session+consent                        |
| `/app/projects/[project-id]/audits`   | All runs for this project                                           | same                                         | parent                                   | noindex                                 | session+consent                        |
| `/app/projects/[project-id]/settings` | Per-project settings (display name, URL attestation, archive)       | same, role≥editor _(V2 — single user MVP)_   | parent                                   | noindex                                 | session+consent                        |

### Audit run flow

| Path                                                    | Purpose                                                                            | Gate                                                             | Parent → children                                | SEO                   | Consent                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | --------------------- | --------------------------------------- |
| `/app/audits/new`                                       | **2-step picker** per Optic v0.4 fix (PRD §7.2 Step A+B)                           | authed, free-tier-eligible OR paid-tier-active                   | `/app/projects/new` → `/app/audits/[run-id]`     | noindex               | session+consent                         |
| `/app/audits/[run-id]`                                  | Run detail — live during run, becomes verdict after (PRD §7.2 Step C+D)            | authed, RLS-scoped                                               | `/app/audits/new` → findings/timeline/score tabs | noindex               | session+consent                         |
| `/app/audits/[run-id]/findings`                         | Default tab; filter/group/sort/dismiss (OPT-C4)                                    | same                                                             | parent → `/findings/[finding-id]`                | noindex               | session+consent                         |
| `/app/audits/[run-id]/findings/[finding-id]`            | Single finding deep view; evidence + recommendation + dismiss/undo (OPT-C5)        | same                                                             | parent ↔ siblings                               | noindex               | session+consent                         |
| `/app/audits/[run-id]/timeline`                         | Per-agent live timeline (OPT-C3); `treegrid` per HC8                               | same                                                             | parent                                           | noindex               | session+consent                         |
| `/app/audits/[run-id]/score`                            | Radar chart + semantic `<table>` (HC3)                                             | same                                                             | parent                                           | noindex               | session+consent                         |
| `/app/audits/[run-id]/evidence/[evidence-id]`           | Screenshot / transcript / file evidence viewer; `alt` mandatory (HC4)              | same                                                             | from finding detail                              | noindex               | session+consent                         |
| `/app/audits/[run-id]/upgrade`                          | E2 upsell — Surface → Code (PRD §6.3 E2; Decision D3)                              | same, current SKU=Surface, verdict∈{FAIL,PASS WITH FIXES}        | parent                                           | noindex               | session+consent                         |
| `/app/audits/[run-id]/share/[share-token]` _(proposed)_ | PASS share page (PRD §7.2 Step D primary CTA on PASS)                              | **token-gated, anon-reachable**; CLI-mode shows watermark per D7 | parent                                           | noindex but tokenized | none on the share view; tracked via UTM |
| `/app/audits/[run-id]/pr/[pr-id]` _(V1.5)_              | Auto-PR tracker (PRD §11.2)                                                        | authed, V1.5 feature flag, Code/Pro tier                         | parent                                           | noindex               | session+consent                         |
| `/app/audits/[run-id]/re-audit` _(proposed)_            | Free re-audit redemption (PRD §6.3 E3/E4 + Decision #8 superseded by Decision #20) | same, within 30-day window                                       | parent                                           | noindex               | session+consent                         |

### Notifications

| Path                 | Purpose                                                                          | Gate   | Parent → children                                | SEO     | Consent         |
| -------------------- | -------------------------------------------------------------------------------- | ------ | ------------------------------------------------ | ------- | --------------- |
| `/app/notifications` | In-app drawer route per OPT-M1; persistent so a closed tab doesn't lose the link | authed | header bell → individual notification deep-links | noindex | session+consent |

### Settings (IA per OPT-M3 — 3 groups, ≤7 items per group)

| Path                                   | Purpose                                                                                           | Gate                             | Parent → children               | SEO     | Consent         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------- | ------- | --------------- |
| `/app/settings`                        | Index — 3 groups (Account / Integrations / Billing & Data)                                        | authed                           | `/app` → group children         | noindex | session+consent |
| `/app/settings/account`                | Profile, email, password                                                                          | authed                           | parent                          | noindex | session+consent |
| `/app/settings/account/notifications`  | In-app + email + (V1.5) webhook preferences (OPT-M1)                                              | authed                           | parent                          | noindex | session+consent |
| `/app/settings/account/consent`        | Cookie + AI-training opt-in + analytics granularity (PRD §6.1, §14.4)                             | authed                           | parent                          | noindex | session+consent |
| `/app/settings/account/export`         | GDPR Art. 20 JSON export (PRD §14.4)                                                              | authed                           | parent                          | noindex | session+consent |
| `/app/settings/account/delete`         | GDPR Art. 17 — destructive, requires re-auth (SC 3.3.8) + 14-day reverse window                   | authed                           | parent → confirmation modal     | noindex | session+consent |
| `/app/settings/integrations/byok`      | BYOK key entry, show/hide, last-validated timestamp (HC5; OPT-M3 H6)                              | authed, mode=byok                | parent                          | noindex | session+consent |
| `/app/settings/integrations/cli`       | Paired CLI devices list, revoke (PRD §6.4)                                                        | authed                           | parent                          | noindex | session+consent |
| `/app/settings/integrations/github`    | GitHub App install/uninstall, repo permissions (Decision D1)                                      | authed                           | parent → `/auth/install/github` | noindex | session+consent |
| `/app/settings/billing/plan`           | Plan switcher (PRD §12)                                                                           | authed, payment-state≠trial-only | parent                          | noindex | session+consent |
| `/app/settings/billing/invoices`       | Stripe invoice list                                                                               | authed                           | parent                          | noindex | session+consent |
| `/app/settings/billing/payment-method` | Stripe Customer Portal redirect (HC6)                                                             | authed                           | parent                          | noindex | session+consent |
| `/app/settings/billing/cancel`         | FTC Click-to-Cancel UI compliance (Decision #20) — same UI difficulty as signup, no dark patterns | authed                           | parent → confirmation           | noindex | session+consent |
| `/app/settings/billing/dispute`        | Dispute Finding path before chargeback escalation (Decision #20)                                  | authed, paid-tier                | parent                          | noindex | session+consent |
| `/app/settings/data/retention`         | 0–30 day customer override slider (PRD §14.4)                                                     | authed                           | parent                          | noindex | session+consent |
| `/app/settings/data/findings-export`   | Findings JSON+CSV download (HC4 readable; SC 1.1.1)                                               | authed                           | parent                          | noindex | session+consent |
| `/app/settings/team` _(V2)_            | Team members — feature-flagged off at M5 per PRD §4 non-goals                                     | authed, feature-flag=team_v2     | parent                          | noindex | session+consent |

**Settings IA verdict.** 3 groups; Account = 5 panels; Integrations = 3; Billing & Data = 7. Max 7 within a group, ≤3 groups visible at once — clears Miller 7±2 (heuristic-budget HB-3).

### Billing

| Path                    | Purpose                                              | Gate                              | Parent → children            | SEO     | Consent         |
| ----------------------- | ---------------------------------------------------- | --------------------------------- | ---------------------------- | ------- | --------------- |
| `/app/billing/checkout` | Stripe Checkout return URL (HC6 — hosted, not Embed) | authed, mode=managed OR upgrading | external → `/app/audits/new` | noindex | session+consent |
| `/app/billing/upgrade`  | Plan-upgrade picker (in-app entry point)             | authed                            | parent                       | noindex | session+consent |

---

## Admin

Role-gated `role=admin`. **robots.txt disallows `/admin/*`**. All routes audit-logged per PRD §14.3 / §13.2.

| Path                         | Purpose                                              | Gate  | Parent → children        | SEO                                    | Consent      |
| ---------------------------- | ---------------------------------------------------- | ----- | ------------------------ | -------------------------------------- | ------------ |
| `/admin`                     | Admin dashboard                                      | admin | — → children             | **noindex, nofollow, robots-disallow** | session only |
| `/admin/runs`                | All runs across tenants                              | admin | parent → `/runs/[id]`    | noindex                                | session only |
| `/admin/runs/[run-id]`       | Per-run admin view                                   | admin | parent                   | noindex                                | session only |
| `/admin/users`               | User list                                            | admin | parent → `/users/[id]`   | noindex                                | session only |
| `/admin/users/[user-id]`     | User detail, impersonate-with-attestation            | admin | parent                   | noindex                                | session only |
| `/admin/tenants`             | Tenant list                                          | admin | parent → `/tenants/[id]` | noindex                                | session only |
| `/admin/tenants/[tenant-id]` | Tenant detail (RLS bypass for support, audit-logged) | admin | parent                   | noindex                                | session only |
| `/admin/financial`           | Revenue, churn, Stripe events (PRD §15)              | admin | parent                   | noindex                                | session only |
| `/admin/audit-action-log`    | Audit log of admin actions (PRD §14.3)               | admin | parent                   | noindex                                | session only |
| `/admin/breach-events`       | Art. 33 72h notification log (PRD §13.2)             | admin | parent                   | noindex                                | session only |

---

## Error & system pages

H9 (error recovery): every error page has _what happened, why, what to do next, where to go_. H1: clear status. SC 2.4.6 (page-title): each carries a meaningful `<title>`.

| Path       | Trigger                                                            | Gate   | Parent → children                             | SEO                                      | Consent      |
| ---------- | ------------------------------------------------------------------ | ------ | --------------------------------------------- | ---------------------------------------- | ------------ |
| `/401`     | Auth required, no session                                          | anon   | — → `/login` (preserved next-URL)             | noindex                                  | none         |
| `/403`     | Authed but role denies access (admin route, wrong tenant)          | authed | — → `/app`                                    | noindex                                  | session only |
| `/404`     | Route does not exist                                               | any    | — → `/` or `/app` (state-aware)               | noindex                                  | unchanged    |
| `/410`     | Project / run was deleted (vs. not-found, per H9 spec specificity) | any    | — → `/app/projects`                           | noindex                                  | unchanged    |
| `/429`     | Rate-limited (per IP / per tenant — PRD §14.3)                     | any    | — → retry-after + support link                | noindex                                  | unchanged    |
| `/500`     | Server error (Sentry captures, beforeSend PII-scrubbed)            | any    | — → `/status`                                 | noindex                                  | unchanged    |
| `/503`     | Maintenance / outage                                               | any    | — → `/status`                                 | noindex; **honors `Retry-After` header** | unchanged    |
| `/offline` | PWA: browser is offline                                            | any    | — → cached previous page when network returns | noindex                                  | none         |

---

## Mode-specific surfaces

| Path                                                    | Purpose                                                                                               | Gate                                  | Parent → children            | SEO               | Consent         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------- | ----------------- | --------------- |
| `/cli/handshake`                                        | CLI ↔ web pairing code display + verification (PRD §6.4 / §17 D6)                                    | authed, mode=cli, paired=false        | `/onboarding/cli` → `/app`   | noindex, nofollow | session only    |
| `/app/cli/offline` _(modal-as-route)_                   | "Reconnect your CLI" state when paired CLI goes offline mid-run (OPT-m5; empty-states ES-CLI-OFFLINE) | authed, mode=cli, cli=offline         | parent app shell             | noindex           | session+consent |
| `/app/billing/token-budget-exceeded` _(modal-as-route)_ | Managed-mode token cap hit (PRD §13.5 / §19 risk #1)                                                  | authed, mode=managed, budget=exceeded | parent → `/app/billing/plan` | noindex           | session+consent |
| `/app/billing/free-tier-exhausted` _(modal-as-route)_   | Free tier limit reached (PRD §12 Decision D2 — 1 project; abuse safeguards)                           | authed, plan=free, limit=hit          | parent → `/pricing`          | noindex           | session+consent |

> **Pattern note.** _Modal-as-route_ means the modal opens over the parent shell and the URL updates (so a back button works — H3 user control & freedom). The URL is shareable but the data behind it is RLS-scoped.

---

## Legal / docs (consolidated)

Already enumerated in Marketing section above. Cross-references:

- `/privacy`, `/terms`, `/aup`, `/subprocessors`, `/dpa`, `/ai-system-card`, `/dmca`, `/accessibility`.
- Plain-English summary at top of every legal page per Herald §6 ("What this means in plain English: …").

---

## System

| Path           | Purpose                                                                          | Gate                    | Parent → children | SEO                          | Consent                         |
| -------------- | -------------------------------------------------------------------------------- | ----------------------- | ----------------- | ---------------------------- | ------------------------------- |
| `/healthz`     | Health endpoint for monitoring                                                   | admin OR allowlisted-IP | —                 | **noindex; robots-disallow** | none                            |
| `/status`      | Public statuspage mirror                                                         | anon                    | footer            | indexable                    | none (operational transparency) |
| `/robots.txt`  | Allow marketing, disallow `/app`, `/admin`, `/healthz`, all `/auth/*` callbacks  | n/a                     | n/a               | n/a                          | n/a                             |
| `/sitemap.xml` | Only marketing + legal + blog routes; never `/app/*`, never tokenized share URLs | n/a                     | n/a               | indexed                      | n/a                             |

---

## SEO posture summary (PRD §12 SEO Crits)

- **Indexable & canonical**: marketing + legal + blog + `/status` + `/accessibility` + `/ai-system-card` + `/pricing`.
- **`noindex, nofollow`**: every `/app/*`, every `/admin/*`, every `/auth/*` and `/onboarding/*`, every error page, every system page except `/status`.
- **Tokenized share URLs** (`/app/audits/[run-id]/share/[token]`) — `noindex`; not in sitemap; token has 90-day expiry default with customer override (proposed).
- **`/pricing` canonical** = exactly one URL — no `?ref=` canonical drift; UTM allowed via query string but canonical=`/pricing` stripped (PRD §12 SEO Crits).
- Structured data: `Product`+`Offer` on `/pricing`; `Article` on `/blog/[slug]`; `Organization` site-wide.

---

## Cookie/consent gating (PRD §6.1, §13.6, §14.4)

Three tiers:

1. **Necessary** (session cookies, CSRF, RLS tenant id) — set on first paint, no consent needed.
2. **Analytics** (PostHog) — fires only after `consent.analytics=true`; pre-consent events buffered ≤30 min then discarded.
3. **Marketing** (UTM/attribution) — fires only after `consent.marketing=true`.

A11y of the consent banner is owned by Halo at Phase 4; IA constraint here: the banner is **a non-modal landmark at the bottom of `<body>`** so it doesn't trap focus (SC 2.1.2 No Keyboard Trap) and doesn't obscure focused inputs (SC 2.4.11 Focus Not Obscured Minimum). Affordances: Accept all / Reject all / Customize — exactly 3 choices, peer-weighted (Hick's: 3 = PASS; HB-8 in `heuristic-budget.md`).

---

## Open questions for Trace (user-flows)

- Q1. Onboarding step order when GitHub install is required to run any audit on a free-tier signup — does `/auth/install/github` come before or after `/onboarding/byok`? My read: **after** mode pick, **before** first intake; flow tightening is Trace's call.
- Q2. The `/app/audits/[run-id]/upgrade` E2 upsell — modal or full route? I have it as a full route for accessibility-of-back-button (SC 2.4.11). Trace can override if the flow argues differently.
- Q3. Re-audit redemption — `/re-audit` subpath of the run, or a top-level `/app/projects/[id]/re-audit`? I have it scoped to a run. Trace's flow on E3/E4 wins if it changes.

---

_End of sitemap v0.1. Optic — Audit Layer._
