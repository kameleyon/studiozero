# Studio Zero Implementation Roadmap

**Mission:** Turn Studio Zero into a top-tier Full Stack and SaaS development factory — capable of shipping anything from a basic website to a mobile app, an e-commerce store, a blog, a gaming title, or a VR experience.

**Director:** BigBrain
**Owner:** Jo
**Host:** Windows Server 2022 Datacenter
**Toolchains live:** Node 24.15, Swift 6.0.3, Python — see `CAPABILITIES.md`

---

## Phase 1: Core Spawning Mechanism
- [x] Identify working OpenClaw sub-agent command
- [x] Successfully spawn one test agent (Cortex) and return a verified response

## Phase 2: The Orchestrator
- [x] Build a stable execution script (Node.js/TS or native OpenClaw script) that reads `catalog.json`
- [x] Map agent names to their specific markdown instructions dynamically
- [x] Ensure terminal quotes and newlines are safely escaped during handoffs

## Phase 3: Agent Tooling & Permissions
- [x] Grant agents file system access to edit actual code (read/write/exec)
- [x] Set up a shared context directory so agents can read each other's outputs

## Phase 4: Multi-Agent Workflow
- [x] Test a layered handoff: Axiom (Strategy) -> Forge (Backend) -> Cortex (AI)
- [x] Implement a final review loop for Quality/Security agents

---

## Phase 5: Capability Awareness (foundational — unblocks everything below)
- [x] Create `CAPABILITIES.md` registry (toolchains, product types, environment limits)
- [x] Patch `task.js` to auto-inject `CAPABILITIES.md` into every agent spawn
- [x] Update `protocols/code-standards.md` with Swift + mobile + gaming + VR tech preferences
- [ ] Backfill each agent's `.md` file with a one-liner: "consult CAPABILITIES.md before proposing tools"
- [ ] Add a sanity-check agent command: `node task.js axiom "confirm you can see CAPABILITIES.md"`
- [x] Resolve naming collision: agent named `swift` (Mobile/PWA) vs Swift language — renamed to `touch` (2026-05-09).

## Phase 6: Native Toolchain Integration — Swift
- [x] Install Swift toolchain on host (Swift 6.0.3)
- [x] **Decision (2026-05-09): stay on 6.0.3.** No project demands 6.3.1 features; manual installer is real overhead; revisit if a Swift project hits a 6.3.1-only API.
- [ ] Install VS Code Swift extension for in-editor debugging on Windows
- [ ] Create `templates/swift-cli/` — blueprint for a Swift executable package _(deferred — `templates/native-ios/` covers SwiftUI; CLI scaffold added when first Swift CLI project arrives)_
- [ ] Create `templates/swift-vapor/` — blueprint for a Swift server (Vapor) _(deferred — Forge owns server-Swift now per the decision below; templated when first Vapor project arrives)_
- [x] Create `templates/native-ios/` — SwiftUI + SPM scaffold (multi-platform iOS/visionOS/macOS; flagged macOS-only for device builds)
- [x] **Decision (2026-05-09): extend `forge` with server-Swift responsibility** (NOT a new `reed`/`xcode` agent). Lighter than a new persona; matches Forge's existing cross-layer engineering scope; revisit if Swift project volume justifies a split.
- [x] Document macOS/Xcode handoff: `templates/native-ios/README.md` + `teams/native-ios.md` make this explicit; `BIGBRAIN.md` rules require flagging to Jo before work starts

## Phase 7: SaaS Infrastructure Pack
- [x] **Tenant isolation model: Option A confirmed (2026-05-09).** RLS single-DB, tenant_id-scoped. Right call for ~95% of B2B SaaS. Revisit at first enterprise contract demanding stricter isolation (schema-per-tenant or DB-per-tenant).
- [x] Template: multi-tenant Supabase schema with tenant_id + RLS policies — `templates/_saas-infra-pack/tenants/`
- [x] Template: Stripe billing integration (subscriptions, dunning, customer portal) — `templates/_saas-infra-pack/stripe/`
- [x] Template: auth flows (email/pw, magic link, OAuth) — `templates/_saas-infra-pack/auth/`
- [ ] **Template: admin dashboard — DEFERRED (2026-05-09).** Admin UIs are too product-specific to template usefully (what fields, what access levels, what filters, what graphs). Vega builds per project. Revisit if 3+ projects share patterns.
- [x] Template: feature flag system — `templates/_saas-infra-pack/feature-flags/` (PostHog default, fail-closed)
- [x] Baseline observability: Sentry + PostHog + structured logger — `templates/_saas-infra-pack/observability/`
- [x] GDPR / CCPA boilerplate — `templates/_saas-infra-pack/gdpr/`
- [x] Transactional email baseline via Resend — `templates/_saas-infra-pack/email/`

## Phase 8: Product-Vertical Readiness
Each vertical gets its own scaffold + a QA checklist. A project starts by copying the matching template.

- [ ] **Website** — Astro + Tailwind template with SEO, sitemap, RSS, OG images
- [ ] **Blog / publication** — Astro + MDX + content collections + comment system
- [ ] **Web application** — React 19 + Vite + Supabase + shadcn/ui starter
- [ ] **SaaS platform** — Next.js 15 + everything from Phase 7 pre-wired
- [ ] **E-commerce** — Next.js + Shopify Hydrogen OR Medusa.js starter + Stripe
- [ ] **Mobile (cross-platform)** — Expo starter with nav, auth, push notifications
- [ ] **Mobile (native iOS/visionOS)** — SwiftUI starter (flagged: macOS-only build)
- [ ] **PWA** — Vite + Workbox + manifest + offline-first starter (Touch agent owns)
- [ ] **Gaming (web)** — Three.js + React Three Fiber starter with physics
- [ ] **Gaming (native)** — Godot OR Unity project scaffold + CI pipeline
- [ ] **VR / XR** — WebXR starter (Three.js + @react-three/xr) + room-scale demo

## Phase 9: Team Presets (populate empty `teams/` directory)
- [ ] `teams/saas.md` — default agent roster for a SaaS build
- [ ] `teams/ecommerce.md` — roster tuned for storefront + checkout + inventory
- [ ] `teams/mobile.md` — roster for cross-platform mobile
- [ ] `teams/native-ios.md` — roster emphasizing Swift + SwiftUI
- [ ] `teams/gaming.md` — lean roster (Arch, Vega, Motion, Probe, Crash, Watch)
- [ ] `teams/vr.md` — roster with Access (a11y in XR matters) + Prism (perf critical)
- [ ] `teams/blog.md` — minimal roster (Axiom, Scribe, Signal, Herald, Arch, Vega)
- [ ] `teams/marketing-site.md` — sprint-style roster for landing pages

## Phase 10: Quality Gates & Verification
- [ ] Per-vertical QA checklists (Core Web Vitals, WCAG AA, security OWASP top 10, Stripe PCI posture)
- [ ] Auto-run Lighthouse on every web build
- [ ] Auto-run `swift test` on every Swift package
- [ ] `probe` agent wires Playwright E2E into every template
- [ ] `crash` agent wires k6 load tests with sensible baselines
- [ ] `shield` agent runs `npm audit` + `osv-scanner` on every dependency change

## Phase 11: DevOps & Release
- [ ] GitHub Actions workflow templates per vertical
- [ ] `pipeline` agent wires preview deploys on every PR
- [ ] `terra` agent produces Infrastructure-as-Code (Supabase config, Vercel project) per vertical
- [ ] Release checklist: migrations reviewed, feature flag toggled, rollback plan documented

## Phase 12: Growth, Docs, Operations (launch readiness)
- [ ] `scribe` agent auto-generates README, ARCHITECTURE, and CONTRIBUTING per project
- [ ] `guide` agent auto-generates help center articles from feature PRDs
- [ ] `signal` agent bakes SEO + structured data into every website/SaaS template
- [ ] `lens` agent pre-configures PostHog funnels for each vertical
- [ ] `herald` agent produces launch copy (landing page + email sequence + social posts)
- [ ] `ledger` agent verifies Stripe dashboard matches product pricing before launch
- [ ] `comply` agent signs off on privacy policy + TOS + AI disclosures

## Phase 13: Studio Zero Meta (self-improvement)
- [ ] Capture every completed project as a case study in `shared_context/projects/`
- [ ] Review agent outputs monthly — retire / merge / split agents as patterns emerge
- [ ] Add a `metrics.json` — time-to-ship, defect rate, agent contention points
- [ ] Quarterly: re-read CAPABILITIES.md, upgrade stale toolchains, prune unused templates
