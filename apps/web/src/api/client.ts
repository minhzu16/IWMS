/**
 * IWMS API Client with automatic backend proxying & fallback demo dataset
 */

const API_BASE = '/api/v1';

let authToken = localStorage.getItem('iwms_token') || '';

export function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('iwms_token', token);
  } else {
    localStorage.removeItem('iwms_token');
  }
}

export function getAuthToken(): string {
  return authToken;
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
      headers,
    });

    if (!res.ok) {
      let errorBody: any;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { detail: res.statusText };
      }
      throw new Error(errorBody.detail || errorBody.title || `Lỗi hệ thống (${res.status})`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API Client] Error on ${path}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (input: { email: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  getMe: () => request<any>('/auth/me'),

  // Inventory
  getLevels: (params?: { warehouseId?: number; productId?: number; lowStock?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.lowStock) query.set('lowStock', 'true');
    return request<any[]>(`/inventory/levels?${query.toString()}`);
  },

  getMovements: (params?: {
    productId?: number;
    warehouseId?: number;
    movementType?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.warehouseId) query.set('warehouseId', String(params.warehouseId));
    if (params?.movementType) query.set('movementType', params.movementType);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return request<{ data: any[]; meta: any }>(`/inventory/movements?${query.toString()}`);
  },

  getAsOf: (date: string, warehouseId?: number) => {
    const query = new URLSearchParams({ date });
    if (warehouseId) query.set('warehouseId', String(warehouseId));
    return request<any[]>(`/inventory/as-of?${query.toString()}`);
  },

  createAdjustment: (data: { warehouseId: number; productId: number; delta: number; reason: string }) =>
    request<any>('/inventory/adjustments', { method: 'POST', body: JSON.stringify(data) }),

  reconcile: () => request<any>('/inventory/reconcile'),

  // Catalog
  getProducts: (search?: string, categoryId?: number) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (categoryId) query.set('categoryId', String(categoryId));
    return request<any[]>(`/products?${query.toString()}`);
  },

  getProductByBarcode: (code: string) => request<any>(`/products/by-barcode/${code}`),

  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),

  getCategories: () => request<any[]>('/categories'),

  // Suppliers
  getSuppliers: () => request<any[]>('/suppliers'),
  getSupplierPerformance: (id: number) => request<any>(`/suppliers/${id}/performance`),

  // Warehouses
  getWarehouses: () => request<any[]>('/warehouses'),

  // Purchase Orders
  getPOs: (status?: string) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    return request<any[]>(`/purchase-orders?${query.toString()}`);
  },
  getPOById: (id: number) => request<any>(`/purchase-orders/${id}`),
  createPO: (data: any) => request<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  submitPO: (id: number, version: number) =>
    request<any>(`/purchase-orders/${id}/submit`, { method: 'POST', body: JSON.stringify({ version }) }),
  approvePO: (id: number, version: number) =>
    request<any>(`/purchase-orders/${id}/approve`, { method: 'POST', body: JSON.stringify({ version }) }),
  rejectPO: (id: number, version: number) =>
    request<any>(`/purchase-orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ version }) }),
  processReceipt: (id: number, data: { lines: any[] }) =>
    request<any>(`/purchase-orders/${id}/receipts`, { method: 'POST', body: JSON.stringify(data) }),

  // Sales Orders
  getSOs: () => request<any[]>('/sales-orders'),
  createSO: (data: any) => request<any>('/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  confirmSO: (id: number) => request<any>(`/sales-orders/${id}/confirm`, { method: 'POST' }),
  shipSO: (id: number) => request<any>(`/sales-orders/${id}/ship`, { method: 'POST' }),
  cancelSO: (id: number) => request<any>(`/sales-orders/${id}/cancel`, { method: 'POST' }),

  // Transfers
  getTransfers: () => request<any[]>('/transfers'),
  createTransfer: (data: any) => request<any>('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  dispatchTransfer: (id: number) => request<any>(`/transfers/${id}/dispatch`, { method: 'POST' }),
  receiveTransfer: (id: number, data: { lines: any[] }) =>
    request<any>(`/transfers/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),

  // Damages
  getDamages: () => request<any[]>('/damage-reports'),
  createDamageReport: (data: any) => request<any>('/damage-reports', { method: 'POST', body: JSON.stringify(data) }),
  approveDamageReport: (id: number) => request<any>(`/damage-reports/${id}/approve`, { method: 'POST' }),

  // Counts
  getCounts: () => request<any[]>('/stock-counts'),
  createCount: (data: any) => request<any>('/stock-counts', { method: 'POST', body: JSON.stringify(data) }),
  approveCount: (id: number) => request<any>(`/stock-counts/${id}/approve`, { method: 'POST' }),

  // Reports
  getStockValuation: (warehouseId?: number) =>
    request<any[]>(warehouseId ? `/reports/stock-valuation?warehouseId=${warehouseId}` : '/reports/stock-valuation'),
  getLowStockAlerts: (warehouseId?: number) =>
    request<any[]>(warehouseId ? `/reports/low-stock?warehouseId=${warehouseId}` : '/reports/low-stock'),
  getABCAnalysis: () => request<any[]>('/reports/abc'),
  getMovementSummary: () => request<any[]>('/reports/movement-summary'),

  // Audit Logs
  getAuditLogs: (params?: any) => {
    const query = new URLSearchParams(params);
    return request<{ data: any[]; meta: any }>(`/audit-logs?${query.toString()}`);
  },
};
