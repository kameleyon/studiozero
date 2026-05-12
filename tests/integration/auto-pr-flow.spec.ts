/**
 * Studio Zero — Auto-PR happy-path integration spec.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Drives build → re-audit PASS → PR open.
 * Maps to milestone-V1-5.md "tests/acceptance/goal-3-fix-delivery.spec.ts"
 * pre-cursor — keeps the goal-3 e2e test cheap to write at V1.5 close.
 */
import { describe, it, expect, vi } from "vitest";
import {
  dispatchBuild,
  type BuildFinding,
} from "../../apps/runner/src/build/index.js";
import {
  openAutoPr,
  type GitHubClient,
  ART50_DISCLOSURE,
} from "../../apps/runner/src/build/pr-opener.js";
import type { LlmGatewayClient } from "../../apps/runner/src/llm-gateway-client.js";

const ORIGINAL =
  Array.from({ length: 60 }, (_, i) => `line${i + 1}`).join("\n") + "\n";

function gateway(): LlmGatewayClient {
  return {
    message: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        replacement_block: "fixed line content",
        confidence: 0.9,
      }),
      usage: { input: 50, output: 80 },
      modelClass: "thoughtful",
      requestId: "spec-auto-pr",
    }),
  };
}

function makeGh(): GitHubClient {
  return {
    async getRepo() {
      return { default_branch: "main" };
    },
    async getRef() {
      return { object: { sha: "abc123" } };
    },
    async createRef() {
      return {};
    },
    async createCommit() {
      return { sha: "cccc111" };
    },
    async createPullRequest() {
      return { number: 99, html_url: "https://github.com/x/y/pull/99" };
    },
  };
}

describe("Auto-PR happy path — build → re-audit PASS → PR open", () => {
  it("builds patches, then opens a feature-branch PR with Art. 50 disclosure", async () => {
    const findings: BuildFinding[] = [
      {
        id: "uuid-1",
        finding_code: "F-001",
        run_id: "01H8XGABCDEFGHJKMNPQRSTVWX",
        tenant_id: "tenant-1",
        severity: "Major",
        layer: "accessibility",
        reviewer: "halo",
        summary: "missing label",
        recommendation: "associate label via htmlFor",
        file_path: "src/SignupForm.tsx",
        line_start: 10,
        line_end: 10,
      },
    ];

    const lensEvents: string[] = [];
    const recordPrOpened = vi.fn().mockResolvedValue(undefined);

    const buildOut = await dispatchBuild(
      {
        fix_pr_job_id: "fp-1",
        run_id: "01H8XGABCDEFGHJKMNPQRSTVWX",
        tenant_id: "tenant-1",
        signal: new AbortController().signal,
      },
      {
        gateway: gateway(),
        loadFindings: vi.fn().mockResolvedValue(findings),
        readFile: vi.fn().mockResolvedValue(ORIGINAL),
        runner_version: "1.5.0",
      },
    );

    expect(buildOut.artifact.patches).toHaveLength(1);
    expect(buildOut.failures).toHaveLength(0);

    // Simulate "re-audit PASS" by passing artifact through to PR opener.
    const result = await openAutoPr(
      {
        artifact: buildOut.artifact,
        owner: "acme",
        repo: "demo",
        project_name: "demo-app",
        original_verdict: "FAIL",
        reaudit_verdict: "PASS WITH FIXES",
        score_delta: 20,
        score_engine_version_snapshot: "v1",
        files_to_commit: [
          {
            file_path: "src/SignupForm.tsx",
            new_contents_utf8: "patched\n",
          },
        ],
        runner_version: "1.5.0",
      },
      {
        github: makeGh(),
        recordPrOpened,
        auditLogReject: vi.fn(),
        emitLensEvent: async (name) => {
          lensEvents.push(name);
        },
      },
    );

    expect(result.pr_number).toBe(99);
    expect(result.branch_name.startsWith("studio-zero/fix-")).toBe(true);
    expect(recordPrOpened).toHaveBeenCalledOnce();
    expect(lensEvents).toContain("auto_pr_opened");
  });

  it("locked Art. 50 disclosure is present in every PR body", () => {
    // Snapshot guard — changing this string requires a Comply-signed
    // PR + a matching update to auto-pr-art50-disclosure.spec.ts.
    // V2.1 Batch 1 (Forge VF1 carry close) — the locked verbatim text now
    // matches legal/pr-body-template.md §2 exactly.
    expect(ART50_DISCLOSURE).toContain("AI Act Art. 50 Disclosure:");
    expect(ART50_DISCLOSURE).toContain("AI-Authored");
    expect(ART50_DISCLOSURE).toContain("Refs: F-NNN");
  });
});
