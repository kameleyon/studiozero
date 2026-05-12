# tests/ — Studio Zero root test surface

**Owner:** Verify. **Phase:** 9 M0 (this scaffold) → grows per `architecture/test-strategy.md` §3.

This directory holds the **repo-root** Vitest tests: schema contracts,
the score-engine reference implementation + fixture verification, and
the M0 disclosure-header gate. Per-app tests live alongside their app
(e.g. `apps/web/__tests__/`); per-runner unit tests will land at
`apps/runner/src/**/*.test.ts` at M1.

## Run

From the repo root:

```bash
pnpm install           # one-time, installs ajv + vitest into the root
pnpm test              # one-shot — Phase 9 M0 exit gate
pnpm test:watch        # local dev
pnpm test:coverage     # produces ./coverage/ (HTML + lcov + json-summary)
```

Vitest config: `vitest.config.ts` at the repo root.
Coverage targets (statement ≥80%, branch ≥75%) come from
`architecture/test-strategy.md` §1.

## What lives here

| File                         | Phase | What it gates                                                                                                                                                                                                                                           |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `score-engine.test.ts`       | M0    | Every row in `architecture/schemas/score_engine.v1.fixtures.json` round-trips through a reference `score_v1()`. Rule precedence (`any_blocker` → FAIL even if math-score would PASS) is tested explicitly. Banker's rounding tested in both directions. |
| `schema-validate.test.ts`    | M0    | ajv 2020-12 in **strict** mode compiles every Phase-5 schema; sample valid + invalid payloads round-trip. `audit-input.v1.schema.json` test auto-enables when Atlas lands the file.                                                                     |
| `disclosure-headers.test.ts` | M0    | The `X-AI-Generated: studio-zero` header is present on the `/api/health` response **and** declared in `next.config.ts` headers() (belt-and-braces). EU AI Act Art. 50 interim machinery (binds 2026-08-02).                                             |

## Where fixtures live

| Path                                                                            | Owner          | Used by                                             |
| ------------------------------------------------------------------------------- | -------------- | --------------------------------------------------- |
| `architecture/schemas/score_engine.v1.fixtures.json`                            | Atlas          | `score-engine.test.ts`                              |
| `architecture/schemas/audit-output.v1.schema.json`                              | Atlas          | `schema-validate.test.ts`                           |
| `architecture/schemas/audit-input.v1.schema.json`                               | Atlas (M0 wk1) | `schema-validate.test.ts` (auto-skip until present) |
| `architecture/schemas/score_engine.v1.json`                                     | Atlas          | both                                                |
| `runner/fixtures/synthetic-repo-{pass,fail,pass-with-fixes}/`                   | Shield + Probe | M1+ integration tests                               |
| `runner/fixtures/{prompt-injection,ssrf,path-traversal,sandbox-escape}-corpus/` | Shield         | M1–M2 security tests                                |

## What to add when

- **New schema in `architecture/schemas/`** → add an `it("…compiles cleanly…")` block in `schema-validate.test.ts` + a sample valid + a sample invalid payload.
- **New score-engine version (v2, v3, …)** → DO NOT edit `score-engine.test.ts` to retarget. Instead, copy it to `score-engine.v2.test.ts` and freeze v1's tests. The same logic applies to fixture files. (R9 mitigation in `test-strategy.md`.)
- **New API route emitting JSON** → add a handler-level test in `disclosure-headers.test.ts` (or a sibling file) asserting `X-AI-Generated: studio-zero`. Every JSON-emitting route is in scope per PRD §11.3.
- **New M0–M5 milestone exit gate** → mirror the gate from `architecture/test-strategy.md` §3 into a new file under `tests/`. Filename should reflect the gate, not the milestone (so the failure message is self-describing in CI).
- **New WCAG / accessibility check** → goes under `tests/a11y/` at M1 when Halo's axe-core scaffold lands. NOT here.

## CI hooks

Pipeline wires this directory into a PR-blocking GitHub Actions workflow
in `.github/workflows/test-root.yml` (Pipeline owns; lands at M0
ticket close). Per-app workflows compose with `pnpm -w test` once the
workspace is wired.

## Conventions

- One `describe()` per logical contract; one `it()` per assertion.
- Import `{describe, it, expect}` explicitly — no `globals: true` in
  the vitest config, on purpose (grep-ability + code-review legibility).
- Strict ajv mode is **non-negotiable** for schema tests. The whole
  point of the gate is to catch silent drift.
- Failures FAIL loudly. No `expect.soft(...)`, no `console.warn` fall-throughs.
  See `test-strategy.md` §"Constraints (hard)" — warnings-as-soft-failures
  are explicitly banned by Verify.

## See also

- `architecture/test-strategy.md` — the source-of-truth for what this
  directory must contain at each milestone.
- `sprint/milestone-M0.md` — the exit gate this scaffold closes.
- `agents/security/verify.md` — owner persona.
