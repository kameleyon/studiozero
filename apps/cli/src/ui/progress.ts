/**
 * Studio Zero — tty progress rendering for `studio-zero run`.
 *
 * Phase 9 M3 Batch 1 (Forge). Renders one line per reviewer with a
 * percentage + status icon. Cancellable via Ctrl-C — the AbortController
 * is owned by the command handler, this module just paints output.
 *
 * Why no progress-bar library: the CLI needs to be quiet in CI (when
 * `!stdout.isTTY`) and chatty in a terminal. A 50-line manual renderer
 * keeps the install footprint small and avoids the chalk-vs-picocolors
 * version-conflict trap.
 */
import { createColors, type Colorizer } from "./colors.js";

type Phase = "starting" | "running" | "complete";

interface ReviewerState {
  phase: Phase;
  pct: number;
  failed: boolean;
}

export interface ProgressRendererOpts {
  /** Stream to write to. Default process.stderr (so stdout stays clean
   *  for verdict JSON when the user pipes the command). */
  stream?: NodeJS.WriteStream;
  /** Force-disable color (test mode). */
  color?: boolean;
  /** Override TTY check (testing). */
  tty?: boolean;
}

export interface ProgressRenderer {
  start(reviewers: string[]): void;
  update(reviewer: string, phase: Phase, pct: number): void;
  fail(reviewer: string, reason: string): void;
  end(): void;
}

export function createProgressRenderer(
  opts: ProgressRendererOpts = {},
): ProgressRenderer {
  const stream = opts.stream ?? process.stderr;
  const isTty = opts.tty ?? (stream.isTTY === true);
  const colors: Colorizer = createColors({ color: opts.color ?? isTty });
  const state = new Map<string, ReviewerState>();

  const write = (line: string): void => {
    stream.write(line + "\n");
  };

  return {
    start(reviewers: string[]): void {
      for (const r of reviewers) {
        state.set(r, { phase: "starting", pct: 0, failed: false });
      }
      write(colors.bold(`Running ${reviewers.length} reviewers locally…`));
      write(colors.dim("(source code stays on your machine — PRD §13.4)"));
    },
    update(reviewer: string, phase: Phase, pct: number): void {
      const cur = state.get(reviewer) ?? { phase, pct, failed: false };
      cur.phase = phase;
      cur.pct = pct;
      state.set(reviewer, cur);
      const icon =
        phase === "complete" ? colors.pass("OK") :
        phase === "running"  ? colors.info("..") :
                               colors.dim("  ");
      write(`  [${icon}] ${reviewer.padEnd(8)} ${String(pct).padStart(3)}%`);
    },
    fail(reviewer: string, reason: string): void {
      const cur = state.get(reviewer) ?? { phase: "complete" as Phase, pct: 0, failed: true };
      cur.failed = true;
      cur.phase = "complete";
      state.set(reviewer, cur);
      write(
        `  [${colors.fail("XX")}] ${reviewer.padEnd(8)} ${colors.dim(reason)}`,
      );
    },
    end(): void {
      const total = state.size;
      const failed = [...state.values()].filter((s) => s.failed).length;
      write(
        colors.bold(
          `Finished: ${total - failed}/${total} reviewers complete.`,
        ),
      );
    },
  };
}
