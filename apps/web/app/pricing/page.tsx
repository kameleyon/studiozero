/**
 * /pricing — public, indexable pricing page (PRD §12 SEO).
 *
 * Owner: Forge wires structure (Phase 9 M2 Batch 1). Herald owns the
 * copy — when M2 Batch 2 lands, the strings below are replaced with
 * Herald-locked v0.4 messaging. The structure (5 tiers, monthly/annual
 * toggle, "Start" CTAs that POST /api/billing/checkout-session) is
 * stable.
 *
 * Vega owns Pricing Page (HC7) — "Most popular" badge text + reflow
 * at 320 CSS px + SC 1.4.10 / 1.4.12. The semantic table below is the
 * scaffold; Vega's Batch 2 styling sits on top.
 *
 * Cross-refs:
 *   - finance/pricing.md (§2 tier table — source of truth)
 *   - finance/stripe-config.md §1.6 (Checkout config)
 *   - sprint/milestone-M2.md Vega — Pricing page (HC7)
 *   - PRD §12 pricing + §14.5 compliance
 */

import { TierTable } from "./tier-table";
import { aiDisclosureMeta } from "../../lib/ai-disclosure";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Studio Zero",
  description:
    "Studio Zero pricing — five tiers from a free evaluation lane up to " +
    "the Managed Pro tier with Auto-PR fix delivery. Annual = two months " +
    "free.",
  other: { ...aiDisclosureMeta },
};

interface TierSpec {
  tier:
    | "byok_starter"
    | "byok_pro"
    | "managed_starter"
    | "managed_pro"
    | "cli";
  display_name: string;
  monthly_usd: number;
  annual_usd: number;
  audits_per_month: string;
  modes: string;
  features: string[];
  popular?: boolean;
}

const TIERS: TierSpec[] = [
  {
    tier: "byok_starter",
    display_name: "BYOK Starter",
    monthly_usd: 29,
    annual_usd: 290,
    audits_per_month: "2 audits / month",
    modes: "BYOK or CLI",
    features: [
      "2 audits per month, any depth",
      "Specs-only fixes",
      "GitHub App connection",
      "Full findings export (MD / CSV / JSON)",
      "Customer-supplied Anthropic key",
    ],
  },
  {
    tier: "cli",
    display_name: "CLI",
    monthly_usd: 19,
    annual_usd: 190,
    audits_per_month: "Unlimited (local)",
    modes: "CLI only",
    features: [
      "Audits run on your machine — code never leaves",
      "Private Run · Self-Audited watermark",
      "Customer's Claude Code subscription pays tokens",
      "Surface depths on your own URL",
    ],
  },
  {
    tier: "byok_pro",
    display_name: "BYOK Pro",
    monthly_usd: 79,
    annual_usd: 790,
    audits_per_month: "Unlimited",
    modes: "BYOK or CLI",
    features: [
      "Unlimited audits per month",
      "Priority queue",
      "Client-tag organization",
      "All export formats",
      "Customer-supplied Anthropic key",
    ],
  },
  {
    tier: "managed_starter",
    display_name: "Managed Starter",
    monthly_usd: 99,
    annual_usd: 990,
    audits_per_month: "2 Full audits / month",
    modes: "Managed",
    features: [
      "2 Full audits per month",
      "Tokens included",
      "Specs-only fixes",
      "GitHub App connection",
      "Zero API key setup",
    ],
  },
  {
    tier: "managed_pro",
    display_name: "Managed Pro",
    monthly_usd: 249,
    annual_usd: 2490,
    audits_per_month: "Unlimited Full audits",
    modes: "Managed",
    features: [
      "Unlimited Full audits per month",
      "Tokens included",
      "Auto-PR fix delivery (V1.5)",
      "Priority queue",
      "Engineering-team posture",
    ],
    popular: true,
  },
];

export default function PricingPage(): React.ReactElement {
  return (
    <main
      role="main"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.25rem", lineHeight: 1.1, margin: 0 }}>
          Pricing
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "1.125rem",
            color: "#4b5563",
            maxWidth: 640,
            margin: "0.75rem auto 0",
          }}
        >
          The independent audit for AI-built software. Pick a plan, run your
          first audit in under five minutes. Annual = two months free. Tax
          calculated at checkout.
        </p>
      </header>

      <TierTable tiers={TIERS} />

      <section
        aria-labelledby="pricing-notes-heading"
        style={{ marginTop: "3rem", color: "#374151", fontSize: "0.95rem" }}
      >
        <h2 id="pricing-notes-heading" style={{ fontSize: "1.25rem" }}>
          Things to know
        </h2>
        <ul style={{ lineHeight: 1.65 }}>
          <li>
            <strong>Free tier:</strong> 1 project, unlimited Surface
            re-audits, Quick or Custom depth. Email-verified and IP
            rate-limited.
          </li>
          <li>
            <strong>Annual = 10× monthly</strong> (two months free).
          </li>
          <li>
            <strong>EU / UK customers:</strong> 14-day cooling-off period
            applies (Directive 2011/83/EU + UK CCR 2013). Waiver available
            at checkout; window resets per upgrade.
          </li>
          <li>
            <strong>California customers:</strong> pro-rata refund of any
            unused period on cancel (SB 313).
          </li>
          <li>
            <strong>Cancel anytime</strong> in the Stripe Customer Portal —
            cancellation is one click and in the same channel as signup
            (FTC 16 CFR 425).
          </li>
          <li>
            Tax is added at checkout where required (Stripe Tax).
          </li>
        </ul>
      </section>
    </main>
  );
}
