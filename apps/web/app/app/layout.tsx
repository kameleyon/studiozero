"use client";

import * as React from "react";

import { AppShell } from "../../components/AppShell";
import { Chip } from "../../components/Chip";
import { useSupabaseUser } from "../../lib/auth-context";

/**
 * /app/* layout — wraps every authed route with the AppShell (header +
 * Sidebar + main).
 *
 * The mode chip used to carry a locked mock string. Phase 9 M1 Batch 2
 * (Vega) wires it to the live user shape from `useSupabaseUser()`:
 *
 *   modePref === "byok"      → "MODE: BYOK · KEY VALIDATED" (or "PENDING")
 *   modePref === "cli"       → "MODE: CLI"
 *   modePref === "managed"   → "MODE: MANAGED"
 *   modePref absent          → "MODE: NOT SET"
 *
 * When `mock===true` the chip suffix says `· DEMO DATA` so alpha users
 * can always tell mock from real (Compass AH-1 + the M1 starter's
 * obvious-mock contract).
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { user, mock } = useSupabaseUser();

  let label = "MODE: NOT SET";
  if (user?.modePref === "byok") {
    label = user.byokVerified
      ? "MODE: BYOK · KEY VALIDATED"
      : "MODE: BYOK · KEY PENDING";
  } else if (user?.modePref === "cli") {
    label = "MODE: CLI";
  } else if (user?.modePref === "managed") {
    label = "MODE: MANAGED";
  }
  if (mock) label = `${label} · DEMO DATA`;

  return (
    <AppShell
      modeChip={
        <Chip variant="mono-meta" tone="neutral">
          {label}
        </Chip>
      }
    >
      {children}
    </AppShell>
  );
}
