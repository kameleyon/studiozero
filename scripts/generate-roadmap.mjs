#!/usr/bin/env node
/**
 * Generate the per-finding section of motionmax/360roadmap.md from the
 * extracted findings.json. Outputs an "Appendix — Per-Finding Detail" section
 * grouped by severity → category → agent for easy navigation.
 *
 * Usage: node scripts/generate-roadmap.mjs <findings.json> > out.md
 */
import fs from "fs";

const findingsPath = process.argv[2];
if (!findingsPath) {
  console.error("Usage: generate-roadmap.mjs <findings.json>");
  process.exit(2);
}

const findings = JSON.parse(fs.readFileSync(findingsPath, "utf8"));

const SEVERITY_ORDER = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "POLISH"];
const SEVERITY_LABEL = {
  BLOCKER: "Blockers",
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
  POLISH: "Polish",
};

const CATEGORY_ORDER = [
  "§1 UI/UX", "§1 (a11y)", "§1 (visual consistency)", "§1 Design system", "§1/§11 Brand assets",
  "§2 Conversion", "§2 (audience alignment)",
  "§3 (flow & logic)", "§3 Design-time flow",
  "§4 Code Health", "§4/§5/§7 Backend architecture",
  "§5 Performance", "§5/§8 CDN+caching",
  "§6 Security", "§6 Crypto + secrets", "§6/§14 Supply chain",
  "§7 Data layer", "§7/§13 Backups + GDPR", "§7 Realtime + state",
  "§8 Infrastructure", "§8/§10 Load + scaling", "§8 FinOps",
  "§9 Observability", "§9 Logging + audit", "§9/§14 Incident response",
  "§10 Testing coverage", "§10 Exploratory edge cases",
  "§11 Analytics", "§11 Lifecycle copy + email", "§1+§2+§13 (cross-cutting content)",
  "§12 SEO", "§12/§13 Localization + per-region legal",
  "§13 Legal",
  "§14 CI/CD",
];

function categoryOrderIdx(cat) {
  const idx = CATEGORY_ORDER.indexOf(cat);
  return idx === -1 ? 999 : idx;
}

function sanitizeForCheckbox(text) {
  if (!text) return "";
  return text
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findingLine(f) {
  const sev = f.severity;
  const cat = f.category.replace(/\(.*?\)/g, "").trim();
  const id = f.id || "(unattributed)";
  const summary = sanitizeForCheckbox(f.summary);
  const evidence = sanitizeForCheckbox(f.evidence);
  const fix = sanitizeForCheckbox(f.fix);
  const effort = f.effort || "";

  // Trim very long fields to keep the roadmap readable
  const trim = (s, n) => (s.length > n ? s.slice(0, n - 1).trim() + "…" : s);

  const parts = [
    `- [ ] **[${sev}][${f.agent.toUpperCase()}]** ${id} — ${trim(summary, 280)}`,
  ];
  if (evidence) parts.push(`_Evidence: ${trim(evidence, 280)}_`);
  if (fix) parts.push(`_Fix: ${trim(fix, 280)}_`);
  if (effort) parts.push(`Effort: ${effort}`);
  return parts.join(" — ");
}

// Group by severity → category → agent
const grouped = {};
for (const f of findings) {
  if (!grouped[f.severity]) grouped[f.severity] = {};
  const cat = f.category;
  if (!grouped[f.severity][cat]) grouped[f.severity][cat] = [];
  grouped[f.severity][cat].push(f);
}

let out = [];
out.push("");
out.push("---");
out.push("");
out.push("# Appendix — Per-Finding Detail (auto-extracted from 34 reviewer/specialist files)");
out.push("");
out.push(`**Generator:** \`scripts/extract-audit-findings.mjs\` + \`scripts/generate-roadmap.mjs\` (Studio Zero)`);
out.push(`**Source:** \`shared_context/audits/motionmax-360/2026-05-10/{,/specialists/}*.md\``);
out.push(`**Findings extracted:** ${findings.length} across **all 34 agents** (6 core reviewers + 28 specialists). Parser handles 11 reviewer-output formats; if a future audit adds new formats, extend \`scripts/extract-audit-findings.mjs\`.`);
out.push("");
out.push("Each line below is one finding. Pattern: `[SEVERITY][AGENT] ID — summary — Evidence: ... — Fix: ... — Effort: ...`");
out.push("");
out.push(`Counts by severity: ${SEVERITY_ORDER.map(s => `${s}=${grouped[s] ? Object.values(grouped[s]).reduce((a,b)=>a+b.length,0) : 0}`).join(", ")}`);
out.push("");

for (const sev of SEVERITY_ORDER) {
  if (!grouped[sev]) continue;
  const totalInSev = Object.values(grouped[sev]).reduce((a, b) => a + b.length, 0);
  out.push("");
  out.push(`## ${SEVERITY_LABEL[sev]} (${totalInSev} findings)`);
  out.push("");

  const cats = Object.keys(grouped[sev]).sort((a, b) => categoryOrderIdx(a) - categoryOrderIdx(b));
  for (const cat of cats) {
    const items = grouped[sev][cat];
    out.push(`### ${cat} (${items.length})`);
    out.push("");
    // Sort by agent for stability
    items.sort((a, b) => a.agent.localeCompare(b.agent) || (a.id || "").localeCompare(b.id || ""));
    for (const f of items) {
      out.push(findingLine(f));
    }
    out.push("");
  }
}

out.push("");
out.push("---");
out.push("");
out.push(`**Generated 2026-05-10 from ${findings.length} extracted findings.**`);
out.push("Re-run via:");
out.push("```bash");
out.push("cd /c/Users/Administrator/studio-zero");
out.push("node scripts/extract-audit-findings.mjs shared_context/audits/motionmax-360/2026-05-10 > scripts/findings.json");
out.push("node scripts/generate-roadmap.mjs scripts/findings.json > /tmp/appendix.md");
out.push("```");

console.log(out.join("\n"));
