# Studio Zero — hosted runner Dockerfile.
# Phase 9 M1 Batch 2 (Forge-2).
#
# Posture (PRD §13.5 D8 + ARCH-D2 + Shield threat-model TB-6/TB-9):
#   - multi-stage; production image carries no compilers or sources
#   - rootless container (UID 10001, GID 10001 — distinct from any host UID)
#   - --cap-drop=ALL at runtime (Railway security-opt; this Dockerfile sets the
#     filesystem so dropping caps does not break startup)
#   - read-only root filesystem at runtime; /tmp is the only writable mount
#   - seccomp profile referenced via `architecture/iac/runner-pool/seccomp.json`
#     and applied at the platform layer (Railway / Fly / Kubernetes — NOT here,
#     because the seccomp profile is host-config not image-config)
#   - HEALTHCHECK hits /health (must reply ≤ 100ms; see src/healthcheck.ts)
#   - all responses carry `X-AI-Generated: studio-zero` (EU AI Act Art. 50)
#
# What is INTENTIONALLY not here: the Anthropic API key and the Supabase
# service-role key. The runner NEVER holds either (Cipher Fix-2 + Atlas B2).
# The runner picks up a short-lived JWT at job dispatch (ARCH-D3).

# ----- stage 1: build -----
FROM node:24-alpine AS build
WORKDIR /app

# Install deps first so the layer caches when only source changes.
COPY package.json ./
# We run inside a pnpm workspace; the lockfile lives at the repo root.
# Railway/Fly build context root is the monorepo root, so we COPY from
# the runner subdir explicitly. If a lockfile is colocated here in M1+1
# (graduating to an isolated build), this line still works.
RUN npm install --no-audit --no-fund --omit=optional

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# Drop dev-deps before copying into the runtime stage.
RUN npm prune --omit=dev

# ----- stage 2: runtime -----
FROM node:24-alpine AS runtime

# Create a non-root user. UID/GID 10001 is high enough to avoid collision
# with any pre-baked alpine system user but still inside POSIX uid_t.
RUN addgroup -g 10001 -S runner \
 && adduser -u 10001 -G runner -S -H -s /sbin/nologin runner

WORKDIR /app

# Copy ONLY what the runtime needs: built JS + pruned node_modules + package.json.
# No tsconfig, no source, no tests, no dockerfile — minimal attack surface.
COPY --from=build --chown=runner:runner /app/dist        ./dist
COPY --from=build --chown=runner:runner /app/node_modules ./node_modules
COPY --from=build --chown=runner:runner /app/package.json ./package.json

# Default port; Railway sets PORT env at runtime. The healthcheck endpoint
# uses process.env.PORT (see src/healthcheck.ts).
ENV PORT=8080
EXPOSE 8080

# Tini-style PID 1 via node's built-in. Node 24 LTS has signal handling
# wired so SIGTERM propagates to AbortController (src/abort-controller.ts).
USER runner

# Healthcheck. Must respond ≤ 100ms; no DB call in the hot path.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- --tries=1 --timeout=2 "http://127.0.0.1:${PORT:-8080}/health" \
      | grep -q '"ok":true' || exit 1

# Default command. Override at the platform layer for one-off jobs / migrations.
CMD ["node", "dist/index.js"]
