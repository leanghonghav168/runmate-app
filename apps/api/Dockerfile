# ===================================================
# Stage 1: Build the Application
# ===================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Enable Corepack & pnpm
RUN corepack enable && corepack prepare pnpm@10.34.1 --activate

# Copy root workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy API package
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter api exec prisma generate

# Build API application
RUN pnpm --filter api build

# Deploy production dependencies (with --legacy for pnpm v10 compatibility)
RUN pnpm --filter api --prod deploy --legacy /app/deployed-api

# Ensure Prisma Client engine & generated artifacts are included in deployed-api runtime
RUN cp -r /app/node_modules/.prisma /app/deployed-api/node_modules/.prisma 2>/dev/null || \
    cp -r /app/apps/api/node_modules/.prisma /app/deployed-api/node_modules/.prisma 2>/dev/null || \
    find /app -name ".prisma" -type d -exec cp -r {} /app/deployed-api/node_modules/ \; 2>/dev/null || true


# ===================================================
# Stage 2: Minimal Production Runtime
# ===================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init for proper PID 1 signal forwarding
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3333

# Create non-root application user
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs

# Copy deployed runtime files
COPY --from=builder --chown=nestjs:nestjs /app/deployed-api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/package.json ./package.json

USER nestjs

EXPOSE 3333

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3333/api/v1/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]

