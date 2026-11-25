import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

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
