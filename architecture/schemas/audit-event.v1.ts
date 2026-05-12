/**
 * Studio Zero — AuditEvent v1.1 (discriminated union)
 *
 * Schema version: v1.1 (additive bump from v1 — see "Version history" below).
 *
 * Owner: Atlas (data) + Verify (contract gate)
 * PRD: §13.3 Runner contract (AuditEvent enum), §9.4 (final_verdict payload),
 *      §7.2 Step C (live progress stream rendering), §14.6 HC2 (aria-live policy),
 *      §13.4 (CLI mode privacy invariant — gates the CLI variants below).
 * Decision: architecture/decisions.md ARCH-D10 (cli_heartbeat in the AuditEvent
 *   enum — single contract for run-progress AND device-liveness).
 * State machine: ia/user-flows/audit-run-state-machine.md
 *
 * Emitted by `runner.runAudit(): AsyncIterable<AuditEvent>` and persisted to
 * `runs.events_log` JSONB array so late subscribers can replay (state-machine EC-2).
 * Web app + CLI both consume this contract identically. Any structural change is
 * a new version file (audit-event.v2.ts) — never an in-place edit. Additive
 * variants (v1 → v1.1) are allowed in place because every v1 consumer remains
 * exhaustive over v1 kinds AND treats unknown future kinds as forward-compatible
 * (unrecognized kinds skip rather than throw at the consumer boundary).
 *
 * Throttle policy: producer SHOULD coalesce `progress` events to ≤ 4 updates/sec
 * per agent (Halo HC2 — SC 2.2.1 prevents AT overwhelm in aria-live regions).
 * CLI heartbeats are emitted on a 30s `setInterval` while a run is in flight
 * (ARCH-D10 + sprint M3 line 54), independent of the progress throttle.
 *
 * Type-level invariants worth knowing:
 *   - `kind` is the discriminator. Narrow on `kind`, not on field presence.
 *   - `final_verdict.result` is the audit-output.v1.schema.json shape, *validated*
 *     at the runner boundary by ajv before emission (Verify §18.1 Contract layer).
 *   - `error.recoverable` drives the runs.state transition target
 *     (true → failed_recoverable, false → failed_terminal).
 *   - CLI-mode variants (`cli_heartbeat`, `cli_paired`, `cli_revoked`,
 *     `tamper_detected`) NEVER carry source bytes. Their `pairing_id` is the
 *     `cli_pairings.id` UUID and is the only customer-correlated field. PRD
 *     §13.4 privacy invariant is enforced at the producer (the CLI's
 *     `apps/cli/src/network/upload-verdict.ts`) and at the runtime body cap
 *     in `apps/cli/src/network/studio-client.ts` (64 KiB max).
 *
 * ---------------------------------------------------------------------------
 * Version history
 * ---------------------------------------------------------------------------
 *   v1.0 — initial enum: progress | finding | agent_log | final_verdict | error
 *   v1.1 — Phase 9 M3 (ARCH-D10 close): adds CLI-mode variants
 *            cli_heartbeat | cli_paired | cli_revoked | tamper_detected.
 *          Additive only; all v1.0 producers + consumers remain valid.
 */
export const AUDIT_EVENT_SCHEMA_VERSION = "v1.1" as const;

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

// ---------- CLI-mode variants (v1.1, ARCH-D10 close, Phase 9 M3) ----------
//
// Privacy invariant: NONE of these variants carry source bytes. The
// `pairing_id` is the `cli_pairings.id` UUID (server-minted at C5 of the
// pairing flow). Device + binary fingerprints are hashes only — never raw
// hostnames in CLI events. PRD §13.4 + Comply consent-and-data-minimisation.

/** Who revoked a CLI pairing.
 *   - 'user'             — customer hit `studio-zero logout` or revoked in web UI.
 *   - 'admin'            — staff console revoke.
 *   - 'tamper_detected'  — auto-revoke after `recordTamperEvent` (Cipher Fix-3c).
 *   - 'expiry'           — pairing_token TTL elapsed (90d default).
 */
export type CliRevokeReason = 'user' | 'admin' | 'tamper_detected' | 'expiry';

/**
 * 30-second liveness ping from a paired CLI. Producer is the CLI's
 * `apps/cli/src/network/heartbeat.ts` (M3+1 carry from Forge). Consumer is
 * the web's `POST /api/cli/heartbeat` route which UPSERTs into the
 * `cli_heartbeat` table (Atlas 0004) and mirrors `last_seen_at` onto
 * `cli_pairings.last_heartbeat_at` for the `active_pairings` index-only
 * query. The `stale_after_5min()` function flips status for the UI per
 * `cli-pairing-and-tamper.md` EC-6.
 *
 * No customer code, no project path. The presence of `last_active_at` is
 * the liveness signal; the absence after 5min flips the UI to "stale".
 */
export interface CliHeartbeatEvent {
  kind: 'cli_heartbeat';
  /** UUID of `cli_pairings.id`. Server-minted at C5. */
  pairing_id: string;
  /** SemVer string from `apps/cli/src/commands/version.ts`. */
  cli_version: string;
  /** RFC 3339 timestamp of the most-recent CLI activity. */
  last_active_at: string;
  /** Optional UUID of the currently-claimed job, if mid-run. */
  current_run_id?: Ulid;
  at?: string;
}

/**
 * A CLI device successfully completed pair-confirm (C5). Emitted by the
 * `POST /api/cli/pair/confirm` route after the pairing-token is minted.
 * UI consumers update the device list in `/app/settings/cli`.
 *
 * Device fingerprint is a hash; never the raw hostname.
 */
export interface CliPairedEvent {
  kind: 'cli_paired';
  /** UUID of the new `cli_pairings.id`. */
  pairing_id: string;
  /**
   * Stable per-device hash (SHA-256 of hostname+os+arch under the
   * per-deployment pepper). Used by UI to de-dupe device entries across
   * re-pair cycles. Raw hostname is NEVER emitted.
   */
  device_fingerprint: string;
  /** SemVer string. */
  cli_version?: string;
  at?: string;
}

/**
 * A CLI pairing has been revoked. Emitted by the `POST /api/cli/pair`
 * (DELETE) route and by `recordTamperEvent` when `revoked_by='tamper_detected'`.
 * Consumers flip the device row to `revoked` in the UI and refuse subsequent
 * authenticated calls from that bearer token.
 */
export interface CliRevokedEvent {
  kind: 'cli_revoked';
  /** UUID of the revoked `cli_pairings.id`. */
  pairing_id: string;
  /** Provenance of the revocation. */
  revoked_by: CliRevokeReason;
  at?: string;
}

/**
 * Manifest tamper detected at the verdict-route's signature-verify step
 * (Cipher Fix-3c — `apps/web/lib/cli-manifest-verifier.ts`). Carries the
 * reported vs expected SHA-256 hash so the audit_logs trail is reproducible.
 *
 * The CLI's verdict still renders (D7 transparency posture); the event is
 * the durable record + the trigger for `recordTamperEvent`. Per the
 * verifier's lock: the server is on a stable network; missing manifest IS
 * a tamper signal.
 */
export interface TamperDetectedEvent {
  kind: 'tamper_detected';
  /** Short token: 'binary_hash_mismatch', 'manifest_signature_invalid',
   *  'no_manifest_for_version'. Mirrors `CliClaimVerifyResult.reason`. */
  reason: string;
  /** SHA-256 hex the CLI claimed (lowercase). */
  binary_hash_actual: string;
  /** SHA-256 hex the manifest authorized (lowercase). Empty if no manifest. */
  binary_hash_expected: string;
  /** Optional UUID of the `cli_pairings.id` involved, if known. */
  pairing_id?: string;
  /** Optional CLI version reported by the offending request. */
  cli_version?: string;
  at?: string;
}

// ---------- the union ----------

export type AuditEvent =
  | ProgressEvent
  | FindingEvent
  | AgentLogEvent
  | FinalVerdictEvent
  | ErrorEvent
  // v1.1 — Phase 9 M3 (ARCH-D10 close):
  | CliHeartbeatEvent
  | CliPairedEvent
  | CliRevokedEvent
  | TamperDetectedEvent;

/** Producer-side discriminator literal. Useful as an enum-like at runtime. */
export const AUDIT_EVENT_KINDS = [
  'progress',
  'finding',
  'agent_log',
  'final_verdict',
  'error',
  // v1.1 — Phase 9 M3 (ARCH-D10 close):
  'cli_heartbeat',
  'cli_paired',
  'cli_revoked',
  'tamper_detected',
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

// ---------- v1.1 type guards (Phase 9 M3, ARCH-D10) ----------

export function isCliHeartbeatEvent(e: AuditEvent): e is CliHeartbeatEvent {
  return e.kind === 'cli_heartbeat';
}

export function isCliPairedEvent(e: AuditEvent): e is CliPairedEvent {
  return e.kind === 'cli_paired';
}

export function isCliRevokedEvent(e: AuditEvent): e is CliRevokedEvent {
  return e.kind === 'cli_revoked';
}

export function isTamperDetectedEvent(e: AuditEvent): e is TamperDetectedEvent {
  return e.kind === 'tamper_detected';
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
 *    case 'cli_heartbeat': ...
 *    case 'cli_paired': ...
 *    case 'cli_revoked': ...
 *    case 'tamper_detected': ...
 *    default: return assertNever(e);
 *  }
 *  ```
 */
export function assertNever(x: never): never {
  throw new Error(`Unhandled AuditEvent variant: ${JSON.stringify(x)}`);
}
