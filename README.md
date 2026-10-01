# Inventory & Warehouse Management System (IWMS)

> Hệ thống quản trị kho & tồn kho theo mô hình **Sổ Cái Bất Biến (Ledger-First)**, bảo vệ toàn vẹn dữ liệu với **kiểm soát đồng thời (Concurrency Control)**, máy trạng thái chứng từ (State Machine) và cơ chế đối soát tự động (Zero Discrepancy Invariant Check).

---

## 1. Kiến Trúc & Triết Lý Thiết Kế

1. **Ledger-First là nguồn sự thật (Source of Truth):**
   - Mọi biến động xuất / nhập / chuyển / hư hỏng đều được ghi vào bảng `stock_movements` (Append-Only).
   - Trigger cấp database cấm hoàn toàn thao tác `UPDATE` và `DELETE` trên bảng `stock_movements`.
   - Bảng `stock_levels` chỉ đóng vai trò bộ nhớ đệm (live cache) được cập nhật nguyên tử trong cùng transaction.
   - Bất biến luôn được đảm bảo: `stock_levels.on_hand == SUM(stock_movements.qty_on_hand_delta)`.

2. **Chống Lost Update, Bán Vượt Tồn & Deadlock:**
   - **Chống Lost Update & Overselling:** Khóa bi quan có điều kiện hoặc `SELECT ... FOR UPDATE` kết hợp `CHECK (on_hand >= 0)`, `CHECK (reserved >= 0)`, `CHECK (reserved <= on_hand)`.
   - **Chống Deadlock:** Mọi thao tác đa sản phẩm/kho đều được sắp xếp tuần tự theo `ORDER BY product_id ASC, warehouse_id ASC` trước khi yêu cầu khóa.
   - **Tách 3 con số:** `on_hand` (thực có), `reserved` (đã giữ chỗ cho đơn bán), `available = on_hand - reserved`. Bán hàng kiểm tra `available`.

3. **Chống Ghi Đôi (Idempotency):**
   - Header `Idempotency-Key` được middleware bắt giữ và cache response vào bảng `idempotency_keys`. Mọi yêu cầu retry cùng key sẽ trả về kết quả cũ mà không ghi ledger lần 2.

4. **Giá Vốn Bình Quân Di Động (Moving Average Cost):**
   - Khi nhập hàng: `new_avg = (on_hand * avg_cost + incoming_qty * unit_cost) / (on_hand + incoming_qty)`.

---

## 2. Cấu Trúc Monorepo

```
pj2/
├── apps/
│   ├── api/                 # NestJS 11 Backend REST API & Concurrency Logic
│   │   ├── src/modules/     # auth, catalog, suppliers, warehouses, inventory,
│   │   │                    # purchasing, sales, transfers, damages, counts, reports, audit, ops
│   │   └── test/            # Concurrency & Invariant Vitest tests
│   └── web/                 # React 19 + Vite 6 Single Page App (Custom Glassmorphism CSS)
│       ├── src/components/  # Navbar, ReconcileModal, BarcodeModal
│       └── src/views/       # Dashboard, Inventory, Catalog, Purchasing, Sales, Quality, Audit
├── packages/
│   ├── db/                  # PostgreSQL Schema (Drizzle ORM), DDL Migrations, Seed script
│   └── shared/              # Zod schemas, Enums, Roles, State Machines, Invariant Rules
├── infra/
│   └── docker/              # Multi-stage production Dockerfiles
├── docker-compose.yml       # PostgreSQL 16, Redis 7, API & Web SPA
└── package.json             # Root workspace orchestration
```

---

## 3. Khởi Chạy Dự Án

### Yêu Cầu Môi Trường
- Node.js >= 22
- pnpm >= 11
- PostgreSQL >= 16 (hoặc chạy qua Docker)

### 3.1. Cài Đặt & Biên Dịch
```bash
# Cài đặt toàn bộ dependencies trong monorepo
rtk pnpm install

# Biên dịch toàn bộ workspaces
rtk pnpm build
```

### 3.2. Cấu Hình Cơ Sở Dữ Liệu
Sao chép `.env.example` thành `.env` và cập nhật thông tin kết nối PostgreSQL:
```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/iwms
JWT_SECRET=super-secret-jwt-key-iwms-2026-production-grade
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

Chạy migration và nạp dữ liệu mẫu ban đầu (Seed Data):
```bash
# Chạy migration DDL (bảng, chỉ mục, check constraint, immutability trigger)
rtk pnpm db:migrate

# Nạp 6 tài khoản mẫu, 3 kho, 12 sản phẩm công nghệ, 5 nhà cung cấp
rtk pnpm db:seed
```

### 3.3. Khởi Chạy Cục Bộ (Development)
```bash
# Khởi chạy song song cả Backend API và Frontend Web UI
rtk pnpm dev

# Hoặc khởi chạy riêng từng phần:
rtk pnpm dev:api   # API chạy tại http://localhost:4000/api/v1 (Swagger: /docs)
rtk pnpm dev:web   # Web UI chạy tại http://localhost:5173
```

### 3.4. Khởi Chạy Qua Docker Compose
```bash
rtk docker compose up -d --build
```

---

## 4. Kiểm Thử Đồng Thời & Bất Biến (Concurrency Tests)

Kiểm tra 50 request cạnh tranh cùng lúc, máy trạng thái và công thức giá vốn:
```bash
rtk pnpm --filter api test
```

---

## 5. Tài Khoản Demo Mẫu

| Email | Mật khẩu | Vai trò | Quyền hạn |
|---|---|---|---|
| `admin@iwms.local` | `Password123!` | `ADMIN` | Toàn quyền cấu hình, đối soát và quản trị |
| `manager@iwms.local` | `Password123!` | `MANAGER` | Duyệt đơn PO, duyệt xử lý hàng hỏng, duyệt kiểm kê |
| `purchasing@iwms.local` | `Password123!` | `PURCHASING` | Lập PO, quản lý NCC, cấu hình giá mua |
| `warehouse@iwms.local` | `Password123!` | `WAREHOUSE` | Kiểm nhận hàng (Goods Receipt), xuất bán, chuyển kho |
| `sales@iwms.local` | `Password123!` | `SALES` | Tạo đơn SO, xác nhận giữ chỗ hàng |
| `viewer@iwms.local` | `Password123!` | `VIEWER` | Chỉ xem báo cáo và tồn kho |
