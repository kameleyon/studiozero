/**
 * Studio Zero — LLM gateway client tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Exercises:
 *   - mock mode returns a canned response
 *   - mock mode honors AbortSignal mid-call
 *   - real mode constructs a Bearer header from the refresher's current token
 *   - real mode refuses to follow redirects (SSRF chain defense)
 *
 * No actual Anthropic key is involved (Cipher Fix-2). The "real" mode
 * test uses a local fetch mock to assert the Authorization header.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLlmGatewayClient } from "../src/llm-gateway-client.js";
import { TokenRefresher } from "../src/jwt-refresh.js";

function makeRefresher(token = "test.jwt.token", expiresInMs = 60_000): TokenRefresher {
  const ctrl = new AbortController();
  const r = new TokenRefresher({
    mintUrl: "https://example.com/mint",
    refreshUrl: "https://example.com/refresh",
    runId: "run-1",
    tenantId: "tenant-1",
    runnerKind: "hosted-worker",
    workerFingerprint: "worker:test:1",
    signal: ctrl.signal,
  });
  r.setToken({
    token,
    expiresAtMs: Date.now() + expiresInMs,
    jti: "test-jti",
  });
  return r;
}

describe("llm-gateway-client / mock mode", () => {
  it("returns a canned response when mock=true", async () => {
    const client = createLlmGatewayClient({
      gatewayUrl: "https://gateway.example.com",
      refresher: makeRefresher(),
      mock: true,
    });
    const ctrl = new AbortController();
    const res = await client.message(
      {
        reviewerId: "optic",
        system: "you are optic",
        messages: [{ role: "user", content: "hi" }],
      },
      ctrl.signal,
    );
    expect(res.text).toMatch(/mock optic/);
    expect(res.usage.input).toBeGreaterThan(0);
  });

  it("rejects when AbortSignal trips mid-call", async () => {
    const client = createLlmGatewayClient({
      gatewayUrl: "https://gateway.example.com",
      refresher: makeRefresher(),
      mock: true,
    });
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort("test"), 1);
    await expect(
      client.message(
        {
          reviewerId: "optic",
          system: "x",
          messages: [{ role: "user", content: "y" }],
        },
        ctrl.signal,
      ),
    ).rejects.toThrow();
  });
});

describe("llm-gateway-client / real mode auth header", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes Authorization: Bearer <token> from the refresher", async () => {
    const refresher = makeRefresher("the.test.token");
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          text: "ok",
          usage: { input: 5, output: 10 },
          modelClass: "fast",
          requestId: "req-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = createLlmGatewayClient({
      gatewayUrl: "https://gateway.example.com/v1/messages",
      refresher,
      mock: false,
    });
    const ctrl = new AbortController();
    await client.message(
      {
        reviewerId: "optic",
        system: "x",
        messages: [{ role: "user", content: "y" }],
      },
      ctrl.signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0]!;
    const init = callArgs[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer the.test.token");
    expect(headers["X-AI-Generated"]).toBe("studio-zero");
    expect(init.redirect).toBe("error"); // SSRF chain defense
  });

  it("throws on a non-2xx gateway response", async () => {
    const refresher = makeRefresher();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response("token revoked", { status: 401 }),
    );
    const client = createLlmGatewayClient({
      gatewayUrl: "https://gateway.example.com/v1/messages",
      refresher,
      mock: false,
    });
    await expect(
      client.message(
        {
          reviewerId: "optic",
          system: "x",
          messages: [{ role: "user", content: "y" }],
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow(/401/);
  });

  it("refuses a gateway URL that fails SSRF guard (private IP)", () => {
    expect(() =>
      createLlmGatewayClient({
        gatewayUrl: "http://127.0.0.1:9999/v1/messages",
        refresher: makeRefresher(),
        mock: false,
      }),
    ).toThrow(/ssrf_blocked/);
  });
});
