import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL_TEST)('reports on real PostgreSQL', () => {
  let pool: any;
  let ReportsService: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const dbModule = await import('@iwms/db');
    pool = dbModule.pool;
    const { runMigration } = dbModule;

    const reportsModule = await import('../../src/modules/reports/reports.service.js');
    ReportsService = reportsModule.ReportsService;

    await runMigration();

    // Ensure at least one product exists so that total_summary has rows and grand_total evaluates to 0 when no stock movements exist
    await pool.query(
      `INSERT INTO products (sku, name)
       VALUES ('PROD-ABC-INT', 'Product ABC Integration')
       ON CONFLICT (sku) DO NOTHING`,
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('getABCAnalysis resolves and returns an array when ledger has no shipments', async () => {
    await pool.query(
      'TRUNCATE stock_levels, stock_movements, audit_logs RESTART IDENTITY CASCADE',
    );

    const result = await new ReportsService().getABCAnalysis();
    expect(Array.isArray(result)).toBe(true);
  });
});
