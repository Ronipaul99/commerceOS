# syntax=docker/dockerfile:1
# Official Node images support linux/amd64 and linux/arm64. No forced platform.
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# Root postinstall needs source files, copied in the build stage. Run native
# dependency setup explicitly here so migrations need no engine download at startup.
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && npm rebuild @prisma/engines esbuild sharp

FROM dependencies AS build
COPY . .
ENV API_INTERNAL_URL=http://api:4000 NEXT_OUTPUT_STANDALONE=true
RUN npm run db:generate && npm run build

# Includes the migration CLI for the one-shot migrate/seed jobs in Stage 01.
# Separate minimal migration/runtime images can be qualified in Stage 06.
FROM base AS api
ENV NODE_ENV=production API_HOST=0.0.0.0 API_PORT=4000
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]

FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 API_INTERNAL_URL=http://api:4000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
