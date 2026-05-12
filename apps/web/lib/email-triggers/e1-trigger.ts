/**
 * E1 trigger — called from /api/auth/callback after email verification.
 */
import {
  resolveUserForEmail,
  sendLifecycleEmail,
  type TriggerResult,
} from "./_common";
import { renderE1Welcome } from "../email-templates/e1-welcome";


import "server-only";

export async function triggerE1(userId: string): Promise<TriggerResult> {
  const r = await resolveUserForEmail(userId);
  if (!r.ok) return { status: "suppressed", reason: r.reason };

  return sendLifecycleEmail({
    template: "e1-welcome",
    user: r.user,
    scope: "marketing",
    emailClass: "transactional",
    dedupeKey: "welcome",
    analyticsId: "e1",
    render: (unsubscribeUrl) => renderE1Welcome({ unsubscribeUrl }),
  });
}
