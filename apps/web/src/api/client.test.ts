import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setAuthToken,
  getAuthToken,
  hasSessionHint,
  executeRefresh,
  api,
} from './client';

describe('PJ2 IWMS Web API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    setAuthToken('');
  });

  it('manages in-memory token and never leaves it in localStorage', () => {
    setAuthToken('jwt-access-token');
    expect(getAuthToken()).toBe('jwt-access-token');
    expect(localStorage.getItem('iwms_token')).toBeNull();

    setAuthToken('');
    expect(getAuthToken()).toBe('');
  });

  it('checks session hint correctly', () => {
    expect(hasSessionHint()).toBe(false);
    localStorage.setItem('iwms_has_session', '1');
    expect(hasSessionHint()).toBe(true);
    localStorage.removeItem('iwms_has_session');
    expect(hasSessionHint()).toBe(false);
  });

  it('executeRefresh coordinates single-flight refresh and updates token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'refreshed-jwt-token',
        user: { id: 1, email: 'admin@iwms.vn', fullName: 'Admin', role: 'ADMIN' },
      }),
    } as Response);

    // Call two concurrent refreshes
    const [t1, t2] = await Promise.all([executeRefresh(), executeRefresh()]);
    expect(t1).toBe('refreshed-jwt-token');
    expect(t2).toBe('refreshed-jwt-token');
    expect(getAuthToken()).toBe('refreshed-jwt-token');
    expect(hasSessionHint()).toBe(true);
    // Verified single-flight: only 1 fetch call
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('executeRefresh clears token and hint on 401 response', async () => {
    localStorage.setItem('iwms_has_session', '1');

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);

    const token = await executeRefresh();
    expect(token).toBeNull();
    expect(getAuthToken()).toBe('');
    expect(hasSessionHint()).toBe(false);
  });

  it('api.getLevels calls GET /inventory/levels with params', async () => {
    setAuthToken('token-123');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ product_id: 1, sku: 'SKU-1', on_hand: 50 }],
    } as Response);

    const levels = await api.getLevels({ warehouseId: 1, lowStock: true });
    expect(levels).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/inventory/levels?warehouseId=1&lowStock=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    );
  });

  it('api.createAdjustment sends POST with Idempotency-Key and body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 10, balanceAfter: 15 }),
    } as Response);

    const res = await api.createAdjustment({
      warehouseId: 1,
      productId: 5,
      delta: 5,
      reason: 'Physical count adjustment',
    });

    expect(res.balanceAfter).toBe(15);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/inventory/adjustments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': expect.stringMatching(/^IDEMP-/),
        }),
      })
    );
  });

  it('api.getMe throws ApiError with status and server error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Không có quyền truy cập module này' }),
    } as Response);

    await expect(api.getMe()).rejects.toThrow('Không có quyền truy cập module này');
  });
});
