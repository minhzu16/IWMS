import { pool } from './db.js';

export async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Starting migration...');
    await client.query('BEGIN');

    // 1. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','PURCHASING','WAREHOUSE','SALES','VIEWER')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL
      );
    `);

    // 3. Warehouses
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id BIGSERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    // User Warehouses
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_warehouses (
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, warehouse_id)
      );
    `);

    // 4. Products
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
        uom TEXT NOT NULL DEFAULT 'pcs',
        standard_cost NUMERIC(14,2) DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 5. Suppliers
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGSERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        default_lead_time_days INT DEFAULT 7,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
    `);

    // 6. Supplier Products
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_products (
        supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
        product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
        supplier_sku TEXT,
        unit_price NUMERIC(14,2),
        min_order_qty INT DEFAULT 1,
        PRIMARY KEY (supplier_id, product_id)
      );
    `);

    // 7. Product Warehouse Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_warehouse_settings (
        product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
        reorder_point INT NOT NULL DEFAULT 0,
        reorder_qty INT NOT NULL DEFAULT 10,
        max_stock INT,
        preferred_supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
        PRIMARY KEY (product_id, warehouse_id)
      );
    `);

    // 8. Stock Levels (Live balance cache)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_levels (
        product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
        on_hand NUMERIC(14,3) NOT NULL DEFAULT 0,
        reserved NUMERIC(14,3) NOT NULL DEFAULT 0,
        damaged NUMERIC(14,3) NOT NULL DEFAULT 0,
        avg_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (product_id, warehouse_id),
        CHECK (on_hand >= 0),
        CHECK (reserved >= 0),
        CHECK (damaged >= 0),
        CHECK (reserved <= on_hand)
      );
    `);

    // 9. Stock Movements (Append-only Ledger)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id BIGSERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id),
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        movement_type TEXT NOT NULL,
        qty_on_hand_delta NUMERIC(14,3) NOT NULL DEFAULT 0,
        qty_damaged_delta NUMERIC(14,3) NOT NULL DEFAULT 0,
        unit_cost NUMERIC(14,4),
        balance_after NUMERIC(14,3) NOT NULL,
        source_doc_type TEXT NOT NULL,
        source_doc_id BIGINT NOT NULL,
        source_line_id BIGINT,
        reversal_of BIGINT REFERENCES stock_movements(id),
        note TEXT,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_stock_mov_pw_date ON stock_movements (product_id, warehouse_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_stock_mov_source ON stock_movements (source_doc_type, source_doc_id);
    `);

    // Immutability Trigger for stock_movements
    await client.query(`
      CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'stock_movements is append-only and cannot be updated or deleted';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS stock_movements_immutable ON stock_movements;
      CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements
      FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
    `);

    // 10. Purchase Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id BIGSERIAL PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status TEXT NOT NULL DEFAULT 'DRAFT',
        expected_date DATE,
        approved_by BIGINT REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        version INT NOT NULL DEFAULT 0,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS purchase_order_lines (
        id BIGSERIAL PRIMARY KEY,
        po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        qty_ordered NUMERIC(14,3) NOT NULL CHECK (qty_ordered > 0),
        qty_received NUMERIC(14,3) NOT NULL DEFAULT 0,
        unit_price NUMERIC(14,2) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id BIGSERIAL PRIMARY KEY,
        gr_number TEXT UNIQUE NOT NULL,
        po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
        received_by BIGINT NOT NULL REFERENCES users(id),
        received_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS goods_receipt_lines (
        id BIGSERIAL PRIMARY KEY,
        gr_id BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        po_line_id BIGINT NOT NULL REFERENCES purchase_order_lines(id),
        qty_received NUMERIC(14,3) NOT NULL CHECK (qty_received >= 0),
        qty_damaged NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_damaged >= 0)
      );
    `);

    // 11. Sales Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id BIGSERIAL PRIMARY KEY,
        so_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status TEXT NOT NULL DEFAULT 'DRAFT',
        version INT NOT NULL DEFAULT 0,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sales_order_lines (
        id BIGSERIAL PRIMARY KEY,
        so_id BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        qty_ordered NUMERIC(14,3) NOT NULL CHECK (qty_ordered > 0),
        qty_shipped NUMERIC(14,3) NOT NULL DEFAULT 0,
        unit_price NUMERIC(14,2) NOT NULL
      );
    `);

    // 12. Transfers
    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id BIGSERIAL PRIMARY KEY,
        transfer_number TEXT UNIQUE NOT NULL,
        source_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        target_warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status TEXT NOT NULL DEFAULT 'DRAFT',
        notes TEXT,
        version INT NOT NULL DEFAULT 0,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS transfer_lines (
        id BIGSERIAL PRIMARY KEY,
        transfer_id BIGINT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        qty_dispatched NUMERIC(14,3) NOT NULL CHECK (qty_dispatched > 0),
        qty_received NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
        qty_damaged NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_damaged >= 0)
      );
    `);

    // 13. Damage Reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS damage_reports (
        id BIGSERIAL PRIMARY KEY,
        report_number TEXT UNIQUE NOT NULL,
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status TEXT NOT NULL DEFAULT 'REPORTED',
        notes TEXT,
        approved_by BIGINT REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS damage_lines (
        id BIGSERIAL PRIMARY KEY,
        report_id BIGINT NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
        reason TEXT NOT NULL,
        disposition TEXT NOT NULL CHECK (disposition IN ('WRITE_OFF', 'RETURN_TO_SUPPLIER')),
        supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL
      );
    `);

    // 14. Stock Counts
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_counts (
        id BIGSERIAL PRIMARY KEY,
        count_number TEXT UNIQUE NOT NULL,
        warehouse_id BIGINT NOT NULL REFERENCES warehouses(id),
        status TEXT NOT NULL DEFAULT 'DRAFT',
        notes TEXT,
        approved_by BIGINT REFERENCES users(id),
        approved_at TIMESTAMPTZ,
        created_by BIGINT NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS stock_count_lines (
        id BIGSERIAL PRIMARY KEY,
        count_id BIGINT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES products(id),
        system_qty NUMERIC(14,3) NOT NULL,
        counted_qty NUMERIC(14,3) NOT NULL,
        variance NUMERIC(14,3) NOT NULL
      );
    `);

    // 15. Audit Logs, Idempotency, Notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id BIGINT,
        before JSONB,
        after JSONB,
        ip TEXT,
        request_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        request_hash TEXT NOT NULL,
        response_status INT,
        response_body JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        type TEXT NOT NULL,
        payload JSONB,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query('COMMIT');
    console.log('[Migration] Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
