import { describe, it, expect } from 'vitest';
import {
  MovementTypes,
  validateExpiryGuard,
  sortBatchesByFEFO,
  MovementLineInput,
} from '@iwms/shared';

describe('Lot/Batch Tracking & Expiration Date Guard (FEFO / SAP EWM Compliance)', () => {
  interface SimulatedStockLot {
    id: number;
    productId: number;
    warehouseId: number;
    batchNumber: string;
    expiryDate: string;
    qtyOnHand: number;
    qtyReserved: number;
  }

  interface SimulatedMovementRecord {
    id: number;
    productId: number;
    warehouseId: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    movementType: string;
    deltaOnHand: number;
    unitCost: number;
  }

  const stockLedger: SimulatedMovementRecord[] = [];

  function simulatePostMovement(line: MovementLineInput): SimulatedMovementRecord {
    // 1. Enforce Expiration Guard
    if (line.expiryDate) {
      const guard = validateExpiryGuard(line.expiryDate, line.movementType);
      if (!guard.allowed) {
        throw new Error(guard.reason);
      }
    }

    const record: SimulatedMovementRecord = {
      id: stockLedger.length + 1,
      productId: line.productId,
      warehouseId: line.warehouseId,
      batchNumber: line.batchNumber || null,
      expiryDate: line.expiryDate || null,
      movementType: line.movementType,
      deltaOnHand: line.qtyOnHandDelta,
      unitCost: line.unitCost || 0,
    };

    stockLedger.push(record);
    return record;
  }

  it('Step 1: Successfully receives goods with batch number and future expiry date', () => {
    const futureExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const receiptLine: MovementLineInput = {
      productId: 101,
      warehouseId: 1,
      movementType: MovementTypes.PURCHASE_RECEIPT,
      qtyOnHandDelta: 50,
      qtyDamagedDelta: 0,
      unitCost: 120,
      batchNumber: 'LOT-2026-NOV-001',
      expiryDate: futureExpiry,
      sourceDocType: 'PURCHASE_ORDER',
      sourceDocId: 1001,
    };

    const record = simulatePostMovement(receiptLine);
    expect(record.batchNumber).toBe('LOT-2026-NOV-001');
    expect(record.expiryDate).toBe(futureExpiry);
    expect(record.deltaOnHand).toBe(50);
  });

  it('Step 2: EXPIRED_GOODS_GUARD strictly blocks SALE_RESERVE for expired batches', () => {
    const pastExpiry = '2025-12-31'; // Expired date
    const reserveExpired: MovementLineInput = {
      productId: 101,
      warehouseId: 1,
      movementType: MovementTypes.SALE_RESERVE,
      qtyOnHandDelta: 0,
      batchNumber: 'LOT-EXPIRED-2025',
      expiryDate: pastExpiry,
      sourceDocType: 'SALES_ORDER',
      sourceDocId: 2001,
    };

    expect(() => simulatePostMovement(reserveExpired)).toThrowError(/EXPIRED_GOODS_GUARD/);
  });

  it('Step 3: EXPIRED_GOODS_GUARD strictly blocks SALE_SHIPMENT and TRANSFER_OUT for expired batches', () => {
    const pastExpiry = '2026-01-01';

    const shipmentExpired: MovementLineInput = {
      productId: 101,
      warehouseId: 1,
      movementType: MovementTypes.SALE_SHIPMENT,
      qtyOnHandDelta: -10,
      batchNumber: 'LOT-OLD-002',
      expiryDate: pastExpiry,
      sourceDocType: 'SALES_ORDER',
      sourceDocId: 2002,
    };
    expect(() => simulatePostMovement(shipmentExpired)).toThrowError(/EXPIRED_GOODS_GUARD/);

    const transferExpired: MovementLineInput = {
      productId: 101,
      warehouseId: 1,
      movementType: MovementTypes.TRANSFER_OUT,
      qtyOnHandDelta: -5,
      batchNumber: 'LOT-OLD-002',
      expiryDate: pastExpiry,
      sourceDocType: 'TRANSFER_ORDER',
      sourceDocId: 3001,
    };
    expect(() => simulatePostMovement(transferExpired)).toThrowError(/EXPIRED_GOODS_GUARD/);
  });

  it('Step 4: Allows DAMAGE_WRITE_OFF and WRITE_OFF for expired goods disposal', () => {
    const pastExpiry = '2025-12-31';
    const disposalLine: MovementLineInput = {
      productId: 101,
      warehouseId: 1,
      movementType: MovementTypes.DAMAGE_WRITE_OFF,
      qtyOnHandDelta: -15,
      qtyDamagedDelta: -15,
      batchNumber: 'LOT-EXPIRED-2025',
      expiryDate: pastExpiry,
      sourceDocType: 'DAMAGE_REPORT',
      sourceDocId: 4001,
    };

    // Disposal should NOT be blocked by Expiry Guard
    const record = simulatePostMovement(disposalLine);
    expect(record.movementType).toBe(MovementTypes.DAMAGE_WRITE_OFF);
    expect(record.deltaOnHand).toBe(-15);
  });

  it('Step 5: FEFO sorting accurately sorts batches by earliest expiry date', () => {
    const lots: SimulatedStockLot[] = [
      { id: 1, productId: 101, warehouseId: 1, batchNumber: 'LOT-C', expiryDate: '2027-06-30', qtyOnHand: 10, qtyReserved: 0 },
      { id: 2, productId: 101, warehouseId: 1, batchNumber: 'LOT-A', expiryDate: '2026-12-15', qtyOnHand: 20, qtyReserved: 0 },
      { id: 3, productId: 101, warehouseId: 1, batchNumber: 'LOT-B', expiryDate: '2027-01-20', qtyOnHand: 15, qtyReserved: 0 },
    ];

    const fefoSorted = sortBatchesByFEFO(lots);
    expect(fefoSorted[0].batchNumber).toBe('LOT-A'); // Expiring first: 2026-12-15
    expect(fefoSorted[1].batchNumber).toBe('LOT-B'); // Expiring second: 2027-01-20
    expect(fefoSorted[2].batchNumber).toBe('LOT-C'); // Expiring last: 2027-06-30
  });
});
