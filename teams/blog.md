# Team — Blog / Publication

## Purpose
Content-first publication: long-form articles, RSS, comments, search. Use for personal blogs, company blogs, newsletters with web archive, niche publications. The smallest roster — most agents are not needed for a blog.

Stack: Astro + MDX + Tailwind + content collections + Supabase (for comments / newsletter signups, if any).

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | Editorial scope, audience, posting cadence |
| `sprint` | Editorial calendar |
| `canvas` | Article layouts, reading experience design |
| `flow` | Reader journey — discovery → article → next article → subscribe |
| `pixel` | Brand, OG images, author/publication identity |

_(Skip Scout, Penny unless monetization is in scope. Skip Motion unless interactive features.)_

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Comment / newsletter schema (if interactive) |
| `vault` | Author auth (single user or small team) |
| `cipher` | Secrets (RSS-key-protected drafts, if any) |
| `verify` | Dependency hygiene |
| `forge` | Backend — typically minimal (Supabase functions for comments / signups) |
| `nexus` | Newsletter signup, comment, search endpoints |
| `bridge` | Newsletter provider (Resend, Beehiiv, ConvertKit) |

_(Most blogs skip Phase 2 entirely if static. Adapt per project.)_

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | Astro project structure, content collections setup |
| `vega` | Article, list, search components |
| `touch` | Mobile reading — typography scale, touch targets |
| `prism` | **Lead role here.** Blogs live or die on LCP and CLS. Image optimization, font loading. |
| `access` | WCAG AA — text contrast and reading experience matter most here |
| `query` | Site search if needed (typically MiniSearch for static; Algolia for scale) |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | Build tests, RSS validation |
| `pipeline` | CI/CD with preview per PR |
| `terra` | Hosting (Vercel / Cloudflare Pages) |
| `watch` | Uptime, RSS health |
| `meter` | Hosting cost (usually trivial) |

### Phase 5 — Intelligence (conditional)
| Agent | Role |
|---|---|
| `cortex` | AI summary / chat-with-archive (if planned) |
| `memory` | Embeddings of articles for semantic search / chat |
| `oracle` | Eval — verify summaries are grounded in the article |

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | README, contribution guide for collaborators |
| `guide` | About page, FAQ |
| `signal` | **Lead role here.** SEO is the entire game for blogs — schema markup, sitemaps, OG, canonical URLs, RSS, newsletter syndication |
| `lens` | Reader analytics, drop-off, scroll depth |
| `herald` | Newsletter copy, social posts |
| `hook` | Subscribe-CTA testing |
| `echo` | Reader email handling |
| `comply` | GDPR for newsletter consent, cookie policy |

### Phase 7 — Audit
Run via `audit-run.js`. Direct **Proof** specifically — content quality is the entire product on a blog. Direct **Halo** to test reading flow with a screen reader (high-contrast mode etc.).

## Conditional Agents
- `tongue` — only if multi-locale (rare for blogs)
- `oracle` — only if AI summary/chat features

## Required Inputs
- Posting cadence (daily, weekly, monthly)
- Static vs. interactive (comments, signups, search)
- Single-author vs. multi-author
- Brief from BigBrain
