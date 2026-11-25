/**
 * IWMS API Client with automatic backend proxying & fallback demo dataset
 */

export * from './types.js';
import type {
  ABCAnalysisItem, AdminCreateUserInput, AdminListUsersParams, AdminStats,
  AdminUpdateUserInput, AdminUser, AdminUserListResponse, AsOfStockLevel,
  AuditLogListResponse, AuthLoginResponse, Category, CreateAdjustmentInput,
  CreateDamageReportInput, CreatePOInput, CreateProductInput, CreateSOInput,
  CreateStockCountInput, CreateTransferInput, CurrentUser, DamageReport,
  GetAuditLogsParams, GetLevelsParams, GetMovementsParams, LoginInput,
  LowStockAlert, MovementListResponse, MovementSummaryItem, ProcessReceiptInput,
  Product, PurchaseOrderDetail, PurchaseOrderSummary, ReceiveTransferInput,
  ReconcileResult, SalesOrder, StockAdjustmentResult, StockCount, StockLevel,
  StockTransfer, StockValuationItem, Supplier, SupplierPerformance, Warehouse,
} from './types.js';

const API_BASE = '/api/v1';
const SESSION_HINT_KEY = 'iwms_has_session';

/** Error thrown by request(): carries the HTTP status so callers can react to 401/403/409. */
export type ApiError = Error & { status?: number };

let authToken = '';

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.removeItem('iwms_token'); // Always in-memory, never persisted to localStorage
}

export function getAuthToken(): string {
  return authToken;
}

export function hasSessionHint(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (typeof localStorage.getItem === 'function') {
      const val = localStorage.getItem(SESSION_HINT_KEY);
      if (val === '1') return true;
    }
    return (localStorage as Record<string, unknown>)[SESSION_HINT_KEY] === '1';
  } catch {
    return false;
  }
}

function setSessionHint(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (typeof localStorage.setItem === 'function') {
        localStorage.setItem(SESSION_HINT_KEY, '1');
      }
      localStorage[SESSION_HINT_KEY] = '1';
    }
  } catch {
    // Ignore storage errors
  }
}

function clearSessionHint(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(SESSION_HINT_KEY);
      }
      try {
        delete (localStorage as Record<string, unknown>)[SESSION_HINT_KEY];
      } catch {
        // Ignore
      }
    }
  } catch {
    // Ignore storage errors
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const processRefreshQueue = (token: string | null) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

export async function executeRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearSessionHint();
      }
      setAuthToken('');
      processRefreshQueue(null);
      return null;
    }
    const data = (await res.json()) as AuthLoginResponse;
    const newToken = data.accessToken || '';
    setAuthToken(newToken);
    setSessionHint();
    processRefreshQueue(newToken);
    return newToken;
  } catch {
    setAuthToken('');
    processRefreshQueue(null);
    return null;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Idempotency Key generation for mutating requests
  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (
      res.status === 401 &&
      !(options as { _retry?: boolean })._retry &&
      !path.includes('/auth/login') &&
      !path.includes('/auth/refresh')
    ) {
      if (hasSessionHint()) {
        const refreshedToken = await executeRefresh();
        if (refreshedToken) {
          headers['Authorization'] = `Bearer ${refreshedToken}`;
          const retryRes = await fetch(`${API_BASE}${path}`, {
            ...options,
            credentials: 'include',
            headers,
          });
          if (retryRes.ok) {
            return (await retryRes.json()) as T;
          }
        }
      }
    }

    if (!res.ok) {
      let errorBody: { detail?: string; title?: string; message?: string } | null = null;
      try {
        errorBody = (await res.json()) as { detail?: string; title?: string; message?: string };
      } catch {
        errorBody = { detail: res.statusText };
      }
      const err: ApiError = new Error(errorBody?.detail || errorBody?.title || errorBody?.message || `Lỗi hệ thống (${res.status})`);
      err.status = res.status;
      throw err;
    }

    return (await res.json()) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[API Client] Error on ${path}:`, message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// API Client Object
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  login: async (input: LoginInput): Promise<AuthLoginResponse> => {
    const res = await request<AuthLoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
    setSessionHint();
    return res;
  },
  refresh: async (): Promise<AuthLoginResponse> => {
    try {
      const res = await request<AuthLoginResponse>('/auth/refresh', { method: 'POST' });
      setSessionHint();
      return res;
    } catch (err) {
      const status = (err as ApiError)?.status;
      if (status === 401 || status === 403) {
        clearSessionHint();
      }
      throw err;
    }
  },
  logout: async (): Promise<{ message: string }> => {
    try {
      return await request<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      clearSessionHint();
    }
  },
  getMe: (): Promise<CurrentUser> => request<CurrentUser>('/auth/me'),

  // Inventory
  getLevels: (params?: GetLevelsParams): Promise<StockLevel[]> => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.lowStock) query.set('lowStock', 'true');
    const qs = query.toString();
    return request<StockLevel[]>(`/inventory/levels${qs ? `?${qs}` : ''}`);
  },

  getMovements: (params?: GetMovementsParams): Promise<MovementListResponse> => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.movementType) query.set('movementType', params.movementType);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<MovementListResponse>(`/inventory/movements${qs ? `?${qs}` : ''}`);
  },

  getAsOf: (date: string, warehouseId?: number): Promise<AsOfStockLevel[]> => {
    const query = new URLSearchParams({ date });
    if (warehouseId) query.set('warehouseId', String(warehouseId));
    return request<AsOfStockLevel[]>(`/inventory/as-of?${query.toString()}`);
  },

  createAdjustment: (data: CreateAdjustmentInput): Promise<StockAdjustmentResult> =>
    request<StockAdjustmentResult>('/inventory/adjustments', { method: 'POST', body: JSON.stringify(data) }),

  reconcile: (): Promise<ReconcileResult> => request<ReconcileResult>('/inventory/reconcile'),

  // Catalog
  getProducts: (search?: string, categoryId?: number): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (categoryId) query.set('categoryId', String(categoryId));
    const qs = query.toString();
    return request<Product[]>(`/products${qs ? `?${qs}` : ''}`);
  },

  getProductByBarcode: (code: string): Promise<Product> => request<Product>(`/products/by-barcode/${code}`),

  createProduct: (data: CreateProductInput): Promise<Product> =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),

  getCategories: (): Promise<Category[]> => request<Category[]>('/categories'),

  // Suppliers
  getSuppliers: (): Promise<Supplier[]> => request<Supplier[]>('/suppliers'),
  getSupplierPerformance: (id: number): Promise<SupplierPerformance> =>
    request<SupplierPerformance>(`/suppliers/${id}/performance`),

  // Warehouses
  getWarehouses: (): Promise<Warehouse[]> => request<Warehouse[]>('/warehouses'),

  // Purchase Orders
  getPOs: (status?: string): Promise<PurchaseOrderSummary[]> => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    const qs = query.toString();
    return request<PurchaseOrderSummary[]>(`/purchase-orders${qs ? `?${qs}` : ''}`);
  },
  getPOById: (id: number): Promise<PurchaseOrderDetail> => request<PurchaseOrderDetail>(`/purchase-orders/${id}`),
  createPO: (data: CreatePOInput): Promise<PurchaseOrderDetail> =>
    request<PurchaseOrderDetail>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  submitPO: (id: number, version: number): Promise<PurchaseOrderDetail> =>
    request<PurchaseOrderDetail>(`/purchase-orders/${id}/submit`, { method: 'POST', body: JSON.stringify({ version }) }),
  approvePO: (id: number, version: number): Promise<PurchaseOrderDetail> =>
    request<PurchaseOrderDetail>(`/purchase-orders/${id}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
  rejectPO: (id: number, version: number): Promise<PurchaseOrderDetail> =>
    request<PurchaseOrderDetail>(`/purchase-orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ version }) }),
  processReceipt: (id: number, data: ProcessReceiptInput): Promise<PurchaseOrderDetail> =>
    request<PurchaseOrderDetail>(`/purchase-orders/${id}/receipts`, { method: 'POST', body: JSON.stringify(data) }),

  // Sales Orders
  getSOs: (): Promise<SalesOrder[]> => request<SalesOrder[]>('/sales-orders'),
  createSO: (data: CreateSOInput): Promise<SalesOrder> =>
    request<SalesOrder>('/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  confirmSO: (id: number): Promise<SalesOrder> => request<SalesOrder>(`/sales-orders/${id}/confirm`, { method: 'POST' }),
  shipSO: (id: number): Promise<SalesOrder> => request<SalesOrder>(`/sales-orders/${id}/ship`, { method: 'POST' }),
  cancelSO: (id: number): Promise<SalesOrder> => request<SalesOrder>(`/sales-orders/${id}/cancel`, { method: 'POST' }),

  // Transfers
  getTransfers: (): Promise<StockTransfer[]> => request<StockTransfer[]>('/transfers'),
  createTransfer: (data: CreateTransferInput): Promise<StockTransfer> =>
    request<StockTransfer>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  dispatchTransfer: (id: number): Promise<StockTransfer> =>
    request<StockTransfer>(`/transfers/${id}/dispatch`, { method: 'POST' }),
  receiveTransfer: (id: number, data: ReceiveTransferInput): Promise<StockTransfer> =>
    request<StockTransfer>(`/transfers/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),

  // Damages
  getDamages: (): Promise<DamageReport[]> => request<DamageReport[]>('/damage-reports'),
  createDamageReport: (data: CreateDamageReportInput): Promise<DamageReport> =>
    request<DamageReport>('/damage-reports', { method: 'POST', body: JSON.stringify(data) }),
  approveDamageReport: (id: number): Promise<DamageReport> =>
    request<DamageReport>(`/damage-reports/${id}/approve`, { method: 'POST' }),

  // Counts
  getCounts: (): Promise<StockCount[]> => request<StockCount[]>('/stock-counts'),
  createCount: (data: CreateStockCountInput): Promise<StockCount> =>
    request<StockCount>('/stock-counts', { method: 'POST', body: JSON.stringify(data) }),
  approveCount: (id: number): Promise<StockCount> =>
    request<StockCount>(`/stock-counts/${id}/approve`, { method: 'POST' }),

  // Reports
  getStockValuation: (warehouseId?: number): Promise<StockValuationItem[]> =>
    request<StockValuationItem[]>(warehouseId ? `/reports/stock-valuation?warehouseId=${warehouseId}` : '/reports/stock-valuation'),
  getLowStockAlerts: (warehouseId?: number): Promise<LowStockAlert[]> =>
    request<LowStockAlert[]>(warehouseId ? `/reports/low-stock?warehouseId=${warehouseId}` : '/reports/low-stock'),
  getABCAnalysis: (): Promise<ABCAnalysisItem[]> => request<ABCAnalysisItem[]>('/reports/abc'),
  getMovementSummary: (): Promise<MovementSummaryItem[]> => request<MovementSummaryItem[]>('/reports/movement-summary'),

  // Audit Logs
  getAuditLogs: (params?: GetAuditLogsParams): Promise<AuditLogListResponse> => {
    const query = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      }
    }
    const qs = query.toString();
    return request<AuditLogListResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  // Admin
  adminStats: (): Promise<AdminStats> => request<AdminStats>('/admin/stats'),

  adminListUsers: (params?: AdminListUsersParams): Promise<AdminUserListResponse> => {
    const query = new URLSearchParams();
    if (params?.search && params.search.trim()) {
      query.set('search', params.search.trim());
    }
    if (params?.role && params.role.trim()) {
      query.set('role', params.role.trim());
    }
    if (params?.page !== undefined && params?.page !== null) {
      query.set('page', String(params.page));
    }
    if (params?.pageSize !== undefined && params?.pageSize !== null) {
      query.set('pageSize', String(params.pageSize));
    }
    const qs = query.toString();
    return request<AdminUserListResponse>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  adminCreateUser: (body: AdminCreateUserInput): Promise<AdminUser> =>
    request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminUpdateUser: (id: number, body: AdminUpdateUserInput): Promise<AdminUser> =>
    request<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
