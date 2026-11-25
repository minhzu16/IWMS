import {
  pgTable,
  bigserial,
  bigint,
  text,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { products, suppliers, warehouses } from './catalog.js';

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
