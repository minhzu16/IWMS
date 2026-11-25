import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/common/guards.js';

const { query, release } = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
const fakeClient = { query, release };
vi.mock('@iwms/db', () => ({
  pool: {
    query,
    connect: vi.fn(async () => fakeClient),
  },
}));

const ACCESS = 'query-token-scope-access-secret-0123456789abcdef';
process.env.JWT_SECRET = ACCESS;
process.env.JWT_REFRESH_SECRET = 'query-token-scope-refresh-secret-0123456789abcd';

const jwt = new JwtService({ secret: ACCESS });
const tokenFor = (role: string, id = '1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@iwms.local`, fullName: role, role, warehouses: [], typ: 'access' });

let app: INestApplication;
let base = '';
let userDb: Record<string, { role: string; is_active: boolean }> = {};

beforeAll(async () => {
  const { InventoryController } = await import('../src/modules/inventory/inventory.controller.js');
  const { InventoryService } = await import('../src/modules/inventory/inventory.service.js');
  const { AdminController } = await import('../src/modules/admin/admin.controller.js');
  const { AdminService } = await import('../src/modules/admin/admin.service.js');

  @Module({
    controllers: [InventoryController, AdminController],
    providers: [
      {
        provide: InventoryService,
        useValue: {
          getLevels: vi.fn().mockResolvedValue([]),
          getMovements: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }),
          getAsOfStock: vi.fn().mockResolvedValue([]),
          createAdjustment: vi.fn().mockResolvedValue({ message: 'ok' }),
          reconcile: vi.fn().mockResolvedValue({ isConsistent: true, discrepancyCount: 0, discrepancies: [] }),
        },
      },
      {
        provide: AdminService,
        useValue: {
          stats: vi.fn().mockResolvedValue({ users: { total: 1, active: 1 } }),
          listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
          createUser: vi.fn().mockResolvedValue({ id: 2 }),
          updateUser: vi.fn().mockResolvedValue({ id: 2 }),
        },
      },
      { provide: JwtService, useValue: jwt },
      Reflector,
    ],
  })
  class TestModule {}

  app = await NestFactory.create(TestModule, { logger: false });

  // Middleware allowing both /api/v1/... and direct /... requests to route correctly
  app.use((req: any, _res: any, next: () => void) => {
    if (typeof req.url === 'string' && req.url.startsWith('/api/v1/')) {
      req.url = req.url.slice(7);
    }
    next();
  });

  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

function resetMocks() {
  query.mockReset();
  release.mockReset();
  userDb = {
    '1': { role: 'ADMIN', is_active: true },
  };

  query.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (typeof sql === 'string' && sql.includes('SELECT role, is_active FROM users WHERE id = $1')) {
      const id = String(params?.[0] ?? '1');
      const u = userDb[id] ?? { role: 'ADMIN', is_active: true };
      return { rows: [u] };
    }
    return { rows: [] };
  });
}

beforeEach(() => {
  resetMocks();
});

describe('Query token scope (F6)', () => {
  it('valid admin token sent as ?token= -> 200/stream accepted on /inventory/stream (status not 401)', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const controller = new AbortController();

    try {
      const res = await fetch(`${base}/inventory/stream?token=${adminToken}`, {
        signal: controller.signal,
      });

      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
    } finally {
      controller.abort();
    }
  });

  it('valid admin token sent as ?token= on /api/v1/inventory/stream -> 200/stream accepted (status not 401)', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const controller = new AbortController();

    try {
      const res = await fetch(`${base}/api/v1/inventory/stream?token=${adminToken}`, {
        signal: controller.signal,
      });

      expect(res.status).not.toBe(401);
      expect(res.status).toBe(200);
    } finally {
      controller.abort();
    }
  });

  it('valid admin token sent as ?token= on GET /api/v1/admin/stats -> 401', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const res = await fetch(`${base}/api/v1/admin/stats?token=${adminToken}`);
    expect(res.status).toBe(401);
  });

  it('valid admin token sent as ?token= on GET /admin/stats -> 401', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const res = await fetch(`${base}/admin/stats?token=${adminToken}`);
    expect(res.status).toBe(401);
  });

  it('valid admin token sent via Authorization: Bearer on GET /api/v1/admin/stats -> 200', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const res = await fetch(`${base}/api/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('request without token on /inventory/stream -> 401', async () => {
    const controller = new AbortController();
    try {
      const res = await fetch(`${base}/inventory/stream`, {
        signal: controller.signal,
      });
      expect(res.status).toBe(401);
    } finally {
      controller.abort();
    }
  });

  it('valid admin token sent as ?token= on non-stream inventory route (/inventory/levels) -> 401', async () => {
    const adminToken = tokenFor('ADMIN', '1');
    const res = await fetch(`${base}/inventory/levels?token=${adminToken}`);
    expect(res.status).toBe(401);
  });

  it('JwtAuthGuard constructor accepts Reflector or defaults gracefully', () => {
    const guardWithDefault = new JwtAuthGuard(jwt);
    expect(guardWithDefault).toBeDefined();

    const customReflector = new Reflector();
    const guardWithReflector = new JwtAuthGuard(jwt, customReflector);
    expect(guardWithReflector).toBeDefined();
  });
});
