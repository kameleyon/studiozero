# Runner Egress Proxy — Design Spec (M1 spec, M1+1 implementation)

**Owner:** Pipeline (this file) + Shield (security review) + Cipher (key handling boundary) + Forge (runtime integration).
**Status at M1:** **SPEC ONLY.** Layer-3 enforcement ships at M1 via `network-policy.yaml` (Cilium CiliumNetworkPolicy). The egress proxy is the M1+1 deepening of ARCH-D9 — call this out in burndown for the M2 ticket-cut.
**Closes (M1):** ARCH-D9 belt — `architecture/decisions.md` line 388, `sprint/milestone-M1.md` exit gate.
**Closes (M1+1):** ARCH-D9 braces — TB-4 / TB-6 / §3.1 SSRF-redirect-hop mitigation (this spec).

## Why a separate proxy on top of NetworkPolicy

Cilium NetworkPolicy + `apps/runner/src/ssrf-guard.ts` (Forge-2 commit 43779fb) together close 95% of the egress attack surface:

| Layer                                                          | What it stops                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `ssrf-guard.ts` (app)                                       | Pre-resolve URL filtering. Catches literal-IP, scheme abuse, rebinder hostnames.                                                                        |
| 2. `network-policy.yaml` (host network)                        | Drops any egress to a destination not in the FQDN/CIDR allowlist at the kernel.                                                                         |
| 3. **Egress proxy (this spec)** — squid + custom redirect-jail | (a) DNS pinning to the cloud-provider resolver; (b) re-resolve & re-validate every redirect hop; (c) per-tenant rate limit; (d) UA + identity stamping. |

The 5% the proxy adds is the **redirect-chain re-validation** path — SSRF-025..027 in the corpus. Without a hop-by-hop re-validate, a benign initial URL (`https://customer-attested-host.com/redirect?to=...`) can elicit a 302 to a metadata IP that the kernel-level CIDR deny catches, but the app-layer URL filter never sees because the HTTP client follows redirects internally. The proxy interposes and rejects the redirect at issue.

## Architecture

```
runner-worker pod
       │
       │  HTTPS (PROXY env: https_proxy=http://egress-proxy:3128)
       ▼
egress-proxy pod (1 replica per cluster; HA at V2)
   ├── squid frontend (auth: mTLS cert pinned to runner-worker SA)
   ├── DNS resolver: pinned to <cloud-provider-resolver>:53
   │   (no public DNS — see §"DNS pinning" below)
   ├── redirect-jail middleware (custom; rust binary; in-proc with squid via ICAP)
   │   - intercepts every 3xx response
   │   - parses Location header
   │   - re-resolves the new hostname via the pinned resolver
   │   - re-validates the resolved IP against the same blocklist
   │     used by ssrf-guard.ts (RFC 1918, loopback, link-local,
   │     ULA, AWS IMDS, etc.)
   │   - drops the response if any hop fails
   └── per-tenant token-bucket rate limiter (cilium-style L7;
       keyed on the `X-Studiozero-Tenant` header that the runner
       MUST inject — Cipher Fix-3c, lands with this proxy)
       │
       ▼
   external destination (api.anthropic.com, api.github.com, …)
```

## DNS pinning

**The problem.** A misconfigured cluster resolver can be poisoned (cache attack, BGP hijack of the upstream resolver). Cilium FQDN policy intercepts replies for hostnames matching its `matchPattern` list and programs the eBPF map — if the upstream resolver returns `api.anthropic.com → 10.0.0.5`, FQDN policy will faithfully allow `10.0.0.5` (because that's the answer the resolver gave). The CIDR `egressDeny` we shipped in `network-policy.yaml` blocks 10.0.0.0/8 specifically to defeat THAT class of attack, but a more sophisticated answer (e.g., `api.anthropic.com → attacker-owned-VPS-185.x.x.x`) would slip through.

**The fix.** The egress proxy resolves via a CLOUD-PROVIDER resolver pinned by IP, not by hostname:

| Cloud provider                  | Resolver IPv4 to pin                                                            | Source                                                            |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Railway us-east substrate (GCP) | `169.254.169.254` is GCP metadata (BLOCKED); use `8.8.8.8` + `8.8.4.4` over DoT | https://cloud.google.com/compute/docs/internal-dns                |
| (fallback) Cloudflare DNS       | `1.1.1.1` + `1.0.0.1` over DoT (port 853)                                       | https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls |

DoT (DNS-over-TLS, port 853) is the wire format — squid's resolver stub is replaced by `unbound` with `forward-tls-upstream: yes`. Cert pinning on the resolver cert means a MITM that swaps the resolver cert breaks the chain.

The pinned resolver IPs are constants in the proxy's config map; they get reviewed at the same cadence as `architecture/secrets-rotation-runbook.md` (quarterly).

## Per-redirect re-validation

Every 3xx response with a `Location` header passes through the redirect-jail:

```rust
// pseudo-code; rust crate `egress-jail` in apps/egress-proxy/
fn intercept_redirect(req: &Request, resp: &Response) -> Action {
    if !is_redirect(resp.status) { return Action::Pass; }
    let target = parse_location_against_base(&resp.headers, &req.url)?;
    // Re-run the EXACT same validation the runner uses pre-fetch.
    // (Shared crate: `studiozero-egress-policy` — has the same
    // blocklist as ssrf-guard.ts; ts/rust dual-implementation kept
    // in sync by a parity test in CI.)
    let resolved = pinned_resolver.resolve(&target.host)?;
    if blocklist::is_blocked_ip(&resolved) { return Action::Drop; }
    if blocklist::is_blocked_host(&target.host) { return Action::Drop; }
    // Cap chain depth — RFC 7231 §6.4 SHOULD be ≤5; we hard-cap 3.
    if req.redirect_count >= 3 { return Action::Drop; }
    Action::Pass
}
```

This closes SSRF-025..027 in `runner/fixtures/ssrf-corpus/`. The parity test (`tests/security/ssrf-policy-parity.spec.ts`, M1+1) loads BOTH the TS classifier (`ssrf-guard.ts`) and the rust classifier and asserts identical reject/accept behaviour over the full corpus.

## Per-tenant rate limit (defense in depth vs runaway runners)

Cilium L7 rate limiting works on the `X-Studiozero-Tenant` header that the runner injects on every outbound. The bucket spec (matches PRD §14.4 free-tier ceiling + paid-tier multiplier):

| Tier            | Reqs/min to `api.anthropic.com` | Reqs/min to `api.github.com` | Reqs/min total egress |
| --------------- | ------------------------------- | ---------------------------- | --------------------- |
| Free            | 10                              | 30                           | 60                    |
| Starter ($29)   | 60                              | 120                          | 300                   |
| Pro ($79)       | 200                             | 240                          | 600                   |
| Enterprise (V2) | negotiated                      | negotiated                   | negotiated            |

The header is signed via HMAC-SHA256 over the tenant_id + minute-window with a key only the proxy holds (NOT the runner — the runner doesn't sign, the proxy verifies). The runner-to-proxy hop is mTLS so an attacker can't trivially spoof a different `X-Studiozero-Tenant`; if they DO break the mTLS, the HMAC-window seal catches the spoof.

**Note on Crash's circuit breaker.** This proxy rate limit is the OUTER bound; the per-provider circuit breaker (apps/runner — Crash's deliverable) is the INNER bound. Both must agree; the proxy's bucket is sized to the tier ceiling, the circuit breaker is sized to the per-incident burst envelope.

## UA + identity stamping (TB-6 transparency)

Every egress request rewrites the User-Agent to `studio-zero-runner/<version> (audit-bot; +https://studiozero.com/bot)` per threat-model TB-6 mitigation #3 — "transparency over obscurity." `X-Forwarded-For` is stripped so we don't leak the customer's IP class. A `X-Studiozero-Run-Id` header carries the run UUID for downstream attribution (the destination can choose to log this for their own forensic replay).

## Failure mode + open / close

When the proxy is unavailable:

- `https_proxy` env is set in the runner pod spec; if the proxy is down, fetch() calls FAIL CLOSED with `EHOSTUNREACH`. The runner emits `{ kind: 'error', code: 'egress_proxy_unreachable', recoverable: true }` and the job retries (pg-boss requeue). **This is intentional** — we do NOT fall back to direct egress, because direct egress is exactly what ARCH-D9 forbids.
- Pipeline alerts (Watch / Siren) fire on proxy unavailability — page during business hours, ticket overnight.
- The NetworkPolicy already drops direct runner→external egress, so even if the runner code "forgot" to use the proxy, the kernel still denies. Belt + braces.

## M1+1 implementation checklist

(For Terra's M1+1 sprint plan; lift verbatim into the ticket.)

- [ ] `apps/egress-proxy/` (rust) — squid wrapper + redirect-jail + rate limiter. ~600 LOC.
- [ ] Helm chart at `architecture/iac/railway/egress-proxy/Chart.yaml`. 1 replica → 2 replicas HA at V2.
- [ ] Shared blocklist crate `crates/studiozero-egress-policy` consumed by the proxy + (later) the runner via NAPI bindings, so TS + rust stay in sync.
- [ ] Parity test `tests/security/ssrf-policy-parity.spec.ts` — full SSRF corpus run under TS and rust classifiers; assertion: matching verdicts.
- [ ] Resolver pinning verified — `dig @8.8.8.8 +tls api.anthropic.com` returns a sane IP; `dig @192.168.1.1 api.anthropic.com` fails (no fallback).
- [ ] Rate limiter integration test — slam 200 req/min from a free-tier tenant; assert HTTP 429 + Retry-After.
- [ ] Runner-side change: set `https_proxy` env in `apps/runner/src/env.ts`; remove the temporary `direct-fetch` fallback path.
- [ ] Cipher Fix-3c (`X-Studiozero-Tenant` header HMAC) committed; runner ships the header on every egress.
- [ ] `architecture/iac/railway/egress-proxy.md` (this file) flips status to **IMPLEMENTED**.

## Cross-references

- `architecture/decisions.md` ARCH-D9 (open at M0; layer-3 closed M1 via NetworkPolicy; layer-7 closed M1+1 via this proxy)
- `architecture/iac/railway/network-policy.yaml` — Cilium NetworkPolicy (Layer-3 enforcement, ships M1)
- `apps/runner/src/ssrf-guard.ts` — app-layer Layer-1 filter (Forge-2)
- `architecture/threat-model.md` TB-4 + TB-6 + §3.1 SSRF + TB-14
- `architecture/secrets-rotation-runbook.md` — quarterly cadence applies to the pinned resolver IPs + HMAC key

---

_Pipeline · Egress proxy design spec · Phase 9 M1 Batch 3. Implementation lands M1+1 sprint._
