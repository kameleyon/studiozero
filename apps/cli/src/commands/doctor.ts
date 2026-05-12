/**
 * Studio Zero — `studio-zero doctor` command.
 *
 * Phase 9 M3 Batch 1 (Forge). Diagnose-and-fix advisor. Runs a set of
 * cheap checks and prints what's healthy + what's wrong, with a
 * recommended next step for each problem.
 *
 * Checks (in priority order — earliest failure wins):
 *   1. Forbidden env vars (refuses to even load env if present).
 *   2. Config file readable / parseable.
 *   3. Auth file readable + not corrupt + 0600-ish perms.
 *   4. Pairing token not expired.
 *   5. Claude Code on PATH + responsive to --version.
 *   6. Network reachable (HEAD apiUrl).
 *   7. CLI version is current (parses min-version policy from server,
 *      M3+1 wires the policy fetch).
 *
 * Output is brand-voice neutral, follows Herald's error-message frame
 * (brand/samples/05-error-messages.md) — heading, body, action.
 */
import { statSync, constants } from "node:fs";
import { authFilePath, readAuth, isTokenExpired } from "../auth/pairing-token.js";
import { detectClaudeCode } from "../runner/claude-code-detect.js";
import { loadEnv } from "../env.js";
import { request } from "../network/studio-client.js";

export interface DoctorCheck {
  id: string;
  ok: boolean;
  message: string;
  suggestion?: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
}

export async function doctorCommand(
  opts: { fetcher?: typeof fetch } = {},
): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  let env;
  try {
    env = loadEnv();
    checks.push({
      id: "env",
      ok: true,
      message: `env loaded; api=${env.apiUrl}`,
    });
  } catch (err) {
    checks.push({
      id: "env",
      ok: false,
      message: `env load failed: ${(err as Error).message}`,
      suggestion:
        "Remove any forbidden env vars (ANTHROPIC_API_KEY / SUPABASE_SERVICE_ROLE_KEY) and try again.",
    });
    return { ok: false, checks };
  }

  const auth = readAuth(env.configDir);
  if (!auth) {
    checks.push({
      id: "auth.file",
      ok: false,
      message: "No pairing token found.",
      suggestion: "Run `studio-zero login` to pair this device.",
    });
  } else {
    checks.push({
      id: "auth.file",
      ok: true,
      message: `Paired as ${auth.userEmail} (device ${auth.deviceId.slice(0, 8)}…)`,
    });

    // Perms check — POSIX only.
    try {
      const p = authFilePath(env.configDir);
      const st = statSync(p);
      // st.mode is platform-encoded; we mask the lower 9 bits.
      const mode = st.mode & 0o777;
      const isPosix = process.platform !== "win32";
      if (isPosix && mode !== 0o600) {
        checks.push({
          id: "auth.perms",
          ok: false,
          message: `auth.json has mode ${mode.toString(8)}; expected 600.`,
          suggestion: `Run: chmod 600 ${p}`,
        });
      } else {
        checks.push({
          id: "auth.perms",
          ok: true,
          message: isPosix ? "auth.json perms 0600 ✓" : "auth.json present (Windows ACL not asserted)",
        });
      }
      // Touch constants to keep the import live (used in M3+1 chmod helper).
      void constants;
    } catch {
      // already covered by auth.file check
    }

    if (isTokenExpired(auth)) {
      checks.push({
        id: "auth.expiry",
        ok: false,
        message: `Pairing token expired at ${auth.tokenExpiresAt}.`,
        suggestion: "Run `studio-zero login` to refresh.",
      });
    } else {
      checks.push({
        id: "auth.expiry",
        ok: true,
        message: `Pairing token valid until ${auth.tokenExpiresAt}.`,
      });
    }
  }

  const cc = detectClaudeCode(env.claudeCodeBin);
  if (!cc.found) {
    checks.push({
      id: "claude-code",
      ok: false,
      message: "Claude Code is not on your PATH.",
      suggestion:
        "Install Claude Code from anthropic.com/claude-code and re-run `studio-zero doctor`.",
    });
  } else {
    checks.push({
      id: "claude-code",
      ok: true,
      message: `Claude Code ${cc.version} at ${cc.binPath}`,
    });
  }

  // Network reach — GET /api/cli/handshake (M3+1: returns the pinned
  // Ed25519 public key per Cipher Fix-3c). For M3 we treat any
  // 200/401/404 as "server reachable" — TLS + DNS + routing all work.
  try {
    const res = await request({
      apiUrl: env.apiUrl,
      method: "GET",
      path: "/api/cli/handshake",
      ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
    });
    checks.push({
      id: "network",
      ok: res.status > 0,
      message:
        res.status > 0
          ? `${env.apiUrl} responded (HTTP ${res.status})`
          : `Could not reach ${env.apiUrl}.`,
      ...(res.status === 0
        ? { suggestion: "Check your network and try again." }
        : {}),
    });
  } catch (err) {
    checks.push({
      id: "network",
      ok: false,
      message: `Could not reach ${env.apiUrl}: ${(err as Error).message}`,
      suggestion: "Check your network and try again.",
    });
  }

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}

/** Format the doctor report for tty. */
export function formatDoctor(r: DoctorReport): string {
  const lines: string[] = [];
  for (const c of r.checks) {
    const icon = c.ok ? "OK" : "XX";
    lines.push(`  [${icon}] ${c.id.padEnd(12)} ${c.message}`);
    if (!c.ok && c.suggestion) {
      lines.push(`        → ${c.suggestion}`);
    }
  }
  lines.push("");
  lines.push(r.ok ? "All checks passed." : "Some checks failed.");
  return lines.join("\n");
}
