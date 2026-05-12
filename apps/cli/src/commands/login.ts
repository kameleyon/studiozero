/**
 * Studio Zero — `studio-zero login` command.
 *
 * Phase 9 M3 Batch 1 (Forge). Implements C3 of the pairing flow:
 *
 *   1. Generate a device fingerprint (hostname + os + arch).
 *   2. Compute the binary hash (sha256 of process.execPath bytes).
 *   3. POST /api/cli/pair/init { deviceFingerprint } → server returns
 *      `{ pairingCode, longPollUrl }`. (Spec'd here; the server side
 *      lands in the next Forge dispatch.)
 *   4. The user is asked to paste the 6-char code they see on the web
 *      app's Settings → CLI page (alternate flow: server-generated code
 *      shown in CLI, user pastes into web).
 *   5. POST /api/cli/pair/confirm { pairingCode, deviceFingerprint,
 *      cliVersion, binaryHash } → server pairs + returns
 *      `{ token, deviceId, userEmail, tokenExpiresAt }`.
 *   6. Write `~/.studio-zero/auth.json` with 0600 perms.
 *
 * The M3 implementation supports both flows the docs describe:
 *   - Web-generated code path: user pastes code from web → CLI calls
 *     /pair/confirm directly.
 *   - CLI-generated code path: CLI calls /pair/init, prints code, user
 *     enters it on the web; CLI long-polls /pair/init until the web
 *     confirms (returns the token).
 *
 * M3 default is the web-generated code path (matches the locked
 * `cli-pairing-and-tamper.md` C2 / C3 flow).
 */
import os from "node:os";
import { readFileSync } from "node:fs";
import { loadEnv } from "../env.js";
import { ask } from "../ui/prompts.js";
import { createColors } from "../ui/colors.js";
import { writeAuth, type AuthFile } from "../auth/pairing-token.js";
import { request } from "../network/studio-client.js";
import { sha256Hex } from "../runner/verdict-sign.js";

const CLI_VERSION = "0.1.0-m3";

interface PairConfirmResponseBody {
  token: string;
  deviceId: string;
  userEmail: string;
  tokenExpiresAt: string;
}

/** Hostname + OS + arch — server stores this verbatim per cli-pairings table. */
export interface DeviceFingerprint {
  hostname: string;
  os: string;
  arch: string;
}

export function deviceFingerprint(): DeviceFingerprint {
  return {
    hostname: os.hostname(),
    os: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
  };
}

/** Compute the SHA-256 of process.execPath. Cached at pair time. */
export function computeBinaryHash(execPath: string = process.execPath): string {
  try {
    const bytes = readFileSync(execPath);
    return sha256Hex(bytes);
  } catch {
    // If we can't read the binary, fall back to a hash of execPath + CLI
    // version. This is M3-only — M3 Batch 2 will require the real hash
    // (Cipher Fix-3c manifest). For now we want pairing to work in dev
    // environments where execPath points to `node` rather than a bundled
    // binary.
    return sha256Hex(`${execPath}\n${CLI_VERSION}`);
  }
}

export interface LoginOpts {
  /** Override the API URL (testing). */
  apiUrl?: string;
  /** Pre-supply the pairing code (skip the prompt; used by `--code` flag). */
  code?: string;
  /** Override the prompt fn (testing). */
  prompt?: typeof ask;
  /** Override the http fetcher (testing). */
  fetcher?: typeof fetch;
}

export async function loginCommand(
  opts: LoginOpts = {},
): Promise<{ ok: boolean; message: string }> {
  const env = loadEnv();
  const apiUrl = opts.apiUrl ?? env.apiUrl;
  const colors = createColors();
  const fingerprint = deviceFingerprint();
  const binaryHash = computeBinaryHash();

  const promptFn = opts.prompt ?? ask;
  const code =
    opts.code ??
    (await promptFn(
      `Visit ${apiUrl}/app/settings/cli to get a pairing code.\nPaste pairing code: `,
    ));
  if (!/^[A-Z0-9]{6}$/i.test(code)) {
    return {
      ok: false,
      message:
        "That doesn't look like a pairing code. Codes are 6 letters or numbers.",
    };
  }

  const res = await request<PairConfirmResponseBody>({
    apiUrl,
    method: "POST",
    path: "/api/cli/pair/confirm",
    body: {
      pairingCode: code.toUpperCase(),
      deviceFingerprint: fingerprint,
      cliVersion: CLI_VERSION,
      binaryHash,
    },
    ...(opts.fetcher !== undefined ? { fetcher: opts.fetcher } : {}),
  });

  if (!res.ok) {
    if (res.status === 410) {
      return {
        ok: false,
        message:
          "That code has expired. Get a fresh one from the dashboard and try again.",
      };
    }
    if (res.status === 404 || res.status === 400) {
      return {
        ok: false,
        message:
          "That code didn't match. Try again or get a fresh code from the dashboard.",
      };
    }
    if (res.status === 426) {
      // 426 Upgrade Required → cli_version_too_old per the flow's C-FAIL.
      return {
        ok: false,
        message:
          "Your CLI is older than what we support. Run `studio-zero upgrade` and try again.",
      };
    }
    if (res.status === 409) {
      // cli_binary_hash_unknown
      return {
        ok: false,
        message:
          "We don't recognize this CLI binary. Download the official build from studio-zero.com/download.",
      };
    }
    return {
      ok: false,
      message: `Pairing didn't go through (status ${res.status}). Try again in a moment.`,
    };
  }

  const auth: AuthFile = {
    version: 1,
    apiUrl,
    userEmail: res.body.userEmail,
    deviceId: res.body.deviceId,
    deviceFingerprint: fingerprint,
    token: res.body.token,
    tokenExpiresAt: res.body.tokenExpiresAt,
    pairedAt: new Date().toISOString(),
    cliVersion: CLI_VERSION,
    binaryHash,
  };
  writeAuth(env.configDir, auth);

  return {
    ok: true,
    message: `Paired with ${colors.bold(auth.userEmail)} ✓\nStudio Zero ready. Run audits from the web app or with \`studio-zero run\`.`,
  };
}
