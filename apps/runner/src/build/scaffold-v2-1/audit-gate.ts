/**
 * Studio Zero — V2.1 scaffold audit gate.
 *
 * Phase 9 V2.1 Batch 1 (Forge). The Jury full audit runs on the GENERATED
 * scaffold BEFORE delivery. This module is the orchestration boundary:
 * the caller hands us a stack + the file list; we hand back a verdict.
 *
 * Net-recursive (PRD §7.3 hard rule + sprint/milestone-V2-1.md exit gate):
 * the Studio Zero audit panel is the QA gate for Studio Zero's OWN scaffold-
 * generated output. We audit ourselves with the same gate we sell.
 *
 * Verdict rules (mirror PRD §7.2 audit semantics):
 *   - PASS              0 Critical + 0 Major + ≤3 Minor → ship
 *   - PASS WITH FIXES   0 Critical + ≤2 Major + any Minor → ship + checklist
 *   - FAIL              any Critical OR >2 Major → halt + refund
 *
 * The actual reviewer panel + score-engine call lives in the runner; this
 * file exposes the contract + a deterministic mock for tests.
 */
import type { ScaffoldFile, ScaffoldAuditResult, ScaffoldStack } from "./types.js";

export interface AuditGateDeps {
  /** Calls the Jury full-audit pipeline against the file list.
   *  Implementation in production wraps the runner's reviewers package. */
  runJuryAudit: (args: {
    stack: ScaffoldStack;
    files: ScaffoldFile[];
  }) => Promise<{
    findings: ScaffoldAuditResult["findings"];
    score: number;
    audit_run_id: string;
  }>;
}

/** Decide the verdict from a finding set.
 *  Exported for direct testing — the rule table changes are audit-logged. */
export function decideVerdict(
  findings: ScaffoldAuditResult["findings"],
): { verdict: ScaffoldAuditResult["verdict"]; rejection_reason?: string } {
  const critical = findings.filter((f) => f.severity === "critical");
  const major = findings.filter((f) => f.severity === "major");
  const minor = findings.filter((f) => f.severity === "minor");
  if (critical.length > 0) {
    return {
      verdict: "FAIL",
      rejection_reason: `${critical.length} Critical finding(s): ${critical
        .slice(0, 3)
        .map((f) => `${f.code} — ${f.summary}`)
        .join("; ")}`,
    };
  }
  if (major.length > 2) {
    return {
      verdict: "FAIL",
      rejection_reason: `${major.length} Major findings (cap is 2 for PASS WITH FIXES).`,
    };
  }
  if (major.length > 0 || minor.length > 3) {
    return { verdict: "PASS WITH FIXES" };
  }
  return { verdict: "PASS" };
}

/** Run the audit gate on a generated scaffold. Always returns a verdict. */
export async function runScaffoldAuditGate(
  args: { stack: ScaffoldStack; files: ScaffoldFile[] },
  deps: AuditGateDeps,
): Promise<ScaffoldAuditResult> {
  const jury = await deps.runJuryAudit(args);
  const decision = decideVerdict(jury.findings);
  return {
    verdict: decision.verdict,
    score: jury.score,
    findings: jury.findings,
    decided_at: new Date().toISOString(),
    audit_run_id: jury.audit_run_id,
    rejection_reason: decision.rejection_reason,
  };
}

/** Deterministic mock audit — returns PASS for clean scaffolds, FAIL when a
 *  file contains a sentinel string, PASS WITH FIXES when the scaffold has
 *  any TODO comment. Used by integration tests + by the local dev loop. */
export function makeMockJuryAudit(): AuditGateDeps["runJuryAudit"] {
  return async ({ files }) => {
    const findings: ScaffoldAuditResult["findings"] = [];
    for (const f of files) {
      // Sentinel: force a FAIL when "SECURITY_BUG" appears.
      if (f.contents.includes("SECURITY_BUG")) {
        findings.push({
          code: "F-SEC-001",
          severity: "critical",
          layer: "security",
          file_path: f.path,
          summary: "Sentinel SECURITY_BUG present in source.",
        });
      }
      // PASS WITH FIXES: TODO + lacks an explicit return type.
      if (/\bTODO\b/.test(f.contents)) {
        findings.push({
          code: "F-MIN-001",
          severity: "minor",
          layer: "frontend",
          file_path: f.path,
          summary: "Outstanding TODO in scaffold output.",
        });
      }
    }
    // Score: 100 - 30*critical - 10*major - 2*minor.
    const c = findings.filter((f) => f.severity === "critical").length;
    const m = findings.filter((f) => f.severity === "major").length;
    const n = findings.filter((f) => f.severity === "minor").length;
    const score = Math.max(0, 100 - 30 * c - 10 * m - 2 * n);
    return {
      findings,
      score,
      audit_run_id: `mock-audit-${Date.now()}`,
    };
  };
}
