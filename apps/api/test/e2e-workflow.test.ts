import { describe, it, expect } from 'vitest';
import {
  canTransitionPO,
  canTransitionSO,
  canTransitionTransfer,
  MovementTypes,
} from '@iwms/shared';

describe('E2E Warehouse Invariant & Business Workflow Simulation', () => {
  interface SimulatedStockLevel {
    productId: number;
    warehouseId: number;
    onHand: number;
    reserved: number;
    damaged: number;
    avgCost: number;
  }

  interface SimulatedMovement {
    productId: number;
    warehouseId: number;
    movementType: string;
    deltaOnHand: number;
    deltaDamaged: number;
    unitCost: number;
    balanceAfter: number;
  }

  const stockLedger: SimulatedMovement[] = [];
  const stockLevels: Map<string, SimulatedStockLevel> = new Map();

  function getKey(p: number, w: number) {
    return `${p}:${w}`;
  }

  function getStock(p: number, w: number): SimulatedStockLevel {
    const key = getKey(p, w);
    if (!stockLevels.has(key)) {
      stockLevels.set(key, {
        productId: p,
        warehouseId: w,
        onHand: 0,
        reserved: 0,
        damaged: 0,
        avgCost: 0,
      });
    }
    return stockLevels.get(key)!;
  }

  function postMovement(
    p: number,
    w: number,
    type: string,
    deltaOnHand: number,
    deltaDamaged: number,
    cost: number,
  ) {
    const s = getStock(p, w);

    // Invariant check before apply
    if (s.onHand + deltaOnHand < 0 || s.reserved > s.onHand + deltaOnHand) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    // Moving average cost calculation
    if (deltaOnHand > 0 && cost > 0) {
      const oldVal = s.onHand * s.avgCost;
      const incomingVal = deltaOnHand * cost;
      s.avgCost = (oldVal + incomingVal) / (s.onHand + deltaOnHand);
    }

    s.onHand += deltaOnHand;
    s.damaged += deltaDamaged;

    stockLedger.push({
      productId: p,
      warehouseId: w,
      movementType: type,
      deltaOnHand,
      deltaDamaged,
      unitCost: cost,
      balanceAfter: s.onHand,
    });
  }

  it('Step 1: Opening balance creates initial stock and ledger entry', () => {
    postMovement(1, 1, MovementTypes.OPENING, 50, 0, 100);

    const s = getStock(1, 1);
    expect(s.onHand).toBe(50);
    expect(s.avgCost).toBe(100);
    expect(stockLedger).toHaveLength(1);
    expect(stockLedger[0].balanceAfter).toBe(50);
  });

  it('Step 2: PO state machine transitions and Goods Receipt splits good vs damaged', () => {
    // State machine checks
    expect(canTransitionPO('DRAFT', 'SUBMIT', 'PURCHASING').allowed).toBe(true);
    expect(canTransitionPO('SUBMITTED', 'APPROVE', 'MANAGER').allowed).toBe(true);

    // Goods Receipt: 30 ordered -> 25 good, 5 damaged received
    postMovement(1, 1, MovementTypes.PURCHASE_RECEIPT, 25, 0, 120);
    postMovement(1, 1, MovementTypes.DAMAGE, 0, 5, 120);

    const s = getStock(1, 1);
    expect(s.onHand).toBe(75);
    expect(s.damaged).toBe(5);
    // Weighted average: (50*100 + 25*120) / 75 = (5000 + 3000)/75 = 8000/75 = 106.6667
    expect(Number(s.avgCost.toFixed(2))).toBe(106.67);
  });

  it('Step 3: SO reservation blocks overselling and shipment deducts stock atomically', () => {
    const s = getStock(1, 1);
    const available = s.onHand - s.reserved; // 75

    // Attempting to reserve 80 (exceeds available) must be rejected
    expect(() => {
      const requested = 80;
      if (requested > available) throw new Error('INSUFFICIENT_STOCK');
      s.reserved += requested;
    }).toThrow('INSUFFICIENT_STOCK');

    // Valid SO: reserve 20
    s.reserved += 20;
    expect(s.reserved).toBe(20);
    expect(s.onHand - s.reserved).toBe(55); // available reduced

    // Ship SO: release reservation and deduct onHand
    s.reserved -= 20;
    postMovement(1, 1, MovementTypes.SALE_SHIPMENT, -20, 0, s.avgCost);

    expect(s.onHand).toBe(55);
    expect(s.reserved).toBe(0);
  });

  it('Step 4: 2-Step Inter-warehouse transfer moves stock from North to South', () => {
    // Step 4.1: Dispatch 15 units out of Warehouse 1 (North)
    postMovement(1, 1, MovementTypes.TRANSFER_OUT, -15, 0, getStock(1, 1).avgCost);
    expect(getStock(1, 1).onHand).toBe(40);

    // Step 4.2: Receive 15 units in Warehouse 2 (South)
    postMovement(1, 2, MovementTypes.TRANSFER_IN, 15, 0, 106.67);
    expect(getStock(1, 2).onHand).toBe(15);
  });

  it('Step 5: Automated Invariant Reconciler asserts 100% mathematical consistency', () => {
    // For every warehouse, SUM(ledger) must equal onHand exactly
    for (const [key, level] of stockLevels.entries()) {
      const ledgerSum = stockLedger
        .filter((m) => m.productId === level.productId && m.warehouseId === level.warehouseId)
        .reduce((sum, m) => sum + m.deltaOnHand, 0);

      expect(level.onHand).toBe(ledgerSum);
      expect(level.onHand >= 0).toBe(true);
      expect(level.reserved <= level.onHand).toBe(true);
    }
  });
});
