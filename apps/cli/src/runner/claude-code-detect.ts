/**
 * Studio Zero — Claude Code installation detection.
 *
 * Phase 9 M3 Batch 1 (Forge). CLI mode relies on the customer's local
 * Claude Code installation (PRD §8 — the third column). Before any run
 * we verify the binary is reachable; if not, we surface Herald's CLI
 * offline copy variant (brand/samples/05-error-messages.md §1
 * adapted for the install-missing case).
 *
 * The detection is intentionally cheap:
 *  - try `which` / `where` for the binary name (default
 *    `anthropic-claude-code`, overridable via env CLAUDE_CODE_BIN);
 *  - if found, invoke `<bin> --version` and parse the version line;
 *  - if the binary fails to launch, return `not_found`.
 *
 * M3 carry: we do NOT invoke Claude Code subprocesses yet — that lands
 * in M3 Batch 2 / 3 when each reviewer's prompt template + folder-context
 * passing is wired. Until then, `reviewers-local.ts` returns canned
 * findings (the "reviewers mocked" carry in the PRD).
 */
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

export interface ClaudeCodeStatus {
  /** True if a Claude Code binary was found AND it responded to --version. */
  found: boolean;
  /** Absolute path resolved by `which`/`where`, if any. */
  binPath: string | null;
  /** Version string from `<bin> --version`, if reachable. */
  version: string | null;
  /** When found===false, a short reason string for the doctor command. */
  reason?: string;
}

/**
 * Detect the customer's Claude Code installation. Pure function over
 * the shell — no network. Safe to call in `doctor` and before each
 * `run`. Honors the CLAUDE_CODE_BIN env override.
 */
export function detectClaudeCode(
  binName: string = process.env.CLAUDE_CODE_BIN ?? "anthropic-claude-code",
): ClaudeCodeStatus {
  const isWin = platform() === "win32";
  const which = spawnSync(isWin ? "where" : "which", [binName], {
    encoding: "utf-8",
  });
  if (which.status !== 0 || !which.stdout.trim()) {
    return {
      found: false,
      binPath: null,
      version: null,
      reason: "binary_not_on_path",
    };
  }
  const binPath = which.stdout.trim().split(/\r?\n/)[0] ?? binName;

  const probe = spawnSync(binPath, ["--version"], { encoding: "utf-8" });
  if (probe.status !== 0) {
    return {
      found: false,
      binPath,
      version: null,
      reason: "binary_did_not_respond",
    };
  }
  const version = (probe.stdout || probe.stderr || "").trim();
  return { found: true, binPath, version: version || "unknown" };
}
