FROM node:22.22.2-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/execution-context/package.json packages/execution-context/
COPY packages/file-jobs/package.json packages/file-jobs/
COPY packages/telemetry/package.json packages/telemetry/
RUN pnpm --filter @businessos/api... install --frozen-lockfile
COPY packages/config/tsconfig*.json packages/config/
COPY packages/execution-context/tsconfig.json packages/execution-context/
COPY packages/execution-context/src/ packages/execution-context/src/
COPY packages/file-jobs/tsconfig.json packages/file-jobs/
COPY packages/file-jobs/src/ packages/file-jobs/src/
COPY packages/telemetry/tsconfig.json packages/telemetry/
COPY packages/telemetry/src/ packages/telemetry/src/
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src/ apps/api/src/
RUN pnpm --filter @businessos/api build

FROM node:22.22.2-bookworm-slim
WORKDIR /workspace
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api ./apps/api
COPY --from=build /workspace/packages/execution-context/package.json ./packages/execution-context/
COPY --from=build /workspace/packages/execution-context/dist/ ./packages/execution-context/dist/
COPY --from=build /workspace/packages/file-jobs/package.json ./packages/file-jobs/
COPY --from=build /workspace/packages/file-jobs/dist/ ./packages/file-jobs/dist/
COPY --from=build /workspace/packages/file-jobs/node_modules/ ./packages/file-jobs/node_modules/
COPY --from=build /workspace/packages/telemetry/package.json ./packages/telemetry/
COPY --from=build /workspace/packages/telemetry/dist/ ./packages/telemetry/dist/
COPY --from=build /workspace/packages/telemetry/node_modules/ ./packages/telemetry/node_modules/
USER node
WORKDIR /workspace/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
