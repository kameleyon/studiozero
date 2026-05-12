/**
 * Synthetic source file — canary content for cli-no-upload.spec.ts.
 *
 * The unique string SYNTHETIC_CANARY_d3adb33fc0ffee below MUST NOT appear in
 * any captured fetch body. If it does, the network-tap test fails and we have
 * a privacy-invariant regression (PRD §13.4: "CLI mode customer code: never
 * leaves the customer's machine").
 */
export const SYNTHETIC_CANARY = "SYNTHETIC_CANARY_d3adb33fc0ffee";

export function syntheticAdd(a: number, b: number): number {
  // Lorem ipsum filler so the file is plausibly source-shaped.
  // eslint-disable-next-line no-console
  return a + b;
}
