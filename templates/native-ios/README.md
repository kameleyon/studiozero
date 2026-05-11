# Studio Zero — Native iOS / visionOS Template

SwiftUI + Swift Package Manager + Swift 6. Cross-compiles via SPM on Windows; **device builds require macOS + Xcode**.

## Build limits on the Studio Zero Windows host

This host has Swift 6.0.3 installed (per `CAPABILITIES.md`). You can:
- ✅ `swift build` — compile against Windows target (smoke-test logic)
- ✅ `swift test` — run XCTest suites
- ✅ Edit Swift files with VS Code + Swift extension
- ❌ Produce an `.ipa` — needs macOS + Xcode
- ❌ Run on iOS Simulator — Simulator is macOS-only
- ❌ Sign + upload to TestFlight — needs Xcode + Apple Developer account on macOS

**Workflow:** write + test on Windows; hand off to a macOS host (or Xcode Cloud / EAS for cross-platform builds) for device builds + store submission.

## Setup on Windows

```pwsh
swift --version             # confirm Swift 6.x is on PATH
swift build                 # builds the package for Windows target
swift test                  # runs XCTest suites
```

## Setup on macOS (the eventual hand-off host)

```sh
# Open the package directly in Xcode
xed Package.swift
# OR generate / open via Xcode UI: File → Open → select the directory
```

Xcode 15+ opens `Package.swift` natively. To wrap it in an iOS App target:
1. Xcode → File → New → Target → App (iOS or visionOS)
2. Set the new target's main module to depend on `StudioZeroApp`
3. Set `@main` on the `StudioZeroApp` struct in the App target

## Structure

```
.
├── Package.swift                          ← SwiftPM manifest
├── Sources/StudioZeroApp/
│   ├── App.swift                          ← @main App entry (SwiftUI)
│   └── ContentView.swift                  ← primary view
└── Tests/StudioZeroAppTests/
    └── StudioZeroAppTests.swift           ← XCTest sample
```

## Conventions baked in
- Swift 6 strict concurrency mode (set in Package.swift `swiftLanguageVersions`)
- 44 pt minimum touch target on interactive elements (Apple HIG floor)
- `accessibilityIdentifier` + `accessibilityLabel` on every interactive view
- Multi-platform support: iOS 17+, visionOS 1+, macOS 14+ (for tests)
- visionOS `ImmersiveSpace` stub included if you want spatial features

## Server-side Swift ownership

**Resolved 2026-05-09:** Server-side Swift (Vapor / Hummingbird / swift-nio) is owned by **`forge`** — folded into the Backend Architect's domain rather than a separate `reed`/`xcode` agent. When this template's iOS app needs a backend in Swift, dispatch the backend work to Forge. iOS-specific framework decisions go through **`arch`** (Frontend Architect).

## Audit gate per `teams/native-ios.md`

Halo audits with VoiceOver + Voice Control + Dynamic Type at largest setting. Compass scores against the Apple-platform persona (often more affluent / brand-aware than generic mobile).
