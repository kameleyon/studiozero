/**
 * Studio Zero — pr-opener tests.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Drives `openAutoPr()` with a fake GitHub
 * client and asserts:
 *   - branch name is `studio-zero/fix-<run-id>` (NEVER default)
 *   - default-branch attempt is rejected + audit-logged
 *   - commit messages carry `Refs: F-NNN` + `AI-Authored:` trailers
 *   - PR body opens with the Art. 50 disclosure paragraph
 *   - Lens auto_pr_opened event fires on success
 */
import { describe, it, expect, vi } from "vitest";
import {
  ART50_DISCLOSURE,
  formatCommitMessage,
  formatPrBody,
  isLikelyDefaultBranch,
  normalizeBranchForFuzz,
  openAutoPr,
  type GitHubClient,
} from "../../src/build/pr-opener.js";
import type { PatchArtifact } from "../../src/build/types.js";

function makeArtifact(overrides: Partial<PatchArtifact> = {}): PatchArtifact {
  return {
    run_id: "01H8XGABCDEFGHJKMNPQRSTVWX",
    tenant_id: "tenant-1",
    fix_pr_job_id: "fp-1",
    patches: [
      {
        finding_id: "uuid-1",
        finding_code: "F-001",
        file_path: "src/SignupForm.tsx",
        unified_diff: "--- a/src/SignupForm.tsx\n+++ b/src/SignupForm.tsx\n@@ -42,1 +42,1 @@\n-old\n+new\n",
        lines_added: 1,
        lines_removed: 1,
        confidence: 0.9,
        produced_by: "halo-fixer",
      },
    ],
    files_changed: ["src/SignupForm.tsx"],
    total_lines_added: 1,
    total_lines_removed: 1,
    generated_at: "2026-05-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeGh(): { gh: GitHubClient; calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {
    getRepo: [],
    getRef: [],
    createRef: [],
    createCommit: [],
    createPullRequest: [],
  };
  const gh: GitHubClient = {
    async getRepo(...args) {
      calls.getRepo!.push(args);
      return { default_branch: "main" };
    },
    async getRef(...args) {
      calls.getRef!.push(args);
      return { object: { sha: "abc123" } };
    },
    async createRef(...args) {
      calls.createRef!.push(args);
      return {};
    },
    async createCommit(...args) {
      calls.createCommit!.push(args);
      return { sha: "cccc111" };
    },
    async createPullRequest(...args) {
      calls.createPullRequest!.push(args);
      return { number: 42, html_url: "https://github.com/x/y/pull/42" };
    },
  };
  return { gh, calls };
}

describe("normalizeBranchForFuzz", () => {
  it("lowercases + trims", () => {
    expect(normalizeBranchForFuzz("  MAIN  ")).toBe("main");
  });
  it("handles cyrillic lookalikes for 'main'", () => {
    // Cyrillic 'а' for 'a' + 'е' for 'e'
    expect(normalizeBranchForFuzz("mаin")).toBe("main");
  });
});

describe("isLikelyDefaultBranch", () => {
  it("matches the customer's actual default branch", () => {
    expect(isLikelyDefaultBranch("main", "main")).toBe(true);
    expect(isLikelyDefaultBranch("MAIN", "main")).toBe(true);
  });
  it("matches common synonyms", () => {
    expect(isLikelyDefaultBranch("master", "develop")).toBe(true);
    expect(isLikelyDefaultBranch("trunk", "main")).toBe(true);
    expect(isLikelyDefaultBranch("prod", "main")).toBe(true);
  });
  it("permits the actual feature-branch we use", () => {
    expect(
      isLikelyDefaultBranch("studio-zero/fix-01H8XGABC", "main"),
    ).toBe(false);
  });
  it("catches unicode lookalikes", () => {
    expect(isLikelyDefaultBranch("mаin", "main")).toBe(true); // cyrillic а
  });
});

describe("formatCommitMessage", () => {
  it("includes both Refs and AI-Authored trailers", () => {
    const msg = formatCommitMessage({
      finding_code: "F-007",
      file_path: "src/x.ts",
      runner_version: "1.5.0",
    });
    expect(msg).toContain("Refs: F-007");
    expect(msg).toContain("AI-Authored: studio-zero/runner@v1.5.0");
  });
});

describe("formatPrBody", () => {
  it("opens with the Art. 50 disclosure paragraph verbatim", () => {
    const body = formatPrBody({
      artifact: makeArtifact(),
      project_name: "demo-app",
      original_verdict: "FAIL",
      reaudit_verdict: "PASS WITH FIXES",
      score_delta: 15,
      score_engine_version_snapshot: "v1",
      runner_version: "1.5.0",
    });
    expect(body.startsWith(ART50_DISCLOSURE)).toBe(true);
    expect(body).toContain("Original verdict:** FAIL");
    expect(body).toContain("Re-audit verdict:** PASS WITH FIXES");
    expect(body).toContain("Score delta:** +15");
    expect(body).toContain("https://studiozero.dev/system-card");
  });
});

describe("openAutoPr", () => {
  it("creates a feature branch and opens a PR", async () => {
    const { gh, calls } = makeGh();
    const lensEvents: Array<{ name: string; props: unknown }> = [];
    const result = await openAutoPr(
      {
        artifact: makeArtifact(),
        owner: "acme",
        repo: "demo",
        project_name: "demo-app",
        original_verdict: "FAIL",
        reaudit_verdict: "PASS WITH FIXES",
        score_delta: 15,
        score_engine_version_snapshot: "v1",
        files_to_commit: [
          {
            file_path: "src/SignupForm.tsx",
            new_contents_utf8: "patched contents\n",
          },
        ],
        runner_version: "1.5.0",
      },
      {
        github: gh,
        recordPrOpened: vi.fn().mockResolvedValue(undefined),
        auditLogReject: vi.fn().mockResolvedValue(undefined),
        emitLensEvent: async (name, props) => {
          lensEvents.push({ name, props });
        },
      },
    );

    expect(result.pr_number).toBe(42);
    expect(result.branch_name).toMatch(/^studio-zero\/fix-/);
    // PR base MUST be the customer's default; head MUST be our feature branch.
    const prArgs = calls.createPullRequest![0]?.[2] as {
      head: string;
      base: string;
      body: string;
    };
    expect(prArgs.base).toBe("main");
    expect(prArgs.head).toMatch(/^studio-zero\/fix-/);
    expect(prArgs.body.startsWith(ART50_DISCLOSURE)).toBe(true);
    expect(lensEvents).toHaveLength(1);
    expect(lensEvents[0]?.name).toBe("auto_pr_opened");
  });

  it("REFUSES to open when the constructed branch resolves to default", async () => {
    const { gh } = makeGh();
    const reject = vi.fn().mockResolvedValue(undefined);
    await expect(
      openAutoPr(
        {
          // run_id literally 'main' would resolve to a default-branch
          // collision via the normalizeBranchForFuzz path. The fuzz
          // corpus check on the FULL branch name is "studio-zero/fix-main"
          // which does NOT match default — but injecting a custom check
          // via crafted run_id 'main' lets us prove the fuzz path is
          // reachable. To force the rejection deterministically we
          // override the artifact's run_id with a sentinel that the
          // normalize+match path treats as default.
          artifact: makeArtifact({ run_id: "" }), // empty → "studio-zero/fix-"
          owner: "acme",
          repo: "demo",
          project_name: "x",
          original_verdict: "FAIL",
          reaudit_verdict: "PASS WITH FIXES",
          score_delta: 0,
          score_engine_version_snapshot: "v1",
          files_to_commit: [],
          runner_version: "1.5.0",
        },
        {
          github: {
            ...gh,
            async getRepo() {
              return { default_branch: "studio-zero/fix-" };
            },
          },
          recordPrOpened: vi.fn(),
          auditLogReject: reject,
        },
      ),
    ).rejects.toThrow(/refused/);
    expect(reject).toHaveBeenCalledTimes(1);
  });
});
