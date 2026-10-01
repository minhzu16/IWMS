# IWMS Operational Runbook & SRE Manual

> Tài liệu hướng dẫn vận hành, xử lý sự cố (Incident Response), sao lưu dự phòng (Disaster Recovery) và quy trình triển khai production cho hệ thống IWMS.

---

## 1. Kiểm Tra Sức Khỏe & Giám Sát (Health & Metrics)

### 1.1. Health Check Probes
- **Liveness Probe:** `GET /health` &rarr; Trả về trạng thái máy chủ Node.js và thời gian uptime.
- **Readiness Probe:** `GET /ready` &rarr; Kiểm tra kết nối trực tiếp đến PostgreSQL pool (`SELECT 1`). Proxy / Kubernetes sử dụng endpoint này để điều phối lưu lượng.
- **Invariant Audit Probe:** `GET /inventory/reconcile` (hoặc `POST /admin/reconcile`) &rarr; Quét đối soát toàn bộ số dư sống so với tổng sổ cái. Số lượng dòng lệch `discrepancyCount` bắt buộc phải bằng 0.

### 1.2. Các Chỉ Số Cần Giám Sát (Key Alerts)
- **Tỉ lệ lỗi INSUFFICIENT_STOCK:** Tăng đột biến cảnh báo khả năng thiếu hụt nguồn cung hoặc bot đặt hàng ảo.
- **Thời gian phản hồi p95:** Mục tiêu `< 300ms` cho đọc và `< 500ms` cho ghi sổ cái.
- **Kích thước Connection Pool:** Ngưỡng cảnh báo khi pool sử dụng vượt quá 80% dung lượng tối đa.

---

## 2. Quy Trình Sao Lưu & Khôi Phục (Disaster Recovery)

### 2.1. Sao Lưu Định Kỳ
Hệ thống chạy cronjob sao lưu mỗi ngày lúc 02:00 AM:
```bash
# Thực thi thủ công trên máy chủ
./infra/scripts/backup.sh
# Hoặc trên Windows PowerShell:
.\infra\scripts\backup.ps1
```

### 2.2. Kịch Bản Khôi Phục Thử Nghiệm (Drill Test)
Diễn tập khôi phục được thực hiện định kỳ hàng tháng vào môi trường Staging:
```bash
# 1. Tạo database kiểm thử
createdb -U postgres iwms_recovery_test

# 2. Khôi phục từ bản backup
pg_restore -U postgres -d iwms_recovery_test backups/iwms_backup_latest.sql

# 3. Chạy lệnh đối soát bất biến
psql -U postgres -d iwms_recovery_test -c "
SELECT s.product_id, s.warehouse_id, s.on_hand, COALESCE(SUM(m.qty_on_hand_delta),0) AS ledger_sum
FROM stock_levels s
LEFT JOIN stock_movements m USING (product_id, warehouse_id)
GROUP BY s.product_id, s.warehouse_id, s.on_hand
HAVING s.on_hand <> COALESCE(SUM(m.qty_on_hand_delta),0);
"
# Kết quả kỳ vọng: 0 rows
```

---

## 3. Quy Trình Rollout & Rollback Không Gián Đoạn (Zero-Downtime)

### 3.1. Chiến Lược Migration: Expand & Contract
1. **Expand (Mở rộng):** Chỉ thêm bảng mới hoặc thêm cột mới với thuộc tính `NULL` hoặc `DEFAULT`.
2. **Deploy Code:** Đưa phiên bản API mới vào hoạt động. Code mới ghi vào cả cột mới và duy trì tương thích.
3. **Contract (Thu hẹp):** Sau khi ổn định tối thiểu 1 chu kỳ release, mới xóa các cột cũ đã deprecated ở bước migration tiếp theo.

### 3.2. Quy Trình Rollback Khẩn Cấp
Nếu phiên bản mới phát sinh lỗi nghiêm trọng:
1. Docker image được gắn nhãn theo commit SHA (ví dụ: `iwms-api:a8f4c21`).
2. Rollback dịch vụ về SHA trước đó qua Docker Compose / K8s manifest:
   ```bash
   docker compose pull && docker compose up -d --no-deps api
   ```
3. Nhờ tuân thủ nguyên tắc Expand & Contract, schema database vẫn tương thích 100% với code cũ mà không cần can thiệp rollback dữ liệu.

---

## 4. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Tình Huống | Nguyên Nhân Tiềm Ẩn | Hành Động Xử Lý |
|---|---|---|
| **Lỗi 422 INSUFFICIENT_STOCK** | Số lượng khả dụng `available` nhỏ hơn lượng yêu cầu xuất | Kiểm tra số lượng `reserved` của các đơn bán đang treo; nếu đơn bị bỏ rơi, thực hiện hủy đơn để giải phóng lượng giữ chỗ |
| **Phát hiện dòng lệch khi đối soát** | Có truy vấn raw SQL can thiệp trực tiếp ngoài quy chuẩn | Chạy truy vấn đối soát chi tiết để xác định ID sản phẩm; kiểm tra audit log tìm `user_id` và câu lệnh can thiệp; chạy bút toán điều chỉnh `REVERSAL` để cân bằng lại sổ cái |
| **Lỗi 409 VERSION_CONFLICT** | 2 nhân viên cùng sửa 1 chứng từ PO cùng lúc (Optimistic Lock) | Hướng dẫn người dùng tải lại trang để nạp phiên bản mới nhất trước khi chỉnh sửa tiếp |
| **Kết nối PostgreSQL bị nghẽn** | Connection leak hoặc truy vấn phân tích quét toàn bảng không có index | Kiểm tra `pg_stat_activity` tìm các câu lệnh chạy quá 5 giây; bổ sung partial index trên `stock_movements (product_id, warehouse_id, created_at)` |
