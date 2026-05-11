# Team — Mobile (Cross-Platform)

## Purpose
Cross-platform mobile builds via Expo (React Native) by default. Use when Jo wants iOS + Android from one codebase. For native iOS-only, use `native-ios.md` instead.

Stack: Expo + React Native + TypeScript + Expo Router + Tailwind via NativeWind.

## Phases

### Phase 1 — Strategy & Design
| Agent | Role |
|---|---|
| `axiom` | PRD, platform-feature parity decisions |
| `scout` | App store competitive landscape |
| `penny` | Monetization (IAP, subscriptions via RevenueCat, ads) |
| `sprint` | Plan |
| `canvas` | Mobile-native UI patterns (not web responsive) |
| `flow` | Touch-first journey mapping |
| `pixel` | App icon (every required size), splash screens, store screenshots |
| `motion` | Native-feel transitions, gesture animations |

### Phase 2 — Foundation
| Agent | Role |
|---|---|
| `atlas` | Mobile-friendly schema (offline sync considerations) |
| `keeper` | Local + cloud data, conflict resolution |
| `vault` | Auth — biometric, social, magic link |
| `cipher` | Keychain/Keystore secret management |
| `verify` | Native + JS dependency hygiene |
| `forge` | Backend architecture |
| `nexus` | Mobile-optimized API responses |
| `bridge` | Push notification provider, in-app purchase, analytics SDK |
| `queue` | Background sync, offline queue |

### Phase 3 — Interface
| Agent | Role |
|---|---|
| `arch` | Expo Router structure, state management, navigation |
| `vega` | Components — but mobile-native, not web-translated |
| `touch` | **Lead role on this team** — gestures, safe areas, keyboard, orientation |
| `prism` | JS thread perf, bundle splits, image optimization |
| `access` | iOS VoiceOver + Android TalkBack pass |

### Phase 4 — Hardening
| Agent | Role |
|---|---|
| `probe` | Detox/Maestro E2E, unit tests |
| `crash` | API load test (phone load is OS-managed, not our problem) |
| `ghost` | Network drop, app backgrounding, multi-tab edge cases |
| `pipeline` | EAS Build, EAS Submit, CI |
| `terra` | Backend infra (App itself is in stores, not on our infra) |
| `watch` | Crashlytics or Sentry mobile, app-store rating monitoring |
| `chronicle` | Privacy-respecting telemetry |
| `siren` | App-stuck-in-review escalation, mass-crash response |
| `meter` | Backend cost per active user; in-store fee tracking |

### Phase 5 — Intelligence (conditional)

### Phase 6 — Launch
| Agent | Role |
|---|---|
| `scribe` | README, build/release docs |
| `guide` | In-app onboarding, empty states, push messaging |
| `signal` | App Store Optimization (ASO) — title, keywords, description |
| `lens` | Funnel via PostHog/Amplitude mobile SDK |
| `herald` | Store description, marketing site copy |
| `hook` | Onboarding A/B (if Expo + RevenueCat support it) |
| `echo` | Support — common platform-specific issues (iOS update broke X) |
| `ledger` | RevenueCat / Stripe Mobile reconciliation |
| `comply` | App Store / Play Store policy compliance, age ratings |

### Phase 7 — Audit
Run via `audit-run.js`. Direct Halo to test on real iOS + Android assistive tech, not simulators.

## Conditional Agents
- `tongue` — multi-locale (common in mobile)
- `stream` — realtime features
- `oracle` — if AI features

## Build Limits
- iOS device builds require macOS + Xcode (not on this Windows host) — flag in `BIGBRAIN.md` and PRD
- EAS Build can produce iOS builds via Expo's cloud, but device debugging needs a Mac

## Required Inputs
- Target stores (iOS only, Android only, both)
- Free / paid / freemium model
- Brief from BigBrain
