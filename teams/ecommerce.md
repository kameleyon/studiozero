# Team — E-commerce

## Purpose
Storefront builds with checkout, cart, inventory, and payments. Use when Jo wants to sell physical or digital products. Stack picks: small catalog → Next.js + Shopify Hydrogen; large catalog or full ownership → Medusa.js + Stripe (per `protocols/code-standards.md`).

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | PRD, catalog model, fulfillment scope |
| `scout` | Competitor pricing, conversion benchmarks |
| `penny` | Margin model, taxes, shipping cost structure |
| `sprint` | Plan, deadlines |
| `canvas` | Storefront UI, product/cart/checkout layouts |
| `flow` | Shopper journey (browse → cart → checkout → confirmation) |
| `pixel` | Brand, product photography style guide, packaging visuals |
| `motion` | Cart transitions, add-to-cart feedback |

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Product/order/inventory schema, Postgres or Hydrogen-native |
| `keeper` | Order data retention, customer data deletion (GDPR) |
| `vault` | Customer auth, guest checkout |
| `cipher` | PCI-relevant data handling, secrets |
| `verify` | Dependency hygiene, SBOM |
| `forge` | Backend architecture |
| `nexus` | Cart/checkout/webhook endpoints |
| `bridge` | Stripe, Shopify/Medusa, shipping APIs, tax APIs |
| `queue` | Order processing, email triggers |

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | Next.js architecture, ISR/SSR strategy for product pages |
| `vega` | Product cards, gallery, cart, checkout components |
| `touch` | Mobile checkout (highest-converting surface — must be flawless) |
| `prism` | Image optimization, LCP on product pages, bundle |
| `access` | WCAG AA on checkout (legal requirement in many jurisdictions) |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | Checkout E2E tests, cart-state edge cases |
| `crash` | Load test for promo / launch traffic spikes |
| `ghost` | Race conditions on add-to-cart, double-charge edge cases |
| `pipeline` | CI/CD with preview deploys |
| `terra` | Infra |
| `watch` | Cart abandonment alerts, checkout-error rate monitoring |
| `chronicle` | Order audit trail (regulatory) |
| `siren` | Incident response — outage on checkout = revenue loss |
| `meter` | Per-transaction cost, payment-processor fee tracking |

### Phase 5 — Intelligence (conditional)
| Agent | Role |
|---|---|
| `cortex` | Product recommendations, search relevance (if AI) |
| `memory` | Product embeddings for semantic search |
| `oracle` | Recommendation eval, no-hallucination on product specs |

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | Tech docs |
| `guide` | Help center: shipping, returns, payment FAQ |
| `signal` | Product schema markup, sitemaps, category SEO |
| `lens` | Funnel analytics, abandoned-cart tracking |
| `herald` | Product copy, launch campaigns, abandoned-cart emails |
| `hook` | A/B tests on PDP and checkout |
| `echo` | Support macros for refund/shipping/returns |
| `ledger` | Payment reconciliation, refund flows, chargeback handling |
| `comply` | Sales tax (per region), consumer law (EU 14-day return), accessibility legal exposure |

### Phase 7 — Audit
Run via `audit-run.js`. Add explicit instruction to Compass: verify the audience persona matches the catalog (luxury vs. value, niche vs. mass, technical vs. consumer).

## Conditional Agents
- `tongue` — multi-region with non-English locales (very common in e-commerce)
- `edge` — global CDN for product images and pages
- `stream` — live inventory / "X people viewing" features

## Required Inputs
- Catalog size estimate (small → Hydrogen, large → Medusa)
- Target market region (drives tax/legal/locale work)
- Brief from BigBrain
