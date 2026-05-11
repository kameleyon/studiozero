# Studio Zero — Code Standards Protocol

## Universal Rules (All Projects)

### Language & Framework
- Use the latest stable version of whatever stack the project requires
- TypeScript over JavaScript — always, unless the project explicitly requires JS
- Strict mode enabled — no `any` types, no implicit nulls
- ESLint + Prettier configured before the first line of code

### File Structure
- Feature-based organization, not type-based
- Co-locate tests with source files
- Shared utilities in `/lib` or `/utils`
- Types/interfaces in dedicated files or co-located with usage
- Max file length: 300 lines. If longer, split it.

### Naming
- **Files:** kebab-case (`user-profile.tsx`, `auth-context.ts`)
- **Components:** PascalCase (`UserProfile`, `AuthContext`)
- **Functions:** camelCase (`fetchUser`, `handleSubmit`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Database:** snake_case (`user_profiles`, `created_at`)
- **CSS/Tailwind:** Follow existing project conventions
- Names must be descriptive. No `data`, `info`, `handler`, `utils` without context.

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Branch naming: `feature/description`, `fix/description`, `refactor/description`
- No direct pushes to `main` — always PR (unless Jo says otherwise)
- Every PR has a description of what and why
- Squash merge to keep history clean

### Security (Non-Negotiable)
- No secrets in code. Ever. Use environment variables.
- No `console.log` of sensitive data
- Validate all user input — client AND server
- Parameterized queries only — no string interpolation in SQL
- HTTPS everywhere. No exceptions.
- Dependencies audited before adding (`npm audit`, check last publish date)

### Error Handling
- Every `try/catch` handles the error meaningfully — no empty catches
- User-facing errors are friendly. Developer-facing errors are detailed.
- API errors return consistent format: `{ error: string, code?: string, details?: any }`
- Never expose stack traces to users

### Testing
- Minimum coverage: 80% for core business logic
- Every API endpoint has at least one happy-path and one error-path test
- Critical flows (auth, payments, data mutation) have end-to-end tests
- Tests are independent — no shared mutable state between tests

### Performance
- No N+1 database queries
- Images optimized and lazy-loaded
- Bundle size tracked — no importing entire libraries for one function
- Database queries have appropriate indexes
- API responses cached where appropriate

### Accessibility
- Semantic HTML first — `<button>` not `<div onClick>`
- All images have alt text
- Keyboard navigation works for all interactive elements
- Color contrast meets WCAG AA (4.5:1 for text)
- Focus states visible on all interactive elements

### Documentation
- Public functions have JSDoc comments
- Complex logic has inline comments explaining WHY, not WHAT
- README updated when setup steps change
- API endpoints documented with request/response examples

### Audit Gate (Non-Negotiable)
- **No production deploy ships without a Jury verdict of `PASS` or `PASS WITH FIXES`.** This is enforced — Pipeline blocks the deploy until a verdict is on file under `shared_context/audits/<project>/<date>/verdict.md`.
- The audit panel (Jury + Optic, Proof, Halo, Compass, Trace, Canon) is independent — auditors do not edit the work they review. Creators remediate; auditors re-verify.
- Severity rubric is fixed (defined in `agents/audit/jury.md`):
  - **Blocker** — ships nothing until fixed (legal, security, broken core flow)
  - **Critical** — fix before launch (significant audience exclusion, data loss, brand damage)
  - **Major** — fix before next release (clear friction, comprehension failure)
  - **Minor** — fix when convenient (polish, edge cases)
  - **Polish** — optional improvement
- `PASS WITH FIXES` requires that every Critical / Blocker is verified-fixed by the **originating reviewer** (not by the creator) before the verdict closes to `PASS`.
- Deadline pressure does not soften audit findings. If a deadline is at risk, the deadline moves or scope shrinks — the audit gate does not get skipped. Escalation goes to BigBrain → Jo, not to Jury.
- Every audit finding requires evidence: screen capture, file path:line, contrast measurement, screen-reader recording, or audit-tool output. Findings without evidence are rejected, not softened.

## Current Tech Preferences (2026)

These are defaults — override per project as needed:

| Category | Preferred | Alternatives |
|----------|-----------|-------------|
| Frontend | React 19 + Vite | Next.js 15, Astro |
| Styling | Tailwind CSS 4 + shadcn/ui | CSS Modules |
| State | TanStack Query + Zustand | Redux Toolkit |
| Forms | React Hook Form + Zod | |
| Backend (JS/TS) | Supabase Edge Functions, Hono | Fastify, Express |
| Backend (Swift) | Vapor or Hummingbird | swift-nio direct |
| Database | PostgreSQL (via Supabase) | PlanetScale, Neon |
| ORM | Drizzle ORM | Prisma |
| Auth | Supabase Auth, Clerk | NextAuth |
| Payments | Stripe | Lemon Squeezy |
| AI/LLM | OpenRouter (multi-model) | OpenAI, Anthropic direct |
| Hosting | Lovable, Vercel, Render | Railway, AWS |
| CI/CD | GitHub Actions | |
| Monitoring | Sentry + PostHog | LogSnag, Betterstack |
| Email | Resend | SendGrid |
| Mobile (cross-platform) | React Native + Expo | Flutter |
| Mobile (native iOS / visionOS) | SwiftUI + Swift Package Manager | UIKit where required |
| E-commerce | Next.js + Shopify Hydrogen | Medusa.js |
| Web gaming | Three.js / Babylon.js / PixiJS | Phaser |
| Native gaming | Unity, Godot | Unreal |
| VR / XR | WebXR (Three.js + @react-three/xr) | Unity XR Toolkit |

**Available toolchains on the Studio Zero host:** See `CAPABILITIES.md` at the project root. It is the authoritative list of what is installed and ready to use. It is auto-injected into every agent spawn.
