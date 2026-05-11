/**
 * Studio Zero — GDPR/CCPA Data Export
 *
 * Builds a JSON snapshot of every piece of personal data the system holds for
 * a user. GDPR Article 20 (Right to Portability) requires this be available on
 * request and machine-readable.
 *
 * Run as a background job (don't block the request) and email the user a
 * download link when complete.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserDataExport {
  exported_at: string;
  user_id: string;
  profile: unknown;
  memberships: unknown[];
  // Add per-table sections for every tenant-scoped table that holds user data.
  // Example: projects, comments, uploads, billing_records, etc.
  [domainTable: string]: unknown;
}

/**
 * Build a complete export. The service-role client bypasses RLS so we can read
 * every row associated with the user — but we still scope to user_id.
 */
export async function buildUserDataExport(
  serviceRoleClient: SupabaseClient,
  userId: string,
): Promise<UserDataExport> {
  const { data: profile } = await serviceRoleClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: memberships } = await serviceRoleClient
    .from("memberships")
    .select("*")
    .eq("user_id", userId);

  // TODO: add a query per tenant-scoped table holding personal data.
  // Example:
  // const { data: projects } = await serviceRoleClient
  //   .from("projects").select("*").eq("created_by", userId);

  return {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile,
    memberships: memberships ?? [],
  };
}
