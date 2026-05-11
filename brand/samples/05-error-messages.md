# Sample 05 — Error messages

**Surface:** dashboard, CLI, API responses, settings, run viewer.
**Voice check:** grade 6. Action-oriented. No jargon. No error codes in the user-facing string (error codes go to the log + telemetry, not the visible string).
**Frame:** *what happened (1 sentence) → what to do (1 sentence) → optional fallback*.

Reading-level note: error messages appear at the worst moment of the user's day. They are the only surface allowed to drop to grade 6.

---

## 1. CLI offline

**Surface:** dashboard when the paired CLI hasn't pinged the server in > 60 seconds and a job is queued for CLI-mode execution.

**Heading:**
> Your CLI isn't connected.

**Body:**
> Open a terminal and run `studio-zero login`. Once the CLI is online, this run will start automatically.

**Action buttons:**
> [ Show the pairing code ]    [ Switch to BYOK mode ]

**Voice notes:**
- "Your CLI" — possessive earns ownership without blame.
- The fallback ("Switch to BYOK mode") respects the user's time.
- No "Error 503" or "Connection refused" in the user string.

---

## 2. Payment required

**Surface:** any flow that requires a paid tier — Code audit on free plan, Auto-PR (V1.5) without subscription, exceeded free quota.

**Heading:**
> This needs a paid plan.

**Body:**
> The Code audit reads your source — it's part of the BYOK Starter plan and above. Pick a plan to continue, or stay on the free Surface audit.

**Action buttons:**
> [ See plans → ]    [ Stay on free Surface ]

**Voice notes:**
- "This needs" not "You need" — keeps the message on the action, not the person.
- Names the benefit of the paid tier in one clause ("reads your source") — converts in the error itself.
- The "stay on free" option is offered without sarcasm or guilt.

---

## 3. Run failed (irrecoverable)

**Surface:** verdict screen when the runner exited with `kind: 'error', recoverable: false` per the AuditEvent contract.

**Heading:**
> This run stopped before finishing.

**Body:**
> Something went wrong on our side. We've credited your audit back to your account and logged the details for our team. You can retry now — or contact us if it happens again.

**Action buttons:**
> [ Retry the audit ]    [ Contact us ]

**Refund line (only when the run was on the Managed tier or used Surface-paid credits):**
> 1 audit credit returned to your account.

**Voice notes:**
- "On our side" — owns the failure without being theatrical about it.
- The credit-return is a single sentence, not a section.
- "Contact us" is a real link; replies are read.
- Never *"Oops! Something went wrong."* The word *oops* is banned.
- Never the raw stack trace in the user string. The customer sees one line; the engineer sees the log.

---

## 4. Permission denied

**Surface:** GitHub App can't read the repo (token expired, app removed, repo permissions revoked), or RLS denied a row at runtime.

**Heading:**
> We can't reach this repo right now.

**Body:**
> Studio Zero's GitHub App may have been removed or its permissions changed. Reconnect to refresh access.

**Action buttons:**
> [ Reconnect GitHub → ]    [ Pick a different repo ]

**Voice notes:**
- "We can't reach" not "Access denied" — describes what happened from the user's vantage point.
- Names a likely cause ("may have been removed") without claiming certainty.
- Two paths forward, both useful.
- Never mentions RLS, JWT, scopes, or HTTP 403 in the user string. If the actual cause is RLS, the user message is identical; the log says everything.

---

## 5. Repo not found

**Surface:** customer pastes a GitHub URL we can't see (private repo without app install, deleted, typo).

**Heading:**
> We can't find that repo.

**Body:**
> Check the URL, or install the Studio Zero GitHub App on the org that owns it. If you typed it by hand, make sure the spelling and capitalization match.

**Action buttons:**
> [ Install the app → ]    [ Try again ]

**Voice notes:**
- "We can't find" — neutral. The repo might be there; from our position, it isn't visible.
- Names the two most common causes in plain order.
- "Spelling and capitalization" — GitHub is case-sensitive on org names and this catches the #1 user error.
- Never "404 Not Found" in the user string.

---

## Error-message frame (template for any new error)

```
Heading (≤ 6 words):   what happened, in plain words
Body (1–2 sentences):  what to do, in plain words
Action buttons:        primary action · fallback action
```

Every new error message gets graded by Proof against this frame and the grade-6 ceiling before it ships.

---

## What error messages never say

- *Oops!* / *Yikes!* / *Uh oh!*
- *Something went wrong.* (without the *what to do*)
- *Internal Server Error.*
- *Please contact your administrator.*
- *Try refreshing the page.* (as the only advice — vague, unhelpful)
- Any HTTP status code.
- Any stack trace or technical identifier.
- *Sorry for the inconvenience.*
- *We're working on it.*
- Any exclamation mark.
