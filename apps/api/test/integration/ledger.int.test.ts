import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL_TEST)('ledger on real PostgreSQL', () => {
  let pool: any;
  let StockPostingService: any;
  let InsufficientStockException: any;
  let userId: number;
  let warehouseId: number;
  let productAId: number;
  let productBId: number;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const dbModule = await import('@iwms/db');
    pool = dbModule.pool;
    const { runMigration } = dbModule;

    const stockPostingModule = await import('../../src/modules/inventory/stock-posting.service.js');
    StockPostingService = stockPostingModule.StockPostingService;

    const problemDetailsModule = await import('../../src/common/problem-details.filter.js');
    InsufficientStockException = problemDetailsModule.InsufficientStockException;

    await runMigration();

    await pool.query(
      'TRUNCATE users, warehouses, products, stock_levels, stock_movements, audit_logs RESTART IDENTITY CASCADE',
    );

    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('integration-test@iwms.local', 'dummy-hash', 'Test User', 'ADMIN')
       RETURNING id`,
    );
    userId = Number(userRes.rows[0].id);

    const whRes = await pool.query(
      `INSERT INTO warehouses (code, name)
       VALUES ('WH-INT-01', 'Integration Warehouse')
       RETURNING id`,
    );
    warehouseId = Number(whRes.rows[0].id);

    const prodARes = await pool.query(
      `INSERT INTO products (sku, name)
       VALUES ('PROD-INT-A', 'Product A')
       RETURNING id`,
    );
    productAId = Number(prodARes.rows[0].id);

    const prodBRes = await pool.query(
      `INSERT INTO products (sku, name)
       VALUES ('PROD-INT-B', 'Product B')
       RETURNING id`,
    );
    productBId = Number(prodBRes.rows[0].id);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  const withTx = async <T>(fn: (client: any) => Promise<T>): Promise<T> => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  };

  const post = (productId: number, qty: number, unitCost?: number) => {
    return withTx(async (client) => {
      const line = {
        productId,
        warehouseId,
        movementType: qty >= 0 ? 'PURCHASE_RECEIPT' : 'SALE_SHIPMENT',
        qtyOnHandDelta: qty,
        qtyDamagedDelta: 0,
        unitCost: unitCost !== undefined ? unitCost : null,
        sourceDocType: 'TEST',
        sourceDocId: 1,
      };
      return new StockPostingService().postMovements(
        client,
        { sourceDocType: 'TEST', sourceDocId: 1 },
        [line],
        userId,
      );
    });
  };

  beforeEach(async () => {
    await pool.query(
      'TRUNCATE stock_levels, stock_movements, audit_logs RESTART IDENTITY CASCADE',
    );
  });

  it('ledger is append-only', async () => {
    await post(productAId, 1, 10);

    await expect(pool.query("UPDATE stock_movements SET note = 'x'")).rejects.toThrow();
    await expect(pool.query('DELETE FROM stock_movements')).rejects.toThrow();
  });

  it('on_hand equals SUM(ledger)', async () => {
    await post(productAId, 10, 5);
    await post(productAId, -4);

    const levelRes = await pool.query(
      'SELECT on_hand, avg_cost FROM stock_levels WHERE product_id = $1 AND warehouse_id = $2',
      [productAId, warehouseId],
    );
    expect(Number(levelRes.rows[0].on_hand)).toBe(6);
    expect(Number(levelRes.rows[0].avg_cost)).toBe(5);

    const sumRes = await pool.query(
      'SELECT SUM(qty_on_hand_delta) as total FROM stock_movements WHERE product_id = $1',
      [productAId],
    );
    expect(Number(sumRes.rows[0].total)).toBe(6);
  });

  it('insufficient stock rolls back', async () => {
    await post(productAId, 10, 5);

    const countBefore = await pool.query('SELECT COUNT(*) FROM stock_movements');
    const initialCount = Number(countBefore.rows[0].count);

    await expect(post(productAId, -100)).rejects.toBeInstanceOf(InsufficientStockException);

    const countAfter = await pool.query('SELECT COUNT(*) FROM stock_movements');
    expect(Number(countAfter.rows[0].count)).toBe(initialCount);
  });

  it(
    'no overselling under 50 concurrent issues',
    async () => {
      await post(productBId, 10, 5);

      // Open every pool connection up front: lazily created connections stagger the transactions so much
      // that they rarely overlap, and the test would pass even without the row lock.
      const warm = await Promise.all(Array.from({ length: 20 }, () => pool.connect()));
      warm.forEach((c: { release: () => void }) => c.release());

      const promises = Array.from({ length: 50 }, () => post(productBId, -1));
      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(10);
      expect(rejected).toHaveLength(40);

      // Assert that each rejection reason is an InsufficientStockException (not a pool timeout or infra error)
      for (const r of rejected) {
        expect((r as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockException);
      }

      const levelRes = await pool.query(
        'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND warehouse_id = $2',
        [productBId, warehouseId],
      );
      expect(Number(levelRes.rows[0].on_hand)).toBe(0);

      const sumRes = await pool.query(
        'SELECT SUM(qty_on_hand_delta) as total FROM stock_movements WHERE product_id = $1',
        [productBId],
      );
      expect(Number(sumRes.rows[0].total)).toBe(0);
    },
    30000,
  );
});
