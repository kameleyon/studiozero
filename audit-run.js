#!/usr/bin/env node
/**
 * Studio Zero — Audit Panel Runner
 *
 * Orchestrates the Audit layer: spawns Jury to issue reviewer briefs, runs the
 * six reviewers in parallel, then spawns Jury again to synthesize the verdict.
 *
 * Usage:
 *   node audit-run.js <project-slug> "<brief>" [--project-dir <path>] [--mirror-to <path>]
 *
 * Examples:
 *   node audit-run.js motionmax "..." --project-dir /c/Users/.../motionmax --mirror-to /c/Users/.../motionmax/.audits
 *
 * Output:
 *   shared_context/audits/<project-slug>/<YYYY-MM-DD>/
 *     ├── brief.md          (the audit brief seen by every reviewer)
 *     ├── optic.md          (UX/UI heuristic findings)
 *     ├── proof.md          (content & wording findings)
 *     ├── halo.md           (accessibility findings)
 *     ├── compass.md        (audience alignment findings)
 *     ├── trace.md          (flow & logic findings)
 *     ├── canon.md          (visual consistency findings)
 *     └── verdict.md        (Jury's synthesized verdict — uses the template)
 *
 * Per-audit cost metering: appends an event to
 *   shared_context/projects/<slug>/metrics.json
 * with token counts, $/audit, and per-reviewer breakdown. Schema in
 *   shared_context/projects/_metrics-schema.md
 *
 * If --mirror-to <path> is supplied, the audit dir is copied into that path
 * after the run completes (useful for surfacing reports inside the audited
 * project directory).
 *
 * Exit codes:
 *   0  — verdict is PASS or PASS WITH FIXES
 *   1  — verdict is FAIL or audit could not complete
 *   2  — invalid arguments / setup error
 *
 * Env overrides:
 *   STUDIO_ZERO_AUDIT_TIMEOUT_MS  — per-reviewer timeout (default 600000 = 10 min)
 *   STUDIO_ZERO_AUDIT_RUNNER      — "claude" (default) or "gemini" (text-only fallback)
 *   STUDIO_ZERO_NO_METER          — disable cost metering (default: enabled)
 */
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 1. Parse arguments ----------
const args = process.argv.slice(2);
const flags = { projectDir: null, mirrorTo: null, full360: false, maxParallel: 6 };
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--project-dir") {
    flags.projectDir = args[++i];
  } else if (args[i] === "--mirror-to") {
    flags.mirrorTo = args[++i];
  } else if (args[i] === "--full-360") {
    flags.full360 = true;
  } else if (args[i] === "--max-parallel") {
    flags.maxParallel = parseInt(args[++i], 10) || 6;
  } else {
    positional.push(args[i]);
  }
}

const projectSlug = positional[0];
const brief = positional.slice(1).join(" ");

if (!projectSlug || !brief) {
  console.error('Usage: node audit-run.js <project-slug> "<brief>" [--project-dir <path>] [--mirror-to <path>] [--full-360] [--max-parallel <N>]');
  console.error('  --full-360         Engage 28 specialist agents alongside the 6 audit reviewers (35 spawns + Jury synthesis).');
  console.error('                     Covers all 14 categories of a true 360 production-readiness audit per the 360assessment.md');
  console.error('                     template. ~30-50 min wall clock at default --max-parallel 6, ~3-5x the cost of standard audit.');
  console.error('  --max-parallel <N> Max concurrent agent spawns (default 6). Lower if hitting rate limits; raise for speed.');
  process.exit(2);
}

const METERING_ENABLED = !process.env.STUDIO_ZERO_NO_METER;

const REVIEWERS = ["optic", "proof", "halo", "compass", "trace", "canon"];

// Per-reviewer timeouts (ms). Reviewers that scan the entire codebase (Canon, Halo)
// get longer ceilings than reviewers doing focused heuristic evaluation. Override
// via STUDIO_ZERO_AUDIT_TIMEOUT_MS to set a uniform timeout for all reviewers.
const UNIFORM_TIMEOUT = parseInt(process.env.STUDIO_ZERO_AUDIT_TIMEOUT_MS, 10);
const REVIEWER_TIMEOUTS = {
  optic:   UNIFORM_TIMEOUT || 600000,    // 10 min — heuristic eval, bounded by route count
  proof:   UNIFORM_TIMEOUT || 900000,    // 15 min — reads every customer-facing string
  halo:    UNIFORM_TIMEOUT || 1200000,   // 20 min — automated + manual a11y across all routes
  compass: UNIFORM_TIMEOUT || 600000,    // 10 min — focused audience-fit scoring
  trace:   UNIFORM_TIMEOUT || 900000,    // 15 min — walks every primary flow
  canon:   UNIFORM_TIMEOUT || 1200000,   // 20 min — scans every file for token violations
  jury:    UNIFORM_TIMEOUT || 900000,    // 15 min — synthesis reads all reviewer outputs
};

// ---------- Full-360 specialists ----------
// When --full-360 is passed, these specialist agents run alongside the 6 audit
// reviewers, each covering one or more sections of a 360 production-readiness
// audit. Each entry: agent codename → category brief that's added to its
// task description. Mirrors the 14 sections of the 360 assessment template.
const FULL_360_SPECIALISTS = {
  // Section 2 — Visitor → Customer Conversion
  hook:      { categories: ["§2 Conversion Rate Optimization"], focus: "Funnel drop-off, missing psychological triggers (scarcity, social proof, reciprocity, reassurance), pricing-page clarity, time-to-first-value in onboarding, checkout reassurance, A/B opportunities. Read landing/pricing/auth/onboarding flows." },
  // Section 4 — Code Health & Redundancy
  arch:      { categories: ["§4 Code Health (architecture lens)"], focus: "Folder structure, separation of concerns, state management consistency, naming conventions (mixed class vs functional, legacy patterns), business logic that should be centralized, dead code at the architecture level. Run grep for TODO/FIXME/HACK across the codebase." },
  // Section 5 — Performance
  prism:     { categories: ["§5 Performance — Web Vitals + bundle"], focus: "LCP/CLS/INP measurements (or estimates from code), bundle size analysis, oversized deps, code-splitting opportunities, re-renders, memoization gaps, image/video asset handling (WebP/AVIF, lazy loading, CDN), Core Web Vitals as ranking factors. Prioritize landing + dashboard." },
  edge:      { categories: ["§5 + §8 — CDN, caching, asset delivery"], focus: "Cache headers, CDN configuration, image-CDN usage, edge-function placement, regional latency. Flag every asset shipped without proper Cache-Control." },
  // Section 6 — Security & Encryption
  shield:    { categories: ["§6 Security — OWASP Top 10"], focus: "A01 broken access control (every protected route), A02 crypto failures, A03 injection (parameterized queries, output encoding), A05 security misconfiguration (security headers, CORS, default credentials), A07 auth failures (rate limit, lockout, password policy, session expiry). Map findings against checklists/owasp-top-10.md." },
  cipher:    { categories: ["§6 Security — encryption + secrets"], focus: "Hardcoded secrets, client-exposed env vars, secret rotation, data-at-rest encryption (user content, scripts, videos, payment metadata), data-in-transit (HTTPS, HSTS, secure cookies), PII redaction in logs. Run gitleaks/trufflehog patterns mentally; cite file:line." },
  verify:    { categories: ["§6 + §14 — supply chain"], focus: "Dependency vulnerabilities (npm audit + osv-scanner), SBOM completeness, license compliance (GPL/AGPL in proprietary code = blocker), pinned vs floating versions, single-maintainer abandoned deps, typosquat risks, CI action SHA pinning." },
  // Section 7 — Data Integrity & State
  atlas:     { categories: ["§7 Data — schema + RLS + indexes"], focus: "Postgres schema constraints (NOT NULL, CHECK, FK), index coverage on every FK and common WHERE clauses, RLS policy on every user-data table (verify a policy denies cross-tenant reads), N+1 queries, SELECT *, missing query plans, migration safety (forward-only, multi-step destructive)." },
  keeper:    { categories: ["§7 + §13 — backups, retention, GDPR data"], focus: "Backup configuration and frequency (verify it's actually restorable, not just that backups exist), RTO/RPO targets, data retention policy per data type, GDPR data-export endpoint (Article 20), GDPR data-deletion flow (Article 17 with cascade), soft-delete consistency." },
  stream:    { categories: ["§7 — realtime + state consistency"], focus: "Supabase Realtime subscriptions, mid-generation crash recovery (does an in-progress video render survive a worker crash?), client/server state consistency, optimistic update rollback, websocket reconnection logic." },
  // Section 8 — Infrastructure & Scaling
  terra:     { categories: ["§8 Infrastructure — IaC + scaling"], focus: "Dev/staging/prod separation (separate Supabase projects, separate worker instances), worker concurrency limits, autoscaling triggers, storage growth trajectory, regional deployment, IaC completeness. Cross-reference iac/ stubs." },
  crash:     { categories: ["§8 + §10 — load + scaling"], focus: "Worker throughput at expected scale, queue health, concurrency limits, rate-limit budgets per AI provider (OpenRouter, Hypereal, Replicate, ElevenLabs), DB connection pooling under load, the FFmpeg encoding bottleneck." },
  meter:     { categories: ["§8 — cost efficiency"], focus: "$/active-user, $/generated-video, $/audit-call to AI providers. Flag any expensive/redundant process or third-party service; suggest leaner alternative. Identify cost-per-feature and which features are unprofitable at current pricing." },
  // Section 9 — Observability & Incident Readiness
  watch:     { categories: ["§9 Observability — dashboards + alerts"], focus: "Sentry/PostHog wire-up on frontend AND worker AND edge functions, uptime monitoring per primary path, performance metrics, alert thresholds, who gets paged at 3am, status page (does it exist?)." },
  chronicle: { categories: ["§9 — structured logging + audit trail"], focus: "JSON structured logs, no sensitive data leakage (Cipher's redaction patterns), per-request trace IDs, audit log for every admin action and every billing event, log retention." },
  siren:     { categories: ["§9 + §14 — incident response"], focus: "Runbooks per top alert, on-call rotation, postmortem template, status-page protocol, dependency outage response (Stripe down, OpenRouter down, Supabase down), recovery plan. Answer: 'if prod breaks right now, would anyone know within 5 minutes?'" },
  // Section 10 — Testing
  probe:     { categories: ["§10 Testing — coverage + plan"], focus: "Coverage map (current % for unit, integration, E2E), critical gaps (auth, payment, generation pipeline, deletion, refund flows must be covered), proposed test plan in priority order, CI test gating." },
  ghost:     { categories: ["§10 — exploratory edge cases"], focus: "Race conditions (regenerate-while-export, double-submit, mid-flow logout, browser-back during multi-step wizards), state corruption, network failures mid-generation, multi-tab interactions, cache invalidation bugs, retry-storm scenarios." },
  // Section 11 — Analytics, Marketing & Growth
  lens:      { categories: ["§11 Analytics — funnel + events"], focus: "Event instrumentation consistency (single naming convention, single source), funnel definition end-to-end, conversion event firing, UTM/referral tracking, identify on signin, reset on signout, drop-off measurement per step." },
  herald:    { categories: ["§11 — lifecycle copy + email"], focus: "Transactional email (signup, reset, receipts) AND lifecycle (onboarding drip, re-engagement, win-back). Landing copy, in-app announcement copy. Voice consistency. Cross-reference Proof for FTC/UCPD substantiation." },
  // Section 12 — SEO
  signal:    { categories: ["§12 SEO — technical + on-page"], focus: "sitemap.xml, robots.txt, canonical tags, structured data (schema.org Product / Video / Organization / FAQPage), hreflang for EN/FR + 9 other languages MotionMax claims to support, indexability of public pages, noindex on private/admin/auth/editor, programmatic SEO opportunities for content-gen product." },
  tongue:    { categories: ["§12 + §13 — locale quality + per-region legal"], focus: "Per-locale legal-string completeness (GDPR cookie banner, CCPA, ToS), translation quality (native-speaker pass required for ship), UI fit at expanded text widths (German +30%, RTL for Arabic if applicable), date/currency/number formatting per locale, missing legal strings." },
  // Section 13 — Legal & Compliance
  comply:    { categories: ["§13 Legal — GDPR/CCPA/AI"], focus: "ToS, Privacy Policy, Cookie Policy presence and alignment with actual practices. GDPR consent banner, data export endpoint, data deletion flow, DPA listing for processors. AI-specific: training data provenance, user content usage rights, synthetic-media labeling per EU AI Act + FTC AI guidance. Copyright handling for user uploads + AI outputs." },
  // Section 14 — Production Readiness
  pipeline:  { categories: ["§14 Production — CI/CD + release"], focus: "CI workflows running tests + lints + audits, deploy rollback protocol, zero-downtime deploy strategy, env-var management, secrets rotation cadence, security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), DNS/SSL configuration. Cross-reference checklists/release-checklist.md." },
  // Section 1 + Section 11 — UI / Brand cross-cuts
  pixel:     { categories: ["§1 + §11 — brand assets + social cards"], focus: "Brand asset bundle (favicon set, apple-touch-icon, OG image, logo). Verify each is the correct size, format, and content (not a single PNG repeated). OG/Twitter/LinkedIn/Slack share previews actually render correctly. PWA manifest icons (192/512 maskable). Brand-color drift across CSS files." },
  canvas:    { categories: ["§1 — design system cross-cuts"], focus: "Design system completeness (spacing scale, type scale, color tokens, radius scale, motion scale, elevation/shadow tokens). Component pattern reuse vs one-off implementations. System feedback (toast/loading/empty/error/success) — consistent or fragmented? Mobile-first vs desktop-first inconsistency." },
  // Section 3 — Flow design-time cross-reference
  flow:      { categories: ["§3 — design-time journey cross-reference"], focus: "Compare Trace's as-built journey findings against the design-time persona work and journey maps (if present). Where the as-built deviates from the intended flow, identify whether the build is wrong or the spec is. Reconcile." },
  // Section 4 + 5 + 7 — Backend architecture deep dive (worker pipeline)
  forge:     { categories: ["§4 + §5 + §7 — backend architecture, worker pipeline"], focus: "Render.com Node worker design — job lifecycle (queued → running → succeeded/failed/retrying), idempotency, partial-failure recovery, retry-with-backoff, dead-letter handling. AI provider integration: failure handling, fallbacks, rate-limit handling per provider. FFmpeg pipeline: error handling, partial output cleanup, encoding parameter sanity. Supabase Edge Functions wiring." },
};

// Specialists get the same timeout as the most-similar audit reviewer.
const SPECIALIST_DEFAULT_TIMEOUT = UNIFORM_TIMEOUT || 900000; // 15 min

const RUNNER = process.env.STUDIO_ZERO_AUDIT_RUNNER || "claude";
const TASK_SCRIPT = RUNNER === "gemini"
  ? path.join(__dirname, "task.js")
  : path.join(__dirname, "task-claude.js");

// ---------- 2. Set up output directory ----------
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const auditDir = path.join(__dirname, "shared_context", "audits", projectSlug, today);
fs.mkdirSync(auditDir, { recursive: true });

const briefPath = path.join(auditDir, "brief.md");
const verdictPath = path.join(auditDir, "verdict.md");

const projectDirAbsolute = flags.projectDir
  ? path.resolve(flags.projectDir)
  : null;

// ---------- 3. Write the audit brief that all reviewers see ----------
const briefBody = [
  `# Audit Brief — ${projectSlug} — ${today}`,
  "",
  `**Project slug:** \`${projectSlug}\``,
  `**Audit date:** ${today}`,
  projectDirAbsolute
    ? `**Project source dir (read with full file system access):** \`${projectDirAbsolute}\``
    : "**Project source dir:** _not provided — review live URL or provided artifacts only_",
  `**Output dir for findings:** \`${auditDir}\``,
  "",
  "## Brief from BigBrain",
  brief,
  "",
  "## Required reviewer behavior",
  "- Read the relevant artifacts (project source, design specs, brand guide, persona doc, PRD).",
  "- Apply your domain rubric (defined in your agent .md file) audience-relative.",
  "- Every finding requires evidence: screen capture, file:line, contrast measurement, screen-reader recording, or tool output. Findings without evidence will be rejected.",
  "- Write your findings to: `<output dir>/<your-codename-lowercase>.md` (e.g., `optic.md`).",
  "- Severity rubric is fixed: Blocker / Critical / Major / Minor / Polish (see `agents/audit/jury.md`).",
  "- Do NOT edit the project. Auditors flag and recommend; creators remediate.",
].join("\n");

fs.writeFileSync(briefPath, briefBody, "utf8");
console.error(`[audit-run] Brief written to ${briefPath}`);

// ---------- 4. Spawn one reviewer ----------
function spawnReviewer(reviewer) {
  return new Promise((resolve) => {
    const findingPath = path.join(auditDir, `${reviewer}.md`);
    const timeoutMs = REVIEWER_TIMEOUTS[reviewer] ?? 600000;
    const timeoutMin = (timeoutMs / 60000).toFixed(0);
    const task = [
      `You are running an audit. Read the brief at: ${briefPath}`,
      projectDirAbsolute
        ? `The project source is at: ${projectDirAbsolute} — you have full file system access; read whatever you need.`
        : "No project source dir was provided — base your audit on artifacts referenced in the brief.",
      `Write your findings to exactly this path: ${findingPath}`,
      `Use the severity rubric from agents/audit/jury.md.`,
      `Every finding must cite evidence (screen capture path, file:line, measurement, or tool output). Findings without evidence will be rejected.`,
      `Do NOT edit the project itself. You are an auditor — flag and recommend only.`,
      `Time budget: ${timeoutMin} minutes. Prioritize writing the findings file early (even partial) so it's on disk if you run long.`,
      `End your text response with the literal phrase "AUDIT WRITTEN: ${findingPath}" so the orchestrator can verify completion.`,
    ].join("\n\n");

    console.error(`[audit-run] Spawning ${reviewer.toUpperCase()} (timeout: ${timeoutMin}m)...`);
    const start = Date.now();
    const proc = spawn(
      "node",
      [TASK_SCRIPT, reviewer, task],
      {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: __dirname,
        env: METERING_ENABLED
          ? { ...process.env, STUDIO_ZERO_METER: "1" }
          : process.env,
      }
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let meter = null;
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      // Scrape the meter line: "[StudioZero-meter] agent=optic duration_ms=... ..."
      for (const line of text.split("\n")) {
        if (line.startsWith("[StudioZero-meter]")) {
          meter = parseMeterLine(line);
        }
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      console.error(`[audit-run] ${reviewer.toUpperCase()} hit timeout (${timeoutMin}m) — sending SIGTERM`);
      proc.kill("SIGTERM");
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[audit-run] ${reviewer.toUpperCase()} spawn error: ${err.message}`);
      resolve({
        reviewer, exitCode: -1, wrote: false, findingPath, elapsed: 0,
        stdout, stderr, timedOut: false, succeeded: false,
      });
    });

    proc.on("exit", (code) => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const wrote = fs.existsSync(findingPath) && fs.statSync(findingPath).size > 0;
      // Success criterion: findings file exists with non-zero size, regardless of how the
      // process terminated. SIGTERM after a successful write is still success — the
      // reviewer did its job before the deadline.
      const succeeded = wrote;
      const status = succeeded
        ? (timedOut ? "wrote-then-timed-out" : "ok")
        : (timedOut ? "timed-out-no-output" : `failed (exit=${code})`);
      const costStr = meter ? ` cost=$${meter.cost_usd.toFixed(4)}` : "";
      console.error(`[audit-run] ${reviewer.toUpperCase()} ${status} elapsed=${elapsed}s wrote=${wrote}${costStr}`);
      resolve({
        reviewer, exitCode: code, wrote, findingPath, elapsed,
        stdout, stderr, timedOut, succeeded, meter,
      });
    });
  });
}

// ---------- 4b. Spawn one specialist (full-360 mode) ----------
// Specialists use the same machinery as reviewers, but write to a `specialists/`
// subdirectory and get a category-focused task description instead of the
// generic audit prompt.
function spawnSpecialist(agentName, spec) {
  return new Promise((resolve) => {
    const specialistsDir = path.join(auditDir, "specialists");
    fs.mkdirSync(specialistsDir, { recursive: true });
    const findingPath = path.join(specialistsDir, `${agentName}.md`);
    const timeoutMs = SPECIALIST_DEFAULT_TIMEOUT;
    const timeoutMin = (timeoutMs / 60000).toFixed(0);
    const task = [
      `You are running as a domain specialist on a 360 production-readiness audit. Read the brief at: ${briefPath}`,
      projectDirAbsolute
        ? `The project source is at: ${projectDirAbsolute} — you have full file system access.`
        : "No project source dir was provided — base your audit on artifacts referenced in the brief.",
      `**Your category for this audit:** ${spec.categories.join(", ")}`,
      `**Your specific focus:** ${spec.focus}`,
      `Stay within your category. The 6 audit reviewers (Optic / Proof / Halo / Compass / Trace / Canon) handle the cross-cutting domains; you handle depth in your specific category.`,
      `Write your findings to exactly this path: ${findingPath}`,
      `Use the studio severity rubric (Blocker / Critical / Major / Minor / Polish). Apply your domain rubric audience-relative.`,
      `Every finding requires evidence (file:line, contrast measurement, query plan, log snippet, dependency CVE id, etc.). Findings without evidence will be rejected by Jury.`,
      `Time budget: ${timeoutMin} minutes. Write the findings file early (even partial) so it's on disk if you run long.`,
      `Do NOT edit the project. Auditors flag and recommend; creators remediate.`,
      `End your text response with the literal phrase "AUDIT WRITTEN: ${findingPath}" so the orchestrator can verify completion.`,
    ].join("\n\n");

    console.error(`[audit-run] Spawning ${agentName.toUpperCase()} specialist (${spec.categories.join(", ")}, timeout: ${timeoutMin}m)...`);
    const start = Date.now();
    const proc = spawn(
      "node",
      [TASK_SCRIPT, agentName, task],
      {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: __dirname,
        env: METERING_ENABLED
          ? { ...process.env, STUDIO_ZERO_METER: "1" }
          : process.env,
      }
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let meter = null;
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split("\n")) {
        if (line.startsWith("[StudioZero-meter]")) meter = parseMeterLine(line);
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      console.error(`[audit-run] ${agentName.toUpperCase()} specialist hit timeout (${timeoutMin}m) — sending SIGTERM`);
      proc.kill("SIGTERM");
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[audit-run] ${agentName.toUpperCase()} specialist spawn error: ${err.message}`);
      resolve({
        reviewer: agentName, kind: "specialist", exitCode: -1, wrote: false,
        findingPath, elapsed: 0, stdout, stderr, timedOut: false, succeeded: false, meter,
      });
    });

    proc.on("exit", (code) => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const wrote = fs.existsSync(findingPath) && fs.statSync(findingPath).size > 0;
      const succeeded = wrote;
      const status = succeeded
        ? (timedOut ? "wrote-then-timed-out" : "ok")
        : (timedOut ? "timed-out-no-output" : `failed (exit=${code})`);
      const costStr = meter ? ` cost=$${meter.cost_usd.toFixed(4)}` : "";
      console.error(`[audit-run] ${agentName.toUpperCase()} specialist ${status} elapsed=${elapsed}s wrote=${wrote}${costStr}`);
      resolve({
        reviewer: agentName, kind: "specialist", exitCode: code, wrote,
        findingPath, elapsed, stdout, stderr, timedOut, succeeded, meter,
      });
    });
  });
}

// Run an array of (item, asyncFn) pairs in batches of `maxParallel`.
async function runInBatches(items, asyncFn, maxParallel) {
  const results = [];
  for (let i = 0; i < items.length; i += maxParallel) {
    const batch = items.slice(i, i + maxParallel);
    console.error(`[audit-run] --- Batch ${Math.floor(i / maxParallel) + 1} (${batch.length} agents in parallel) ---`);
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
  }
  return results;
}

// Parse a "[StudioZero-meter]" line into a structured object.
function parseMeterLine(line) {
  const m = {
    agent: null,
    duration_ms: 0,
    duration_api_ms: 0,
    num_turns: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
    cost_usd: 0,
    outcome: "unknown",
  };
  const re = /(\w+)=(\S+)/g;
  let match;
  while ((match = re.exec(line)) !== null) {
    const [, key, value] = match;
    if (key in m) {
      m[key] = ["agent", "outcome"].includes(key) ? value : Number(value);
    }
  }
  return m;
}

// Write the per-audit event into the project's metrics.json (append-only).
function appendMetricsEvent(event) {
  const projectDir = path.join(__dirname, "shared_context", "projects", projectSlug);
  const metricsPath = path.join(projectDir, "metrics.json");
  fs.mkdirSync(projectDir, { recursive: true });

  let metrics = { project_slug: projectSlug, events: [] };
  if (fs.existsSync(metricsPath)) {
    try {
      metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
      if (!Array.isArray(metrics.events)) metrics.events = [];
    } catch (err) {
      console.error(`[audit-run] WARNING: existing metrics.json unreadable (${err.message}) — backing up and starting fresh`);
      fs.renameSync(metricsPath, `${metricsPath}.corrupt-${Date.now()}.bak`);
      metrics = { project_slug: projectSlug, events: [] };
    }
  }
  metrics.events.push(event);
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2) + "\n", "utf8");
  return metricsPath;
}

// ---------- 5. Run reviewers (and specialists if --full-360) in batches ----------
console.error(`[audit-run] Dispatching audit panel: ${REVIEWERS.join(", ")}`);
console.error(`[audit-run] Max parallel: ${flags.maxParallel}`);
const results = await runInBatches(REVIEWERS, spawnReviewer, flags.maxParallel);

let specialistResults = [];
if (flags.full360) {
  const specialistNames = Object.keys(FULL_360_SPECIALISTS);
  console.error("");
  console.error(`[audit-run] FULL-360 MODE: dispatching ${specialistNames.length} specialists across the 14 categories of the 360 audit`);
  console.error(`[audit-run] Specialists: ${specialistNames.join(", ")}`);
  specialistResults = await runInBatches(
    specialistNames,
    (name) => spawnSpecialist(name, FULL_360_SPECIALISTS[name]),
    flags.maxParallel,
  );
}

const allResults = [...results, ...specialistResults];

// Success = file was written, regardless of how the process terminated.
// SIGTERM-after-successful-write is still success.
const completed = allResults.filter((r) => r.succeeded);
const failed = allResults.filter((r) => !r.succeeded);
const reviewerCompleted = results.filter((r) => r.succeeded);

console.error("");
console.error(`[audit-run] Panel complete: ${reviewerCompleted.length}/${REVIEWERS.length} core reviewers wrote findings`);
if (flags.full360) {
  const specialistCompleted = specialistResults.filter((r) => r.succeeded);
  console.error(`[audit-run] Specialists:    ${specialistCompleted.length}/${specialistResults.length} specialists wrote findings`);
}
const wroteThenTimedOut = completed.filter((r) => r.timedOut);
if (wroteThenTimedOut.length) {
  console.error(`[audit-run] (${wroteThenTimedOut.map((r) => r.reviewer.toUpperCase()).join(", ")} wrote findings then exceeded the time budget — output is preserved and folded into the verdict)`);
}
if (failed.length) {
  console.error(`[audit-run] Agents without output:`);
  for (const f of failed) {
    const reason = f.timedOut ? "timed out before writing" : `failed (exit=${f.exitCode})`;
    console.error(`  - ${f.reviewer.toUpperCase()}: ${reason}`);
    if (f.stderr && !f.timedOut) console.error(`    stderr: ${f.stderr.slice(0, 300)}`);
  }
}

// Audit cannot be synthesized without at least 4 core reviewers.
if (reviewerCompleted.length < 4) {
  console.error(`[audit-run] FATAL: only ${reviewerCompleted.length} core reviewers produced findings. Need at least 4 for a valid panel.`);
  process.exit(1);
}

// ---------- 6. Synthesize verdict via Jury ----------
console.error(`[audit-run] Spawning JURY for synthesis...`);
const reviewerFindingsList = results.filter((r) => r.succeeded).map((r) => `- ${r.reviewer.toUpperCase()} (core reviewer): ${r.findingPath}`).join("\n");
const specialistFindingsList = specialistResults.filter((r) => r.succeeded).map((r) => `- ${r.reviewer.toUpperCase()} (specialist — ${FULL_360_SPECIALISTS[r.reviewer]?.categories?.join(", ") ?? "specialist"}): ${r.findingPath}`).join("\n");
const failedList = failed.map((r) => `- ${r.reviewer.toUpperCase()} (DID NOT COMPLETE)`).join("\n");

const jurySynthesisTask = [
  `You are synthesizing the audit verdict. The brief is at: ${briefPath}`,
  `Core reviewer findings (cross-cutting domains — read each one and incorporate):\n${reviewerFindingsList}`,
  flags.full360 && specialistFindingsList ? `\nSpecialist findings (deep coverage per 360 category — read each one and incorporate):\n${specialistFindingsList}` : "",
  failed.length ? `\nAgents that did not complete (note in the verdict):\n${failedList}` : "",
  `Use the template at: ${path.join(__dirname, "shared_context", "audits", "_template.md")}`,
  flags.full360 ? `This is a FULL-360 audit covering all 14 categories from the 360assessment.md template. Group findings by category in the verdict's Punch List section. Convergence between core reviewer + specialist on the same artifact elevates risk (do NOT dedupe down).` : "",
  `Write the synthesized verdict to exactly this path: ${verdictPath}`,
  `Verdict values are exactly one of: PASS / PASS WITH FIXES / FAIL.`,
  `Apply the severity rubric. Resolve cross-reviewer conflicts using the audience rubric.`,
  `End your text response with the literal phrase "VERDICT WRITTEN: <verdict-value>" (e.g., "VERDICT WRITTEN: PASS WITH FIXES") so the orchestrator can detect the result.`,
].filter(Boolean).join("\n\n");

const juryResult = await new Promise((resolve, reject) => {
  const proc = spawn(
    "node",
    [TASK_SCRIPT, "jury", jurySynthesisTask],
    {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: __dirname,
      env: METERING_ENABLED
        ? { ...process.env, STUDIO_ZERO_METER: "1" }
        : process.env,
    }
  );
  let stdout = "";
  let stderr = "";
  let juryMeter = null;
  proc.stdout.on("data", (c) => { stdout += c.toString(); });
  proc.stderr.on("data", (c) => {
    const text = c.toString();
    stderr += text;
    for (const line of text.split("\n")) {
      if (line.startsWith("[StudioZero-meter]")) juryMeter = parseMeterLine(line);
    }
  });
  const timer = setTimeout(() => {
    console.error(`[audit-run] Jury synthesis hit timeout (${(REVIEWER_TIMEOUTS.jury / 60000).toFixed(0)}m) — sending SIGTERM`);
    proc.kill("SIGTERM");
  }, REVIEWER_TIMEOUTS.jury);
  proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  proc.on("exit", (code) => {
    clearTimeout(timer);
    resolve({ exitCode: code, stdout, stderr, meter: juryMeter });
  });
});

// ---------- 7. Detect verdict from Jury's output ----------
let verdict = "UNKNOWN";
const verdictMatch = juryResult.stdout.match(/VERDICT WRITTEN:\s*(PASS WITH FIXES|PASS|FAIL)/);
if (verdictMatch) {
  verdict = verdictMatch[1];
} else if (fs.existsSync(verdictPath)) {
  // Fall back to grepping the verdict file itself
  const verdictBody = fs.readFileSync(verdictPath, "utf8");
  const m = verdictBody.match(/\*\*Result:\*\*\s*`?(PASS WITH FIXES|PASS|FAIL)`?/);
  if (m) verdict = m[1];
}

// ---------- 8. Cost roll-up + metrics persistence ----------
const reviewerMeters = results.filter((r) => r.meter).map((r) => r.meter);
const juryMeter = juryResult.meter;
const allMeters = [...reviewerMeters, ...(juryMeter ? [juryMeter] : [])];
const totalCost = allMeters.reduce((sum, m) => sum + (m.cost_usd || 0), 0);
const totalInputTokens = allMeters.reduce((sum, m) => sum + (m.input_tokens || 0), 0);
const totalOutputTokens = allMeters.reduce((sum, m) => sum + (m.output_tokens || 0), 0);
const totalCacheReadTokens = allMeters.reduce((sum, m) => sum + (m.cache_read_tokens || 0), 0);

let metricsPath = null;
if (METERING_ENABLED && allMeters.length > 0) {
  const event = {
    event_id: `audit-${projectSlug}-${today}-${Date.now()}`,
    event_type: "audit_run",
    timestamp: new Date().toISOString(),
    duration_seconds: Math.round((Date.now() - new Date(`${today}T00:00:00Z`).getTime()) / 1000) % 86400, // approx
    outcome: verdict === "FAIL" ? "failed" : (failed.length > 0 ? "partial" : "success"),
    artifacts_written: [verdictPath, ...completed.map((r) => r.findingPath)],
    context: {
      verdict,
      reviewers_succeeded: completed.length,
      reviewers_failed: failed.length,
      project_dir: projectDirAbsolute,
      per_reviewer: results.map((r) => ({
        reviewer: r.reviewer,
        outcome: r.succeeded ? (r.timedOut ? "wrote-then-timed-out" : "success") : (r.timedOut ? "timeout" : "failed"),
        duration_seconds: Number(r.elapsed),
        tokens_in: r.meter?.input_tokens ?? null,
        tokens_out: r.meter?.output_tokens ?? null,
        cache_read_tokens: r.meter?.cache_read_tokens ?? null,
        cost_usd: r.meter?.cost_usd ?? null,
      })),
      jury: juryMeter ? {
        outcome: "success",
        duration_seconds: Math.round((juryMeter.duration_ms || 0) / 1000),
        tokens_in: juryMeter.input_tokens,
        tokens_out: juryMeter.output_tokens,
        cache_read_tokens: juryMeter.cache_read_tokens,
        cost_usd: juryMeter.cost_usd,
      } : null,
      total_tokens_in: totalInputTokens,
      total_tokens_out: totalOutputTokens,
      total_cache_read_tokens: totalCacheReadTokens,
      total_cost_usd: totalCost,
    },
  };
  metricsPath = appendMetricsEvent(event);
}

// ---------- 9. Mirror to project dir if requested ----------
let mirrorPath = null;
if (flags.mirrorTo) {
  const mirrorDest = path.resolve(flags.mirrorTo, today);
  fs.mkdirSync(mirrorDest, { recursive: true });
  // 2026-05-10 fix: use cpSync with recursive: true to handle the
  // specialists/ subdirectory that --full-360 creates. Previous version
  // used copyFileSync which throws EPERM on directory entries.
  fs.cpSync(auditDir, mirrorDest, { recursive: true, force: true });
  mirrorPath = mirrorDest;
}

// ---------- 10. Final report ----------
console.error("");
console.error("════════════════════════════════════════════════");
console.error(`  STUDIO ZERO — AUDIT COMPLETE`);
console.error(`  Project:  ${projectSlug}`);
console.error(`  Date:     ${today}`);
console.error(`  Verdict:  ${verdict}`);
console.error(`  Output:   ${auditDir}`);
if (METERING_ENABLED && allMeters.length > 0) {
  console.error(`  Cost:     $${totalCost.toFixed(4)} (${totalInputTokens.toLocaleString()} in, ${totalOutputTokens.toLocaleString()} out, ${totalCacheReadTokens.toLocaleString()} cache-read)`);
  console.error(`  Metrics:  ${metricsPath}`);
}
if (mirrorPath) {
  console.error(`  Mirrored: ${mirrorPath}`);
}
console.error("════════════════════════════════════════════════");

// Print the verdict path for downstream tooling (e.g., audit-action.js)
process.stdout.write(verdictPath + "\n");

// Exit code reflects verdict
if (verdict === "FAIL") process.exit(1);
if (verdict === "UNKNOWN") process.exit(1);
process.exit(0);
