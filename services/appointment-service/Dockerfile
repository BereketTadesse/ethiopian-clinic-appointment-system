# ── Stage 1: Builder ──────────────────────────────────────────
# Install ALL dependencies (including devDependencies) for any build steps
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first — layer cache: only reinstalls when package*.json changes
COPY package*.json ./

# Install all deps including devDependencies (e.g. nodemon if ever needed in build)
RUN npm ci

# Copy the rest of the source code
COPY . .


# ── Stage 2: Production Image ─────────────────────────────────
FROM node:20-alpine AS production

# Set NODE_ENV so libraries can optimize for production
ENV NODE_ENV=production

WORKDIR /app

# Only copy package manifests and install PRODUCTION deps (no devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built source from builder stage
COPY --from=builder /app/src ./src

# The app listens on 3003 by default (overridable via PORT env var)
EXPOSE 3003

# Use SIGTERM-friendly signal for graceful shutdown (your index.js already handles this)
CMD ["node", "src/index.js"]
