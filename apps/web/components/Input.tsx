"use client";

/**
 * Input — port of `design/components/input/input.jsx` with the BYOK key
 * variant from Halo HC5 / SC 3.3.8 wired natively (show/hide toggle,
 * autocomplete=off, paste supported, password-manager friendly).
 *
 * Variants:
 *   text     — default text input
 *   password — type=password
 *   byok     — Anthropic key paste flow:
 *                · autoComplete="off"
 *                · type defaults to "password" (mask)
 *                · show/hide toggle (keyboard-operable)
 *                · paste enabled (no `onPaste={e => e.preventDefault()}`!)
 *                · aria-describedby links to help text
 *                · spellCheck=false
 *
 * SC 1.3.1, 1.3.5, 1.4.3, 2.4.7, 3.3.1, 3.3.2, 3.3.7, 3.3.8.
 */
import * as React from "react";

type Variant = "text" | "password" | "byok" | "email";

interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "id" | "size"
  > {
  variant?: Variant;
  label: string;
  helpText?: string;
  errorText?: string;
  /** Surface the label as visually-hidden (still SR-readable). */
  hideLabel?: boolean;
}

let idCounter = 0;
function useId(prefix: string): string {
  const ref = React.useRef<string | null>(null);
  if (ref.current === null) {
    idCounter += 1;
    ref.current = `${prefix}-${idCounter}`;
  }
  return ref.current;
}

export function Input(props: InputProps): React.ReactElement {
  const {
    variant = "text",
    label,
    helpText,
    errorText,
    hideLabel = false,
    className,
    ...rest
  } = props;

  const id = useId("sz-input");
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const [revealed, setRevealed] = React.useState<boolean>(false);

  const isPasswordish = variant === "password" || variant === "byok";
  const inputType =
    variant === "byok"
      ? revealed
        ? "text"
        : "password"
      : variant === "password"
        ? revealed
          ? "text"
          : "password"
        : variant === "email"
          ? "email"
          : "text";

  // BYOK-specific safety overrides (HC5):
  const byokOverrides =
    variant === "byok"
      ? {
          autoComplete: "off" as const,
          spellCheck: false,
          autoCorrect: "off" as const,
          autoCapitalize: "off" as const,
          inputMode: "text" as const,
        }
      : {};

  return (
    <div
      className={`sz-input-field${errorText ? " sz-input-field--error" : ""}${className ? " " + className : ""}`}
    >
      <label
        htmlFor={id}
        className={hideLabel ? "sz-sr-only" : "sz-input-label"}
      >
        {label}
      </label>

      <div className="sz-input-wrap">
        <input
          id={id}
          type={inputType}
          className="sz-input"
          aria-describedby={describedBy}
          aria-invalid={errorText ? true : undefined}
          {...byokOverrides}
          {...rest}
        />
        {isPasswordish ? (
          <button
            type="button"
            className="sz-input-toggle"
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide value" : "Show value"}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      {helpText ? (
        <p id={helpId} className="sz-input-help">
          {helpText}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="sz-input-error" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
