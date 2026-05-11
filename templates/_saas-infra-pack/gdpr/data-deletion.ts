/**
 * Studio Zero — GDPR/CCPA Account Deletion
 *
 * Right to Erasure (GDPR Article 17): users can demand deletion of their
 * personal data. Studio Zero pattern:
 *   1. Soft-delete first (30-day grace period — protects against accidents)
 *   2. After grace period, hard-delete via background job
 *   3. Cascade: tenant rows where this user was the only owner → orphan
 *      handling decision per project (transfer ownership? delete the tenant?)
 *   4. Notify integrated services (Stripe customer deletion, Resend audience removal)
 *
 * Always log every deletion for compliance audit trail (anonymized — keep
 * timestamp + user_id hash, not the data itself).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function softDeleteUser(
  serviceRoleClient: SupabaseClient,
  userId: string,
  reason: "user_request" | "admin_action" = "user_request",
) {
  // Mark profile as soft-deleted; the user can still cancel during grace period.
  await serviceRoleClient
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), deletion_reason: reason })
    .eq("user_id", userId);

  // Disable auth login (without losing the row yet)
  await serviceRoleClient.auth.admin.updateUserById(userId, {
    ban_duration: "365d",
    user_metadata: { soft_deleted: true },
  });
}

export async function hardDeleteUser(
  serviceRoleClient: SupabaseClient,
  userId: string,
) {
  // Cascade behavior is enforced by ON DELETE CASCADE on FK constraints.
  // Anything not cascading must be deleted explicitly here.

  // Delete from auth — this triggers cascading deletes on FK refs to auth.users
  await serviceRoleClient.auth.admin.deleteUser(userId);

  // TODO: notify integrated services
  //   - Stripe: stripe.customers.del(stripeCustomerId)
  //   - Resend: remove from audience
  //   - PostHog: posthog.reset() doesn't delete server-side; use the personalDelete API
}
