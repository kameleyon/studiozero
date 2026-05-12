#!/usr/bin/env node
/**
 * Studio Zero — CLI entrypoint.
 *
 * Phase 9 M3 Batch 1 (Forge). Dispatches to subcommands via commander.
 * Every command:
 *  - exits 0 on success, non-zero on failure;
 *  - writes user-facing output to stdout;
 *  - writes diagnostics to stderr;
 *  - honors AbortController on SIGINT (Ctrl-C is always safe).
 *
 * The package's bin entry is `dist/index.js`; the shebang above keeps
 * `npm i -g @studiozero/cli` runnable without an explicit `node` prefix
 * on UNIX. On Windows, npm generates a `studio-zero.cmd` shim.
 */
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { statusCommand } from "./commands/status.js";
import { runCommand } from "./commands/run.js";
import { doctorCommand, formatDoctor } from "./commands/doctor.js";
import { versionCommand, formatVersion, CLI_VERSION } from "./commands/version.js";

const program = new Command();
program
  .name("studio-zero")
  .description("Studio Zero — independent audit for AI-built software (CLI mode).")
  .version(CLI_VERSION);

program
  .command("login")
  .description("Pair this device with a Studio Zero web account.")
  .option("--code <code>", "6-character pairing code (skip the prompt)")
  .action(async (opts: { code?: string }) => {
    try {
      const res = await loginCommand({ ...(opts.code !== undefined ? { code: opts.code } : {}) });
      process.stdout.write(res.message + "\n");
      process.exit(res.ok ? 0 : 1);
    } catch (err) {
      process.stderr.write(`login failed: ${(err as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Revoke this device's pairing and remove the local token file.")
  .action(async () => {
    const res = await logoutCommand();
    process.stdout.write(res.message + "\n");
    process.exit(res.ok ? 0 : 1);
  });

program
  .command("status")
  .description("Show the current pairing state, last verdict, and watermark.")
  .action(() => {
    process.stdout.write(statusCommand() + "\n");
    process.exit(0);
  });

program
  .command("run [path]")
  .description("Run an audit on a local folder. Source never leaves your machine.")
  .option("--depth <depth>", "quick | custom | comprehensive", "quick")
  .option(
    "--reviewers <list>",
    "comma-separated reviewer ids (when --depth=custom)",
  )
  .option("--skip-upload", "Run + sign locally without POSTing the verdict (dry run)")
  .action(
    async (
      pathArg: string | undefined,
      opts: {
        depth?: "quick" | "custom" | "comprehensive";
        reviewers?: string;
        skipUpload?: boolean;
      },
    ) => {
      const cmdOpts: Parameters<typeof runCommand>[0] = {};
      if (pathArg !== undefined) cmdOpts.projectPath = pathArg;
      if (opts.depth !== undefined) cmdOpts.depth = opts.depth;
      if (opts.reviewers !== undefined) {
        cmdOpts.reviewers = opts.reviewers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (opts.skipUpload) cmdOpts.skipUpload = true;
      const res = await runCommand(cmdOpts);
      process.stdout.write(res.message + "\n");
      process.exit(res.ok ? 0 : 1);
    },
  );

program
  .command("doctor")
  .description("Diagnose your local setup: pairing, Claude Code, network, perms.")
  .action(async () => {
    const report = await doctorCommand();
    process.stdout.write(formatDoctor(report) + "\n");
    process.exit(report.ok ? 0 : 1);
  });

program
  .command("version")
  .description("Print version + binary hash + Node version.")
  .action(() => {
    process.stdout.write(formatVersion(versionCommand()) + "\n");
    process.exit(0);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`fatal: ${(err as Error).message}\n`);
  process.exit(2);
});
