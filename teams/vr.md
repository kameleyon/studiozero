# Team — VR / XR

## Purpose
WebXR (default) or native XR (Unity XR Toolkit) experiences. VR is a unique vertical because **performance is non-negotiable** (sub-20ms motion-to-photon latency or users get sick) and **accessibility takes different forms** (motion sickness, room-scale physical safety, hand-tracking-only fallbacks). Lean roster, but with two specialists in lead-significant roles.

Stack: WebXR (Three.js + @react-three/xr + @react-three/fiber) by default for browser reach. Unity XR Toolkit when device-specific features (Quest hand tracking, Vision Pro spatial) demand it.

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | PRD with explicit motion-sickness mitigation plan |
| `scout` | Comparable XR experiences |
| `penny` | Monetization (Quest store revenue split, Steam VR, paid keys) |
| `sprint` | Plan with hardware-availability gates (Quest dev kit etc.) |
| `canvas` | UI in 3D space — diegetic vs. screen-space UI decisions |
| `flow` | Spatial journey: comfort, locomotion type, sit/stand/room-scale |
| `pixel` | Brand within a 360° world, store visuals |
| `motion` | Animation that respects head movement; locomotion comfort |

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Save state, multiplayer state (if applicable) |
| `vault` | Account / device-link auth |
| `cipher` | Secret handling (more sensitive in always-on devices) |
| `verify` | Engine + extension dependency hygiene |
| `forge` | Backend (if multiplayer / persistent) |
| `nexus` | API — typically lighter than SaaS |
| `bridge` | Quest store SDK, Vision Pro entitlements, Steam VR |
| `queue` | Async — rare in single-user XR |

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | Engine, scene graph, render-loop architecture |
| `vega` | 3D-spatial components, hand/controller interactions |
| `touch` | Hand-tracking gestures, controller input mapping |
| `prism` | **Lead role here.** Frame rate is contractual — drop a frame, user gets sick. Shader cost, draw calls, foveated rendering, fixed-foveated optimization |
| `access` | **Equally lead role.** Comfort settings, seated mode, colorblind, vignettes for locomotion, height adjustment, single-controller play |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | Headset-runnable test scenarios, controller input replays |
| `crash` | Long-session stability (45+ min sessions reveal memory leaks) |
| `ghost` | Edge cases: tracking loss, controller battery, room boundary breaches |
| `pipeline` | CI with build-out-to-Quest-via-OpenXR loops |
| `terra` | Backend infra (if any) |
| `watch` | Performance telemetry — frame rate, dropped frames, comfort heuristics |
| `chronicle` | Session logging (privacy-respecting) |
| `siren` | Critical bug response |
| `meter` | Per-session backend cost; store-fee tracking |

### Phase 5 — Intelligence (conditional)
| Agent | Role |
|---|---|
| `cortex` | NPC dialogue, AI companions |
| `memory` | (Rare in XR) |
| `oracle` | NPC behavior eval |

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | Setup docs |
| `guide` | In-experience onboarding (more critical than usual — first-time VR is disorienting) |
| `signal` | Quest store / Steam VR SEO |
| `lens` | Session-completion funnel, comfort-setting adoption |
| `herald` | Store description, trailer scripts |
| `hook` | A/B on store page |
| `echo` | Support — motion-sickness complaints, hardware-specific issues |
| `ledger` | Store-revenue reconciliation |
| `comply` | Age-rating, photosensitivity warnings, comfort labeling |

### Phase 7 — Audit
Run via `audit-run.js`. Special instructions for this team:
- **Halo** audits against XR-specific accessibility (XAUR — XR Accessibility User Requirements), not just WCAG
- **Compass** verifies the audience tolerance for VR (first-time users vs. experienced)
- **Trace** walks the experience in-headset, not just on a flat screen — flags any moment a user might lose context or get stuck

## Conditional Agents
- `tongue` — multi-locale (XR ships globally early because device install base is small per region)
- `stream` — multiplayer / shared-space XR

## Toolchain Note
WebXR runs in any browser with WebXR support — testable locally on this Windows host. Native XR (Unity XR Toolkit) requires Unity install per `CAPABILITIES.md`.

## Required Inputs
- Target headset(s) — Quest 2/3, Vision Pro, PCVR (Index/Vive)
- Comfort spec — sit only, stand only, full room-scale
- Single-user vs. multi-user
- Brief from BigBrain
