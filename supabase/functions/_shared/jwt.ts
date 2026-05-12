// Runner-JWT mint + verify helpers shared across Edge Functions.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (signing material,
// scope discipline), Atlas (claim shape matches `auth.tenant_id()` /
// `auth.runner_run_id()` / `auth.claim_role()` helpers in migration 0002).
//
// Claims shape (from architecture/database/runner-jwt.md):
//
//   {
//     sub:        "worker:<host>" | "cli:<pairing-id>",
//     aud:        "studio-zero/runner",
//     iss:        "studio-zero/mint-runner-token",
//     tenant_id:  "<uuid>",
//     run_id:     "<ulid>",
//     role:       "runner",
//     iat:        <unix-seconds>,
//     exp:        <iat + 300>,
//     jti:        "<uuid>"
//   }
//
// Signing material: the Supabase JWT secret. In Edge Functions runtime
// it's `Deno.env.get("SUPABASE_JWT_SECRET")` — auto-injected by Supabase.
// HS256 matches the rest of Supabase's JWT ecosystem; using a different
// alg would break the database `auth.jwt()` parser.

// deno-lint-ignore-file no-explicit-any

export const RUNNER_AUDIENCE = "studio-zero/runner";
export const RUNNER_ISSUER = "studio-zero/mint-runner-token";
export const RUNNER_TTL_SECONDS = 300; // 5 minutes hard cap (ARCH-D3)

export interface RunnerClaims {
  sub: string;
  aud: string;
  iss: string;
  tenant_id: string;
  run_id: string;
  role: "runner";
  iat: number;
  exp: number;
  jti: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Sign a runner JWT. Pure crypto — no DB side-effects. */
export async function signRunnerJwt(
  claims: RunnerClaims,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await importSigningKey(secret);
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${base64UrlEncode(new Uint8Array(sigBuf))}`;
}

/** Verify a runner JWT signature + parse claims. Returns null on failure. */
export async function verifyRunnerJwt(
  token: string,
  secret: string,
): Promise<RunnerClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSig] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSig) return null;
  try {
    const key = await importSigningKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(encodedSig),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!ok) return null;
    const payloadJson = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const claims = JSON.parse(payloadJson) as RunnerClaims;
    return claims;
  } catch {
    return null;
  }
}

/** Extract the Bearer token from an Authorization header. */
export function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

/** Generates a v4-ish UUID without taking a dep. */
export function newJti(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant (RFC 4122).
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** SHA-256 hex digest of a string. Used to store `token_sha256` for the
 *  mint audit row without persisting the token plaintext. */
export async function sha256Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
