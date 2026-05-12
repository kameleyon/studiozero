/**
 * Form — composition primitive. Wraps <form> with consistent spacing +
 * error-summary slot per Canvas spec.
 *
 * The Form component handles the SC 3.3.7 redundant-entry pattern by
 * accepting a `defaultValues` prop that the parent stores in
 * sessionStorage — left to the caller for M1 since the mock doesn't have
 * a multi-step intake-resume flow yet (M1+1 follow-up).
 *
 * SC 1.3.1, 1.3.5, 2.4.3, 3.3.1, 3.3.2, 3.3.7, 3.3.8.
 */
import * as React from "react";

interface FormProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  errorSummary?: React.ReactNode;
}

export function Form({
  children,
  errorSummary,
  className,
  ...rest
}: FormProps): React.ReactElement {
  return (
    <form
      className={`sz-form${className ? " " + className : ""}`}
      noValidate
      {...rest}
    >
      {errorSummary ? (
        <div className="sz-form-error-summary" role="alert" tabIndex={-1}>
          {errorSummary}
        </div>
      ) : null}
      {children}
    </form>
  );
}

export default Form;
