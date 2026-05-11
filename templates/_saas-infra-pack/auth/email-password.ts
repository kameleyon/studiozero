/**
 * Studio Zero — Email + Password auth flows (Supabase)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
  redirectTo?: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string,
) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(supabase: SupabaseClient, newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function signOut(supabase: SupabaseClient) {
  return supabase.auth.signOut();
}
