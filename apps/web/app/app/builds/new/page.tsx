"use client";

/**
 * /app/builds/new — Build-mode intake form.
 *
 * Phase 9 V2 Batch 1 (Forge). Implements PRD §7.3 step 1 — customer
 * describes vision, audience, vibe, constraints; on submit we POST to
 * /api/builds and redirect to the live dashboard. BigBrain takes over
 * server-side and produces a brief that the customer reviews before
 * dispatch (Hard Rule §1).
 *
 * 6-step wizard:
 *   1. Idea (2-3 sentences)
 *   2. Target audience (persona, primary need, pain point)
 *   3. Vibe (adjectives + reference URLs)
 *   4. Constraints (budget, deadline, must-haves, non-goals)
 *   5. Output preference (roadmap+docs OR +repo OR +scaffold-V2.1)
 *   6. Confirm + submit
 *
 * Accessibility: each step uses `<fieldset>` + `<legend>`; current step
 * is announced via `aria-live="polite"` on the step indicator; errors
 * summarized at top with focus-trap per SC 3.3.1, 3.3.3, 3.3.7, 3.3.8.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Chip } from "../../../../components/Chip";
import { Form } from "../../../../components/Form";
import { Input } from "../../../../components/Input";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface IntakeState {
  idea: string;
  persona: string;
  primaryNeed: string;
  painPoint: string;
  vibeAdjectives: string;
  vibeReferenceUrls: string;
  budgetUsd: string;
  deadline: string;
  mustHave: string;
  nonGoals: string;
  outputPreference: "roadmap-docs" | "roadmap-docs-repo" | "roadmap-docs-repo-scaffold";
  projectName: string;
}

const INITIAL: IntakeState = {
  idea: "",
  persona: "",
  primaryNeed: "",
  painPoint: "",
  vibeAdjectives: "",
  vibeReferenceUrls: "",
  budgetUsd: "",
  deadline: "",
  mustHave: "",
  nonGoals: "",
  outputPreference: "roadmap-docs-repo",
  projectName: "",
};

function validateStep(step: Step, s: IntakeState): string[] {
  const errs: string[] = [];
  switch (step) {
    case 1:
      if (s.projectName.trim().length < 3)
        errs.push("Project name must be at least 3 characters.");
      if (s.idea.trim().length < 20)
        errs.push("Describe the idea in at least 20 characters (2-3 sentences).");
      break;
    case 2:
      if (s.persona.trim().length < 3) errs.push("Persona is required.");
      if (s.primaryNeed.trim().length < 3) errs.push("Primary need is required.");
      if (s.painPoint.trim().length < 3) errs.push("Pain point is required.");
      break;
    case 3:
      if (s.vibeAdjectives.trim().length < 3)
        errs.push("Add at least one vibe adjective (comma-separated).");
      break;
    case 4:
      // Constraints all optional — no validation.
      break;
    case 5:
      if (
        s.outputPreference !== "roadmap-docs" &&
        s.outputPreference !== "roadmap-docs-repo" &&
        s.outputPreference !== "roadmap-docs-repo-scaffold"
      ) {
        errs.push("Pick an output preference.");
      }
      break;
    case 6:
      // Confirm step — no further validation; submission happens here.
      break;
  }
  return errs;
}

export default function BuildIntakePage(): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [state, setState] = React.useState<IntakeState>(INITIAL);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  function set<K extends keyof IntakeState>(key: K, val: IntakeState[K]): void {
    setState((s) => ({ ...s, [key]: val }));
  }

  function next(): void {
    const errs = validateStep(step, state);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    if (step < 6) setStep(((step + 1) as Step));
  }

  function back(): void {
    setErrors([]);
    if (step > 1) setStep(((step - 1) as Step));
  }

  async function submit(): Promise<void> {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        project_name: state.projectName.trim(),
        idea: state.idea.trim(),
        target_audience: {
          persona: state.persona.trim(),
          primary_need: state.primaryNeed.trim(),
          pain_point: state.painPoint.trim(),
        },
        vibe: {
          adjectives: state.vibeAdjectives
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
            .slice(0, 10),
          reference_urls: state.vibeReferenceUrls
            .split(/[\n,]/)
            .map((u) => u.trim())
            .filter(Boolean)
            .slice(0, 10),
        },
        constraints: {
          budget_usd: state.budgetUsd ? Number.parseInt(state.budgetUsd, 10) : null,
          deadline: state.deadline || null,
          must_have_features: state.mustHave
            .split(/\n|,/)
            .map((f) => f.trim())
            .filter(Boolean)
            .slice(0, 20),
          non_goals: state.nonGoals
            .split(/\n|,/)
            .map((g) => g.trim())
            .filter(Boolean)
            .slice(0, 20),
        },
        output_preference: state.outputPreference,
      };

      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as
        | { ok: true; buildId: string; redirectTo: string }
        | { ok: false; error: string };
      if (!res.ok || !body.ok) {
        const msg = !body.ok ? body.error : `HTTP ${res.status}`;
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }
      router.push(body.redirectTo);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        BUILD MODE · STEP {step} / 6
      </Chip>
      <h1 id="page-h1">Describe your idea</h1>
      <p
        className="body-lg"
        aria-live="polite"
        role="status"
      >
        Studio Zero will produce a roadmap, documentation bundle, and (if you
        opt in) a seeded GitHub repo. BigBrain will write a brief and ask you
        to confirm before dispatching the team.
      </p>

      {errors.length > 0 ? (
        <div className="sz-form-error-summary" role="alert" tabIndex={-1}>
          <strong>Fix these to continue:</strong>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Form
        onSubmit={(e): void => {
          e.preventDefault();
          if (step === 6) void submit();
          else next();
        }}
      >
        {step === 1 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 1 — Idea</legend>
            <Input
              label="Project name"
              helpText="The working name. You can change it later."
              value={state.projectName}
              onChange={(e): void => set("projectName", e.target.value)}
              placeholder="e.g. Pace — a calm-cardio coach for runners"
              required
            />
            <label className="sz-field">
              <span className="sz-field__label">
                The idea — 2 to 3 sentences
              </span>
              <textarea
                className="sz-textarea"
                rows={5}
                value={state.idea}
                onChange={(e): void => set("idea", e.target.value)}
                placeholder="What is the product, who is it for, and what does it let them do?"
                required
              />
            </label>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 2 — Target audience</legend>
            <Input
              label="Persona"
              value={state.persona}
              onChange={(e): void => set("persona", e.target.value)}
              placeholder="e.g. First-time runners aged 35-55 training for a 5K"
              required
            />
            <Input
              label="Primary need"
              value={state.primaryNeed}
              onChange={(e): void => set("primaryNeed", e.target.value)}
              placeholder="e.g. A coaching plan that adapts to how they feel each day"
              required
            />
            <Input
              label="Pain point"
              value={state.painPoint}
              onChange={(e): void => set("painPoint", e.target.value)}
              placeholder="e.g. Existing apps shame them for missed runs"
              required
            />
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 3 — Vibe</legend>
            <Input
              label="Adjectives (comma-separated)"
              value={state.vibeAdjectives}
              onChange={(e): void => set("vibeAdjectives", e.target.value)}
              placeholder="calm, premium, editorial"
              required
            />
            <label className="sz-field">
              <span className="sz-field__label">
                Reference URLs (one per line)
              </span>
              <textarea
                className="sz-textarea"
                rows={4}
                value={state.vibeReferenceUrls}
                onChange={(e): void =>
                  set("vibeReferenceUrls", e.target.value)
                }
                placeholder={"https://example.com\nhttps://another.example"}
              />
            </label>
          </fieldset>
        ) : null}

        {step === 4 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 4 — Constraints</legend>
            <Input
              label="Budget (USD, optional)"
              inputMode="numeric"
              value={state.budgetUsd}
              onChange={(e): void => set("budgetUsd", e.target.value)}
              placeholder="50000"
              min={0}
              max={10000000}
            />
            <Input
              label="Deadline (optional)"
              value={state.deadline}
              onChange={(e): void => set("deadline", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <label className="sz-field">
              <span className="sz-field__label">
                Must-have features (one per line)
              </span>
              <textarea
                className="sz-textarea"
                rows={4}
                value={state.mustHave}
                onChange={(e): void => set("mustHave", e.target.value)}
                placeholder={"Adaptive plan\nBYOK auth\nApple Health sync"}
              />
            </label>
            <label className="sz-field">
              <span className="sz-field__label">Non-goals (one per line)</span>
              <textarea
                className="sz-textarea"
                rows={3}
                value={state.nonGoals}
                onChange={(e): void => set("nonGoals", e.target.value)}
                placeholder={"Social feed\nCoach marketplace"}
              />
            </label>
          </fieldset>
        ) : null}

        {step === 5 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 5 — What do you want delivered?</legend>
            <label className="sz-field sz-radio-row">
              <input
                type="radio"
                name="output_preference"
                value="roadmap-docs"
                checked={state.outputPreference === "roadmap-docs"}
                onChange={(): void => set("outputPreference", "roadmap-docs")}
              />
              <span>
                <strong>Roadmap + docs</strong> — the bundle, no repo. Fastest.
              </span>
            </label>
            <label className="sz-field sz-radio-row">
              <input
                type="radio"
                name="output_preference"
                value="roadmap-docs-repo"
                checked={state.outputPreference === "roadmap-docs-repo"}
                onChange={(): void =>
                  set("outputPreference", "roadmap-docs-repo")
                }
              />
              <span>
                <strong>Roadmap + docs + seeded GitHub repo</strong> — V2
                default. Includes milestones + issues from each layer.
              </span>
            </label>
            <label className="sz-field sz-radio-row">
              <input
                type="radio"
                name="output_preference"
                value="roadmap-docs-repo-scaffold"
                checked={
                  state.outputPreference === "roadmap-docs-repo-scaffold"
                }
                onChange={(): void =>
                  set("outputPreference", "roadmap-docs-repo-scaffold")
                }
                disabled
              />
              <span>
                <strong>Roadmap + docs + repo + working scaffold</strong> —
                V2.1, gated behind audit-pass. Not available yet.
              </span>
            </label>
          </fieldset>
        ) : null}

        {step === 6 ? (
          <fieldset className="sz-fieldset">
            <legend>Step 6 — Confirm</legend>
            <p>
              <strong>Project:</strong> {state.projectName}
            </p>
            <p>
              <strong>Idea:</strong> {state.idea}
            </p>
            <p>
              <strong>Audience:</strong> {state.persona} — needs{" "}
              {state.primaryNeed}; pain: {state.painPoint}
            </p>
            <p>
              <strong>Vibe:</strong> {state.vibeAdjectives}
            </p>
            <p>
              <strong>Output:</strong>{" "}
              {state.outputPreference === "roadmap-docs"
                ? "Roadmap + docs"
                : state.outputPreference === "roadmap-docs-repo"
                  ? "Roadmap + docs + seeded GitHub repo"
                  : "Roadmap + docs + repo + scaffold (V2.1)"}
            </p>
            <p className="sz-fineprint">
              Submitting will hand your intake to BigBrain. BigBrain produces a
              brief; you review and confirm before any team work starts. Audit
              gate runs before delivery — no output ships without PASS or PASS
              WITH FIXES.
            </p>
            {submitError ? (
              <div className="sz-form-error-summary" role="alert">
                {submitError}
              </div>
            ) : null}
          </fieldset>
        ) : null}

        <div className="sz-intake-actions">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={back}
              disabled={submitting}
            >
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="md" href="/app">
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
          >
            {step === 6 ? "Submit to BigBrain" : "Next"}
          </Button>
        </div>
      </Form>
    </>
  );
}
