// Per-agent-role tool-call allowlist per architecture/llm-gateway.md §5.1.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Cipher (allowlist drift
// is a Verify CI gate), Shield (PI-1 corpus cross-check).
//
// The allowlist is bundled in source — NOT loaded from the DB — so an
// attacker who compromises a tenant row cannot expand it. The Verify
// gate `tools/lint-gateway-allowlist.ts` (M1+1) AST-greps this constant
// and flags any drift outside a reviewed commit.

export type AgentRole =
  | "halo"
  | "optic"
  | "proof"
  | "compass"
  | "trace"
  | "canon"
  | "jury"
  | "forge_autopr"; // V1.5; included for forward-compat (deny-by-default at M1)

export const ALLOWLIST: Record<AgentRole, ReadonlyArray<string>> = {
  halo: ["read_file", "lookup_wcag_sc"],
  optic: ["read_file", "read_design_token", "lookup_heuristic"],
  proof: ["read_file"],
  compass: ["read_file", "lookup_brand_token"],
  trace: ["read_file", "read_state_machine"],
  canon: ["read_file", "lookup_naming_canon"],
  jury: ["read_finding", "read_score_snapshot"],
  forge_autopr: [], // V1.5 not yet shipped; empty until allowlist is reviewed
} as const;

/** The four tools that are NEVER allowed for any role. */
export const FORBIDDEN_TOOLS: ReadonlyArray<string> = [
  "fetch_url",
  "exec",
  "write_file",
  "spawn_process",
] as const;

export function isToolAllowed(role: AgentRole, toolName: string): boolean {
  if (FORBIDDEN_TOOLS.includes(toolName)) return false;
  const allowed = ALLOWLIST[role];
  if (!allowed) return false;
  return allowed.includes(toolName);
}

export function isKnownRole(role: string): role is AgentRole {
  return Object.prototype.hasOwnProperty.call(ALLOWLIST, role);
}
