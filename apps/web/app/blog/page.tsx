import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /blog — index (M5 Vega).
 *
 * Per `ia/sitemap.md` Marketing-site row 12 + Herald's channel-plan
 * (`marketing/channel-plan.md` §2 — Blog row). Build-in-public surface;
 * launch ships with one inaugural post (`/blog/why-audit`), structured
 * data `Article` per post (rendered in the post route itself).
 *
 * SEO: indexable, canonical=`/blog`.
 */
export const metadata: Metadata = {
  title: "Blog",
  description:
    "Studio Zero's blog — receipts, retros, and the open questions we ship in public. New posts at launch milestones and every month thereafter.",
  alternates: { canonical: "https://studiozero-omega.vercel.app/blog" },
  openGraph: {
    type: "website",
    url: "https://studiozero-omega.vercel.app/blog",
    title: "Blog — Studio Zero",
    description:
      "Receipts, retros, and the open questions we ship in public.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Studio Zero",
    description:
      "Receipts, retros, and the open questions we ship in public.",
  },
};

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  readingTime: string;
}

const POSTS: BlogPost[] = [
  {
    slug: "why-audit",
    title: "Why the AI build needs an audit, not another builder",
    date: "2026-05-12",
    description:
      "The wedge in long form. Why we built an independent audit layer between the AI builder that wrote your code and the team about to ship it &mdash; and why every layer of the existing tool chain leaves the AI-shipped failure modes uncaught.",
    readingTime: "~7 minutes",
  },
];

export default function BlogIndexPage(): React.ReactElement {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />

      <Nav
        links={[
          { href: "/audit", label: "The audit" },
          { href: "/modes", label: "Modes" },
          { href: "/pricing", label: "Pricing" },
          { href: "/blog", label: "Blog" },
        ]}
        auth={{
          signIn: { href: "/login", label: "Sign in" },
          signUp: { href: "/signup", label: "Run a free audit" },
        }}
      />

      <main id="main">
        <section className="stub-page">
          <div className="wrap">
            <span className="eyebrow stub-eyebrow">Studio Zero · Blog</span>
            <h1>
              Receipts, retros, and the{" "}
              <em className="serif-it">open questions</em>.
            </h1>
            <p>
              We ship in public. Every milestone we hit, every dogfood
              verdict we run, every honest open question that&rsquo;s still
              unresolved &mdash; we write it up here, file the receipts, and
              link the source.
            </p>

            <ul className="blog-index">
              {POSTS.map((p) => (
                <li key={p.slug} className="blog-index__item">
                  <article>
                    <p className="blog-meta">
                      <time dateTime={p.date}>{p.date}</time> &middot;{" "}
                      <span>{p.readingTime}</span>
                    </p>
                    <h2>
                      <a href={`/blog/${p.slug}`}>{p.title}</a>
                    </h2>
                    <p
                      dangerouslySetInnerHTML={{ __html: p.description }}
                    />
                    <p>
                      <a href={`/blog/${p.slug}`}>Read the post &rarr;</a>
                    </p>
                  </article>
                </li>
              ))}
            </ul>

            <p className="stub-meta">
              New posts at every launch milestone and every monthly retro.
              Subscribe via the IndieHackers product page or the RSS feed
              (shipping at M5 + 30d).
            </p>

            <div style={{ marginTop: "var(--sp-32)" }}>
              <Button variant="ghost" size="md" href="/" arrow>
                Back to the landing
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
