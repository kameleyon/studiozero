/**
 * Studio Zero — CLI env + config validation.
 *
 * Phase 9 M3 Batch 1 (Forge). Two sources of configuration, merged in
 * this order (later wins):
 *
 *   1. ~/.studio-zero/config.json  (user file; zod-validated)
 *   2. process.env                  (env overrides; zod-validated)
 *
 * Plus a hard refuse-list of env vars the CLI MUST NEVER accept (defence
 * in depth — see TB-7 + the PRD §8 BYOK-of-Claude-Code mode).
 *
 * Why the CLI refuses these:
 *  - ANTHROPIC_API_KEY:           CLI mode uses the customer's own
 *                                 Claude Code installation. That install
 *                                 IS the key relationship. The CLI must
 *                                 not "helpfully" pick up a raw key from
 *                                 env — it would muddy the BYOK contract
 *                                 and confuse the consent surface.
 *  - SUPABASE_SERVICE_ROLE_KEY:   the CLI is a customer-machine surface.
 *                                 Carrying the service-role key would
 *                                 allow it to bypass RLS on the server,
 *                                 which is a non-starter (Atlas B2).
 *  - SUPABASE_SERVICE_KEY:        alias of the above.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";

const FORBIDDEN_KEYS = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
] as const;

/** Default config dir under the user's home directory. */
export function defaultConfigDir(): string {
  return path.join(os.homedir(), ".studio-zero");
}

/** Default API base URL — the production web app. */
export const DEFAULT_API_URL = "https://studio-zero.com";

/** Default Claude Code binary name as installed by the customer. */
export const DEFAULT_CLAUDE_CODE_BIN = "anthropic-claude-code";

/** Shape of `~/.studio-zero/config.json`. All fields optional. */
const ConfigFileSchema = z
  .object({
    apiUrl: z.string().url().optional(),
    claudeCodeBin: z.string().min(1).optional(),
    logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
    mockReviewers: z.boolean().optional(),
  })
  .strict();

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

/** Effective env + config after merge. */
export interface CliEnv {
  /** Where the web app lives. CLI HTTP client targets `${apiUrl}/api/cli/*`. */
  apiUrl: string;
  /** Where auth.json + config.json live. */
  configDir: string;
  /** Path of the Claude Code CLI binary (autodetected at runtime if missing). */
  claudeCodeBin: string;
  /** Log verbosity. */
  logLevel: "debug" | "info" | "warn" | "error";
  /** When true, reviewers return canned mock findings (M3 default). */
  mockReviewers: boolean;
}

function readConfigFile(configDir: string): ConfigFile {
  const p = path.join(configDir, "config.json");
  if (!existsSync(p)) return {};
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = ConfigFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `[studio-zero] config.json validation failed:\n${parsed.error.errors
          .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
          .join("\n")}`,
      );
    }
    return parsed.data;
  } catch (err) {
    // Malformed JSON or filesystem error — fail visibly. The CLI is a
    // single-user tool; the user can fix or delete their config.
    throw new Error(
      `[studio-zero] could not read ${p}: ${(err as Error).message}`,
    );
  }
}

/**
 * Resolve effective env. Validates and merges file + process env.
 * Throws on any forbidden env var (defence-in-depth).
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): CliEnv {
  for (const k of FORBIDDEN_KEYS) {
    if (source[k] !== undefined && source[k] !== "") {
      throw new Error(
        `[studio-zero] env: '${k}' is forbidden in CLI mode. ` +
          `The CLI uses your local Claude Code install for LLM calls (PRD §8) ` +
          `and never holds a Studio Zero service-role credential (Atlas B2).`,
      );
    }
  }

  const configDir = source.STUDIOZERO_CONFIG_DIR ?? defaultConfigDir();
  const fromFile = readConfigFile(configDir);

  const apiUrl =
    source.STUDIOZERO_API_URL ?? fromFile.apiUrl ?? DEFAULT_API_URL;
  const claudeCodeBin =
    source.CLAUDE_CODE_BIN ?? fromFile.claudeCodeBin ?? DEFAULT_CLAUDE_CODE_BIN;
  const logLevel = (source.LOG_LEVEL ??
    fromFile.logLevel ??
    "info") as CliEnv["logLevel"];
  // Mock reviewers default ON at M3; M3+1 flips by setting the env var.
  const mockReviewers =
    source.STUDIOZERO_MOCK_REVIEWERS === undefined
      ? fromFile.mockReviewers ?? true
      : source.STUDIOZERO_MOCK_REVIEWERS !== "false";

  // Final URL sanity-check.
  try {
    // eslint-disable-next-line no-new
    new URL(apiUrl);
  } catch {
    throw new Error(`[studio-zero] invalid apiUrl: ${apiUrl}`);
  }

  return { apiUrl, configDir, claudeCodeBin, logLevel, mockReviewers };
}

/** Exposed so tests can assert the refuse-list without re-typing it. */
export const _forbiddenKeys: ReadonlyArray<string> = FORBIDDEN_KEYS;
