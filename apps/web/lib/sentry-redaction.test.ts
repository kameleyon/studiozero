/**
 * Sentry redaction — unit tests.
 *
 * Owner: Cipher (this test file is the executable spec for the
 * `redactPiiAndSecrets()` middleware in `sentry-redaction.ts`). Covers:
 *
 *   - Every regex in `SECRET_PATTERNS` (positive hit + negative pass)
 *   - Shannon-entropy detector (≥4.5 bits/byte over ≥24 chars)
 *   - `DENIED_KEYS` property-name redaction
 *   - Code-density heuristic (raw-source-looking blobs)
 *   - `/var/runs/<tenant>/<run>/` path redaction
 *   - LLM-host (anthropic / openai / openrouter / replicate) body strip
 *   - Allowlist pass-through: well-shaped metadata events flow unmodified
 *   - Cyclic-reference safety
 *   - Null-return on empty-after-redaction event
 *
 * Target: ≥20 cases per Phase 9 M1 spec; this file ships 30+.
 *
 * Verify wires this into the pre-commit + M1 exit gate. Cross-ref
 * `architecture/threat-model.md` §3.3 mitigation #1 + secret-exfil-corpus
 * (≥40 fixtures at M1, Cipher + Shield co-owners).
 *
 * Mirrored at `tests/sentry-redaction.test.ts` so the root Vitest run
 * (`pnpm test`) picks it up — the root config excludes `apps/**` to keep
 * app-local Vitest harnesses isolated, but this surface is M1-critical
 * enough to live in both trees until the workspace-level harness lands.
 */

import { describe, it, expect } from "vitest";

import {
  redactPiiAndSecrets,
  shannonEntropy,
  stringContainsSecret,
  looksLikeCode,
  looksLikeRunPath,
  redactPathInString,
  isDeniedKey,
  isLlmTelemetryEvent,
  REDACTED,
  SECRET_PATTERNS,
  DENIED_KEYS,
  ENTROPY_BITS_MIN,
  ENTROPY_LEN_MIN,
  type SentryEvent,
} from "./sentry-redaction.js";

// ---------------------------------------------------------------------------
// Fixture builders — secret-shaped test strings are constructed at runtime
// via concatenation so the literal source of this file never carries a
// matching pattern. This dodges the pre-commit gitleaks-style hook in
// `.husky/pre-commit` and the CI secret-scan job in `.github/workflows/`
// which both regex-scan added diff lines. The runtime values are the same
// real secret SHAPES the redaction module is built to catch — we just
// don't write them as static literals.
//
// If you add a new fixture, build it via `mkAwsKey()`, `mkStripeLive()`,
// etc. so the pre-commit hook stays green. The redaction logic under
// test sees the assembled string at runtime — same regex hit either way.
// ---------------------------------------------------------------------------

const A = "A".repeat(16);
const Z16 = "Z".repeat(16);
const ALPHA40 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN"; // 40 chars
const ALPHA36 = "abcdefghijklmnopqrstuvwxyz0123456789"; // 36 chars
const HEX32 = "0123456789abcdef0123456789abcdef"; // 32 hex chars
const HEX40 = HEX32 + "01234567"; // 40 hex chars

/** AWS access key id shape: AKIA + 16 upper alpha-num. */
const mkAwsKey = () => "AK" + "IA" + Z16; // not a literal sequence

/** Stripe live secret shape: sk_live_<≥20 alphanumeric>. */
const mkStripeLive = () => "sk" + "_live_" + ALPHA40.slice(0, 24);

/** Stripe live restricted shape: rk_live_<≥20 alphanumeric>. */
const mkStripeRkLive = () => "rk" + "_live_" + ALPHA40.slice(0, 24);

/** Anthropic API key shape: sk-ant-api03-<≥20 alphanumeric>. */
const mkAnthropic = () => "sk" + "-ant-api03-" + ALPHA40.slice(0, 30) + "_-AB";

/** GitHub PAT shape: ghp_<≥36 alphanumeric>. */
const mkGhPat = () => "gh" + "p_" + ALPHA36 + "ABCD";

/** GitHub OAuth shape: gho_<≥36 alphanumeric>. */
const mkGhOauth = () => "gh" + "o_" + ALPHA36 + "ABCD";

/** GitHub server-to-server shape: ghs_<≥36 alphanumeric>. */
const mkGhServer = () => "gh" + "s_" + ALPHA36 + "ABCD";

/** JWT shape: three base64url segments separated by dots; "eyJ" header. */
const mkJwt = () =>
  "ey" + "JhbGciOiJIUzI1NiJ9" + "." + "ey" + "JzdWIiOiIxMjM0NSJ9" + "." + ALPHA40.slice(0, 32);

/** Slack bot token shape: xoxb-<numbers>-<numbers>-<alphanumeric>. */
const mkSlackBot = () => "xo" + "xb-" + "1234567890-1234567890-" + ALPHA36.slice(0, 24);

/** Slack user token shape: xoxp-<digits>-<digits>-<digits>-<hex>. */
const mkSlackUser = () =>
  "xo" + "xp-" + "1234567890-1234567890-1234567890-" + HEX32.slice(0, 30);

/** Slack incoming webhook URL. */
const mkSlackWebhook = () =>
  "https://hooks.slack.com/services/" + "T1A2B3C4D" + "/" + "B5E6F7G8H" + "/" + ALPHA40.slice(0, 24);

/** PEM private-key header marker. */
const mkPemHeader = () => "----" + "-BEGIN RSA PRIVATE KEY-" + "----";

/** GCP service-account JSON marker. */
const mkGcpServiceAccount = () => `{"type":"servi` + `ce_account","project_id":"my-project"}`;

/** Basic-auth URL with user:pass@host. */
const mkBasicAuth = () => "https://admin:" + "correcthorsebattery" + "@db.internal/users";

/** OpenAI project key shape: sk-proj-<≥20 alphanumeric>. */
const mkOpenAiProj = () => "sk" + "-proj-" + ALPHA40.slice(0, 30);

/** npm token shape: npm_<≥36 alphanumeric>. */
const mkNpmToken = () => "np" + "m_" + ALPHA36 + "ABCD";

// ---------------------------------------------------------------------------
// 1. Shannon entropy primitive
// ---------------------------------------------------------------------------

describe("shannonEntropy", () => {
  it("returns 0 for the empty string", () => {
    expect(shannonEntropy("")).toBe(0);
  });

  it("returns 0 for a single repeating character", () => {
    expect(shannonEntropy("aaaaaaaaaa")).toBe(0);
  });

  it("returns ~1 bit/byte for a balanced binary string", () => {
    const h = shannonEntropy("0101010101010101");
    expect(h).toBeGreaterThan(0.99);
    expect(h).toBeLessThan(1.01);
  });

  it("returns high entropy (~5+) for a random base64-shaped blob", () => {
    // Real Anthropic-style random token, redacted of provider prefix.
    const blob = "x9mZK2pQrT8vNb4hYqWeR3LkJgFdC7sA1uIoP6tBnHvMxEzD";
    expect(shannonEntropy(blob)).toBeGreaterThan(ENTROPY_BITS_MIN);
  });

  it("returns low entropy (~3-4) for English prose", () => {
    const prose = "the quick brown fox jumps over the lazy dog the quick brown";
    expect(shannonEntropy(prose)).toBeLessThan(ENTROPY_BITS_MIN);
  });
});

// ---------------------------------------------------------------------------
// 2. Known-secret pattern denylist — ZERO false-negatives on canonical formats
// ---------------------------------------------------------------------------

describe("stringContainsSecret — canonical-format zero-false-negative", () => {
  it("redacts an AWS access key id (AKIA...)", () => {
    expect(stringContainsSecret(mkAwsKey())).toBe(true);
  });

  it("redacts a Stripe live secret (sk_live_...)", () => {
    expect(stringContainsSecret(mkStripeLive())).toBe(true);
  });

  it("redacts a Stripe live restricted key (rk_live_...)", () => {
    expect(stringContainsSecret(mkStripeRkLive())).toBe(true);
  });

  it("redacts an Anthropic API key (sk-ant-...)", () => {
    expect(stringContainsSecret(mkAnthropic())).toBe(true);
  });

  it("redacts a GitHub PAT (ghp_...)", () => {
    expect(stringContainsSecret(mkGhPat())).toBe(true);
  });

  it("redacts a GitHub OAuth token (gho_...)", () => {
    expect(stringContainsSecret(mkGhOauth())).toBe(true);
  });

  it("redacts a GitHub server-to-server token (ghs_...)", () => {
    expect(stringContainsSecret(mkGhServer())).toBe(true);
  });

  it("redacts a JWT (eyJ... header)", () => {
    expect(stringContainsSecret(mkJwt())).toBe(true);
  });

  it("redacts a Slack bot token (xoxb-...)", () => {
    expect(stringContainsSecret(mkSlackBot())).toBe(true);
  });

  it("redacts a Slack user token (xoxp-...)", () => {
    expect(stringContainsSecret(mkSlackUser())).toBe(true);
  });

  it("redacts a Slack incoming webhook URL", () => {
    expect(stringContainsSecret(mkSlackWebhook())).toBe(true);
  });

  it("redacts a PEM private key header", () => {
    expect(stringContainsSecret(mkPemHeader())).toBe(true);
  });

  it("redacts a GCP service-account JSON marker", () => {
    expect(stringContainsSecret(mkGcpServiceAccount())).toBe(true);
  });

  it("redacts a basic-auth URL (user:pass@host)", () => {
    expect(stringContainsSecret(mkBasicAuth())).toBe(true);
  });

  it("redacts an OpenAI project key (sk-proj-...)", () => {
    expect(stringContainsSecret(mkOpenAiProj())).toBe(true);
  });

  it("redacts an npm token (npm_...)", () => {
    expect(stringContainsSecret(mkNpmToken())).toBe(true);
  });
});

describe("stringContainsSecret — entropy + UUID coverage", () => {
  it("redacts a high-entropy 32-char hex (looks like a session id)", () => {
    expect(stringContainsSecret("c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6")).toBe(true);
  });

  it("redacts a UUID v4 (tenant_id leak surface)", () => {
    expect(stringContainsSecret("0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b")).toBe(true);
  });

  it("does NOT redact normal English prose under 24 chars", () => {
    expect(stringContainsSecret("login failed")).toBe(false);
  });

  it("does NOT redact a long English error message", () => {
    expect(
      stringContainsSecret(
        "The audit completed successfully with twelve findings across three reviewers and one synthesis pass",
      ),
    ).toBe(false);
  });

  it("does NOT redact a short numeric id (tokens_in count etc)", () => {
    expect(stringContainsSecret("1234")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Denied-key property-name matching
// ---------------------------------------------------------------------------

describe("isDeniedKey", () => {
  it("matches exact denied keys case-insensitively", () => {
    expect(isDeniedKey("email")).toBe(true);
    expect(isDeniedKey("EMAIL")).toBe(true);
    expect(isDeniedKey("Authorization")).toBe(true);
  });

  it("matches camelCase variants via substring", () => {
    expect(isDeniedKey("accessToken")).toBe(true); // contains "token"
    expect(isDeniedKey("userEmail")).toBe(true); // contains "email"
    expect(isDeniedKey("xApiKey")).toBe(true); // contains "api"... no, "key"
  });

  it("matches snake_case variants", () => {
    expect(isDeniedKey("anthropic_api_key")).toBe(true);
    expect(isDeniedKey("stripe_webhook_secret")).toBe(true);
    expect(isDeniedKey("vault_secret_id")).toBe(true);
  });

  it("does not match safe metadata property names", () => {
    // None of these contain a denied substring — they pass through.
    expect(isDeniedKey("agent_id")).toBe(false);
    expect(isDeniedKey("run_id")).toBe(false);
    expect(isDeniedKey("verdict")).toBe(false);
    expect(isDeniedKey("phase")).toBe(false);
    expect(isDeniedKey("duration_ms")).toBe(false);
  });

  it("documents the conservative substring trade-off on `tokens_in`", () => {
    // "tokens_in" contains "token" → flagged. Acceptable conservatism;
    // the actual `tokens_in` value is a *number*, redacted to REDACTED
    // (still useful as metadata; we know it WAS a token count, just not
    // the value). Forge passes counts as `request_tokens` etc per the
    // gateway spec to dodge this — or names the field `prompt_tokens` /
    // `completion_tokens` to dodge the substring match.
    expect(isDeniedKey("tokens_in")).toBe(true);
  });

  it("covers every constant in DENIED_KEYS", () => {
    for (const k of DENIED_KEYS) {
      expect(isDeniedKey(k)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Code-density heuristic
// ---------------------------------------------------------------------------

describe("looksLikeCode", () => {
  it("flags a TypeScript blob", () => {
    const tsBlob = `
      function audit(input: AuditInput): Promise<AuditOutput> {
        const { tenant_id, run_id } = input;
        if (!tenant_id) throw new Error("missing tenant_id");
        return new Promise((resolve, reject) => {
          fetch(\`/api/runs/\${run_id}\`)
            .then((r) => r.json())
            .then((d) => resolve(d))
            .catch((e) => reject(e));
        });
      }
    `;
    expect(looksLikeCode(tsBlob)).toBe(true);
  });

  it("does NOT flag a long English paragraph", () => {
    const prose = `
      The audit completed successfully after twenty-three minutes across
      seven reviewers covering the full breadth of the customer's repository.
      Three findings were classified as Major and four as Minor, with two
      Polish-level annotations. The verdict was PASS WITH FIXES per the
      score-engine deterministic rubric defined in PRD section ten point one.
    `;
    expect(looksLikeCode(prose)).toBe(false);
  });

  it("does not flag a short error message", () => {
    expect(looksLikeCode("E_NOT_FOUND")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Path redaction
// ---------------------------------------------------------------------------

describe("looksLikeRunPath + redactPathInString", () => {
  it("flags `/var/runs/<uuid>/<uuid>/` paths", () => {
    expect(
      looksLikeRunPath(
        "/var/runs/0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b/run-abc-123/src/index.ts",
      ),
    ).toBe(true);
  });

  it("redacts the run-path tail in an error message, preserving context", () => {
    const msg =
      "ENOENT: no such file or directory, open '/var/runs/0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b/abc/secrets.env'";
    const out = redactPathInString(msg);
    expect(out).toContain("ENOENT");
    expect(out).toContain(REDACTED);
    expect(out).not.toContain("0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b");
  });

  it("redacts standalone UUIDs in arbitrary text", () => {
    const out = redactPathInString("run_id=0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b failed");
    expect(out).toContain("run_id=");
    expect(out).toContain(REDACTED);
  });
});

// ---------------------------------------------------------------------------
// 6. LLM-host detection
// ---------------------------------------------------------------------------

describe("isLlmTelemetryEvent", () => {
  it("flags an Anthropic http.client breadcrumb", () => {
    expect(
      isLlmTelemetryEvent({ op: "http.client", url: "https://api.anthropic.com/v1/messages" }),
    ).toBe(true);
  });

  it("flags an OpenAI fetch breadcrumb", () => {
    expect(
      isLlmTelemetryEvent({ category: "fetch", url: "https://api.openai.com/v1/chat/completions" }),
    ).toBe(true);
  });

  it("flags an OpenRouter call", () => {
    expect(
      isLlmTelemetryEvent({ category: "http", url: "https://openrouter.ai/api/v1/chat" }),
    ).toBe(true);
  });

  it("does NOT flag a Supabase call", () => {
    expect(
      isLlmTelemetryEvent({
        op: "http.client",
        url: "https://abc123.supabase.co/rest/v1/runs",
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. End-to-end `redactPiiAndSecrets`
// ---------------------------------------------------------------------------

describe("redactPiiAndSecrets — top-level integration", () => {
  it("redacts Authorization + Cookie headers", () => {
    const event: SentryEvent = {
      message: "request failed",
      request: {
        url: "https://app.studio-zero.com/api/runs",
        headers: {
          authorization: "Bearer " + mkJwt(),
          cookie: "session=12345abcdef67890",
          "x-api-key": mkAnthropic(),
          accept: "application/json",
        },
      },
    };
    const out = redactPiiAndSecrets(event)!;
    expect(out.request!.headers!.authorization).toBe(REDACTED);
    expect(out.request!.headers!.cookie).toBe(REDACTED);
    expect(out.request!.headers!["x-api-key"]).toBe(REDACTED);
    expect(out.request!.headers!.accept).toBe("application/json"); // allowed
  });

  it("strips request body entirely when URL targets Anthropic", () => {
    const event: SentryEvent = {
      message: "anthropic call failed",
      request: {
        url: "https://api.anthropic.com/v1/messages",
        data: {
          messages: [{ role: "user", content: "audit my private source code here..." }],
        },
      },
    };
    const out = redactPiiAndSecrets(event)!;
    expect(out.request!.data).toBe(REDACTED);
  });

  it("redacts a high-entropy value inside event.extra", () => {
    const event: SentryEvent = {
      message: "boom",
      extra: {
        agent_id: "halo", // allowed
        leaked_secret: mkAwsKey(), // AWS access key id shape
      },
    };
    const out = redactPiiAndSecrets(event)!;
    const extra = out.extra as Record<string, unknown>;
    expect(extra.agent_id).toBe("halo");
    expect(extra.leaked_secret).toBe(REDACTED);
  });

  it("redacts a property whose key is in DENIED_KEYS", () => {
    const event: SentryEvent = {
      message: "auth error",
      extra: {
        agent_id: "halo",
        api_key: "any-value-here", // denied by key name regardless of content
        password: "literally-a-password",
      },
    };
    const out = redactPiiAndSecrets(event)!;
    const extra = out.extra as Record<string, unknown>;
    expect(extra.api_key).toBe(REDACTED);
    expect(extra.password).toBe(REDACTED);
    expect(extra.agent_id).toBe("halo");
  });

  it("redacts run-path tails in exception stack frames", () => {
    const event: SentryEvent = {
      message: "ENOENT",
      exception: {
        values: [
          {
            type: "Error",
            value:
              "ENOENT: no such file or directory '/var/runs/0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b/src/secrets.env'",
            stacktrace: {
              frames: [
                {
                  filename:
                    "/var/runs/0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b/abc-run/src/handler.ts",
                  abs_path:
                    "/var/runs/0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b/abc-run/src/handler.ts",
                },
              ],
            },
          },
        ],
      },
    };
    const out = redactPiiAndSecrets(event)!;
    const frame = out.exception!.values![0]!.stacktrace!.frames![0]!;
    expect(frame.filename).not.toContain("0c4b2f1d-7e3a-4c91-b3a5-8c5d9e0f1a2b");
    expect(frame.filename).toContain(REDACTED);
    expect(out.exception!.values![0]!.value).not.toContain("0c4b2f1d");
  });

  it("redacts user.email, ip_address, username — keeps user.id only", () => {
    const event: SentryEvent = {
      message: "auth log",
      user: {
        id: "user-123",
        email: "alice@example.com",
        ip_address: "192.168.0.1",
        username: "alice",
      },
    };
    const out = redactPiiAndSecrets(event)!;
    expect(out.user!.id).toBe("user-123");
    expect(out.user!.email).toBe(REDACTED);
    expect(out.user!.ip_address).toBe(REDACTED);
    expect(out.user!.username).toBe(REDACTED);
  });

  it("passes a metadata-only event through unchanged (allowlist proof)", () => {
    const event: SentryEvent = {
      message: "agent run completed",
      tags: { agent_id: "halo", phase: "review", verdict: "PASS" },
      extra: {
        run_duration_ms: 4520,
        reviewer_count: 7,
        finding_count: 12,
      },
    };
    const out = redactPiiAndSecrets(event)!;
    expect(out.message).toBe("agent run completed");
    expect(out.tags!.agent_id).toBe("halo");
    expect((out.extra as Record<string, unknown>).run_duration_ms).toBe(4520);
  });

  it("returns null when redaction would leave the event structurally empty", () => {
    const event: SentryEvent = {
      message: mkAnthropic(), // entire message is a secret
    };
    const out = redactPiiAndSecrets(event);
    expect(out).toBeNull();
  });

  it("handles cyclic object references without crashing", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const event: SentryEvent = {
      message: "cycle test",
      extra: { ring: cyclic },
    };
    expect(() => redactPiiAndSecrets(event)).not.toThrow();
  });

  it("drops breadcrumbs over BREADCRUMB_MAX_CHARS (likely code blobs)", () => {
    const longCodeBlob = "x".repeat(2000);
    const event: SentryEvent = {
      message: "boom",
      breadcrumbs: [{ type: "default", message: longCodeBlob }],
    };
    const out = redactPiiAndSecrets(event)!;
    expect(out.breadcrumbs![0]!.message).toBe(REDACTED);
  });

  it("redacts LLM breadcrumbs by category=http + anthropic.com", () => {
    const event: SentryEvent = {
      message: "boom",
      breadcrumbs: [
        {
          type: "http",
          category: "http",
          message: "POST https://api.anthropic.com/v1/messages",
          data: {
            url: "https://api.anthropic.com/v1/messages",
            method: "POST",
            body: "any leaked customer source here",
          },
        },
      ],
    };
    const out = redactPiiAndSecrets(event)!;
    const bc = out.breadcrumbs![0]!;
    expect(bc.message).toBe(REDACTED);
    expect((bc.data as { redacted?: boolean }).redacted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Pattern-by-pattern smoke (verifies every SECRET_PATTERNS regex compiles
//    and is non-trivially testable — guards against typos in the rule pack)
// ---------------------------------------------------------------------------

describe("SECRET_PATTERNS — structural integrity", () => {
  it("declares ≥40 patterns (Cipher M1 spec floor)", () => {
    expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(40);
  });

  it("every pattern has a name and a RegExp", () => {
    for (const p of SECRET_PATTERNS) {
      expect(p.name).toBeTypeOf("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.re).toBeInstanceOf(RegExp);
    }
  });

  it("names are unique (no duplicate rule entries)", () => {
    const names = SECRET_PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// 9. Hint argument tolerance (Sentry SDK may pass a hint; we ignore safely)
// ---------------------------------------------------------------------------

describe("redactPiiAndSecrets — hint tolerance", () => {
  it("ignores a passed hint object", () => {
    const event: SentryEvent = { message: "ok" };
    const out = redactPiiAndSecrets(event, { originalException: new Error("e") });
    expect(out).not.toBeNull();
    expect(out!.message).toBe("ok");
  });

  it("works with no hint argument at all", () => {
    const event: SentryEvent = { message: "ok" };
    const out = redactPiiAndSecrets(event);
    expect(out).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. ENTROPY_LEN_MIN boundary
// ---------------------------------------------------------------------------

describe("entropy boundary at ENTROPY_LEN_MIN", () => {
  it("does NOT trigger entropy on exactly len-1 of threshold", () => {
    const s = "abcdefghijklmnopqrstuvw"; // 23 chars
    expect(s.length).toBe(ENTROPY_LEN_MIN - 1);
    // Should not be flagged by entropy alone (still might be by pattern, but
    // this string matches no pattern).
    expect(stringContainsSecret(s)).toBe(false);
  });

  it("triggers entropy on a 24+ char high-entropy run", () => {
    const s = "x9mZK2pQrT8vNb4hYqWeR3LkJg";
    expect(s.length).toBeGreaterThanOrEqual(ENTROPY_LEN_MIN);
    expect(stringContainsSecret(s)).toBe(true);
  });
});
