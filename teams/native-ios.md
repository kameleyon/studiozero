# Team — Native iOS / visionOS

## Purpose
Native Apple-platform builds: iOS, iPadOS, macOS, visionOS. Use when Jo wants the genuine native feel, performance, and platform-specific APIs (LiveActivities, ARKit, RealityKit, Core ML on-device) — and is willing to forgo Android.

Stack: SwiftUI + Swift Package Manager + Xcode + Swift 6 (per `CAPABILITIES.md`).

**Build limit:** This Windows Server host cannot produce iOS device builds — those require macOS + Xcode. PRDs for this team **must** flag the macOS dependency to Jo before work starts. Studio Zero on this host can write the Swift code, run unit tests via SPM on Windows targets, and prepare the project — final builds + device runs need a macOS machine.

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | PRD; explicit "macOS host required for build" callout |
| `scout` | Apple ecosystem competitive landscape |
| `penny` | Apple's 30/15% IAP economics |
| `sprint` | Plan, including macOS-host handoff timing |
| `canvas` | Apple HIG-aligned UI design |
| `flow` | Apple-platform user journey patterns |
| `pixel` | App icon (all required sizes per platform), App Store assets |
| `motion` | SwiftUI animations, transitions following Apple HIG |

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Schema for backend (if not pure on-device) |
| `keeper` | iCloud sync, Core Data migration |
| `vault` | Sign-in with Apple, Keychain, biometrics |
| `cipher` | Keychain, CryptoKit usage, Secure Enclave |
| `verify` | Swift package dependency hygiene |
| `forge` | Architecture — server-side Swift (Vapor) if backend is also Swift, or any language if separate |
| `nexus` | API endpoints |
| `bridge` | Apple-native integrations: StoreKit 2, MapKit, HealthKit, etc. |
| `queue` | Background tasks, BGAppRefreshTask |

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | SwiftUI structure, app architecture (TCA, MV, MVVM choice) |
| `vega` | SwiftUI views, sheets, navigation |
| `touch` | _Limited role here — Apple-native gestures handled in vega/canvas. Touch contributes if there's also a PWA fallback._ |
| `prism` | Swift performance — Instruments profiling, Core Animation frame rate |
| `access` | VoiceOver, Voice Control, Dynamic Type, Switch Control compliance |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | XCTest unit + UI tests |
| `crash` | Backend load (device perf is per-OS) |
| `ghost` | Edge cases: backgrounded states, low memory, low battery, low storage |
| `pipeline` | Xcode Cloud or GitHub Actions with macOS runners; TestFlight automation |
| `terra` | Backend infra |
| `watch` | MetricKit + Sentry/Crashlytics |
| `chronicle` | OSLog with Privacy levels |
| `siren` | App-store-rejection response, mass-crash handling |
| `meter` | Apple's cut + backend cost per active user |

### Phase 5 — Intelligence (conditional)
| Agent | Role |
|---|---|
| `cortex` | LLM integration (if AI in scope) |
| `memory` | RAG (if applicable) |
| `oracle` | Eval, especially for on-device Core ML models |

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | README + Xcode project setup docs |
| `guide` | In-app help, onboarding, App Store screenshots' captions |
| `signal` | App Store Optimization |
| `lens` | App Store Connect Analytics + custom telemetry |
| `herald` | App Store description, marketing copy |
| `hook` | A/B via App Store Connect product page experiments |
| `echo` | Support, Apple-specific common issues |
| `ledger` | StoreKit 2 transaction verification, refund handling |
| `comply` | App Store policy + privacy nutrition labels (Apple's required) |

### Phase 7 — Audit
Run via `audit-run.js`. Direct Halo to test with VoiceOver + Voice Control + Dynamic Type at largest setting. Compass must verify the Apple-platform persona match (often more affluent / brand-aware than generic mobile).

## Conditional Agents
- `tongue` — multi-locale
- `stream` — realtime / collaborative features
- `oracle` — AI features (especially on-device Core ML)

## Server-side Swift ownership
Resolved 2026-05-09: **server-side Swift (Vapor / Hummingbird / swift-nio) is owned by `forge`** — not a separate agent. When this template's Swift app needs a backend in Swift, route the backend work to Forge (per `agents/backend/forge.md` Tools & Knowledge section).

## Required Inputs
- Confirmation Jo has a macOS machine available for final builds + device testing
- Target Apple platforms (iOS / iPadOS / macOS / visionOS — they have different design constraints)
- Brief from BigBrain
