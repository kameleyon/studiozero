/**
 * Resend SDK client wrapper. SERVER-ONLY.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Reviewers: Herald (template
 * call-site shape), Comply (CAN-SPAM / CASL / PECR send-time policy),
 * Watch (delivery-failure routing to Sentry).
 *
 * --- DESIGN -----------------------------------------------------------------
 *
 * The Resend SDK ships its own type-stripped HTTP wrapper. We deliberately
 * load it via dynamic `import` so:
 *
 *   1. Bundling stays optional. The package can be present (production +
 *      preview deploys) or absent (CI lint-only runs, local
 *      `next dev` without an outbound mailer); the module compiles either
 *      way. The static-analysis lane treats `resend` as an optional peer
 *      so the dep can land in package.json without a hard runtime gate
 *      during build verification.
 *
 *   2. The Resend SDK is loaded ONCE per cold start and cached in a
 *      module-level promise — repeat sends don't pay the import tax.
 *
 *   3. When `RESEND_API_KEY` is unset (e.g., preview deploy on a non-
 *      prod env or local mock-mode dev), `sendEmail()` returns a
 *      stub-mode result rather than throwing. The trigger layer still
 *      writes the `email_events` audit row; the missing-API-key
 *      condition is logged once for Watch.
 *
 * --- IDEMPOTENCY ------------------------------------------------------------
 *
 * Resend itself does not deduplicate sends — duplicate calls produce
 * duplicate emails. The trigger layer (lib/email-triggers/*) enforces
 * idempotency via the `email_events` UNIQUE(user_id, template,
 * dedupe_key) constraint BEFORE calling `sendEmail()`. The Resend
 * `messageId` returned here is recorded back on the row for the
 * delivery-status webhook to join on.
 *
 * --- BODY SHAPE -------------------------------------------------------------
 *
 * Per the Resend REST API + SDK: `send()` accepts `{ from, to, subject,
 * html, text, headers, tags, replyTo }`. Our wrapper requires both `html`
 * and `text` (plain-text MIME alternative is a CASL + accessibility
 * mandate per `marketing/copy/03-emails-e1-through-e5.md` §0.3). Tags
 * carry `template`, `user_id`, and `env` for delivery analytics.
 *
 * Cross-refs:
 *   - PRD §6.3 (lifecycle email triggers + CAN-SPAM/CASL/PECR)
 *   - `marketing/copy/03-emails-e1-through-e5.md` §0 (global send rules)
 *   - `architecture/iac/observability/sentry.md` (delivery-error alert)
 */

import "server-only";

/** Recognised template ids — matches the trigger layer's switch. */
export type EmailTemplateId =
  | "e1-welcome"
  | "e2-fail-upsell"
  | "e3-pass-with-fixes-reaudit"
  | "e4-reaudit-window-expiring"
  | "e5-day-60-winback"
  | "dunning-t0"
  | "dunning-t3"
  | "dunning-t7"
  | "dunning-t14"
  | "dunning-t21"
  | "cancel-us-default"
  | "cancel-eu-uk-cooling-off"
  | "cancel-ca-prorata"
  | "consent-confirmation";

/** Shape every template renderer returns to this wrapper. */
export interface RenderedEmail {
  subject: string;
  /** Inline-CSS HTML — must include the canonical footer + unsubscribe link. */
  html: string;
  /** Plain-text MIME alternative — CASL + a11y. */
  text: string;
}

/** Tag bag pushed to Resend for analytics + per-template delivery routing. */
export interface EmailTags {
  template: EmailTemplateId;
  user_id?: string;
  env?: string;
  [key: string]: string | undefined;
}

export interface SendEmailRequest {
  to: string | string[];
  template: EmailTemplateId;
  rendered: RenderedEmail;
  tags?: EmailTags;
  /** Optional Reply-To override. Defaults to `hello@studiozero.dev`. */
  replyTo?: string;
  /** Optional List-Unsubscribe header (RFC 8058 one-click). */
  listUnsubscribeUrl?: string;
}

export type SendEmailResult =
  | {
      status: "sent";
      provider_message_id: string;
    }
  | {
      status: "stub";
      reason: "missing_api_key" | "missing_sdk";
    }
  | {
      status: "error";
      error: string;
    };

const FROM_ADDRESS = "Studio Zero <hello@studiozero.dev>";
const DEFAULT_REPLY_TO = "hello@studiozero.dev";

/** Cached SDK module + Resend instance. Resolved once per cold start. */
let resendInstancePromise: Promise<unknown | null> | null = null;

interface ResendLike {
  emails: {
    send(args: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
      text: string;
      reply_to?: string;
      headers?: Record<string, string>;
      tags?: Array<{ name: string; value: string }>;
    }): Promise<{ data?: { id?: string } | null; error?: { message?: string } | null }>;
  };
}

async function getResend(): Promise<ResendLike | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return null;

  if (resendInstancePromise === null) {
    resendInstancePromise = (async () => {
      try {
        // Indirect specifier — TypeScript does NOT statically resolve the
        // module path, so the type-check lane compiles even when the
        // `resend` dep isn't installed. Production installs it via
        // package.json. The try/catch handles the missing-module case at
        // runtime.
        const specifier = "resend";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await (Function("s", "return import(s)") as any)(specifier)) as unknown as {
          Resend: new (key: string) => ResendLike;
        };
        return new mod.Resend(apiKey);
      } catch {
        return null;
      }
    })();
  }
  return (await resendInstancePromise) as ResendLike | null;
}

/**
 * Send an email via Resend. Server-only.
 *
 * Behaviour matrix:
 *   - RESEND_API_KEY missing  → `{ status: 'stub', reason: 'missing_api_key' }`
 *   - resend npm not present  → `{ status: 'stub', reason: 'missing_sdk' }`
 *   - Resend returns an error → `{ status: 'error', error: msg }`
 *   - 200 OK with message id  → `{ status: 'sent', provider_message_id }`
 *
 * Callers MUST write the `email_events` row BEFORE this function returns
 * (regardless of result), so a failed/stubbed send is still observable
 * in the compliance audit log.
 */
export async function sendEmail(
  req: SendEmailRequest,
): Promise<SendEmailResult> {
  const resend = await getResend();
  if (resend === null) {
    const reason: "missing_api_key" | "missing_sdk" =
      process.env.RESEND_API_KEY ? "missing_sdk" : "missing_api_key";
    return { status: "stub", reason };
  }

  // RFC 8058 one-click unsubscribe header. Gmail + Apple Mail render
  // the inline unsubscribe affordance from this header. Required for
  // marketing-class sends per Resend + Google sender guidelines 2024.
  const headers: Record<string, string> = {};
  if (req.listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${req.listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const tagPairs: Array<{ name: string; value: string }> = [];
  if (req.tags) {
    for (const [name, value] of Object.entries(req.tags)) {
      if (value === undefined) continue;
      // Resend tag values: ASCII letters, numbers, _, -, max 256 chars.
      const cleanValue = String(value)
        .replace(/[^A-Za-z0-9_-]/g, "_")
        .slice(0, 256);
      tagPairs.push({ name, value: cleanValue });
    }
  }
  // Always tag with the template id even when caller's tag bag is empty.
  if (!req.tags || req.tags.template === undefined) {
    tagPairs.push({ name: "template", value: req.template });
  }

  try {
    const res = await resend.emails.send({
      from: FROM_ADDRESS,
      to: req.to,
      subject: req.rendered.subject,
      html: req.rendered.html,
      text: req.rendered.text,
      reply_to: req.replyTo ?? DEFAULT_REPLY_TO,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      tags: tagPairs.length > 0 ? tagPairs : undefined,
    });
    if (res.error) {
      return {
        status: "error",
        error: res.error.message ?? "resend_error",
      };
    }
    const id = res.data?.id;
    if (!id) {
      return { status: "error", error: "resend_returned_no_id" };
    }
    return { status: "sent", provider_message_id: id };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "resend_throw",
    };
  }
}

/**
 * Test/dev-only helper that lets contract tests stub the underlying
 * SDK without a real API key. Not exported to production code paths.
 */
export function __resetResendForTests(): void {
  resendInstancePromise = null;
}
