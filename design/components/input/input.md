# Input

**Owner:** Canvas · **Status:** shipped · **Inherits:** `.input` from template baseline

## Purpose
Single form input primitive. Covers text, email, password (with show/hide), textarea, and select. The BYOK-key paste field is a named slot of this component — it carries SC 3.3.8 requirements that diverge from the default.

## Anatomy
- Wrapping `<label>` *or* externally-associated `<label for>` (always one of these, never `placeholder` as label per Halo SC 3.3.2).
- Optional eyebrow chip (mono-meta, `aria-hidden` decorative).
- Input control (`<input>` / `<textarea>` / `<select>`).
- Optional trailing affordance slot (show/hide for passwords, validate button for BYOK, dropdown chevron for select).
- Inline helper text (linked via `aria-describedby`).
- Inline error text (linked via `aria-describedby`, `aria-invalid="true"` on input).

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `type` | `"text"\|"email"\|"password"\|"textarea"\|"select"` | `"text"` | byok keys are `type="text"` + `inputMode="text"` + `autoComplete="off"` so password managers don't snag the wrong field |
| `id` | string | required | label `htmlFor` target |
| `label` | string | required | visible label, sentence case |
| `value` / `onChange` | controlled | — | — |
| `placeholder` | string | — | hint only — never carries label content |
| `helperText` | string | — | rendered + `aria-describedby` linked |
| `errorText` | string | — | when set: input gets `aria-invalid="true"` + `data-state="error"` |
| `disabled` | boolean | false | — |
| `loading` | boolean | false | aria-busy; validate-button slot shows spinner |
| `revealable` | boolean | false | for `type="password"` and `type="text"` (BYOK) — adds keyboard-operable show/hide |
| `autoComplete` | string | — | BYOK field passes `"off"` per SC 3.3.8 + HC5 |
| `inputMode` | string | — | hint mobile keyboards |
| `options` | `{value,label}[]` | — | when `type="select"` |
| `slotTrailing` | ReactNode | — | e.g., "Validate" button |

## States (all 6 spec'd)
| State | data-state | Visual |
|---|---|---|
| **default** | — | `--bg-3` fill, `--ink-1` text, `--line-2` border, 6px radius |
| **hover** | `hover` (pseudo) | border `--line-3` |
| **active** | `active` (pseudo) | same border + `--ink-0` text |
| **focus** | `focus-visible` | `outline: 2px solid var(--focus-ring); outline-offset: 2px` (SC 2.4.13). No glow. |
| **disabled** | `disabled` | opacity 0.4; pointer-events none; native `disabled` attr |
| **loading** | `loading` | label dims; trailing slot shows spinner |
| **error** | `error` | border `--sev-blocker-border`; helper region swapped to error text; `aria-invalid="true"` |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** `<label htmlFor>` always present; helper + error linked via `aria-describedby` (space-separated IDs).
  - **1.3.5 Identify Input Purpose:** `autocomplete` honored on standard inputs (email, name, etc.).
  - **1.4.3 Contrast Minimum:** `--ink-1` on `--bg-3` = 11.1:1; placeholder `--ink-2` on `--bg-3` = 5.5:1 (clears AA body).
  - **1.4.11 Non-text Contrast:** input border `--line-2` carries the visible affordance; not load-bearing for *state* (state uses focus ring + error border at ≥3:1).
  - **2.1.1 Keyboard:** native input is fully keyboard-operable. Show/hide toggle is a `<button>`, never a div.
  - **2.4.7 Focus Visible:** focus ring renders on all sub-controls.
  - **2.5.8 Target Size Minimum:** input height ≥ 44px; show/hide button ≥ 24×24 hit area even if icon is smaller.
  - **3.3.1 Error Identification:** error text is text, linked via `aria-describedby`; not color-only.
  - **3.3.2 Labels or Instructions:** visible label always; never placeholder-as-label.
  - **3.3.7 Redundant Entry:** when used in a multi-step form, `Form` consumer passes prior-step values via `defaultValue`.
  - **3.3.8 Accessible Authentication Minimum (BYOK + login):** paste accepted, password manager friendly (`autocomplete` honored), show/hide toggle keyboard-operable, no CAPTCHA on the key-paste step.
- **BYOK key slot specifics (HC5):**
  - `autoComplete="off"` (key is not a password to remember).
  - `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="none"`.
  - `inputMode="text"`.
  - Show/hide toggle: `<button type="button" aria-pressed="false">` with `aria-label="Show key"` / `"Hide key"`; Space + Enter toggle native.
  - Help-text (e.g. *"We validate once and store encrypted."*) lives in `helperText`, linked via `aria-describedby` (SC 1.3.5).
- **Keyboard map:** Tab → Tab into trailing slot (validate button) → Tab out. Space/Enter on show/hide toggles.

## Brand-token references
`--bg-3`, `--ink-0`, `--ink-1`, `--ink-2`, `--line-2`, `--line-3`, `--focus-ring`, `--sev-blocker-border`, `--sev-blocker-text`, `--font-sans`, `--font-mono`, `--fs-body`, `--fs-body-sm`, `--fs-mono-meta`, `--r`, `--sp-12`, `--sp-14`, `--sp-16`, `--dur-fast`, `--hit-min`.

## Composition rules
- **Wraps:** native `<input>`/`<textarea>`/`<select>`.
- **Wrapped by:** `Form` (the composition primitive that orchestrates label + helper + error + redundant-entry).
- **Pixel screen contract:** screens never set inline width on `<Input>`; container width (CSS Grid track) defines it.

## Responsive behavior
- **320px:** full-width within parent; label sits above input.
- **768px:** same; helper + error remain below the input.
- **1280px:** same. No horizontal layout; always vertical (avoids SC 1.3.2 meaningful sequence issues with side-by-side labels).
- Show/hide toggle preserves 24×24 hit area at every breakpoint.
