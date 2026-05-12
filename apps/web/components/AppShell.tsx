"use client";

/**
 * AppShell — authed-app chrome. Composes:
 *
 *   <header>         app-shell Nav (brand + mode chip + bell + user menu)
 *   <aside>          Sidebar (HB-9a 4 items, aria-current=page on match)
 *   <main id="main"> page content
 *
 * Skip-link is the page's first focusable element (SC 2.4.1).
 *
 * Why a client component: Sidebar derives `aria-current` from
 * `usePathname()`, which only runs client-side. The marketing Nav is
 * already client; making the app shell client is consistent.
 *
 * SC 1.3.1, 2.4.1 (skip link), 2.4.11 (sticky offset via tokens.css).
 */
import { usePathname } from "next/navigation";
import * as React from "react";

import { Sidebar } from "./Sidebar";
import { useSupabaseUser } from "../lib/auth-context";

const SIDEBAR_ITEMS = [
  { href: "/app", label: "Dashboard", icon: "home" as const },
  { href: "/app/projects", label: "Projects", icon: "folder" as const },
  { href: "/app/projects/new", label: "New audit", icon: "plus" as const },
  { href: "/app/settings", label: "Settings", icon: "sliders" as const },
];

interface AppShellProps {
  /** Mode chip in the header — shown when known (BYOK · validated, etc.). */
  modeChip?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  modeChip,
  children,
}: AppShellProps): React.ReactElement {
  const pathname = usePathname() ?? "/app";
  const { user } = useSupabaseUser();
  // First-letter avatar from displayName or email — fallback "?" if no user.
  const avatarLetter =
    user?.displayName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "?";

  return (
    <div className="sz-app-shell">
      {/* SC 2.4.1 Bypass Blocks — first focusable element. */}
      <a className="sz-skip" href="#main">
        Skip to content
      </a>

      <header className="sz-app-header" role="banner">
        <div className="sz-app-header__inner">
          <a href="/app" className="sz-app-header__brand" aria-label="Studio Zero — dashboard">
            <span className="sz-nav__mark" aria-hidden="true" />
            <span className="sz-app-header__word">STUDIO · ZERO</span>
          </a>
          <div className="sz-app-header__mode">{modeChip}</div>
          <div className="sz-app-header__right">
            <a
              href="/app/notifications"
              className="sz-app-header__bell"
              aria-label="Notifications"
              aria-haspopup="dialog"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
                <path
                  d="M8 1.5v1.2M4.5 7c0-1.9 1.6-3.5 3.5-3.5S11.5 5.1 11.5 7v2l1 1.5h-9L4.5 9V7ZM6.5 12.5a1.5 1.5 0 0 0 3 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="/app/settings"
              className="sz-app-header__user"
              aria-label={
                user
                  ? `User menu for ${user.displayName}`
                  : "User menu"
              }
            >
              <span className="sz-app-header__avatar" aria-hidden="true">
                {avatarLetter}
              </span>
              <span className="sz-sr-only">User menu</span>
            </a>
          </div>
        </div>
      </header>

      <div className="sz-app-body">
        <aside className="sz-app-aside" aria-label="Primary navigation">
          <Sidebar items={SIDEBAR_ITEMS} activePath={pathname} />
        </aside>

        <main id="main" className="sz-app-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
