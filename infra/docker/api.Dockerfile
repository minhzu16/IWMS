FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@11.15.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @iwms/shared build
RUN pnpm --filter @iwms/db build
RUN pnpm --filter api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app ./
USER app
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
