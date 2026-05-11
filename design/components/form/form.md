# Form

**Owner:** Canvas · **Status:** shipped · **Implements:** SC 3.3.7 Redundant Entry + SC 3.3.1 + SC 3.3.2 + SC 1.3.5 + Halo A6-2 (dispute form a11y)

This is a Phase 4 component specification.

## Purpose
Composition primitive wrapping `Input` + label + helper + error + redundant-entry preservation. Used by signup, BYOK key setup, project intake, dispute form, settings panels. **Honors SC 3.3.7:** values entered earlier in a multi-step flow are passed via `defaultValue` and never re-prompted.

## Anatomy
- `<form>` (native)
- Optional progress indicator (`Form.Steps`) — for multi-step flows (HB-12 onboarding progress).
- `<Form.Field>` rows — each wraps a single `Input` with label + helper + error.
- `<Form.ErrorSummary>` — top-of-form summary for SC 3.3.1 when submission fails.
- Action row at the bottom: submit + secondary (e.g., Cancel).

## Props
| Prop | Type | Notes |
|---|---|---|
| `onSubmit` | handler | required; receives field values |
| `onError` | handler | called when validation fails (so consumer can focus error summary) |
| `steps` | `{ id, label }[]` | optional; renders progress indicator |
| `currentStep` | string | optional |
| `priorValues` | `Record<string, any>` | SC 3.3.7 — values to seed inputs from prior steps |
| `errorSummary` | string[] | renders `<div role="alert">` at top of form when present |

## States (all 6 spec'd, applied at form level)
| State | data-state | Visual |
|---|---|---|
| **default** | — | fields rendered; submit enabled when valid |
| **hover/active** | per Input | inherited |
| **focus** | per Input | inherited |
| **disabled** | `disabled` | entire form locked while submitting; `aria-busy="true"`; all inputs `disabled` |
| **loading** | `loading` | submit button shows spinner; other interactions disabled |
| **error** | `error` | error summary `role="alert"` rendered at top; first invalid field receives focus |
| **success** | `success` | optional confirmation banner via `role="status"` (transient) |

## A11y notes
- **WCAG SCs satisfied:**
  - **1.3.1 Info and Relationships:** every input wrapped by `<label>` or `aria-labelledby`; fieldsets used to group related controls.
  - **1.3.5 Identify Input Purpose:** `autocomplete` honored on `email`/`name`/`url` etc.
  - **2.4.3 Focus Order:** linear top-to-bottom; on submit failure focus moves to error summary first, then user can Tab into the invalid field.
  - **3.3.1 Error Identification:** errors are text + `aria-describedby` on the input + `aria-invalid="true"`.
  - **3.3.2 Labels or Instructions:** every input has a visible label; helper text linked.
  - **3.3.3 Error Suggestion:** error text includes a corrective suggestion when one exists ("Use sk-ant-… format").
  - **3.3.4 Error Prevention (Legal/Financial/Data):** destructive submits (delete account, cancel subscription) gated behind re-auth or explicit type-match per Trace S-DEL.
  - **3.3.7 Redundant Entry:** prior-step values seeded via `priorValues` prop; consumer never re-prompts.
  - **3.3.8 Accessible Authentication Minimum:** BYOK input + login email/password use `Input` with `revealable` and the SC 3.3.8 settings (no CAPTCHA, paste enabled).

## Brand-token references
`--bg-1`, `--bg-2`, `--ink-0`, `--ink-1`, `--ink-2`, `--line-1`, `--line-2`, `--focus-ring`, `--sev-blocker-text`, `--sev-blocker-border`, `--font-sans`, `--font-mono`, `--fs-body`, `--fs-body-sm`, `--fs-mono-meta`, `--sp-*`, `--r`, `--hit-min`.

## Composition rules
- **Wraps:** `<form>` + `Form.Field` (which wraps `Input`) + `Button`.
- **Wrapped by:** route screen.
- **Pixel screen contract:** Pixel composes the form layout (column width); Canvas owns field structure and error orchestration.

## Responsive behavior
- **320px:** fields full-width; action row stacks (primary then secondary).
- **768px:** action row inline; primary on the right per Western reading order.
- **1280px:** form max-width 560 px (readability budget); centered or left-aligned per screen layout.
