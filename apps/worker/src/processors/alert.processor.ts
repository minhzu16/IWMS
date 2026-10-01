import { Job } from 'bullmq';
import { pool } from '@iwms/db';

export interface AlertJobData {
  productId: number;
  warehouseId: number;
  currentAvailable: number;
  reorderPoint: number;
}

export async function processLowStockAlert(job: Job<AlertJobData>) {
  const { productId, warehouseId, currentAvailable, reorderPoint } = job.data;
  console.log(`[Worker - Alert] Checking low stock for Product #${productId} in Warehouse #${warehouseId}...`);

  if (currentAvailable <= reorderPoint) {
    const prodRes = await pool.query('SELECT name, sku FROM products WHERE id = $1', [productId]);
    const whRes = await pool.query('SELECT name FROM warehouses WHERE id = $1', [warehouseId]);

    const productName = prodRes.rows[0]?.name || `Product #${productId}`;
    const whName = whRes.rows[0]?.name || `Warehouse #${warehouseId}`;

    console.warn(
      `[Worker - Alert] ⚠️ LOW STOCK WARNING: "${productName}" tại "${whName}" chỉ còn ${currentAvailable} (Ngưỡng: ${reorderPoint}).`,
    );

    // Persist notification into notifications table
    await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       VALUES ($1, $2, $3)`,
      [
        null, // Broadcast to all managers/purchasing
        'LOW_STOCK_ALERT',
        JSON.stringify({
          productId,
          productName,
          warehouseId,
          warehouseName: whName,
          available: currentAvailable,
          reorderPoint,
          timestamp: new Date().toISOString(),
        }),
      ],
    );

    return { alerted: true, productName, currentAvailable, reorderPoint };
  }

  return { alerted: false };
}
