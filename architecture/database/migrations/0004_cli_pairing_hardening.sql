-- ============================================================================
-- 0004_cli_pairing_hardening.sql  (STUB — delivered by M3)
-- ============================================================================
-- Milestone: M3 — CLI mode (PRD §16)
-- Owner:     Atlas + Shield + Vault
-- Gate:      CLI pairing tamper/replay/unpaired-rejection tests green;
--            external pentest exit ≤1 Major, 0 Critical (PRD §16 M3 gate);
--            settings-and-account-management.md S-CLI undo-within-5min works.
--
-- What ships here:
--   - cli_pairings.pairing_code_expires_at column + CHECK constraints.
--   - Replay-attempt counter columns (rate-limit incoming pair attempts).
--   - pg_trgm index on cli_pairings.hostname for search in S-CLI listing.
--   - Vault key-rotation hooks for oauth_tokens (per V1.5 prep).
--
-- Rollback: drop new columns + indexes. Pairing flow keeps working.
-- ============================================================================

-- TODO: M3 — pair-attempt rate-limit columns + hostname pg_trgm index.
SELECT 'M3 placeholder: see ia/user-flows/cli-pairing-and-tamper.md' AS status;
