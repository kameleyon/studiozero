"use client";
import React, { useEffect, useRef, useState } from "react";
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
  onOpenHelp,
  onOpenUserMenu,
  brandHref = "/",
  ...rest
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef(null);
  const mobileRef = useRef(null);

  // HF-NAV-1: mobile panel focus trap + Esc + focus return.
  useEffect(() => {
    if (!mobileOpen) return;
    const panel = mobileRef.current;
    if (!panel) return;
    const focusables = () => panel.querySelectorAll(
      "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
    );
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

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

            {/* Optic F2: Help in app-shell right cluster.
                Marketing surface routes Help to /docs link in nav; app uses an icon. */}
            {surface === "app" ? (
              <button
                type="button"
                className="sz-nav__help"
                aria-label="Help"
                aria-haspopup="dialog"
                onClick={onOpenHelp}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.3.7-2 1.5-2 2.5" />
                  <circle cx="11.5" cy="17.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
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
              ref={hamburgerRef}
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

        {/* Mobile expanded panel — HF-NAV-1: focus trap + Esc + focus return implemented above. */}
        {mobileOpen ? (
          <div
            ref={mobileRef}
            id="sz-nav-mobile"
            className="sz-nav__mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Primary navigation"
          >
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={currentPath === l.href ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
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
