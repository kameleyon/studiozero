#!/usr/bin/env node
/**
 * Studio Zero — Claude CLI runner
 *
 * Spawns the `claude` CLI (Claude Code) so each agent runs on Jo's existing
 * Claude Max subscription (OAuth via the local `claude` binary). No API key
 * needed and no per-token billing — the same auth Claude Code uses.
 *
 * Usage:
 *   node task-claude.js <agent_name> "<task description>"
 *   node task-claude.js axiom "Define the MVP for an AI-powered note-taking app"
 *
 * Behaviour:
 *   • Loads the agent persona from /agents/<layer>/<name>.md (via catalog.json)
 *   • Appends CAPABILITIES.md so the agent knows the host's tooling
 *   • Writes the combined system prompt to a temp file (avoids Windows arg limits)
 *   • Spawns: claude --print --dangerously-skip-permissions --append-system-prompt-file <file>
 *   • Streams Claude's reply to stdout
 *
 * Env overrides:
 *   STUDIO_ZERO_CLAUDE_BIN  → override the claude binary path (default: "claude")
 *   STUDIO_ZERO_MODEL       → e.g. "sonnet" or "opus" (passed via --model)
 */
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Parse arguments
//    Supports: node task-claude.js <agent> [--project <slug>] "<task>"
const rawArgs = process.argv.slice(2);
let agentName = null;
let projectSlug = null;
const taskParts = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === "--project") {
    projectSlug = rawArgs[++i];
  } else if (!agentName) {
    agentName = a.toLowerCase();
  } else {
    taskParts.push(a);
  }
}
const taskArgs = taskParts.join(" ");

if (!agentName || !taskArgs) {
  console.log('Usage: node task-claude.js <agent_name> [--project <slug>] "<task description>"');
  console.log('  --project <slug>  Auto-inject upstream project artifacts into the system prompt.');
  process.exit(1);
}

// 2. Resolve agent persona file via catalog
const catalogPath = path.join(__dirname, "catalog.json");
let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
} catch {
  console.error("Failed to read catalog.json. Did you build the catalog?");
  process.exit(1);
}

const mdRel = catalog[agentName];
if (!mdRel) {
  console.error(`Unknown agent: ${agentName}`);
  console.error(`Known agents: ${Object.keys(catalog).join(", ")}`);
  process.exit(1);
}
const mdPath = path.join(__dirname, mdRel);
if (!fs.existsSync(mdPath)) {
  console.error(`Agent file missing: ${mdPath}`);
  process.exit(1);
}

// 3. Build the system prompt: persona + capabilities + protocol reminders + project context
const persona = fs.readFileSync(mdPath, "utf8");
const capPath = path.join(__dirname, "CAPABILITIES.md");
const capabilities = fs.existsSync(capPath) ? fs.readFileSync(capPath, "utf8") : "";
const commsPath = path.join(__dirname, "protocols", "communication.md");
const comms = fs.existsSync(commsPath) ? fs.readFileSync(commsPath, "utf8") : "";

// 3b. Project context injection (when --project <slug> is passed)
//     Loads the project's brief.md, state.json, and the upstream artifacts that
//     this agent's phase depends on. Avoids re-reading downstream / sibling work.
let projectContext = "";
if (projectSlug) {
  const projectDir = path.join(__dirname, "shared_context", "projects", projectSlug);
  if (!fs.existsSync(projectDir)) {
    console.error(`[task-claude] --project "${projectSlug}" given but ${projectDir} does not exist.`);
    console.error(`[task-claude] Run state-machine.js init "${projectSlug}" first, or omit --project.`);
    process.exit(1);
  }

  const briefPath = path.join(projectDir, "brief.md");
  const statePath = path.join(projectDir, "state.json");
  const decisionsPath = path.join(projectDir, "decisions.md");

  const sections = [`Project slug: ${projectSlug}`, `Project dir: ${projectDir}`];

  if (fs.existsSync(briefPath)) {
    sections.push(`\n--- brief.md ---\n${fs.readFileSync(briefPath, "utf8")}`);
  }
  if (fs.existsSync(statePath)) {
    sections.push(`\n--- state.json ---\n${fs.readFileSync(statePath, "utf8")}`);
  }
  if (fs.existsSync(decisionsPath)) {
    sections.push(`\n--- decisions.md ---\n${fs.readFileSync(decisionsPath, "utf8")}`);
  }

  // Auto-inject all .md files from each phase's output directory, EXCEPT this agent's own outputs
  // (the agent will write fresh — we don't want to bias it with stale prior versions).
  // Order: strategy → design → data → backend → security → frontend → tests → devops → ai → docs → growth → operations
  const PHASE_DIRS = [
    "strategy", "design", "data", "backend", "security",
    "frontend", "tests", "devops", "ai", "docs", "growth", "operations",
  ];
  for (const phaseDir of PHASE_DIRS) {
    const fullDir = path.join(projectDir, phaseDir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name);
    for (const file of files) {
      const content = fs.readFileSync(path.join(fullDir, file), "utf8");
      sections.push(`\n--- ${phaseDir}/${file} ---\n${content}`);
    }
  }

  projectContext = "\n\n# PROJECT CONTEXT (auto-injected — read carefully, build on it, do not duplicate)\n" + sections.join("\n");
}

const systemPrompt = [
  "# AGENT PERSONA",
  persona,
  capabilities ? "\n\n# PLATFORM CAPABILITIES (honor these before proposing alternatives)\n" + capabilities : "",
  comms ? "\n\n# COMMUNICATION PROTOCOL (use the FROM/TO/RE format when responding to other agents)\n" + comms : "",
  projectContext,
].join("\n");

// 4. Write system prompt to a temp file (CLI arg limits are tight on Windows)
const tmpPrompt = path.join(os.tmpdir(), `studio-zero-${agentName}-${Date.now()}.md`);
fs.writeFileSync(tmpPrompt, systemPrompt, "utf8");

// 5. Build the user message — workspace context + the actual task
const sharedContextDir = path.join(__dirname, "shared_context");
fs.mkdirSync(sharedContextDir, { recursive: true });

const projectLines = projectSlug ? [
  `- Project slug: ${projectSlug}`,
  `- Project dir: ${path.join(__dirname, "shared_context", "projects", projectSlug)}`,
  `- Write your outputs to the project dir per protocols/shared-context-schema.md.`,
  `- Add YAML frontmatter to every .md you create: agent, phase, produced (ISO-8601), status, consumes.`,
] : [];

const userMessage = [
  "ENVIRONMENT:",
  `- Workspace: ${__dirname}`,
  `- Shared Context dir: ${sharedContextDir} (read/write outputs for other agents here)`,
  `- Tools: full file system access (read/write/edit/exec).`,
  ...projectLines,
  "",
  "TASK FROM BIGBRAIN:",
  taskArgs,
].join("\n");

// Metering mode: when STUDIO_ZERO_METER=1 is set (typically by audit-run.js
// or run-project.js), we ask Claude Code for JSON output, parse the usage
// payload, emit a structured meter line to stderr, and re-print the text
// content to stdout (preserving normal UX for the caller).
const METERING = !!process.env.STUDIO_ZERO_METER;

const claudeBin = process.env.STUDIO_ZERO_CLAUDE_BIN || "claude";
const args = [
  "--print",
  "--dangerously-skip-permissions",
  "--append-system-prompt-file", tmpPrompt,
  "--add-dir", __dirname,
];
if (METERING) {
  args.push("--output-format", "json");
}
// Use whatever model Claude Code is configured to use by default (currently
// Opus 4.7). Override with STUDIO_ZERO_MODEL=sonnet/haiku/<full-id> if needed.
if (process.env.STUDIO_ZERO_MODEL) {
  args.push("--model", process.env.STUDIO_ZERO_MODEL);
}
// Auto-downgrade to Sonnet 4.6 when Opus is overloaded (API-side signal).
// Disable with STUDIO_ZERO_NO_FALLBACK=1.
if (!process.env.STUDIO_ZERO_NO_FALLBACK) {
  args.push("--fallback-model", "claude-sonnet-4-6");
}
// NOTE: prompt is fed via stdin, not as a CLI arg — sidesteps quoting issues.
//
// On Windows, `claude` resolves to `claude.cmd` (the npm-bin shim). As of
// Node 18+, spawning .cmd/.bat files requires `shell: true` (security fix for
// CVE-2024-27980). Spawning the .cmd directly with shell:false → EINVAL.
//
// To avoid the DEP0190 deprecation warning ("passing args + shell:true is a
// potential injection vector"), we build the command as a single quoted
// string and pass an empty args array. Args here are entirely studio-controlled
// (no user input) so injection is not a real risk — but we quote them anyway.
function quoteForShell(s) {
  if (process.platform === "win32") {
    // cmd.exe — wrap in double quotes; double quotes inside aren't really
    // escapable in cmd, so this is best-effort. None of our args contain "
    // (paths, model names, file URIs).
    return /[\s&|<>^"]/.test(s) ? `"${s}"` : s;
  }
  // POSIX
  return /[^\w@%+=:,./-]/.test(s) ? `'${s.replace(/'/g, "'\\''")}'` : s;
}

const commandLine = [claudeBin, ...args.map(quoteForShell)].join(" ");

console.error(`[StudioZero] Waking ${agentName.toUpperCase()} via claude-cli...`);

// In metering mode we capture stdout to parse the JSON envelope. Otherwise
// we let claude write directly to our stdout (the existing prose-output UX).
const proc = spawn(commandLine, [], {
  stdio: METERING
    ? ["pipe", "pipe", "inherit"]
    : ["pipe", "inherit", "inherit"],
  shell: true,
  cwd: __dirname,
});

proc.stdin.write(userMessage);
proc.stdin.end();

let meteringStdout = "";
if (METERING) {
  proc.stdout.on("data", (chunk) => { meteringStdout += chunk.toString(); });
}

proc.on("error", (err) => {
  console.error(`[StudioZero] Failed to spawn ${claudeBin}:`, err.message);
  console.error(`[StudioZero] Make sure Claude Code is installed: npm i -g @anthropic-ai/claude-code`);
  cleanup();
  process.exit(1);
});

proc.on("exit", (code) => {
  cleanup();
  if (METERING) {
    try {
      const data = JSON.parse(meteringStdout);
      // Re-emit just the text content to stdout — preserves existing UX
      // when callers parse this script's output.
      process.stdout.write((data.result ?? "") + "\n");
      // Emit a structured meter line to stderr for the orchestrator to scrape.
      const meter = [
        "[StudioZero-meter]",
        `agent=${agentName}`,
        `duration_ms=${data.duration_ms ?? 0}`,
        `duration_api_ms=${data.duration_api_ms ?? 0}`,
        `num_turns=${data.num_turns ?? 0}`,
        `input_tokens=${data.usage?.input_tokens ?? 0}`,
        `output_tokens=${data.usage?.output_tokens ?? 0}`,
        `cache_read_tokens=${data.usage?.cache_read_input_tokens ?? 0}`,
        `cache_create_tokens=${data.usage?.cache_creation_input_tokens ?? 0}`,
        `cost_usd=${data.total_cost_usd ?? 0}`,
        `outcome=${data.is_error ? "error" : "success"}`,
      ].join(" ");
      console.error(meter);
    } catch (err) {
      console.error(`[StudioZero] Failed to parse Claude Code JSON output: ${err.message}`);
      // Still print whatever we got so the caller isn't left empty-handed
      process.stdout.write(meteringStdout);
    }
  }
  process.exit(code ?? 0);
});

function cleanup() {
  try { fs.unlinkSync(tmpPrompt); } catch { /* ignore */ }
}

// Catch SIGINT so we still clean up the temp file
process.on("SIGINT", () => { cleanup(); process.exit(130); });
