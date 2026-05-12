/**
 * Studio Zero — findings writer.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Persists `Finding` rows to the
 * `findings` table via a Supabase client authenticated with a runner
 * JWT. RLS policy `findings_runner_insert` (Atlas migration 0002)
 * ensures that even if this writer is told to write a row for the
 * wrong tenant or run, Postgres refuses with `permission_denied`.
 *
 * Per Cipher Fix-1 + Atlas's RLS body the runner CANNOT bypass this
 * — there is no service-role key in the runner. The Supabase client
 * is constructed with the anon key, then the runner-JWT is added as
 * the `Authorization` header on every request via the access_token
 * mechanism.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import type { TokenRefresher } from "./jwt-refresh.js";

/** Mirrors `audit-output.v1.schema.json` $defs/finding for inserts. */
export interface FindingRow {
  id: string;
  run_id: string;
  tenant_id: string;
  reviewer:
    | "jury"
    | "optic"
    | "proof"
    | "halo"
    | "compass"
    | "trace"
    | "canon";
  severity: "Blocker" | "Critical" | "Major" | "Minor" | "Polish";
  layer: string;
  summary: string;
  evidence: Record<string, unknown>;
  recommendation: string;
  estimated_effort: "S" | "M" | "L";
  wcag_sc: string[] | null;
}

export interface FindingsWriter {
  insertFinding(row: FindingRow, signal: AbortSignal): Promise<void>;
}

export interface FindingsWriterOptions {
  supabaseUrl: string;
  anonKey: string;
  refresher: TokenRefresher;
  /** Expected tenant_id for this writer instance. Used as a client-side
   *  pre-check before the DB call — the load-bearing check is RLS. */
  expectedTenantId: string;
  /** Expected run_id. Same role: client pre-check; RLS is authoritative. */
  expectedRunId: string;
}

class SupabaseFindingsWriter implements FindingsWriter {
  private readonly client: SupabaseClient;
  private readonly refresher: TokenRefresher;
  private readonly expectedTenantId: string;
  private readonly expectedRunId: string;

  constructor(opts: FindingsWriterOptions) {
    this.refresher = opts.refresher;
    this.expectedTenantId = opts.expectedTenantId;
    this.expectedRunId = opts.expectedRunId;
    this.client = createClient(opts.supabaseUrl, opts.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-AI-Generated": "studio-zero" },
      },
    });
  }

  async insertFinding(row: FindingRow, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw new Error("[runner] findings-writer: aborted");
    }
    // Client-side pre-check: refuse to write a row claiming a different
    // tenant/run than this writer was scoped to. RLS is still the
    // authoritative enforcement, but this catches programmer error early
    // with a clear message instead of a permission_denied trace.
    if (row.tenant_id !== this.expectedTenantId) {
      throw new Error(
        `[runner] findings-writer: tenant_id mismatch — expected ${this.expectedTenantId}, got ${row.tenant_id}`,
      );
    }
    if (row.run_id !== this.expectedRunId) {
      throw new Error(
        `[runner] findings-writer: run_id mismatch — expected ${this.expectedRunId}, got ${row.run_id}`,
      );
    }

    // Set the JWT for THIS call. We rebuild the auth header from the
    // refresher each time so a mid-run refresh propagates immediately.
    const token = this.refresher.getToken().token;
    // Supabase-js v2 honors `client.auth.setSession`, but we don't have
    // a refresh_token (the runner has only the access_token). The
    // documented pattern is to use the headers override on the client
    // OR to call `.setSession({ access_token, refresh_token: '' })`.
    // We use header injection via `client.functions` style: the
    // PostgREST surface picks up Authorization off the global headers.
    // For per-request auth override, supabase-js exposes the .from()
    // builder which uses the auth state — we mutate it for each call.
    //
    // The SUPPORTED pattern in v2 for a static bearer (not OAuth-style):
    //   client.auth.setSession({ access_token: token, refresh_token: '' })
    // But this is a no-op on each call if the token is the same. We
    // call it idempotently to ensure freshness post-mid-run-refresh.
    await this.client.auth.setSession({
      access_token: token,
      refresh_token: "",
    });

    const insertion = this.client
      .from("findings")
      .insert(row)
      .abortSignal(signal);

    const { error } = await insertion;

    if (error) {
      // RLS denial signal — let the caller decide whether this is a
      // bug or a security event (Shield logs it; Forge crashes the run).
      throw new Error(
        `[runner] findings-writer: insert failed — ${error.message}`,
      );
    }
  }
}

export function createFindingsWriter(
  opts: FindingsWriterOptions,
): FindingsWriter {
  return new SupabaseFindingsWriter(opts);
}
