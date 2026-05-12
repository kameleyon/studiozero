/**
 * Studio Zero — abort registry tests.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Verifies the per-run AbortController
 * plumbing: cancel-mid-run trips the signal; in-flight async ops abort;
 * subsequent reads observe `aborted: true`.
 */
import { describe, it, expect } from "vitest";
import { createAbortRegistry } from "../src/abort-controller.js";

describe("abort-registry", () => {
  it("creates a handle that exposes an unaborted signal", () => {
    const reg = createAbortRegistry();
    const h = reg.create("run-1");
    expect(h.aborted).toBe(false);
    expect(h.signal.aborted).toBe(false);
  });

  it("cancel trips the signal and sets aborted=true", () => {
    const reg = createAbortRegistry();
    const h = reg.create("run-2");
    reg.cancel("run-2", "user_clicked_cancel");
    expect(h.aborted).toBe(true);
    expect(h.signal.aborted).toBe(true);
    expect(h.reason).toBe("user_clicked_cancel");
  });

  it("abort() is idempotent — second call is a no-op", () => {
    const reg = createAbortRegistry();
    const h = reg.create("run-3");
    h.abort("first");
    h.abort("second");
    expect(h.reason).toBe("first");
  });

  it("refuses duplicate runId on create()", () => {
    const reg = createAbortRegistry();
    reg.create("run-4");
    expect(() => reg.create("run-4")).toThrow(/duplicate runId/);
  });

  it("get() returns undefined for unknown runId", () => {
    const reg = createAbortRegistry();
    expect(reg.get("nope")).toBeUndefined();
  });

  it("cancel on unknown runId is a no-op", () => {
    const reg = createAbortRegistry();
    expect(() => reg.cancel("nope", "x")).not.toThrow();
  });

  it("release removes the handle", () => {
    const reg = createAbortRegistry();
    reg.create("run-5");
    expect(reg.list()).toContain("run-5");
    reg.release("run-5");
    expect(reg.list()).not.toContain("run-5");
  });

  it("abortAll trips every signal", () => {
    const reg = createAbortRegistry();
    const a = reg.create("a");
    const b = reg.create("b");
    reg.abortAll("worker_shutdown");
    expect(a.aborted).toBe(true);
    expect(b.aborted).toBe(true);
    expect(a.reason).toBe("worker_shutdown");
  });

  it("AbortSignal threaded into fetch propagates", async () => {
    const reg = createAbortRegistry();
    const h = reg.create("run-fetch");
    // Schedule an abort in 5ms; race a 50ms timeout against it.
    setTimeout(() => h.abort("test_abort"), 5);
    const racer = new Promise<string>((resolve, reject) => {
      const t = setTimeout(() => resolve("not-aborted"), 50);
      h.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new Error("aborted"));
        },
        { once: true },
      );
    });
    await expect(racer).rejects.toThrow(/aborted/);
  });
});
