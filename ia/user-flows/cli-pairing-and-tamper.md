# Flow: CLI Pairing & Watermark (D7)

**Owner:** Trace
**Personas affected:** §5 Solo founder technical, Indie agency / freelancer (privacy-sensitive), Engineering lead at small startup (regulated codebases).
**Mode applicability:** CLI only. Other modes do not pair; their watermark state is null.
**Acceptance test:** `tests/acceptance/e2e/cli-pair-happy.spec.ts` + `tests/acceptance/e2e/cli-pair-expired.spec.ts` + `tests/acceptance/e2e/cli-version-mismatch.spec.ts` + `tests/acceptance/integration/cli-verdict-signature-tampered.spec.ts` (PRD M3 exit gate).
**PRD references:** §6.4 CLI Companion, §7.2 Step D watermark spec, §8 Three modes, §13.3 runner contract, §17 D6 (Managed before CLI; CLI is M3), §17 D7 (watermark frame: transparency signal, not security claim).

---

## State diagram (ASCII)

```
                  ┌───────────────────────┐
                  │ C0  Web: pick CLI mode│  from signup-to-first-verdict.md S5b
                  └───────────┬───────────┘
                              │ click "Download CLI"
                              ▼
                  ┌───────────────────────┐
                  │ C1  Download page     │  OS-detected: macOS / Linux / Windows
                  │                       │  + brew install / npm i -g instructions
                  └───────────┬───────────┘
                              │ user installs (out of our app)
                              ▼
                  ┌───────────────────────┐
                  │ C2  Web: "Run         │  shows pairing code (6 chars, 5-min TTL)
                  │ studio-zero login"    │  + countdown timer
                  └───────────┬───────────┘
                              │ user runs CLI command
                              ▼
                  ┌───────────────────────┐
                  │ C3  CLI: prompts for  │  CLI process opens browser auth tab
                  │ pairing code          │  (OR pastes code manually)
                  └───────────┬───────────┘
                              │ CLI sends code + device fingerprint
                              │ + version + binary hash to web
                              ▼
                  ┌───────────────────────┐
                  │ C4  Web validates     │  · code matches + not expired ?
                  │                       │  · version compatible ?
                  │                       │  · binary hash registered ?
                  └────┬──────────────┬───┘
                       │ ok           │ fail
                       ▼              ▼
                  ┌──────────┐  ┌─────────────────┐
                  │ C5 Paired│  │ C-FAIL          │
                  │ heartbeat│  │ · expired       │
                  │ ready    │  │ · version mismatch
                  └────┬─────┘  │ · hash unknown  │
                       │        └────────┬────────┘
                       │                 │
                       │            ┌────┴────────┐
                       │            │             │
                       │       regenerate     upgrade
                       │            │             │
                       └────────────┼─────────────┘
                                    │
                                    ▼
                  ┌───────────────────────┐
                  │ C6  Run dispatched to │  see audit-run-state-machine.md
                  │ CLI                   │
                  └───────────┬───────────┘
                              │ run completes; CLI signs verdict
                              ▼
                  ┌───────────────────────┐
                  │ C7  CLI emits         │  verdict + score + findings + signature
                  │ verdict to web        │  (signed with binary hash)
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │ C8  Web verifies      │  re-compute expected signature
                  │ signature             │
                  └────┬──────────────┬───┘
                       │ ok           │ mismatch
                       ▼              ▼
                  ┌─────────────┐ ┌──────────────────┐
                  │ C9 Render   │ │ C-TAMPER         │
                  │ verdict     │ │ render verdict   │
                  │ + D7        │ │ + red banner     │
                  │ watermark   │ │ (D7: transparency│
                  └─────────────┘ │ signal, no claim)│
                                  └──────────────────┘
```

---

## States

### C0 — Web: pick CLI mode (= S5b entry)

Per signup-to-first-verdict.md S5b. Skip if already paired.

### C1 — Download page

- **Renders:** OS-auto-detected primary download button. Per-OS install instructions (`brew install studio-zero` / `npm install -g studio-zero` / `winget install studio-zero`). Binary checksums published for verification (Herald + Comply transparency).
- **Forward:** user installs externally; UI is informational. "I've installed it →" button advances to C2.
- **Back/cancel:** "Back to mode picker" → S4. "Skip — I'll pair later" → dashboard with CLI unpaired badge.
- **What can go wrong:**
  - User's OS not supported (e.g., 32-bit ARM Linux) → notice with link to manual-build instructions; fallback to BYOK mode.
  - Downloaded binary doesn't match published checksum → user is asked to redownload (we don't gate; we inform).

### C2 — Web: show pairing code

- **Renders:** 6-character code in large monospace + 5-minute countdown + instructions: "Open your terminal and run `studio-zero login`. Paste this code when prompted." Below: "Regenerate code" link (resets countdown).
- **Forward:** poll `cli_pairings.paired_at` every 2s. On detection → C5.
- **Back/cancel:**
  - "Back" → C1.
  - "Skip for now" → dashboard with CLI unpaired.
- **Data persisted:** `cli_pairings` row: `pairing_code_hash`, `expires_at = now + 5 min`, `paired_at = null`.
- **What can go wrong:**
  - Code expires before CLI registers → countdown hits zero → "Code expired. Generate a new one?" with a single button. New code overwrites the row.
  - Multiple regenerations in 1 min → rate-limit at 5/min per user to prevent enumeration.
  - User pastes the code into the web UI by mistake → no-op (code is sent FROM the CLI, not entered in the web).

### C3 — CLI: prompts for code

- **CLI renders (terminal):**
  ```
  studio-zero login
  Visit https://studio-zero.com/cli/pair to get your pairing code.
  Or press Enter to open the page in your browser.
  Paste pairing code: ______
  ```
- **Forward:** user pastes → CLI POSTs to web with code + device fingerprint (machine-id, OS, CPU arch) + CLI version string + CLI binary SHA-256 hash → C4.
- **Back/cancel:** Ctrl-C exits CLI cleanly; CLI process state cleared.
- **What can go wrong:**
  - User pastes wrong code → web rejects → CLI prints "Code didn't match. Try again or get a fresh code from the dashboard." Loops back to prompt.
  - CLI cannot reach web (no internet, firewall) → CLI prints "We can't reach studio-zero.com. Check your network and try again." Exits with code 1.
  - CLI cannot read `~/.studio-zero/` (permissions) → CLI prints clear error with chmod hint; exits.

### C4 — Web validates

Server-side validation order:

1. **Code match** — pairing_code_hash matches a non-revoked row.
2. **Not expired** — `now < expires_at`.
3. **Version compatible** — CLI version is in the supported range (`runner-version-policy.json`).
4. **Binary hash registered** — CLI's binary SHA-256 is on the published-builds list (we publish every official build's hash).

Pass → C5. Fail → C-FAIL with one of:

- `pairing_code_invalid` → "That code didn't match or has expired."
- `pairing_code_expired` → "That code has expired. Get a fresh one from the dashboard."
- `cli_version_too_old` → "Your CLI is older than what we support. Run `studio-zero upgrade` and try again."
- `cli_version_too_new` → "Your CLI is newer than what we support. Either downgrade, or wait — we're catching up." (rare; pre-release builds)
- `cli_binary_hash_unknown` → "We don't recognize this CLI binary. Did you download it from somewhere other than `studio-zero.com/download`?" (D7 lock: this is a transparency message, not a security claim — we cannot prevent customers from running modified binaries; we just transparently flag.)

### C5 — Paired, heartbeat ready

- **Renders web:** "CLI connected ✓ from `<hostname>` (`<os>`)". Continue → S6 of signup-to-first-verdict.md.
- **CLI prints:** "Paired with `<user_email>` ✓ Studio Zero ready. Run audits from the web app or with `studio-zero run`."
- **Forward:** to S6 (web). CLI runs as a background heartbeat (1 ping / 30s).
- **Back/cancel:** "Unpair" link in S-CLI settings. Unpair revokes the pairing row; CLI's next heartbeat receives a 401 + clears local state.
- **Data persisted:** `cli_pairings.paired_at`, device fingerprint, binary hash, version.

### C-FAIL — Pairing failed

- **Renders depending on subcode:**
  - **Code invalid/expired:** "That code didn't match or has expired. [Generate a new code →]"
  - **Version too old:** "Your CLI is older than what we support. Open a terminal and run `studio-zero upgrade`, then try again. [Show pairing code]"
  - **Version too new:** "Your CLI is newer than the server expects. [Show me the version policy] or [Switch to a supported version]."
  - **Binary hash unknown:** "We don't recognize this CLI binary. If you got it from somewhere other than `studio-zero.com/download`, please download our official build to make sure pairing works. [Download official build]. If you built from source, contact us."
- **Forward:** every subcode has a forward action (regenerate / upgrade / download / contact).
- **Back/cancel:** "Switch to BYOK mode" link always present.
- **What can go wrong:** customer is on a corp network with binary-hash mismatch because IT proxied the download and modified the binary → contact-us path; rare.

### C6 — Run dispatched to CLI

Per audit-run-state-machine.md `dispatched` state. CLI receives the job, executes the runner locally against the user's Claude Code installation, streams events back. Source code never leaves the customer's machine (the wedge of CLI mode).

### C7 — CLI emits verdict to web

- **CLI does:**
  1. Compose AuditOutput per PRD §9.4 schema.
  2. Compute signature = HMAC-SHA256(verdict_bytes, key = binary_hash) — the binary's own hash is the key, so a tampered binary produces an undetectable-but-different signature.
  3. POST verdict + signature + binary hash to web.
- **Forward:** web receives → C8.
- **What can go wrong:** network drops mid-POST → CLI retries with idempotency key (run_id); webhook is idempotent server-side.

### C8 — Web verifies signature

Server-side:

1. Look up the CLI's claimed binary_hash against the published-builds list.
2. If hash is **on the list**: re-compute HMAC(verdict_bytes, binary_hash). If matches → set `runs.watermark = "private-run-self-audited"` per PRD §9.4 and verify-pass. → C9.
3. If hash is **on the list but signature doesn't match** → integrity violation (the CLI claimed an official build but produced a signature inconsistent with that build's expected behavior) → `runs.signature_status = "mismatch"` → C-TAMPER.
4. If hash is **not on the list** (unofficial build) → `runs.signature_status = "unrecognized_binary"` → C-TAMPER (with different banner copy).

**Locked posture (D7):** we **never claim** that signature verification proves the verdict is "trustworthy." Per D7 lock: the watermark is a **transparency signal to the customer, not a security guarantee against the customer themselves.** Marketing copy must not say "tamper-detected"; product copy uses neutral framing.

### C9 — Render verdict with D7 watermark

- **Renders per PRD §7.2 Step D + Halo's HC1/HC10 specs:**
  - Verdict line, score, findings as normal.
  - **Below verdict line:** `Private Run · Self-Audited` badge (Herald-locked label, D7).
  - Help-text via `aria-describedby` (SC 1.3.1 + SC 3.2.4): *"This verdict was produced on your machine and not independently re-verified by Studio Zero infrastructure. Findings remain on your device."*
  - Visual treatment: text + icon + a non-color attribute (per SC 1.4.1) so colorblind users see the badge without relying on color.
  - Identical render across CLI verdict page, exported reports, and (V1.5) PR body per HC9.
- **Forward:** standard verdict-to-upsell-loop.
- **Back/cancel:** standard.

### C-TAMPER — Render verdict with red banner (signature mismatch OR unrecognized binary)

- **Renders:**
  - **For `signature_status = "mismatch"`:** red banner above the verdict: "We couldn't verify this verdict was produced by the CLI binary it claims. Findings are shown but we recommend re-running on hosted infra to confirm." Two CTAs: "Re-run on BYOK →" / "Re-run on Managed →".
  - **For `signature_status = "unrecognized_binary"`:** amber banner: "This verdict came from a CLI build we don't publish. We're showing the findings as-is — if you built from source, that's expected. Re-run on hosted infra if you want a verified verdict." Two CTAs as above.
  - In both cases: verdict findings still render. D7 lock means we **do not block** the customer from seeing their own verdict on their own machine — the watermark is the customer's transparency contract.
- **Forward:** "Re-run on BYOK / Managed" → S6 with mode pre-switched.
- **Back/cancel:** "Back to dashboard" always.
- **Data persisted:** `runs.signature_status`, `audit_logs` security event.

---

## Edge cases

### EC-1 — Pairing code expires mid-flow

**Trigger:** user runs `studio-zero login` 6 minutes after generating code (TTL is 5 min).
**What user sees CLI-side:** "Code expired. Get a fresh one from the dashboard."
**What user sees web-side:** countdown shows "Expired" with "Generate a new code" button.
**System does:** old row marked expired; new row issued with fresh TTL.
**Recovery:** one click; no data loss.

### EC-2 — CLI version too old

**Trigger:** user has CLI v0.3.0; server requires ≥ v0.5.0.
**What user sees CLI-side:** "Your CLI is older than what we support. Run `studio-zero upgrade` and try again." Exits.
**What user sees web-side:** at C-FAIL: "Your CLI version is older than we support. Update and try again." Pairing code remains valid until TTL.
**System does:** rejects pairing; logs version mismatch.
**Recovery:** CLI upgrade is a single command; re-pair after.

### EC-3 — CLI version too new (pre-release on user's machine)

**Trigger:** user installed a beta CLI.
**What user sees:** "Your CLI is newer than the server expects. Downgrade, or wait for the server update." Notes which versions are supported.
**System does:** rejects pairing; logs.
**Recovery:** user installs a stable version, re-pairs.

### EC-4 — Binary hash unknown (modified CLI)

**Trigger:** customer rebuilt the CLI from source with a local patch.
**What user sees:** C-FAIL: "We don't recognize this CLI binary. If you got it from somewhere other than studio-zero.com/download, please download our official build to make sure pairing works." Optional: "I built from source — [Contact us]" link.
**System does:** rejects pairing for safety.
**Recovery:** customer downloads official build OR contacts us to register a custom build (rare; enterprise customers).

### EC-5 — Verdict signature mismatch (rare; integrity failure on official binary)

**Trigger:** an official-binary CLI produces a verdict whose signature doesn't validate (e.g., race condition, memory corruption, or — rarely — a tampered binary claiming an official hash).
**What user sees:** C-TAMPER red-banner version. Verdict findings still render.
**System does:** logs critical event; `audit_logs` entry; if a pattern emerges across many users, on-call paged.
**Recovery:** customer re-runs on hosted infra to get a verified verdict.

### EC-6 — CLI heartbeat lost during pairing

**Trigger:** between C5 (paired) and S6 (continue to intake), CLI process killed.
**What user sees web-side:** when user proceeds to S6, the intake check detects CLI offline → error-messages.md §1 copy.
**System does:** pairing row remains valid (paired_at is set); CLI just needs to come back online.
**Recovery:** restart CLI → heartbeat resumes → flow continues.

### EC-7 — User pairs from two devices simultaneously

**Trigger:** two `studio-zero login` invocations on different machines.
**What user sees:** both can pair; both appear in S-CLI settings as separate devices. The web's "active CLI" picker (in S-NAV header) lets the user pick which device runs the next job.
**System does:** `cli_pairings` rows per device; runs dispatched per active selection.
**Recovery:** "Revoke" any device from S-CLI; see settings-and-account-management.md.

### EC-8 — CLI offline at run time

Per audit-run-state-machine.md EC-6 (5-min reconnect window, then `failed_recoverable`).

### EC-9 — Customer claims their verdict was tampered with (third-party adversarial scenario)

**Trigger:** customer's CLI was compromised by a third party (malicious developer on their team, malware) and produced a fraudulent PASS verdict.
**What user sees:** the watermark IS the safeguard — anyone reading the verdict sees `Private Run · Self-Audited` and the help-text per D7. **We do not claim to detect or prevent this scenario.** D7 lock: the watermark is a transparency signal, not a security guarantee.
**System does:** the watermark is unstrippable from the verdict (cryptographically bound — present in the render and (V1.5) the PR body).
**Recovery:** the customer or their consumer can re-run on hosted infra for a non-CLI-watermarked verdict.

### EC-10 — Pairing code phishing

**Trigger:** attacker tries to phish a pairing code from the customer.
**What user sees:** the pairing code is only useful to whoever has the CLI binary AND can communicate from the user's network — and the code expires in 5 min. The attack surface is narrow.
**System does:** pairing codes are single-use; rate-limited.
**Recovery:** if customer suspects phishing, regenerate the code from S-CLI.

---

## Acceptance criteria (binary, testable)

**Happy:**
- **Given** a fresh CLI install and a logged-in web user at C2 with a valid pairing code,
- **When** the user runs `studio-zero login` and pastes the code,
- **Then** within 5s the web shows "CLI connected ✓", `cli_pairings.paired_at` is set, the CLI prints "Paired with `<email>` ✓", and the user is advanced to S6.

**Unhappy 1 — pairing code expired:**
- **Given** a pairing code generated > 5 minutes ago,
- **When** the CLI POSTs it,
- **Then** the server rejects with `code: 'pairing_code_expired'`, the CLI prints the recovery copy, and the web's "Generate a new code" button issues a fresh code in one click.

**Unhappy 2 — CLI version mismatch:**
- **Given** a CLI version below the minimum supported,
- **When** the CLI attempts to pair,
- **Then** the server rejects with `code: 'cli_version_too_old'`, the CLI prints the upgrade hint, and the web's C-FAIL screen explains the mismatch.

**Unhappy 3 — verdict signature mismatch surfaces watermark + banner:**
- **Given** a CLI-emitted verdict whose computed signature doesn't match the claimed binary hash,
- **When** the verdict reaches C8 for verification,
- **Then** `runs.signature_status = 'mismatch'`, the verdict screen renders C-TAMPER (red banner + verdict findings + Re-run-on-hosted CTAs), an `audit_logs` security event is written, and the watermark text per D7 is rendered without claiming "tampered" in user-facing copy.

**Unhappy 4 — watermark is unstrippable across surfaces:**
- **Given** a CLI-mode verdict at C9 with `watermark = 'private-run-self-audited'`,
- **When** the verdict is shared (V2c) or emitted in a (V1.5) PR body,
- **Then** the `Private Run · Self-Audited` text + icon + help-text render in every surface, the help-text is `aria-describedby`-linked per SC 1.3.1, and removing the watermark is not surfaced as an option in any UI.

---

## Open questions

- **OQ-1 (for Shield + Comply):** EC-4 (binary hash unknown) — what's the customer-success path for enterprises that build the CLI from source for security review? Recommend a "registered builds" allowlist that enterprise customers can populate; flag for V2 enterprise tier.
- **OQ-2 (for Optic):** the C-TAMPER red banner copy must be **transparency**, not **accusation** (D7 lock). Recommend Herald + Comply review the locked copy before Phase 4.
- **OQ-3 (for Atlas + Cipher):** the binary-hash-as-HMAC-key approach (C7) prevents undetected swap-of-verdict-bytes but doesn't prevent a hostile CLI from producing a syntactically-valid verdict (e.g., always returning PASS). D7 acknowledges this. Confirm with Shield that we're not over-claiming.
- **OQ-4 (for Halo):** C9 watermark render — across web, exported reports, and (V1.5) GitHub PR body Markdown, the render must be identical per SC 3.2.4 *Consistent Identification*. Confirm with Halo that the cross-surface tokens are locked in brand/tokens.json.
- **OQ-5 (for Stream):** EC-7 (multi-device pairing) — "active CLI" picker in S-NAV header. Should the active device default to most-recently-online, or stick to last-selected? Recommend last-selected for predictability; flag for Optic.
