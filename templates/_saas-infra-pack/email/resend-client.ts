/**
 * Studio Zero — Resend Client + send helpers
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@example.com";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  /** Either provide React element OR `html` directly */
  react?: React.ReactElement;
  html?: string;
  text?: string;          // plaintext fallback (recommended for deliverability)
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    ...(opts.react && { react: opts.react }),
    ...(opts.html && { html: opts.html }),
    ...(opts.text && { text: opts.text }),
    ...(opts.replyTo && { replyTo: opts.replyTo }),
  });
}
