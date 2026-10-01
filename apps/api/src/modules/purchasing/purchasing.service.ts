import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { pool } from '@iwms/db';
import {
  POCreateInput,
  GoodsReceiptCreateInput,
  canTransitionPO,
  UserRole,
  POStatuses,
} from '@iwms/shared';
import { StockPostingService } from '../inventory/stock-posting.service.js';
import {
  InvalidStateTransitionException,
  VersionConflictException,
} from '../../common/problem-details.filter.js';

@Injectable()
export class PurchasingService {
  constructor(private stockPostingService: StockPostingService) {}

  async getPOs(params: { status?: string; supplierId?: number; warehouseId?: number }) {
    let query = `
      SELECT
        po.id,
        po.po_number,
        po.supplier_id,
        s.name AS supplier_name,
        po.warehouse_id,
        w.name AS warehouse_name,
        po.status,
        po.expected_date,
        po.approved_by,
        u_app.full_name AS approved_by_name,
        po.approved_at,
        po.version,
        po.created_at,
        u_cre.full_name AS created_by_name,
        COUNT(pol.id) AS item_count,
        COALESCE(SUM(pol.qty_ordered * pol.unit_price), 0)::float AS total_amount,
        COALESCE(SUM(pol.qty_received * pol.unit_price), 0)::float AS received_amount
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      JOIN warehouses w ON w.id = po.warehouse_id
      JOIN users u_cre ON u_cre.id = po.created_by
      LEFT JOIN users u_app ON u_app.id = po.approved_by
      LEFT JOIN purchase_order_lines pol ON pol.po_id = po.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params.status) {
      values.push(params.status);
      query += ` AND po.status = $${values.length}`;
    }
    if (params.supplierId) {
      values.push(params.supplierId);
      query += ` AND po.supplier_id = $${values.length}`;
    }
    if (params.warehouseId) {
      values.push(params.warehouseId);
      query += ` AND po.warehouse_id = $${values.length}`;
    }

    query += ` GROUP BY po.id, s.name, w.name, u_cre.full_name, u_app.full_name ORDER BY po.id DESC`;

    const res = await pool.query(query, values);
    return res.rows;
  }

  async getPOById(id: number) {
    const poRes = await pool.query(
      `SELECT
        po.*,
        s.name AS supplier_name,
        s.code AS supplier_code,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        u_cre.full_name AS created_by_name,
        u_app.full_name AS approved_by_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       JOIN warehouses w ON w.id = po.warehouse_id
       JOIN users u_cre ON u_cre.id = po.created_by
       LEFT JOIN users u_app ON u_app.id = po.approved_by
       WHERE po.id = $1`,
      [id],
    );

    if (poRes.rows.length === 0) {
      throw new NotFoundException(`Đơn mua hàng PO #${id} không tồn tại`);
    }

    const linesRes = await pool.query(
      `SELECT pol.*, p.sku, p.name AS product_name, p.uom, pol.unit_price::float, pol.qty_ordered::float, pol.qty_received::float
       FROM purchase_order_lines pol
       JOIN products p ON p.id = pol.product_id
       WHERE pol.po_id = $1
       ORDER BY pol.id ASC`,
      [id],
    );

    const receiptsRes = await pool.query(
      `SELECT gr.*, u.full_name AS received_by_name
       FROM goods_receipts gr
       JOIN users u ON u.id = gr.received_by
       WHERE gr.po_id = $1
       ORDER BY gr.id DESC`,
      [id],
    );

    return {
      ...poRes.rows[0],
      lines: linesRes.rows,
      receipts: receiptsRes.rows,
    };
  }

  async createPO(input: POCreateInput, userId: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM purchase_orders');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const poNumber = `PO-${year}-${seq}`;

      const poRes = await client.query(
        `INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, expected_date, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [poNumber, input.supplierId, input.warehouseId, input.expectedDate || null, userId],
      );
      const po = poRes.rows[0];

      for (const line of input.lines) {
        await client.query(
          `INSERT INTO purchase_order_lines (po_id, product_id, qty_ordered, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [po.id, line.productId, line.qtyOrdered, line.unitPrice],
        );
      }

      await client.query('COMMIT');
      return this.getPOById(po.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async transitionPO(id: number, action: string, userId: number, userRole: UserRole, expectedVersion?: number) {
    const po = await this.getPOById(id);

    if (expectedVersion !== undefined && po.version !== expectedVersion) {
      throw new VersionConflictException();
    }

    const check = canTransitionPO(po.status, action, userRole);
    if (!check.allowed || !check.nextStatus) {
      throw new InvalidStateTransitionException(check.reason || 'Chuyển trạng thái thất bại');
    }

    let extraSet = '';
    const params: any[] = [check.nextStatus, id];

    if (action === 'APPROVE') {
      extraSet = ', approved_by = $3, approved_at = now()';
      params.push(userId);
    }

    const res = await pool.query(
      `UPDATE purchase_orders
       SET status = $1, version = version + 1 ${extraSet}
       WHERE id = $2
       RETURNING *`,
      params,
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before, after)
       VALUES ($1, $2, 'PURCHASE_ORDER', $3, $4, $5)`,
      [
        userId,
        `PO_${action}`,
        id,
        JSON.stringify({ status: po.status, version: po.version }),
        JSON.stringify({ status: check.nextStatus, version: po.version + 1 }),
      ],
    );

    return this.getPOById(id);
  }

  async processGoodsReceipt(
    poId: number,
    input: GoodsReceiptCreateInput,
    userId: number,
  ) {
    const po = await this.getPOById(poId);

    if (po.status !== POStatuses.APPROVED && po.status !== POStatuses.PARTIALLY_RECEIVED) {
      throw new BadRequestException(
        `Chỉ có thể nhập hàng cho PO ở trạng thái APPROVED hoặc PARTIALLY_RECEIVED. Trạng thái hiện tại: ${po.status}`,
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query('SELECT COUNT(*) FROM goods_receipts');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const grNumber = `GR-${year}-${seq}`;

      const grRes = await client.query(
        `INSERT INTO goods_receipts (gr_number, po_id, received_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [grNumber, poId, userId],
      );
      const gr = grRes.rows[0];

      const movementLinesToPost: any[] = [];

      for (const line of input.lines) {
        const poLine = po.lines.find((l: any) => l.id === line.poLineId);
        if (!poLine) {
          throw new BadRequestException(`Dòng đơn hàng #${line.poLineId} không thuộc PO #${poId}`);
        }

        const totalQty = line.qtyReceived + line.qtyDamaged;
        if (totalQty <= 0) continue;

        // Check tolerance: max 10% over-delivery
        const remainingOrdered = poLine.qty_ordered * 1.1 - poLine.qty_received;
        if (totalQty > remainingOrdered) {
          throw new BadRequestException(
            `Sản phẩm ${poLine.product_name} nhập vượt quá dung sai cho phép (Còn lại: ${poLine.qty_ordered - poLine.qty_received}, Đang nhập: ${totalQty})`,
          );
        }

        // Record goods receipt line
        await client.query(
          `INSERT INTO goods_receipt_lines (gr_id, po_line_id, qty_received, qty_damaged)
           VALUES ($1, $2, $3, $4)`,
          [gr.id, line.poLineId, line.qtyReceived, line.qtyDamaged],
        );

        // Update PO line received qty
        await client.query(
          `UPDATE purchase_order_lines
           SET qty_received = qty_received + $1
           WHERE id = $2`,
          [totalQty, line.poLineId],
        );

        // Standard stock receipt
        if (line.qtyReceived > 0) {
          movementLinesToPost.push({
            productId: poLine.product_id,
            warehouseId: po.warehouse_id,
            movementType: 'PURCHASE_RECEIPT',
            qtyOnHandDelta: line.qtyReceived,
            qtyDamagedDelta: 0,
            unitCost: poLine.unit_price,
            note: `Nhập kho theo chứng từ ${grNumber}`,
            sourceDocType: 'GOODS_RECEIPT',
            sourceDocId: gr.id,
            sourceLineId: line.poLineId,
          });
        }

        // Damaged goods received (quarantined immediately)
        if (line.qtyDamaged > 0) {
          movementLinesToPost.push({
            productId: poLine.product_id,
            warehouseId: po.warehouse_id,
            movementType: 'DAMAGE',
            qtyOnHandDelta: 0,
            qtyDamagedDelta: line.qtyDamaged,
            unitCost: poLine.unit_price,
            note: `Hàng hư hỏng phát hiện khi kiểm nhận ${grNumber}`,
            sourceDocType: 'GOODS_RECEIPT',
            sourceDocId: gr.id,
            sourceLineId: line.poLineId,
          });
        }
      }

      // Atomically post movements via StockPostingService
      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'GOODS_RECEIPT', sourceDocId: gr.id },
        movementLinesToPost,
        userId,
      );

      // Check if all lines are fully received
      const updatedLinesRes = await client.query(
        `SELECT qty_ordered, qty_received FROM purchase_order_lines WHERE po_id = $1`,
        [poId],
      );
      const isAllFullyReceived = updatedLinesRes.rows.every(
        (l) => Number(l.qty_received) >= Number(l.qty_ordered),
      );

      const nextStatus = isAllFullyReceived ? POStatuses.RECEIVED : POStatuses.PARTIALLY_RECEIVED;
      await client.query(
        `UPDATE purchase_orders SET status = $1, version = version + 1 WHERE id = $2`,
        [nextStatus, poId],
      );

      await client.query('COMMIT');
      return this.getPOById(poId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
