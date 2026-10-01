import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '@iwms/db';
import { SupplierCreateInput } from '@iwms/shared';

@Injectable()
export class SuppliersService {
  async getSuppliers() {
    const res = await pool.query(
      `SELECT s.*,
        COUNT(DISTINCT po.id) as total_pos,
        COALESCE(SUM(pol.qty_received * pol.unit_price), 0)::float as total_spend
       FROM suppliers s
       LEFT JOIN purchase_orders po ON po.supplier_id = s.id
       LEFT JOIN purchase_order_lines pol ON pol.po_id = po.id
       GROUP BY s.id
       ORDER BY s.name ASC`,
    );
    return res.rows;
  }

  async getSupplierById(id: number) {
    const res = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw new NotFoundException(`Nhà cung cấp #${id} không tồn tại`);
    }
    return res.rows[0];
  }

  async createSupplier(input: SupplierCreateInput) {
    const res = await pool.query(
      `INSERT INTO suppliers (code, name, email, phone, address, default_lead_time_days)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.code,
        input.name,
        input.email || null,
        input.phone || null,
        input.address || null,
        input.defaultLeadTimeDays || 7,
      ],
    );
    return res.rows[0];
  }

  async updateSupplier(id: number, input: Partial<SupplierCreateInput>) {
    await this.getSupplierById(id);
    const res = await pool.query(
      `UPDATE suppliers
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           default_lead_time_days = COALESCE($6, default_lead_time_days)
       WHERE id = $7
       RETURNING *`,
      [
        input.code ?? null,
        input.name ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.defaultLeadTimeDays ?? null,
        id,
      ],
    );
    return res.rows[0];
  }

  /**
   * Calculates comprehensive supplier performance KPIs:
   * - Total Spend
   * - On-Time Delivery Rate (%)
   * - Fill Rate (Received / Ordered %)
   * - Average Lead Time (days)
   * - Damage Rate (%)
   */
  async getSupplierPerformance(supplierId: number) {
    await this.getSupplierById(supplierId);

    // 1. PO lines totals & Spend
    const linesRes = await pool.query(
      `SELECT
        COALESCE(SUM(pol.qty_ordered), 0)::float as total_ordered,
        COALESCE(SUM(pol.qty_received), 0)::float as total_received,
        COALESCE(SUM(pol.qty_received * pol.unit_price), 0)::float as total_spend
       FROM purchase_orders po
       JOIN purchase_order_lines pol ON pol.po_id = po.id
       WHERE po.supplier_id = $1 AND po.status IN ('RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED')`,
      [supplierId],
    );
    const lineStats = linesRes.rows[0];

    // 2. On-Time Delivery calculation
    const onTimeRes = await pool.query(
      `SELECT
        COUNT(gr.id) as total_receipts,
        COUNT(CASE WHEN gr.received_at::date <= po.expected_date THEN 1 END) as on_time_receipts,
        AVG(EXTRACT(DAY FROM (gr.received_at - po.created_at)))::float as avg_lead_time_days
       FROM goods_receipts gr
       JOIN purchase_orders po ON po.id = gr.po_id
       WHERE po.supplier_id = $1`,
      [supplierId],
    );
    const receiptStats = onTimeRes.rows[0];

    // 3. Damaged goods from this supplier
    const damageRes = await pool.query(
      `SELECT COALESCE(SUM(grl.qty_damaged), 0)::float as total_damaged
       FROM goods_receipt_lines grl
       JOIN goods_receipts gr ON gr.id = grl.gr_id
       JOIN purchase_orders po ON po.id = gr.po_id
       WHERE po.supplier_id = $1`,
      [supplierId],
    );
    const totalDamaged = Number(damageRes.rows[0].total_damaged || 0);

    const totalOrdered = Number(lineStats.total_ordered || 0);
    const totalReceived = Number(lineStats.total_received || 0);
    const totalReceipts = Number(receiptStats.total_receipts || 0);
    const onTimeReceipts = Number(receiptStats.on_time_receipts || 0);

    const fillRate = totalOrdered > 0 ? Number(((totalReceived / totalOrdered) * 100).toFixed(1)) : 100;
    const onTimeRate = totalReceipts > 0 ? Number(((onTimeReceipts / totalReceipts) * 100).toFixed(1)) : 100;
    const damageRate = totalReceived > 0 ? Number(((totalDamaged / totalReceived) * 100).toFixed(2)) : 0;
    const avgLeadTimeDays = Number((receiptStats.avg_lead_time_days || 7).toFixed(1));

    return {
      supplierId,
      totalSpend: Number(lineStats.total_spend || 0),
      totalOrdered,
      totalReceived,
      totalDamaged,
      fillRate, // %
      onTimeRate, // %
      damageRate, // %
      avgLeadTimeDays,
      rating: fillRate >= 95 && onTimeRate >= 90 && damageRate <= 2 ? 'EXCELLENT' : fillRate >= 80 ? 'GOOD' : 'NEEDS_ATTENTION',
    };
  }
}
