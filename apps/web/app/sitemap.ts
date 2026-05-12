import type { MetadataRoute } from "next";

/**
 * /sitemap.xml — Next.js metadata route (M5 Vega + Forge).
 *
 * Per `ia/sitemap.md` §"SEO posture summary":
 *   - Include marketing + legal + blog + /status + /accessibility +
 *     /ai-system-card + /pricing.
 *   - Exclude /app/*, /admin/*, /auth/*, /onboarding/*, every error
 *     page, every system page, and every tokenized share URL.
 *
 * Generated at build time. Updates whenever a public route is added.
 */

const SITE_URL = "https://studiozero-omega.vercel.app";
const NOW = new Date("2026-05-12");

interface RouteSpec {
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

const PUBLIC_ROUTES: RouteSpec[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/audit", changeFrequency: "monthly", priority: 0.9 },
  { path: "/modes", changeFrequency: "monthly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/build", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog/why-audit", changeFrequency: "yearly", priority: 0.7 },
  { path: "/status", changeFrequency: "daily", priority: 0.5 },
  { path: "/security", changeFrequency: "monthly", priority: 0.6 },
  { path: "/accessibility", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.5 },
  { path: "/aup", changeFrequency: "monthly", priority: 0.5 },
  { path: "/subprocessors", changeFrequency: "monthly", priority: 0.5 },
  { path: "/system-card", changeFrequency: "monthly", priority: 0.5 },
  { path: "/dmca", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: NOW,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
