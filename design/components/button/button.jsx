"use client";
import React from "react";

/**
 * Button — Studio Zero design system.
 *
 * Variants: primary | ghost | destructive
 * Sizes:    sm | md | lg
 *
 * All states surfaced via `data-state` for CSS targeting + AT clarity.
 * Brand-token-driven via design/components/button/button.css.
 *
 * SC 2.1.1, 2.4.7, 2.4.13, 2.5.8, 3.2.4, 4.1.2 — see button.md.
 */
export const Button = React.forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    as = "button",
    href,
    type = "button",
    disabled = false,
    loading = false,
    iconLeft = null,
    arrow = false,
    children,
    onClick,
    className = "",
    ariaLabel,
    ...rest
  },
  ref,
) {
  const isAnchor = as === "a";
  const Tag = isAnchor ? "a" : "button";

  const dataState = loading
    ? "loading"
    : disabled
      ? "disabled"
      : rest["data-state"] || undefined;

  // Native disabled is correct for <button>; <a> uses aria-disabled and
  // suppresses href to prevent keyboard activation while reading as disabled.
  const tagProps = isAnchor
    ? {
        href: disabled ? undefined : href,
        role: "button",
        tabIndex: disabled ? -1 : 0,
        "aria-disabled": disabled || undefined,
      }
    : {
        type,
        disabled: disabled || loading,
      };

  return (
    <Tag
      ref={ref}
      className={`sz-btn sz-btn--${variant} sz-btn--${size} ${className}`.trim()}
      data-state={dataState}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      onClick={disabled || loading ? undefined : onClick}
      {...tagProps}
      {...rest}
    >
      {loading ? (
        <span className="sz-btn__spinner" aria-hidden="true" />
      ) : iconLeft ? (
        <span className="sz-btn__icon" aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      <span className="sz-btn__label">{children}</span>
      {arrow ? (
        <span className="sz-btn__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </Tag>
  );
});

export default Button;
