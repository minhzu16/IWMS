# ADR-001: Kiến Trúc Ledger-First & Xử Lý Concurrency Trong IWMS

## 1. Trạng Thái
**ĐÃ CHẤP THUẬN (ACCEPTED)** - Ngày: 01/10/2026

## 2. Bối Cảnh & Đặt Vấn Đề
Trong các hệ thống quản trị kho thông thường (CRUD thuần như mô hình bảng `products.quantity`), khi nhiều thủ kho và nhân viên bán hàng cùng thao tác đồng thời:
- Xảy ra lỗi **Lost Update** (2 nhân viên cùng đọc tồn = 10, cùng xuất 8 -> kết quả ghi đè sai).
- **Overselling (Bán vượt tồn)** khi nhiều đơn hàng cùng chốt lượng hàng cuối cùng.
- Không thể truy vết lịch sử hoặc đối soát tài chính khi số liệu tồn kho bị sai lệch.
- Nguy cơ **Deadlock** khi 2 giao dịch chuyển kho liên quan đến cùng 2 SKU nhưng yêu cầu khóa theo thứ tự đảo ngược nhau.

## 3. Quyết Định Thiết Kế (Architectural Decisions)

### 3.1. Mô Hình Sổ Cái Bất Biến (Ledger-First)
- Nguồn sự thật duy nhất (Single Source of Truth) là bảng `stock_movements`.
- Mỗi biến động nhập, xuất, chuyển, hư hỏng, kiểm kê đều phát sinh một bản ghi Append-Only không bao giờ bị sửa đổi hoặc xóa (`Trigger: stock_movements_immutable BEFORE UPDATE OR DELETE`).
- Bảng `stock_levels` chỉ đóng vai trò bộ nhớ đệm (live cache) để tăng tốc độ truy vấn đọc `$O(1)$`, và bắt buộc được cập nhật trong **cùng một transaction** với dòng sổ cái.
- Bất biến bắt buộc luôn thỏa mãn:
  $$\forall (p, w): \text{stock\_levels.on\_hand} = \sum \text{stock\_movements.qty\_on\_hand\_delta}$$

### 3.2. Chiến Lược Triệt Tiêu Deadlock (Deterministic Lock Ordering)
- Mọi giao dịch thay đổi tồn kho liên quan đến nhiều sản phẩm hoặc nhiều kho (như Goods Receipt, Sales Order, Transfer) bắt buộc phải sắp xếp danh sách các dòng cần khóa theo thứ tự cố định trước khi thực hiện:
  $$\text{ORDER BY } \text{product\_id ASC, warehouse\_id ASC}$$
- Việc chuẩn hóa thứ tự khóa loại bỏ hoàn toàn chu trình chờ đợi tài nguyên vòng tròn (Circular Wait), từ đó triệt tiêu 100% nguy cơ Deadlock giữa các tiến trình chạy song song.

### 3.3. Tách Biệt 3 Chỉ Số Tồn Kho
$$\text{available} = \text{on\_hand} - \text{reserved}$$
- Bộ phận bán hàng chỉ được kiểm tra và giữ chỗ dựa trên `available`, không dựa trên `on_hand`.
- Khóa giữ chỗ sử dụng câu lệnh nguyên tử có điều kiện:
  ```sql
  UPDATE stock_levels
  SET reserved = reserved + $qty, version = version + 1
  WHERE product_id = $p AND warehouse_id = $w AND on_hand - reserved >= $qty;
  ```

### 3.4. Idempotency Key Chống Ghi Đôi Khi Mạng Retry
- Toàn bộ API ghi tồn kho yêu cầu client gửi header `Idempotency-Key`.
- Middleware lưu hash request và kết quả xử lý vào bảng `idempotency_keys`. Mọi yêu cầu retry trùng lặp sẽ trả ngay kết quả cũ mà không ghi sổ cái lần hai.

## 4. Hệ Quả & Đánh Giá
- **Ưu điểm:** Độ tin cậy dữ liệu đạt 100%, bảo vệ dữ liệu chống gian lận, truy vết kiểm toán tức thời, sẵn sàng mở rộng quy mô.
- **Nhược điểm:** Tốn thêm dung lượng lưu trữ cho sổ cái (giải quyết bằng partitioning theo năm/tháng nếu dữ liệu vượt 10 triệu dòng).
