/**
 * Studio Zero — CLI heartbeat emitter tests.
 *
 * Closes Jury M3 Major #4. Asserts:
 *   - The 30s interval fires while the run is in-flight.
 *   - The interval is cancellable via the AbortController OR explicit stop().
 *   - The 7-day refresh threshold triggers /api/cli/refresh on the next tick.
 *   - The heartbeat body is empty `{}` — privacy invariant.
 *   - Bearer token rides on every tick.
 *
 * We use fake timers to advance time deterministically. The fetcher is
 * injected so we can assert request shape without a live server.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  HEARTBEAT_INTERVAL_MS,
  startHeartbeat,
} from "../src/network/heartbeat.js";
import { writeAuth, type AuthFile } from "../src/auth/pairing-token.js";
import { REFRESH_WINDOW_MS } from "../src/auth/refresh.js";

let configDir: string;

function makeAuth(overrides: Partial<AuthFile> = {}): AuthFile {
  return {
    version: 1,
    apiUrl: "https://studio-zero.test",
    userEmail: "alice@example.com",
    deviceId: "11111111-1111-1111-1111-111111111111",
    deviceFingerprint: {
      hostname: "alice-laptop",
      os: "darwin 24.0.0",
      arch: "arm64",
    },
    token: "x".repeat(40),
    // 30 days out — well outside the 7d refresh window.
    tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    pairedAt: new Date().toISOString(),
    cliVersion: "0.1.0-m3",
    binaryHash: "a".repeat(64),
    ...overrides,
  };
}

interface CapturedReq {
  url: string;
  method: string;
  body: string;
  authHeader: string | null;
}

function makeFetcher(
  responses: Array<{ status: number; body: Record<string, unknown> }>,
): { fetcher: typeof fetch; captured: CapturedReq[] } {
  const captured: CapturedReq[] = [];
  let i = 0;
  const fetcher: typeof fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const headers = new Headers(init?.headers);
    captured.push({
      url: typeof url === "string" ? url : url.toString(),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : "",
      authHeader: headers.get("authorization"),
    });
    const resp = responses[Math.min(i, responses.length - 1)]!;
    i += 1;
    return new Response(JSON.stringify(resp.body), {
      status: resp.status,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetcher, captured };
}

beforeEach(() => {
  configDir = mkdtempSync(path.join(tmpdir(), "sz-cli-hb-cfg-"));
  process.env.STUDIOZERO_CONFIG_DIR = configDir;
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
  delete process.env.STUDIOZERO_CONFIG_DIR;
  vi.useRealTimers();
});

describe("heartbeat / happy path", () => {
  it("fires on a 30s interval while the run is in-flight", async () => {
    vi.useFakeTimers();
    writeAuth(configDir, makeAuth());
    const { fetcher, captured } = makeFetcher([
      { status: 200, body: { ok: true, last_heartbeat_at: new Date().toISOString() } },
    ]);

    const controller = new AbortController();
    const ticks: Array<{ ok: boolean; status: number }> = [];
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
      intervalMs: HEARTBEAT_INTERVAL_MS,
      onTick: ({ ok, status }) => ticks.push({ ok, status }),
    });

    // No ping at t=0 (we don't fire on start; the run kickoff is the
    // implicit liveness signal).
    expect(captured).toHaveLength(0);

    // Advance to first tick.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);
    expect(captured).toHaveLength(1);
    expect(captured[0]!.url).toContain("/api/cli/heartbeat");
    expect(captured[0]!.method).toBe("POST");
    expect(captured[0]!.body).toBe("{}");
    expect(captured[0]!.authHeader).toBe(`Bearer ${"x".repeat(40)}`);
    expect(ticks).toHaveLength(1);
    expect(ticks[0]!.ok).toBe(true);

    // Advance to second tick.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);
    expect(captured.length).toBeGreaterThanOrEqual(2);

    hb.stop();
    await hb.done;
  });

  it("HEARTBEAT_INTERVAL_MS is locked at 30 seconds (sprint M3 + ARCH-D10)", () => {
    expect(HEARTBEAT_INTERVAL_MS).toBe(30_000);
  });
});

describe("heartbeat / cancellable", () => {
  it("stop() halts the loop and resolves done", async () => {
    vi.useFakeTimers();
    writeAuth(configDir, makeAuth());
    const { fetcher, captured } = makeFetcher([
      { status: 200, body: { ok: true } },
    ]);
    const controller = new AbortController();
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
    });

    hb.stop();
    await hb.done;
    // No further ticks even after the interval elapses.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3);
    expect(captured).toHaveLength(0);
  });

  it("AbortController.abort() halts the loop", async () => {
    vi.useFakeTimers();
    writeAuth(configDir, makeAuth());
    const { fetcher, captured } = makeFetcher([
      { status: 200, body: { ok: true } },
    ]);
    const controller = new AbortController();
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
    });

    controller.abort();
    await hb.done;
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3);
    expect(captured).toHaveLength(0);
  });

  it("pre-aborted signal exits without firing any tick", async () => {
    writeAuth(configDir, makeAuth());
    const { fetcher, captured } = makeFetcher([
      { status: 200, body: { ok: true } },
    ]);
    const controller = new AbortController();
    controller.abort();
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
    });
    await hb.done;
    expect(captured).toHaveLength(0);
  });
});

describe("heartbeat / refresh-triggered at 7d boundary", () => {
  it("token within REFRESH_WINDOW_MS triggers /api/cli/refresh on next tick", async () => {
    vi.useFakeTimers();
    // Pairing expires in 3 days — inside the 7d refresh window.
    writeAuth(
      configDir,
      makeAuth({
        tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );

    const newExpiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    // First call is the refresh POST, second is the heartbeat POST.
    const { fetcher, captured } = makeFetcher([
      // Refresh response.
      {
        status: 200,
        body: { token: "y".repeat(40), expiresAt: newExpiresAt },
      },
      // Heartbeat response (now using the new token).
      { status: 200, body: { ok: true } },
    ]);

    const ticks: Array<{ tokenRefreshed: boolean }> = [];
    const controller = new AbortController();
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
      onTick: ({ tokenRefreshed }) => ticks.push({ tokenRefreshed }),
    });

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);

    // Refresh was called first.
    const refreshCall = captured.find((c) => c.url.includes("/api/cli/refresh"));
    expect(refreshCall).toBeDefined();
    expect(refreshCall!.method).toBe("POST");

    // Heartbeat was called with the refreshed token.
    const hbCall = captured.find((c) => c.url.includes("/api/cli/heartbeat"));
    expect(hbCall).toBeDefined();
    expect(hbCall!.authHeader).toBe(`Bearer ${"y".repeat(40)}`);

    expect(ticks[0]?.tokenRefreshed).toBe(true);

    hb.stop();
    await hb.done;
  });

  it("REFRESH_WINDOW_MS = 7 days (sprint M3 lock)", () => {
    expect(REFRESH_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("heartbeat / privacy invariant", () => {
  it("every heartbeat body is empty {} — no project metadata", async () => {
    vi.useFakeTimers();
    writeAuth(configDir, makeAuth());
    const { fetcher, captured } = makeFetcher([
      { status: 200, body: { ok: true } },
      { status: 200, body: { ok: true } },
      { status: 200, body: { ok: true } },
    ]);

    const controller = new AbortController();
    const hb = startHeartbeat({
      apiUrl: "https://studio-zero.test",
      configDir,
      token: "x".repeat(40),
      signal: controller.signal,
      fetcher,
    });

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3 + 100);
    hb.stop();
    await hb.done;

    const hbCalls = captured.filter((c) => c.url.includes("/api/cli/heartbeat"));
    expect(hbCalls.length).toBeGreaterThan(0);
    for (const c of hbCalls) {
      expect(c.body).toBe("{}");
    }
  });
});
