#!/usr/bin/env node
/**
 * Extract every finding from the 34 reviewer/specialist files of a 360 audit
 * and emit a structured JSON array. Used to roll up Major/Minor/Polish into
 * the consolidated roadmap.
 *
 * Handles three observed formats:
 *   A. `#### F-D1 [BLOCKER · Schema] summary`  (shield, atlas, ...)
 *   B. `### F-CH-01 — Critical — summary`  (forge)
 *   C. `#### F-A11Y-001 — summary` under parent `### Critical`  (optic, halo)
 *
 * Usage: node scripts/extract-audit-findings.mjs <audit-dir> > findings.json
 */
import fs from "fs";
import path from "path";

const auditDir = process.argv[2];
if (!auditDir) {
  console.error("Usage: extract-audit-findings.mjs <audit-dir>");
  process.exit(2);
}

const AGENT_TO_CATEGORY = {
  optic:     "§1 UI/UX",
  proof:     "§1+§2+§13 (cross-cutting content)",
  halo:      "§1 (a11y)",
  compass:   "§2 (audience alignment)",
  trace:     "§3 (flow & logic)",
  canon:     "§1 (visual consistency)",
  hook:      "§2 Conversion",
  arch:      "§4 Code Health",
  prism:     "§5 Performance",
  edge:      "§5/§8 CDN+caching",
  shield:    "§6 Security",
  cipher:    "§6 Crypto + secrets",
  verify:    "§6/§14 Supply chain",
  atlas:     "§7 Data layer",
  keeper:    "§7/§13 Backups + GDPR",
  stream:    "§7 Realtime + state",
  terra:     "§8 Infrastructure",
  crash:     "§8/§10 Load + scaling",
  meter:     "§8 FinOps",
  watch:     "§9 Observability",
  chronicle: "§9 Logging + audit",
  siren:     "§9/§14 Incident response",
  probe:     "§10 Testing coverage",
  ghost:     "§10 Exploratory edge cases",
  lens:      "§11 Analytics",
  herald:    "§11 Lifecycle copy + email",
  signal:    "§12 SEO",
  tongue:    "§12/§13 Localization + per-region legal",
  comply:    "§13 Legal",
  pipeline:  "§14 CI/CD",
  pixel:     "§1/§11 Brand assets",
  canvas:    "§1 Design system",
  flow:      "§3 Design-time flow",
  forge:     "§4/§5/§7 Backend architecture",
};

const SEVERITY_ORDER = { BLOCKER: 0, CRITICAL: 1, MAJOR: 2, MINOR: 3, POLISH: 4 };
const SEV_RE = /BLOCKER|CRITICAL|MAJOR|MINOR|POLISH/i;

function normalizeSeverity(raw) {
  if (!raw) return null;
  const m = raw.match(SEV_RE);
  return m ? m[0].toUpperCase() : null;
}

/**
 * Detect a finding header on a single line. Returns { id, severity, summary }
 * or null. Severity may be null when the line carries no severity tag (caller
 * supplies inherited severity from the parent section).
 */
function parseHeader(line) {
  // First: strip the heading-level marker OR bold-leading paragraph
  const hMatch = line.match(/^(#{2,4})\s+(.+)$/);
  const boldMatch = line.match(/^\*\*([^*]+)\*\*(.*)$/);
  if (!hMatch && !boldMatch) return null;
  let body;
  if (hMatch) {
    body = hMatch[2].trim();
  } else {
    // Bold paragraph — body is the bold content; tail (after closing **) may carry trailing severity tag
    body = boldMatch[1].trim();
    const tail = boldMatch[2].trim();
    if (tail) {
      // Append tail so trailing-severity regexes can pick it up
      body += " " + tail;
    }
  }

  // Format L: "[ID-or-Severity] Summary" — bracket-prefixed content (pixel, herald)
  let bracketMatch = body.match(/^\[([^\]]+)\]\s+(.+?)\.?\s*$/);
  if (bracketMatch) {
    const inside = bracketMatch[1].trim();
    const sevInside = normalizeSeverity(inside);
    if (sevInside) {
      // It's a severity tag like [CRITICAL]
      return { id: null, severity: sevInside, summary: bracketMatch[2].trim() };
    } else if (/^[\dA-Z]/i.test(inside) && inside.length < 25) {
      // It's likely an ID like [1.B1]
      return { id: inside, severity: null, summary: bracketMatch[2].trim() };
    }
  }

  // Format E: "Severity · summary" — severity-prefix with dot/dash separator (trace, canon, flow)
  // e.g. "### Critical · Editor saveStatus hardcoded"
  // e.g. "### Critical-1. Voice Lab speaker-flag gradients..."
  // e.g. "## Critical · No documented journey map"
  const prefixSev = body.match(/^(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)(?:-?\d+)?\s*[·.\-—]\s*(.+)$/i);
  if (prefixSev) {
    return { id: null, severity: prefixSev[1].toUpperCase(), summary: prefixSev[2].trim() };
  }

  // Strip a trailing severity tag like "**[CRITICAL]**" or "[CRITICAL]" or "— CRITICAL"
  // (compass: "### COMPASS-1.1 — summary **[CRITICAL]**")
  let trailingSev = null;
  const trailA = body.match(/(.+?)\s+\*\*\[(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)\]\*\*\s*$/i);
  if (trailA) { body = trailA[1].trim(); trailingSev = trailA[2].toUpperCase(); }
  const trailB = body.match(/(.+?)\s+\[(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)\]\s*$/i);
  if (!trailingSev && trailB) { body = trailB[1].trim(); trailingSev = trailB[2].toUpperCase(); }
  const trailC = body.match(/(.+?)\s+[—-]+\s+(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)\s*$/i);
  if (!trailingSev && trailC) { body = trailC[1].trim(); trailingSev = trailC[2].toUpperCase(); }
  // Format I: "summary (Severity)" — parenthetical at end (canvas)
  const trailD = body.match(/^(.+?)\s+\((BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)\)\s*$/i);
  if (!trailingSev && trailD) { body = trailD[1].trim(); trailingSev = trailD[2].toUpperCase(); }

  // Format A: "ID [SEVERITY · subcat] summary"
  let m = body.match(/^([A-Z][\w.-]+)\s+\[([A-Za-z·\s,/-]+)\]\s+(.+)$/);
  if (m) {
    const sev = normalizeSeverity(m[2]) || trailingSev;
    return { id: m[1], severity: sev, summary: m[3].trim() };
  }

  // Format B: "ID — Severity — summary"
  m = body.match(/^([A-Z][\w.-]+)\s+[—-]+\s+(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)\s+[—-]+\s+(.+)$/i);
  if (m) {
    return { id: m[1], severity: m[2].toUpperCase(), summary: m[3].trim() };
  }

  // Format F: "ID — `SEVERITY` — summary" (backtick severity, e.g. verify)
  m = body.match(/^([A-Z][\w.-]+)\s+[—-]+\s+`?(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)`?\s+[—-]+\s+(.+)$/i);
  if (m) {
    return { id: m[1], severity: m[2].toUpperCase(), summary: m[3].trim() };
  }

  // Format C: "ID — summary"  (no inline severity; inherit from parent or use trailing)
  m = body.match(/^([A-Z][\w.-]+)\s+[—-]+\s+(.+)$/);
  if (m) {
    return { id: m[1], severity: trailingSev, summary: m[2].trim() };
  }

  // Format G: "ID. summary"  (period separator, e.g. cipher: "B1. ...", canon: "Critical-1. ...")
  m = body.match(/^([A-Z][\w-]*\d+)\.\s+(.+)$/);
  if (m) {
    return { id: m[1], severity: trailingSev, summary: m[2].trim() };
  }

  // Format H: "ID summary" — bare ID with whitespace (last-resort)
  m = body.match(/^([A-Z][A-Z0-9-]{2,}[A-Z0-9])\s+(.{10,})$/);
  if (m && /^[A-Z]+-/.test(m[1])) {
    return { id: m[1], severity: trailingSev, summary: m[2].trim() };
  }

  // Format J: "1.1  summary" or "1.1 summary" — numeric ID (optic)
  m = body.match(/^(\d+\.\d+)\s+(.+)$/);
  if (m) {
    return { id: m[1], severity: trailingSev, summary: m[2].trim() };
  }

  // Format K: "B1 — summary" or "B1. summary" — letter+digit (hook, ghost, siren)
  m = body.match(/^([A-Z]+\d+)[\.\s]+[—-]?\s*(.+)$/);
  if (m) {
    return { id: m[1], severity: trailingSev, summary: m[2].trim() };
  }

  return null;
}

/** Detect a section header that establishes severity context for its children. */
function parseSeveritySection(line) {
  // "### Blocker", "### Critical", "### Major", "### Minor", "### Polish"
  // Also "### Blockers" (plural)
  let m = line.match(/^#{2,4}\s+(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)S?\s*$/i);
  if (m) return m[1].toUpperCase();
  // "### Performance — Blocker" (prism style — short category prefix with severity suffix).
  // Restrict the prefix to letters/whitespace only so finding lines like
  // "#### KEEPER-01 — ... — BLOCKER" don't get mis-classified as section headers.
  m = line.match(/^#{2,4}\s+[A-Za-z][A-Za-z\s]{1,25}[—-]\s+(BLOCKER|CRITICAL|MAJOR|MINOR|POLISH)S?\s*$/i);
  if (m) return m[1].toUpperCase();
  return null;
}

function extractFromFile(filePath, agent) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const findings = [];
  let inheritedSeverity = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parent severity section?
    const sectionSev = parseSeveritySection(line);
    if (sectionSev) {
      inheritedSeverity = sectionSev;
      continue;
    }

    // Reset inherited severity when we hit a non-severity ## or ### that's not an item
    if (/^#{2,3}\s+/.test(line) && !parseHeader(line) && !sectionSev) {
      // Only reset on top-level category re-entry (## or ### that doesn't look like a finding)
      // Be permissive — leave inheritedSeverity until we hit an explicit different severity
    }

    const hdr = parseHeader(line);
    if (!hdr) continue;

    // If header didn't carry severity inline, look ahead up to 5 lines for
    // a "- **Severity:** X" or "- Severity: X" body line (halo, terra, prism).
    let lookaheadSeverity = null;
    if (!hdr.severity) {
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const sevLine = lines[j].match(/^\s*[-*]?\s*\*?\*?Severity\*?\*?\s*:\s*(.+)$/i);
        if (sevLine) {
          lookaheadSeverity = normalizeSeverity(sevLine[1]);
          if (lookaheadSeverity) break;
        }
      }
    }

    const severity = hdr.severity || lookaheadSeverity || inheritedSeverity;
    if (!severity) continue;
    if (!SEVERITY_ORDER.hasOwnProperty(severity)) continue;

    // Pull evidence + fix + effort from following lines (up to 30) until next header
    const detail = { evidence: "", fix: "", effort: "" };
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const l = lines[j];
      if (parseHeader(l)) break;
      if (parseSeveritySection(l)) break;
      const evMatch = l.match(/^\s*[-*]?\s*\*\*\s*Evidence\s*:?\s*\*\*\s*(.*)$/i);
      if (evMatch) detail.evidence = evMatch[1].trim();
      const fxMatch = l.match(/^\s*[-*]?\s*\*\*\s*Fix\s*:?\s*\*\*\s*(.*)$/i);
      if (fxMatch) detail.fix = fxMatch[1].trim();
      const efMatch = l.match(/^\s*[-*]?\s*\*\*\s*Effort\s*:?\s*\*\*\s*(.*)$/i);
      if (efMatch) detail.effort = efMatch[1].trim().replace(/[^A-Z\sLMS]/g, "").trim();
    }

    findings.push({
      agent,
      category: AGENT_TO_CATEGORY[agent] ?? "(uncategorized)",
      id: hdr.id,
      severity,
      summary: hdr.summary,
      evidence: detail.evidence,
      fix: detail.fix,
      effort: detail.effort,
    });
  }
  return findings;
}

function main() {
  const allFindings = [];

  const coreFiles = fs.readdirSync(auditDir)
    .filter((f) => f.endsWith(".md") && !["brief.md", "verdict.md"].includes(f) && !f.startsWith("verdict-"));
  for (const f of coreFiles) {
    const agent = path.basename(f, ".md");
    const findings = extractFromFile(path.join(auditDir, f), agent);
    allFindings.push(...findings);
  }

  const specialistsDir = path.join(auditDir, "specialists");
  if (fs.existsSync(specialistsDir)) {
    for (const f of fs.readdirSync(specialistsDir).filter((f) => f.endsWith(".md"))) {
      const agent = path.basename(f, ".md");
      const findings = extractFromFile(path.join(specialistsDir, f), agent);
      allFindings.push(...findings);
    }
  }

  allFindings.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.agent.localeCompare(b.agent);
  });

  console.log(JSON.stringify(allFindings, null, 2));
}

main();
