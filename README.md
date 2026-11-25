# Inventory & Warehouse Management System (IWMS)

> Hệ thống quản trị kho & tồn kho theo mô hình **Sổ Cái Bất Biến (Ledger-First)**, bảo vệ toàn vẹn dữ liệu với **kiểm soát đồng thời (Concurrency Control)**, máy trạng thái chứng từ (State Machine) và cơ chế đối soát số dư (Invariant Check).

---

## 1. Kiến Trúc & Triết Lý Thiết Kế

1. **Ledger-First là nguồn sự thật (Source of Truth):**
   - Mọi biến động xuất / nhập / chuyển / hư hỏng đều được ghi vào bảng `stock_movements` (Append-Only).
   - Trigger cấp database ngăn chặn thao tác `UPDATE` và `DELETE` trên bảng `stock_movements`.
   - Bảng `stock_levels` đóng vai trò bộ nhớ đệm (live cache) được cập nhật nguyên tử trong cùng transaction.
   - Bất biến được kiểm chứng bằng kiểm thử tích hợp: `stock_levels.on_hand == SUM(stock_movements.qty_on_hand_delta)`.

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
│   │   ├── src/modules/     # auth, admin, catalog, suppliers, warehouses, inventory,
│   │   │                    # purchasing, sales, transfers, damages, counts, reports, audit, ops
│   │   └── test/            # Concurrency, Rate limit & Invariant Vitest tests
│   └── web/                 # React 19 + Vite 6 Single Page App (Custom Glassmorphism CSS)
│       ├── e2e/             # Playwright E2E tests (admin.spec.ts)
│       ├── src/components/  # Navbar, ReconcileModal, BarcodeModal
│       └── src/views/       # Dashboard, Inventory, Catalog, Purchasing, Sales, Quality, Audit, Admin
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
pnpm install

# Biên dịch toàn bộ workspaces
pnpm build
```

### 3.2. Cấu Hình Cơ Sở Dữ Liệu
Sao chép `.env.example` thành `.env`, cập nhật thông tin kết nối PostgreSQL và tạo hai secret riêng biệt (≥ 32 ký tự). API **không khởi động** nếu thiếu:
```env
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/iwms
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))">
JWT_REFRESH_SECRET=<chạy lại lệnh trên để có giá trị khác>
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

Chạy migration và nạp dữ liệu mẫu ban đầu (Seed Data):
```bash
# Chạy migration DDL (bảng, chỉ mục, check constraint, immutability trigger)
pnpm db:migrate

# Nạp 6 tài khoản mẫu, 3 kho, 12 sản phẩm công nghệ, 5 nhà cung cấp
pnpm db:seed
```

### 3.3. Khởi Chạy Cục Bộ (Development)
```bash
# Khởi chạy song song cả Backend API và Frontend Web UI
pnpm dev

# Hoặc khởi chạy riêng từng phần:
pnpm dev:api   # API chạy tại http://localhost:4000/api/v1 (Swagger: /docs)
pnpm dev:web   # Web UI chạy tại http://localhost:5173
```

### 3.4. Khởi Chạy Qua Docker Compose
```bash
docker compose up -d --build
```

---

## 4. Khu Quản Trị

Khu vực quản trị hệ thống được tích hợp tại tab **Quản trị** trên giao diện Web (`#nav-tab-admin`), yêu cầu tài khoản có quyền `ADMIN`.

- **Tài khoản seed mẫu (chỉ dùng cho mục đích demo / kiểm thử nội bộ):** `admin@iwms.local` / `Password123!`
- **Các chức năng của Quản trị viên:**
  - **Thống kê hệ thống (Stats):** Theo dõi tổng số người dùng, số người dùng đang hoạt động, cơ cấu theo vai trò, số lượng sản phẩm, kho hàng, giá trị tồn kho và số biến động trong 24 giờ.
  - **Danh sách & tìm kiếm người dùng (List / Search):** Tra cứu theo email hoặc họ tên, lọc theo vai trò (`ADMIN`, `MANAGER`, `PURCHASING`, `WAREHOUSE`, `SALES`, `VIEWER`) và phân trang.
  - **Tạo người dùng mới (Create):** Khởi tạo tài khoản với email, họ tên, vai trò và mật khẩu (tối thiểu 10 ký tự).
  - **Phân quyền vai trò (Change Role):** Điều chỉnh vai trò người dùng trực tiếp trên bảng quản trị (ngăn chặn tự đổi vai trò của chính mình; có khóa đồng bộ bảo vệ luôn giữ ít nhất một tài khoản `ADMIN` hoạt động).
  - **Khóa / Mở khóa tài khoản (Lock / Unlock):** Chuyển đổi trạng thái hoạt động của người dùng (ngăn chặn tự khóa tài khoản của chính mình).

---

## 5. Kiểm Thử

Hệ thống được kiểm thử tự động ở nhiều tầng: đơn vị (unit/mock), tích hợp với cơ sở dữ liệu thực (real PostgreSQL) và luồng người dùng đầu-cuối (E2E Playwright).

### 5.1. Lệnh Thực Thi Kiểm Thử

- **Unit & Concurrency logic (Vitest):**
  ```bash
  pnpm --filter api test
  ```
- **Kiểm thử tích hợp với PostgreSQL thật (Real PostgreSQL):**
  ```bash
  DATABASE_URL_TEST=postgresql://... pnpm --filter api test:int
  ```
- **Kiểm thử giao diện E2E (Playwright):**
  Nạp migration và dữ liệu mẫu trước:
  ```bash
  pnpm db:migrate && pnpm db:seed
  ```
  Khởi động API và Web:
  ```bash
  pnpm dev
  ```
  Chạy bộ test E2E:
  ```bash
  pnpm --filter web test:e2e
  ```

### 5.2. Đối Chiếu Tuyên Bố & Bằng Chứng Kiểm Thử

Bảng ánh xạ các tuyên bố kỹ thuật cốt lõi với file kiểm thử và tiêu đề test cụ thể đã được xác minh trong mã nguồn:

| Tuyên bố | Bằng chứng (test) |
|---|---|
| Sổ cái bất biến (append-only ledger) | `apps/api/test/integration/ledger.int.test.ts` > `ledger is append-only` |
| Tồn kho thực có bằng tổng sổ cái (on_hand = SUM(ledger)) | `apps/api/test/integration/ledger.int.test.ts` > `on_hand equals SUM(ledger)` |
| Không bán vượt tồn dưới 50 yêu cầu đồng thời (no overselling under 50 concurrent requests) | `apps/api/test/integration/ledger.int.test.ts` > `no overselling under 50 concurrent issues` |
| Rollback khi không đủ tồn kho (rollback on insufficient stock) | `apps/api/test/integration/ledger.int.test.ts` > `insufficient stock rolls back` |
| Giới hạn tần suất đăng nhập (login rate limit) | `apps/api/test/auth-rate-limit.test.ts` > `login is limited to AUTH_THROTTLE.default.limit requests per minute per client` |
| Quản trị viên không thể tự khóa chính mình (admin cannot lock themselves) | `apps/web/e2e/admin.spec.ts` > `4. admin own row controls are disabled by isSelf logic` |
| Luôn giữ lại ít nhất một tài khoản ADMIN hoạt động (last active ADMIN kept) | `apps/api/test/integration/admin-roster.int.test.ts` > `guarantees at least one active ADMIN remains under concurrent demote/deactivate across 20 rounds` |
| Refresh token không dùng được như access token | `apps/api/test/auth-tokens.test.ts` > `rejects the refresh token issued at login` |
| Tài khoản bị khóa mất quyền truy cập ngay, không chờ token hết hạn | `apps/api/test/admin-api.test.ts` > `tokenFor("ADMIN") with user deactivated in DB -> 401 immediately` |
| Giao diện mobile không bị cuộn ngang (mobile layout has no horizontal scroll) | `apps/web/e2e/admin.spec.ts` > `7. mobile viewport 375x800 has no horizontal overflow after admin login` |
| Chuyển trạng thái đơn mua hàng tuân thủ quy tắc nghiêm ngặt | `apps/api/test/concurrency.test.ts` > `PO state transitions follow strict rules` |
| Chuyển trạng thái đơn bán hàng bảo đảm vòng đời giữ chỗ và xuất kho | `apps/api/test/concurrency.test.ts` > `SO state transitions enforce reservation and shipment lifecycle` |
| Chuyển trạng thái phiếu chuyển kho bảo đảm 2 bước xuất và nhận | `apps/api/test/concurrency.test.ts` > `Transfer transitions enforce 2-step dispatch and receive` |
| Công thức giá vốn bình quân di động khớp công thức bình quân gia quyền | `apps/api/test/concurrency.test.ts` > `Moving average cost calculation matches standard weighted average formula` |

---

## 6. Tài Khoản Demo Mẫu

| Email | Mật khẩu | Vai trò | Quyền hạn |
|---|---|---|---|
| `admin@iwms.local` | `Password123!` | `ADMIN` | Toàn quyền cấu hình, đối soát và quản trị |
| `manager@iwms.local` | `Password123!` | `MANAGER` | Duyệt đơn PO, duyệt xử lý hàng hỏng, duyệt kiểm kê |
| `purchasing@iwms.local` | `Password123!` | `PURCHASING` | Lập PO, quản lý NCC, cấu hình giá mua |
| `warehouse@iwms.local` | `Password123!` | `WAREHOUSE` | Kiểm nhận hàng (Goods Receipt), xuất bán, chuyển kho |
| `sales@iwms.local` | `Password123!` | `SALES` | Tạo đơn SO, xác nhận giữ chỗ hàng |
| `viewer@iwms.local` | `Password123!` | `VIEWER` | Chỉ xem báo cáo và tồn kho |
