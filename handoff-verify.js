/**
 * Studio Zero — Handoff Verifier
 *
 * Verifies that all artifacts a phase is supposed to produce actually exist,
 * parse, and have valid frontmatter before the next phase starts.
 *
 * Per-phase contracts come from `protocols/shared-context-schema.md`.
 *
 * Used by:
 *   - run-project.js  (between phase transitions — halts on failure)
 *
 * Public API:
 *   verifyPhase(slug, phase) → {ok, missing, malformed, warnings}
 *   verifyAll(slug) → {ok, perPhase}
 *
 * CLI:
 *   node handoff-verify.js <slug> [phase]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_ROOT = path.join(__dirname, "shared_context", "projects");

// Per-phase artifact requirements. Mirrors the table in protocols/shared-context-schema.md.
// `optional: true` means the artifact may be skipped if not applicable to the project type.
const PHASE_CONTRACTS = {
  "1": {
    name: "Strategy & Design",
    required: [
      { path: "strategy/prd.md", owner: "axiom" },
      { path: "strategy/personas.md", owner: "flow" },
      { path: "strategy/plan.md", owner: "sprint" },
      { path: "design/design-system.md", owner: "canvas" },
      { path: "design/journey-map.md", owner: "flow" },
      { path: "design/brand-guide.md", owner: "pixel" },
    ],
    optional: [
      { path: "strategy/pricing.md", owner: "penny" },
      { path: "strategy/competitor-research.md", owner: "scout" },
      { path: "design/motion-spec.md", owner: "motion" },
    ],
  },
  "2": {
    name: "Foundation",
    required: [
      { path: "data/schema.sql", owner: "atlas" },
      { path: "data/rls-policies.sql", owner: "atlas" },
      { path: "backend/api-contract.md", owner: "nexus" },
      { path: "backend/auth-design.md", owner: "vault" },
      { path: "security/threat-model.md", owner: "shield" },
    ],
    optional: [
      { path: "data/retention-policy.md", owner: "keeper" },
      { path: "backend/integration-list.md", owner: "bridge" },
      { path: "security/sbom.json", owner: "verify" },
      { path: "security/cve-baseline.md", owner: "verify" },
    ],
  },
  "3": {
    name: "Interface",
    required: [
      { path: "frontend/architecture.md", owner: "arch" },
      { path: "frontend/component-inventory.md", owner: "vega" },
      { path: "frontend/perf-budget.md", owner: "prism" },
    ],
    optional: [
      // code/frontend/ is checked as a directory existence below
    ],
  },
  "4": {
    name: "Hardening",
    required: [
      { path: "tests/test-plan.md", owner: "probe" },
      { path: "devops/ci-config.md", owner: "pipeline" },
      { path: "devops/infra-plan.md", owner: "terra" },
      { path: "devops/observability.md", owner: "watch" },
    ],
    optional: [
      { path: "tests/load-baselines.md", owner: "crash" },
      { path: "tests/exploratory-findings.md", owner: "ghost" },
      { path: "devops/runbooks", owner: "siren", isDirectory: true },
    ],
  },
  "5": {
    name: "Intelligence",
    conditional: true, // skipped unless project has AI features
    required: [
      { path: "ai/prompts.md", owner: "cortex" },
      { path: "ai/eval-suite.md", owner: "oracle" },
    ],
    optional: [
      { path: "ai/rag-config.md", owner: "memory" },
    ],
  },
  "6": {
    name: "Launch",
    required: [
      { path: "docs/readme.md", owner: "scribe" },
      { path: "docs/help-articles.md", owner: "guide" },
      { path: "growth/seo-plan.md", owner: "signal" },
      { path: "growth/copy.md", owner: "herald" },
      { path: "operations/compliance-checklist.md", owner: "comply" },
    ],
    optional: [
      { path: "growth/analytics-plan.md", owner: "lens" },
      { path: "growth/ab-tests.md", owner: "hook" },
      { path: "operations/support-macros.md", owner: "echo" },
      { path: "operations/billing-config.md", owner: "ledger" },
      { path: "docs/changelog.md", owner: "scribe" },
    ],
  },
  "7": {
    name: "Audit",
    // Audit artifacts live under shared_context/audits/<slug>/<date>/, not the project dir.
    // verifyPhase("7") only checks that *some* verdict exists; audit-run.js owns the contents.
    required: [],
    optional: [],
    customCheck: "verifyAuditVerdict",
  },
};

// ---------- Helpers ----------

function projectDir(slug) {
  return path.join(PROJECTS_ROOT, slug);
}

function fileExistsAndNonEmpty(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size > 0;
  } catch {
    return false;
  }
}

function dirExistsAndNonEmpty(dirPath) {
  try {
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return false;
    return fs.readdirSync(dirPath).length > 0;
  } catch {
    return false;
  }
}

/**
 * Parse YAML frontmatter from a markdown file. Returns {frontmatter, body} or null
 * if no valid frontmatter block is found.
 */
function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;
  const fmText = match[1];
  // Tiny YAML-ish parser — only handles `key: value` and `key: [a, b, c]` lines.
  // Sufficient for the schema; doesn't try to be a full YAML parser.
  const fm = {};
  for (const line of fmText.split("\n")) {
    const m = line.match(/^([a-z_][a-z0-9_]*)\s*:\s*(.*)$/i);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    }
    fm[m[1]] = value;
  }
  return { frontmatter: fm, body: match[2] };
}

function isValidFrontmatter(fm, expectedOwner) {
  if (!fm) return { ok: false, reason: "no frontmatter block" };
  const required = ["agent", "phase", "produced", "status"];
  for (const k of required) {
    if (!(k in fm)) return { ok: false, reason: `missing frontmatter key "${k}"` };
  }
  if (expectedOwner && fm.agent && fm.agent.toLowerCase() !== expectedOwner.toLowerCase()) {
    return {
      ok: false,
      reason: `agent mismatch — expected "${expectedOwner}", got "${fm.agent}"`,
    };
  }
  return { ok: true };
}

// ---------- Custom checks ----------

function verifyAuditVerdict(slug) {
  // Look under shared_context/audits/<slug>/ for any date dir with a verdict.md
  const auditRoot = path.join(__dirname, "shared_context", "audits", slug);
  if (!fs.existsSync(auditRoot)) {
    return { ok: false, missing: ["audits/<slug>/<date>/verdict.md"], malformed: [], warnings: [] };
  }
  const dateDirs = fs.readdirSync(auditRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse(); // newest first
  if (dateDirs.length === 0) {
    return { ok: false, missing: ["audits/<slug>/<date>/verdict.md"], malformed: [], warnings: [] };
  }
  const latestVerdict = path.join(auditRoot, dateDirs[0], "verdict.md");
  if (!fileExistsAndNonEmpty(latestVerdict)) {
    return { ok: false, missing: [`audits/${slug}/${dateDirs[0]}/verdict.md`], malformed: [], warnings: [] };
  }
  // Confirm verdict is PASS or PASS WITH FIXES (FAIL means audit halts)
  const body = fs.readFileSync(latestVerdict, "utf8");
  const verdictMatch = body.match(/\*\*Result:\*\*\s*`?(PASS WITH FIXES|PASS|FAIL)`?/);
  if (!verdictMatch) {
    return {
      ok: false,
      missing: [],
      malformed: [`${latestVerdict}: cannot parse verdict result`],
      warnings: [],
    };
  }
  const verdict = verdictMatch[1];
  return {
    ok: verdict === "PASS" || verdict === "PASS WITH FIXES",
    missing: [],
    malformed: verdict === "FAIL" ? [`Verdict is FAIL — project cannot proceed without remediation`] : [],
    warnings: verdict === "PASS WITH FIXES" ? [`Verdict is PASS WITH FIXES — confirm Critical/Blocker re-audit before deploy`] : [],
    verdict,
    verdictPath: latestVerdict,
  };
}

const CUSTOM_CHECKS = {
  verifyAuditVerdict,
};

// ---------- Public API ----------

export function verifyPhase(slug, phase) {
  const phaseStr = String(phase);
  const contract = PHASE_CONTRACTS[phaseStr];
  if (!contract) {
    throw new Error(`No contract defined for phase "${phaseStr}"`);
  }

  if (contract.customCheck) {
    return CUSTOM_CHECKS[contract.customCheck](slug);
  }

  const dir = projectDir(slug);
  const missing = [];
  const malformed = [];
  const warnings = [];

  for (const artifact of contract.required) {
    const fullPath = path.join(dir, artifact.path);
    const existsCheck = artifact.isDirectory
      ? dirExistsAndNonEmpty(fullPath)
      : fileExistsAndNonEmpty(fullPath);

    if (!existsCheck) {
      missing.push(`${artifact.path} (owner: ${artifact.owner})`);
      continue;
    }

    // Frontmatter check for .md files only
    if (artifact.path.endsWith(".md")) {
      const fm = parseFrontmatter(fullPath);
      const valid = isValidFrontmatter(fm, artifact.owner);
      if (!valid.ok) {
        malformed.push(`${artifact.path}: ${valid.reason}`);
      }
    }
  }

  for (const artifact of contract.optional) {
    const fullPath = path.join(dir, artifact.path);
    const existsCheck = artifact.isDirectory
      ? dirExistsAndNonEmpty(fullPath)
      : fileExistsAndNonEmpty(fullPath);

    if (!existsCheck) {
      warnings.push(`optional artifact missing: ${artifact.path} (owner: ${artifact.owner})`);
    }
  }

  return {
    ok: missing.length === 0 && malformed.length === 0,
    phase: phaseStr,
    name: contract.name,
    missing,
    malformed,
    warnings,
  };
}

export function verifyAll(slug) {
  const perPhase = {};
  let allOk = true;
  for (const phase of Object.keys(PHASE_CONTRACTS)) {
    const result = verifyPhase(slug, phase);
    perPhase[phase] = result;
    if (!result.ok) allOk = false;
  }
  return { ok: allOk, perPhase };
}

export { PHASE_CONTRACTS };

// ---------- CLI ----------

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const [, , slug, phase] = process.argv;
  if (!slug) {
    console.error("Usage: node handoff-verify.js <slug> [phase]");
    console.error("  Without phase: verifies all phases");
    console.error("  With phase: verifies a single phase (1-7)");
    process.exit(2);
  }

  if (phase) {
    const result = verifyPhase(slug, phase);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } else {
    const result = verifyAll(slug);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
}
