import * as React from "react";

import { AppShell } from "../../components/AppShell";
import { Chip } from "../../components/Chip";

/**
 * /app/* layout — wraps every authed route with the AppShell (header +
 * Sidebar + main). The shell is a client component (Sidebar uses
 * `usePathname()`), so this layout is a simple pass-through.
 *
 * Mode chip in the header carries the locked mock copy:
 *   "MODE: BYOK · KEY VALIDATED · NO RUNS YET"
 *
 * Real M1+1 wiring derives the chip from the authed user's tenant state.
 */
export const metadata = {
  title: {
    template: "%s — Studio Zero",
    default: "Studio Zero — app",
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <AppShell
      modeChip={
        <Chip variant="mono-meta" tone="neutral">
          MODE: BYOK · KEY VALIDATED · DEMO DATA
        </Chip>
      }
    >
      {children}
    </AppShell>
  );
}
