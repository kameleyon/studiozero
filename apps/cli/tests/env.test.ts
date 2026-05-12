/**
 * Studio Zero — CLI env validation tests.
 *
 * Phase 9 M3 Batch 1 (Forge). Asserts the forbidden-keys refuse-list
 * (defence in depth) + config-file merging behaviour. The CLI is a
 * customer-machine surface so the refuse list is load-bearing for the
 * Cipher Fix-2 + Atlas B2 contracts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEnv, _forbiddenKeys } from "../src/env.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sz-cli-env-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("env / forbidden keys", () => {
  it("refuses to load when ANTHROPIC_API_KEY is set", () => {
    expect(() =>
      loadEnv({
        ANTHROPIC_API_KEY: "sk-anything",
        STUDIOZERO_CONFIG_DIR: dir,
      } as NodeJS.ProcessEnv),
    ).toThrow(/forbidden/);
  });

  it("refuses to load when SUPABASE_SERVICE_ROLE_KEY is set", () => {
    expect(() =>
      loadEnv({
        SUPABASE_SERVICE_ROLE_KEY: "eyJ...",
        STUDIOZERO_CONFIG_DIR: dir,
      } as NodeJS.ProcessEnv),
    ).toThrow(/forbidden/);
  });

  it("ignores forbidden key set to empty string", () => {
    expect(() =>
      loadEnv({
        ANTHROPIC_API_KEY: "",
        STUDIOZERO_CONFIG_DIR: dir,
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("exposes the canonical forbidden-keys list (defence in depth)", () => {
    expect(_forbiddenKeys).toContain("ANTHROPIC_API_KEY");
    expect(_forbiddenKeys).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(_forbiddenKeys).toContain("SUPABASE_SERVICE_KEY");
  });
});

describe("env / config-file merge", () => {
  it("returns defaults when no config file + no env present", () => {
    const env = loadEnv({ STUDIOZERO_CONFIG_DIR: dir } as NodeJS.ProcessEnv);
    expect(env.apiUrl).toBe("https://studio-zero.com");
    expect(env.logLevel).toBe("info");
    expect(env.mockReviewers).toBe(true);
  });

  it("reads apiUrl from config.json", () => {
    writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ apiUrl: "https://stage.studio-zero.test" }),
    );
    const env = loadEnv({ STUDIOZERO_CONFIG_DIR: dir } as NodeJS.ProcessEnv);
    expect(env.apiUrl).toBe("https://stage.studio-zero.test");
  });

  it("env var overrides config.json", () => {
    writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ apiUrl: "https://stage.studio-zero.test" }),
    );
    const env = loadEnv({
      STUDIOZERO_CONFIG_DIR: dir,
      STUDIOZERO_API_URL: "https://override.studio-zero.test",
    } as NodeJS.ProcessEnv);
    expect(env.apiUrl).toBe("https://override.studio-zero.test");
  });

  it("rejects an invalid apiUrl", () => {
    expect(() =>
      loadEnv({
        STUDIOZERO_CONFIG_DIR: dir,
        STUDIOZERO_API_URL: "not-a-url",
      } as NodeJS.ProcessEnv),
    ).toThrow(/invalid apiUrl/);
  });

  it("rejects an invalid config.json field (unknown key)", () => {
    // strict() schema → unknown keys fail.
    writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ unknownField: "x" }),
    );
    expect(() =>
      loadEnv({ STUDIOZERO_CONFIG_DIR: dir } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it("rejects an invalid config.json field (malformed URL)", () => {
    writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ apiUrl: "not://valid url with spaces" }),
    );
    expect(() =>
      loadEnv({ STUDIOZERO_CONFIG_DIR: dir } as NodeJS.ProcessEnv),
    ).toThrow();
  });
});
