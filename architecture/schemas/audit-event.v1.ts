/**
 * Studio Zero — AuditEvent v1 (discriminated union)
 *
 * Owner: Atlas (data) + Verify (contract gate)
 * PRD: §13.3 Runner contract (AuditEvent enum), §9.4 (final_verdict payload),
 *      §7.2 Step C (live progress stream rendering), §14.6 HC2 (aria-live policy).
 * State machine: ia/user-flows/audit-run-state-machine.md
 *
 * Emitted by `runner.runAudit(): AsyncIterable<AuditEvent>` and persisted to
 * `runs.events_log` JSONB array so late subscribers can replay (state-machine EC-2).
 * Web app + CLI both consume this contract identically. Any structural change is
 * a new version file (audit-event.v2.ts) — never an in-place edit.
 *
 * Throttle policy: producer SHOULD coalesce `progress` events to ≤ 4 updates/sec
 * per agent (Halo HC2 — SC 2.2.1 prevents AT overwhelm in aria-live regions).
 *
 * Type-level invariants worth knowing:
 *   - `kind` is the discriminator. Narrow on `kind`, not on field presence.
 *   - `final_verdict.result` is the audit-output.v1.schema.json shape, *validated*
 *     at the runner boundary by ajv before emission (Verify §18.1 Contract layer).
 *   - `error.recoverable` drives the runs.state transition target
 *     (true → failed_recoverable, false → failed_terminal).
 */

// ---------- shared primitives ----------

/** ULID — 26 chars, Crockford base32. Stable ordering = ksuid-compatible. */
export type Ulid = string;

/** ReviewerId — every audit-layer agent that can emit findings. Mirrors
 *  audit-output.v1.schema.json `finding.reviewer` enum.                  */
export type ReviewerId =
  | 'jury'
  | 'optic'
  | 'proof'
  | 'halo'
  | 'compass'
  | 'trace'
  | 'canon';

/** Audit run phase chip per Optic v0.4 verdict-card live region.
 *  Mirrors the per-reviewer substates in audit-run-state-machine.md.   */
export type AuditPhase =
  | 'starting'
  | 'collecting'
  | 'reasoning'
  | 'writing'
  | 'retrying'
  | 'complete'
  | 'failed';

/** Log levels for agent_log events. `error` does NOT terminate the run — see
 *  `error` event variant for run-terminating signals.                       */
export type AgentLogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Finding shape — kept structurally identical to audit-output.v1.schema.json
 *  `$defs/finding`. Persisted to the `findings` table as a row, and to
 *  audit-output.v1's `findings[]` array verbatim at synthesis. The runtime ajv
 *  validator is the source of truth; this TS type is the dev-time helper.    */
export interface Finding {
  id: string;            // /^F-[0-9]{3,}$/
  reviewer: ReviewerId;
  severity: 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Polish';
  layer:
    | 'frontend' | 'backend' | 'data' | 'infra' | 'security'
    | 'design' | 'copy' | 'brand' | 'flow' | 'audience'
    | 'accessibility' | 'compliance';
  summary: string;
  evidence: Evidence;
  recommendation: string;
  estimated_effort: 'S' | 'M' | 'L';
  wcag_sc?: string[];
  ai_disclosure?: {
    generated_by: 'studio-zero/runner';
    model_class: string;
  };
}

/** Evidence — discriminated on `type`. Mirrors audit-output.v1.schema.json
 *  `$defs/evidence` oneOf. Screenshot REQUIRES alt (Halo HC4 / SC 1.1.1).   */
export type Evidence =
  | { type: 'file'; path: string; line_start?: number; line_end?: number; snippet?: string }
  | { type: 'url'; url: string; viewport_w?: number; viewport_h?: number; captured_at?: string }
  | { type: 'screenshot'; storage_path: string; alt: string; viewport_w?: number; viewport_h?: number; wcag_sc?: string[] }
  | { type: 'transcript'; transcript: string; source?: 'nvda' | 'voiceover' | 'talkback' | 'jaws' | 'axe-core' | 'custom'; captured_at?: string };

/** AuditOutput — terminal payload of `final_verdict`. Conforms to
 *  audit-output.v1.schema.json. Kept structurally minimal here; ajv against
 *  the JSON Schema is the source of truth at the runner boundary.           */
export interface AuditOutput {
  verdict: 'PASS' | 'PASS WITH FIXES' | 'FAIL';
  score: number;                          // 0..100 integer post round-half-even
  score_engine_version: string;           // /^v[0-9]+$/
  audience: string;
  watermark: 'private-run-self-audited' | null;
  findings: Finding[];
  score_breakdown: {
    ux: number;
    accessibility: number;
    copy: number;
    brand: number;
    flow: number;
    audience: number;
  };
  partial?: boolean;
  run_id?: Ulid;
  generated_at?: string;
  score_engine_provenance?: { sha256: string };
}

// ---------- variants ----------

/** Live progress tick. UI updates the per-agent row's progress bar + phase chip.
 *  Producer SHOULD throttle to ≤ 4/sec/agent (Halo HC2).                       */
export interface ProgressEvent {
  kind: 'progress';
  agent: ReviewerId;
  phase: AuditPhase;
  /** 0..100 inclusive. Monotonic per (agent,phase) tuple. */
  pct: number;
  /** RFC 3339. Producer-side timestamp; ordering uses runs.events_log seq. */
  at?: string;
}

/** A finding has been emitted by a reviewer. UI appends a row to FindingsList
 *  and increments the verdict-card partial-finding count. Persisted to the
 *  `findings` table as it arrives — Jury synthesis composes the final
 *  AuditOutput from these rows.                                                */
export interface FindingEvent {
  kind: 'finding';
  finding: Finding;
  at?: string;
}

/** Free-form agent log. Persisted to runs.events_log but NOT to the public
 *  audit output. Cipher/Shield: `before_persist` PII scrub on `message`
 *  (PRD §13.6).                                                                */
export interface AgentLogEvent {
  kind: 'agent_log';
  agent: ReviewerId;
  level: AgentLogLevel;
  message: string;
  /** Optional structured fields; serialized as JSONB. Same scrub rule. */
  context?: Record<string, unknown>;
  at?: string;
}

/** Jury has synthesized the terminal verdict. UI transitions to
 *  /run/<run-id> verdict-card. Payload validated against
 *  audit-output.v1.schema.json by ajv before this event is emitted; the runner
 *  MUST refuse to emit a final_verdict whose payload fails schema validation
 *  (instead it emits `error` with code='schema_invalid' — see EC at
 *  audit-run-state-machine.md jury_synthesizing state).                       */
export interface FinalVerdictEvent {
  kind: 'final_verdict';
  result: AuditOutput;
  at?: string;
}

/** Error signal. `recoverable` drives the state transition:
 *   - true  → runs.state = 'failed_recoverable' (retry path UI)
 *   - false → runs.state = 'failed_terminal' (contact-us only)
 *  `code` is a stable machine-readable token; UI maps it to copy.            */
export interface ErrorEvent {
  kind: 'error';
  recoverable: boolean;
  /** Stable token. Reserved values include — but are not limited to —
   *  'prompt_injection_block', 'prompt_injection_critical', 'egress_denied',
   *  'sandbox_violation', 'token_budget_exceeded', 'tenant_mismatch',
   *  'schema_invalid', 'rate_limited', 'provider_unavailable',
   *  'heartbeat_timeout', 'cli_disconnected'. New codes added forward-only.   */
  code: string;
  message: string;
  /** Optional. Which agent (if any) emitted the error.                       */
  agent?: ReviewerId;
  /** Optional. Attempt number for retry telemetry; max 2 per PRD §14.2.      */
  attempt?: number;
  at?: string;
}

// ---------- the union ----------

export type AuditEvent =
  | ProgressEvent
  | FindingEvent
  | AgentLogEvent
  | FinalVerdictEvent
  | ErrorEvent;

/** Producer-side discriminator literal. Useful as an enum-like at runtime. */
export const AUDIT_EVENT_KINDS = [
  'progress',
  'finding',
  'agent_log',
  'final_verdict',
  'error',
] as const;
export type AuditEventKind = (typeof AUDIT_EVENT_KINDS)[number];

// ---------- type guards ----------
//
// Use these everywhere instead of duck-typing. Each guard narrows the union
// member exactly. Composing `switch (e.kind)` is also fine — the compiler
// exhaustiveness-checks it via the `never` return-type assertion below.

export function isProgressEvent(e: AuditEvent): e is ProgressEvent {
  return e.kind === 'progress';
}

export function isFindingEvent(e: AuditEvent): e is FindingEvent {
  return e.kind === 'finding';
}

export function isAgentLogEvent(e: AuditEvent): e is AgentLogEvent {
  return e.kind === 'agent_log';
}

export function isFinalVerdictEvent(e: AuditEvent): e is FinalVerdictEvent {
  return e.kind === 'final_verdict';
}

export function isErrorEvent(e: AuditEvent): e is ErrorEvent {
  return e.kind === 'error';
}

/** Compile-time exhaustiveness assertion. Drop into the default branch of any
 *  switch on `event.kind` to force TS to error if a new variant is added
 *  without updating the consumer.
 *
 *  ```ts
 *  switch (e.kind) {
 *    case 'progress': ...
 *    case 'finding': ...
 *    case 'agent_log': ...
 *    case 'final_verdict': ...
 *    case 'error': ...
 *    default: return assertNever(e);
 *  }
 *  ```
 */
export function assertNever(x: never): never {
  throw new Error(`Unhandled AuditEvent variant: ${JSON.stringify(x)}`);
}
