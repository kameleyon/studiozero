#!/usr/bin/env node
/**
 * Studio Zero — Project Lifecycle Orchestrator
 *
 * The single entry point for end-to-end project execution. Takes a brief,
 * picks a team roster, walks the seven build phases, and produces a
 * production-ready project under shared_context/projects/<slug>/.
 *
 * Usage:
 *   node run-project.js <slug> "<brief>" [options]
 *
 * Options:
 *   --team <name>            Team roster (saas|ecommerce|mobile|native-ios|gaming|vr|blog|marketing-site)
 *                            Default: saas
 *   --audience "<text>"      Primary persona description. Required by Compass during audit.
 *   --with-ai                Include Phase 5 (Intelligence — Cortex, Memory, Oracle)
 *   --max-parallel <N>       Max agents spawned in parallel within a phase (default 4)
 *   --skip-audit             Run phases 1-6 only, do not call audit-run.js
 *   --dry-run                Print plan without spawning agents
 *
 * Examples:
 *   node run-project.js senior-fintech "Senior-friendly app for tracking medication expenses" \\
 *     --team saas --audience "non-technical adults aged 65+ with limited tech literacy"
 *
 *   node run-project.js mm-blog "Marketing blog for MotionMax" --team blog --skip-audit
 *
 * Exit codes:
 *   0 — project complete with PASS or PASS WITH FIXES verdict (or all phases done if --skip-audit)
 *   1 — halted on Blocker, audit FAIL, or unrecoverable phase failure
 *   2 — invalid arguments / setup error
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import * as state from "./state-machine.js";
import { verifyPhase, PHASE_CONTRACTS } from "./handoff-verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Phase → Agent mapping (defaults; team rosters override per project type) ----------
const DEFAULT_PHASE_AGENTS = {
  "1": { name: "Strategy & Design", agents: ["axiom", "scout", "penny", "sprint", "canvas", "flow", "pixel", "motion"] },
  "2": { name: "Foundation",        agents: ["atlas", "keeper", "vault", "cipher", "verify", "forge", "nexus", "bridge", "queue"] },
  "3": { name: "Interface",          agents: ["arch", "vega", "touch", "prism", "access"] },
  "4": { name: "Hardening",          agents: ["probe", "crash", "ghost", "pipeline", "terra", "watch", "chronicle", "siren", "meter"] },
  "5": { name: "Intelligence",       agents: ["cortex", "memory", "oracle"] },
  "6": { name: "Launch",             agents: ["scribe", "guide", "signal", "lens", "herald", "hook", "echo", "ledger", "comply"] },
};

// ---------- Argument parsing ----------
const rawArgs = process.argv.slice(2);
const opts = {
  team: "saas",
  audience: "",
  withAi: false,
  maxParallel: 4,
  skipAudit: false,
  dryRun: false,
};
const positional = [];
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === "--team") opts.team = rawArgs[++i];
  else if (a === "--audience") opts.audience = rawArgs[++i];
  else if (a === "--with-ai") opts.withAi = true;
  else if (a === "--max-parallel") opts.maxParallel = parseInt(rawArgs[++i], 10);
  else if (a === "--skip-audit") opts.skipAudit = true;
  else if (a === "--dry-run") opts.dryRun = true;
  else positional.push(a);
}

const slug = positional[0];
const brief = positional.slice(1).join(" ");

if (!slug || !brief) {
  console.error('Usage: node run-project.js <slug> "<brief>" [options]');
  console.error("  --team <name>           Team roster (default: saas)");
  console.error('  --audience "<text>"     Primary persona description (recommended)');
  console.error("  --with-ai               Include Phase 5 (Intelligence)");
  console.error("  --max-parallel <N>      Max agents in parallel per phase (default 4)");
  console.error("  --skip-audit            Run phases 1-6 only");
  console.error("  --dry-run               Print plan without spawning agents");
  process.exit(2);
}

// ---------- Setup ----------
const teamRosterPath = path.join(__dirname, "teams", `${opts.team}.md`);
if (!fs.existsSync(teamRosterPath)) {
  console.error(`Team roster not found: ${teamRosterPath}`);
  console.error(`Available rosters: ${fs.readdirSync(path.join(__dirname, "teams")).map((f) => f.replace(".md", "")).join(", ")}`);
  process.exit(2);
}

const projectDir = path.join(__dirname, "shared_context", "projects", slug);
const templateDir = path.join(__dirname, "shared_context", "_template");

function log(msg) { console.error(`[run-project] ${msg}`); }
function logBig(msg) {
  console.error("");
  console.error("════════════════════════════════════════════════");
  console.error(`  ${msg}`);
  console.error("════════════════════════════════════════════════");
}

// ---------- Helpers ----------

function copyDirectoryTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryTree(srcPath, destPath);
    } else if (!entry.name.endsWith(".template") && entry.name !== "README.md") {
      // Skip template scaffolds and the template README
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function spawnAgent(agentName, taskDescription) {
  return new Promise((resolve) => {
    const args = ["task-claude.js", agentName, "--project", slug, taskDescription];
    log(`  → spawning ${agentName.toUpperCase()}`);
    const start = Date.now();
    const proc = spawn("node", args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: __dirname,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c) => { stdout += c.toString(); });
    proc.stderr.on("data", (c) => { stderr += c.toString(); });

    proc.on("exit", (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      log(`  ✓ ${agentName.toUpperCase()} exit=${code} elapsed=${elapsed}s`);
      resolve({ agentName, exitCode: code, stdout, stderr, elapsed });
    });

    proc.on("error", (err) => {
      log(`  ✗ ${agentName.toUpperCase()} spawn error: ${err.message}`);
      resolve({ agentName, exitCode: -1, stdout: "", stderr: err.message, elapsed: 0 });
    });
  });
}

async function runInBatches(items, batchSize, asyncFn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
  }
  return results;
}

function phaseTaskDescription(phase, contract) {
  const requiredList = contract.required.map((r) => `- ${r.path} (owner: ${r.owner})`).join("\n");
  const optionalList = contract.optional.length
    ? contract.optional.map((r) => `- ${r.path} (owner: ${r.owner})`).join("\n")
    : "  (none)";

  return [
    `You are part of project "${slug}" — Phase ${phase}: ${contract.name}.`,
    "",
    "Per protocols/shared-context-schema.md, this phase requires the following artifacts:",
    requiredList,
    "",
    "Optional artifacts for this phase:",
    optionalList,
    "",
    `Identify which of these YOU own (per your agent's "Handoff" section in your persona) and produce them.`,
    `Write each .md to its exact path under: shared_context/projects/${slug}/`,
    "",
    "Every .md you create must start with YAML frontmatter:",
    "```yaml",
    "---",
    `agent: <your codename>`,
    `phase: ${phase}`,
    `produced: <ISO-8601 timestamp>`,
    `status: final`,
    `consumes: [<list of upstream paths you read>]`,
    "---",
    "```",
    "",
    "If your role has no required output for this phase, write a brief one-paragraph status note to:",
    `  shared_context/projects/${slug}/handoffs/<NN>-<your-codename>-status.md`,
    "explaining what you reviewed and why no artifact was needed.",
    "",
    "When done, end your text response with: \"PHASE-COMPLETE: <your-codename>\"",
  ].join("\n");
}

// ---------- Main flow ----------

logBig(`STUDIO ZERO — PROJECT START: ${slug}`);
log(`Team: ${opts.team}`);
log(`Audience: ${opts.audience || "(not specified — Compass will reject the audit)"}`);
log(`Phases: 1-6${opts.withAi ? ", 5 (AI)" : ", 5 SKIPPED (no --with-ai)"}, 7${opts.skipAudit ? " SKIPPED (--skip-audit)" : ""}`);
log(`Max parallel: ${opts.maxParallel}`);

if (opts.dryRun) {
  log("DRY RUN — no agents will be spawned. Plan:");
  for (const [phase, info] of Object.entries(DEFAULT_PHASE_AGENTS)) {
    if (phase === "5" && !opts.withAi) continue;
    log(`  Phase ${phase} (${info.name}): ${info.agents.join(", ")}`);
  }
  if (!opts.skipAudit) log(`  Phase 7 (Audit): jury + 6 reviewers via audit-run.js`);
  process.exit(0);
}

// 1. Initialize project state and copy template
if (state.exists(slug)) {
  log(`Project "${slug}" already exists — resuming from current state.`);
  const current = state.read(slug);
  log(`  Current phase: ${current.phase} (status: ${current.phase_status})`);
  if (current.blockers.length > 0) {
    log(`  ${current.blockers.length} unresolved blocker(s) — refusing to proceed. Resolve via state-machine.js or audit-action.js.`);
    process.exit(1);
  }
} else {
  log(`Initializing new project state.`);
  state.init({ slug, brief, team: opts.team, audience: opts.audience });
  log(`Copying template tree → ${projectDir}`);
  copyDirectoryTree(templateDir, projectDir);

  // Write the initial brief.md from BigBrain's translation (this script acts as BigBrain's hands)
  const briefBody = [
    "---",
    "agent: bigbrain",
    "phase: 0",
    `produced: ${new Date().toISOString()}`,
    "status: final",
    "consumes: []",
    "---",
    "",
    `# Project Brief — ${slug}`,
    "",
    "## What Jo asked for (verbatim)",
    "",
    brief,
    "",
    "## BigBrain's translation",
    "",
    `**Target audience (primary):** ${opts.audience || "(not specified — flag to Compass)"}`,
    `**Core outcome:** ${brief}`,
    `**Team chosen:** ${opts.team} (per teams/${opts.team}.md)`,
    `**Phase 5 (AI):** ${opts.withAi ? "in scope" : "skipped"}`,
    `**Audit gate:** ${opts.skipAudit ? "SKIPPED — for development runs only, never for ship" : "enforced — no completion without PASS or PASS WITH FIXES"}`,
    "",
    "## Open questions",
    "",
    "_(Add any clarifications needed from Jo here. The orchestrator does not pause for these — flag them and proceed.)_",
  ].join("\n");
  fs.writeFileSync(path.join(projectDir, "brief.md"), briefBody, "utf8");
}

// 2. Walk phases
const phasesToRun = ["1", "2", "3", "4"];
if (opts.withAi) phasesToRun.push("5");
phasesToRun.push("6");

let allPhasesPassed = true;

for (const phase of phasesToRun) {
  const current = state.read(slug);
  if (current.phase === "halted" || current.phase === "complete") {
    log(`Project state is "${current.phase}" — stopping.`);
    break;
  }
  // Skip phases already completed in a resumed run
  if (parseInt(current.phase, 10) > parseInt(phase, 10)) {
    log(`Phase ${phase} already complete — skipping.`);
    continue;
  }

  state.update(slug, { phase, phase_status: "running" });
  const info = DEFAULT_PHASE_AGENTS[phase];
  const contract = PHASE_CONTRACTS[phase];

  logBig(`PHASE ${phase} — ${info.name}`);
  log(`Agents: ${info.agents.join(", ")}`);

  const taskDesc = phaseTaskDescription(phase, contract);
  const results = await runInBatches(info.agents, opts.maxParallel, (agent) => spawnAgent(agent, taskDesc));

  const failures = results.filter((r) => r.exitCode !== 0);
  if (failures.length > 0) {
    log(`${failures.length} agent(s) failed in Phase ${phase}:`);
    for (const f of failures) {
      log(`  - ${f.agentName.toUpperCase()}: exit=${f.exitCode}`);
      if (f.stderr) log(`    stderr: ${f.stderr.slice(0, 200)}`);
    }
  }

  // Verify phase contract
  log(`Verifying Phase ${phase} contract...`);
  const verification = verifyPhase(slug, phase);
  if (!verification.ok) {
    log(`Phase ${phase} verification FAILED.`);
    if (verification.missing.length) {
      log(`  Missing required artifacts:`);
      for (const m of verification.missing) log(`    - ${m}`);
    }
    if (verification.malformed.length) {
      log(`  Malformed artifacts:`);
      for (const m of verification.malformed) log(`    - ${m}`);
    }

    state.addBlocker(slug, {
      id: `phase-${phase}-incomplete`,
      phase,
      reason: `Phase ${phase} (${info.name}) did not produce all required artifacts. Missing: ${verification.missing.join("; ")}`,
      severity: "Blocker",
    });
    state.update(slug, { phase_status: "blocked" });
    allPhasesPassed = false;
    log(`HALTED. Resolve the blocker and re-run with the same slug to resume.`);
    process.exit(1);
  }

  log(`Phase ${phase} contract verified ✓`);
  if (verification.warnings.length) {
    log(`  ${verification.warnings.length} warning(s) on optional artifacts (informational, not blocking):`);
    for (const w of verification.warnings.slice(0, 5)) log(`    - ${w}`);
  }

  // Transition to next phase
  const nextPhase = phasesToRun[phasesToRun.indexOf(phase) + 1];
  if (nextPhase) {
    state.transition(slug, nextPhase);
  }
}

// 3. Audit gate (Phase 7)
if (!opts.skipAudit && allPhasesPassed) {
  state.transition(slug, "7", "orchestrator");
  state.update(slug, { phase_status: "running" });
  logBig("PHASE 7 — Audit (running audit-run.js)");

  const auditBrief = `${brief}\n\nTarget audience: ${opts.audience || "(unspecified — escalate to BigBrain)"}`;
  const auditProc = spawn(
    "node",
    ["audit-run.js", slug, auditBrief, "--project-dir", projectDir],
    { stdio: ["ignore", "inherit", "inherit"], cwd: __dirname }
  );

  const auditExit = await new Promise((resolve) => {
    auditProc.on("exit", (code) => resolve(code));
    auditProc.on("error", () => resolve(-1));
  });

  if (auditExit === 0) {
    state.transition(slug, "complete", "orchestrator");
    logBig(`PROJECT COMPLETE: ${slug}`);
    log(`Output:  ${projectDir}`);
    log(`State:   shared_context/projects/${slug}/state.json`);
    log(`Verdict: see shared_context/audits/${slug}/<latest-date>/verdict.md`);
    process.exit(0);
  } else {
    state.update(slug, { phase_status: "blocked" });
    state.addBlocker(slug, {
      id: `audit-fail`,
      phase: "7",
      reason: `Audit returned non-zero exit (${auditExit}). See shared_context/audits/${slug}/ for details. Project requires remediation before re-run.`,
      severity: "Blocker",
    });
    logBig(`PROJECT HALTED — Audit verdict failed`);
    log(`Resolve findings, then run audit-action.js to track remediation, then re-run this command to continue.`);
    process.exit(1);
  }
} else if (allPhasesPassed) {
  state.transition(slug, "complete", "orchestrator");
  logBig(`PROJECT PHASES 1-6 COMPLETE (audit skipped): ${slug}`);
  log(`Output: ${projectDir}`);
  log(`To run audit: node audit-run.js ${slug} "<brief>" --project-dir ${projectDir}`);
  process.exit(0);
}
