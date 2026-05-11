import type { Metadata, Viewport } from "next";
import * as React from "react";

import {
  AI_DISCLOSURE_META_CONTENT,
  AI_DISCLOSURE_META_NAME,
} from "../lib/ai-disclosure";

import "./globals.css";

/**
 * Studio Zero — root layout.
 *
 * Hard rules embedded here (Phase 9 M0):
 *  - `<html lang="en">` (SC 3.1.1 + Halo HC1)
 *  - `<meta name="ai-generated" content="studio-zero">` on every page
 *    (EU AI Act Art. 50 interim machinery — PRD §11.3 + ticket #18)
 *  - `theme-color` matched to `--bg-0` so iOS/Android UI chrome aligns
 *  - viewport `width=device-width, initial-scale=1` for SC 1.4.4 + 1.4.10
 *
 * Fonts: tokens.css carries the full fallback stacks (Instrument Serif /
 * Geist / Geist Mono). M1 TODO — wire next/font for self-hosted Geist
 * + Instrument Serif so we hit the typography target on first paint.
 * At M0 the fallback stacks render legibly; Canon's drift detector will
 * flag the fonts gap at M1 audit.
 */

const siteUrl = "https://studiozero-omega.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Studio Zero — the independent audit for AI-built software",
    template: "%s — Studio Zero",
  },
  description:
    "Your AI builder shipped code that fails accessibility. We'll prove it — line by line. Free Surface audit. No card on file.",
  applicationName: "Studio Zero",
  authors: [{ name: "Studio Zero" }],
  generator: "Studio Zero (Next.js)",
  keywords: [
    "AI audit",
    "accessibility audit",
    "WCAG 2.2 AA",
    "code review",
    "AI-built software",
  ],
  // EU AI Act Art. 50 interim disclosure — paired with the HTTP header
  // set in `next.config.ts`. Comply + Forge ticket #18.
  other: {
    [AI_DISCLOSURE_META_NAME]: AI_DISCLOSURE_META_CONTENT,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Studio Zero",
    title: "Studio Zero — the independent audit for AI-built software",
    description:
      "Your AI builder shipped code that fails accessibility. We'll prove it — line by line.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Zero — the independent audit for AI-built software",
    description:
      "Your AI builder shipped code that fails accessibility. We'll prove it — line by line.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16.svg", type: "image/svg+xml", sizes: "16x16" },
    ],
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Direction A — page canvas is `--bg-0` = #050506.
  themeColor: "#050506",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
