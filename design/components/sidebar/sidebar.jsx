"use client";
import React from "react";

// Optic F1 + IA-D1 alignment: matches Nav appLinks exactly. HB-9a:
// Notifications via header bell; Help via header help icon (Optic F2).
const DEFAULT_ITEMS = [
  { href: "/app",            label: "Dashboard" },
  { href: "/app/projects",   label: "Projects"  },
  { href: "/app/audits/new", label: "New audit" },
  { href: "/app/settings",   label: "Settings"  },
];

/**
 * Sidebar — 4-item authed-app primary nav (HB-9a).
 */
export function Sidebar({
  items = DEFAULT_ITEMS,
  currentPath = "/",
  user = null,
  onSignOut,
  ...rest
}) {
  return (
    <aside className="sz-sidebar" {...rest}>
      <nav aria-label="Primary" className="sz-sidebar__nav">
        <ul className="sz-sidebar__list">
          {items.map((it) => {
            // Optic F3: Dashboard root ("/app") must EXACT-match — prefix
            // matching would mark Dashboard active on every /app/* route.
            const isCurrent = it.href === "/app"
              ? currentPath === "/app"
              : currentPath === it.href || currentPath.startsWith(it.href + "/");
            return (
              <li key={it.href}>
                <a
                  href={it.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className="sz-sidebar__item"
                >
                  {it.icon ? <span className="sz-sidebar__icon" aria-hidden="true">{it.icon}</span> : null}
                  <span className="sz-sidebar__label">{it.label}</span>
                  {typeof it.count === "number" && it.count > 0 ? (
                    <span className="sz-sidebar__count" aria-label={`${it.count} new`}>{it.count}</span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {user ? (
        <div className="sz-sidebar__foot">
          <span className="sz-sidebar__user">
            <span className="sz-sidebar__avatar" aria-hidden="true">{(user.name || user.email || "?").slice(0,1).toUpperCase()}</span>
            <span className="sz-sidebar__email">{user.email}</span>
          </span>
          <button
            type="button"
            className="sz-sidebar__signout"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default Sidebar;
