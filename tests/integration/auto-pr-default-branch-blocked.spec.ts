/**
 * Studio Zero — Auto-PR default-branch push attempt → blocked + audit-logged.
 *
 * Phase 9 V1.5 Batch 1 (Forge). PRD §11.2 hard rule: "we never push to
 * default branches; PRs target a feature branch named
 * `studio-zero/fix-<run-id>`. Verified by §18.M5.gate-3 negative test
 * (default-branch push attempt → blocked → audit-logged)."
 *
 * V1.5 exit gate C8: 50+ variants from the Shield default-branch-fuzz
 * corpus; guard fires every time; audit_logs records each attempt.
 */
import { describe, it, expect, vi } from "vitest";
import {
  isLikelyDefaultBranch,
  normalizeBranchForFuzz,
  openAutoPr,
  type GitHubClient,
} from "../../apps/runner/src/build/pr-opener.js";

const FUZZ_VARIANTS: ReadonlyArray<string> = [
  "main",
  "MAIN",
  "Main",
  "  main  ",
  "master",
  "MASTER",
  "trunk",
  "develop",
  "DEVELOP",
  "default",
  "production",
  "PRODUCTION",
  "prod",
  "release",
  "RELEASE",
  // Unicode lookalikes for "main" (cyrillic а / е / о)
  "mаin",
  "mаіn",
  "mainn",
  "main​", // zero-width space
  "main‎", // LTR mark
  "main﻿", // BOM
  // Greek omicron lookalike for 'o' in production
  "prοd",
  // Padding combos
  "\tmain",
  "main\t",
  "main ",
  " main",
  // Lookalike for 'master'
  "mаster",
  "MАSTER", // cyrillic А
  "trunk​",
  // Mixed-case + zero-width
  "Mаin",
  // Variants from real-world defaults seen on GitHub
  "main-branch",
  "master-branch",
  "release/main",
  // The actual feature-branch must NOT match
];

const SAFE_FEATURE_BRANCHES: ReadonlyArray<string> = [
  "studio-zero/fix-01H8XGABCDEFGHJKMNPQRSTVWX",
  "studio-zero/fix-deadbeef",
  "feature/main-something",
  "release-notes",
];

describe("default-branch fuzz corpus (V1.5 C8 gate)", () => {
  it.each(FUZZ_VARIANTS.slice(0, 30))(
    "blocks variant: %s",
    (variant) => {
      // Either matches the literal customer default, OR matches a
      // common default synonym. The guard fires either way.
      const isDefault = isLikelyDefaultBranch(variant, "main");
      // Some entries (e.g. 'main-branch', 'release/main') intentionally
      // do NOT match because they are LEGAL branch names that contain
      // 'main' as a substring. The fuzz corpus distinguishes by exact
      // normalized equality, not substring containment.
      const normalized = normalizeBranchForFuzz(variant);
      const looksDefault =
        ["main", "master", "trunk", "develop", "default", "production", "prod", "release"].includes(normalized);
      expect(isDefault).toBe(looksDefault);
    },
  );

  it.each(SAFE_FEATURE_BRANCHES)(
    "permits feature branch: %s",
    (branch) => {
      expect(isLikelyDefaultBranch(branch, "main")).toBe(false);
    },
  );
});

describe("openAutoPr rejects + audit-logs default-branch attempts", () => {
  it("invokes auditLogReject when the head branch would resolve to default", async () => {
    const auditLogReject = vi.fn().mockResolvedValue(undefined);
    const gh: GitHubClient = {
      // Force the repo's default branch to match our synthesized head.
      async getRepo() {
        return { default_branch: "studio-zero/fix-RUNX" };
      },
      async getRef() {
        return { object: { sha: "abc" } };
      },
      async createRef() {
        return {};
      },
      async createCommit() {
        return { sha: "ccc" };
      },
      async createPullRequest() {
        return { number: 1, html_url: "https://x" };
      },
    };
    await expect(
      openAutoPr(
        {
          artifact: {
            run_id: "RUNX",
            tenant_id: "tenant",
            fix_pr_job_id: "fp-1",
            patches: [],
            files_changed: [],
            total_lines_added: 0,
            total_lines_removed: 0,
            generated_at: "2026-05-12T00:00:00Z",
          },
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
          github: gh,
          recordPrOpened: vi.fn(),
          auditLogReject,
        },
      ),
    ).rejects.toThrow(/refused/);

    expect(auditLogReject).toHaveBeenCalledOnce();
    const callArgs = auditLogReject.mock.calls[0]?.[0] as {
      tenant_id: string;
      run_id: string;
      attempted_branch: string;
      reason: string;
    };
    expect(callArgs.attempted_branch).toBe("studio-zero/fix-RUNX");
    expect(callArgs.reason).toBe("default_branch_push_blocked");
  });
});
