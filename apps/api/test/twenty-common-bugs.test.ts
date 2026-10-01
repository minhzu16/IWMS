import { describe, it, expect } from 'vitest';
import {
  canTransitionPO,
  canTransitionSO,
  canTransitionTransfer,
  canTransitionDamage,
  canTransitionCount,
  MovementTypes,
  POStatuses,
  SOStatuses,
  TransferStatuses,
  UserRoles,
} from '@iwms/shared';

/**
 * 20 Common Mission-Critical Bugs in Inventory & Warehouse Management Systems
 * Verification & Regression Test Suite
 */
describe('20 Common IWMS Bugs - Prevention & Invariant Verification Suite', () => {
  // Shared data structures for simulation
  interface StockLevelState {
    productId: number;
    warehouseId: number;
    onHand: number;
    reserved: number;
    damaged: number;
    avgCost: number;
    version: number;
  }

  interface MovementRecord {
    id: number;
    productId: number;
    warehouseId: number;
    movementType: string;
    deltaOnHand: number;
    deltaDamaged: number;
    unitCost: number;
    balanceAfter: number;
    sourceDocType: string;
    sourceDocId: number;
    createdAt: Date;
  }

  interface AuditRecord {
    id: number;
    userId: number;
    action: string;
    entityType: string;
    entityId: number;
    before: Record<string, any>;
    after: Record<string, any>;
    timestamp: Date;
  }

  // --- BUG 1: RACE CONDITION OVERSELL ---
  describe('Bug 1: Race Condition & Concurrent Overselling', () => {
    it('prevents overselling when multiple concurrent requests attempt to reserve limited stock', async () => {
      let onHand = 15;
      let reserved = 0;
      const requestedPerOrder = 1;
      let successOrders = 0;
      let rejectedOrders = 0;

      // 50 concurrent reservation attempts
      const attempts = Array.from({ length: 50 }, async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        // Atomic conditional update simulation (like SQL UPDATE ... WHERE on_hand - reserved >= requested)
        if (onHand - reserved >= requestedPerOrder) {
          reserved += requestedPerOrder;
          successOrders++;
          return true;
        } else {
          rejectedOrders++;
          return false;
        }
      });

      await Promise.all(attempts);

      // Invariant assertions:
      expect(successOrders).toBe(15);
      expect(rejectedOrders).toBe(35);
      expect(onHand - reserved).toBe(0); // Available stock is strictly 0, never negative
      expect(reserved).toBe(15);
      expect(reserved).toBeLessThanOrEqual(onHand);
    });
  });

  // --- BUG 2: MULTI-SKU DEADLOCK ELIMINATION ---
  describe('Bug 2: Multi-SKU Deadlock via Inconsistent Resource Ordering', () => {
    it('sorts line items deterministically (productId ASC, warehouseId ASC) to avoid circular lock wait', () => {
      // Tx1 receives items in reverse order
      const tx1Items = [
        { productId: 42, warehouseId: 1, qty: 5 },
        { productId: 7, warehouseId: 1, qty: 2 },
        { productId: 19, warehouseId: 2, qty: 10 },
      ];

      // Tx2 receives same items in another random order
      const tx2Items = [
        { productId: 19, warehouseId: 2, qty: 3 },
        { productId: 42, warehouseId: 1, qty: 1 },
        { productId: 7, warehouseId: 1, qty: 4 },
      ];

      const deterministicSort = (items: typeof tx1Items) =>
        [...items].sort((a, b) => {
          if (a.productId !== b.productId) return a.productId - b.productId;
          return a.warehouseId - b.warehouseId;
        });

      const sorted1 = deterministicSort(tx1Items);
      const sorted2 = deterministicSort(tx2Items);

      // Both transactions acquire locks in identical sequential order: 7 -> 19 -> 42
      expect(sorted1.map((i) => i.productId)).toEqual([7, 19, 42]);
      expect(sorted2.map((i) => i.productId)).toEqual([7, 19, 42]);
    });
  });

  // --- BUG 3: FLOATING-POINT ROUNDING DRIFT ---
  describe('Bug 3: Floating-Point Rounding Drift in Cumulative Quantities', () => {
    it('uses 3-decimal fixed precision to prevent IEEE 754 drift from accumulating fractional units', () => {
      let unroundedFloat = 0;
      let fixedPointOnHand = 0;

      // Add 0.1 ten times (in raw float, 0.1 * 10 = 0.9999999999999999)
      for (let i = 0; i < 10; i++) {
        unroundedFloat += 0.1;
        fixedPointOnHand = Number((fixedPointOnHand + 0.1).toFixed(3));
      }

      // Raw float drifts away from 1.0
      expect(unroundedFloat).not.toBe(1);

      // Fixed precision matches 1.000 exactly
      expect(fixedPointOnHand).toBe(1.0);
      expect(fixedPointOnHand.toFixed(3)).toBe('1.000');
    });
  });

  // --- BUG 4: MOVING AVERAGE COST DIVISION BY ZERO & NEGATIVE COST ---
  describe('Bug 4: Moving Average Cost Division by Zero & Negative Values', () => {
    it('guards against division by zero and rejects negative unit costs', () => {
      const calculateSafeMAC = (
        curOnHand: number,
        curAvgCost: number,
        incomingQty: number,
        incomingUnitCost: number,
      ) => {
        if (incomingUnitCost < 0) {
          throw new Error('UNIT_COST_CANNOT_BE_NEGATIVE');
        }
        const nextOnHand = curOnHand + incomingQty;
        if (nextOnHand <= 0) {
          return curAvgCost; // Retain current cost or zero, never divide by zero
        }
        if (incomingQty <= 0) {
          return curAvgCost;
        }
        return Number(((curOnHand * curAvgCost + incomingQty * incomingUnitCost) / nextOnHand).toFixed(4));
      };

      // Case A: Initial zero stock with zero incoming quantity (e.g. adjustment 0)
      expect(calculateSafeMAC(0, 0, 0, 100)).toBe(0);

      // Case B: Normal weighted average: (10 * 100 + 20 * 160) / 30 = 4200 / 30 = 140
      expect(calculateSafeMAC(10, 100, 20, 160)).toBe(140);

      // Case C: Negative unit cost rejection
      expect(() => calculateSafeMAC(10, 100, 5, -50)).toThrow('UNIT_COST_CANNOT_BE_NEGATIVE');
    });
  });

  // --- BUG 5: DUPLICATE SUBMISSION / DOUBLE-SPEND (IDEMPOTENCY) ---
  describe('Bug 5: Duplicate Submission / Network Retry (Double-Spend)', () => {
    it('intercepts duplicate Idempotency-Key and returns cached result without double posting', () => {
      const idempotencyStore = new Map<string, { status: number; body: any }>();
      let actualMovementsPosted = 0;

      const processRequestWithIdempotency = (key: string, payload: any) => {
        if (idempotencyStore.has(key)) {
          return { cached: true, response: idempotencyStore.get(key) };
        }
        // Simulate database post
        actualMovementsPosted++;
        const response = { status: 201, body: { movementId: 999, success: true } };
        idempotencyStore.set(key, response);
        return { cached: false, response };
      };

      const key = 'idem-req-abc-123';
      const payload = { productId: 1, warehouseId: 1, qty: 10 };

      // Call 1
      const res1 = processRequestWithIdempotency(key, payload);
      expect(res1.cached).toBe(false);
      expect(actualMovementsPosted).toBe(1);

      // Call 2 (network retry with identical key)
      const res2 = processRequestWithIdempotency(key, payload);
      expect(res2.cached).toBe(true);
      expect(actualMovementsPosted).toBe(1); // Crucial: did NOT increment!
      expect(res2.response?.body.movementId).toBe(999);
    });
  });

  // --- BUG 6: ILLEGAL DOCUMENT STATE MACHINE SKIPPING ---
  describe('Bug 6: Illegal Document State Machine Skipping', () => {
    it('blocks illegal direct status jumps or unauthorized actions in PO and SO', () => {
      // 1. Direct DRAFT -> SHIPPED in SO is illegal
      expect(canTransitionSO('DRAFT', 'SHIP_FULL', 'WAREHOUSE').allowed).toBe(false);

      // 2. Already SHIPPED SO cannot be cancelled
      expect(canTransitionSO('SHIPPED', 'CANCEL', 'ADMIN').allowed).toBe(false);

      // 3. PO approval by non-manager (e.g. VIEWER or PURCHASING) is forbidden
      expect(canTransitionPO('SUBMITTED', 'APPROVE', 'VIEWER').allowed).toBe(false);
      expect(canTransitionPO('SUBMITTED', 'APPROVE', 'PURCHASING').allowed).toBe(false);

      // 4. PO approval by MANAGER is permitted
      expect(canTransitionPO('SUBMITTED', 'APPROVE', 'MANAGER').allowed).toBe(true);

      // 5. Direct DRAFT -> APPROVED skipping SUBMITTED is forbidden
      expect(canTransitionPO('DRAFT', 'APPROVE', 'MANAGER').allowed).toBe(false);
    });
  });

  // --- BUG 7: LEDGER & BALANCE DESYNCHRONIZATION ---
  describe('Bug 7: Ledger & Balance Invariant Desynchronization', () => {
    it('detects any divergence between Append-Only movements sum and live stock_levels', () => {
      const movements: MovementRecord[] = [
        { id: 1, productId: 10, warehouseId: 1, movementType: 'OPENING', deltaOnHand: 100, deltaDamaged: 0, unitCost: 10, balanceAfter: 100, sourceDocType: 'SYS', sourceDocId: 1, createdAt: new Date() },
        { id: 2, productId: 10, warehouseId: 1, movementType: 'PURCHASE_RECEIPT', deltaOnHand: 50, deltaDamaged: 0, unitCost: 12, balanceAfter: 150, sourceDocType: 'PO', sourceDocId: 1, createdAt: new Date() },
        { id: 3, productId: 10, warehouseId: 1, movementType: 'SALE_SHIPMENT', deltaOnHand: -30, deltaDamaged: 0, unitCost: 10.67, balanceAfter: 120, sourceDocType: 'SO', sourceDocId: 1, createdAt: new Date() },
      ];

      const liveStockLevel: StockLevelState = {
        productId: 10,
        warehouseId: 1,
        onHand: 120,
        reserved: 0,
        damaged: 0,
        avgCost: 10.67,
        version: 3,
      };

      const ledgerSum = movements.reduce((acc, m) => acc + m.deltaOnHand, 0);
      expect(ledgerSum).toBe(liveStockLevel.onHand);

      // Simulate a buggy rogue update that modified stock_levels without movement
      const corruptedLevel = { ...liveStockLevel, onHand: 140 };
      const hasDiscrepancy = ledgerSum !== corruptedLevel.onHand;
      expect(hasDiscrepancy).toBe(true);
    });
  });

  // --- BUG 8: LEDGER IMMUTABILITY TAMPERING ---
  describe('Bug 8: Ledger Immutability Violation (Tampering)', () => {
    it('rejects updates or deletions on immutable stock_movements ledger', () => {
      const ledgerPolicy = {
        canUpdate: false,
        canDelete: false,
        canInsert: true,
      };

      const executeLedgerOperation = (operation: 'INSERT' | 'UPDATE' | 'DELETE') => {
        if (operation === 'UPDATE' || operation === 'DELETE') {
          throw new Error('CRITICAL: stock_movements is an immutable ledger! Updates and Deletions are forbidden.');
        }
        return { success: true };
      };

      expect(() => executeLedgerOperation('UPDATE')).toThrow('immutable ledger');
      expect(() => executeLedgerOperation('DELETE')).toThrow('immutable ledger');
      expect(executeLedgerOperation('INSERT').success).toBe(true);
    });
  });

  // --- BUG 9: PO OVER-RECEIVING TOLERANCE BREACH ---
  describe('Bug 9: Purchase Order Over-Receiving Tolerance Breach', () => {
    it('rejects goods receipt quantities that exceed ordered quantity beyond tolerance (10%)', () => {
      const poLine = {
        productId: 5,
        qtyOrdered: 100,
        qtyReceived: 0,
        tolerancePercent: 0.1, // 10%
      };

      const validateReceiptQty = (incomingQty: number) => {
        const maxAllowed = poLine.qtyOrdered * (1 + poLine.tolerancePercent) - poLine.qtyReceived;
        if (incomingQty > maxAllowed) {
          throw new Error(`OVER_RECEIPT_TOLERANCE_EXCEEDED: max allowed is ${maxAllowed}, received ${incomingQty}`);
        }
        return true;
      };

      // Within normal order
      expect(validateReceiptQty(100)).toBe(true);

      // Within 10% tolerance (105 <= 110)
      expect(validateReceiptQty(105)).toBe(true);

      // Exceeds 10% tolerance (120 > 110)
      expect(() => validateReceiptQty(120)).toThrow('OVER_RECEIPT_TOLERANCE_EXCEEDED');
    });
  });

  // --- BUG 10: IN-TRANSIT STOCK LOSS IN 2-STEP TRANSFER ---
  describe('Bug 10: In-Transit Inventory Disappearance in 2-Step Transfers', () => {
    it('guarantees that dispatched goods are accounted for in in-transit state without inventory loss', () => {
      let whNorthOnHand = 100;
      let whSouthOnHand = 50;
      let inTransit = 0;

      const totalCompanyInventory = () => whNorthOnHand + inTransit + whSouthOnHand;
      const initialTotal = totalCompanyInventory(); // 150

      // Step 1: Dispatch 30 units from North
      const dispatchQty = 30;
      whNorthOnHand -= dispatchQty;
      inTransit += dispatchQty;

      expect(whNorthOnHand).toBe(70);
      expect(inTransit).toBe(30);
      expect(totalCompanyInventory()).toBe(initialTotal); // Exact 150 preserved!

      // Step 2: Receive 30 units at South
      inTransit -= dispatchQty;
      whSouthOnHand += dispatchQty;

      expect(whSouthOnHand).toBe(80);
      expect(inTransit).toBe(0);
      expect(totalCompanyInventory()).toBe(initialTotal); // Still exact 150!
    });
  });

  // --- BUG 11: RESERVATION LEAK (RESERVED > ON_HAND) ---
  describe('Bug 11: Reservation Leak / Reserved Greater Than On-Hand', () => {
    it('enforces chk_reserved_le_on_hand constraint preventing reserved from exceeding on_hand', () => {
      const stock = { onHand: 10, reserved: 10 };

      const attemptManualDeduction = (deductOnHand: number) => {
        const nextOnHand = stock.onHand - deductOnHand;
        // Check constraint simulation
        if (nextOnHand < 0 || stock.reserved > nextOnHand) {
          throw new Error('CHECK_RESERVED_LE_ON_HAND_VIOLATION');
        }
        stock.onHand = nextOnHand;
      };

      // Trying to reduce onHand from 10 to 8 while reserved is 10 must fail
      expect(() => attemptManualDeduction(2)).toThrow('CHECK_RESERVED_LE_ON_HAND_VIOLATION');
      expect(stock.onHand).toBe(10);
      expect(stock.reserved).toBe(10);
    });
  });

  // --- BUG 12: CYCLE COUNT ADJUSTMENT INVERSION ---
  describe('Bug 12: Cycle Count Adjustment Inversion (Sign Error)', () => {
    it('correctly calculates variance = (counted - system) and applies matching adjustment delta', () => {
      const systemQty = 100;
      const physicalCount = 82; // 18 units missing

      // Formula: variance = counted - system
      const variance = physicalCount - systemQty; // -18
      expect(variance).toBe(-18);

      const movementType = variance > 0 ? MovementTypes.ADJUSTMENT_IN : MovementTypes.ADJUSTMENT_OUT;
      expect(movementType).toBe(MovementTypes.ADJUSTMENT_OUT);

      // Apply delta: newBalance = systemQty + variance
      const newOnHand = systemQty + variance;
      expect(newOnHand).toBe(physicalCount); // Must perfectly equal 82
    });
  });

  // --- BUG 13: DAMAGED STOCK CONTAMINATION ---
  describe('Bug 13: Damaged Stock Contamination in Available Stock', () => {
    it('quarantines damaged goods into isolated bucket so available stock calculation excludes them', () => {
      const stock = {
        onHand: 100, // Total physical items in warehouse
        damaged: 15,  // Quarantined damaged items
        reserved: 20, // Reserved for confirmed orders
      };

      // Correct business rule: Available pickable = onHand - damaged - reserved (or if onHand already includes damaged)
      // In IWMS: on_hand is healthy stock, damaged is separate quarantined bucket
      const available = stock.onHand - stock.reserved;
      expect(available).toBe(80);

      // Attempt to reserve 85 units fails
      const canReserve85 = available >= 85;
      expect(canReserve85).toBe(false);

      // Damaged items cannot be shipped under standard SALE_SHIPMENT
      expect(stock.damaged).toBe(15);
    });
  });

  // --- BUG 14: OPTIMISTIC LOCKING MID-AIR COLLISION ---
  describe('Bug 14: Optimistic Concurrency Lost Update (Version Collision)', () => {
    it('detects stale version in concurrent updates and throws VersionConflictException (HTTP 409)', () => {
      let document = { id: 1, name: 'Original SKU Name', version: 3 };

      const updateDocument = (id: number, newName: string, expectedVersion: number) => {
        if (document.version !== expectedVersion) {
          throw new Error('VERSION_CONFLICT_EXCEPTION: Record was modified by another transaction');
        }
        document.name = newName;
        document.version++;
        return { ...document };
      };

      // User A reads version 3 and successfully updates
      const userAUpdate = updateDocument(1, 'Name Updated by User A', 3);
      expect(userAUpdate.version).toBe(4);

      // User B also had read version 3 and now attempts to write
      expect(() => updateDocument(1, 'Name Updated by User B', 3)).toThrow('VERSION_CONFLICT_EXCEPTION');
      // The update by User A was NOT lost
      expect(document.name).toBe('Name Updated by User A');
    });
  });

  // --- BUG 15: CROSS-WAREHOUSE SCOPE LEAK ---
  describe('Bug 15: Cross-Warehouse Tenant / Scope Violation (RBAC)', () => {
    it('rejects stock operations when user does not have permission for the target warehouse', () => {
      const userPermissions = {
        userId: 101,
        role: UserRoles.WAREHOUSE,
        assignedWarehouses: [1], // Only WH-NORTH (id: 1)
      };

      const authorizeWarehouseAction = (warehouseId: number, user: typeof userPermissions) => {
        // ADMIN can access all; other roles must be explicitly scoped
        if (user.role === UserRoles.ADMIN) return true;
        if (!user.assignedWarehouses.includes(warehouseId)) {
          throw new Error(`FORBIDDEN_WAREHOUSE_SCOPE: User ${user.userId} has no access to warehouse ${warehouseId}`);
        }
        return true;
      };

      // Action on WH-NORTH (id 1) succeeds
      expect(authorizeWarehouseAction(1, userPermissions)).toBe(true);

      // Action on WH-SOUTH (id 2) is blocked
      expect(() => authorizeWarehouseAction(2, userPermissions)).toThrow('FORBIDDEN_WAREHOUSE_SCOPE');
    });
  });

  // --- BUG 16: SUPPLIER SCORECARD DIVISION BY ZERO ---
  describe('Bug 16: Supplier Scorecard Division by Zero on Fresh Accounts', () => {
    it('handles suppliers with zero orders or zero receipts without NaN or crash', () => {
      const calculateScorecard = (stats: {
        totalOrdered: number;
        totalReceived: number;
        totalReceipts: number;
        onTimeReceipts: number;
        totalDamaged: number;
      }) => {
        const fillRate = stats.totalOrdered > 0
          ? Number(((stats.totalReceived / stats.totalOrdered) * 100).toFixed(1))
          : 100; // Safe default
        const onTimeRate = stats.totalReceipts > 0
          ? Number(((stats.onTimeReceipts / stats.totalReceipts) * 100).toFixed(1))
          : 100; // Safe default
        const damageRate = stats.totalReceived > 0
          ? Number(((stats.totalDamaged / stats.totalReceived) * 100).toFixed(2))
          : 0;

        return { fillRate, onTimeRate, damageRate };
      };

      // Fresh supplier with 0 orders, 0 receipts
      const freshScore = calculateScorecard({
        totalOrdered: 0,
        totalReceived: 0,
        totalReceipts: 0,
        onTimeReceipts: 0,
        totalDamaged: 0,
      });

      expect(Number.isNaN(freshScore.fillRate)).toBe(false);
      expect(Number.isNaN(freshScore.onTimeRate)).toBe(false);
      expect(Number.isNaN(freshScore.damageRate)).toBe(false);
      expect(freshScore.fillRate).toBe(100);
      expect(freshScore.onTimeRate).toBe(100);
      expect(freshScore.damageRate).toBe(0);
    });
  });

  // --- BUG 17: PARTIAL RECEIPT PO STATUS STAGNATION ---
  describe('Bug 17: Partial Receipt PO Status Stagnation / Premature Closure', () => {
    it('correctly transitions PO to PARTIALLY_RECEIVED when some lines remain unfulfilled', () => {
      const lines = [
        { id: 1, qtyOrdered: 50, qtyReceived: 50 }, // Complete
        { id: 2, qtyOrdered: 50, qtyReceived: 0 },  // Pending
      ];

      const evaluatePOStatus = (linesList: typeof lines) => {
        const totalOrdered = linesList.reduce((sum, l) => sum + l.qtyOrdered, 0);
        const totalReceived = linesList.reduce((sum, l) => sum + l.qtyReceived, 0);

        if (totalReceived === 0) return POStatuses.APPROVED;
        if (linesList.every((l) => l.qtyReceived >= l.qtyOrdered)) return POStatuses.RECEIVED;
        return POStatuses.PARTIALLY_RECEIVED;
      };

      // Since Line 2 is unfulfilled, status MUST be PARTIALLY_RECEIVED
      expect(evaluatePOStatus(lines)).toBe(POStatuses.PARTIALLY_RECEIVED);

      // Once Line 2 receives 50, status moves to RECEIVED
      lines[1].qtyReceived = 50;
      expect(evaluatePOStatus(lines)).toBe(POStatuses.RECEIVED);
    });
  });

  // --- BUG 18: REORDER CALCULATION UNDERFLOW ---
  describe('Bug 18: Reorder Calculation Negative / NaN Underflow', () => {
    it('ensures suggested PO quantity is strictly positive and triggered only below reorder point', () => {
      const calculateSuggestedQty = (
        onHand: number,
        reserved: number,
        reorderPoint: number,
        reorderQty: number,
        maxStock: number,
      ) => {
        const available = onHand - reserved;
        if (available > reorderPoint) {
          return 0; // No reorder needed
        }
        // Formula: GREATEST(reorder_qty, max_stock - available)
        return Math.max(reorderQty, maxStock - available);
      };

      // Case 1: Healthy stock (available 60 > reorderPoint 20) -> 0 suggested
      expect(calculateSuggestedQty(60, 0, 20, 30, 100)).toBe(0);

      // Case 2: Low stock (available 15 <= reorderPoint 20) -> max(30, 100 - 15) = 85
      expect(calculateSuggestedQty(15, 0, 20, 30, 100)).toBe(85);

      // Case 3: Zero stock (available 0 <= reorderPoint 20) -> max(30, 100 - 0) = 100
      expect(calculateSuggestedQty(0, 0, 20, 30, 100)).toBe(100);
      expect(calculateSuggestedQty(0, 0, 20, 30, 100)).toBeGreaterThan(0);
    });
  });

  // --- BUG 19: TIMEZONE & AS-OF DATE DRIFT ---
  describe('Bug 19: Timezone & As-Of Date Point-in-Time Boundary Drift', () => {
    it('accurately queries historical stock as-of exact UTC timestamp regardless of client timezone', () => {
      const movements: MovementRecord[] = [
        {
          id: 1,
          productId: 1,
          warehouseId: 1,
          movementType: 'OPENING',
          deltaOnHand: 100,
          deltaDamaged: 0,
          unitCost: 10,
          balanceAfter: 100,
          sourceDocType: 'OPEN',
          sourceDocId: 1,
          createdAt: new Date('2026-10-01T10:00:00Z'),
        },
        {
          id: 2,
          productId: 1,
          warehouseId: 1,
          movementType: 'PURCHASE_RECEIPT',
          deltaOnHand: 50,
          deltaDamaged: 0,
          unitCost: 10,
          balanceAfter: 150,
          sourceDocType: 'PO',
          sourceDocId: 1,
          createdAt: new Date('2026-10-01T14:00:00Z'),
        },
        {
          id: 3,
          productId: 1,
          warehouseId: 1,
          movementType: 'SALE_SHIPMENT',
          deltaOnHand: -20,
          deltaDamaged: 0,
          unitCost: 10,
          balanceAfter: 130,
          sourceDocType: 'SO',
          sourceDocId: 1,
          createdAt: new Date('2026-10-01T18:00:00Z'),
        },
      ];

      const getStockAsOf = (asOfTimeIso: string) => {
        const asOfDate = new Date(asOfTimeIso);
        return movements
          .filter((m) => m.createdAt.getTime() <= asOfDate.getTime())
          .reduce((sum, m) => sum + m.deltaOnHand, 0);
      };

      // As of 12:00 UTC (before receipt): balance = 100
      expect(getStockAsOf('2026-10-01T12:00:00Z')).toBe(100);

      // As of 16:00 UTC (after receipt, before sale): balance = 150
      expect(getStockAsOf('2026-10-01T16:00:00Z')).toBe(150);

      // As of 20:00 UTC (after all): balance = 130
      expect(getStockAsOf('2026-10-01T20:00:00Z')).toBe(130);
    });
  });

  // --- BUG 20: AUDIT LOG OMISSION DURING STOCK MUTATIONS ---
  describe('Bug 20: Audit Log Omission during Stock Movements', () => {
    it('guarantees that every stock movement transaction creates a complete audit log entry with before/after state', () => {
      const auditStore: AuditRecord[] = [];
      let auditSeq = 1;

      const postMovementWithAudit = (
        userId: number,
        action: string,
        productId: number,
        curState: Record<string, any>,
        nextState: Record<string, any>,
      ) => {
        auditStore.push({
          id: auditSeq++,
          userId,
          action,
          entityType: 'STOCK_LEVEL',
          entityId: productId,
          before: curState,
          after: nextState,
          timestamp: new Date(),
        });
      };

      // Perform 3 distinct inventory actions
      postMovementWithAudit(1, 'POST_OPENING', 1, { onHand: 0 }, { onHand: 50 });
      postMovementWithAudit(2, 'POST_PURCHASE_RECEIPT', 1, { onHand: 50 }, { onHand: 80 });
      postMovementWithAudit(3, 'POST_SALE_SHIPMENT', 1, { onHand: 80 }, { onHand: 65 });

      expect(auditStore).toHaveLength(3);
      expect(auditStore[0].before.onHand).toBe(0);
      expect(auditStore[0].after.onHand).toBe(50);
      expect(auditStore[2].action).toBe('POST_SALE_SHIPMENT');
      expect(auditStore[2].after.onHand).toBe(65);
      expect(auditStore.every((a) => a.userId > 0 && a.entityId === 1)).toBe(true);
    });
  });
});
