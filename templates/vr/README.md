# Studio Zero — VR / WebXR Template

WebXR + Three.js + React Three Fiber + @react-three/xr. Targets Quest 2/3, Vision Pro browser, PCVR via SteamVR/Chrome, and any WebXR-capable mobile browser.

## Setup
```bash
npm install
npm run dev          # http://localhost:5173 (desktop preview)
npm run dev -- --host --https   # for testing on a real headset over LAN
npm run build && npm run preview
```

## What's wired
- WebXR session via `@react-three/xr` `createXRStore`
- Comfort defaults: teleport pointers (controller + hand), 90fps target, max foveation
- Eye-height camera (1.6m), DPR cap at 1.5 (headset GPU budget)
- Falls back to OrbitControls when WebXR isn't available (desktop preview without headset)
- "Enter VR" button when WebXR is detected
- Helpful overlay when it isn't

## Frame budget — non-negotiable
VR is contractual at the framerate level. Drop frames → users get sick. Targets:
- Quest 2/3: 90fps native, 120fps experimental → ≤11ms/frame
- Vision Pro: 90fps → ≤11ms/frame
- PCVR (Index/Vive): 90/120/144fps → device-dependent

Profile every scene with `Stats` enabled. If you can't hit 90fps consistently, reduce DPR, foveation level, shadow quality, or scene complexity — in that order.

## Accessibility (XR-specific, per `teams/vr.md`)
WCAG doesn't cover XR completely. Use the **XAUR** (XR Accessibility User Requirements) supplement:
- Comfort settings: vignettes during locomotion, snap-turn vs smooth-turn, sit/stand mode
- Single-controller play (left- and right-handed)
- Subtitles for spatial audio
- Photosensitivity warnings on flashing content (≤ 3 flashes/sec)
- Height adjustment for shorter users / kids

Halo audits against XAUR, not just WCAG, for this team.

## Production deployment
WebXR requires HTTPS in production. Vercel / Cloudflare Pages handle this automatically. For your own infra, terminate TLS at the edge — WebXR will refuse to start otherwise.
