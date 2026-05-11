# Team — Gaming

## Purpose
Lean roster for game builds. Web games (Three.js / Babylon.js / PixiJS) and native games (Unity / Godot / Unreal) follow the same build flow but differ in toolchain. ROADMAP Phase 8 leaves the native engine choice per-project.

The team is intentionally **smaller than SaaS** — games rarely need full multi-tenant infra, billing systems, or compliance baselines (unless they have IAP / subscriptions, in which case borrow from `mobile.md`).

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | PRD — core mechanic, target audience, monetization, scope |
| `scout` | Genre competitor analysis, mechanics inspiration |
| `penny` | Free / paid / freemium / IAP |
| `sprint` | Milestone plan (vertical slice → alpha → beta → ship) |
| `canvas` | Menu/HUD/UI design (game-feel UI is its own discipline) |
| `flow` | Player onboarding journey (most games lose 70% in first 3 minutes) |
| `pixel` | Brand, key art, store screenshots, capsule art |
| `motion` | Game feel — juice, screen shake, easing, weight in animations |

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Save data schema, leaderboards (if multiplayer/online) |
| `vault` | Player accounts (if online) |
| `cipher` | Anti-cheat token signing, save-file integrity |
| `verify` | Engine + middleware dependency tracking |
| `forge` | Backend — only if multiplayer or persistent online state |
| `nexus` | Game services API (matchmaking, leaderboards, cloud saves) |
| `bridge` | Steam / Epic / App Store / Play Store SDKs |

_(Many gaming projects skip most of Phase 2 — single-player offline games need only assets and code. Adapt per project.)_

### Phase 3 — Interface (the game itself + meta-UI)
| Agent | Role |
|---|---|
| `arch` | Engine choice, scene architecture, asset pipeline |
| `vega` | Menu / settings / HUD / inventory UI components |
| `touch` | Touch controls (mobile/web games) — virtual sticks, gesture mapping |
| `prism` | **Critical role on this team** — frame budget, draw calls, shader cost, asset compression |
| `access` | Game accessibility — colorblind modes, remappable controls, subtitles, motion-sickness reduction |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | Test mechanics, save/load, edge cases |
| `crash` | Stress test backend (multiplayer); device thermal/battery limits |
| `ghost` | Exploratory — sequence breaks, soft locks, exploits |
| `pipeline` | CI for builds across platforms |
| `terra` | Backend infra (multiplayer / leaderboards) |
| `watch` | Crash reporting (Sentry / native), performance telemetry |
| `siren` | Launch-day server-meltdown response |
| `meter` | Per-user backend cost (matters most for free-to-play) |

### Phase 5 — Intelligence (conditional)
| Agent | Role |
|---|---|
| `cortex` | Procedural generation, AI NPCs, content tools |
| `memory` | Save state vector embeddings (rare) |
| `oracle` | Behavior eval — does the AI NPC remain in-character? |

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | Modding/SDK docs (if applicable) |
| `guide` | In-game tutorials, tooltips, FAQ |
| `signal` | Store-page SEO (Steam tags, Play Store keywords) |
| `lens` | Funnel analytics — tutorial completion, day-1/7/30 retention |
| `herald` | Store description, trailer copy, press kit |
| `hook` | A/B on store page (where supported) |
| `echo` | Player support — common bug reports, refund policy |
| `ledger` | IAP reconciliation (RevenueCat / direct) |
| `comply` | Age ratings, regional content rules (loot boxes in BE/NL, etc.) |

### Phase 7 — Audit
Run via `audit-run.js`. Direct Compass especially: a game whose target is "casual mobile player on commute" gets very different scoring than "hardcore PC enthusiast." Halo audits accessibility against the **Game Accessibility Guidelines**, not just WCAG.

## Conditional Agents
- `tongue` — multi-locale (most games launch with at least EFIGS+CJK)
- `stream` — multiplayer realtime
- `edge` — global matchmaking / region-aware servers
- `keeper` / `comply` — only if collecting player data subject to GDPR/COPPA

## Toolchain Note
Web gaming is fully runnable on this Windows host (Three.js, R3F). Native engines (Unity, Godot, Unreal) require their own installs — confirm via `CAPABILITIES.md` before proposing one.

## Required Inputs
- Web vs. native target
- Single-player vs. multiplayer
- Monetization model
- Brief from BigBrain
