# Studio Zero — QA Checklists

Per-vertical pre-launch checklists used by the Audit panel (Halo, Optic, Probe, Shield, Verify, Ledger). Every project of the matching vertical must pass these before a `PASS` verdict is possible.

## Files
- `web-vitals.md` — Core Web Vitals (LCP, CLS, INP) — owned by Prism, checked by Optic/Halo
- `wcag-aa.md` — WCAG 2.2 Level AA — owned by Access, audited by Halo
- `owasp-top-10.md` — OWASP Top 10 (2021) — owned by Shield, supported by Verify
- `stripe-pci.md` — Stripe PCI posture — owned by Ledger, checked by Comply

## How they're used
1. Pipeline runs the relevant automated checks per vertical (Lighthouse, axe-core, OWASP ZAP)
2. Audit panel reviews against the manual items not covered by automation
3. Findings flow through the Verdict → audit-action → tickets pipeline
