import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

const { query, release } = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
const fakeClient = { query, release };
vi.mock('@iwms/db', () => ({
  pool: {
    query,
    connect: vi.fn(async () => fakeClient),
  },
}));

const ACCESS = 'admin-test-access-secret-0123456789abcdef';
process.env.JWT_SECRET = ACCESS;
process.env.JWT_REFRESH_SECRET = 'admin-test-refresh-secret-0123456789abcd';

const jwt = new JwtService({ secret: ACCESS });
// pg returns BIGSERIAL ids as strings, so real tokens carry id as a string.
const tokenFor = (role: string, id = '1') =>
  jwt.sign({ id, email: `${role.toLowerCase()}@iwms.local`, fullName: role, role, warehouses: [], typ: 'access' });

let app: INestApplication;
let base = '';

beforeAll(async () => {
  const { AdminController } = await import('../src/modules/admin/admin.controller.js');
  const { AdminService } = await import('../src/modules/admin/admin.service.js');
  @Module({ controllers: [AdminController], providers: [AdminService, { provide: JwtService, useValue: jwt }] })
  class TestModule {}
  app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
});
afterAll(async () => { await app.close(); });
type QueryResultLike = { rows: Array<Record<string, unknown>> } | Error;
let serviceResponses: QueryResultLike[] = [];
let serviceCalls: Array<[string, unknown[] | undefined]> = [];
let userDb: Record<string, { role: string; is_active: boolean }> = {};

function resetMocks() {
  query.mockReset();
  release.mockReset();
  serviceResponses = [];
  serviceCalls = [];
  userDb = {
    '1': { role: 'ADMIN', is_active: true },
    '4': { role: 'WAREHOUSE', is_active: true },
  };

  query.mockImplementation(async (sql: string, params?: unknown[]) => {
    if (typeof sql === 'string') {
      if (sql.includes('SELECT role, is_active FROM users WHERE id = $1')) {
        const id = String(params?.[0] ?? '1');
        const u = userDb[id] ?? { role: 'ADMIN', is_active: true };
        return { rows: [u] };
      }
      if (sql === 'BEGIN' || sql.includes('pg_advisory_xact_lock') || sql === 'COMMIT' || sql === 'ROLLBACK') {
        serviceCalls.push([sql, params]);
        return { rows: [] };
      }
    }

    serviceCalls.push([sql, params]);
    const next = serviceResponses.shift();
    if (next instanceof Error) throw next;
    if (next !== undefined) return next;
    return { rows: [] };
  });

  query.mockResolvedValueOnce = (val: QueryResultLike) => {
    serviceResponses.push(val);
    return query;
  };
  query.mockRejectedValueOnce = (err: Error) => {
    serviceResponses.push(err);
    return query;
  };
}

beforeEach(() => resetMocks());

const call = (method: string, path: string, token?: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('admin API', () => {
  it('GET /admin/stats without token -> 401; with tokenFor("VIEWER") -> 403; service query not called in either', async () => {
    const unauthed = await call('GET', '/admin/stats');
    expect(unauthed.status).toBe(401);
    expect(serviceCalls).toHaveLength(0);

    userDb['1'] = { role: 'VIEWER', is_active: true };
    const forbidden = await call('GET', '/admin/stats', tokenFor('VIEWER'));
    expect(forbidden.status).toBe(403);
    expect(serviceCalls).toHaveLength(0);
  });

  it('tokenFor("ADMIN") with user deactivated in DB -> 401 immediately', async () => {
    userDb['1'] = { role: 'ADMIN', is_active: false };
    const res = await call('GET', '/admin/stats', tokenFor('ADMIN', '1'));
    expect(res.status).toBe(401);
    expect(serviceCalls).toHaveLength(0);
  });

  it('tokenFor("ADMIN") with user demoted to VIEWER in DB -> 403 immediately', async () => {
    userDb['1'] = { role: 'VIEWER', is_active: true };
    const res = await call('GET', '/admin/stats', tokenFor('ADMIN', '1'));
    expect(res.status).toBe(403);
    expect(serviceCalls).toHaveLength(0);
  });

  it('tokenFor("ADMIN") GET /admin/users?search=kho returns mapped items without password_hash and binds query params', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '4',
          email: 'w@iwms.local',
          full_name: 'Kho',
          role: 'WAREHOUSE',
          is_active: true,
          created_at: '2026-01-01',
          total: 1,
          password_hash: 'LEAK',
        },
      ],
    });

    const res = await call('GET', '/admin/users?search=kho', tokenFor('ADMIN'));
    expect(res.status).toBe(200);

    const raw = await res.text();
    expect(raw).not.toContain('LEAK');

    const body = JSON.parse(raw);
    expect(body.items[0]).toEqual({
      id: 4,
      email: 'w@iwms.local',
      fullName: 'Kho',
      role: 'WAREHOUSE',
      isActive: true,
      createdAt: '2026-01-01',
    });

    expect(serviceCalls[0][0]).not.toContain('password_hash');
    expect(serviceCalls[0][1]?.[0]).toBe('%kho%');
  });

  it('GET /admin/users on empty page returns correct total from count query', async () => {
    serviceResponses.push({ rows: [] }); // data query returns 0 rows
    serviceResponses.push({ rows: [{ total: 15 }] }); // count query returns 15
    const res = await call('GET', '/admin/users?page=10', tokenFor('ADMIN'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(15);
  });

  it('POST /admin/users with short password -> 400; service query not called', async () => {
    const res = await call('POST', '/admin/users', tokenFor('ADMIN'), {
      email: 'n@iwms.local',
      fullName: 'N',
      role: 'SALES',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(serviceCalls).toHaveLength(0);
  });

  it('POST /admin/users valid body with duplicate email code 23505 -> 409', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));

    const res = await call('POST', '/admin/users', tokenFor('ADMIN'), {
      email: 'n@iwms.local',
      fullName: 'N',
      role: 'SALES',
      password: 'LongEnough123',
    });
    expect(res.status).toBe(409);
  });

  it('PATCH /admin/users/1 { isActive: false } with tokenFor("ADMIN", "1") -> 400 and service query not called', async () => {
    const res = await call('PATCH', '/admin/users/1', tokenFor('ADMIN', '1'), { isActive: false });
    expect(res.status).toBe(400);
    expect(serviceCalls).toHaveLength(0);
  });

  it('PATCH /admin/users/2 {} -> 400; PATCH /admin/users/2 { role: "SALES" } with empty rows -> 404', async () => {
    const emptyRes = await call('PATCH', '/admin/users/2', tokenFor('ADMIN'), {});
    expect(emptyRes.status).toBe(400);

    query.mockResolvedValueOnce({ rows: [] });
    const notFoundRes = await call('PATCH', '/admin/users/2', tokenFor('ADMIN'), { role: 'SALES' });
    expect(notFoundRes.status).toBe(404);
  });

  it('PATCH /admin/users/2 preventing removing last active admin -> 400', async () => {
    serviceResponses.push({ rows: [{ id: '2', role: 'ADMIN', is_active: true }] }); // SELECT ... FOR UPDATE
    serviceResponses.push({ rows: [{ n: 0 }] }); // others count
    const res = await call('PATCH', '/admin/users/2', tokenFor('ADMIN'), { role: 'VIEWER' });
    expect(res.status).toBe(400);
  });

  it('GET /admin/stats with four queries -> 200 and aggregates correctly', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          { role: 'ADMIN', n: '2', active: '2' },
          { role: 'SALES', n: '3', active: '1' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ products: '12', warehouses: '3' }] })
      .mockResolvedValueOnce({ rows: [{ out_of_stock: '1', on_hand_value: '1500.50' }] })
      .mockResolvedValueOnce({ rows: [{ n: '24' }] });

    const res = await call('GET', '/admin/stats', tokenFor('ADMIN'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.users.total).toBe(5);
    expect(body.users.active).toBe(3);
    expect(body.users.byRole.VIEWER).toBe(0);
    expect(body.stock.onHandValue).toBe(1500.5);
    expect(body.movements.last24h).toBe(24);
  });
});
