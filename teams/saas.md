# Team — SaaS Platform

## Purpose
Default roster for multi-tenant SaaS builds: subscriptions, auth, admin dashboard, observability, compliance baseline. Use this for any product with paid users, accounts, and data Jo needs to ship to customers.

Stack: Next.js 15 + Supabase + Stripe + Clerk/Supabase Auth + Tailwind + shadcn/ui (per `protocols/code-standards.md`).

## Phases

### Phase 1 — Strategy & Design (parallel within phase)
| Agent | Role |
|---|---|
| `axiom` | PRD, MVP scope, user stories |
| `scout` | Competitor & market research |
| `penny` | Pricing tiers, billing model, unit economics |
| `sprint` | Project plan, dependencies, deadlines |
| `canvas` | UI/UX design system, layout, component design |
| `flow` | Personas, journey maps (design-time) |
| `pixel` | Brand identity, color, typography, OG/social assets |
| `motion` | Transitions, micro-interactions |

**Outputs:** `shared_context/projects/<slug>/{strategy/, design/}`

### Phase 2 — Foundation (Data + Backend + Security)
| Agent | Role |
|---|---|
| `atlas` | Postgres schema, multi-tenant model with RLS |
| `keeper` | Backups, GDPR data export/deletion, retention policy |
| `vault` | Auth, sessions, permissions, RBAC |
| `cipher` | Encryption, secrets, PII redaction |
| `verify` | Dependency SBOM, CVE baseline, license audit |
| `forge` | Backend architecture, service boundaries |
| `nexus` | API endpoints (REST/GraphQL), webhooks |
| `bridge` | 3rd-party integrations (Stripe, Resend, OAuth providers) |
| `queue` | Async jobs, scheduled tasks |

**Depends on:** Phase 1 (Atlas needs Axiom's PRD)
**Outputs:** `shared_context/projects/<slug>/{data/, backend/, security/}`

### Phase 3 — Interface (Frontend)
| Agent | Role |
|---|---|
| `arch` | Frontend architecture, framework setup, state management |
| `vega` | UI components, screens, forms |
| `touch` | Mobile/PWA layouts, touch targets, responsive |
| `prism` | Performance — bundle size, Core Web Vitals |
| `access` | Accessibility implementation (WCAG AA) |

**Depends on:** Phase 1 (designs), Phase 2 (API contracts)
**Outputs:** `shared_context/projects/<slug>/frontend/`

### Phase 4 — Hardening (Quality + DevOps)
| Agent | Role |
|---|---|
| `probe` | Unit + integration test suites, CI gates |
| `crash` | Load testing (k6), scale baselines |
| `ghost` | Exploratory testing — technical edge cases |
| `pipeline` | CI/CD on GitHub Actions, preview deploys |
| `terra` | Infrastructure-as-code, provisioning |
| `watch` | Observability dashboards, alerts |
| `chronicle` | Structured logging, audit trail |
| `siren` | Incident response, on-call, runbooks |
| `meter` | FinOps — $/request, cost dashboards, regression gates |

**Depends on:** Phases 1–3
**Outputs:** `shared_context/projects/<slug>/{tests/, devops/}`

### Phase 5 — Intelligence (only if AI features in scope)
| Agent | Role |
|---|---|
| `cortex` | LLM integration, prompts, model selection |
| `memory` | Vector DB, RAG, embeddings |
| `oracle` | Eval suites, red-team, hallucination/grounding checks |

**Conditional:** include only when PRD lists AI features

### Phase 6 — Launch (Docs + Growth + Operations)
| Agent | Role |
|---|---|
| `scribe` | Tech docs, README, architecture, contributing |
| `guide` | In-app microcopy, help articles, error messages |
| `signal` | SEO, sitemap, structured data, OG tags |
| `lens` | PostHog funnels, drop-off analytics |
| `herald` | Landing copy, email sequences, social posts |
| `hook` | A/B tests on conversion-critical components |
| `echo` | Support macros, ticket triage |
| `ledger` | Stripe verification, dunning, financial reconciliation |
| `comply` | Privacy policy, ToS, GDPR/CCPA compliance |

**Depends on:** Phases 1–4

### Phase 7 — Audit (the gate)
Run via: `node audit-run.js <slug> "..."` — see `teams/audit.md`. **No production deploy without `PASS` or `PASS WITH FIXES`.**

## Conditional Agents
- `tongue` — only if multi-locale launch
- `edge` — only if global CDN / multi-region needed at launch
- `stream` — only if realtime features (live updates, collab) in PRD
- `locale` — only if i18n in scope

## Required Inputs
- Brief from BigBrain
- Defined target audience (primary persona)
- `CAPABILITIES.md` (auto-injected)
