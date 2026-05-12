# `runner/fixtures/` — adversarial corpora

**Owner:** Shield (content) + Verify (CI). **Phase 9 M1 deliverable.** Composes with `architecture/threat-model.md` §3 cross-cutting domains + `architecture/test-strategy.md` §2 test-data inventory + `sprint/milestone-M1.md` exit gates.

Each subdirectory is one corpus; each corpus has an `index.json` of adversarial patterns. Verify's tests iterate the `patterns[]` array and assert the runner / gateway / verifier behaves per `expected_action`.

## Corpora at M1 + M2

The "Consumer status" column tracks whether a Verify spec in HEAD iterates the
corpus and exercises the canonical defense. The path under "Verify test"
is the spec file that consumes the corpus. M2 cleanup (this commit) lands
the prompt-injection + sandbox-escape consumers — those were the two
Critical items from the M2 Jury audit (Shield expanded the corpora at
commit 08c1f15 but consumer specs were absent in HEAD).

| Corpus           | Path                                 | M1 size | Current | Min M2 | Threat-model ref       | Verify consumer spec (HEAD)                                                           | Consumer status |
| ---------------- | ------------------------------------ | ------: | ------: | -----: | ---------------------- | ------------------------------------------------------------------------------------- | --------------- |
| Prompt injection | `prompt-injection-corpus/index.json` |      30 |     219 |    200 | §3.2 PI-1..PI-7        | `tests/security/prompt-injection-corpus.spec.ts`                                      | LIVE — M2 close |
| SSRF             | `ssrf-corpus/index.json`             |      32 |     32+ |    100 | §3.1 SSRF-1..SSRF-8    | `tests/integration/ssrf-egress.spec.ts` (M1) + `apps/runner/tests/ssrf-guard.test.ts` | LIVE — M1       |
| Path traversal   | `path-traversal-corpus/index.json`   |      32 |     32+ |    32+ | §3.4 PT-1..PT-7        | `tests/integration/path-traversal-fuzz.spec.ts`                                       | LIVE — M1       |
| JWT tampering    | `jwt-tampering-corpus/index.json`    |      32 |     32+ |    32+ | TB-1/TB-3 STRIDE-T     | `tests/security/jwt-tampering.spec.ts` (planned M3 close)                             | DEFERRED — M3   |
| Stripe webhook   | `stripe-webhook-corpus/index.json`   |      31 |     31+ |    31+ | TB-10/TB-11            | `tests/integration/stripe-webhook-handler.spec.ts`                                    | LIVE — M2       |
| Sandbox escape   | `sandbox-escape-corpus/index.json`   |       — |      33 |     30 | §3.5 SE-1..SE-8        | `tests/security/sandbox-escape-top30.spec.ts`                                         | LIVE — M2 close |
| Secret exfil     | `secret-exfil-corpus/index.json`     |       — |      45 |     40 | §3.3 EXF-1..EXF-4      | `tests/integration/secret-exfil.spec.ts`                                              | LIVE — M2       |
| RLS cross-tenant | `rls-cross-tenant-corpus/index.json` |       — |      23 |     20 | TB-2 STRIDE-T/E + §3.5 | `tests/integration/rls-cross-tenant-corpus.spec.ts`                                   | LIVE — M2       |
| GitHub webhook   | `github-webhook-corpus/index.json`   |       — |      12 |     10 | TB-13 + §4 line 426    | `tests/integration/github-webhook-fuzz.spec.ts`                                       | LIVE — M2       |

**M2 Batch 1 (Shield):** the bottom four corpora land at M2 to satisfy the exit-gate requirements in `sprint/milestone-M2.md` lines 63–64 + 119–120: PI ≥200, sandbox-escape top-30. Secret-exfil and RLS cross-tenant are produced now to compose with Verify's M2 test additions; github-webhook lifts the §4 line-426 corpus-inventory line item out of M1's "stub-or-defer" state.

Remaining corpora (cli-tamper, default-branch-fuzz) land per their own milestones (M3 / V1.5) per `architecture/test-strategy.md` §2.

## How Verify consumes these

Each `index.json` is loaded once per test suite, the `patterns[]` array is iterated, and Vitest produces one named `test()` per entry (`it.each`). Pattern shape (validated by ajv 2020-12; Verify owns the JSON-schema for the corpus envelope):

```jsonc
{
  "id":               "PI-001",                 // unique within corpus; format <CORPUS_PREFIX>-NNN
  "category":         "instruction_override",   // free-form taxonomy per corpus
  "pattern":          "...",                    // the adversarial input
  "expected_action":  "block" | "redact" | "allow",
  "expected_outcome": "Prose description: what defense should fire, what observable should change",
  "notes":            "Why this pattern matters; CVE refs, real-world incidents, threat-model line"
}
```

Optional fields per corpus: `symlink_target`, `content`, `headers`, `body` for patterns that need richer structure than a single string. Verify's loader tolerates these as `Record<string, unknown>` and per-corpus tests destructure as needed.

CI gates:

- **PR-blocking on every push:** corpus file existence + ajv schema validation.
- **PR-blocking on changes to runner / Edge Functions:** the per-corpus Vitest spec runs end-to-end against the canonical defense; every entry must produce the expected outcome.
- **Nightly on `main`:** all corpora re-run against a fresh staging deploy.

Failures are PR-blocking, never softened. A corpus pattern that no longer reproduces because the defense is too good is **not** removed — it's marked `obsolete: true` with a rationale and kept as a regression guard.

## Constraints on every pattern

1. **Real adversarial signal.** Patterns are drawn from CVE descriptions, OWASP findings, the project's own threat model, and published red-team research. Contrived patterns that no real attacker would attempt are excluded.
2. **`expected_action` ∈ `{block, redact, allow}`.**
   - `block` — defense returns a 4xx and emits an `audit_logs` row.
   - `redact` — input is sanitized before forwarding; the call proceeds but the offending bytes are removed (used in PI obfuscation tier; not in M1 SSRF / PT / JWT / Stripe corpora — those are all block).
   - `allow` — the pattern is benign-but-suspicious; defense logs the observation but proceeds. Used sparingly; M1 corpora have zero `allow` entries.
3. **`notes` carries the rationale.** Every pattern cites either a CVE, a published incident, a section of `architecture/threat-model.md`, or a numbered finding from a prior audit. No note = pattern rejected at review.
4. **No real secrets.** Anywhere a credential, key, signature, or token would appear, the placeholder format is `<scheme>-EXAMPLE_FAKE_<purpose>` (e.g., `sk-ant-EXAMPLE_FAKE_KEY_FOR_TESTING_DO_NOT_REPLACE`, `pi_EXAMPLE_FAKE_PAYMENT_INTENT`, `whsec_EXAMPLE_FAKE_SECRET`). The Verify test harness reads any actual secrets from `process.env.*_TEST_SECRET` — never from this directory.
5. **Append-only.** New patterns added on every postmortem of a discovered vulnerability. Existing patterns are never removed; if obsolete, marked `obsolete: true` with rationale.

## How to add a new pattern

1. Open a PR that adds the entry to the corpus's `index.json`. Increment `version` per semver (a new pattern is a minor bump; a schema change is a major).
2. The PR description must reference either:
   - the postmortem (Linear issue / GitHub issue) that motivated the pattern, OR
   - the external research (CVE, paper, talk) that documents the attack class.
3. CODEOWNERS auto-requests Shield review. Shield validates:
   - the pattern is realistic
   - the `expected_outcome` is specified at the level of an observable assertion (not vague aspiration)
   - the `notes` carry a citation
4. Verify validates that the new pattern's `id` is unique within the corpus and the JSON ajv-validates.
5. Forge confirms the defense handles the pattern (or files a follow-up ticket if a defense gap is revealed by the pattern).

## Roadmap

- **M1:** five corpora live, 32-of-each minimum, CI green.
- **M2 (Batch 1, this PR):** prompt-injection at 219 patterns (target ≥200) across 16 categories including new tool-call-forgery, multi-language obfuscation, indirect-build-artifact, chain-of-thought hijack, payload-smuggling-via-legitimate-code, multi-turn-drift, and tool-output-poisoning families; sandbox-escape top-30 (33 patterns) covering caps, seccomp, cgroup, kernel CVEs (Dirty Pipe CVE-2022-0847, CVE-2024-1086, CVE-2023-2598, CVE-2024-21626 Leaky Vessels), chroot, runtime, memory-corruption, and /proc-/sys misuse; secret-exfil at 45 patterns across 10 channels (Sentry, PostHog, Resend, LLM output, tool output, network DNS/ICMP/HTTP, mistyped-API, headers, cache, symlink); rls-cross-tenant at 23 patterns; github-webhook at 12 patterns.
- **M3:** external pentest informs additional patterns; cli-tamper-corpus lands.
- **V1.5:** default-branch-fuzz-corpus lands; auto-PR-flow patterns added.

Cross-references: `architecture/threat-model.md`, `architecture/test-strategy.md`, `sprint/milestone-M1.md` exit gates, `BUILD_FLOW.md` Phase 9.
