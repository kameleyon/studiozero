# `runner/fixtures/` — adversarial corpora

**Owner:** Shield (content) + Verify (CI). **Phase 9 M1 deliverable.** Composes with `architecture/threat-model.md` §3 cross-cutting domains + `architecture/test-strategy.md` §2 test-data inventory + `sprint/milestone-M1.md` exit gates.

Each subdirectory is one corpus; each corpus has an `index.json` of adversarial patterns. Verify's tests iterate the `patterns[]` array and assert the runner / gateway / verifier behaves per `expected_action`.

## Corpora at M1

| Corpus           | Path                                 | M1 size | M2 size | Threat-model ref    | Verify test                                      |
| ---------------- | ------------------------------------ | ------: | ------: | ------------------- | ------------------------------------------------ |
| Prompt injection | `prompt-injection-corpus/index.json` |      30 |     200 | §3.2 PI-1..PI-7     | `tests/security/prompt-injection-corpus.spec.ts` |
| SSRF             | `ssrf-corpus/index.json`             |      32 |     100 | §3.1 SSRF-1..SSRF-8 | `tests/security/ssrf-egress.spec.ts`             |
| Path traversal   | `path-traversal-corpus/index.json`   |      32 |     32+ | §3.4 PT-1..PT-7     | `tests/security/path-traversal-fuzz.spec.ts`     |
| JWT tampering    | `jwt-tampering-corpus/index.json`    |      32 |     32+ | TB-1/TB-3 STRIDE-T  | `tests/security/jwt-tampering.spec.ts`           |
| Stripe webhook   | `stripe-webhook-corpus/index.json`   |      31 |     31+ | TB-10/TB-11         | `tests/security/stripe-webhook-corpus.spec.ts`   |

Other corpora produced by sibling owners are referenced in `architecture/test-strategy.md` §2 (sandbox-escape, secret-exfil, github-webhook, cli-tamper, default-branch-fuzz, rls-cross-tenant). They land per their own milestones.

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

- **M1 (this PR):** five corpora live, 32-of-each minimum, CI green.
- **M2:** prompt-injection grows to ≥200 patterns; sandbox-escape lands per PRD §16 M2 gate; secret-exfil-corpus from Cipher; stripe-webhook patterns receive the M3 idempotency expansion.
- **M3:** external pentest informs additional patterns; cli-tamper-corpus lands.
- **V1.5:** default-branch-fuzz-corpus lands; auto-PR-flow patterns added.

Cross-references: `architecture/threat-model.md`, `architecture/test-strategy.md`, `sprint/milestone-M1.md` exit gates, `BUILD_FLOW.md` Phase 9.
