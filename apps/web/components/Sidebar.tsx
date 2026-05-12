"use client";

/**
 * Sidebar — port of `design/components/sidebar/sidebar.jsx`. HB-9a 4-item
 * primary nav for the authed app shell per IA-D1 + Optic F1.
 *
 *   Dashboard · Projects · New audit · Settings
 *
 * `aria-current="page"` on the active item. Auto-collapses to icon rail
 * at ≤768px (labels remain in DOM as sr-only text).
 *
 * SC 1.3.1, 2.1.1, 2.4.1, 2.4.4, 2.4.7, 2.4.11, 2.5.8, 3.2.3.
 */
import * as React from "react";

export interface SidebarItem {
  href: string;
  label: string;
  icon: "home" | "folder" | "plus" | "sliders";
}

interface SidebarProps {
  items: SidebarItem[];
  /** Currently active path — sets aria-current="page" when href matches. */
  activePath?: string;
  "aria-label"?: string;
}

function Icon({ name }: { name: SidebarItem["icon"] }): React.ReactElement {
  // SVG glyphs sized 16; aria-hidden so AT relies on the label.
  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M2 7L8 2l6 5v6.5A1.5 1.5 0 0 1 12.5 15H10v-4H6v4H3.5A1.5 1.5 0 0 1 2 13.5V7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M1.5 4.5h4l1.5 1.5h7.5v7A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V4.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M8 2v12M2 8h12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "sliders":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="5" cy="4" r="1.6" fill="currentColor" />
          <circle cx="10" cy="8" r="1.6" fill="currentColor" />
          <circle cx="6" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
  }
}

export function Sidebar({
  items,
  activePath,
  "aria-label": ariaLabel = "Primary",
}: SidebarProps): React.ReactElement {
  return (
    <nav className="sz-sidebar" aria-label={ariaLabel}>
      <ul className="sz-sidebar__list">
        {items.map((item) => {
          const isCurrent =
            activePath === item.href ||
            (activePath?.startsWith(item.href + "/") &&
              item.href !== "/app");
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className="sz-sidebar__link"
                aria-current={isCurrent ? "page" : undefined}
              >
                <Icon name={item.icon} />
                <span className="sz-sidebar__label">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Sidebar;
