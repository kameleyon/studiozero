# Studio Zero — E-commerce Template

Next.js 15 + Shopify Hydrogen React + Stripe + Tailwind 4. Static-first product pages, dynamic cart.

## Why Hydrogen-React (not Medusa)
- **Hydrogen-React** (this template) — best for catalogs ≤ 10k SKUs, when Shopify is your inventory + payments + tax + shipping engine. Lowest ops cost.
- **Medusa.js** (alternative) — best when you need full ownership of cart, custom B2B pricing, multi-warehouse, or multi-region inventory logic Shopify doesn't support cleanly. Higher ops cost.

If you need Medusa, scaffold via `npx create-medusa-app@latest` instead and reuse the Stripe + Resend snippets from `_saas-infra-pack/`.

## Setup
```bash
cp .env.example .env
# Fill in NEXT_PUBLIC_SHOPIFY_DOMAIN + NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
npm install
npm run dev
```

## What's wired
- Storefront GraphQL fetcher with 60s ISR (`lib/shopify.ts`)
- Product list page with localized currency formatting
- Security headers (X-Frame-Options, etc.)
- Shopify CDN remote-image patterns
- Stripe + Resend env stubs for headless extensions

## What you add
- Product detail page (`app/products/[handle]/page.tsx`)
- Cart server actions
- Checkout redirect (Shopify Pay default; or Stripe Checkout for headless)
- Order confirmation email via Resend
- Webhook handler for order status sync

## Audit gate per `teams/ecommerce.md`
Direct Halo to test the **checkout flow** specifically — accessibility lawsuits target checkout. Compass scores against your audience persona (luxury / value / mass / niche). Stripe PCI checklist applies — `checklists/stripe-pci.md`.
