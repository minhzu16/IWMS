import { z } from 'zod';
import {
  UserRoles,
  MovementTypes,
  DamageDispositions,
} from './constants.js';

// Auth
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Products
export const ProductCreateSchema = z.object({
  sku: z.string().min(2).max(50).toUpperCase(),
  barcode: z.string().min(3).max(50).optional().nullable(),
  name: z.string().min(2).max(255),
  categoryId: z.number().int().positive().optional().nullable(),
  uom: z.string().default('pcs'),
  standardCost: z.number().nonnegative().default(0),
});
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

export const ProductUpdateSchema = ProductCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

// Categories
export const CategoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.number().int().positive().optional().nullable(),
});
export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;

// Suppliers
export const SupplierCreateSchema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  name: z.string().min(2).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  defaultLeadTimeDays: z.number().int().positive().default(7),
});
export type SupplierCreateInput = z.infer<typeof SupplierCreateSchema>;

// Warehouses
export const WarehouseCreateSchema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  name: z.string().min(2).max(255),
  address: z.string().optional().nullable(),
});
export type WarehouseCreateInput = z.infer<typeof WarehouseCreateSchema>;

// Product Warehouse Settings
export const ProductWarehouseSettingSchema = z.object({
  reorderPoint: z.number().nonnegative().default(0),
  reorderQty: z.number().positive().default(10),
  maxStock: z.number().positive().optional().nullable(),
  preferredSupplierId: z.number().int().positive().optional().nullable(),
});
export type ProductWarehouseSettingInput = z.infer<typeof ProductWarehouseSettingSchema>;

// Stock Movements / Posting
export const MovementLineSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  movementType: z.enum([
    MovementTypes.OPENING,
    MovementTypes.PURCHASE_RECEIPT,
    MovementTypes.SALE_RESERVE,
    MovementTypes.SALE_RELEASE,
    MovementTypes.SALE_SHIPMENT,
    MovementTypes.TRANSFER_OUT,
    MovementTypes.TRANSFER_IN,
    MovementTypes.DAMAGE,
    MovementTypes.DAMAGE_WRITE_OFF,
    MovementTypes.RETURN_TO_SUPPLIER,
    MovementTypes.CUSTOMER_RETURN,
    MovementTypes.ADJUSTMENT_IN,
    MovementTypes.ADJUSTMENT_OUT,
    MovementTypes.REVERSAL,
  ]),
  qtyOnHandDelta: z.number(),
  qtyDamagedDelta: z.number().default(0),
  unitCost: z.number().optional().nullable(),
  sourceDocType: z.string(),
  sourceDocId: z.number().int().positive(),
  sourceLineId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});
export type MovementLineInput = z.infer<typeof MovementLineSchema>;

// Purchase Orders
export const POLineCreateSchema = z.object({
  productId: z.number().int().positive(),
  qtyOrdered: z.number().positive(),
  unitPrice: z.number().positive(),
});
export type POLineCreateInput = z.infer<typeof POLineCreateSchema>;

export const POCreateSchema = z.object({
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  expectedDate: z.string().optional().nullable(),
  lines: z.array(POLineCreateSchema).min(1),
});
export type POCreateInput = z.infer<typeof POCreateSchema>;

export const GoodsReceiptLineSchema = z.object({
  poLineId: z.number().int().positive(),
  qtyReceived: z.number().nonnegative(),
  qtyDamaged: z.number().nonnegative().default(0),
});

export const GoodsReceiptCreateSchema = z.object({
  lines: z.array(GoodsReceiptLineSchema).min(1),
});
export type GoodsReceiptCreateInput = z.infer<typeof GoodsReceiptCreateSchema>;

// Sales Orders
export const SOLineCreateSchema = z.object({
  productId: z.number().int().positive(),
  qtyOrdered: z.number().positive(),
  unitPrice: z.number().positive(),
});

export const SOCreateSchema = z.object({
  customerName: z.string().min(1),
  warehouseId: z.number().int().positive(),
  lines: z.array(SOLineCreateSchema).min(1),
});
export type SOCreateInput = z.infer<typeof SOCreateSchema>;

// Transfers
export const TransferLineSchema = z.object({
  productId: z.number().int().positive(),
  qtyDispatched: z.number().positive(),
});

export const TransferCreateSchema = z.object({
  sourceWarehouseId: z.number().int().positive(),
  targetWarehouseId: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  lines: z.array(TransferLineSchema).min(1),
});
export type TransferCreateInput = z.infer<typeof TransferCreateSchema>;

export const TransferReceiveLineSchema = z.object({
  lineId: z.number().int().positive(),
  qtyReceived: z.number().nonnegative(),
  qtyDamaged: z.number().nonnegative().default(0),
});

export const TransferReceiveSchema = z.object({
  lines: z.array(TransferReceiveLineSchema).min(1),
});
export type TransferReceiveInput = z.infer<typeof TransferReceiveSchema>;

// Damage Reports
export const DamageReportLineSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().positive(),
  reason: z.string().min(2),
  disposition: z.enum([DamageDispositions.WRITE_OFF, DamageDispositions.RETURN_TO_SUPPLIER]),
  supplierId: z.number().int().positive().optional().nullable(),
});

export const DamageReportCreateSchema = z.object({
  warehouseId: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  lines: z.array(DamageReportLineSchema).min(1),
});
export type DamageReportCreateInput = z.infer<typeof DamageReportCreateSchema>;

// Stock Counts (Cycle Counts)
export const StockCountLineSchema = z.object({
  productId: z.number().int().positive(),
  countedQty: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
});

export const StockCountCreateSchema = z.object({
  warehouseId: z.number().int().positive(),
  notes: z.string().optional().nullable(),
  lines: z.array(StockCountLineSchema).min(1),
});
export type StockCountCreateInput = z.infer<typeof StockCountCreateSchema>;
