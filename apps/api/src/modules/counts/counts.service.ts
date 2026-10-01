import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { pool } from '@iwms/db';
import { StockCountCreateInput, CountStatuses } from '@iwms/shared';
import { StockPostingService } from '../inventory/stock-posting.service.js';

@Injectable()
export class CountsService {
  constructor(private stockPostingService: StockPostingService) {}

  async getCounts(warehouseId?: number) {
    let query = `
      SELECT
        sc.id,
        sc.count_number,
        sc.warehouse_id,
        w.name AS warehouse_name,
        sc.status,
        sc.notes,
        sc.created_at,
        u_cre.full_name AS created_by_name,
        sc.approved_at,
        u_app.full_name AS approved_by_name,
        COUNT(scl.id) AS item_count,
        COALESCE(SUM(ABS(scl.variance)), 0)::float AS total_variance
      FROM stock_counts sc
      JOIN warehouses w ON w.id = sc.warehouse_id
      JOIN users u_cre ON u_cre.id = sc.created_by
      LEFT JOIN users u_app ON u_app.id = sc.approved_by
      LEFT JOIN stock_count_lines scl ON scl.count_id = sc.id
      WHERE 1=1
    `;
    const values: any[] = [];
    if (warehouseId) {
      values.push(warehouseId);
      query += ` AND sc.warehouse_id = $${values.length}`;
    }
    query += ` GROUP BY sc.id, w.name, u_cre.full_name, u_app.full_name ORDER BY sc.id DESC`;

    const res = await pool.query(query, values);
    return res.rows;
  }

  async getCountById(id: number) {
    const cRes = await pool.query(
      `SELECT sc.*, w.name AS warehouse_name, u_cre.full_name AS created_by_name, u_app.full_name AS approved_by_name
       FROM stock_counts sc
       JOIN warehouses w ON w.id = sc.warehouse_id
       JOIN users u_cre ON u_cre.id = sc.created_by
       LEFT JOIN users u_app ON u_app.id = sc.approved_by
       WHERE sc.id = $1`,
      [id],
    );
    if (cRes.rows.length === 0) {
      throw new NotFoundException(`Phiếu kiểm kê #${id} không tồn tại`);
    }

    const linesRes = await pool.query(
      `SELECT scl.*, p.sku, p.name AS product_name, p.uom, scl.system_qty::float, scl.counted_qty::float, scl.variance::float
       FROM stock_count_lines scl
       JOIN products p ON p.id = scl.product_id
       WHERE scl.count_id = $1
       ORDER BY scl.id ASC`,
      [id],
    );

    return {
      ...cRes.rows[0],
      lines: linesRes.rows,
    };
  }

  async createCount(input: StockCountCreateInput, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM stock_counts');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const countNumber = `SC-${year}-${seq}`;

      const scRes = await client.query(
        `INSERT INTO stock_counts (count_number, warehouse_id, notes, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [countNumber, input.warehouseId, input.notes || null, userId],
      );
      const sc = scRes.rows[0];

      for (const line of input.lines) {
        // Fetch current system on_hand
        const lvlRes = await client.query(
          `SELECT on_hand FROM stock_levels WHERE product_id = $1 AND warehouse_id = $2`,
          [line.productId, input.warehouseId],
        );
        const systemQty = lvlRes.rows.length > 0 ? Number(lvlRes.rows[0].on_hand) : 0;
        const variance = Number((line.countedQty - systemQty).toFixed(3));

        await client.query(
          `INSERT INTO stock_count_lines (count_id, product_id, system_qty, counted_qty, variance)
           VALUES ($1, $2, $3, $4, $5)`,
          [sc.id, line.productId, systemQty, line.countedQty, variance],
        );
      }

      await client.query('COMMIT');
      return this.getCountById(sc.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async approveCount(id: number, userId: number) {
    const count = await this.getCountById(id);
    if (count.status !== CountStatuses.DRAFT) {
      throw new BadRequestException(`Chỉ có thể duyệt phiếu kiểm kê ở trạng thái DRAFT`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const movementsToPost = [];

      for (const line of count.lines) {
        if (line.variance === 0) continue;

        const movementType = line.variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

        movementsToPost.push({
          productId: line.product_id,
          warehouseId: count.warehouse_id,
          movementType,
          qtyOnHandDelta: line.variance,
          qtyDamagedDelta: 0,
          note: `Điều chỉnh kiểm kê định kỳ theo phiếu ${count.count_number} (Thực đếm: ${line.counted_qty}, Hệ thống: ${line.system_qty})`,
          sourceDocType: 'STOCK_COUNT',
          sourceDocId: count.id,
          sourceLineId: line.id,
        });
      }

      if (movementsToPost.length > 0) {
        await this.stockPostingService.postMovements(
          client,
          { sourceDocType: 'STOCK_COUNT', sourceDocId: count.id },
          movementsToPost as any,
          userId,
        );
      }

      await client.query(
        `UPDATE stock_counts
         SET status = 'APPROVED', approved_by = $1, approved_at = now()
         WHERE id = $2`,
        [userId, id],
      );

      await client.query('COMMIT');
      return this.getCountById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
