import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Studio Zero Model Config (Google Gemini)
// Required env vars (no defaults — script exits if missing):
//   STUDIO_ZERO_GOOGLE_API_KEY   Google AI Studio API key
// Optional env vars:
//   STUDIO_ZERO_MODEL            primary model id (default: gemini-3.1-pro-preview)
//   STUDIO_ZERO_MODEL_FALLBACK   fallback model id (default: gemini-2.5-pro)
// See .env.example at the repo root for setup instructions.
const GOOGLE_API_KEY = process.env.STUDIO_ZERO_GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("[StudioZero] STUDIO_ZERO_GOOGLE_API_KEY is not set.");
  console.error("[StudioZero] Copy .env.example to .env, fill in your key, then re-run with the env loaded.");
  console.error("[StudioZero] Get a key at https://aistudio.google.com/apikey");
  process.exit(1);
}
const MODEL_PRIMARY = process.env.STUDIO_ZERO_MODEL || "gemini-3.1-pro-preview";
const MODEL_FALLBACK = process.env.STUDIO_ZERO_MODEL_FALLBACK || "gemini-2.5-pro";
const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 1. Parse Arguments
const agentName = process.argv[2]?.toLowerCase();
const taskArgs = process.argv.slice(3).join(" ");

if (!agentName || !taskArgs) {
  console.log("Usage: node task.js <agent_name> <task_description>");
  process.exit(1);
}

// 2. Look up the Agent in the Markdown Catalog
let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "catalog.json"), "utf8"));
} catch (e) {
  console.error("Failed to read catalog.json. Did you build the catalog?");
  process.exit(1);
}

const mdPathRelative = catalog[agentName];
if (!mdPathRelative) {
  console.error("Unknown agent:", agentName);
  process.exit(1);
}

const mdPath = path.join(__dirname, mdPathRelative);
if (!fs.existsSync(mdPath)) {
  console.error("Agent markdown file missing at:", mdPath);
  process.exit(1);
}

// 3. Read Agent Persona
const systemPrompt = fs.readFileSync(mdPath, "utf8");

// 3b. Read Capabilities registry
const capabilitiesPath = path.join(__dirname, "CAPABILITIES.md");
let capabilitiesBlock = "";
if (fs.existsSync(capabilitiesPath)) {
  capabilitiesBlock = `\n\nPLATFORM CAPABILITIES (installed tools + supported product types on this host — honor these before proposing alternatives):\n${fs.readFileSync(capabilitiesPath, "utf8")}`;
}

console.log(`[StudioZero] Waking up ${agentName.toUpperCase()} to handle the task...`);

const sharedContextDir = path.join(__dirname, "shared_context");
if (!fs.existsSync(sharedContextDir)) {
  fs.mkdirSync(sharedContextDir);
}

const userMessage = `ENVIRONMENT:\n- Workspace: ${__dirname}\n- Shared Context: ${sharedContextDir} (use this to read/write outputs for other agents)\n- Tools: You have full file system access (read/write/edit/exec).\n\nUSER TASK:\n${taskArgs}`;

// 4. Call Google Gemini API
async function callGemini(modelId) {
  const url = `${GOOGLE_API_BASE}/${modelId}:generateContent?key=${GOOGLE_API_KEY}`;
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt + capabilitiesBlock }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

// 5. Run with fallback
async function run() {
  console.log(`[StudioZero] Using model: ${MODEL_PRIMARY} (Google Gemini)`);
  try {
    const reply = await callGemini(MODEL_PRIMARY);
    process.stdout.write(reply + "\n");
  } catch (err) {
    console.warn(`[StudioZero] Primary model failed (${err.message}), retrying with ${MODEL_FALLBACK}...`);
    try {
      const reply = await callGemini(MODEL_FALLBACK);
      process.stdout.write(reply + "\n");
    } catch (err2) {
      console.error(`[StudioZero] Fallback also failed: ${err2.message}`);
      process.exit(1);
    }
  }
}

run();
