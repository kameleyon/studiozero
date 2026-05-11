# Audit Brief — motionmax — 2026-05-10

**Project slug:** `motionmax`
**Audit date:** 2026-05-10
**Project source dir (read with full file system access):** `C:\Users\Administrator\motionmax`
**Output dir for findings:** `C:\Users\Administrator\studio-zero\shared_context\audits\motionmax\2026-05-10`

## Brief from BigBrain
Pre-launch audit of MotionMax — an AI video generator SaaS. Audience: content creators, marketers, and video producers — tool-savvy creative adults but not developers. Brand: aqua #14C8CC + gold #E4C875 only (no red, no green, no orange in autopost/lab UI). Stack: React 18 + Vite + Tailwind + shadcn, Supabase backend, Render.com worker, multiple AI providers (OpenRouter/Claude, Hypereal/Kling, Replicate, ElevenLabs). Audit the codebase end-to-end: UX/UI, content/wording, accessibility, audience alignment, flow logic, brand consistency. Surface Critical/Blocker findings that block ship, plus a prioritized punch list. Read the project dir to base findings on actual code, not assumptions.

## Required reviewer behavior
- Read the relevant artifacts (project source, design specs, brand guide, persona doc, PRD).
- Apply your domain rubric (defined in your agent .md file) audience-relative.
- Every finding requires evidence: screen capture, file:line, contrast measurement, screen-reader recording, or tool output. Findings without evidence will be rejected.
- Write your findings to: `<output dir>/<your-codename-lowercase>.md` (e.g., `optic.md`).
- Severity rubric is fixed: Blocker / Critical / Major / Minor / Polish (see `agents/audit/jury.md`).
- Do NOT edit the project. Auditors flag and recommend; creators remediate.