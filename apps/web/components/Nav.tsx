"use client";

/**
 * Nav — marketing surface variant. Lifted from
 * `design/components/nav/nav.jsx` and trimmed to the marketing
 * affordances (no mode chips, no notification bell, no help icon).
 *
 * Why a client component: the mobile drawer has focus-trap + Esc handling
 * (HF-NAV-1). The desktop nav above 880px renders pure HTML with no
 * client behavior. Next.js streams the entire page; only the small
 * `<header>` payload is hydrated.
 *
 * SC 2.4.1 skip-to-content link lives outside `<header>` so it's the
 * page's first focusable element.
 *
 * M1 TODO: share with `packages/ui`; pair with the app-shell Nav.
 */
import * as React from "react";

interface NavLink {
  href: string;
  label: string;
}

interface NavAuth {
  signIn: { href: string; label: string };
  signUp: { href: string; label: string };
}

export interface NavProps {
  links: NavLink[];
  auth: NavAuth;
  brandHref?: string;
  brandLabel?: string;
}

export function Nav({
  links,
  auth,
  brandHref = "/",
  brandLabel = "STUDIO ZERO",
}: NavProps): React.ReactElement {
  const [mobileOpen, setMobileOpen] = React.useState<boolean>(false);
  const hamburgerRef = React.useRef<HTMLButtonElement | null>(null);
  const mobileRef = React.useRef<HTMLDivElement | null>(null);

  // HF-NAV-1 — focus trap + Esc + focus return.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const panel = mobileRef.current;
    if (!panel) return;

    const focusables = (): NodeListOf<HTMLElement> =>
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab") {
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!first || !last) return;
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

  return (
    <>
      {/* SC 2.4.1 Bypass Blocks — first focusable element on the page. */}
      <a className="sz-skip" href="#main">
        Skip to content
      </a>

      <header className="sz-nav" role="banner">
        <div className="sz-nav__inner">
          <a
            className="sz-nav__brand"
            href={brandHref}
            aria-label="Studio Zero — home"
          >
            <span className="sz-nav__mark" aria-hidden="true" />
            <span className="sz-nav__word">{brandLabel}</span>
          </a>

          <nav className="sz-nav__links" aria-label="Primary">
            <ul className="sz-nav__list">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="sz-nav__link">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sz-nav__right">
            <a className="sz-nav__signin" href={auth.signIn.href}>
              {auth.signIn.label}
            </a>
            <a className="sz-nav__cta" href={auth.signUp.href}>
              {auth.signUp.label}
            </a>

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
                  <a href={l.href} onClick={() => setMobileOpen(false)}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={auth.signIn.href} onClick={() => setMobileOpen(false)}>
                  {auth.signIn.label}
                </a>
              </li>
              <li>
                <a href={auth.signUp.href} onClick={() => setMobileOpen(false)}>
                  {auth.signUp.label}
                </a>
              </li>
            </ul>
          </div>
        ) : null}
      </header>
    </>
  );
}

export default Nav;
