import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  numeric,
  timestamp,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth.js';
import { products, warehouses } from './catalog.js';

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
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
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
    batchNumber: text('batch_number'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
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
