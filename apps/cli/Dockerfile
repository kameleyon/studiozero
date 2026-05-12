# Studio Zero CLI — optional Docker image.
# Phase 9 M3 Batch 1 (Forge).
#
# Primary distribution is `npm i -g @studiozero/cli` + GitHub Release
# tarballs (M3 Batch 2 — Cipher Fix-3c Ed25519-signed manifest). This
# Dockerfile exists so air-gapped environments + CI runners can pull a
# canonical image rather than building from source.
#
# Posture:
#   - multi-stage; runtime image carries no compilers or sources
#   - non-root user (UID/GID 10100)
#   - the CLI runs against the HOST's Claude Code install — when used
#     inside Docker, the customer mounts their config + folder + maps
#     a Claude Code binary in. The image alone CANNOT run audits; it's
#     a packaging convenience.
#   - HEALTHCHECK is intentionally absent (the CLI is a one-shot
#     process, not a long-running server)
#
# Typical use:
#   docker run --rm -it \
#     -v "$HOME/.studio-zero:/home/cli/.studio-zero" \
#     -v "$(pwd):/work" \
#     -w /work \
#     studiozero/cli:0.1.0-m3 \
#     studio-zero run

# ----- stage 1: build -----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=optional
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json
RUN npm prune --omit=dev

# ----- stage 2: runtime -----
FROM node:24-alpine AS runtime
RUN addgroup -g 10100 -S cli \
 && adduser -u 10100 -G cli -S -h /home/cli -s /sbin/nologin cli

WORKDIR /app
COPY --from=build --chown=cli:cli /app/dist        ./dist
COPY --from=build --chown=cli:cli /app/node_modules ./node_modules
COPY --from=build --chown=cli:cli /app/package.json ./package.json

# Install the bin as `studio-zero` on PATH.
RUN ln -s /app/dist/index.js /usr/local/bin/studio-zero \
 && chmod +x /app/dist/index.js

USER cli
ENV HOME=/home/cli
ENTRYPOINT ["studio-zero"]
CMD ["--help"]
