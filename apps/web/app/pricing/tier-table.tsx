"use client";

/**
 * Pricing tier table — client component.
 *
 * Owner: Forge wires structure (M2 Batch 1); Vega owns visual polish at
 * M2 Batch 2 per HC7. The "Start" CTAs now route via the region-aware
 * `/app/onboarding/checkout?tier=...&period=...` server component (D22
 * D1+D2 — surfaces the EU/UK waiver checkbox before Stripe Checkout)
 * instead of POSTing directly to /api/billing/checkout-session.
 *
 * Cross-refs:
 *   - finance/stripe-config.md §1.6 (Checkout Session config)
 *   - compliance/d22-cooling-off-flow.md §2.1–2.2 (D1+D2 close)
 *   - sprint/milestone-M2.md Vega — Pricing page (HC7)
 */

import { useState } from "react";

import { track } from "../../lib/analytics-events.v1";

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

interface TierTableProps {
  tiers: TierSpec[];
}

export function TierTable({ tiers }: TierTableProps): React.ReactElement {
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleStart(
    tier: TierSpec["tier"],
    billingPeriod: "monthly" | "annual",
  ): void {
    setPending(tier);
    setError(null);
    void track("plan_picker_viewed" as never, {
      tier,
      billing_period: billingPeriod,
    } as never);
    // Route through the region-aware handoff page — it detects EU/UK at
    // the edge, renders the waiver checkbox if required, then POSTs to
    // /api/billing/checkout-session with the resolved region + waiver
    // boolean. D22 D1+D2 close.
    const params = new URLSearchParams({ tier, period: billingPeriod });
    window.location.href = `/app/onboarding/checkout?${params.toString()}`;
  }

  return (
    <div>
      <fieldset
        aria-label="Billing period"
        style={{
          border: "none",
          padding: 0,
          margin: "0 auto 1.5rem",
          textAlign: "center",
        }}
      >
        <legend className="visually-hidden">Billing period</legend>
        <div
          role="radiogroup"
          aria-label="Billing period"
          style={{
            display: "inline-flex",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={period === "monthly"}
            onClick={() => setPeriod("monthly")}
            style={{
              padding: "0.5rem 1rem",
              background: period === "monthly" ? "#111827" : "transparent",
              color: period === "monthly" ? "#fff" : "#374151",
              border: "none",
              cursor: "pointer",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={period === "annual"}
            onClick={() => setPeriod("annual")}
            style={{
              padding: "0.5rem 1rem",
              background: period === "annual" ? "#111827" : "transparent",
              color: period === "annual" ? "#fff" : "#374151",
              border: "none",
              cursor: "pointer",
            }}
          >
            Annual <span style={{ fontWeight: 400 }}>(2 months free)</span>
          </button>
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          style={{
            color: "#991b1b",
            background: "#fef2f2",
            padding: "0.75rem 1rem",
            borderRadius: 6,
            marginBottom: "1.5rem",
          }}
        >
          Could not start checkout: {error}. If you are not signed in, please
          <a href="/login"> sign in </a>
          first.
        </p>
      ) : null}

      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "1rem 0",
        }}
      >
        <caption className="visually-hidden">
          Studio Zero pricing — five tiers
        </caption>
        <thead>
          <tr>
            <th scope="col" className="visually-hidden">
              Tier
            </th>
            <th scope="col" className="visually-hidden">
              Price
            </th>
            <th scope="col" className="visually-hidden">
              Features
            </th>
            <th scope="col" className="visually-hidden">
              Action
            </th>
          </tr>
        </thead>
        <tbody
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "1rem",
          }}
        >
          {tiers.map((t) => {
            const price = period === "monthly" ? t.monthly_usd : t.annual_usd;
            const suffix = period === "monthly" ? "/ mo" : "/ yr";
            return (
              <tr
                key={t.tier}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: t.popular ? "2px solid #111827" : "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "1.25rem",
                  background: "#fff",
                  position: "relative",
                }}
              >
                {t.popular ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 16,
                      background: "#111827",
                      color: "#fff",
                      padding: "0.125rem 0.5rem",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    Most popular
                  </span>
                ) : null}
                <th
                  scope="row"
                  style={{
                    textAlign: "left",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {t.display_name}
                </th>
                <td
                  style={{
                    fontSize: "1.875rem",
                    fontWeight: 700,
                    margin: "0.5rem 0",
                  }}
                >
                  ${price}
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 400,
                      color: "#6b7280",
                      marginLeft: "0.25rem",
                    }}
                  >
                    {suffix}
                  </span>
                </td>
                <td style={{ color: "#374151", marginBottom: "0.75rem" }}>
                  <strong>{t.audits_per_month}</strong>
                  <br />
                  <span style={{ color: "#6b7280" }}>{t.modes}</span>
                </td>
                <td style={{ flex: 1 }}>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 1rem",
                      color: "#374151",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {t.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          paddingLeft: "1.25rem",
                          position: "relative",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: 0,
                            color: "#10b981",
                          }}
                        >
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleStart(t.tier, period)}
                    disabled={pending === t.tier}
                    style={{
                      width: "100%",
                      padding: "0.625rem 1rem",
                      borderRadius: 6,
                      border: "none",
                      background: t.popular ? "#111827" : "#374151",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: pending === t.tier ? "wait" : "pointer",
                      opacity: pending === t.tier ? 0.6 : 1,
                    }}
                    aria-label={`Start ${t.display_name} ${period}`}
                  >
                    {pending === t.tier ? "Starting…" : "Start"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
