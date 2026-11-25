// ---------------------------------------------------------------------------
// Reports Types
// ---------------------------------------------------------------------------

export interface StockValuationItem {
  warehouse_name: string;
  total_valuation: number;
  sku_count: number;
  total_on_hand: number;
}

export interface LowStockAlert {
  product_id: number;
  sku: string;
  product_name: string;
  warehouse_name?: string;
  warehouse_id?: number;
  available: number;
  reorder_point: number;
  suggested_po_qty?: number;
  preferred_supplier_name?: string;
  preferred_supplier_id?: number;
}

export interface ABCAnalysisItem {
  sku: string;
  product_name: string;
  total_shipped_value: number;
  abc_class: string;
}

export interface MovementSummaryItem {
  movement_type: string;
  count: number;
  total_quantity?: number;
}

// ---------------------------------------------------------------------------
// Audit Log Types
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  user_name: string;
  user_role: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface GetAuditLogsParams {
  limit?: number;
  page?: number;
  entityType?: string;
  action?: string;
  [key: string]: string | number | boolean | undefined;
}

// ---------------------------------------------------------------------------
// Admin Types
// ---------------------------------------------------------------------------

export interface AdminStats {
  users: {
    total: number;
    active: number;
    byRole: {
      ADMIN: number;
      MANAGER: number;
      PURCHASING: number;
      WAREHOUSE: number;
      SALES: number;
      VIEWER: number;
      [key: string]: number;
    };
  };
  catalog: {
    products: number;
    warehouses: number;
  };
  stock: {
    outOfStock: number;
    onHandValue: number;
  };
  movements: {
    last24h: number;
  };
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminListUsersParams {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminCreateUserInput {
  email: string;
  fullName: string;
  role: string;
  password: string;
}

export interface AdminUpdateUserInput {
  role?: string;
  isActive?: boolean;
}
