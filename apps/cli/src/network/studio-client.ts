/**
 * Studio Zero — HTTP client used by the CLI for all calls to the web app.
 *
 * Phase 9 M3 Batch 1 (Forge). Thin fetch wrapper that:
 *
 *   - carries the pairing token in `Authorization: Bearer` (TB-7);
 *   - asserts the AI Act disclosure header (`X-AI-Generated: studio-zero`)
 *     on EVERY outbound POST per PRD §11.3 + AI Act Art. 50;
 *   - sets a sane User-Agent so server-side rate-limiters can identify
 *     legitimate CLI traffic;
 *   - sets `redirect: 'error'` so SSRF-style redirects don't pass our
 *     guard (mirrors apps/runner SSRF posture);
 *   - returns a discriminated `{ ok, status, body }` so caller code
 *     handles errors without throw/catch noise.
 *
 * What this client does NOT do:
 *   - retries (handled per-call by the caller; verdict upload is the
 *     only idempotent retry path)
 *   - body bytes longer than 64 KiB on the request side (CLI never
 *     uploads source — the privacy invariant of M3)
 *
 * For testability, the actual `fetch` impl is injectable via the `fetcher`
 * arg. Default is global fetch (Node 24 LTS has it built-in).
 */
import { AI_DISCLOSURE_HEADER_NAME, AI_DISCLOSURE_HEADER_VALUE } from "../shared/ai-disclosure.js";

export interface RequestOpts {
  apiUrl: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  /** Pairing-token Bearer; undefined for unauthed routes (e.g. /api/cli/pair/init). */
  auth?: string | undefined;
  /** JSON body. */
  body?: Record<string, unknown> | undefined;
  /** Override the default fetcher (testing). */
  fetcher?: typeof fetch;
  /** Idempotency key for retryable requests (verdict upload). */
  idempotencyKey?: string | undefined;
  /** Hard byte ceiling on the request body — defense in depth against
   *  any code path that accidentally tries to upload source. 64 KiB is
   *  more than enough for the largest verdict payload we ship. */
  maxBodyBytes?: number;
}

export interface Response<T> {
  ok: boolean;
  status: number;
  body: T;
}

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export async function request<T = unknown>(
  opts: RequestOpts,
): Promise<Response<T>> {
  const fetcher = opts.fetcher ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new Error(
      "[studio-zero] global fetch is not available; Node 24 LTS required",
    );
  }

  const url = `${opts.apiUrl.replace(/\/+$/, "")}${opts.path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "studio-zero-cli",
    [AI_DISCLOSURE_HEADER_NAME]: AI_DISCLOSURE_HEADER_VALUE,
  };
  if (opts.auth) headers.Authorization = `Bearer ${opts.auth}`;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  let bodyStr: string | undefined;
  if (opts.body !== undefined && opts.method !== "GET") {
    bodyStr = JSON.stringify(opts.body);
    const max = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    // M3 privacy invariant: refuse to send oversized payloads. This
    // is a runtime guard, not a substitute for the contract test
    // (cli-no-upload.spec.ts) — but it catches accidental regressions.
    if (Buffer.byteLength(bodyStr, "utf-8") > max) {
      throw new Error(
        `[studio-zero] request body exceeds ${max} bytes; refusing to send (privacy invariant)`,
      );
    }
    headers["Content-Type"] = "application/json";
  }

  let res: globalThis.Response;
  try {
    res = await fetcher(url, {
      method: opts.method,
      headers,
      ...(bodyStr !== undefined ? { body: bodyStr } : {}),
      redirect: "error", // SSRF-style guard; mirrors apps/runner
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: { error: (err as Error).message } as unknown as T,
    };
  }

  let parsed: T;
  try {
    parsed = (await res.json()) as T;
  } catch {
    parsed = {} as T;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}
