"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * Form — composition primitive.
 *
 * Honors SC 3.3.7 (priorValues seed inputs) and SC 3.3.1 (error summary
 * focused on submit failure).
 */
export function Form({
  onSubmit,
  onError,
  steps,
  currentStep,
  priorValues = {},
  children,
  errorSummary,
  state = "default",
  ...rest
}) {
  const summaryRef = useRef(null);

  useEffect(() => {
    if (errorSummary?.length && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [errorSummary]);

  function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    // Validation lives in the consumer; Form is structure-only.
    onSubmit?.(data, e);
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-state={state}
      aria-busy={state === "loading" || undefined}
      className="sz-form"
      noValidate
      {...rest}
    >
      {steps?.length ? (
        <ol className="sz-form__steps" aria-label="Form progress">
          {steps.map((s, i) => {
            const isCurrent = s.id === currentStep;
            const idx = steps.findIndex((x) => x.id === currentStep);
            const isDone = idx > -1 && i < idx;
            return (
              <li
                key={s.id}
                className="sz-form__step"
                data-state={isCurrent ? "current" : isDone ? "done" : undefined}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="sz-form__step-num">{`${i + 1}`}</span>
                <span className="sz-form__step-label">{s.label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {errorSummary?.length ? (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="sz-form__err-summary"
        >
          <h2 className="sz-form__err-title">{`We can't submit this yet.`}</h2>
          <ul>
            {errorSummary.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Pass priorValues down via context-like prop spread on children that
          opt in via `name`. Consumers can also pass defaultValue manually. */}
      <FormContext.Provider value={{ priorValues }}>
        <div className="sz-form__fields">{children}</div>
      </FormContext.Provider>
    </form>
  );
}

const FormContext = React.createContext({ priorValues: {} });

/* Field wrapper — pairs label + Input semantics already enforced by Input */
export function FormField({ children }) {
  return <div className="sz-form__field">{children}</div>;
}

export function FormActions({ children }) {
  return <div className="sz-form__actions">{children}</div>;
}

Form.Field = FormField;
Form.Actions = FormActions;

/* Hook to read prior values for SC 3.3.7 seeding */
export function usePriorValue(name) {
  const ctx = React.useContext(FormContext);
  return ctx.priorValues?.[name];
}

export default Form;
