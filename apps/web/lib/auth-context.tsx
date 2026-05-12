"use client";

/**
 * Auth context — Phase 9 M1 Batch 2 (Vega).
 *
 * Unified provider that fronts BOTH the real Supabase auth client and the
 * legacy `lib/auth-mock.tsx`. Components call `useSupabaseUser()` — they
 * never need to know which backend is live.
 *
 * Selection rule (`lib/env.ts isMockMode()`):
 *   - Supabase env vars present AND `NEXT_PUBLIC_USE_AUTH_MOCK!=='true'`
 *     → real path (subscribes to `onAuthStateChange`).
 *   - Otherwise → mock path (returns `MOCK_USER` synchronously, no network).
 *
 * Contract (matches Forge-1's expected `useSupabaseUser()` shape):
 *   {
 *     user: { id, email, displayName, byokVerified, ... } | null
 *     loading: boolean
 *     mock: boolean
 *     signOut: () => Promise<void>
 *   }
 *
 * Cipher: this module is client-only ("use client"), never re-exports
 * `lib/supabase-service.ts` (server-only).
 *
 * Cleanup: subscription is torn down in the effect cleanup so navigating
 * between routes doesn't leak websockets.
 */
import * as React from "react";

import { isMockMode } from "./env";
import { MOCK_USER, type MockUser } from "./mock-data";
import { createBrowserSupabaseClient } from "./supabase-client";

import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  byokVerified: boolean;
  byokKeyFingerprint: string | null;
  modePref: "byok" | "cli" | "managed" | null;
  githubAppInstalled: boolean;
  /** Tenant id from JWT metadata. Empty string when unauth. */
  tenantId: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  /** True when running against the mock-data + mock-auth-cookie path. */
  mock: boolean;
  signOut: () => Promise<void>;
}

const Ctx = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  mock: true,
  signOut: async () => {},
});

/**
 * Map the Supabase auth user shape onto the app's `AppUser` (which still
 * carries the mock-era display fields so the rest of the UI doesn't have
 * to fork). Anything beyond id+email is pulled from `user_metadata` (set
 * by the signup flow + tenant_members upsert).
 */
function adaptSupabaseUser(u: SupabaseAuthUser): AppUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: u.id,
    email: u.email ?? "",
    displayName:
      (meta["display_name"] as string | undefined) ?? u.email ?? "Studio Zero user",
    byokVerified: Boolean(meta["byok_verified"]),
    byokKeyFingerprint: (meta["byok_fingerprint"] as string | null | undefined) ?? null,
    modePref:
      (meta["mode_pref"] as "byok" | "cli" | "managed" | null | undefined) ?? null,
    githubAppInstalled: Boolean(meta["github_installation_id"]),
    tenantId: (meta["default_tenant_id"] as string | undefined) ?? "",
  };
}

function mockUserToAppUser(m: MockUser): AppUser {
  return {
    id: m.id,
    email: m.email,
    displayName: m.displayName,
    byokVerified: m.byokVerified,
    byokKeyFingerprint: m.byokKeyFingerprint,
    modePref: m.modePref,
    githubAppInstalled: m.githubAppInstalled,
    tenantId: "00000000-0000-0000-0000-000000000099",
  };
}

interface AuthProviderProps {
  /** Pre-resolved user from SSR. When provided, the client skips its
   * initial fetch and renders straight away (no auth-flicker). */
  initialUser?: AppUser | null;
  children: React.ReactNode;
}

export function AuthProvider({
  initialUser,
  children,
}: AuthProviderProps): React.ReactElement {
  const mock = isMockMode();
  const [user, setUser] = React.useState<AppUser | null>(
    initialUser ?? (mock ? mockUserToAppUser(MOCK_USER) : null),
  );
  const [loading, setLoading] = React.useState<boolean>(
    initialUser === undefined && !mock,
  );

  React.useEffect(() => {
    if (mock) {
      // Mock mode: synchronous + stable.
      setUser(mockUserToAppUser(MOCK_USER));
      setLoading(false);
      return;
    }

    let supabase: SupabaseClient | null = null;
    try {
      supabase = createBrowserSupabaseClient();
    } catch {
      // Env vars missing despite isMockMode() saying otherwise — treat
      // as mock so we don't crash the UI.
      setUser(mockUserToAppUser(MOCK_USER));
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async (): Promise<void> => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user ? adaptSupabaseUser(data.user) : null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = (session as { user?: SupabaseAuthUser } | null)?.user;
      setUser(sessionUser ? adaptSupabaseUser(sessionUser) : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [mock]);

  const signOut = React.useCallback(async (): Promise<void> => {
    if (mock) {
      if (typeof document !== "undefined") {
        document.cookie =
          "sz-session-mock=; path=/; max-age=0; SameSite=Lax";
      }
      setUser(null);
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // best-effort
    }
    setUser(null);
  }, [mock]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, mock, signOut }),
    [user, loading, mock, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Primary hook — replaces the auth-mock `useUser()` everywhere. */
export function useSupabaseUser(): AuthContextValue {
  return React.useContext(Ctx);
}
