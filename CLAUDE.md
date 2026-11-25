# PJ2 — Inventory & Warehouse Management System (IWMS)

Monorepo (`pnpm` workspaces): NestJS 11 API (`apps/api`), React 19 Vite frontend (`apps/web`), Drizzle DB package (`packages/db`), shared contracts (`packages/shared`).

## Common Commands
- Install: `pnpm install --frozen-lockfile`
- Lint all: `pnpm -r lint`
- Build all: `pnpm -r build`
- API tests + coverage: `pnpm --filter api test:coverage`
- API PostgreSQL integration tests (requires DB): `pnpm --filter api test:int`
- Web tests + coverage: `pnpm --filter web test:coverage`
- Web E2E (Playwright): `pnpm --filter web test:e2e`
