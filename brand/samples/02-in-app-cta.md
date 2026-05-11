# Sample 02 — In-app CTA copy

**Surface:** dashboard, verdict screen, settings, upgrade cards.
**Voice check:** sentence case. No trailing periods on buttons. Single arrow glyph per screen. Grade 8.

---

## 1. Free-tier upgrade card (dashboard)

**Card heading:**
> You're on the free plan.

**Body:**
> Free covers unlimited Surface re-audits on one project. Code and Full audits read your source — they find 3 to 5 times as many issues.

**Primary CTA:**
> Upgrade to Code →

**Secondary CTA (text link, no arrow):**
> Compare plans

**Voice notes:**
- "3 to 5 times as many issues" is a comparative claim — file `marketing/claims-substantiation/claim-code-vs-surface-findings.md` must back it with audit data before launch.
- Avoids the words *unlock*, *upgrade now*, *boost*. The benefit is the number; the number is the copy.

---

## 2. FAIL-state primary CTA

Surface determines the CTA. Hook + PRD §7.2 Step D lock these three variants:

**Surface SKU → FAIL or PASS WITH FIXES:**
> Run the Code audit →

**Code or Full SKU → FAIL (MVP, pre-V1.5):**
> See every finding →

**Code or Full SKU → FAIL (V1.5, Auto-PR live):**
> Ship the fixes — $49 →

**Secondary CTA on every FAIL screen (text link):**
> Export the report

**Voice notes:**
- No "Fix it now," "Get help," or "Don't worry." The verdict speaks; the CTA acts.
- The price in the V1.5 button is part of the copy, not a separate badge. Premium services price-tag in the open.

---

## 3. PASS WITH FIXES — re-audit CTA

**Verdict-screen primary CTA:**
> Re-audit free for 30 days →

**Card on the dashboard when a re-audit is available:**
> Re-audit window: 23 days left.
> **Re-audit now →**

**Email-mirror CTA (matches E3):**
> Re-audit free →

**Voice notes:**
- Lead with the number ("30 days," "23 days left"). The window is the offer; the offer is the conversion.
- No countdown timer animation. Number + word is enough. Animation distracts from the findings.

---

## 4. Settings — save button

**Primary save button (BYOK key, GitHub connection, notification prefs):**
> Save changes

**State after success (3-second toast, then revert):**
> Saved.

**State when nothing has changed (button disabled):**
> Save changes

**State during save (button disabled, spinner inline):**
> Saving…

**State on failure:**
> Could not save. Check your connection and try again.

**Voice notes:**
- "Save changes" not "Update," not "Submit," not "Apply." Save is the verb the user expects.
- Success toast is one word with a period. No checkmark emoji.
- Failure copy points to action ("Check your connection"). No apology, no error code in the user-facing string (error code goes to the log).

---

## 5. Microcopy reference set (other recurring buttons)

| Context | Copy |
|---|---|
| Start a new audit | New audit → |
| Cancel a running audit | Cancel run |
| Delete a project (destructive) | Delete project… |
| Confirm a destructive action | Yes, delete |
| Cancel out of a destructive dialog | Keep it |
| Connect GitHub | Connect GitHub → |
| Reconnect after token expiry | Reconnect GitHub |
| Pair the CLI | Pair this device → |
| Copy a finding's fix to clipboard | Copy fix |
| Mark a finding won't-fix | Mark won't-fix |
| Undo a won't-fix | Undo |
| Export the report | Export report |
| Share a PASS verdict | Share verdict → |

**Trailing ellipsis (…) on a button** means "this opens a confirmation or dialog before the action runs." We respect that convention.
