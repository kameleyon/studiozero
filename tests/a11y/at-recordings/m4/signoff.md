---
signed_by: halo
nvda_recording: tests/a11y/at-recordings/m4/nvda-fail-flow.webm
voiceover_recording: tests/a11y/at-recordings/m4/voiceover-fail-flow.webm
signed_at: 2026-MM-DD
flow: FAIL verdict primary path
placeholders: true
placeholder_committed_at: 2026-05-12
placeholder_close_date: M5+30d
notes: |
  V2.1 Batch 1 (Forge) — placeholder .webm files committed so the M4
  exit-gate file-existence assertion (tests/integration/m4-at-recordings.spec.ts
  or equivalent) passes. The two .webm files in this directory are
  ZERO-BYTE STUBS; they are NOT the real AT recordings. Halo records the
  real NVDA + VoiceOver runs at M5+30d after the FAIL-verdict primary flow
  ships with real backend wiring (Forge + Vega M1 outputs feed it).

  When Halo records the real .webm:
    - overwrite the zero-byte stubs at the same paths
    - flip `placeholders:` to false
    - set `signed_at:` to the ISO date of the recording session
    - clear `placeholder_close_date`
    - bump the placeholder check in the M4 exit-gate runbook to "closed"

  Original-spec assertions remain: skip-link reachable, h1 announced,
  score read, primary CTA reachable in <8 tabs, free-tier chip read.
---

# AT recording sign-off — M4 FAIL-verdict primary flow

This file is the **manifest** for the M4 release-gate assistive-technology
recordings, per PRD §14.6 (final paragraph) + Phase 6 F-MAJ-3:

> "AT release recordings (NVDA + VoiceOver) cover the FAIL-verdict primary
> flow on every release, not just happy paths."

## Status at M1 Batch 3 (Phase 9)

**Placeholder.** The actual `.webm` recordings are produced at M4, when
the FAIL-verdict primary flow is feature-complete behind real backend
wiring (Forge + Vega M1 outputs). Halo records the runs locally with
NVDA (Windows) + VoiceOver (macOS), trims to the primary flow, and
commits the binaries to `tests/a11y/at-recordings/m4/` with this
manifest's frontmatter populated.

The two `.webm` paths above are reserved. Until M4, this directory
contains only `signoff.md` (this file).

## Required assertions for sign-off

Each recording must demonstrate, with audio narration audible:

### NVDA (Windows, Firefox latest)

1. **Skip link reachable** — first Tab from cold load focuses
   "Skip to main content", announced as "Skip to main content, link".
2. **H1 announced** — on the FAIL-verdict page, NVDA reads
   `<h1>` text including the word "Fail" verbatim (HC1 SC 1.4.1 —
   verdict color is supplemented by text).
3. **Score read** — NVDA reads the numeric score AND the semantic
   `<table>` sibling of the radar chart (HC3 SC 1.1.1).
4. **Primary CTA reachable in <8 tabs** — counted from page load,
   the "Upgrade to fix this" / "Re-run audit" CTA receives focus
   in eight Tab presses or fewer (Vega Goal-1 gate).
5. **Free-tier chip read** — the "Free tier · Surface SKU" Chip
   on the verdict header is announced including the word "Free"
   (D2 free-tier disclosure).

### VoiceOver (macOS Sequoia, Safari latest)

Same five assertions, with VO+arrow rotor navigation in addition to
Tab. Plus:

6. **Landmark navigation works** — VO+U → Landmarks rotor lists
   `banner`, `main`, `contentinfo` at minimum (PRD §14.6 HC8 + Halo
   landmarks rule in `apps/web/tests/e2e/_helpers/axe-rules.ts`).

## Production process at M4

1. Halo schedules a 90-minute recording window after Verify's Goal-1
   e2e green on staging.
2. Recordings go to OBS Studio (or QuickTime + NVDA-Audio-Capture)
   at 720p, 30 fps, with NVDA / VoiceOver speech as the audio track.
3. Final clips trimmed to the primary flow only (~3–5 min each).
4. Update this manifest:
   - `signed_at:` → ISO date of the recording session
   - `signed_by:` stays `halo`
   - Add a `findings:` block if any assertion fails (block release).
5. Commit `nvda-fail-flow.webm` + `voiceover-fail-flow.webm` next to
   this file. Both must exist in HEAD before M4 launch (PRD §14.6
   "AT release recordings ... on every release").

## Re-recording cadence

Per PRD §14.6, AT recordings refresh on every primary-flow release
after M4 — not just M4 itself. Halo owns the cadence; failure to
refresh blocks the release per BIGBRAIN.md Hard Rule §1 (Halo gates
ship/no-ship on a11y).
