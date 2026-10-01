import { Injectable, BadRequestException } from '@nestjs/common';
import { pool } from '@iwms/db';
import { StockPostingService } from './stock-posting.service.js';

@Injectable()
export class InventoryService {
  constructor(private stockPostingService: StockPostingService) {}

  async getLevels(filters: { warehouseId?: number; productId?: number; lowStock?: boolean }) {
    let query = `
      SELECT
        sl.product_id,
        p.sku,
        p.name AS product_name,
        p.barcode,
        p.uom,
        sl.warehouse_id,
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        sl.on_hand::float,
        sl.reserved::float,
        (sl.on_hand - sl.reserved)::float AS available,
        sl.damaged::float,
        sl.avg_cost::float,
        COALESCE(pws.reorder_point, 0) AS reorder_point,
        COALESCE(pws.reorder_qty, 10) AS reorder_qty,
        sl.updated_at
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      JOIN warehouses w ON w.id = sl.warehouse_id
      LEFT JOIN product_warehouse_settings pws
        ON pws.product_id = sl.product_id AND pws.warehouse_id = sl.warehouse_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.warehouseId) {
      params.push(filters.warehouseId);
      query += ` AND sl.warehouse_id = $${params.length}`;
    }

    if (filters.productId) {
      params.push(filters.productId);
      query += ` AND sl.product_id = $${params.length}`;
    }

    if (filters.lowStock) {
      query += ` AND (sl.on_hand - sl.reserved) <= COALESCE(pws.reorder_point, 0)`;
    }

    query += ` ORDER BY p.name ASC, w.code ASC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async getMovements(params: {
    productId?: number;
    warehouseId?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 25)));
    const offset = (page - 1) * limit;

    let whereClause = `WHERE 1=1`;
    const values: any[] = [];

    if (params.productId) {
      values.push(params.productId);
      whereClause += ` AND sm.product_id = $${values.length}`;
    }
    if (params.warehouseId) {
      values.push(params.warehouseId);
      whereClause += ` AND sm.warehouse_id = $${values.length}`;
    }
    if (params.movementType) {
      values.push(params.movementType);
      whereClause += ` AND sm.movement_type = $${values.length}`;
    }
    if (params.startDate) {
      values.push(params.startDate);
      whereClause += ` AND sm.created_at >= $${values.length}`;
    }
    if (params.endDate) {
      values.push(params.endDate);
      whereClause += ` AND sm.created_at <= $${values.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM stock_movements sm ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT
        sm.id,
        sm.product_id,
        p.sku,
        p.name AS product_name,
        sm.warehouse_id,
        w.name AS warehouse_name,
        sm.movement_type,
        sm.qty_on_hand_delta::float,
        sm.qty_damaged_delta::float,
        sm.unit_cost::float,
        sm.balance_after::float,
        sm.source_doc_type,
        sm.source_doc_id,
        sm.note,
        u.full_name AS created_by_name,
        sm.created_at
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       JOIN warehouses w ON w.id = sm.warehouse_id
       JOIN users u ON u.id = sm.created_by
       ${whereClause}
       ORDER BY sm.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values,
    );

    return {
      data: dataRes.rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAsOfStock(asOfDate: string, warehouseId?: number) {
    let query = `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        p.uom,
        w.id AS warehouse_id,
        w.name AS warehouse_name,
        COALESCE(SUM(sm.qty_on_hand_delta), 0)::float AS on_hand_as_of,
        COALESCE(SUM(sm.qty_damaged_delta), 0)::float AS damaged_as_of
      FROM products p
      CROSS JOIN warehouses w
      LEFT JOIN stock_movements sm
        ON sm.product_id = p.id
        AND sm.warehouse_id = w.id
        AND sm.created_at <= $1::timestamptz
      WHERE 1=1
    `;
    const params: any[] = [asOfDate];

    if (warehouseId) {
      params.push(warehouseId);
      query += ` AND w.id = $${params.length}`;
    }

    query += ` GROUP BY p.id, p.sku, p.name, p.uom, w.id, w.name ORDER BY p.name ASC, w.id ASC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async createAdjustment(
    warehouseId: number,
    productId: number,
    delta: number,
    reason: string,
    userId: number,
  ) {
    if (delta === 0) {
      throw new BadRequestException('Số lượng điều chỉnh phải khác 0');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const movementType = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'MANUAL_ADJUSTMENT', sourceDocId: Date.now() },
        [
          {
            productId,
            warehouseId,
            movementType,
            qtyOnHandDelta: delta,
            note: reason,
          } as any,
        ],
        userId,
      );

      await client.query('COMMIT');
      return { message: 'Điều chỉnh tồn kho thành công', delta, movementType };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async exportLevelsCsv(warehouseId?: number): Promise<string> {
    const data = await this.getLevels({ warehouseId });
    const headers = [
      'SKU',
      'Product Name',
      'Barcode',
      'UoM',
      'Warehouse Code',
      'Warehouse Name',
      'On Hand',
      'Reserved',
      'Available',
      'Damaged',
      'Average Cost',
      'Reorder Point',
    ];

    const rows = data.map((d) => [
      `"${d.sku || ''}"`,
      `"${d.product_name || ''}"`,
      `"${d.barcode || ''}"`,
      `"${d.uom || 'pcs'}"`,
      `"${d.warehouse_code || ''}"`,
      `"${d.warehouse_name || ''}"`,
      d.on_hand,
      d.reserved,
      d.available,
      d.damaged,
      d.avg_cost,
      d.reorder_point,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async exportMovementsCsv(warehouseId?: number): Promise<string> {
    const res = await this.getMovements({ warehouseId, limit: 1000 });
    const headers = [
      'ID',
      'Timestamp',
      'SKU',
      'Product Name',
      'Warehouse',
      'Movement Type',
      'Delta',
      'Balance After',
      'Source Doc Type',
      'Source Doc ID',
      'Created By',
      'Note',
    ];

    const rows = res.data.map((m) => [
      m.id,
      `"${m.created_at}"`,
      `"${m.sku || ''}"`,
      `"${m.product_name || ''}"`,
      `"${m.warehouse_name || ''}"`,
      `"${m.movement_type}"`,
      m.qty_on_hand_delta,
      m.balance_after,
      `"${m.source_doc_type}"`,
      m.source_doc_id,
      `"${m.created_by_name || ''}"`,
      `"${(m.note || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async reconcile() {
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
    return {
      isConsistent: discrepancies.length === 0,
      discrepancyCount: discrepancies.length,
      discrepancies,
      checkedAt: new Date().toISOString(),
    };
  }
}
