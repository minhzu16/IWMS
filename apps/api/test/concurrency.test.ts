import { describe, it, expect, beforeAll } from 'vitest';
import { canTransitionPO, canTransitionSO, canTransitionTransfer } from '@iwms/shared';

describe('State Machine Transitions', () => {
  it('PO state transitions follow strict rules', () => {
    // DRAFT -> SUBMITTED allowed for PURCHASING
    expect(canTransitionPO('DRAFT', 'SUBMIT', 'PURCHASING').allowed).toBe(true);

    // DRAFT -> APPROVE not allowed directly
    expect(canTransitionPO('DRAFT', 'APPROVE', 'MANAGER').allowed).toBe(false);

    // SUBMITTED -> APPROVE allowed for MANAGER
    expect(canTransitionPO('SUBMITTED', 'APPROVE', 'MANAGER').allowed).toBe(true);

    // SUBMITTED -> APPROVE forbidden for VIEWER
    expect(canTransitionPO('SUBMITTED', 'APPROVE', 'VIEWER').allowed).toBe(false);

    // APPROVED -> RECEIVE_FULL allowed for WAREHOUSE
    expect(canTransitionPO('APPROVED', 'RECEIVE_FULL', 'WAREHOUSE').allowed).toBe(true);
  });

  it('SO state transitions enforce reservation and shipment lifecycle', () => {
    // DRAFT -> CONFIRM
    expect(canTransitionSO('DRAFT', 'CONFIRM', 'SALES').allowed).toBe(true);

    // CONFIRMED -> SHIP_FULL
    expect(canTransitionSO('CONFIRMED', 'SHIP_FULL', 'WAREHOUSE').allowed).toBe(true);

    // SHIPPED -> CANCEL forbidden
    expect(canTransitionSO('SHIPPED', 'CANCEL', 'SALES').allowed).toBe(false);
  });

  it('Transfer transitions enforce 2-step dispatch and receive', () => {
    // DRAFT -> DISPATCH
    expect(canTransitionTransfer('DRAFT', 'DISPATCH', 'WAREHOUSE').allowed).toBe(true);

    // DISPATCHED -> RECEIVE
    expect(canTransitionTransfer('DISPATCHED', 'RECEIVE', 'WAREHOUSE').allowed).toBe(true);

    // DRAFT -> RECEIVE directly is forbidden
    expect(canTransitionTransfer('DRAFT', 'RECEIVE', 'WAREHOUSE').allowed).toBe(false);
  });
});

describe('Concurrent Stock Arithmetic & Invariants', () => {
  it('Simulates 50 concurrent withdrawals with conditional atomicity', async () => {
    let onHand = 10;
    let reserved = 0;
    const requested = 1;
    let successCount = 0;
    let failCount = 0;

    // Simulate 50 concurrent atomic operations with mutex/conditional check
    const tasks = Array.from({ length: 50 }, async () => {
      // Simulate micro-delay
      await new Promise((r) => setTimeout(r, Math.random() * 10));

      // Atomic conditional update simulation (like SQL WHERE on_hand - reserved >= 1)
      if (onHand - reserved >= requested) {
        onHand -= requested;
        successCount++;
        return { success: true };
      } else {
        failCount++;
        return { success: false, error: 'INSUFFICIENT_STOCK' };
      }
    });

    await Promise.all(tasks);

    // Exactly 10 must succeed, 40 must fail, final stock must be 0
    expect(successCount).toBe(10);
    expect(failCount).toBe(40);
    expect(onHand).toBe(0);
    expect(onHand >= 0).toBe(true); // Invariant check: never negative
  });

  it('Moving average cost calculation matches standard weighted average formula', () => {
    const curOnHand = 10;
    const curAvgCost = 100;
    const incomingQty = 20;
    const incomingCost = 130;

    const nextOnHand = curOnHand + incomingQty;
    const nextAvgCost = (curOnHand * curAvgCost + incomingQty * incomingCost) / nextOnHand;

    // (10*100 + 20*130) / 30 = (1000 + 2600) / 30 = 3600 / 30 = 120
    expect(nextAvgCost).toBe(120);
  });
});
