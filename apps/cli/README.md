# Studio Zero CLI

Phase 9 M3 Batch 1 (Forge). The `studio-zero` CLI runs audits **on the
customer's machine** — source code never leaves the host. CLI verdicts
ship with a `Private Run · Self-Audited` watermark per PRD §7.2 Step D
and Decision D7.

## What this is

The CLI is the privacy-tier execution mode in PRD §8 (the third column).
It:

1. Pairs with a Studio Zero web account via a 6-character one-time code
   (`studio-zero login`).
2. Long-polls `/api/cli/jobs` for work using the pairing token (TB-7).
3. Runs each reviewer locally via the customer's own Claude Code
   installation (the customer's Anthropic relationship — Studio Zero
   never sees the prompt or response).
4. Streams progress + findings (metadata only — NO source bytes) back
   to the web app.
5. Signs the verdict with `HMAC-SHA256(verdict_body, key=binary_hash)`
   per D7 so the web can render the `Private Run · Self-Audited`
   watermark (transparency signal, not security claim).

Per PRD §13.4 + §13.5 the CLI is contract-bound to **never POST source
bytes**. The acceptance test
`tests/integration/cli-no-upload.spec.ts` (Verify, M3) is a network-tap
on the CLI process during a local-folder audit asserting zero
file-content bytes cross the wire.

## Install

```bash
# npm (primary distribution path)
npm install -g @studiozero/cli

# verify
studio-zero --version
studio-zero doctor
```

GitHub Release tarballs + signed Ed25519 manifest land at M3 Batch 2
(Cipher Fix-3c). Until then, only the npm install path is supported.

## Quickstart

```bash
# 1. Sign in to https://studio-zero.com → Settings → CLI; click "Generate code".
# 2. In your terminal:
studio-zero login
# Paste the 6-character code when prompted. The CLI stores a long-lived
# (90d) pairing token at ~/.studio-zero/auth.json with 0600 perms.

# 3. Run an audit on a local folder:
studio-zero run ./my-project

# 4. Check status:
studio-zero status

# 5. Diagnose problems (no Claude Code? expired token? offline?):
studio-zero doctor

# 6. Unpair:
studio-zero logout
```

## Commands

| Command                  | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `studio-zero login`      | Pair this device with a Studio Zero web account (6-char one-time code). |
| `studio-zero status`     | Print pairing state, last verdict, current binary hash.                 |
| `studio-zero logout`     | Revoke this device's pairing token (server-side + local file delete).   |
| `studio-zero run [path]` | Run an audit on a local folder. Source never uploaded.                  |
| `studio-zero doctor`     | Diagnose: pairing? Claude Code installed? Network reachable? Perms?     |
| `studio-zero --version`  | Print the CLI version + binary hash.                                    |

## Configuration

The CLI reads config from `~/.studio-zero/config.json` and env vars:

| Env / config key            | Default                                      | Purpose                                                  |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `STUDIOZERO_API_URL`        | `https://studio-zero.com`                    | Base URL for the web app's `/api/cli/*` endpoints.       |
| `STUDIOZERO_CONFIG_DIR`     | `~/.studio-zero`                             | Where the auth file + config live.                       |
| `CLAUDE_CODE_BIN`           | autodetect (`anthropic-claude-code` on PATH) | Override Claude Code CLI binary path.                    |
| `STUDIOZERO_MOCK_REVIEWERS` | `true` (M3 default)                          | When true, reviewers return canned findings. M3+1 flips. |
| `LOG_LEVEL`                 | `info`                                       | `debug` / `info` / `warn` / `error`.                     |

The CLI **never** accepts these env vars (refuses to start if present):

- `ANTHROPIC_API_KEY` — the CLI uses the customer's own Claude Code
  install, which has its own key relationship. We do not want to muddy
  that contract.
- `SUPABASE_SERVICE_ROLE_KEY` — the CLI is a customer-machine surface
  and must not be able to bypass RLS in any code path.

## Privacy invariant (PRD §13.4 + §13.5)

> The CLI NEVER uploads source code.

The only payloads POSTed back to the web are:

- progress events (`AuditEvent` per `apps/runner/schemas/audit-event.v1.ts`)
- findings (structured, redacted, with locked schema fields)
- the final verdict (with HMAC-SHA256 signature, key=binary_hash)
- heartbeats (30s, no payload bytes beyond `device_id` + `version`)

The acceptance test `tests/integration/cli-no-upload.spec.ts` is a
network-tap that asserts zero file-content bytes cross the wire during
a local-folder audit. That test is an M3 exit-gate item.

## D7 watermark (CLI verdict transparency)

Every verdict the CLI emits is signed:

```
signature = HMAC-SHA256(JSON.stringify(verdict_body), key=binary_hash)
```

The server has the binary hash from the npm publish provenance (M3
Batch 2 Cipher Fix-3c). On verdict ingest:

- **hash registered + signature matches:** render with the locked
  `Private Run · Self-Audited` badge per PRD §7.2 Step D.
- **hash registered + signature mismatch:** render with red-banner
  C-TAMPER copy (verdict still shown — D7 is a transparency signal,
  not a security claim against the customer themselves).
- **hash NOT registered (unofficial build):** render with amber-banner
  copy + "Re-run on hosted infra" CTA.

Per D7 the watermark is **transparency**, not a security guarantee.
Marketing copy must not say "tamper-detected." Product copy uses the
locked Herald frame.

## Pairing token security

- Stored at `~/.studio-zero/auth.json` with `0600` perms (read/write
  owner-only).
- The token is opaque (no embedded JWT claim — server-side lookup).
- Revocable via the web app **or** `studio-zero logout`.
- Per-device-fingerprint binding — a token stolen and replayed from a
  different machine is rejected at TB-7.
- 90-day TTL with refresh on use (the `refresh.ts` module). Expired
  tokens require re-pair via `studio-zero login`.

## What's mocked at M3

| Surface                   | M3 state                       | M3+1 plan                                                |
| ------------------------- | ------------------------------ | -------------------------------------------------------- |
| Reviewers                 | canned mock findings           | real Claude Code subprocess (`runReviewerViaClaudeCode`) |
| Pairing token refresh     | spec'd, returns mock token     | real `/api/cli/refresh` round-trip                       |
| Long-poll `/api/cli/jobs` | spec'd, returns empty + sleeps | real long-poll with backoff                              |
| Heartbeat                 | spec'd                         | real 30s pings (ARCH-D10 `cli_heartbeat`)                |
| Ed25519 manifest verify   | not yet                        | Cipher Fix-3c (M3 Batch 2)                               |

What is REAL at M3: command dispatch (commander), env validation,
pairing-token file storage + 0600 perms, verdict signing
(`HMAC-SHA256(verdict, key=binary_hash)`), Claude Code detection on
PATH, watermark text constants (locked Herald copy), HTTP client
carrying pairing token, AI Act `X-AI-Generated` header on the CLI's
outbound POSTs.

## Endpoints consumed (web side; spec'd here, implemented in next Forge dispatch)

| Method | Path                           | Purpose                                     |
| ------ | ------------------------------ | ------------------------------------------- |
| POST   | `/api/cli/pair/init`           | Generate a 6-char pairing code. CLI calls.  |
| POST   | `/api/cli/pair/confirm`        | Web confirms code (user pastes in browser). |
| DELETE | `/api/cli/pair`                | Unpair this device.                         |
| POST   | `/api/cli/refresh`             | Refresh the pairing token before expiry.    |
| GET    | `/api/cli/jobs`                | Long-poll for queued jobs (TB-7).           |
| POST   | `/api/cli/runs/:runId/events`  | Progress + finding events (metadata only).  |
| POST   | `/api/cli/runs/:runId/verdict` | Final signed verdict.                       |

All requests carry `Authorization: Bearer <pairing-token>` (TB-7).
All responses + outbound CLI requests carry `X-AI-Generated: studio-zero`
per PRD §11.3 + AI Act Art. 50.

## CLI mode is BYOK-of-Claude-Code

Per PRD §8 the CLI does NOT call Cipher's LLM gateway:

- BYOK mode = customer's Anthropic key in Vault → Cipher gateway → Anthropic.
- **CLI mode = customer's Claude Code install (their own key + sub) → Anthropic.**
- Managed mode = Jo's Anthropic key → Cipher gateway → Anthropic.

The implication for Cipher Fix-2: the LLM gateway is bypassed in CLI
mode. The customer's Claude Code installation IS their Anthropic key
relationship; we don't intermediate.

## Cross-references

- `ia/user-flows/cli-pairing-and-tamper.md` — the locked flow (Trace).
- PRD §8 (three modes) + §7.2 Step D (watermark UX) + §17 D7 (lock).
- `architecture/system-diagram.md` — TB-7 (CLI ↔ Web) + the 3d. CLI
  Code audit data flow.
- `architecture/database/tables.sql` — `cli_pairings` table (Atlas).
- `apps/runner/` — the hosted runner. CLI shares its reviewer
  contract + `AuditEvent` schema.
- `sprint/milestone-M3.md` — M3 scope + exit gates.
- `brand/samples/05-error-messages.md` §1 — CLI offline copy (Herald).
