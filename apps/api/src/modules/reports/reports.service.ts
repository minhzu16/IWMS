import { Injectable } from '@nestjs/common';
import { pool } from '@iwms/db';

@Injectable()
export class ReportsService {
  async getStockValuation(warehouseId?: number) {
    let query = `
      SELECT
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COUNT(DISTINCT sl.product_id) AS sku_count,
        COALESCE(SUM(sl.on_hand), 0)::float AS total_on_hand,
        COALESCE(SUM(sl.reserved), 0)::float AS total_reserved,
        COALESCE(SUM(sl.damaged), 0)::float AS total_damaged,
        COALESCE(SUM(sl.on_hand * sl.avg_cost), 0)::float AS total_valuation,
        COALESCE(SUM(sl.damaged * sl.avg_cost), 0)::float AS damaged_valuation
      FROM warehouses w
      LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      query += ` AND w.id = $${params.length}`;
    }
    query += ` GROUP BY w.id, w.name ORDER BY total_valuation DESC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async getLowStockAlerts(warehouseId?: number) {
    let query = `
      SELECT
        sl.product_id,
        p.sku,
        p.name AS product_name,
        p.uom,
        sl.warehouse_id,
        w.name AS warehouse_name,
        sl.on_hand::float,
        sl.reserved::float,
        (sl.on_hand - sl.reserved)::float AS available,
        COALESCE(pws.reorder_point, 0) AS reorder_point,
        COALESCE(pws.reorder_qty, 10) AS reorder_qty,
        COALESCE(pws.max_stock, 100) AS max_stock,
        pws.preferred_supplier_id,
        s.name AS preferred_supplier_name,
        -- Suggested reorder quantity formula
        GREATEST(
          COALESCE(pws.reorder_qty, 10),
          COALESCE(pws.max_stock, 100) - (sl.on_hand - sl.reserved)
        )::float AS suggested_po_qty
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      JOIN warehouses w ON w.id = sl.warehouse_id
      LEFT JOIN product_warehouse_settings pws
        ON pws.product_id = sl.product_id AND pws.warehouse_id = sl.warehouse_id
      LEFT JOIN suppliers s ON s.id = pws.preferred_supplier_id
      WHERE (sl.on_hand - sl.reserved) <= COALESCE(pws.reorder_point, 0)
    `;
    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      query += ` AND sl.warehouse_id = $${params.length}`;
    }
    query += ` ORDER BY (sl.on_hand - sl.reserved) ASC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async getABCAnalysis() {
    // Calculates value of goods shipped per SKU to classify A, B, C
    const query = `
      WITH product_usage AS (
        SELECT
          p.id AS product_id,
          p.sku,
          p.name AS product_name,
          COALESCE(SUM(ABS(sm.qty_on_hand_delta) * sm.unit_cost), 0)::float AS total_shipped_value
        FROM products p
        LEFT JOIN stock_movements sm
          ON sm.product_id = p.id
          AND sm.movement_type IN ('SALE_SHIPMENT', 'TRANSFER_OUT', 'DAMAGE')
          AND sm.qty_on_hand_delta < 0
        GROUP BY p.id, p.sku, p.name
      ),
      total_summary AS (
        SELECT COALESCE(SUM(total_shipped_value), 1)::float AS grand_total
        FROM product_usage
      ),
      ranked AS (
        SELECT
          pu.*,
          SUM(pu.total_shipped_value) OVER (ORDER BY pu.total_shipped_value DESC) AS cumulative_value,
          (SUM(pu.total_shipped_value) OVER (ORDER BY pu.total_shipped_value DESC) / ts.grand_total * 100)::float AS cumulative_pct
        FROM product_usage pu
        CROSS JOIN total_summary ts
      )
      SELECT
        r.*,
        CASE
          WHEN r.cumulative_pct <= 80 THEN 'A'
          WHEN r.cumulative_pct <= 95 THEN 'B'
          ELSE 'C'
        END AS abc_class
      FROM ranked r
      ORDER BY r.total_shipped_value DESC;
    `;

    const res = await pool.query(query);
    return res.rows;
  }

  async getMovementSummary(days: number = 30) {
    const query = `
      SELECT
        DATE(created_at) AS date,
        movement_type,
        COUNT(*) AS tx_count,
        COALESCE(SUM(CASE WHEN qty_on_hand_delta > 0 THEN qty_on_hand_delta ELSE 0 END), 0)::float AS total_in,
        COALESCE(SUM(CASE WHEN qty_on_hand_delta < 0 THEN ABS(qty_on_hand_delta) ELSE 0 END), 0)::float AS total_out
      FROM stock_movements
      WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
      GROUP BY DATE(created_at), movement_type
      ORDER BY DATE(created_at) ASC;
    `;
    const res = await pool.query(query, [days]);
    return res.rows;
  }
}
