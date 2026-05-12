/**
 * Studio Zero — SSRF egress guard.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Implements Shield's TB-6 mitigation:
 * every outbound URL the runner is asked to fetch is normalized and
 * checked against an IP/host blocklist BEFORE the socket() syscall
 * issues. This complements the platform-level Cilium NetworkPolicy
 * (defense in depth — the filter catches at the app layer, the network
 * policy catches at the host layer).
 *
 * Test coverage: `tests/ssrf-guard.test.ts` walks
 * `runner/fixtures/ssrf-corpus/index.json` and asserts every pattern is
 * blocked. Adding a new corpus entry MUST result in a passing test or
 * an explicit `expected_action !== 'block'` (none today).
 *
 * Defense layers (in this exact order, top-down):
 *   1. URL parse (WHATWG URL). Reject malformed early.
 *   2. Scheme allowlist — https only. (file://, gopher://, ftp:// → block.)
 *   3. Numeric-IP normalization: decimal / hex / octal IPv4 forms are
 *      converted to dotted-quad before the IP check. (Catches PT-22..24.)
 *   4. Hostname pattern blocklist — `.svc.cluster.local`,
 *      `metadata.google.internal`, common rebinder patterns.
 *   5. Pre-resolution literal-IP check (IPv4 + IPv6 + IPv4-mapped IPv6).
 *      If the host parses as a literal IP, run the blocklist NOW. (No
 *      DNS lookup needed → fastest path for SSRF-006..009, 022..024.)
 *   6. Defense in depth: DNS resolution + post-resolution IP check is
 *      done by the egress fetcher in `llm-gateway-client.ts` /
 *      `score-engine-client.ts` (resolve-and-pin to defeat rebinding).
 *      That resolution-time check is the LAST line — this filter rejects
 *      the obviously-bad cases up front so the resolver never runs.
 *
 * NOTE: redirect-chain validation (SSRF-025..027) is handled by the
 * fetch wrapper in `llm-gateway-client.ts` re-running this `validateUrl`
 * on each Location header before following.
 */

export interface SsrfValidationOk {
  ok: true;
  normalizedUrl: string;
}

export interface SsrfValidationBlock {
  ok: false;
  reason:
    | "malformed_url"
    | "scheme_not_allowed"
    | "loopback_ip"
    | "link_local_ip"
    | "rfc1918_ip"
    | "reserved_ip"
    | "carrier_grade_nat_ip"
    | "ipv6_unique_local"
    | "ipv6_link_local"
    | "ipv6_loopback"
    | "ipv4_mapped_ipv6_private"
    | "broadcast_ip"
    | "blocked_hostname"
    | "blocked_host_pattern";
  detail: string;
}

export type SsrfValidationResult = SsrfValidationOk | SsrfValidationBlock;

const ALLOWED_SCHEMES = new Set(["https:"]);

const BLOCKED_HOSTNAME_EXACTS = new Set([
  "metadata.google.internal",
  "metadata",
  "metadata.azure.internal",
  "localhost",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".svc.cluster.local",
  ".cluster.local",
  ".internal",
];

/**
 * Normalize numeric / hex / octal IPv4 forms to dotted-quad.
 * Returns null if the host is not a numeric IPv4 form.
 */
function tryNormalizeIPv4Numeric(host: string): string | null {
  // Bare-decimal form: e.g. 2130706433 → 127.0.0.1
  if (/^[0-9]+$/.test(host)) {
    const n = Number(host);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }
  // Hex form: e.g. 0x7f000001 → 127.0.0.1
  if (/^0x[0-9a-fA-F]+$/.test(host)) {
    const n = parseInt(host, 16);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }
  // Octal-leading-zero form: e.g. 017700000001 → 127.0.0.1.
  // Per CVE-2021-29923 family — strict parse rejects.
  if (/^0[0-7]+$/.test(host)) {
    const n = parseInt(host, 8);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }
  return null;
}

interface ParsedIPv4 {
  oct: [number, number, number, number];
}

function parseIPv4(host: string): ParsedIPv4 | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const oct: number[] = [];
  for (const p of parts) {
    if (!/^[0-9]+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    oct.push(n);
  }
  return { oct: [oct[0]!, oct[1]!, oct[2]!, oct[3]!] };
}

function classifyIPv4(
  ip: ParsedIPv4,
): SsrfValidationBlock["reason"] | null {
  const [a, b] = ip.oct;
  // 0.0.0.0/8 — reserved + Linux-routes-to-loopback quirk
  if (a === 0) return "reserved_ip";
  // 127.0.0.0/8 — loopback
  if (a === 127) return "loopback_ip";
  // 10.0.0.0/8 — RFC 1918
  if (a === 10) return "rfc1918_ip";
  // 172.16.0.0/12 — RFC 1918 (172.16..31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return "rfc1918_ip";
  // 192.168.0.0/16 — RFC 1918
  if (a === 192 && b === 168) return "rfc1918_ip";
  // 169.254.0.0/16 — link-local (AWS/GCP metadata)
  if (a === 169 && b === 254) return "link_local_ip";
  // 100.64.0.0/10 — RFC 6598 carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return "carrier_grade_nat_ip";
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return "reserved_ip";
  // 240.0.0.0/4 — class E reserved (255.255.255.255 = broadcast)
  if (a >= 240) {
    if (a === 255 && b === 255 && ip.oct[2] === 255 && ip.oct[3] === 255) {
      return "broadcast_ip";
    }
    return "reserved_ip";
  }
  return null;
}

/** Parse the bracketed IPv6 form (without brackets) and classify. */
function classifyIPv6(host: string): SsrfValidationBlock["reason"] | null {
  // Strip optional zone id
  const v = host.split("%")[0]!;
  const lower = v.toLowerCase();

  // ::1 loopback (or ::0001, fully expanded)
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") {
    return "ipv6_loopback";
  }

  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]?:/.test(lower)) return "ipv6_link_local";

  // fc00::/7 unique-local (covers fd00:: too)
  if (/^f[cd][0-9a-f]?[0-9a-f]?:/.test(lower)) return "ipv6_unique_local";

  // IPv4-mapped IPv6: ::ffff:a.b.c.d  OR ::ffff:HHHH:HHHH
  const mapped = lower.match(/^::ffff:([0-9a-f:.]+)$/);
  if (mapped) {
    // dotted-form variant
    const tail = mapped[1]!;
    const dotted = parseIPv4(tail);
    if (dotted) {
      const r = classifyIPv4(dotted);
      if (r) return "ipv4_mapped_ipv6_private";
    } else if (/^[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(tail)) {
      // hex pair form — convert to dotted-quad and re-check
      const [hi, lo] = tail.split(":");
      const hiN = parseInt(hi!, 16);
      const loN = parseInt(lo!, 16);
      const oct: [number, number, number, number] = [
        (hiN >>> 8) & 0xff,
        hiN & 0xff,
        (loN >>> 8) & 0xff,
        loN & 0xff,
      ];
      const r = classifyIPv4({ oct });
      if (r) return "ipv4_mapped_ipv6_private";
    }
  }

  return null;
}

function checkHostnameBlocklist(
  host: string,
): SsrfValidationBlock["reason"] | null {
  const lower = host.toLowerCase();
  if (BLOCKED_HOSTNAME_EXACTS.has(lower)) return "blocked_hostname";
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (lower.endsWith(suffix)) return "blocked_host_pattern";
  }
  return null;
}

/**
 * Validate a URL for egress safety. Returns { ok: true } when safe to
 * fetch, else { ok: false, reason, detail } with the specific block reason.
 *
 * USAGE: every fetch in the runner MUST go through this first, including
 * redirects (re-call on the Location header before following).
 */
export function validateUrl(input: string): SsrfValidationResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return {
      ok: false,
      reason: "malformed_url",
      detail: `Cannot parse URL: ${input}`,
    };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return {
      ok: false,
      reason: "scheme_not_allowed",
      detail: `Scheme '${url.protocol}' not in allowlist (https only)`,
    };
  }

  // hostname: WHATWG URL strips brackets from IPv6 already.
  let host = url.hostname;

  // Hostname exact + suffix blocklist FIRST (cheap path).
  const hostBlock = checkHostnameBlocklist(host);
  if (hostBlock) {
    return {
      ok: false,
      reason: hostBlock,
      detail: `Hostname '${host}' is in the blocklist`,
    };
  }

  // IPv6 literal? Detect by ':' presence (WHATWG strips the brackets).
  if (host.includes(":")) {
    const v6 = classifyIPv6(host);
    if (v6) {
      return {
        ok: false,
        reason: v6,
        detail: `IPv6 literal '${host}' classified as ${v6}`,
      };
    }
  }

  // Numeric IPv4 form? Normalize first.
  const normalized = tryNormalizeIPv4Numeric(host);
  if (normalized) host = normalized;

  // Dotted-quad IPv4?
  const v4 = parseIPv4(host);
  if (v4) {
    const klass = classifyIPv4(v4);
    if (klass) {
      return {
        ok: false,
        reason: klass,
        detail: `IPv4 literal '${host}' classified as ${klass}`,
      };
    }
  }

  // Reconstruct the normalized URL (with the numeric-form rewrite if any).
  const rebuilt = new URL(url.toString());
  rebuilt.hostname = host;

  return { ok: true, normalizedUrl: rebuilt.toString() };
}

/** Throw-style wrapper for code paths that prefer exceptions. */
export class SsrfBlockedError extends Error {
  readonly reason: SsrfValidationBlock["reason"];
  readonly detail: string;
  constructor(reason: SsrfValidationBlock["reason"], detail: string) {
    super(`ssrf_blocked: ${reason} — ${detail}`);
    this.name = "SsrfBlockedError";
    this.reason = reason;
    this.detail = detail;
  }
}

export function assertSafeUrl(input: string): string {
  const r = validateUrl(input);
  if (!r.ok) throw new SsrfBlockedError(r.reason, r.detail);
  return r.normalizedUrl;
}
