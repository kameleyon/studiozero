/**
 * Studio Zero — Transactional email templates (HTML strings)
 *
 * Plain-HTML versions for portability. For rich React Email components, swap to
 * `@react-email/components` and pass via `react` to sendEmail().
 *
 * Voice rules (per Proof's audit):
 *   - 6th-grade reading level
 *   - No marketing speak in transactional email
 *   - Single primary action per email
 *   - Plaintext fallback always provided
 */

const baseStyle = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           line-height: 1.6; color: #18181b; max-width: 560px; margin: 0 auto; padding: 24px; }
    .button { display: inline-block; background: #18181b; color: #fff !important; padding: 12px 24px;
              border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 12px; color: #71717a; }
    a { color: #2563eb; }
  </style>
`;

export function welcomeEmail({ name, productName, dashboardUrl }: { name: string; productName: string; dashboardUrl: string }) {
  const html = `
    <!doctype html><html><head>${baseStyle}</head><body>
      <h1>Welcome to ${productName}, ${name}.</h1>
      <p>Your account is ready. Here's a single starting point — everything else can wait.</p>
      <p><a class="button" href="${dashboardUrl}">Open your dashboard</a></p>
      <p>If you didn't sign up for ${productName}, you can ignore this email.</p>
      <p class="footer">${productName} · <a href="${dashboardUrl}/settings/email">Email preferences</a></p>
    </body></html>
  `;
  const text = `Welcome to ${productName}, ${name}.\n\nYour account is ready. Open your dashboard:\n${dashboardUrl}\n\nIf you didn't sign up, ignore this email.`;
  return { html, text };
}

export function passwordResetEmail({ resetUrl, productName }: { resetUrl: string; productName: string }) {
  const html = `
    <!doctype html><html><head>${baseStyle}</head><body>
      <h1>Reset your password</h1>
      <p>Click the button below to choose a new password. This link expires in 1 hour.</p>
      <p><a class="button" href="${resetUrl}">Reset password</a></p>
      <p>If you didn't request this, ignore this email — your password stays the same.</p>
      <p class="footer">${productName}</p>
    </body></html>
  `;
  const text = `Reset your password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
  return { html, text };
}

export function receiptEmail({ amountUsd, periodDescription, invoiceUrl, productName }: { amountUsd: number; periodDescription: string; invoiceUrl: string; productName: string }) {
  const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountUsd);
  const html = `
    <!doctype html><html><head>${baseStyle}</head><body>
      <h1>Receipt from ${productName}</h1>
      <p><strong>${formattedAmount}</strong> for ${periodDescription}.</p>
      <p>Thanks for staying with us.</p>
      <p><a class="button" href="${invoiceUrl}">View invoice</a></p>
      <p class="footer">${productName} — questions? Reply to this email.</p>
    </body></html>
  `;
  const text = `Receipt from ${productName}\n${formattedAmount} for ${periodDescription}.\n\nView invoice: ${invoiceUrl}\n\nThanks for staying with us.`;
  return { html, text };
}
