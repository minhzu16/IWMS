import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { warehouses } from './catalog.js';

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
