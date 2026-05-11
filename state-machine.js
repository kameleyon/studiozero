/**
 * Studio Zero — Project State Machine
 *
 * The single owner of `shared_context/projects/<slug>/state.json`. Every read
 * and write of project state goes through this module so we have one place
 * to enforce the schema and avoid concurrent-write corruption.
 *
 * Used by:
 *   - run-project.js   (orchestrator — drives phase transitions)
 *   - audit-action.js  (verdict-to-action — adds blockers from audit findings)
 *   - sprint agent     (project manager — reads to report progress)
 *
 * Public API:
 *   init({slug, brief, team, audience}) → state    — create new project
 *   read(slug) → state                              — read current state
 *   update(slug, patch) → state                     — shallow merge a patch
 *   transition(slug, newPhase) → state              — move to next phase + log
 *   addBlocker(slug, blocker) → state               — register a blocker
 *   resolveBlocker(slug, blockerId) → state         — clear a blocker
 *   addHistory(slug, entry) → state                 — append to history log
 *   exists(slug) → boolean                          — does the project exist
 *   listProjects() → string[]                       — every project slug
 *
 * Phases (per protocols/shared-context-schema.md):
 *   "1" — Strategy & Design
 *   "2" — Foundation (Data + Backend + Security)
 *   "3" — Interface (Frontend)
 *   "4" — Hardening (Quality + DevOps)
 *   "5" — Intelligence (AI, conditional)
 *   "6" — Launch (Docs + Growth + Operations)
 *   "7" — Audit
 *   "complete" | "halted"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_ROOT = path.join(__dirname, "shared_context", "projects");

const VALID_PHASES = ["1", "2", "3", "4", "5", "6", "7", "complete", "halted"];
const VALID_PHASE_STATUS = ["pending", "running", "complete", "blocked"];

// ---------- Helpers ----------

function projectDir(slug) {
  if (!slug || typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`Invalid project slug: "${slug}". Must be kebab-case alphanumeric.`);
  }
  return path.join(PROJECTS_ROOT, slug);
}

function statePath(slug) {
  return path.join(projectDir(slug), "state.json");
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Atomic write: write to a temp file in the same directory, then rename.
 * On Windows, rename is atomic when source and destination are on the same volume.
 * Prevents partial writes if the process is killed mid-write.
 */
function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmpPath, filePath);
}

function validateState(state) {
  if (!state || typeof state !== "object") throw new Error("state must be an object");
  if (typeof state.slug !== "string") throw new Error("state.slug must be a string");
  if (!VALID_PHASES.includes(state.phase)) {
    throw new Error(`state.phase must be one of ${VALID_PHASES.join(", ")} — got "${state.phase}"`);
  }
  if (!VALID_PHASE_STATUS.includes(state.phase_status)) {
    throw new Error(`state.phase_status must be one of ${VALID_PHASE_STATUS.join(", ")} — got "${state.phase_status}"`);
  }
  if (!Array.isArray(state.blockers)) throw new Error("state.blockers must be an array");
  if (!Array.isArray(state.history)) throw new Error("state.history must be an array");
}

// ---------- Public API ----------

export function exists(slug) {
  return fs.existsSync(statePath(slug));
}

export function init({ slug, brief, team, audience }) {
  if (exists(slug)) {
    throw new Error(`Project "${slug}" already exists. Use read() to inspect or delete it manually first.`);
  }
  const now = nowIso();
  const state = {
    slug,
    brief: brief || "",
    team: team || "",
    phase: "1",
    phase_status: "pending",
    audience: audience || "",
    started: now,
    updated: now,
    blockers: [],
    history: [{ phase: "0", agent: "bigbrain", action: "project initialized", timestamp: now }],
  };
  validateState(state);
  atomicWriteJson(statePath(slug), state);
  return state;
}

export function read(slug) {
  const p = statePath(slug);
  if (!fs.existsSync(p)) {
    throw new Error(`No state.json for project "${slug}" at ${p}`);
  }
  const state = JSON.parse(fs.readFileSync(p, "utf8"));
  validateState(state);
  return state;
}

export function update(slug, patch) {
  const current = read(slug);
  const next = { ...current, ...patch, slug: current.slug, updated: nowIso() };
  validateState(next);
  atomicWriteJson(statePath(slug), next);
  return next;
}

export function transition(slug, newPhase, agent = "orchestrator") {
  if (!VALID_PHASES.includes(newPhase)) {
    throw new Error(`Invalid phase "${newPhase}". Must be one of: ${VALID_PHASES.join(", ")}`);
  }
  const current = read(slug);
  const now = nowIso();
  const historyEntry = {
    phase: current.phase,
    agent,
    action: `transition ${current.phase} → ${newPhase}`,
    timestamp: now,
  };
  const next = {
    ...current,
    phase: newPhase,
    phase_status: newPhase === "complete" || newPhase === "halted" ? "complete" : "pending",
    updated: now,
    history: [...current.history, historyEntry],
  };
  validateState(next);
  atomicWriteJson(statePath(slug), next);
  return next;
}

export function addBlocker(slug, blocker) {
  if (!blocker || !blocker.id || !blocker.reason) {
    throw new Error("Blocker requires at least { id, reason }");
  }
  const current = read(slug);
  const enriched = {
    id: blocker.id,
    phase: blocker.phase || current.phase,
    owner: blocker.owner || "unassigned",
    severity: blocker.severity || "Critical",
    reason: blocker.reason,
    opened: nowIso(),
  };
  // De-duplicate by id
  if (current.blockers.find((b) => b.id === enriched.id)) {
    throw new Error(`Blocker "${enriched.id}" already exists for project "${slug}"`);
  }
  const next = {
    ...current,
    blockers: [...current.blockers, enriched],
    phase_status: "blocked",
    updated: nowIso(),
    history: [
      ...current.history,
      { phase: current.phase, agent: "system", action: `blocker added: ${enriched.id}`, timestamp: nowIso() },
    ],
  };
  validateState(next);
  atomicWriteJson(statePath(slug), next);
  return next;
}

export function resolveBlocker(slug, blockerId) {
  const current = read(slug);
  const blocker = current.blockers.find((b) => b.id === blockerId);
  if (!blocker) {
    throw new Error(`No blocker "${blockerId}" found for project "${slug}"`);
  }
  const remainingBlockers = current.blockers.filter((b) => b.id !== blockerId);
  const next = {
    ...current,
    blockers: remainingBlockers,
    phase_status: remainingBlockers.length === 0 ? "pending" : "blocked",
    updated: nowIso(),
    history: [
      ...current.history,
      { phase: current.phase, agent: "system", action: `blocker resolved: ${blockerId}`, timestamp: nowIso() },
    ],
  };
  validateState(next);
  atomicWriteJson(statePath(slug), next);
  return next;
}

export function addHistory(slug, { agent, action }) {
  const current = read(slug);
  const next = {
    ...current,
    updated: nowIso(),
    history: [
      ...current.history,
      { phase: current.phase, agent: agent || "system", action, timestamp: nowIso() },
    ],
  };
  atomicWriteJson(statePath(slug), next);
  return next;
}

export function listProjects() {
  if (!fs.existsSync(PROJECTS_ROOT)) return [];
  return fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(PROJECTS_ROOT, e.name, "state.json")))
    .map((e) => e.name)
    .sort();
}

// ---------- CLI mode ----------
// Allow direct invocation for inspection: `node state-machine.js list` / `node state-machine.js show <slug>`

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const [, , cmd, slug] = process.argv;
  switch (cmd) {
    case "list":
      console.log(listProjects().join("\n") || "(no projects)");
      break;
    case "show":
      if (!slug) {
        console.error("Usage: node state-machine.js show <slug>");
        process.exit(1);
      }
      console.log(JSON.stringify(read(slug), null, 2));
      break;
    case "init": {
      const brief = process.argv[4] || "";
      const team = process.argv[5] || "";
      const audience = process.argv[6] || "";
      console.log(JSON.stringify(init({ slug, brief, team, audience }), null, 2));
      break;
    }
    default:
      console.error("Usage:");
      console.error("  node state-machine.js list");
      console.error("  node state-machine.js show <slug>");
      console.error("  node state-machine.js init <slug> <brief> <team> <audience>");
      process.exit(1);
  }
}
