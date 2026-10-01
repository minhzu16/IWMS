import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { pool } from '@iwms/db';
import { ProductCreateInput, ProductUpdateInput, CategoryCreateInput } from '@iwms/shared';

@Injectable()
export class CatalogService {
  // Categories
  async getCategories() {
    const res = await pool.query(
      `SELECT c.id, c.parent_id, c.name, p.name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY c.name ASC`,
    );
    return res.rows;
  }

  async createCategory(input: CategoryCreateInput) {
    const res = await pool.query(
      `INSERT INTO categories (name, parent_id) VALUES ($1, $2) RETURNING *`,
      [input.name, input.parentId || null],
    );
    return res.rows[0];
  }

  // Products
  async getProducts(params: { search?: string; categoryId?: number; isActive?: boolean }) {
    let query = `
      SELECT
        p.id,
        p.sku,
        p.barcode,
        p.name,
        p.category_id,
        c.name AS category_name,
        p.uom,
        p.standard_cost::float,
        p.is_active,
        p.version,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(sl.on_hand), 0)::float AS total_on_hand,
        COALESCE(SUM(sl.reserved), 0)::float AS total_reserved,
        COALESCE(SUM(sl.on_hand - sl.reserved), 0)::float AS total_available
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (params.search) {
      values.push(`%${params.search}%`);
      query += ` AND (p.name ILIKE $${values.length} OR p.sku ILIKE $${values.length} OR p.barcode ILIKE $${values.length})`;
    }

    if (params.categoryId) {
      values.push(params.categoryId);
      query += ` AND p.category_id = $${values.length}`;
    }

    if (params.isActive !== undefined) {
      values.push(params.isActive);
      query += ` AND p.is_active = $${values.length}`;
    }

    query += ` GROUP BY p.id, c.name ORDER BY p.name ASC`;

    const res = await pool.query(query, values);
    return res.rows;
  }

  async getProductById(id: number) {
    const res = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Sản phẩm #${id} không tồn tại`);
    }
    return res.rows[0];
  }

  async getProductByBarcode(code: string) {
    const res = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = $1 OR p.sku = $1`,
      [code],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có mã barcode hoặc SKU: ${code}`);
    }
    return res.rows[0];
  }

  async createProduct(input: ProductCreateInput) {
    try {
      const res = await pool.query(
        `INSERT INTO products (sku, barcode, name, category_id, uom, standard_cost)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.sku,
          input.barcode || null,
          input.name,
          input.categoryId || null,
          input.uom || 'pcs',
          input.standardCost || 0,
        ],
      );
      return res.rows[0];
    } catch (err: any) {
      if (err.code === '23505') {
        throw new BadRequestException('Mã SKU hoặc Barcode đã tồn tại trên hệ thống');
      }
      throw err;
    }
  }

  async updateProduct(id: number, input: ProductUpdateInput) {
    const existing = await this.getProductById(id);

    const res = await pool.query(
      `UPDATE products
       SET sku = COALESCE($1, sku),
           barcode = COALESCE($2, barcode),
           name = COALESCE($3, name),
           category_id = COALESCE($4, category_id),
           uom = COALESCE($5, uom),
           standard_cost = COALESCE($6, standard_cost),
           is_active = COALESCE($7, is_active),
           version = version + 1,
           updated_at = now()
       WHERE id = $8
       RETURNING *`,
      [
        input.sku ?? null,
        input.barcode ?? null,
        input.name ?? null,
        input.categoryId ?? null,
        input.uom ?? null,
        input.standardCost ?? null,
        input.isActive ?? null,
        id,
      ],
    );
    return res.rows[0];
  }

  async importProducts(items: ProductCreateInput[]) {
    const created: any[] = [];
    const errors: { row: number; sku: string; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const prod = await this.createProduct(item);
        created.push(prod);
      } catch (err: any) {
        errors.push({
          row: i + 1,
          sku: item.sku,
          error: err.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      successCount: created.length,
      errorCount: errors.length,
      errors,
    };
  }
}
