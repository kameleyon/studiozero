/**
 * Studio Zero — interactive prompts.
 *
 * Phase 9 M3 Batch 1 (Forge). Stdin-line reader for the pairing-code
 * prompt in `studio-zero login`. Intentionally minimal — no
 * external dependency — so the CLI install footprint stays tiny.
 *
 * For richer prompts (multi-select, confirm-with-default, etc.) we can
 * swap in `@clack/prompts` later. The M3 surface area is small: one
 * line of user input, one Enter.
 */
import { createInterface } from "node:readline/promises";

export interface PromptOpts {
  /** Input stream (default stdin). Testing injects a Readable. */
  input?: NodeJS.ReadableStream;
  /** Output stream (default stdout). */
  output?: NodeJS.WritableStream;
}

/**
 * Ask the user a question and return the trimmed response. Press Enter
 * to submit. Ctrl-C is the terminating signal — Node's default behavior
 * tears down the readline interface and exits.
 */
export async function ask(
  question: string,
  opts: PromptOpts = {},
): Promise<string> {
  const rl = createInterface({
    input: opts.input ?? process.stdin,
    output: opts.output ?? process.stdout,
  });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

/** Yes/no confirm. Default is "no" — destructive actions require explicit "y". */
export async function confirm(
  question: string,
  opts: PromptOpts = {},
): Promise<boolean> {
  const ans = (await ask(`${question} [y/N]: `, opts)).toLowerCase();
  return ans === "y" || ans === "yes";
}
