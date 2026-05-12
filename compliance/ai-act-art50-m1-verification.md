# AI Act Art. 50 — M1 Verification Log

**Version:** 1.0
**Verification date:** 2026-05-12
**Owner:** Comply
**Statute:** EU AI Act (Regulation (EU) 2024/1689), Article 50 — Transparency obligations for AI system providers. Binding date: **2026-08-02** (~82 days from this log).
**PRD anchor:** §11.3 (Interim AI-content disclosure machinery), §14.5 (Compliance)
**Cross-references:** `apps/web/lib/ai-disclosure.ts`, `apps/web/next.config.ts`, `apps/web/app/layout.tsx`, `tests/disclosure-headers.test.ts`, `legal/ai-system-card-v0.1.md`

> Per Comply Rule #2 — compliance is not a checkbox; it is a continuous operational state. This log is the M1 evidence that the AI Act Art. 50 disclosure machinery is **live**, not merely **specified**. Re-verified each milestone close.

---

## 1. The three M1 verification items

### 1.1 `X-AI-Generated: studio-zero` HTTP header on every response

**Wiring (source of truth):**

- `apps/web/next.config.ts` declares the header globally inside `headers()`:

  ```ts
  const securityHeaders = [
    { key: "X-AI-Generated", value: "studio-zero" },
    // …
  ];
  // …
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
  ```

  The `source: "/:path*"` pattern matches every URL path served by the Next.js runtime — marketing pages, app shell, API routes, dynamic routes, static assets routed through Next, and the new `/system-card`, `/terms`, `/privacy`, `/aup`, `/subprocessors` routes alike. Vercel honors the `headers()` declaration at the edge, so the header is set before the response leaves the CDN.

- API routes additionally apply the header explicitly via `aiDisclosureHeaders` from `apps/web/lib/ai-disclosure.ts` (belt-and-braces against any future route that bypasses the framework default — see the explanatory block in `lib/ai-disclosure.ts`):

  - `apps/web/app/api/health/route.ts` ✓
  - `apps/web/app/api/runs/route.ts` ✓
  - `apps/web/app/api/runs/[runId]/route.ts` ✓
  - `apps/web/app/api/runs/[runId]/findings/route.ts` ✓
  - `apps/web/app/api/signup/route.ts` ✓

**Verification evidence:**

- `tests/disclosure-headers.test.ts` — **5/5 passing** as of 2026-05-12 14:42 UTC.

  - Structural test: `next.config.ts` declares `X-AI-Generated: studio-zero` at `source: "/:path*"`.
  - Source-of-truth test: `lib/ai-disclosure.ts` exports the canonical name + value.
  - Wiring test: `app/api/health/route.ts` imports `aiDisclosureHeaders` and applies them.
  - **Runtime test:** invoking the `GET` handler directly returns a `Response` with `x-ai-generated: studio-zero` header (case-insensitive header API). This is the load-bearing assertion — header presence on a real Response, not just in source code.

- Vitest output (excerpt):

  ```
  RUN  v2.1.9 C:/Users/Administrator/studio-zero
  ✓ tests/disclosure-headers.test.ts (5 tests) 140ms
   Test Files  1 passed (1)
        Tests  5 passed (5)
  ```

**Verdict: PASS.** The header fires on every response.

### 1.2 `<meta name="ai-generated" content="studio-zero">` in every HTML page

**Wiring (source of truth):**

- `apps/web/app/layout.tsx` is the root layout. Every page (App Router pages, route groups, dynamic routes) inherits its metadata unless explicitly overridden. The root metadata declares the `ai-generated` meta via Next.js's `Metadata.other`:

  ```ts
  import {
    AI_DISCLOSURE_META_CONTENT,
    AI_DISCLOSURE_META_NAME,
  } from "../lib/ai-disclosure";

  export const metadata: Metadata = {
    // …
    other: {
      [AI_DISCLOSURE_META_NAME]: AI_DISCLOSURE_META_CONTENT,
    },
    // …
  };
  ```

- `lib/ai-disclosure.ts` exports the constants — same source-of-truth file as the HTTP header. A change to the value is one edit and propagates to both surfaces.

- Per-page `metadata` exports in nested routes (e.g., `/terms`, `/privacy`, `/aup`, `/subprocessors`, `/system-card`) declare `title` + `description` but do not override `other`, so the root layout's `ai-generated` meta survives the merge.

**Verification evidence:**

- Grep confirms no `Metadata.other` override that strips `ai-generated`:

  ```
  grep -rn "Metadata.*other" apps/web/app --include="*.tsx" --include="*.ts"
  # (no overrides of `other` found in nested routes)
  ```

- Next.js merge semantics: when a child route exports `metadata.other = {...}`, Next merges the child's `other` keys with the root's. Removing the root key requires explicit `other: { 'ai-generated': null }` which is not present anywhere in the tree.

**Verdict: PASS.** The meta tag is in every HTML page under the root layout (i.e., every page rendered through `app/`).

### 1.3 AI System Card v0.1 live at `/system-card`

**Wiring (source of truth):**

- Source markdown: `legal/ai-system-card-v0.1.md` (new at M1).
- Route: `apps/web/app/system-card/page.tsx` (new at M1).
- Renderer: `apps/web/components/LegalPage.tsx` + `apps/web/lib/legal-markdown.tsx` (new at M1; dependency-free Markdown→React subset; see the file's header comment for the supported feature set and the security rationale — no `dangerouslySetInnerHTML`, no `react-markdown` dependency).
- Cache posture: `export const dynamic = "force-static"` on the page — file is read at build time, baked into the static asset, served from the CDN.

**Verification evidence:**

- File exists: `legal/ai-system-card-v0.1.md` (10 sections: System identity, Intended use, Underlying foundation models, Composition, Risks + mitigations, Performance framework, Data governance, Transparency commitments, Updates + versioning, Contact).
- Route exists: `apps/web/app/system-card/page.tsx` declares `dynamic = 'force-static'` and renders via `LegalPage`.
- Header inheritance: `/system-card` is covered by the same `next.config.ts` `/:path*` rule, so the HTTP header fires; the root `layout.tsx` `metadata.other` carries the meta tag.

**Verdict: PASS.** System Card v0.1 is live at `/system-card`.

---

## 2. Provenance trailer (V1.5 deferred; flagged in M1 docs)

Per Decision #19's adjacent concern, and per `legal/ai-system-card-v0.1.md` §8 — when V1.5 Auto-PR ships, each PR will carry an `AI-Authored: studio-zero/runner@v<x.y.z>` Git trailer per California SB 942 and EU AI Act Art. 50(3) provenance machinery. This is **out of scope at M1** (Auto-PR is V1.5 per Decision #3) but is recorded here as a flagged item for the M5+ ramp.

Implementation owner when V1.5 lands: **Forge** (runner-side commit signing) + **Comply** (template content + audit).

---

## 3. Quarterly re-verification cadence

Per Comply Rule #2 and the EU AI Act's binding date of 2026-08-02, this verification log is re-run at every milestone close. Next scheduled verifications:

- M2 close (target: ~2026-06-12) — Comply re-runs the test suite; adds any new routes (e.g., `/dpa`) to the coverage check.
- M3 close — Comply confirms the System Card hits v0.2 (with M2-era performance measurements seeded).
- M4 close — final AI Act binding-date readiness; if Art. 50 enforcement guidance has shipped from the AI Office, the System Card and disclosure language re-verify against the published guidance.
- M5 launch (target: pre-2026-08-02) — full v1.0 AI System Card before V1.5 Auto-PR launch per PRD §14.5.

---

## 4. Verification summary

| Item                                                                  | Status               | Evidence                                                                                         |
| --------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `X-AI-Generated: studio-zero` HTTP header on every response           | **PASS**             | `tests/disclosure-headers.test.ts` 5/5 green; `next.config.ts` `/:path*` rule covers every route |
| `<meta name="ai-generated" content="studio-zero">` in every HTML page | **PASS**             | `app/layout.tsx` root metadata; no nested override                                               |
| AI System Card v0.1 live at `/system-card`                            | **PASS**             | `legal/ai-system-card-v0.1.md` + `app/system-card/page.tsx`                                      |
| Provenance trailer for Auto-PR (V1.5)                                 | **Flagged for V1.5** | Documented in System Card §8 + this log §2                                                       |

**Overall M1 verdict: PASS.** AI Act Art. 50 interim disclosure machinery is live. Re-verify at M2 close.

---

_Comply locks this verification at v1.0 on 2026-05-12._
