# Studio Zero — Platform Capabilities Registry

Single source of truth for what this machine can build. Auto-injected into every agent spawn by `task.js`. If a tool is listed here, it is installed and ready — use it when the project calls for it. If it is NOT listed, assume it is not available and coordinate with BigBrain before adding a dependency on it.

---

## Language Toolchains

| Toolchain | Version | Location | Use For |
|-----------|---------|----------|---------|
| Node.js | 24.15.0 | PATH | JS/TS backend, tooling, React/Next builds |
| Swift | 6.0.3 | `C:\Users\Administrator\AppData\Local\Programs\Swift\Toolchains\6.0.3+Asserts\usr\bin\swift.exe` | iOS / iPadOS / macOS / visionOS native, server-side Swift (Vapor/Hummingbird), cross-platform CLI |
| Python | (check `python --version`) | PATH | Scripting, ML, data processing |

### Swift language — how to use it

- Sanity check: `swift --version`
- New executable package: `swift package init --name <name> --type executable && swift run <name>`
- New library package: `swift package init --name <name> --type library && swift build && swift test`
- Xcode project generation from Package.swift: supported on macOS only. On Windows, use VS Code + the Swift extension for editor/debugger.
- Target platforms enabled by this Windows install: Windows (x86_64-unknown-windows-msvc) + anything Swift Package Manager cross-builds for.
- For iOS / iPadOS / visionOS / watchOS / tvOS **device builds**, you still need a macOS + Xcode machine. Document this limitation in the PRD whenever Jo asks for a native app.
- Server-side Swift frameworks to consider: **Vapor**, **Hummingbird**, **Swift on Server (swift-nio)**.

### Agent / Swift-language routing

The Mobile & PWA agent is named **`touch`** (formerly `swift` — renamed to remove ambiguity with the Swift programming language). Use:
- `node task-claude.js touch "<task>"` → the mobile/PWA specialist
- The Swift **programming language** (SwiftUI, Vapor, server-side Swift, iOS native) is a toolchain — work routes through `arch` (Frontend Architect) for framework selection and `forge` (Backend Architect) for server-side Swift code.

**Server-side Swift (Vapor / Hummingbird / swift-nio) is owned by `forge`** per the 2026-05-09 decision (the proposed `reed`/`xcode` specialist agent was folded into Forge instead — keeps the agent count down and reflects how Forge already serves as the cross-layer engineering lead). For SwiftUI / iOS / visionOS frontend work, route through `arch` (framework selection) → Forge (backend) → relevant frontend specialists.

---

## Supported Product Types

Studio Zero ships these project types end-to-end. Each has its own preferred stack; agents should pick the most appropriate one unless Jo overrides.

| Product Type | Preferred Stack | Notes |
|--------------|-----------------|-------|
| Marketing website | Astro or Next.js (SSG) + Tailwind | Signal (SEO) leads |
| Blog / publication | Astro + MDX + Tailwind + Supabase | Long-form content, RSS required |
| Web application | React 19 + Vite + Supabase + Tailwind + shadcn/ui | Default for most SaaS |
| SaaS platform | Next.js 15 + Supabase + Stripe + Clerk/Supabase Auth | Multi-tenant from day one |
| E-commerce | Next.js + Shopify Hydrogen OR Medusa.js + Stripe | Choose based on catalog size |
| Mobile app (cross-platform) | React Native (Expo) OR Flutter | Expo default unless native APIs demand otherwise |
| Mobile app (native iOS / visionOS) | SwiftUI + Swift Package Manager | Requires macOS host for device builds |
| PWA | Vite + Workbox + Web App Manifest | Touch agent owns |
| Gaming (web) | Three.js / Babylon.js / PixiJS | WebGL + WebGPU where supported |
| Gaming (native) | Unity OR Godot OR Unreal | Pick per scope and budget |
| VR / XR | WebXR (Three.js + @react-three/xr) OR Unity XR Toolkit | Default to WebXR for browser reach |
| Realtime / collab | Supabase Realtime OR Liveblocks OR Yjs + WebRTC | Stream agent owns |

---

## Infrastructure & Services (assumed available)

- Supabase (Postgres, Auth, Edge Functions, Storage, Realtime)
- Vercel / Lovable / Render for hosting
- Stripe for payments
- Resend for transactional email
- OpenRouter for multi-model LLM access
- GitHub Actions for CI/CD
- Sentry + PostHog for observability
- Cloudflare (CDN, R2, Workers) when edge compute is needed

If a project needs a service not in this list, flag it to BigBrain so Jo can approve provisioning.

---

## Environment Limits (Windows Server host)

- `winget` is NOT available on this Windows Server 2022 Datacenter host. Do not emit winget commands as install instructions. Use direct installers, `npm`, `pip`, or manual download links instead.
- iOS / watchOS / tvOS / visionOS device builds require macOS + Xcode. This host can compile Swift for Windows targets only.
- No Android SDK installed by default — confirm before scheduling Android-native work.
