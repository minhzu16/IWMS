# IWMS - Tài Liệu Yêu Cầu Chức Năng & Phi Chức Năng (SRS)

## 1. Yêu Cầu Chức Năng (Functional Requirements)

### Nhóm A: Master Data
* **F01 (Sản phẩm):**
  * *Given* người dùng có vai trò `ADMIN` hoặc `MANAGER`.
  * *When* tạo sản phẩm với mã SKU duy nhất và mã Barcode Code128.
  * *Then* hệ thống lưu thông tin sản phẩm và gán `version = 0`, trạng thái `is_active = true`.
* **F02 (Danh mục cây):**
  * *Given* danh mục cha tồn tại hoặc để trống (gốc).
  * *When* tạo danh mục con liên kết `parent_id`.
  * *Then* hình thành cấu trúc cây phân cấp danh mục hàng hóa.
* **F03 (Nhà cung cấp):**
  * *Given* thông tin đối tác gồm mã, tên, email, lead time mặc định.
  * *When* lưu nhà cung cấp.
  * *Then* hệ thống mở liên kết định giá và tính toán thẻ điểm năng lực (Supplier Scorecard).
* **F04 (Kho hàng):**
  * *Given* mã kho duy nhất (ví dụ: `WH-NORTH`, `WH-SOUTH`, `WH-TRANSIT`).
  * *When* khởi tạo kho.
  * *Then* hệ thống kích hoạt không gian số dư sống `stock_levels` cho kho đó.
* **F05 (Cấu hình Sản phẩm - Kho):**
  * Định nghĩa `reorder_point`, `reorder_qty`, `max_stock`, `preferred_supplier_id` cho từng cặp (product, warehouse).

### Nhóm B: Nghiệp Vụ Tồn Kho & Chứng Từ
* **F10 (Nhập mua - PO):**
  * State Machine: `DRAFT -> SUBMITTED -> APPROVED -> PARTIALLY_RECEIVED -> RECEIVED` (+ `CANCELLED`, `CLOSED`).
  * Kiểm nhận hàng nhiều lần (Goods Receipt), phân tách hàng chuẩn và hàng cách ly hư hỏng (`qty_damaged`).
  * Cập nhật tự động đơn giá vốn bình quân di động (Moving Average Cost).
* **F11 (Bán hàng - SO):**
  * State Machine: `DRAFT -> CONFIRMED -> SHIPPED` (+ `CANCELLED`).
  * Khi `CONFIRMED`: Giữ chỗ hàng bằng cách tăng `reserved` nếu `available (on_hand - reserved) >= qty`.
  * Khi `SHIPPED`: Trừ nguyên tử cả `on_hand` và `reserved` thông qua bút toán `SALE_SHIPMENT`.
* **F12 (Điều chuyển liên kho 2 bước):**
  * Bước 1 (`DISPATCH`): Kho nguồn trừ `on_hand` với bút toán `TRANSFER_OUT`. Hàng chuyển vào trạng thái In-Transit.
  * Bước 2 (`RECEIVE`): Kho đích nhận hàng với bút toán `TRANSFER_IN`. Nếu có thất thoát/hư hại, ghi nhận dòng `DAMAGE` hoặc `ADJUSTMENT`.
* **F13 (Xử lý hàng hư hỏng - Damage Report):**
  * Báo hàng hư hỏng chuyển hàng vào số dư cách ly `damaged`.
  * Phê duyệt phương án giải quyết: Hủy hàng (`WRITE_OFF`) hoặc Trả lại NCC (`RETURN_TO_SUPPLIER`).
* **F14 (Kiểm kê định kỳ - Cycle Count):**
  * Tạo phiếu kiểm kê snapshot số dư hệ thống `system_qty`.
  * Nhập số thực đếm, tính độ lệch `variance = counted_qty - system_qty`.
  * Phê duyệt tự động phát sinh bút toán `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` để cân bằng sổ cái.

### Nhóm C: Truy Vết, Báo Cáo & Tính Năng Nâng Cao
* **F20 (Sổ cái biến động):** Lưu vết toàn bộ giao dịch Append-Only, cấm sửa xóa, lưu số dư tức thời `balance_after`.
* **F21 (Audit Log):** Ghi nhận `user_id`, `action`, Before/After JSON diff cho mọi thao tác.
* **F22 (Tồn tại thời điểm As-Of Date):** Tính toán `SUM(qty_on_hand_delta) WHERE created_at <= T`.
* **F23 (Báo cáo Thẻ điểm NCC):** Tính toán Fill Rate (%), On-Time Delivery Rate (%), Lead time trung bình, Tỷ lệ hàng hư (%).
* **F24 (Định giá & Phân tích ABC):** Tổng giá trị tồn kho theo từng kho và phân loại sản phẩm theo nguyên lý Pareto 80/20.
* **F30 (Cảnh báo tồn thấp & Gợi ý PO):** Tự động gom các SKU dưới `reorder_point` theo NCC ưu tiên và tính toán số lượng đặt hàng gợi ý `max(reorder_qty, max_stock - available)`.
* **F31 (Mã vạch Barcode):** Tra cứu theo mã barcode / SKU và hiển thị tem nhãn Code128.
* **F32 (Realtime SSE):** Phát sóng biến động sổ cái thời gian thực qua Server-Sent Events `/inventory/stream`.
* **F33 (Xuất CSV):** Hỗ trợ xuất dữ liệu tồn kho và sổ cái ra định dạng file CSV (`?format=csv`).

---

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

| Mã | Mục Tiêu | Tiêu Chí Đo Lường | Hiện Trạng Triển Khai |
|---|---|---|---|
| **N01** | Toàn vẹn dữ liệu | Không bao giờ tồn âm; `SUM(ledger) == stock_levels` 100% | CHECK constraints DB + Trigger append-only + Đối soát tự động |
| **N02** | Xử lý đồng thời | 50 request cùng xuất 1 SKU không gây Lost Update hoặc Deadlock | Sắp xếp khóa tuần tự `ORDER BY product_id, warehouse_id` + Row lock |
| **N03** | Chống ghi đôi | Retry mạng không sinh bút toán trùng lặp | Header `Idempotency-Key` + Bảng `idempotency_keys` |
| **N04** | Hiệu năng | p95 đọc < 300ms, ghi < 500ms | Đã kiểm định qua k6 load test script |
| **N05** | An ninh bảo mật | JWT ngắn hạn, HTTP-only cookie, Helmet headers, Zod validation | Đã tích hợp đầy đủ trong NestJS |
| **N06** | Khả dụng & Dự phòng | Backup hàng ngày, diễn tập khôi phục | Script `backup.ps1` & `backup.sh` với chính sách lưu giữ 30 ngày |
| **N07** | Quan sát & Giám sát | Health check, Readiness check, Audit logs | Endpoints `/health`, `/ready`, `/audit-logs`, Sổ cái Append-Only |
