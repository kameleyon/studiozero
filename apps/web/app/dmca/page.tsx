import * as React from "react";

import { Button } from "../../components/Button";
import { Nav } from "../../components/Nav";

import type { Metadata } from "next";

/**
 * /dmca — DMCA designated-agent route (M5 Comply + Vega).
 *
 * Phase 9 M5. Per `ia/sitemap.md` Marketing-site row 14 (/dmca) and
 * `sprint/milestone-M5.md` exit-gate row 1 (DMCA agent registered).
 *
 * HUMAN action pending: Jo registers the designated agent with the
 * U.S. Copyright Office per `compliance/dmca-designated-agent.md`.
 * Once filing completes, this page is updated with:
 *   - Directory listing URL (https://www.copyright.gov/dmca-directory/)
 *   - Effective date stamp
 *
 * Until then, the route renders the procedure + contact placeholder so
 * any takedown notice arriving on launch day has a documented path.
 *
 * SEO: indexable, canonical=`/dmca`.
 */
export const metadata: Metadata = {
  title: "DMCA — designated agent and takedown procedure",
  description:
    "Studio Zero's DMCA designated agent, takedown notification procedure, counter-notice procedure, and repeat-infringer policy. 17 U.S.C. Section 512.",
  alternates: { canonical: "https://studiozero-omega.vercel.app/dmca" },
  openGraph: {
    type: "website",
    url: "https://studiozero-omega.vercel.app/dmca",
    title: "DMCA — Studio Zero",
    description:
      "Designated agent, takedown procedure, counter-notice procedure.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DMCA — Studio Zero",
    description: "Designated agent and takedown procedure.",
  },
};

export default function DmcaPage(): React.ReactElement {
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
            <span className="eyebrow stub-eyebrow">
              Legal &middot; DMCA
            </span>
            <h1>
              DMCA &mdash; designated agent and takedown procedure.
            </h1>

            <p className="legal-meta">
              <strong>Effective:</strong> 2026-05-12 &middot;{" "}
              <strong>Statute:</strong> 17 U.S.C. &sect; 512(c)(2)
            </p>

            <p>
              Studio Zero respects intellectual-property rights and
              responds to clear notifications of alleged copyright
              infringement that comply with the Digital Millennium
              Copyright Act (DMCA). This page names our designated
              agent, the procedure for sending a takedown notification,
              the procedure for filing a counter-notification, and our
              repeat-infringer policy.
            </p>

            <h2 id="designated-agent">Designated agent</h2>
            <p>
              Send DMCA takedown notifications to the designated agent
              below. Notifications that do not include the elements
              listed in &sect; 512(c)(3) (see &sect;3 of this page) will
              not produce a takedown.
            </p>
            <address className="dmca-agent">
              <strong>DMCA Designated Agent &mdash; Studio Zero</strong>
              <br />
              Email:{" "}
              <a href="mailto:dmca@studiozero.dev">dmca@studiozero.dev</a>
              <br />
              Postal:{" "}
              <em>
                Pending publication on the U.S. Copyright Office DMCA
                Directory. Filing in progress per{" "}
                <code>compliance/dmca-designated-agent.md</code>; this
                page is updated within one business day of the directory
                listing going live.
              </em>
              <br />
              U.S. Copyright Office DMCA Directory:{" "}
              <a
                href="https://www.copyright.gov/dmca-directory/"
                rel="noopener noreferrer"
              >
                copyright.gov/dmca-directory
              </a>
            </address>

            <h2 id="what-the-notice-must-include">
              What a takedown notification must include
            </h2>
            <p>
              Per 17 U.S.C. &sect; 512(c)(3)(A), a valid notification
              must include all of the following:
            </p>
            <ol>
              <li>
                A physical or electronic signature of the copyright owner
                or a person authorized to act on their behalf.
              </li>
              <li>
                Identification of the copyrighted work claimed to have
                been infringed, or, if multiple works are covered by a
                single notification, a representative list.
              </li>
              <li>
                Identification of the material that is claimed to be
                infringing and that is to be removed or access disabled,
                with information reasonably sufficient to permit Studio
                Zero to locate the material (a URL is preferred).
              </li>
              <li>
                Information reasonably sufficient to permit Studio Zero
                to contact the complaining party &mdash; including an
                address, telephone number, and email address.
              </li>
              <li>
                A statement that the complaining party has a good-faith
                belief that the use of the material in the manner
                complained of is not authorized by the copyright owner,
                its agent, or the law.
              </li>
              <li>
                A statement that the information in the notification is
                accurate, and under penalty of perjury, that the
                complaining party is authorized to act on behalf of the
                owner of the exclusive right that is allegedly infringed.
              </li>
            </ol>

            <h2 id="counter-notification">Counter-notification</h2>
            <p>
              If material you posted was removed in response to a DMCA
              notification and you believe the removal was in error or
              that you have authorization to post the material, you may
              send a counter-notification under &sect; 512(g)(3). The
              counter-notification must include:
            </p>
            <ol>
              <li>Your physical or electronic signature.</li>
              <li>
                Identification of the material that was removed or
                disabled and the location at which it appeared before
                removal.
              </li>
              <li>
                A statement under penalty of perjury that you have a
                good-faith belief that the material was removed or
                disabled as a result of mistake or misidentification.
              </li>
              <li>
                Your name, address, and telephone number, and a statement
                that you consent to the jurisdiction of the U.S.
                District Court for the judicial district in which your
                address is located (or, if outside the U.S., for any
                judicial district in which Studio Zero may be found), and
                that you will accept service of process from the person
                who provided the original notification under &sect;
                512(c)(1)(C) or an agent of such person.
              </li>
            </ol>

            <h2 id="repeat-infringer">Repeat-infringer policy</h2>
            <p>
              Studio Zero terminates, in appropriate circumstances,
              accounts of users who are repeat infringers. Per our
              Acceptable Use Policy at{" "}
              <a href="/aup">/aup</a>, repeated valid DMCA notifications
              against a single account constitute grounds for account
              termination. We log every notification, every
              counter-notification, and every account-action decision.
            </p>

            <h2 id="false-claims">False claims</h2>
            <p>
              Filing a knowingly false DMCA notification or
              counter-notification exposes the filer to liability under
              &sect; 512(f) for damages, including costs and attorneys&rsquo;
              fees, incurred by the alleged infringer, the copyright
              owner, the copyright owner&rsquo;s authorized licensee, or
              Studio Zero. We may pursue such claims in appropriate
              circumstances.
            </p>

            <h2 id="not-legal-advice">Not legal advice</h2>
            <p>
              This page describes Studio Zero&rsquo;s procedure for
              receiving and acting on DMCA notifications. It is not
              legal advice. If you believe your copyright has been
              infringed, consult an attorney.
            </p>

            <p className="stub-meta">
              Owner: Comply &middot; Statute: 17 U.S.C. &sect; 512 &middot;
              Filing reference:{" "}
              <code>compliance/dmca-designated-agent.md</code>
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
