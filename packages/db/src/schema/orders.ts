import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  numeric,
  timestamp,
  date,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { products, suppliers, warehouses } from './catalog.js';

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
