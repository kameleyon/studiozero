# ─────────────────────────────────────────────────────────────────────
# Studio Zero — runner-worker Dockerfile (M1 STUB)
#
# Owner: Forge (writes at M1 when apps/runner package exists)
#        + Shield (sandbox primitive review)
#        + Terra (Railway wiring)
#
# Status at M0: STUB — image base + non-root user + healthz pattern
# are sketched here so Forge has a starting shape. Real Dockerfile
# lives at apps/runner/Dockerfile (referenced by railway.json) and
# Forge owns the final content.
#
# NOTE: this file is intentionally not built at M0. Listed here as
# a contract artifact so Shield + Forge + Terra agree on shape
# before Forge writes the runner package.
# ─────────────────────────────────────────────────────────────────────

# Base image: Node 24 LTS (or 22 LTS — Forge pins at runner-package
# write time; whichever LTS Cortex's pinned-models matrix tracks).
# Alpine for size; security-conscious base.
FROM node:24-alpine AS deps

# Build-time hygiene
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/runner/package.json ./apps/runner/

# Install only production deps for the runner workspace
RUN npm ci --omit=dev --workspace=apps/runner

# ─────────────────────────────────────────────────────────────────────
# Builder stage — compile TypeScript
# ─────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run -w apps/runner build

# ─────────────────────────────────────────────────────────────────────
# Runtime stage — minimal, non-root
# ─────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

# Hardening:
#  - non-root user (Alpine's `node` user already exists with uid 1000)
#  - read-only rootfs at runtime (set via Railway service-opts, NOT here)
#  - tmpfs for per-run workspace (Railway service-opts)
#  - no shell needed
RUN apk add --no-cache tini ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/runner/dist ./dist
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/runner/package.json ./package.json

# Drop to non-root before any RUN that could mutate
USER node

# Worker exposes /healthz on $PORT (Railway-assigned); see railway.json
EXPOSE 8080

# Tini as PID 1 for proper signal handling on SIGTERM (Railway sends
# SIGTERM on deploy; worker needs to drain in-flight jobs gracefully).
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "dist/worker.js"]

# ─────────────────────────────────────────────────────────────────────
# Sandbox primitives NOT in this Dockerfile (set elsewhere):
#   - seccomp profile  → architecture/iac/runner-pool/seccomp.json (Shield, M1)
#   - cap-drop=ALL     → Railway service-opt (set in dashboard at M1)
#   - no-new-privs     → Railway service-opt
#   - NetworkPolicy    → architecture/iac/runner-pool/network-policy.yaml (Shield, M1)
#   - read-only rootfs → Railway service-opt
#   - tmpfs /var/runs  → Railway service-opt (size 2g)
# ─────────────────────────────────────────────────────────────────────

# End of Dockerfile (M0 stub).
