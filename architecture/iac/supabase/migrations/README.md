# Supabase Migrations — Pointer

**This directory is intentionally empty of `.sql` files.**

The canonical migration set for Studio Zero lives at:

```
architecture/database/migrations/
```

— **owned by Atlas**, per `architecture/database/migration-order.md`.

The Supabase CLI is the runner that applies them. `supabase db push` reads from a configured migrations directory; we point that at the canonical Atlas-owned location via the CLI invocation, not a copy.

## How migrations apply at M0

1. Atlas writes `0001_initial.sql` at `architecture/database/migrations/0001_initial.sql` (M0 wk-2 deliverable per `sprint/milestone-M0.md`).
2. Locally:
   ```bash
   supabase link --project-ref <ref>
   supabase migration up --include-all   # picks up architecture/database/migrations/*
   # or
   psql $DATABASE_URL -f architecture/database/migrations/0001_initial.sql
   ```
3. In CI (M1+): Pipeline runs `supabase db push --linked` against staging on PR merge; against production on master merge (gated by CODEOWNERS approval + green CI matrix).

## Why no copy lives here

- **Single source of truth.** Migrations must not be duplicated; drift is the failure mode we're protecting against (R12 + Phase-5 Jury M1).
- **Atlas-owned.** Schema authority lives with Atlas; Terra (IaC) only owns _where_ it runs, not _what_ runs.
- **Supabase CLI is path-flexible.** The CLI accepts a path argument; we pass the canonical Atlas path.

## When this changes

If we ever split staging vs production migration sequences (we do not at MVP), this directory could hold IaC-specific overlay files (seed data per env, region-specific extension installs). At M0, none of that exists. Single migration set, applied identically to every environment.

## Cross-references

- `architecture/database/migration-order.md` — canonical migration sequence
- `architecture/database/migrations/0001_initial.sql` — first migration (Atlas, M0 wk-2)
- `architecture/iac/supabase/seed.sql` — local-dev seed data (NOT applied to staging/prod)
- `architecture/iac/supabase/config.toml` — CLI configuration

---

_Terra · Supabase migrations pointer · M0._
