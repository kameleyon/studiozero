/**
 * Studio Zero — OAuth flows (Supabase)
 *
 * Configure providers in Supabase dashboard first:
 *   Project → Authentication → Providers → enable Google / GitHub / Apple / etc.
 * Set the callback URL there to match your `redirectTo`.
 */
import type { SupabaseClient, Provider } from "@supabase/supabase-js";

export type OAuthProvider = Extract<Provider,
  "google" | "github" | "apple" | "azure" | "facebook" | "discord" | "linkedin_oidc"
>;

export async function signInWithOAuth(
  supabase: SupabaseClient,
  provider: OAuthProvider,
  redirectTo: string,
  scopes?: string,
) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes },
  });
}
