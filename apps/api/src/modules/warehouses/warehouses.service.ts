import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '@iwms/db';
import { WarehouseCreateInput, ProductWarehouseSettingInput } from '@iwms/shared';

@Injectable()
export class WarehousesService {
  async getWarehouses() {
    const res = await pool.query(
      `SELECT w.*,
        COUNT(DISTINCT sl.product_id) as sku_count,
        COALESCE(SUM(sl.on_hand), 0)::float as total_units,
        COALESCE(SUM(sl.on_hand * sl.avg_cost), 0)::float as total_value
       FROM warehouses w
       LEFT JOIN stock_levels sl ON sl.warehouse_id = w.id
       GROUP BY w.id
       ORDER BY w.name ASC`,
    );
    return res.rows;
  }

  async getWarehouseById(id: number) {
    const res = await pool.query('SELECT * FROM warehouses WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      throw new NotFoundException(`Kho hàng #${id} không tồn tại`);
    }
    return res.rows[0];
  }

  async createWarehouse(input: WarehouseCreateInput) {
    const res = await pool.query(
      `INSERT INTO warehouses (code, name, address) VALUES ($1, $2, $3) RETURNING *`,
      [input.code, input.name, input.address || null],
    );
    return res.rows[0];
  }

  async updateWarehouse(id: number, input: Partial<WarehouseCreateInput>) {
    await this.getWarehouseById(id);
    const res = await pool.query(
      `UPDATE warehouses
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           address = COALESCE($3, address)
       WHERE id = $4
       RETURNING *`,
      [input.code ?? null, input.name ?? null, input.address ?? null, id],
    );
    return res.rows[0];
  }

  async setProductSetting(
    warehouseId: number,
    productId: number,
    input: ProductWarehouseSettingInput,
  ) {
    await this.getWarehouseById(warehouseId);
    const res = await pool.query(
      `INSERT INTO product_warehouse_settings (
        product_id, warehouse_id, reorder_point, reorder_qty, max_stock, preferred_supplier_id
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET
         reorder_point = EXCLUDED.reorder_point,
         reorder_qty = EXCLUDED.reorder_qty,
         max_stock = EXCLUDED.max_stock,
         preferred_supplier_id = EXCLUDED.preferred_supplier_id
       RETURNING *`,
      [
        productId,
        warehouseId,
        input.reorderPoint,
        input.reorderQty,
        input.maxStock || null,
        input.preferredSupplierId || null,
      ],
    );
    return res.rows[0];
  }
}
