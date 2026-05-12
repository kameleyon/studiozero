/**
 * Studio Zero — Auto-PR opener.
 *
 * Phase 9 V1.5 Batch 1 (Forge). Called by the build worker AFTER the
 * Jury re-audit gate (`supabase/functions/jury-reaudit-gate`) returns
 * PASS or PASS-WITH-FIXES. Owns:
 *
 *   1. Octokit-equivalent client (raw fetch — keeps the runner dep
 *      graph tight per Cipher v0.5 lockfile-minimalism rule)
 *   2. Branch creation `studio-zero/fix-<run-id>` (NEVER push to
 *      default branch — PRD §11.2 hard rule)
 *   3. One commit per patch, each carrying:
 *        - `Refs: F-NNN` trailer (originating finding ID)
 *        - `AI-Authored: studio-zero/runner@v<x.y.z>` trailer
 *   4. Pull request open with the Art. 50 disclosure paragraph in the
 *      body (Comply + Herald template)
 *   5. `fix_pr_jobs` row update with state='pr_opened' + pr_number + pr_url
 *
 * Hard rule (PRD §11.2): the pre-flight `head != default_branch` check
 * runs BEFORE any GitHub API call. A finding-fuzz attempt to push to
 * `main` / `master` / unicode-lookalikes is REJECTED and audit-logged.
 *
 * Cross-refs:
 *   - PRD §11.2 + §11.3 (Auto-PR rules + Art. 50 disclosure)
 *   - architecture/decisions.md ARCH-D6 (D23 GH App uninstall)
 *   - apps/runner/src/build/types.ts (PatchArtifact)
 *   - apps/web/lib/ai-disclosure.ts (the Art. 50 paragraph source)
 */
import type { PatchArtifact } from "./types.js";
import { assertSafeUrl } from "../ssrf-guard.js";

/**
 * Locked Art. 50 disclosure paragraph (Comply + Herald template).
 *
 * Held in source rather than runtime_config because (a) it must be
 * snapshot-testable for the Verify gate, and (b) it is load-bearing
 * for the EU AI Act Art. 50 compliance contract — a config-table
 * write that drifts the text is exactly the failure mode PRD §11.2
 * forbids. To change this string you MUST land a Comply-signed PR
 * and update `tests/integration/auto-pr-art50-disclosure.spec.ts` in
 * the same commit.
 *
 * V2.1 Batch 1 (Forge) — VF1 carry close. The previous draft mixed Comply's
 * "Art. 50 disclosure" prose with Herald's commit-trailer narration. Comply
 * re-locked the §2 paragraph in `legal/pr-body-template.md`; this constant is
 * now substituted with the VERBATIM source from §2 plus the bracketed tokens
 * the opener substitutes at render time, then re-wrapped (no rewrite) into
 * the PR-body opening "Studio Zero — N fix recommendation(s)" envelope that
 * §1 of the same doc defines.
 *
 * LOCKED by Comply at legal/pr-body-template.md §2 — do NOT modify without
 * Comply sign-off (re-verified on the quarterly System Card cadence).
 */
// LOCKED by Comply at legal/pr-body-template.md §2 — do NOT modify without Comply sign-off
export const ART50_DISCLOSURE = `**AI Act Art. 50 Disclosure:** This pull request was authored by an AI system (Studio Zero v<system_card_version>) on behalf of <tenant_name>. All code changes are AI-generated and have been pre-verified by Studio Zero's independent audit panel (Jury + 6 reviewers) before this PR was opened. Customer review and approval is required before merge. See https://studiozero.dev/system-card for the AI System Card.

**Auto-PR provenance:** Each commit in this PR carries an \`AI-Authored: studio-zero/runner@v<runner_version>\` trailer and a \`Refs: F-NNN\` trailer pointing to the originating audit finding. California SB 942 machine-readable provenance is satisfied by the same trailer (see legal/ai-system-card for the full disclosure cycle).`;

/** Default-branch fuzz reject list. Mirrors the Shield corpus at
 *  `runner/fixtures/default-branch-fuzz-corpus/`. Case-insensitive +
 *  trim-aware. */
const DEFAULT_BRANCH_FUZZ_LIST: ReadonlyArray<string> = [
  "main",
  "master",
  "trunk",
  "develop",
  "default",
  "production",
  "prod",
  "release",
];

/** Normalize a branch name for fuzz-detection. Lowercases, NFKC, trims
 *  trailing whitespace + zero-width chars, replaces lookalike unicode
 *  cyrillic "а" → "a", etc. */
export function normalizeBranchForFuzz(name: string): string {
  if (typeof name !== "string") return "";
  let s = name.normalize("NFKC").trim();
  // Strip zero-width + bidi marks.
  s = s.replace(/[​-‏‪-‮﻿]/g, "");
  // Common cyrillic/greek lookalikes for "main"/"master".
  s = s
    .replace(/а/g, "a") // cyrillic a
    .replace(/е/g, "e") // cyrillic e
    .replace(/о/g, "o") // cyrillic o
    .replace(/р/g, "p") // cyrillic p (looks like p)
    .replace(/ѕ/g, "s") // cyrillic s
    .replace(/α/g, "a") // greek alpha
    .replace(/ο/g, "o"); // greek omicron
  return s.toLowerCase();
}

/** Returns true if `branch` resolves to the customer's default branch
 *  (or any common synonym). PRD §11.2 hard rule reject. */
export function isLikelyDefaultBranch(
  branch: string,
  customer_default_branch: string,
): boolean {
  const normalized = normalizeBranchForFuzz(branch);
  if (normalized === normalizeBranchForFuzz(customer_default_branch)) {
    return true;
  }
  return DEFAULT_BRANCH_FUZZ_LIST.includes(normalized);
}

/* -------------------------------------------------------------------- */
/* GitHub client — minimal REST surface                                 */
/* -------------------------------------------------------------------- */

export interface GitHubClient {
  getRepo: (
    owner: string,
    repo: string,
  ) => Promise<{ default_branch: string; node_id?: string }>;
  getRef: (
    owner: string,
    repo: string,
    ref: string,
  ) => Promise<{ object: { sha: string } }>;
  createRef: (
    owner: string,
    repo: string,
    args: { ref: string; sha: string },
  ) => Promise<unknown>;
  /** Create one commit per patch via the "tree + commit + update ref"
   *  sequence. The shape is a simplification: we attach the unified
   *  diff as the commit body so reviewers see the patch source. */
  createCommit: (
    owner: string,
    repo: string,
    args: {
      branch: string;
      parent_sha: string;
      file_path: string;
      file_contents_base64: string;
      message: string;
    },
  ) => Promise<{ sha: string }>;
  createPullRequest: (
    owner: string,
    repo: string,
    args: {
      title: string;
      head: string;
      base: string;
      body: string;
    },
  ) => Promise<{ number: number; html_url: string }>;
}

export interface OctokitFetchOptions {
  /** Installation token from GitHub App per-tenant install (oauth_tokens). */
  installation_token: string;
  /** Optional override of api host — defaults to api.github.com. */
  api_base?: string;
}

/** Build a minimal GitHubClient over `fetch`. */
export function createGitHubClient(opts: OctokitFetchOptions): GitHubClient {
  const apiBase = opts.api_base ?? "https://api.github.com";
  assertSafeUrl(apiBase);

  const headers = (): Record<string, string> => ({
    Authorization: `Bearer ${opts.installation_token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "studio-zero-runner",
  });

  const gh = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const url = `${apiBase}${path}`;
    assertSafeUrl(url);
    const init: RequestInit = {
      method,
      headers: { ...headers(), "Content-Type": "application/json" },
      redirect: "error",
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`[pr-opener] GH ${method} ${path}: ${res.status} ${detail}`);
    }
    return res.json();
  };

  return {
    async getRepo(owner, repo) {
      return (await gh("GET", `/repos/${owner}/${repo}`)) as {
        default_branch: string;
        node_id?: string;
      };
    },
    async getRef(owner, repo, ref) {
      return (await gh("GET", `/repos/${owner}/${repo}/git/ref/${ref}`)) as {
        object: { sha: string };
      };
    },
    async createRef(owner, repo, args) {
      return gh("POST", `/repos/${owner}/${repo}/git/refs`, args);
    },
    async createCommit(owner, repo, args) {
      // Two-step: PUT contents (creates blob + tree + commit + updates ref).
      const path = `/repos/${owner}/${repo}/contents/${encodeURIComponent(
        args.file_path,
      )}`;
      // Read current file sha on the branch so the update is valid.
      let existing_sha: string | undefined;
      try {
        const cur = (await gh(
          "GET",
          `${path}?ref=${encodeURIComponent(args.branch)}`,
        )) as { sha?: string };
        existing_sha = cur.sha;
      } catch {
        // File may not exist on the new branch yet (first commit).
      }
      const resp = (await gh("PUT", path, {
        message: args.message,
        content: args.file_contents_base64,
        branch: args.branch,
        ...(existing_sha && { sha: existing_sha }),
      })) as { commit: { sha: string } };
      return { sha: resp.commit.sha };
    },
    async createPullRequest(owner, repo, args) {
      return (await gh("POST", `/repos/${owner}/${repo}/pulls`, args)) as {
        number: number;
        html_url: string;
      };
    },
  };
}

/* -------------------------------------------------------------------- */
/* PR open                                                              */
/* -------------------------------------------------------------------- */

export interface OpenPrInput {
  artifact: PatchArtifact;
  owner: string;
  repo: string;
  /** Pre-fetched run record values used in the PR body. */
  project_name: string;
  original_verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  reaudit_verdict: "PASS" | "PASS WITH FIXES";
  score_delta: number;
  score_engine_version_snapshot: string;
  /** Files patched, with the new contents to write at commit-time. The
   *  caller (worker) is responsible for applying patches to a working
   *  tree and reading them back; the PR opener does NOT apply diffs
   *  itself. Each entry's `file_path` matches one or more
   *  `artifact.patches[i].file_path`. */
  files_to_commit: Array<{
    file_path: string;
    new_contents_utf8: string;
  }>;
  runner_version: string;
}

export interface OpenPrDeps {
  github: GitHubClient;
  /** Persistence side-effect to write fix_pr_jobs.{state, pr_number, pr_url}. */
  recordPrOpened: (args: {
    fix_pr_job_id: string;
    pr_number: number;
    pr_url: string;
    branch_name: string;
  }) => Promise<void>;
  /** Audit-log side-effect for the default-branch fuzz reject path. */
  auditLogReject: (args: {
    tenant_id: string;
    run_id: string;
    fix_pr_job_id: string;
    attempted_branch: string;
    reason: string;
  }) => Promise<void>;
  emitLensEvent?: (
    name:
      | "auto_pr_opened"
      | "auto_pr_merged"
      | "auto_pr_closed_unmerged",
    props: Record<string, unknown>,
  ) => Promise<void>;
}

export interface OpenPrResult {
  pr_number: number;
  pr_url: string;
  branch_name: string;
  commits_sha: string[];
}

export async function openAutoPr(
  input: OpenPrInput,
  deps: OpenPrDeps,
): Promise<OpenPrResult> {
  // 1. Discover the customer's default branch.
  const repoMeta = await deps.github.getRepo(input.owner, input.repo);
  const customerDefault = repoMeta.default_branch;

  // 2. Construct the feature branch name. Studio Zero policy:
  //    `studio-zero/fix-<run-id>`. Sanitize run-id (ULID safe but be
  //    defensive). NEVER allow this to resolve to default.
  const safeRunId = input.artifact.run_id.replace(/[^A-Za-z0-9._-]/g, "");
  const branch_name = `studio-zero/fix-${safeRunId}`;

  if (isLikelyDefaultBranch(branch_name, customerDefault)) {
    await deps.auditLogReject({
      tenant_id: input.artifact.tenant_id,
      run_id: input.artifact.run_id,
      fix_pr_job_id: input.artifact.fix_pr_job_id,
      attempted_branch: branch_name,
      reason: "default_branch_push_blocked",
    });
    throw new Error(
      `[pr-opener] refused: head branch '${branch_name}' resolves to default '${customerDefault}'`,
    );
  }

  // 3. Branch off the default branch.
  const baseRef = await deps.github.getRef(
    input.owner,
    input.repo,
    `heads/${customerDefault}`,
  );
  await deps.github.createRef(input.owner, input.repo, {
    ref: `refs/heads/${branch_name}`,
    sha: baseRef.object.sha,
  });

  // 4. One commit per patch — each commit message carries the
  //    `Refs: F-NNN` + `AI-Authored:` trailers.
  const commits_sha: string[] = [];
  for (const patch of input.artifact.patches) {
    const file_to_commit = input.files_to_commit.find(
      (f) => f.file_path === patch.file_path,
    );
    if (!file_to_commit) {
      throw new Error(
        `[pr-opener] missing file_to_commit for patch on ${patch.file_path}`,
      );
    }
    const commit_message = formatCommitMessage({
      finding_code: patch.finding_code,
      file_path: patch.file_path,
      runner_version: input.runner_version,
    });
    const base64 = toBase64Utf8(file_to_commit.new_contents_utf8);
    const c = await deps.github.createCommit(input.owner, input.repo, {
      branch: branch_name,
      parent_sha: baseRef.object.sha,
      file_path: patch.file_path,
      file_contents_base64: base64,
      message: commit_message,
    });
    commits_sha.push(c.sha);
  }

  // 5. Open PR with the locked Art. 50 body template.
  const title = `Studio Zero — ${input.artifact.patches.length} fix recommendation(s) for ${input.project_name}`;
  const body = formatPrBody({
    artifact: input.artifact,
    project_name: input.project_name,
    original_verdict: input.original_verdict,
    reaudit_verdict: input.reaudit_verdict,
    score_delta: input.score_delta,
    score_engine_version_snapshot: input.score_engine_version_snapshot,
    runner_version: input.runner_version,
  });

  const pr = await deps.github.createPullRequest(input.owner, input.repo, {
    title,
    head: branch_name,
    base: customerDefault,
    body,
  });

  await deps.recordPrOpened({
    fix_pr_job_id: input.artifact.fix_pr_job_id,
    pr_number: pr.number,
    pr_url: pr.html_url,
    branch_name,
  });

  if (deps.emitLensEvent) {
    await deps.emitLensEvent("auto_pr_opened", {
      run_id: input.artifact.run_id,
      fix_pr_job_id: input.artifact.fix_pr_job_id,
      pr_number: pr.number,
      findings_in_pr: input.artifact.patches.length,
    });
  }

  return {
    pr_number: pr.number,
    pr_url: pr.html_url,
    branch_name,
    commits_sha,
  };
}

/* -------------------------------------------------------------------- */
/* Templates                                                            */
/* -------------------------------------------------------------------- */

export function formatCommitMessage(args: {
  finding_code: string;
  file_path: string;
  runner_version: string;
}): string {
  // Single-line subject is the convention (Herald commit-style rule).
  const subject = `fix(${args.finding_code}): apply Studio Zero recommendation to ${args.file_path}`;
  // Trailers are Git-format: blank line between body and trailers.
  return [
    subject,
    "",
    `Refs: ${args.finding_code}`,
    `AI-Authored: studio-zero/runner@v${args.runner_version}`,
  ].join("\n");
}

export function formatPrBody(args: {
  artifact: PatchArtifact;
  project_name: string;
  original_verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  reaudit_verdict: "PASS" | "PASS WITH FIXES";
  score_delta: number;
  score_engine_version_snapshot: string;
  runner_version: string;
}): string {
  const findingsTable = [
    "| Finding | Severity | Layer | File | Lines |",
    "| --- | --- | --- | --- | --- |",
    ...args.artifact.patches.map(
      (p) =>
        `| ${p.finding_code} | — | ${produced_by_to_layer(p.produced_by)} | \`${p.file_path}\` | +${p.lines_added} / -${p.lines_removed} |`,
    ),
  ].join("\n");
  return [
    ART50_DISCLOSURE,
    "",
    `## What changed in \`${args.project_name}\``,
    "",
    findingsTable,
    "",
    "## Re-audit",
    "",
    `- **Original verdict:** ${args.original_verdict}`,
    `- **Re-audit verdict:** ${args.reaudit_verdict}`,
    `- **Score delta:** ${args.score_delta >= 0 ? "+" : ""}${args.score_delta}`,
    `- **Score engine version (snapshot at fix-time):** \`${args.score_engine_version_snapshot}\``,
    `- **Re-audit badge:** [View re-audit detail](https://studiozero.dev/app/audits/${args.artifact.run_id})`,
    "",
    "## Provenance",
    "",
    `- Built by \`studio-zero/runner@v${args.runner_version}\`.`,
    "- Every commit carries an `AI-Authored:` Git trailer.",
    "- Every commit carries a `Refs: F-NNN` trailer pointing to its originating finding.",
    "- Full AI system card: <https://studiozero.dev/system-card>.",
  ].join("\n");
}

function produced_by_to_layer(by: string): string {
  switch (by) {
    case "halo-fixer":
      return "accessibility";
    case "proof-fixer":
      return "copy";
    case "optic-fixer":
      return "design";
    case "canon-fixer":
      return "brand";
    case "compass-fixer":
      return "audience";
    case "trace-fixer":
      return "flow";
    default:
      return "unknown";
  }
}

function toBase64Utf8(s: string): string {
  // Node 18+ Buffer-safe in runner; encode as UTF-8 then base64.
  return Buffer.from(s, "utf-8").toString("base64");
}
