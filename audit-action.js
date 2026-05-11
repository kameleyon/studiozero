#!/usr/bin/env node
/**
 * Studio Zero — Verdict-to-Action Pipeline
 *
 * Closes the loop on the audit panel. Reads a Jury verdict, opens tickets in
 * Sprint's queue under shared_context/projects/<slug>/tickets/, registers
 * blockers in state.json for Critical/Blocker findings, and triggers re-audit
 * once those tickets transition to "fixed."
 *
 * Used by:
 *   - run-project.js  (post-audit, when verdict is PASS WITH FIXES or FAIL)
 *   - manually        (after fixing findings, run with --reaudit)
 *
 * Public API:
 *   ingestVerdict(slug, verdictPath) → {opened, blockers}
 *   listTickets(slug) → ticket[]
 *   markFixed(slug, ticketId) → ticket
 *   markVerified(slug, ticketId) → ticket
 *   triggerReaudit(slug) → exit code from audit-run.js
 *
 * CLI:
 *   node audit-action.js ingest <slug> [--verdict <path>]   ingest latest verdict, open tickets
 *   node audit-action.js list <slug>                        list open tickets
 *   node audit-action.js fix <slug> <ticket-id>             mark ticket as fixed (creator action)
 *   node audit-action.js verify <slug> <ticket-id>          mark fixed ticket verified (reviewer action)
 *   node audit-action.js reaudit <slug>                     re-run audit-run.js
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import * as state from "./state-machine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEVERITY_BLOCKER_ON_STATE = new Set(["Blocker", "Critical"]);

// ---------- Helpers ----------

function projectDir(slug) {
  return path.join(__dirname, "shared_context", "projects", slug);
}

function ticketsDir(slug) {
  return path.join(projectDir(slug), "tickets");
}

function nowIso() {
  return new Date().toISOString();
}

function findLatestVerdict(slug) {
  const auditRoot = path.join(__dirname, "shared_context", "audits", slug);
  if (!fs.existsSync(auditRoot)) return null;
  const dateDirs = fs.readdirSync(auditRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();
  for (const d of dateDirs) {
    const v = path.join(auditRoot, d, "verdict.md");
    if (fs.existsSync(v)) return v;
  }
  return null;
}

/**
 * Parse the verdict markdown. Looks for severity-section tables like:
 *   ### Critical
 *   | ID | Reviewer | Finding | Evidence | Owner | Deadline |
 *   |----|----------|---------|----------|-------|----------|
 *   | C-1 | halo | ... | ... | ... | ... |
 *
 * Returns: { verdict: "PASS WITH FIXES" | ..., findings: [...] }
 */
function parseVerdict(verdictPath) {
  const content = fs.readFileSync(verdictPath, "utf8");
  const verdictMatch = content.match(/\*\*Result:\*\*\s*`?(PASS WITH FIXES|PASS|FAIL)`?/);
  const verdict = verdictMatch ? verdictMatch[1] : "UNKNOWN";

  const findings = [];
  const severities = ["Blocker", "Critical", "Major", "Minor", "Polish"];
  for (const sev of severities) {
    // Match the section heading then capture the table beneath until the next heading.
    // Allow optional trailing 's' so "Blockers" / "Criticals" / etc match the verdict template.
    const sectionRegex = new RegExp(`###\\s+${sev}s?\\s*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`, "i");
    const sectionMatch = content.match(sectionRegex);
    if (!sectionMatch) continue;
    const sectionBody = sectionMatch[1];

    // Find table rows: lines beginning with | that aren't header or separator
    const lines = sectionBody.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
    // Skip header (contains "ID" or "---")
    for (const line of lines) {
      if (/^\|\s*-+/.test(line)) continue; // separator
      if (/^\|\s*ID\s*\|/i.test(line)) continue; // header
      if (line.includes("_e.g.,")) continue;     // template example rows
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
      if (cells.length < 4) continue;
      const [id, reviewer, finding, evidence, owner, deadline] = cells;
      if (!id || !finding) continue;
      findings.push({
        id,
        severity: sev,
        reviewer: (reviewer || "unknown").toLowerCase(),
        finding,
        evidence: evidence || "(none cited — should have been rejected)",
        owner: owner || "unassigned",
        deadline: deadline || "",
      });
    }
  }

  return { verdict, findings };
}

function ticketFilename(finding) {
  const safeName = finding.finding
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${finding.severity.toLowerCase()}-${finding.id.toLowerCase()}-${safeName}.md`;
}

function writeTicket(slug, finding, verdictPath) {
  const dir = ticketsDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  const ticketPath = path.join(dir, ticketFilename(finding));
  const body = [
    "---",
    `id: ${finding.id}`,
    `severity: ${finding.severity}`,
    `finding: ${finding.finding.replace(/"/g, "'")}`,
    `evidence: ${finding.evidence.replace(/"/g, "'")}`,
    `reviewer: ${finding.reviewer}`,
    `owner: ${finding.owner}`,
    `deadline: ${finding.deadline}`,
    `status: open`,
    `audit_verdict: ${verdictPath}`,
    `opened: ${nowIso()}`,
    "---",
    "",
    `# ${finding.severity}: ${finding.finding}`,
    "",
    `**Reviewer:** ${finding.reviewer}`,
    `**Owner:** ${finding.owner}`,
    `**Evidence:** ${finding.evidence}`,
    `**Deadline:** ${finding.deadline || "(not set)"}`,
    "",
    "## Required action",
    "",
    `Remediate the finding above. When fixed, the originating reviewer (${finding.reviewer}) re-verifies — do NOT close the ticket yourself.`,
    "",
    "## Lifecycle",
    "",
    "- `open` (ticket created)",
    "- `in_progress` (creator working on the fix)",
    "- `fixed` (creator marks complete via `node audit-action.js fix <slug> <id>`)",
    "- `verified` (originating reviewer " + finding.reviewer + " confirms via `node audit-action.js verify <slug> <id>`)",
    "- `rejected` (reviewer rejects the fix; ticket re-opens)",
  ].join("\n");
  fs.writeFileSync(ticketPath, body, "utf8");
  return ticketPath;
}

function readTicket(ticketPath) {
  const content = fs.readFileSync(ticketPath, "utf8");
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = {};
  for (const line of fmMatch[1].split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { path: ticketPath, ...fm };
}

function updateTicketStatus(ticketPath, newStatus, extraMeta = {}) {
  const content = fs.readFileSync(ticketPath, "utf8");
  let next = content.replace(/^status:\s*\S+$/m, `status: ${newStatus}`);
  for (const [k, v] of Object.entries(extraMeta)) {
    if (new RegExp(`^${k}:\\s*`, "m").test(next)) {
      next = next.replace(new RegExp(`^${k}:\\s*.*$`, "m"), `${k}: ${v}`);
    } else {
      // insert before the closing ---
      next = next.replace(/\n---\n/, `\n${k}: ${v}\n---\n`);
    }
  }
  fs.writeFileSync(ticketPath, next, "utf8");
}

// ---------- Public API ----------

export function ingestVerdict(slug, verdictPath) {
  if (!verdictPath) verdictPath = findLatestVerdict(slug);
  if (!verdictPath) throw new Error(`No verdict found for project "${slug}".`);

  const { verdict, findings } = parseVerdict(verdictPath);
  console.error(`[audit-action] Verdict: ${verdict} — ${findings.length} finding(s) parsed`);

  const opened = [];
  const blockers = [];
  for (const f of findings) {
    const tp = writeTicket(slug, f, verdictPath);
    opened.push({ id: f.id, severity: f.severity, ticket: tp });
    if (SEVERITY_BLOCKER_ON_STATE.has(f.severity) && state.exists(slug)) {
      try {
        state.addBlocker(slug, {
          id: `audit-${f.id}`,
          phase: "7",
          owner: f.owner,
          severity: f.severity,
          reason: `${f.severity} (${f.reviewer}): ${f.finding}`,
        });
        blockers.push(f.id);
      } catch (err) {
        // Blocker may already exist from a prior ingest of the same verdict — ok
        console.error(`[audit-action]   (blocker ${f.id} already registered)`);
      }
    }
  }
  return { verdict, opened, blockers, verdictPath };
}

export function listTickets(slug) {
  const dir = ticketsDir(slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readTicket(path.join(dir, f)))
    .filter(Boolean);
}

export function markFixed(slug, ticketId) {
  const tickets = listTickets(slug);
  const ticket = tickets.find((t) => t.id && t.id.toLowerCase() === ticketId.toLowerCase());
  if (!ticket) throw new Error(`No ticket "${ticketId}" found for project "${slug}".`);
  if (ticket.status === "verified") {
    console.error(`[audit-action] Ticket "${ticketId}" is already verified — no change.`);
    return ticket;
  }
  updateTicketStatus(ticket.path, "fixed", { fixed_at: nowIso() });
  console.error(`[audit-action] Ticket "${ticketId}" marked as fixed. Originating reviewer (${ticket.reviewer}) must verify.`);
  return readTicket(ticket.path);
}

export function markVerified(slug, ticketId) {
  const tickets = listTickets(slug);
  const ticket = tickets.find((t) => t.id && t.id.toLowerCase() === ticketId.toLowerCase());
  if (!ticket) throw new Error(`No ticket "${ticketId}" found for project "${slug}".`);
  if (ticket.status !== "fixed") {
    throw new Error(`Ticket "${ticketId}" is "${ticket.status}", expected "fixed" before verification.`);
  }
  updateTicketStatus(ticket.path, "verified", { verified_at: nowIso() });
  // Resolve the corresponding blocker if it exists
  if (state.exists(slug)) {
    try {
      state.resolveBlocker(slug, `audit-${ticket.id}`);
    } catch {
      // No blocker existed — that's fine for Major/Minor findings
    }
  }
  console.error(`[audit-action] Ticket "${ticketId}" verified by ${ticket.reviewer}. Blocker (if any) resolved.`);
  return readTicket(ticket.path);
}

export async function triggerReaudit(slug) {
  if (!state.exists(slug)) throw new Error(`No state for project "${slug}".`);
  const current = state.read(slug);
  if (current.blockers.length > 0) {
    console.error(`[audit-action] WARNING: ${current.blockers.length} blocker(s) still open. Re-audit may still FAIL.`);
  }
  const projectPath = projectDir(slug);
  console.error(`[audit-action] Triggering re-audit for ${slug}...`);
  return await new Promise((resolve) => {
    const proc = spawn(
      "node",
      ["audit-run.js", slug, current.brief || `Re-audit of ${slug}`, "--project-dir", projectPath],
      { stdio: ["ignore", "inherit", "inherit"], cwd: __dirname }
    );
    proc.on("exit", (code) => resolve(code));
    proc.on("error", () => resolve(-1));
  });
}

// ---------- CLI ----------

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const [, , cmd, slug, arg3] = process.argv;
  if (!cmd || !slug) {
    console.error("Usage:");
    console.error("  node audit-action.js ingest <slug> [--verdict <path>]");
    console.error("  node audit-action.js list <slug>");
    console.error("  node audit-action.js fix <slug> <ticket-id>");
    console.error("  node audit-action.js verify <slug> <ticket-id>");
    console.error("  node audit-action.js reaudit <slug>");
    process.exit(2);
  }

  switch (cmd) {
    case "ingest": {
      const verdictFlag = process.argv.indexOf("--verdict");
      const verdictPath = verdictFlag !== -1 ? process.argv[verdictFlag + 1] : null;
      const result = ingestVerdict(slug, verdictPath);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }
    case "list": {
      const tickets = listTickets(slug);
      if (tickets.length === 0) {
        console.log("(no tickets)");
      } else {
        for (const t of tickets) {
          console.log(`${t.severity.padEnd(8)} ${t.status.padEnd(10)} ${t.id.padEnd(8)} ${t.finding}`);
        }
      }
      process.exit(0);
    }
    case "fix": {
      if (!arg3) { console.error("Usage: node audit-action.js fix <slug> <ticket-id>"); process.exit(2); }
      const t = markFixed(slug, arg3);
      console.log(JSON.stringify(t, null, 2));
      process.exit(0);
    }
    case "verify": {
      if (!arg3) { console.error("Usage: node audit-action.js verify <slug> <ticket-id>"); process.exit(2); }
      const t = markVerified(slug, arg3);
      console.log(JSON.stringify(t, null, 2));
      process.exit(0);
    }
    case "reaudit": {
      const code = await triggerReaudit(slug);
      process.exit(code === 0 ? 0 : 1);
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(2);
  }
}
