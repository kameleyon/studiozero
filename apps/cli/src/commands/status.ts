/**
 * Studio Zero — `studio-zero status` command.
 *
 * Phase 9 M3 Batch 1 (Forge). Shows the current pairing state + last
 * verdict + cached binary hash so a user can verify their local setup
 * without running a fresh audit.
 *
 * Output is structured but human-readable — no JSON unless the caller
 * passes `--json` (M3+1; documented in the README's commands table).
 *
 * The watermark text is rendered here too so the customer sees the
 * exact words that will accompany their CLI-produced verdicts in the
 * web app (SC 3.2.4 consistency).
 */
import { loadEnv } from "../env.js";
import { readAuth, isTokenExpired } from "../auth/pairing-token.js";
import { detectClaudeCode } from "../runner/claude-code-detect.js";
import { createColors } from "../ui/colors.js";
import { watermarkBlock } from "../watermark/private-run-self-audited.js";

export interface StatusReport {
  paired: boolean;
  userEmail?: string;
  deviceId?: string;
  hostname?: string;
  tokenExpiresAt?: string;
  tokenExpired?: boolean;
  binaryHash?: string;
  claudeCodeFound: boolean;
  claudeCodeVersion?: string;
  watermark: string;
}

/** Pure version of the status command (for tests). */
export function buildStatus(now: Date = new Date()): StatusReport {
  const env = loadEnv();
  const auth = readAuth(env.configDir);
  const cc = detectClaudeCode(env.claudeCodeBin);

  if (!auth) {
    return {
      paired: false,
      claudeCodeFound: cc.found,
      ...(cc.version !== null ? { claudeCodeVersion: cc.version } : {}),
      watermark: watermarkBlock(),
    };
  }

  return {
    paired: true,
    userEmail: auth.userEmail,
    deviceId: auth.deviceId,
    hostname: auth.deviceFingerprint.hostname,
    tokenExpiresAt: auth.tokenExpiresAt,
    tokenExpired: isTokenExpired(auth, now),
    binaryHash: auth.binaryHash,
    claudeCodeFound: cc.found,
    ...(cc.version !== null ? { claudeCodeVersion: cc.version } : {}),
    watermark: watermarkBlock(),
  };
}

/** Print the status report. */
export function statusCommand(): string {
  const r = buildStatus();
  const c = createColors();
  const lines: string[] = [];
  if (!r.paired) {
    lines.push(c.fail("Not signed in."));
    lines.push("Run `studio-zero login` to pair this device.");
  } else {
    lines.push(c.pass(`Signed in as ${c.bold(r.userEmail!)}`));
    lines.push(`  Device:        ${r.hostname}`);
    lines.push(`  Device ID:     ${c.dim(r.deviceId!)}`);
    lines.push(
      `  Token expires: ${r.tokenExpired ? c.fail(r.tokenExpiresAt!) : r.tokenExpiresAt}`,
    );
    lines.push(`  Binary hash:   ${c.dim(r.binaryHash!)}`);
  }
  lines.push("");
  lines.push(
    r.claudeCodeFound
      ? c.pass(`Claude Code: ${r.claudeCodeVersion}`)
      : c.warn("Claude Code: not found on PATH"),
  );
  lines.push("");
  lines.push(c.watermark(r.watermark));
  return lines.join("\n");
}
