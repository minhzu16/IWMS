import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { pool } from '@iwms/db';
import { SOCreateInput, SOStatuses } from '@iwms/shared';
import { StockPostingService } from '../inventory/stock-posting.service.js';
import { InsufficientStockException } from '../../common/problem-details.filter.js';

@Injectable()
export class SalesService {
  constructor(private stockPostingService: StockPostingService) {}

  async getSOs(params: { status?: string; warehouseId?: number }) {
    let query = `
      SELECT
        so.id,
        so.so_number,
        so.customer_name,
        so.warehouse_id,
        w.name AS warehouse_name,
        so.status,
        so.version,
        so.created_at,
        u.full_name AS created_by_name,
        COUNT(sol.id) AS item_count,
        COALESCE(SUM(sol.qty_ordered * sol.unit_price), 0)::float AS total_amount
      FROM sales_orders so
      JOIN warehouses w ON w.id = so.warehouse_id
      JOIN users u ON u.id = so.created_by
      LEFT JOIN sales_order_lines sol ON sol.so_id = so.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params.status) {
      values.push(params.status);
      query += ` AND so.status = $${values.length}`;
    }
    if (params.warehouseId) {
      values.push(params.warehouseId);
      query += ` AND so.warehouse_id = $${values.length}`;
    }

    query += ` GROUP BY so.id, w.name, u.full_name ORDER BY so.id DESC`;

    const res = await pool.query(query, values);
    return res.rows;
  }

  async getSOById(id: number) {
    const soRes = await pool.query(
      `SELECT so.*, w.name AS warehouse_name, u.full_name AS created_by_name
       FROM sales_orders so
       JOIN warehouses w ON w.id = so.warehouse_id
       JOIN users u ON u.id = so.created_by
       WHERE so.id = $1`,
      [id],
    );

    if (soRes.rows.length === 0) {
      throw new NotFoundException(`Đơn bán hàng SO #${id} không tồn tại`);
    }

    const linesRes = await pool.query(
      `SELECT sol.*, p.sku, p.name AS product_name, p.uom, sol.unit_price::float, sol.qty_ordered::float, sol.qty_shipped::float
       FROM sales_order_lines sol
       JOIN products p ON p.id = sol.product_id
       WHERE sol.so_id = $1
       ORDER BY sol.id ASC`,
      [id],
    );

    return {
      ...soRes.rows[0],
      lines: linesRes.rows,
    };
  }

  async createSO(input: SOCreateInput, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM sales_orders');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const soNumber = `SO-${year}-${seq}`;

      const soRes = await client.query(
        `INSERT INTO sales_orders (so_number, customer_name, warehouse_id, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [soNumber, input.customerName, input.warehouseId, userId],
      );
      const so = soRes.rows[0];

      for (const line of input.lines) {
        await client.query(
          `INSERT INTO sales_order_lines (so_id, product_id, qty_ordered, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [so.id, line.productId, line.qtyOrdered, line.unitPrice],
        );
      }

      await client.query('COMMIT');
      return this.getSOById(so.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async confirmSO(id: number, userId: number) {
    const so = await this.getSOById(id);
    if (so.status !== SOStatuses.DRAFT) {
      throw new BadRequestException(`Chỉ có thể xác nhận đơn hàng ở trạng thái DRAFT. Hiện tại: ${so.status}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Sort lines to prevent deadlocks
      const sortedLines = [...so.lines].sort((a: any, b: any) => a.product_id - b.product_id);

      for (const line of sortedLines) {
        // Atomic conditional reserve update
        const updateRes = await client.query(
          `UPDATE stock_levels
           SET reserved = reserved + $1,
               version = version + 1,
               updated_at = now()
           WHERE product_id = $2 AND warehouse_id = $3
             AND (on_hand - reserved) >= $1
           RETURNING on_hand, reserved`,
          [line.qty_ordered, line.product_id, so.warehouse_id],
        );

        if (updateRes.rows.length === 0) {
          // Check current stock for detailed error
          const currRes = await client.query(
            `SELECT on_hand, reserved FROM stock_levels WHERE product_id = $1 AND warehouse_id = $2`,
            [line.product_id, so.warehouse_id],
          );
          const current = currRes.rows[0] || { on_hand: 0, reserved: 0 };
          const avail = Number(current.on_hand) - Number(current.reserved);

          throw new InsufficientStockException({
            productId: line.product_id,
            warehouseId: so.warehouse_id,
            available: Math.max(0, avail),
            requested: line.qty_ordered,
          });
        }
      }

      await client.query(
        `UPDATE sales_orders SET status = 'CONFIRMED', version = version + 1 WHERE id = $1`,
        [id],
      );

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before, after)
         VALUES ($1, 'SO_CONFIRMED', 'SALES_ORDER', $2, $3, $4)`,
        [userId, id, JSON.stringify({ status: 'DRAFT' }), JSON.stringify({ status: 'CONFIRMED' })],
      );

      await client.query('COMMIT');
      return this.getSOById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async shipSO(id: number, userId: number) {
    const so = await this.getSOById(id);
    if (so.status !== SOStatuses.CONFIRMED) {
      throw new BadRequestException(`Chỉ có thể xuất hàng cho SO ở trạng thái CONFIRMED`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const linesToPost: any[] = [];

      for (const line of so.lines) {
        // Release the reservation first
        await client.query(
          `UPDATE stock_levels
           SET reserved = reserved - $1, version = version + 1, updated_at = now()
           WHERE product_id = $2 AND warehouse_id = $3`,
          [line.qty_ordered, line.product_id, so.warehouse_id],
        );

        // Update shipped quantity on order line
        await client.query(
          `UPDATE sales_order_lines SET qty_shipped = qty_ordered WHERE id = $1`,
          [line.id],
        );

        // Post movement SALE_SHIPMENT
        linesToPost.push({
          productId: line.product_id,
          warehouseId: so.warehouse_id,
          movementType: 'SALE_SHIPMENT',
          qtyOnHandDelta: -line.qty_ordered,
          qtyDamagedDelta: 0,
          note: `Xuất bán theo đơn hàng ${so.so_number}`,
          sourceDocType: 'SALES_ORDER',
          sourceDocId: so.id,
          sourceLineId: line.id,
        });
      }

      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'SALES_ORDER', sourceDocId: so.id },
        linesToPost,
        userId,
      );

      await client.query(
        `UPDATE sales_orders SET status = 'SHIPPED', version = version + 1 WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');
      return this.getSOById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelSO(id: number, userId: number) {
    const so = await this.getSOById(id);
    if (so.status === SOStatuses.SHIPPED || so.status === SOStatuses.CANCELLED) {
      throw new BadRequestException(`Không thể hủy đơn hàng đã xuất hoặc đã hủy`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If it was CONFIRMED, release the held reservations
      if (so.status === SOStatuses.CONFIRMED) {
        for (const line of so.lines) {
          await client.query(
            `UPDATE stock_levels
             SET reserved = GREATEST(0, reserved - $1), version = version + 1, updated_at = now()
             WHERE product_id = $2 AND warehouse_id = $3`,
            [line.qty_ordered, line.product_id, so.warehouse_id],
          );
        }
      }

      await client.query(
        `UPDATE sales_orders SET status = 'CANCELLED', version = version + 1 WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');
      return this.getSOById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
