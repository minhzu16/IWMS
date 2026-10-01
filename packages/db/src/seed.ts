import { pool } from './db.js';
import bcrypt from 'bcrypt';

export async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Starting database seeding...');
    await client.query('BEGIN');

    // 1. Check if already seeded
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) > 0) {
      console.log('[Seed] Database already contains users. Skipping seed.');
      await client.query('COMMIT');
      return;
    }

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 2. Users (6 distinct roles)
    const usersData = [
      { email: 'admin@iwms.local', name: 'Nguyễn Quản Trị (Admin)', role: 'ADMIN' },
      { email: 'manager@iwms.local', name: 'Trần Trưởng Phòng (Manager)', role: 'MANAGER' },
      { email: 'purchasing@iwms.local', name: 'Lê Thu Mua (Purchasing)', role: 'PURCHASING' },
      { email: 'warehouse@iwms.local', name: 'Phạm Thủ Kho (Warehouse)', role: 'WAREHOUSE' },
      { email: 'sales@iwms.local', name: 'Hoàng Kinh Doanh (Sales)', role: 'SALES' },
      { email: 'viewer@iwms.local', name: 'Vũ Giám Sát (Viewer)', role: 'VIEWER' },
    ];

    const userIds: Record<string, number> = {};
    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
        [u.email, passwordHash, u.name, u.role],
      );
      userIds[u.role] = res.rows[0].id;
    }

    // 3. Warehouses
    const whData = [
      { code: 'WH-NORTH', name: 'Kho Tổng Miền Bắc (Hà Nội)', address: 'KCN Thăng Long, Đông Anh, Hà Nội' },
      { code: 'WH-SOUTH', name: 'Kho Phân Phối Miền Nam (TP.HCM)', address: 'Khu CNC TP.HCM, Quận 9, TP.HCM' },
      { code: 'WH-TRANSIT', name: 'Kho Trung Chuyển Miền Trung', address: 'KCN Hòa Khánh, Liên Chiểu, Đà Nẵng' },
    ];
    const whIds: Record<string, number> = {};
    for (const w of whData) {
      const res = await client.query(
        `INSERT INTO warehouses (code, name, address) VALUES ($1, $2, $3) RETURNING id`,
        [w.code, w.name, w.address],
      );
      whIds[w.code] = res.rows[0].id;
    }

    // Assign warehouse permissions to warehouse staff
    for (const wid of Object.values(whIds)) {
      await client.query(
        `INSERT INTO user_warehouses (user_id, warehouse_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userIds['WAREHOUSE'], wid],
      );
    }

    // 4. Categories
    const categoriesData = [
      'Điện tử & Bán dẫn',
      'Linh kiện Máy tính',
      'Thiết bị Mạng & IoT',
      'Vật tư Phụ trợ & Đóng gói',
    ];
    const catIds: number[] = [];
    for (const c of categoriesData) {
      const res = await client.query(`INSERT INTO categories (name) VALUES ($1) RETURNING id`, [c]);
      catIds.push(res.rows[0].id);
    }

    // 5. Suppliers
    const suppliersData = [
      { code: 'SUP-SAM', name: 'Samsung Electronics VN', leadTime: 5, email: 'b2b@samsung.vn' },
      { code: 'SUP-FOX', name: 'Foxconn Precision Vietnam', leadTime: 7, email: 'supply@foxconn.com.vn' },
      { code: 'SUP-ASUS', name: 'ASUS Technology VN', leadTime: 4, email: 'partner@asus.com.vn' },
      { code: 'SUP-LOGI', name: 'Logitech Asia Distribution', leadTime: 10, email: 'sales@logitech-dist.com' },
      { code: 'SUP-DELL', name: 'Dell Enterprise Solutions VN', leadTime: 6, email: 'b2b@dell.com.vn' },
    ];
    const supIds: Record<string, number> = {};
    for (const s of suppliersData) {
      const res = await client.query(
        `INSERT INTO suppliers (code, name, default_lead_time_days, email) VALUES ($1, $2, $3, $4) RETURNING id`,
        [s.code, s.name, s.leadTime, s.email],
      );
      supIds[s.code] = res.rows[0].id;
    }

    // 6. Products
    const productsData = [
      { sku: 'CPU-INT-14700K', barcode: '893850123001', name: 'Intel Core i7-14700K 20-Core', catId: catIds[1], cost: 380, uom: 'box' },
      { sku: 'CPU-AMD-7800X3D', barcode: '893850123002', name: 'AMD Ryzen 7 7800X3D V-Cache', catId: catIds[1], cost: 360, uom: 'box' },
      { sku: 'RAM-COR-DDR5-32G', barcode: '893850123003', name: 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz', catId: catIds[1], cost: 110, uom: 'kit' },
      { sku: 'SSD-SAM-990P-2TB', barcode: '893850123004', name: 'Samsung 990 PRO PCIe 4.0 NVMe SSD 2TB', catId: catIds[0], cost: 175, uom: 'pcs' },
      { sku: 'GPU-RTX-4080S', barcode: '893850123005', name: 'ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB', catId: catIds[1], cost: 990, uom: 'box' },
      { sku: 'MB-ASUS-Z790F', barcode: '893850123006', name: 'ASUS ROG Strix Z790-F Gaming WiFi II', catId: catIds[1], cost: 320, uom: 'box' },
      { sku: 'PSU-SEA-1000W', barcode: '893850123007', name: 'Seasonic Focus GX-1000 ATX 3.0 Gold', catId: catIds[1], cost: 165, uom: 'pcs' },
      { sku: 'MOU-LOG-GPX2', barcode: '893850123008', name: 'Logitech G PRO X Superlight 2 Wireless', catId: catIds[1], cost: 125, uom: 'pcs' },
      { sku: 'ROU-CIS-AX3000', barcode: '893850123009', name: 'Cisco Catalyst Dual-Band WiFi 6 AX3000', catId: catIds[2], cost: 240, uom: 'pcs' },
      { sku: 'SW-CIS-24P-POE', barcode: '893850123010', name: 'Cisco CBS250 24-Port Gigabit PoE+ Managed Switch', catId: catIds[2], cost: 450, uom: 'unit' },
      { sku: 'CAB-CAT6-305M', barcode: '893850123011', name: 'Cuộn cáp mạng CommScope AMP Cat6 UTP 305m', catId: catIds[3], cost: 85, uom: 'roll' },
      { sku: 'BOX-CARTON-M', barcode: '893850123012', name: 'Thùng carton tiêu chuẩn xuất khẩu 40x30x30cm', catId: catIds[3], cost: 0.8, uom: 'pcs' },
    ];

    const prodIds: number[] = [];
    for (const p of productsData) {
      const res = await client.query(
        `INSERT INTO products (sku, barcode, name, category_id, standard_cost, uom) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [p.sku, p.barcode, p.name, p.catId, p.cost, p.uom],
      );
      prodIds.push(res.rows[0].id);
    }

    // 7. Product Warehouse Settings & Opening Stock
    const northWh = whIds['WH-NORTH'];
    const southWh = whIds['WH-SOUTH'];
    const adminUser = userIds['ADMIN'];

    for (let i = 0; i < prodIds.length; i++) {
      const pid = prodIds[i];
      const prod = productsData[i];

      // Settings
      await client.query(
        `INSERT INTO product_warehouse_settings (product_id, warehouse_id, reorder_point, reorder_qty, max_stock)
         VALUES ($1, $2, $3, $4, $5)`,
        [pid, northWh, 15, 30, 150],
      );
      await client.query(
        `INSERT INTO product_warehouse_settings (product_id, warehouse_id, reorder_point, reorder_qty, max_stock)
         VALUES ($1, $2, $3, $4, $5)`,
        [pid, southWh, 10, 20, 100],
      );

      // Initial opening inventory
      const initialQtyNorth = 50 + (i % 5) * 10;
      const initialQtySouth = 30 + (i % 3) * 8;

      // North WH stock level & movement
      await client.query(
        `INSERT INTO stock_levels (product_id, warehouse_id, on_hand, avg_cost)
         VALUES ($1, $2, $3, $4)`,
        [pid, northWh, initialQtyNorth, prod.cost],
      );
      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, movement_type, qty_on_hand_delta, unit_cost, balance_after, source_doc_type, source_doc_id, note, created_by)
         VALUES ($1, $2, 'OPENING', $3, $4, $3, 'OPENING_BALANCE', 1, 'Tồn đầu kỳ khởi tạo hệ thống', $5)`,
        [pid, northWh, initialQtyNorth, prod.cost, adminUser],
      );

      // South WH stock level & movement
      await client.query(
        `INSERT INTO stock_levels (product_id, warehouse_id, on_hand, avg_cost)
         VALUES ($1, $2, $3, $4)`,
        [pid, southWh, initialQtySouth, prod.cost],
      );
      await client.query(
        `INSERT INTO stock_movements (product_id, warehouse_id, movement_type, qty_on_hand_delta, unit_cost, balance_after, source_doc_type, source_doc_id, note, created_by)
         VALUES ($1, $2, 'OPENING', $3, $4, $3, 'OPENING_BALANCE', 1, 'Tồn đầu kỳ khởi tạo hệ thống', $5)`,
        [pid, southWh, initialQtySouth, prod.cost, adminUser],
      );
    }

    // 8. Sample Purchase Order in progress
    const poRes = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, status, expected_date, created_by)
       VALUES ('PO-2026-000001', $1, $2, 'APPROVED', CURRENT_DATE + INTERVAL '5 days', $3) RETURNING id`,
      [supIds['SUP-SAM'], northWh, userIds['PURCHASING']],
    );
    const samplePoId = poRes.rows[0].id;
    await client.query(
      `INSERT INTO purchase_order_lines (po_id, product_id, qty_ordered, unit_price)
       VALUES ($1, $2, 40, 168.00)`,
      [samplePoId, prodIds[3]], // Samsung 990 Pro SSD
    );

    // 9. Sample Sales Order
    const soRes = await client.query(
      `INSERT INTO sales_orders (so_number, customer_name, warehouse_id, status, created_by)
       VALUES ('SO-2026-000001', 'Công ty CP Công Nghệ NextGen', $1, 'CONFIRMED', $2) RETURNING id`,
      [northWh, userIds['SALES']],
    );
    const sampleSoId = soRes.rows[0].id;
    await client.query(
      `INSERT INTO sales_order_lines (so_id, product_id, qty_ordered, unit_price)
       VALUES ($1, $2, 5, 410.00)`,
      [sampleSoId, prodIds[0]], // Intel CPU
    );
    // Mark reserved for that SO
    await client.query(
      `UPDATE stock_levels SET reserved = reserved + 5 WHERE product_id = $1 AND warehouse_id = $2`,
      [prodIds[0], northWh],
    );

    await client.query('COMMIT');
    console.log('[Seed] Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed] Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
