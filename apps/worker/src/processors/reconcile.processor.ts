import { Job } from 'bullmq';
import { pool } from '@iwms/db';

export async function processNightlyReconcile(job: Job) {
  console.log(`[Worker - Reconcile] Starting automated invariant audit at ${new Date().toISOString()}...`);

  const query = `
    SELECT
      s.product_id,
      p.sku,
      p.name AS product_name,
      s.warehouse_id,
      w.name AS warehouse_name,
      s.on_hand::float,
      COALESCE(SUM(m.qty_on_hand_delta), 0)::float AS ledger_sum,
      (s.on_hand - COALESCE(SUM(m.qty_on_hand_delta), 0))::float AS discrepancy
    FROM stock_levels s
    JOIN products p ON p.id = s.product_id
    JOIN warehouses w ON w.id = s.warehouse_id
    LEFT JOIN stock_movements m ON m.product_id = s.product_id AND m.warehouse_id = s.warehouse_id
    GROUP BY s.product_id, p.sku, p.name, s.warehouse_id, w.name, s.on_hand
    HAVING s.on_hand <> COALESCE(SUM(m.qty_on_hand_delta), 0);
  `;

  const res = await pool.query(query);
  const discrepancies = res.rows;

  if (discrepancies.length === 0) {
    console.log('[Worker - Reconcile] ✅ 100% INVARIANT VERIFIED: Zero discrepancies detected between Ledger & Cache.');
    return { status: 'CONSISTENT', discrepancyCount: 0 };
  } else {
    console.error(`[Worker - Reconcile] ❌ INVARIANT VIOLATION: Detected ${discrepancies.length} discrepancy row(s)!`, discrepancies);

    // Save critical notification
    await pool.query(
      `INSERT INTO notifications (type, payload) VALUES ('CRITICAL_INVARIANT_DISCREPANCY', $1)`,
      [JSON.stringify({ discrepancyCount: discrepancies.length, discrepancies, timestamp: new Date().toISOString() })],
    );

    return { status: 'DISCREPANCY_DETECTED', discrepancyCount: discrepancies.length, discrepancies };
  }
}
