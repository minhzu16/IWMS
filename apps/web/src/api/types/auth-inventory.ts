// ---------------------------------------------------------------------------
// Auth Types
// ---------------------------------------------------------------------------

export interface LoginInput {
  email: string;
  password: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  user?: CurrentUser;
}

// ---------------------------------------------------------------------------
// Inventory & Ledger Types
// ---------------------------------------------------------------------------

export interface GetLevelsParams {
  warehouseId?: number;
  productId?: number;
  lowStock?: boolean;
}

export interface StockLevel {
  product_id: number;
  sku: string;
  product_name: string;
  barcode?: string | null;
  uom?: string;
  warehouse_code?: string;
  warehouse_name?: string;
  warehouse_id?: number;
  on_hand: number;
  reserved: number;
  available: number;
  damaged: number;
  avg_cost?: number;
  reorder_point?: number;
}

export interface GetMovementsParams {
  productId?: number;
  warehouseId?: number;
  movementType?: string;
  page?: number;
  limit?: number;
}

export interface StockMovement {
  id: number;
  product_name?: string;
  warehouse_name?: string;
  movement_type: string;
  qty_on_hand_delta: number;
  balance_after: number;
  source_doc_type?: string;
  source_doc_id?: number;
  created_by_name?: string;
  created_at: string;
  note?: string | null;
}

export interface MovementPaginationMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface MovementListResponse {
  data: StockMovement[];
  meta?: MovementPaginationMeta;
}

export interface AsOfStockLevel {
  product_name: string;
  sku: string;
  warehouse_name: string;
  on_hand_as_of: number;
  uom: string;
  damaged_as_of: number;
}

export interface CreateAdjustmentInput {
  warehouseId: number;
  productId: number;
  delta: number;
  reason: string;
}

export interface StockAdjustmentResult {
  id?: number;
  productId?: number;
  warehouseId?: number;
  delta?: number;
  balanceAfter?: number;
  message?: string;
}

export interface ReconcileDiscrepancy {
  product_name: string;
  sku: string;
  warehouse_name: string;
  on_hand: number;
  ledger_sum: number;
  discrepancy: number;
}

export interface ReconcileResult {
  isConsistent: boolean;
  discrepancyCount: number;
  discrepancies: ReconcileDiscrepancy[];
  checkedAt: string;
  verifiedSkus?: number;
  totalMovementsAudited?: number;
}

// ---------------------------------------------------------------------------
// Catalog & Suppliers Types
// ---------------------------------------------------------------------------

export interface Product {
  id: number;
  sku: string;
  name: string;
  barcode?: string | null;
  category_name?: string;
  categoryId?: number | null;
  uom?: string;
  standard_cost?: number;
  total_on_hand?: number;
  total_available?: number;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  barcode?: string | null;
  standardCost: number;
  uom: string;
  categoryId?: number;
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  default_lead_time_days?: number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  total_spend?: number;
}

export interface SupplierPerformance {
  supplierId: number;
  totalSpend: number;
  fillRate: number;
  onTimeRate: number;
  damageRate: number;
  avgLeadTimeDays: number;
  rating: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code?: string;
  address?: string;
}
