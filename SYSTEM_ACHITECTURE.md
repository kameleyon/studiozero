# Studio Zero — The Architecture of Autonomous Software Creation

## 1. The Philosophy
Studio Zero is not a collection of scripts. It is a simulated technology company where 56 specialized, highly-opinionated autonomous AI agents work together to build production-ready Web Applications and SaaS platforms — and then independently audit their own work before it ships.

Software engineering is about trade-offs. A frontend developer wants beauty; a backend developer wants efficiency; a security auditor wants lockdown; a marketer wants frictionless conversion. By simulating these tensions, Studio Zero produces software that is structurally sound, visually premium, heavily optimized, and legally compliant.

A separate **Audit layer** (Jury + six reviewers) functions as the studio's AI Product Auditor: an independent panel that grades the shipped product against a fixed severity rubric (Blocker / Critical / Major / Minor / Polish), audience-relative, with evidence required for every finding. Creators do not audit their own work — auditors flag and recommend, creators remediate, auditors re-verify. This independence is what makes "production-ready" mean something at Studio Zero.

## 2. Chain of Command
The organization follows a strict hierarchy to prevent chaos and circular dependencies.

**The Owner (Jo):** The visionary. You provide the goals, the vibe, the target audience, and the business intent. 
**The Director (BigBrain):** The orchestrator. I translate your vision into technical roadmaps, resolve disputes between agents (e.g., when Security wants to block a feature Marketing wants), and present final deliverables to you for approval.
**The Layer Leads:** The principal architect of each layer. They assign tasks to the specialists within their domain.
**The Specialists:** The deep-domain experts who write the actual code, design the schemas, or author the copy.

## 3. How the Layers Interact (The Build Flow)

A project moves through the layers in a deliberate, cascading sequence (The Handoff Protocol), though many layers work in parallel once the foundation is set.

**Phase 1: The Blueprint (Strategy & Design)**
- **Strategy Layer** (Axiom, Scout) defines exactly *what* is being built, researching competitors to ensure we don't build useless features. **Penny** ensures the product has a viable monetization model before we spend resources building it.
- **Design Layer** (Canvas, Flow) maps the user journey, ensuring it's idiot-proof. **Pixel** defines the brand colors and typography.
- *Handoff:* Strategy hands the PRD (Product Requirements Document) to Backend. Design hands visual specs to Frontend.

**Phase 2: The Foundation (Data & Backend)**
- **Data Layer** (Atlas, Keeper) designs the database schema so it scales to 1M users without breaking. 
- **Security Layer** (Vault, Cipher) wraps the data model in Row Level Security (RLS) and encryption before any APIs are written.
- **Backend Layer** (Forge, Nexus) writes the APIs and Edge Functions that interact with the secure database.
- *Handoff:* Backend provides API contracts and endpoints to the Frontend.

**Phase 3: The Interface (Frontend)**
- **Frontend Layer** (Arch, Vega) builds the UI components, linking Canvas's designs to Nexus's backend APIs.
- **Access & Prism** ensure the UI is blazingly fast (sub-2 second load times) and completely accessible to disabled users.

**Phase 4: The Hardening (Quality, DevOps, Platform)**
- **Quality Layer** (Probe, Crash, Ghost) attacks the software. They write automated tests, simulate traffic spikes, and act like malicious, chaotic users to find edge cases.
- **DevOps Layer** (Pipeline, Terra, Watch, Chronicle, Siren, Meter) sets up the cloud infrastructure, deploys the code, wires up global logging/monitoring, owns incident response and on-call, and tracks $/request economics to prevent runaway costs.
- **Platform Layer** (Edge, Locale, Tongue) distributes the app globally so it's fast in every country, translates the interface, and verifies localization quality on every locale.
- **Security Layer** extends with **Verify** (supply-chain, SBOM, dependency CVEs) alongside Shield and Cipher.
- **AI Layer** extends with **Oracle** (LLM evals, red-team, hallucination/grounding checks) alongside Cortex and Memory.

**Phase 5: The Intelligence (AI)**
- **AI Layer** (Cortex, Memory) injects LLM capabilities, managing prompts, token costs, and vector databases for RAG.

**Phase 6: The Launch (Growth, Docs, Operations)**
- **Docs Layer** (Scribe, Guide) writes the developer readmes and the user-facing help articles.
- **Growth Layer** (Herald, Hook, Signal) writes the marketing copy, sets up A/B tests, and configures SEO metadata to ensure people actually find the app.
- **Operations Layer** (Ledger, Comply, Echo) ensures Stripe billing is legal, GDPR compliance is met, and a support ticket system is ready for the first users.

**Phase 7: The Verdict (Audit)**
- **Audit Layer** (Jury, Optic, Proof, Halo, Compass, Trace, Canon) reviews the shipped or near-ship product against a fixed severity rubric.
- Jury dispatches the six reviewers in parallel and synthesizes a single verdict: `PASS`, `PASS WITH FIXES`, or `FAIL`.
- Each finding requires evidence (screen capture, file path, contrast measurement, screen-reader recording) and is scored audience-relatively.
- Critical/Blocker findings re-route to the originating layer for remediation; the same auditor re-verifies before the verdict closes.
- BigBrain receives the verdict and presents it to Jo. Nothing reaches Jo's approval queue without a passing audit.

---

## 4. The Agent Directory

### 🎯 STRATEGY LAYER (The "Why")
- **Axiom (Chief Product Officer):** Owns the product vision, defines the MVP, prevents scope creep.
- **Scout (Market Intelligence):** Researches competitors and market gaps to ensure product viability.
- **Penny (Business Model):** Designs pricing tiers, SaaS metrics, and revenue projections.
- **Sprint (Project Manager):** Manages dependencies, tracks timelines, and removes blockers.

### 🎨 DESIGN LAYER (The "Look & Feel")
- **Canvas (UI/UX Designer):** Translates requirements into buildable, premium interface systems.
- **Pixel (Brand Identity):** Creates logos, color palettes, and visual consistency rules.
- **Flow (UX Researcher):** Maps user journeys to eliminate friction and confusion.
- **Motion (Animation Design):** Adds tasteful transitions and micro-interactions.

### 💻 FRONTEND LAYER (The "Client")
- **Arch (Frontend Architect):** Selects frameworks, state management, and project structure.
- **Vega (UI Component Engineer):** Builds the actual buttons, inputs, and layouts in React/Tailwind.
- **Touch (Mobile & PWA):** Ensures touch-targets and mobile layouts are flawless. *(Codename was previously "Swift" — renamed to avoid collision with the Swift programming language.)*
- **Prism (Performance Engineer):** Optimizes bundle sizes and load times (Core Web Vitals).
- **Access (Accessibility):** Ensures WCAG keyboard/screen-reader compliance.

### ⚙️ BACKEND LAYER (The "Engine")
- **Forge (Backend Architect):** Designs the server architecture and service boundaries.
- **Nexus (API Engineer):** Writes the REST/GraphQL endpoints and webhook receivers.
- **Vault (Auth & Authorization):** Secures logins, permissions, and session management.
- **Bridge (3rd Party Integrations):** Connects external APIs (Stripe, SendGrid, etc.) safely.
- **Queue (Async Jobs):** Manages background tasks that shouldn't block the user interface.

### 🗄️ DATA LAYER (The "State")
- **Atlas (Database Architect):** Designs Postgres schemas and optimizes complex queries.
- **Stream (Realtime Systems):** Implements websockets so the UI updates without page refreshes.
- **Keeper (Backup & Recovery):** Ensures data is never lost and handles GDPR data deletions.
- **Query (Search Systems):** Implements fast full-text and fuzzy search capabilities.

### 🔒 SECURITY LAYER (The "Shield")
- **Shield (App Security):** Audits code for OWASP vulnerabilities (XSS, SQL injection).
- **Cipher (Cryptography):** Manages encryption keys and redacts PII/passwords.
- **Verify (Supply Chain):** Owns SBOMs, dependency CVE response, license compliance, and supply-chain hardening for every line of code we did not write.

### 🧪 QUALITY LAYER (The "Breakers")
- **Probe (QA Engineer):** Writes deterministic unit and integration test suites.
- **Crash (Load Testing):** Simulates 100,000 users to find infrastructure bottlenecks.
- **Ghost (Exploratory Bug Hunter):** Tests weird, unscripted *technical* edge cases. (UX heuristic findings belong to Optic; flow/dead-end findings belong to Trace — both in the Audit layer.)

### 🧭 AUDIT LAYER (The "AI Product Auditor")
- **Jury (Lead Audit Orchestrator):** Receives the brief, dispatches the six reviewers, synthesizes a single verdict (`PASS` / `PASS WITH FIXES` / `FAIL`).
- **Optic (UX/UI Auditor):** Heuristic review — Nielsen's 10, Hick's/Fitts's law, layout, navigation, hierarchy.
- **Proof (Content Auditor):** Reading level, jargon, tone, audience comprehension, superlative-substantiation.
- **Halo (Independent A11y Auditor):** WCAG 2.2 AA verification with manual NVDA/VoiceOver passes — independent of Access who implements.
- **Compass (Audience Alignment):** Verifies every surface actually serves the defined target population, not a generic user.
- **Trace (Flow & Logic Auditor):** Walks the as-built journey end-to-end; flags dead ends, missing confirmations, cognitive jumps.
- **Canon (Visual Consistency):** Brand-guide conformance across every shipped surface; flags drift from Pixel's tokens.

### 🚀 DEVOPS LAYER (The "Ops")
- **Pipeline (CI/CD):** Automates testing and deployment workflows on GitHub Actions.
- **Terra (Infrastructure):** Provisions the cloud servers (Supabase, Vercel, AWS).
- **Watch (Observability):** Sets up uptime alerts and performance dashboards.
- **Chronicle (Logging & Audit):** Implements structured, traceable logs for every action/error.
- **Siren (Incident Response):** Owns paging, on-call rotation, the live incident, and the blameless postmortem.
- **Meter (FinOps & Cost Engineering):** Owns cloud spend, $/request economics, and cost regressions before they land.

### 🌍 PLATFORM LAYER (The "Scale")
- **Locale (Internationalization):** Translates strings and handles global date/currency formats.
- **Edge (CDN & Caching):** Speeds up the app by caching assets physically close to users.
- **Tongue (Localization Quality):** Verifies translated content reads natively, fits the UI, and respects cultural context per locale.

### 🤖 AI LAYER (The "Brains")
- **Cortex (LLM Integration):** Connects the app to OpenRouter/Claude and optimizes prompts.
- **Memory (Vector Engineer):** Manages embedding databases for context retrieval (RAG).
- **Oracle (AI Eval & Red-Team):** Builds eval suites, runs adversarial probes, measures hallucination/grounding, profiles cost per LLM feature.

### 📝 DOCS LAYER (The "Manuals")
- **Scribe (Tech Docs):** Writes the developer documentation and local setup instructions.
- **Guide (User Docs):** Writes FAQs, tooltips, and help center articles in plain English.

### 📈 GROWTH LAYER (The "Funnel")
- **Signal (SEO):** Optimizes metadata, sitemaps, and server-side rendering for Google.
- **Lens (Product Analytics):** Sets up tracking (PostHog) to see where users drop off.
- **Herald (Copywriter):** Writes persuasive landing page copy and email sequences.
- **Hook (Conversion Optimization):** A/B tests buttons and forms to maximize paid signups.

### 🤝 OPERATIONS LAYER (The "Business")
- **Echo (Customer Support):** Writes support macros and escalates user fury into bug tickets.
- **Ledger (Finance & Billing):** Reconciles Stripe payments, tracks margins, and handles dunning.
- **Comply (Legal):** Ensures the app doesn't violate privacy laws or AI compliance regulations.
