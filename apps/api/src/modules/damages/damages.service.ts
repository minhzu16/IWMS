import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { pool } from '@iwms/db';
import {
  DamageReportCreateInput,
  DamageStatuses,
  DamageStatus,
  DamageDispositions,
  DamageDisposition,
  MovementLineInput,
  MovementTypes,
  MovementType,
} from '@iwms/shared';
import { StockPostingService } from '../inventory/stock-posting.service.js';

export interface DamageReportSummaryRow {
  id: number;
  report_number: string;
  warehouse_id: number;
  warehouse_name: string;
  status: DamageStatus;
  notes: string | null;
  created_at: string;
  created_by_name: string;
  approved_at: string | null;
  approved_by_name: string | null;
  item_count: string | number;
  total_qty: number;
}

export interface DamageReportRow {
  id: number;
  report_number: string;
  warehouse_id: number;
  status: DamageStatus;
  notes: string | null;
  created_by: number;
  created_at: string;
  approved_by: number | null;
  approved_at: string | null;
  warehouse_name: string;
  created_by_name: string;
  approved_by_name: string | null;
}

export interface DamageLineRow {
  id: number;
  report_id: number;
  product_id: number;
  qty: number;
  reason: string;
  disposition: DamageDisposition;
  supplier_id: number | null;
  sku: string;
  product_name: string;
  uom: string;
  supplier_name: string | null;
}

export interface DamageReportDetail extends DamageReportRow {
  lines: DamageLineRow[];
}

@Injectable()
export class DamagesService {
  constructor(private stockPostingService: StockPostingService) {}

  async getReports(warehouseId?: number): Promise<DamageReportSummaryRow[]> {
    let query = `
      SELECT
        dr.id,
        dr.report_number,
        dr.warehouse_id,
        w.name AS warehouse_name,
        dr.status,
        dr.notes,
        dr.created_at,
        u_cre.full_name AS created_by_name,
        dr.approved_at,
        u_app.full_name AS approved_by_name,
        COUNT(dl.id) AS item_count,
        COALESCE(SUM(dl.qty), 0)::float AS total_qty
      FROM damage_reports dr
      JOIN warehouses w ON w.id = dr.warehouse_id
      JOIN users u_cre ON u_cre.id = dr.created_by
      LEFT JOIN users u_app ON u_app.id = dr.approved_by
      LEFT JOIN damage_lines dl ON dl.report_id = dr.id
      WHERE 1=1
    `;
    const values: unknown[] = [];
    if (warehouseId) {
      values.push(warehouseId);
      query += ` AND dr.warehouse_id = $${values.length}`;
    }
    query += ` GROUP BY dr.id, w.name, u_cre.full_name, u_app.full_name ORDER BY dr.id DESC`;

    const res = await pool.query<DamageReportSummaryRow>(query, values);
    return res.rows;
  }

  async getReportById(id: number): Promise<DamageReportDetail> {
    const rRes = await pool.query<DamageReportRow>(
      `SELECT dr.*, w.name AS warehouse_name, u_cre.full_name AS created_by_name, u_app.full_name AS approved_by_name
       FROM damage_reports dr
       JOIN warehouses w ON w.id = dr.warehouse_id
       JOIN users u_cre ON u_cre.id = dr.created_by
       LEFT JOIN users u_app ON u_app.id = dr.approved_by
       WHERE dr.id = $1`,
      [id],
    );
    if (rRes.rows.length === 0) {
      throw new NotFoundException(`Báo cáo hàng hư hỏng #${id} không tồn tại`);
    }

    const linesRes = await pool.query<DamageLineRow>(
      `SELECT dl.*, p.sku, p.name AS product_name, p.uom, s.name AS supplier_name, dl.qty::float
       FROM damage_lines dl
       JOIN products p ON p.id = dl.product_id
       LEFT JOIN suppliers s ON s.id = dl.supplier_id
       WHERE dl.report_id = $1`,
      [id],
    );

    return {
      ...rRes.rows[0],
      lines: linesRes.rows,
    };
  }

  async createReport(input: DamageReportCreateInput, userId: number): Promise<DamageReportDetail> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const year = new Date().getFullYear();
      const countRes = await client.query<{ count: string }>('SELECT COUNT(*) FROM damage_reports');
      const seq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(6, '0');
      const reportNumber = `DR-${year}-${seq}`;

      const drRes = await client.query<{ id: number }>(
        `INSERT INTO damage_reports (report_number, warehouse_id, notes, created_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [reportNumber, input.warehouseId, input.notes || null, userId],
      );
      const dr = drRes.rows[0];

      // For reporting newly discovered damaged stock, we move stock from on_hand to damaged
      const movementsToPost: MovementLineInput[] = [];

      for (const line of input.lines) {
        await client.query(
          `INSERT INTO damage_lines (report_id, product_id, qty, reason, disposition, supplier_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            dr.id,
            line.productId,
            line.qty,
            line.reason,
            line.disposition,
            line.supplierId || null,
          ],
        );

        // Move from on_hand to damaged
        movementsToPost.push({
          productId: line.productId,
          warehouseId: input.warehouseId,
          movementType: MovementTypes.DAMAGE,
          qtyOnHandDelta: -line.qty,
          qtyDamagedDelta: line.qty,
          note: `Chuyển kho cách ly hư hỏng: ${line.reason} (${reportNumber})`,
          sourceDocType: 'DAMAGE_REPORT',
          sourceDocId: dr.id,
        });
      }

      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'DAMAGE_REPORT', sourceDocId: dr.id },
        movementsToPost,
        userId,
      );

      await client.query('COMMIT');
      return this.getReportById(dr.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async approveReport(id: number, userId: number): Promise<DamageReportDetail> {
    const report = await this.getReportById(id);
    if (report.status !== DamageStatuses.REPORTED) {
      throw new BadRequestException(`Chỉ có thể duyệt báo cáo hư hỏng ở trạng thái REPORTED`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const movementsToPost: MovementLineInput[] = [];

      for (const line of report.lines) {
        const movementType: MovementType =
          line.disposition === DamageDispositions.WRITE_OFF
            ? MovementTypes.DAMAGE_WRITE_OFF
            : MovementTypes.RETURN_TO_SUPPLIER;

        // Clear from damaged balance
        movementsToPost.push({
          productId: line.product_id,
          warehouseId: report.warehouse_id,
          movementType,
          qtyOnHandDelta: 0,
          qtyDamagedDelta: -line.qty,
          note: `Xử lý giải quyết hàng hư hỏng (${line.disposition}): ${line.reason}`,
          sourceDocType: 'DAMAGE_DISPOSITION',
          sourceDocId: report.id,
          sourceLineId: line.id,
        });
      }

      await this.stockPostingService.postMovements(
        client,
        { sourceDocType: 'DAMAGE_DISPOSITION', sourceDocId: report.id },
        movementsToPost,
        userId,
      );

      await client.query(
        `UPDATE damage_reports
         SET status = 'APPROVED', approved_by = $1, approved_at = now()
         WHERE id = $2`,
        [userId, id],
      );

      await client.query('COMMIT');
      return this.getReportById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
