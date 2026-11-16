export const UserRoles = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  PURCHASING: 'PURCHASING',
  WAREHOUSE: 'WAREHOUSE',
  SALES: 'SALES',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const MovementTypes = {
  OPENING: 'OPENING',
  PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
  SALE_RESERVE: 'SALE_RESERVE',
  SALE_RELEASE: 'SALE_RELEASE',
  SALE_SHIPMENT: 'SALE_SHIPMENT',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
  DAMAGE: 'DAMAGE',
  DAMAGE_WRITE_OFF: 'DAMAGE_WRITE_OFF',
  RETURN_TO_SUPPLIER: 'RETURN_TO_SUPPLIER',
  CUSTOMER_RETURN: 'CUSTOMER_RETURN',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  REVERSAL: 'REVERSAL',
} as const;

export type MovementType = (typeof MovementTypes)[keyof typeof MovementTypes];

export const POStatuses = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type POStatus = (typeof POStatuses)[keyof typeof POStatuses];

export const SOStatuses = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
  SHIPPED: 'SHIPPED',
  CANCELLED: 'CANCELLED',
} as const;

export type SOStatus = (typeof SOStatuses)[keyof typeof SOStatuses];

export const TransferStatuses = {
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type TransferStatus = (typeof TransferStatuses)[keyof typeof TransferStatuses];

export const DamageStatuses = {
  REPORTED: 'REPORTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
} as const;

export type DamageStatus = (typeof DamageStatuses)[keyof typeof DamageStatuses];

export const DamageDispositions = {
  WRITE_OFF: 'WRITE_OFF',
  RETURN_TO_SUPPLIER: 'RETURN_TO_SUPPLIER',
} as const;

export type DamageDisposition = (typeof DamageDispositions)[keyof typeof DamageDispositions];

export const CountStatuses = {
  DRAFT: 'DRAFT',
  COUNTING: 'COUNTING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type CountStatus = (typeof CountStatuses)[keyof typeof CountStatuses];

export const ErrorCodes = {
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  OVER_RECEIPT: 'OVER_RECEIPT',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
  EXPIRED_GOODS_GUARD: 'EXPIRED_GOODS_GUARD',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Expiration Guard & FEFO (First-Expired, First-Out) Validation Engine
 */
export function validateExpiryGuard(
  expiryDate?: string | Date | null,
  movementType?: string,
  currentDate: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (!expiryDate) return { allowed: true };
  const exp = new Date(expiryDate);
  // Block sales reservation, outbound transfer, and shipment if goods are already expired
  if (
    exp < currentDate &&
    (movementType === MovementTypes.SALE_RESERVE ||
      movementType === MovementTypes.SALE_SHIPMENT ||
      movementType === MovementTypes.TRANSFER_OUT)
  ) {
    return {
      allowed: false,
      reason: `EXPIRED_GOODS_GUARD: Lô hàng đã hết hạn sử dụng vào ${exp.toISOString().split('T')[0]}, bị khóa theo chính sách an toàn kho (FEFO).`,
    };
  }
  return { allowed: true };
}

export function sortBatchesByFEFO<T extends { expiryDate?: string | Date | null }>(batches: T[]): T[] {
  if (batches.length <= 1) return [...batches];
  // O(N) timestamp extraction before sort (Schwartzian transform)
  const mapped = batches.map((batch) => ({
    batch,
    time: batch.expiryDate ? new Date(batch.expiryDate).getTime() : Number.POSITIVE_INFINITY,
  }));
  mapped.sort((a, b) => a.time - b.time);
  return mapped.map((item) => item.batch);
}
