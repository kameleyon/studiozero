# Studio Zero — Web Gaming Template

Three.js + React Three Fiber + Drei + Zustand. Frame-budget-first scaffold.

## Setup
```bash
npm install
npm run dev
npm run build
```

## Defaults that matter
- **DPR cap at 2** — devices can claim DPR up to 4; uncapped = framerate disaster
- **`powerPreference: "high-performance"`** — picks the discrete GPU on dual-GPU laptops
- **Stats overlay enabled in dev** — frame budget visible from line one
- **Manual chunks for Three / R3F** — separate vendor bundles for cache reuse

## Frame budget
Web games live or die at 60fps (16.6ms/frame). Targets:
- Mobile-first projects: 30fps acceptable, 60fps preferred → ≤30ms/frame
- Desktop or premium projects: 60fps required → ≤16ms/frame
- VR adjacent: 90fps required → ≤11ms/frame (use the `vr` template instead)

## Audit gate
Direct Prism (perf engineer) and Access (game accessibility) per `teams/gaming.md`. Compass scores against the **target player** persona, not generic users.
