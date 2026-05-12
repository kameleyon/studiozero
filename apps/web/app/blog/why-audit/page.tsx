import * as React from "react";

import { Button } from "../../../components/Button";
import { Nav } from "../../../components/Nav";

import type { Metadata } from "next";

/**
 * /blog/why-audit — launch post (M5 Vega + Herald).
 *
 * Locked copy from `marketing/copy/08-blog-why-audit.md` v1.0.
 * Grade-8 ceiling, sentence case, no banned words. ~1500 words.
 *
 * Per `ia/sitemap.md` Marketing-site row 13:
 *   "/blog/[slug] — individual post; indexable; canonical per post"
 *
 * Structured data: schema.org Article, datePublished 2026-05-12.
 * SEO: indexable, canonical=`/blog/why-audit`.
 */

const PUBLISHED = "2026-05-12";
const SITE_URL = "https://studiozero-omega.vercel.app";

export const metadata: Metadata = {
  title: "Why the AI build needs an audit",
  description:
    "Your AI builder shipped code. Your code linter reads syntax. Neither one grades UX, accessibility, copy, or brand drift. That gap is the audit.",
  alternates: { canonical: `${SITE_URL}/blog/why-audit` },
  openGraph: {
    type: "article",
    url: `${SITE_URL}/blog/why-audit`,
    title: "Why the AI build needs an audit, not another builder",
    description:
      "The wedge in long form. Why we built an independent audit layer between the AI builder that wrote your code and the team about to ship it.",
    publishedTime: `${PUBLISHED}T00:00:00Z`,
    authors: ["Studio Zero"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Why the AI build needs an audit",
    description:
      "Your AI builder shipped code. Your code linter reads syntax. The gap between them is the audit.",
  },
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Why the AI build needs an audit, not another builder",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  author: { "@type": "Organization", name: "Studio Zero" },
  publisher: {
    "@type": "Organization",
    name: "Studio Zero",
    url: SITE_URL,
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}/blog/why-audit`,
  },
  description:
    "Your AI builder shipped code. Your code linter reads syntax. Neither one grades UX, accessibility, copy, or brand drift. That gap is the audit.",
  inLanguage: "en",
  wordCount: 1505,
};

export default function WhyAuditPost(): React.ReactElement {
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
        <article className="blog-post">
          <div className="wrap">
            <p className="eyebrow blog-eyebrow">
              Studio Zero &middot; Blog &middot;{" "}
              <time dateTime={PUBLISHED}>{PUBLISHED}</time>
            </p>
            <h1>
              Why the AI build needs an audit, not another{" "}
              <em className="serif-it">builder</em>.
            </h1>
            <p className="blog-lede">
              The AI builder shipped your code. The code linter read its
              syntax. Neither one looked at whether the signup form is
              invisible to a screen reader, whether the error message blames
              the user, or whether the primary button has three different
              shades of blue. That gap is the audit.
            </p>

            <h2 id="the-story-so-far">The story so far</h2>
            <p>
              Six months ago a friend of mine shipped a SaaS in a weekend
              with an AI builder. The landing page rendered, the signup
              form posted, the dashboard loaded. He paid the AI builder
              twenty dollars a month and felt clever for it. Two weeks
              later a customer wrote in saying the signup form was unusable
              on a screen reader. Two weeks after that, another customer
              flagged that the error message on the password field just
              said &ldquo;Invalid input.&rdquo; A third week and a designer
              he was hiring asked why the primary button had three
              different shades of blue across five pages.
            </p>
            <p>
              Every one of those failures was the AI builder doing exactly
              what an AI builder does. The code worked. It compiled, it
              deployed, it served. What it did not do was read the rubric
              a real product would have been graded against on the way out
              the door.
            </p>
            <p>
              My friend is not unusual. He is the median case for what
              builders ship in 2026. The AI builder is the most productive
              tool he has ever used, and he ships more code in a weekend
              than he used to ship in a quarter. The thing that has not
              caught up is the layer that reads what the AI shipped and
              grades it against the rubric the product actually has to
              meet.
            </p>

            <h2 id="two-layers">
              Two existing layers, and the gap between them
            </h2>
            <p>
              There are already two tool categories in the room when an AI
              builder ships.
            </p>
            <p>
              The first is the AI builder itself &mdash; v0, Bolt, Lovable,
              Cursor, Replit Agent, Devin. These tools write code. They
              are very good at writing code. They are not designed to
              audit the code they write; the audit job is incompatible
              with the building job for the same reason a writer cannot be
              their own editor on the same draft.
            </p>
            <p>
              The second is the code linter &mdash; Snyk, Codacy,
              SonarQube. These tools read source code and grade it for
              security issues, code smells, dependency CVEs, and a small
              handful of accessibility patterns. They are very good at
              reading source for the classes their rules cover. What they
              do not do is look at the rendered surface, read the copy,
              count the design tokens, or grade the page against an
              audience-fit rubric. The linter sees the source; it does not
              see the product.
            </p>
            <p>
              In the middle there is the gap. The gap is the rubric your
              customer is actually going to grade the product against the
              first time they use it &mdash; can they read the page, can
              they fill the form, do they understand the error, do they
              trust the brand, does the build feel like a product or like
              a prototype.
            </p>
            <p>That gap is the audit.</p>

            <h2 id="what-the-audit-does">
              What the audit does that the existing tools do not
            </h2>
            <p>
              Studio Zero is the audit layer. It is not an AI builder
              &mdash; it does not write code. It is not a code linter
              &mdash; it reads the live URL alongside the source. It is
              the layer in between.
            </p>
            <p>
              The audit reads the rendered surface and the source side by
              side. Seven specialist reviewers each grade one axis. Halo
              grades accessibility against WCAG 2.2 AA, every success
              criterion. Proof grades the reader-facing copy against a
              Flesch-Kincaid eight-grade ceiling. Optic grades the user
              flows against Nielsen&rsquo;s ten usability heuristics. Echo
              grades the audience fit between what the page says and who
              you said you were building for. Tide grades the brand
              consistency between the design tokens and the rendered
              styles. Cipher grades the security patterns the code
              linters already cover, but with the rendered context to
              catch what source-only linters miss. Canon grades the
              design-system drift.
            </p>
            <p>
              Each reviewer flags, recommends, and verifies. None of them
              edits the code. The output is a graded checklist where every
              finding has a file path, a line range, and one concrete
              change. The whole thing rolls up into a single readiness
              score between zero and one hundred &mdash; same scale, same
              rubric, same math every time you run it. Re-run the audit on
              the same intake six months from now, get the same score.
              The rubric is versioned per release; the score is
              deterministic.
            </p>

            <h2 id="why-the-rubric-matters">
              Why the rubric matters more than the runner
            </h2>
            <p>
              A pattern we see in tools that try to compete in this space
              &mdash; the runner is what you ship and the rubric is an
              afterthought. The runner is the orchestration code;
              it&rsquo;s the part that wires the AI calls together and
              produces the output. It is the easy part to ship and the
              hardest part to defend.
            </p>
            <p>
              The rubric is the opposite. The rubric is what you are
              grading against. It is the spec the audit is checking for.
              If your rubric is not versioned, your audit cannot be
              re-run. If your rubric is not deterministic in the score
              math, your audit cannot be compared run-to-run. If your
              rubric is not published, your customer cannot defend the
              result in writing.
            </p>
            <p>
              We publish the rubric. The rubric is versioned per release.
              The score math is deterministic &mdash; no LLM in the score
              calculation; LLMs read evidence, score math sums weighted
              findings. Re-run the rubric on the same intake, get the same
              score. The receipt is reproducible.
            </p>

            <h2 id="what-changes">When the audit ships</h2>
            <p>
              When the audit is in the loop, three things change about how
              the AI build lands.
            </p>
            <p>
              The first is that the failure modes the AI builder ships
              become legible. Before the audit, the founder ships the AI
              build and finds out about the accessibility failure when a
              customer writes in. After the audit, the failure mode is in
              the verdict screen before the deploy.
            </p>
            <p>
              The second is that the cost of catching a failure moves
              backward in the cycle. A failure caught in the audit costs a
              fix bundle. A failure caught by a customer costs the
              customer&rsquo;s patience, the support cycle, and the
              post-mortem.
            </p>
            <p>
              The third is that the conversation between the founder and
              the team changes. Before the audit, the conversation is
              &ldquo;ship it and see.&rdquo; After the audit, the
              conversation is &ldquo;here&rsquo;s the verdict, here&rsquo;s
              the file, here&rsquo;s the line, here&rsquo;s the fix.&rdquo;
              The team has a graded checklist they can ship against. The
              verdict is something they can defend in writing.
            </p>

            <h2 id="what-the-audit-does-not-do">
              What the audit does not do
            </h2>
            <p>
              The audit does not write your code. It does not fix the
              finding for you at MVP &mdash; that&rsquo;s the V1.5 product
              (Auto-PR fix delivery, opening a PR on a fix branch, never
              your default). It does not replace your designer, your QA,
              or your accessibility consultant; the audit is a layer they
              ride on top of, not a layer that replaces them.
            </p>
            <p>
              The audit also does not pass on first run. Most first audits
              do not. That&rsquo;s the design. The audit&rsquo;s job is to
              find what the AI builder shipped broken, and AI builders
              ship things broken with some regularity. If your first audit
              returns PASS &mdash; congratulations, you shipped a
              remarkably clean build. The interesting cases are PASS WITH
              FIXES (most builds) and FAIL (the build that should not have
              shipped yet).
            </p>

            <h2 id="open-question">
              The open question we&rsquo;re still ranging on
            </h2>
            <p>
              Here is the question we have not answered yet, and we are
              filing it in public so the answer arrives faster.
            </p>
            <p>
              The rubric we ship at V0.5 grades seven axes. We are
              confident in the weighting on accessibility, copy, UX,
              audience fit, brand, security patterns, and design-system
              drift. We are less confident on the weighting between those
              seven. A FAIL on accessibility should probably not be the
              same weight as a FAIL on design-system drift &mdash; but how
              much heavier should the accessibility weight be? We have a
              first-cut answer in the V0.5 rubric (accessibility weighted
              1.5x, copy 1.2x, the rest equal); we want the first hundred
              customer runs to tell us whether that weighting matches the
              order in which their customers actually complain.
            </p>
            <p>
              If you run the audit on something you shipped and the
              rubric&rsquo;s order does not match the order your own
              customers complain in, that&rsquo;s the data we&rsquo;re
              hunting for. The IH thread is open at{" "}
              <a
                href="https://indiehackers.com/product/studio-zero"
                rel="noopener noreferrer"
              >
                indiehackers.com/product/studio-zero
              </a>
              ; the receipts will go there.
            </p>

            <h2 id="how-to-start">How to start</h2>
            <p>
              Studio Zero is live at studiozero.dev. The free plan gives
              you unlimited Surface audits on one URL you own &mdash; no
              card on file, email verification required, the same rubric
              the paid plans run. Run the audit on something you already
              shipped. If the verdict says PASS WITH FIXES, you have your
              first checklist. If the verdict says FAIL, you have your
              first conversation with your team.
            </p>
            <p>
              The audit is the product. The rubric is the receipt. The
              score is the math.
            </p>
          </div>
        </article>

        <section className="final-cta" aria-labelledby="blog-final-cta-h2">
          <div className="wrap">
            <h2 id="blog-final-cta-h2">
              Run the audit on something you{" "}
              <em className="serif-it">shipped</em>.
            </h2>
            <p>
              The free Surface audit takes 6 to 12 minutes. It runs on any
              URL you own. Most first audits do not pass our gate &mdash;
              that&rsquo;s the design.
            </p>
            <Button variant="primary" size="lg" href="/signup" arrow>
              Run a free Surface audit
            </Button>
            <p className="microcopy">
              No card on file. Email verification required.
            </p>
          </div>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ARTICLE_JSONLD),
        }}
      />
    </>
  );
}
