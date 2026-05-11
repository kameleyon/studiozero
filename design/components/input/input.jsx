"use client";
import React, { useId, useState } from "react";

/**
 * Input — Studio Zero design system.
 *
 * Covers text / email / password / textarea / select. The BYOK key slot is a
 * specialised configuration of this component — see input.md "BYOK key slot
 * specifics" for the SC 3.3.8 requirements.
 */
export const Input = React.forwardRef(function Input(
  {
    type = "text",
    id: idProp,
    label,
    value,
    defaultValue,
    onChange,
    placeholder,
    helperText,
    errorText,
    disabled = false,
    loading = false,
    revealable = false,
    autoComplete,
    inputMode,
    options = [],
    slotTrailing = null,
    eyebrow,
    required = false,
    name,
    rows = 4,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || `sz-input-${autoId}`;
  const helperId = helperText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-err` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  const [revealed, setRevealed] = useState(false);
  const effectiveType =
    type === "password" && revealable && revealed ? "text" : type;

  const dataState = errorText
    ? "error"
    : loading
      ? "loading"
      : disabled
        ? "disabled"
        : undefined;

  const commonProps = {
    id,
    ref,
    name: name || id,
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled,
    "aria-invalid": errorText ? "true" : undefined,
    "aria-describedby": describedBy,
    "aria-busy": loading || undefined,
    "aria-required": required || undefined,
    autoComplete,
    inputMode,
    ...rest,
  };

  return (
    <div className="sz-input" data-state={dataState}>
      {eyebrow ? (
        <span className="sz-input__eyebrow" aria-hidden="true">
          {eyebrow}
        </span>
      ) : null}

      <label className="sz-input__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="sz-input__req" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
      </label>

      <div className="sz-input__field">
        {type === "textarea" ? (
          <textarea className="sz-input__control sz-input__control--ta" rows={rows} {...commonProps} />
        ) : type === "select" ? (
          <select className="sz-input__control sz-input__control--sel" {...commonProps}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input className="sz-input__control" type={effectiveType} {...commonProps} />
        )}

        {revealable && (type === "password" || type === "text") ? (
          <button
            type="button"
            className="sz-input__reveal"
            aria-label={revealed ? "Hide" : "Show"}
            aria-pressed={revealed}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}

        {slotTrailing ? <div className="sz-input__slot">{slotTrailing}</div> : null}
      </div>

      {helperText && !errorText ? (
        <p id={helperId} className="sz-input__help">
          {helperText}
        </p>
      ) : null}

      {errorText ? (
        <p id={errorId} className="sz-input__err" role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
