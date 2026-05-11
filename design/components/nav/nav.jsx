"use client";
import React, { useState } from "react";
import Chip from "../chip/chip.jsx";

/**
 * Nav — Studio Zero top navigation. Mode-aware right cluster.
 * Renders skip-to-content link first for SC 2.4.1.
 */
export function Nav({
  surface = "app",
  mode = null,
  notifCount = 0,
  tokenBudgetRemaining,
  byokStatus,
  cliStatus,
  currentPath = "/",
  user = null,
  onOpenNotifications,
  onOpenUserMenu,
  brandHref = "/",
  ...rest
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const marketingLinks = [
    { href: "/audit", label: "Audit" },
    { href: "/build", label: "Build" },
    { href: "/modes", label: "Modes" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
  ];
  const appLinks = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/projects", label: "Projects" },
    { href: "/app/audits/new", label: "New audit" },
    { href: "/app/settings", label: "Settings" },
  ];

  const links = surface === "marketing" ? marketingLinks : appLinks;
  // CLI mode hides GitHub-install marketing affordance; presence-derived
  // (links list is already a11y; the chip handling is below).

  return (
    <>
      {/* SC 2.4.1 Bypass Blocks — must be first focusable element on the page */}
      <a className="sz-skip" href="#main">Skip to content</a>

      <header className="sz-nav" role="banner" {...rest}>
        <div className="sz-nav__inner">
          <a className="sz-nav__brand" href={brandHref} aria-label="Studio Zero — home">
            <span className="sz-nav__mark" aria-hidden="true" />
            <span className="sz-nav__word">STUDIO ZERO</span>
          </a>

          <nav className="sz-nav__links" aria-label="Primary">
            <ul className="sz-nav__list">
              {links.map((l) => {
                const isCurrent = currentPath === l.href || currentPath.startsWith(l.href + "/");
                return (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      aria-current={isCurrent ? "page" : undefined}
                      className="sz-nav__link"
                    >
                      {l.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="sz-nav__right">
            {/* Mode-aware status chips */}
            {mode === "managed" && tokenBudgetRemaining !== undefined ? (
              <Chip variant="status" tone="neutral">
                {`TOKENS · ${tokenBudgetRemaining}`}
              </Chip>
            ) : null}
            {mode === "byok" && byokStatus ? (
              <Chip
                variant="status"
                tone={byokStatus === "valid" ? "pass" : "fail"}
                data-state={byokStatus === "invalid" ? "error" : undefined}
              >
                {byokStatus === "valid" ? "BYOK · VALID" : "BYOK · INVALID"}
              </Chip>
            ) : null}
            {mode === "cli" && cliStatus ? (
              <Chip
                variant="status"
                tone={cliStatus === "online" ? "pass" : "fail"}
              >
                {`CLI · ${cliStatus.toUpperCase()}`}
              </Chip>
            ) : null}

            {surface === "app" ? (
              <button
                type="button"
                className="sz-nav__bell"
                aria-label={`Notifications${notifCount ? `, ${notifCount} unread` : ""}`}
                aria-haspopup="dialog"
                onClick={onOpenNotifications}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                {notifCount > 0 ? <span className="sz-nav__bell-dot" aria-hidden="true" /> : null}
              </button>
            ) : null}

            {user ? (
              <button
                type="button"
                className="sz-nav__user"
                aria-label={`Account menu, signed in as ${user.email}`}
                aria-haspopup="menu"
                onClick={onOpenUserMenu}
              >
                <span className="sz-nav__avatar" aria-hidden="true">{(user.name || user.email || "?").slice(0,1).toUpperCase()}</span>
              </button>
            ) : surface === "marketing" ? (
              <>
                <a className="sz-nav__signin" href="/login">Sign in</a>
                <a className="sz-nav__cta" href="/signup">Sign up</a>
              </>
            ) : null}

            <button
              type="button"
              className="sz-nav__hamburger"
              aria-expanded={mobileOpen}
              aria-controls="sz-nav-mobile"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="sz-nav__hamburger-bar" aria-hidden="true" />
              <span className="sz-nav__hamburger-bar" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mobile expanded panel — focus-trap left to consumer */}
        {mobileOpen ? (
          <div id="sz-nav-mobile" className="sz-nav__mobile">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} aria-current={currentPath === l.href ? "page" : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>
    </>
  );
}

export default Nav;
