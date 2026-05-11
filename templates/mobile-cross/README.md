# Studio Zero — Mobile Cross-Platform Template

Expo SDK 52 + Expo Router + React Native 0.76 + New Architecture (Fabric / TurboModules).

## Setup
```bash
npm install
npx expo start          # opens dev menu — pick iOS, Android, or Web
```

## Build for store
```bash
npm install -g eas-cli
eas build --platform android   # cloud build
eas build --platform ios       # cloud build (Apple Developer account required)
```

## Build limits on this Studio Zero host
- Local iOS device builds require macOS + Xcode (not available on Windows host)
- Local Android device builds require Android SDK (not installed by default — see `CAPABILITIES.md`)
- **EAS Build runs in Expo's cloud and produces both iOS and Android builds from this Windows host** — that's the recommended path

## What's wired (Touch agent enforces, per `teams/mobile.md`)
- 44+ touch target on the primary CTA
- Safe-area-inset for notched devices (iPhone, modern Android)
- Accessibility props (`accessibilityRole`, `accessibilityLabel`) on interactive elements
- Light + automatic color scheme support
- Edge-to-edge on Android, opt-in via app.json

## Required assets (replace placeholders)
- `assets/icon.png` (1024×1024 — Apple)
- `assets/adaptive-icon.png` (1024×1024 — Android adaptive)
- `assets/splash.png`
- `assets/favicon.png` (48×48 — web)

## Audit gate
Direct Halo to test on real iOS VoiceOver + Android TalkBack — not just simulators. Compass scores against the actual mobile audience (often distracted, on slow connections).
