import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users
export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('VIEWER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// User Warehouses (RBAC Warehouse scope)
export const userWarehouses = pgTable(
  'user_warehouses',
  {
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    warehouseId: bigint('warehouse_id', { mode: 'number' })
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.warehouseId] }),
  ],
);

// Categories
export const categories = pgTable('categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  parentId: bigint('parent_id', { mode: 'number' }),
  name: text('name').notNull(),
});

// Warehouses
export const warehouses = pgTable('warehouses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
});

// Products
export const products = pgTable('products', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode').unique(),
  name: text('name').notNull(),
  categoryId: bigint('category_id', { mode: 'number' }).references(() => categories.id),
  uom: text('uom').notNull().default('pcs'),
  standardCost: numeric('standard_cost', { precision: 14, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Suppliers
export const suppliers = pgTable('suppliers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  defaultLeadTimeDays: integer('default_lead_time_days').default(7),
  isActive: boolean('is_active').notNull().default(true),
});

// Supplier Products
export const supplierProducts = pgTable(
  'supplier_products',
  {
    supplierId: bigint('supplier_id', { mode: 'number' })
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    supplierSku: text('supplier_sku'),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }),
    minOrderQty: integer('min_order_qty').default(1),
  },
  (table) => [
    primaryKey({ columns: [table.supplierId, table.productId] }),
  ],
);

// Product Warehouse Settings
export const productWarehouseSettings = pgTable(
  'product_warehouse_settings',
  {
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    warehouseId: bigint('warehouse_id', { mode: 'number' })
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    reorderPoint: integer('reorder_point').notNull().default(0),
    reorderQty: integer('reorder_qty').notNull().default(10),
    maxStock: integer('max_stock'),
    preferredSupplierId: bigint('preferred_supplier_id', { mode: 'number' }).references(
      () => suppliers.id,
    ),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.warehouseId] }),
  ],
);

// Stock Levels (live balance cache, updated atomically inside same transaction as movement)
export const stockLevels = pgTable(
  'stock_levels',
  {
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    warehouseId: bigint('warehouse_id', { mode: 'number' })
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    onHand: numeric('on_hand', { precision: 14, scale: 3 }).notNull().default('0'),
    reserved: numeric('reserved', { precision: 14, scale: 3 }).notNull().default('0'),
    damaged: numeric('damaged', { precision: 14, scale: 3 }).notNull().default('0'),
    avgCost: numeric('avg_cost', { precision: 14, scale: 4 }).notNull().default('0'),
    version: integer('version').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.warehouseId] }),
    check('chk_on_hand_positive', sql`${table.onHand} >= 0`),
    check('chk_reserved_positive', sql`${table.reserved} >= 0`),
    check('chk_damaged_positive', sql`${table.damaged} >= 0`),
    check('chk_reserved_le_on_hand', sql`${table.reserved} <= ${table.onHand}`),
  ],
);

// Stock Movements (Immutable Ledger - Append Only)
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id),
    warehouseId: bigint('warehouse_id', { mode: 'number' })
      .notNull()
      .references(() => warehouses.id),
    movementType: text('movement_type').notNull(),
    qtyOnHandDelta: numeric('qty_on_hand_delta', { precision: 14, scale: 3 }).notNull().default('0'),
    qtyDamagedDelta: numeric('qty_damaged_delta', { precision: 14, scale: 3 }).notNull().default('0'),
    unitCost: numeric('unit_cost', { precision: 14, scale: 4 }),
    balanceAfter: numeric('balance_after', { precision: 14, scale: 3 }).notNull(),
    sourceDocType: text('source_doc_type').notNull(),
    sourceDocId: bigint('source_doc_id', { mode: 'number' }).notNull(),
    sourceLineId: bigint('source_line_id', { mode: 'number' }),
    reversalOf: bigint('reversal_of', { mode: 'number' }),
    note: text('note'),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_stock_mov_pw_date').on(table.productId, table.warehouseId, table.createdAt),
    index('idx_stock_mov_source').on(table.sourceDocType, table.sourceDocId),
  ],
);

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: bigint('supplier_id', { mode: 'number' })
    .notNull()
    .references(() => suppliers.id),
  warehouseId: bigint('warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  status: text('status').notNull().default('DRAFT'),
  expectedDate: date('expected_date'),
  approvedBy: bigint('approved_by', { mode: 'number' }).references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  version: integer('version').notNull().default(0),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Purchase Order Lines
export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  poId: bigint('po_id', { mode: 'number' })
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id),
  qtyOrdered: numeric('qty_ordered', { precision: 14, scale: 3 }).notNull(),
  qtyReceived: numeric('qty_received', { precision: 14, scale: 3 }).notNull().default('0'),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
});

// Goods Receipts
export const goodsReceipts = pgTable('goods_receipts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  grNumber: text('gr_number').notNull().unique(),
  poId: bigint('po_id', { mode: 'number' })
    .notNull()
    .references(() => purchaseOrders.id),
  receivedBy: bigint('received_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

// Goods Receipt Lines
export const goodsReceiptLines = pgTable('goods_receipt_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  grId: bigint('gr_id', { mode: 'number' })
    .notNull()
    .references(() => goodsReceipts.id, { onDelete: 'cascade' }),
  poLineId: bigint('po_line_id', { mode: 'number' })
    .notNull()
    .references(() => purchaseOrderLines.id),
  qtyReceived: numeric('qty_received', { precision: 14, scale: 3 }).notNull(),
  qtyDamaged: numeric('qty_damaged', { precision: 14, scale: 3 }).notNull().default('0'),
});

// Sales Orders
export const salesOrders = pgTable('sales_orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  soNumber: text('so_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  warehouseId: bigint('warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  status: text('status').notNull().default('DRAFT'),
  version: integer('version').notNull().default(0),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Sales Order Lines
export const salesOrderLines = pgTable('sales_order_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  soId: bigint('so_id', { mode: 'number' })
    .notNull()
    .references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id),
  qtyOrdered: numeric('qty_ordered', { precision: 14, scale: 3 }).notNull(),
  qtyShipped: numeric('qty_shipped', { precision: 14, scale: 3 }).notNull().default('0'),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
});

// Transfers
export const transfers = pgTable('transfers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  transferNumber: text('transfer_number').notNull().unique(),
  sourceWarehouseId: bigint('source_warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  targetWarehouseId: bigint('target_warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  status: text('status').notNull().default('DRAFT'),
  notes: text('notes'),
  version: integer('version').notNull().default(0),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Transfer Lines
export const transferLines = pgTable('transfer_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  transferId: bigint('transfer_id', { mode: 'number' })
    .notNull()
    .references(() => transfers.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id),
  qtyDispatched: numeric('qty_dispatched', { precision: 14, scale: 3 }).notNull(),
  qtyReceived: numeric('qty_received', { precision: 14, scale: 3 }).notNull().default('0'),
  qtyDamaged: numeric('qty_damaged', { precision: 14, scale: 3 }).notNull().default('0'),
});

// Damage Reports
export const damageReports = pgTable('damage_reports', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  reportNumber: text('report_number').notNull().unique(),
  warehouseId: bigint('warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  status: text('status').notNull().default('REPORTED'),
  notes: text('notes'),
  approvedBy: bigint('approved_by', { mode: 'number' }).references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Damage Lines
export const damageLines = pgTable('damage_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  reportId: bigint('report_id', { mode: 'number' })
    .notNull()
    .references(() => damageReports.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id),
  qty: numeric('qty', { precision: 14, scale: 3 }).notNull(),
  reason: text('reason').notNull(),
  disposition: text('disposition').notNull(), // WRITE_OFF | RETURN_TO_SUPPLIER
  supplierId: bigint('supplier_id', { mode: 'number' }).references(() => suppliers.id),
});

// Stock Counts (Cycle Counts)
export const stockCounts = pgTable('stock_counts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  countNumber: text('count_number').notNull().unique(),
  warehouseId: bigint('warehouse_id', { mode: 'number' })
    .notNull()
    .references(() => warehouses.id),
  status: text('status').notNull().default('DRAFT'),
  notes: text('notes'),
  approvedBy: bigint('approved_by', { mode: 'number' }).references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Stock Count Lines
export const stockCountLines = pgTable('stock_count_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  countId: bigint('count_id', { mode: 'number' })
    .notNull()
    .references(() => stockCounts.id, { onDelete: 'cascade' }),
  productId: bigint('product_id', { mode: 'number' })
    .notNull()
    .references(() => products.id),
  systemQty: numeric('system_qty', { precision: 14, scale: 3 }).notNull(),
  countedQty: numeric('counted_qty', { precision: 14, scale: 3 }).notNull(),
  variance: numeric('variance', { precision: 14, scale: 3 }).notNull(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: bigint('entity_id', { mode: 'number' }),
  before: jsonb('before'),
  after: jsonb('after'),
  ip: text('ip'),
  requestId: text('request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Idempotency Keys
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  requestHash: text('request_hash').notNull(),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
