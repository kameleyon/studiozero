/**
 * Studio Zero — Magic-link (passwordless) auth flow (Supabase)
 *
 * User enters email → receives a one-click sign-in link → lands on the
 * `redirectTo` URL with a session attached. No passwords to manage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendMagicLink(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string,
  options?: { shouldCreateUser?: boolean },
) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: options?.shouldCreateUser ?? true,
    },
  });
}
