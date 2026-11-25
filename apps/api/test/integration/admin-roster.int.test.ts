import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AdminService } from '../../src/modules/admin/admin.service.js';

interface DbPool {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
  end(): Promise<void>;
}

describe.skipIf(!process.env.DATABASE_URL_TEST)('admin roster on real PostgreSQL', () => {
  let pool: DbPool;
  let svc: AdminService;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const dbModule = await import('@iwms/db');
    pool = dbModule.pool;
    const { runMigration } = dbModule;

    const adminModule = await import('../../src/modules/admin/admin.service.js');
    svc = new adminModule.AdminService();

    await runMigration();

    await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
    await pool.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_active)
      VALUES
        (1, 'admin1@iwms.local', 'dummy-hash', 'Admin One', 'ADMIN', true),
        (2, 'admin2@iwms.local', 'dummy-hash', 'Admin Two', 'ADMIN', true)
    `);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('guarantees at least one active ADMIN remains under concurrent demote/deactivate across 20 rounds', async () => {
    for (let round = 0; round < 20; round++) {
      await pool.query(`
        UPDATE users
        SET role = 'ADMIN', is_active = true
        WHERE id IN (1, 2)
      `);

      const results = await Promise.allSettled([
        svc.updateUser(2, { role: 'VIEWER' }, 1),
        svc.updateUser(1, { isActive: false }, 2),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const countRes = await pool.query<{ count: string | number }>(
        "SELECT count(*)::int AS count FROM users WHERE role = 'ADMIN' AND is_active",
      );
      expect(Number(countRes.rows[0].count)).toBeGreaterThanOrEqual(1);
    }
  }, 30000);
});
