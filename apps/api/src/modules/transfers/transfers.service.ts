import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { pool } from '@iwms/db';
import {
  TransferCreateInput,
  TransferReceiveInput,
  TransferStatuses,
} from '@iwms/shared';
import { StockPostingService } from '../inventory/stock-posting.service.js';

@Injectable()
export class TransfersService {
  constructor(private stockPostingService: StockPostingService) {}

  async getTransfers(params: { status?: string; warehouseId?: number }) {
    let query = `
      SELECT
        t.id,
        t.transfer_number,
        t.source_warehouse_id,
        w_src.name AS source_warehouse_name,
        t.target_warehouse_id,
        w_tgt.name AS target_warehouse_name,
        t.status,
        t.notes,
        t.version,
        t.created_at,
        u.full_name AS created_by_name,
        COUNT(tl.id) AS item_count,
        COALESCE(SUM(tl.qty_dispatched), 0)::float AS total_dispatched,
        COALESCE(SUM(tl.qty_received), 0)::float AS total_received
      FROM transfers t
      JOIN warehouses w_src ON w_src.id = t.source_warehouse_id
      JOIN warehouses w_tgt ON w_tgt.id = t.target_warehouse_id
      JOIN users u ON u.id = t.created_by
      LEFT JOIN transfer_lines tl ON tl.transfer_id = t.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params.status) {
      values.push(params.status);
      query += ` AND t.status = $${values.length}`;
    }
    if (params.warehouseId) {
      values.push(params.warehouseId);
      query += ` AND (t.source_warehouse_id = $${values.length} OR t.target_warehouse_id = $${values.length})`;
    }

    query += ` GROUP BY t.id, w_src.name, w_tgt.name, u.full_name ORDER BY t.id DESC`;

    const res = await pool.query(query, values);
    return res.rows;
  }

  async getTransferById(id: number) {
    const tRes = await pool.query(
      `SELECT
        t.*,
        w_src.name AS source_warehouse_name,
        w_tgt.name AS target_warehouse_name,
        u.full_name AS created_by_name
       FROM transfers t
       JOIN warehouses w_src ON w_src.id = t.source_warehouse_id
       JOIN warehouses w_tgt ON w_tgt.id = t.target_warehouse_id
       JOIN users u ON u.id = t.created_by
       WHERE t.id = $1`,
      [id],
    );

    if (tRes.rows.length === 0) {
      throw new NotFoundException(`Phiếu điều chuyển #${id} không tồn tại`);
    }

    const linesRes = await pool.query(
      `SELECT tl.*, p.sku, p.name AS product_name, p.uom, tl.qty_dispatched::float, tl.qty_received::float, tl.qty_damaged::float
       FROM transfer_lines tl
       JOIN products p ON p.id = tl.product_id
       WHERE tl.transfer_id = $1
       ORDER BY tl.id ASC`,
      [id],
    );

    return {
      ...tRes.rows[0],
      lines: linesRes.rows,
    };
  }

  async createTransfer(input: TransferCreateInput, userId: number) {
    if (input.sourceWarehouseId === input.targetWarehouseId) {
      throw new BadRequestException('Kho nguồn và kho đích không được trùng nhau');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM transfers');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const transferNumber = `TR-${year}-${seq}`;

      const tRes = await client.query(
        `INSERT INTO transfers (transfer_number, source_warehouse_id, target_warehouse_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [transferNumber, input.sourceWarehouseId, input.targetWarehouseId, input.notes || null, userId],
      );
      const transfer = tRes.rows[0];

      for (const line of input.lines) {
        await client.query(
          `INSERT INTO transfer_lines (transfer_id, product_id, qty_dispatched)
           VALUES ($1, $2, $3)`,
          [transfer.id, line.productId, line.qtyDispatched],
        );
      }

      await client.query('COMMIT');
      return this.getTransferById(transfer.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async dispatchTransfer(id: number, userId: number) {
    const transfer = await this.getTransferById(id);
    if (transfer.status !== TransferStatuses.DRAFT) {
      throw new BadRequestException(`Chỉ có thể xuất kho phiếu điều chuyển ở trạng thái DRAFT`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const movementsToPost = transfer.lines.map((l: any) => ({
        productId: l.product_id,
        warehouseId: transfer.source_warehouse_id,
        movementType: 'TRANSFER_OUT',
        qtyOnHandDelta: -l.qty_dispatched,
        qtyDamagedDelta: 0,
        note: `Xuất điều chuyển tới ${transfer.target_warehouse_name} (${transfer.transfer_number})`,
        sourceDocType: 'TRANSFER',
        sourceDocId: transfer.id,
        sourceLineId: l.id,
      }));

      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'TRANSFER', sourceDocId: transfer.id },
        movementsToPost,
        userId,
      );

      await client.query(
        `UPDATE transfers SET status = 'DISPATCHED', version = version + 1 WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');
      return this.getTransferById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async receiveTransfer(id: number, input: TransferReceiveInput, userId: number) {
    const transfer = await this.getTransferById(id);
    if (transfer.status !== TransferStatuses.DISPATCHED) {
      throw new BadRequestException(`Chỉ có thể nhận hàng điều chuyển ở trạng thái DISPATCHED`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const movementsToPost: any[] = [];

      for (const item of input.lines) {
        const line = transfer.lines.find((l: any) => l.id === item.lineId);
        if (!line) {
          throw new BadRequestException(`Dòng điều chuyển #${item.lineId} không tồn tại`);
        }

        const totalReceived = item.qtyReceived + item.qtyDamaged;
        if (totalReceived > line.qty_dispatched) {
          throw new BadRequestException(
            `Tổng số lượng nhận vượt quá số lượng đã xuất (${totalReceived} > ${line.qty_dispatched})`,
          );
        }

        await client.query(
          `UPDATE transfer_lines
           SET qty_received = $1, qty_damaged = $2
           WHERE id = $3`,
          [item.qtyReceived, item.qtyDamaged, item.lineId],
        );

        if (item.qtyReceived > 0) {
          movementsToPost.push({
            productId: line.product_id,
            warehouseId: transfer.target_warehouse_id,
            movementType: 'TRANSFER_IN',
            qtyOnHandDelta: item.qtyReceived,
            qtyDamagedDelta: 0,
            note: `Nhập điều chuyển từ ${transfer.source_warehouse_name} (${transfer.transfer_number})`,
            sourceDocType: 'TRANSFER',
            sourceDocId: transfer.id,
            sourceLineId: line.id,
          });
        }

        if (item.qtyDamaged > 0) {
          movementsToPost.push({
            productId: line.product_id,
            warehouseId: transfer.target_warehouse_id,
            movementType: 'DAMAGE',
            qtyOnHandDelta: 0,
            qtyDamagedDelta: item.qtyDamaged,
            note: `Hàng hư hỏng phát sinh trong quá trình vận chuyển (${transfer.transfer_number})`,
            sourceDocType: 'TRANSFER',
            sourceDocId: transfer.id,
            sourceLineId: line.id,
          });
        }
      }

      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'TRANSFER', sourceDocId: transfer.id },
        movementsToPost,
        userId,
      );

      await client.query(
        `UPDATE transfers SET status = 'RECEIVED', version = version + 1 WHERE id = $1`,
        [id],
      );

      await client.query('COMMIT');
      return this.getTransferById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
