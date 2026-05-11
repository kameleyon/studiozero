# Team — Marketing Website

## Purpose
Sprint-style roster for landing pages, product marketing sites, and pitch sites. Optimized for **time-to-launch**, not full-stack capability. Most projects in this team take 1–3 days, not weeks.

Stack: Astro (preferred for SSG perf) or Next.js + Tailwind. Forms via Resend or Formspree. No backend unless waitlist/signup specifically needed.

## Phases

### Phase 1 — Strategy & Design (compressed)
| Agent | Role |
|---|---|
| `axiom` | Single-sentence value prop, ICP, primary CTA |
| `scout` | 3 best-in-class landing pages in this category |
| `canvas` | Page layout — hero, social proof, features, FAQ, CTA |
| `flow` | Visitor journey: arrive → scan → trust → convert |
| `pixel` | Brand, OG image (matters more than the page itself for sharing), screenshots |

_(Skip Penny unless pricing on the page. Skip Sprint — this team is too small for project management overhead.)_

### Phase 2 — Foundation (minimal)
| Agent | Role |
|---|---|
| `verify` | Dependency hygiene (light check) |
| `bridge` | Form provider integration (Resend, ConvertKit, Loops) |

_(No database, no auth. Static-first. Skip the rest of Phase 2.)_

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | Astro setup, page structure, MDX content |
| `vega` | Section components — hero, feature grid, testimonial, FAQ accordion, CTA |
| `touch` | Mobile is 60%+ of marketing traffic — must be flawless |
| `prism` | **Lead role here.** LCP < 1.5s on the hero, CLS = 0, INP < 200ms. SEO ranking depends on it. |
| `access` | WCAG AA — keyboard, contrast, screen-reader; common legal exposure |

### Phase 4 — Hardening (light)
| Agent | Role |
|---|---|
| `probe` | Smoke tests on form submission, link integrity |
| `pipeline` | CI/CD with preview per PR (typically Vercel / Cloudflare Pages auto-handles) |
| `watch` | Uptime + form-submission rate alerting |
| `meter` | Hosting + email-provider cost (trivial usually) |

### Phase 5 — Intelligence
_(Almost never used for marketing sites. Skip unless specifically scoped.)_

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `signal` | **Co-lead role.** SEO is half the value of a marketing site — meta, OG, structured data, canonical, sitemap |
| `lens` | Conversion tracking — PostHog or simple GA4, with form/CTA event capture |
| `herald` | **Co-lead role.** Copy *is* the marketing site — headline, value props, social proof, CTA, FAQ |
| `hook` | A/B test on hero, CTA copy, form fields |
| `comply` | Cookie banner (if any analytics), privacy link |
| `guide` | _(Light — error states on forms)_ |

### Phase 7 — Audit
Run via `audit-run.js`. The most critical reviewers for this vertical:
- **Proof** — copy is the product
- **Compass** — does the headline match the audience's actual problem?
- **Optic** — visual hierarchy must lead the eye to the CTA
- **Halo** — basic WCAG AA must hold (legal exposure)

## Conditional Agents
- `tongue` — multi-locale launches
- `motion` — if interactive scroll animations / hero animation in scope
- `nexus` / `forge` / `vault` — only if real backend features (waitlist with confirmation, login, etc.)

## Time Budget
Most marketing-site projects should hit Phase 7 within **1–3 working days**. If a project is sliding past 1 week, escalate to BigBrain — either scope is creeping (adding it back to a SaaS team), or a blocker exists.

## Required Inputs
- Single sentence: who is this for and what does it do?
- Primary CTA (one — not two, not three)
- Brand assets or "match this competitor's vibe"
- Brief from BigBrain
