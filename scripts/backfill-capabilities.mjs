#!/usr/bin/env node
/**
 * One-shot backfill: append a "Platform Awareness" section to every agent .md
 * that does not yet mention CAPABILITIES.md.
 *
 * Idempotent — safe to re-run.
 *
 * Usage: node scripts/backfill-capabilities.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.join(__dirname, "..", "agents");

const APPEND_BLOCK = `

## Platform Awareness
Always consult \`CAPABILITIES.md\` before recommending tools, frameworks, or services — that registry is the source of truth for what is installed and supported on the Studio Zero host. Do not propose dependencies not listed there without escalating to BigBrain. \`task-claude.js\` auto-injects the registry into every spawn.
`;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const files = walk(agentsDir);
let updated = 0;
let skipped = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("CAPABILITIES")) {
    skipped++;
    continue;
  }
  // Strip any trailing whitespace then append the block (trailing newline preserved)
  const next = content.replace(/\s+$/, "") + APPEND_BLOCK;
  fs.writeFileSync(file, next, "utf8");
  updated++;
  console.log(`  appended → ${path.relative(path.join(__dirname, ".."), file)}`);
}

console.log("");
console.log(`Backfill complete: ${updated} files updated, ${skipped} files already had a CAPABILITIES reference.`);
