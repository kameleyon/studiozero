/**
 * Button — Studio Zero design system. Server-component-friendly variant
 * of `design/components/button/button.jsx`. No `useState`; no client
 * hooks. Identical class contract so styles ship from `Button.css`.
 *
 * Variants: primary | ghost | destructive
 * Sizes:    sm | md | lg
 *
 * SC 2.1.1, 2.4.7, 2.4.13, 2.5.8, 3.2.4, 4.1.2.
 *
 * M1 TODO: extract shared design-system components into `packages/ui`
 *          so `apps/web` and `apps/runner` (dashboard) consume one
 *          source. At M0 we copy to avoid fragile cross-monorepo imports.
 */
import * as React from "react";

type Variant = "primary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

type AnchorButtonProps = ButtonOwnProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
    href: string;
  };

type NativeButtonProps = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
  };

export type ButtonProps = AnchorButtonProps | NativeButtonProps;

function classes(variant: Variant, size: Size, extra: string | undefined): string {
  const base = `sz-btn sz-btn--${variant} sz-btn--${size}`;
  return extra ? `${base} ${extra}` : base;
}

export function Button(props: ButtonProps): React.ReactElement {
  const {
    variant = "primary",
    size = "md",
    arrow = false,
    loading = false,
    iconLeft,
    className,
    children,
    ...rest
  } = props;

  const body = (
    <>
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
    </>
  );

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as AnchorButtonProps;
    return (
      <a
        href={href}
        className={classes(variant, size, className)}
        aria-busy={loading || undefined}
        data-state={loading ? "loading" : undefined}
        {...anchorRest}
      >
        {body}
      </a>
    );
  }

  const buttonRest = rest as NativeButtonProps;
  return (
    <button
      type={buttonRest.type ?? "button"}
      className={classes(variant, size, className)}
      aria-busy={loading || undefined}
      data-state={loading ? "loading" : undefined}
      disabled={loading || buttonRest.disabled}
      {...buttonRest}
    >
      {body}
    </button>
  );
}

export default Button;
