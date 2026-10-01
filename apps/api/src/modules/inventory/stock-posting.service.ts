import { Injectable, BadRequestException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { MovementLineInput } from '@iwms/shared';
import { InsufficientStockException } from '../../common/problem-details.filter.js';

export interface DocReference {
  sourceDocType: string;
  sourceDocId: number;
  sourceLineId?: number;
}

@Injectable()
export class StockPostingService {
  /**
   * Posts stock movements atomically within a transaction.
   * Enforces:
   * 1. Deterministic sorting to prevent deadlocks (ORDER BY product_id, warehouse_id)
   * 2. Row-level locking (SELECT ... FOR UPDATE)
   * 3. Non-negative stock and invariant checks
   * 4. Moving-average cost recalculation
   * 5. Append-only ledger recording
   * 6. Audit logging
   */
  async postMovements(
    client: PoolClient,
    docRef: DocReference,
    lines: MovementLineInput[],
    userId: number,
  ) {
    if (!lines || lines.length === 0) return [];

    // 1. Sort lines by productId, then warehouseId to eliminate deadlocks
    const sortedLines = [...lines].sort((a, b) => {
      if (a.productId !== b.productId) return a.productId - b.productId;
      return a.warehouseId - b.warehouseId;
    });

    const recordedMovements = [];

    for (const line of sortedLines) {
      // 2. Ensure stock_levels row exists (upsert 0 balance)
      await client.query(
        `INSERT INTO stock_levels (product_id, warehouse_id, on_hand, reserved, damaged, avg_cost)
         VALUES ($1, $2, 0, 0, 0, 0)
         ON CONFLICT (product_id, warehouse_id) DO NOTHING`,
        [line.productId, line.warehouseId],
      );

      // 3. Acquire pessimistic lock on the target stock level
      const lockRes = await client.query(
        `SELECT on_hand, reserved, damaged, avg_cost, version
         FROM stock_levels
         WHERE product_id = $1 AND warehouse_id = $2
         FOR UPDATE`,
        [line.productId, line.warehouseId],
      );

      const current = lockRes.rows[0];
      const curOnHand = Number(current.on_hand);
      const curReserved = Number(current.reserved);
      const curDamaged = Number(current.damaged);
      const curAvgCost = Number(current.avg_cost);

      const deltaOnHand = Number(line.qtyOnHandDelta || 0);
      const deltaDamaged = Number(line.qtyDamagedDelta || 0);

      const nextOnHand = Number((curOnHand + deltaOnHand).toFixed(3));
      const nextDamaged = Number((curDamaged + deltaDamaged).toFixed(3));

      // 4. Invariant checks
      if (nextOnHand < 0 || curReserved > nextOnHand) {
        throw new InsufficientStockException({
          productId: line.productId,
          warehouseId: line.warehouseId,
          available: Number((curOnHand - curReserved).toFixed(3)),
          requested: Math.abs(deltaOnHand),
        });
      }

      if (nextDamaged < 0) {
        throw new BadRequestException(
          `Số lượng hàng hư hỏng sau xử lý không được âm (Hiện tại: ${curDamaged}, trừ: ${Math.abs(deltaDamaged)})`,
        );
      }

      // 5. Moving Average Cost Calculation on receipt
      let nextAvgCost = curAvgCost;
      if (deltaOnHand > 0 && line.unitCost !== undefined && line.unitCost !== null) {
        const incomingCost = Number(line.unitCost);
        const totalOldValue = curOnHand * curAvgCost;
        const totalIncomingValue = deltaOnHand * incomingCost;
        nextAvgCost = Number(((totalOldValue + totalIncomingValue) / nextOnHand).toFixed(4));
      }

      // 6. Update live balance
      await client.query(
        `UPDATE stock_levels
         SET on_hand = $1,
             damaged = $2,
             avg_cost = $3,
             version = version + 1,
             updated_at = now()
         WHERE product_id = $4 AND warehouse_id = $5`,
        [nextOnHand, nextDamaged, nextAvgCost, line.productId, line.warehouseId],
      );

      // 7. Append-only ledger recording
      const movRes = await client.query(
        `INSERT INTO stock_movements (
          product_id, warehouse_id, movement_type,
          qty_on_hand_delta, qty_damaged_delta, unit_cost,
          balance_after, source_doc_type, source_doc_id, source_line_id,
          note, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          line.productId,
          line.warehouseId,
          line.movementType,
          deltaOnHand,
          deltaDamaged,
          line.unitCost || (deltaOnHand < 0 ? curAvgCost : 0),
          nextOnHand,
          docRef.sourceDocType,
          docRef.sourceDocId,
          line.sourceLineId || docRef.sourceLineId || null,
          line.note || null,
          userId,
        ],
      );

      // 8. Audit log recording
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, before, after
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          `POST_${line.movementType}`,
          'STOCK_LEVEL',
          line.productId,
          JSON.stringify({ onHand: curOnHand, reserved: curReserved, damaged: curDamaged }),
          JSON.stringify({ onHand: nextOnHand, reserved: curReserved, damaged: nextDamaged }),
        ],
      );

      recordedMovements.push(movRes.rows[0]);
    }

    return recordedMovements;
  }
}
