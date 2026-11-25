import React from 'react';
import { X } from 'lucide-react';
import type { CreateDamageReportLineInput } from '../../api/client.js';

interface DamageReportModalProps {
  isOpen: boolean;
  warehouseId: number;
  lines: CreateDamageReportLineInput[];
  onWarehouseChange: (id: number) => void;
  onLinesChange: (lines: CreateDamageReportLineInput[]) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const DEFAULT_LINE: CreateDamageReportLineInput = {
  productId: 4,
  qty: 2,
  reason: '',
  disposition: 'WRITE_OFF',
};

export const DamageReportModal: React.FC<DamageReportModalProps> = ({
  isOpen,
  warehouseId,
  lines,
  onWarehouseChange,
  onLinesChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const first = lines[0] || DEFAULT_LINE;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--quarantine-crimson)' }}>
            Báo Cáo Hàng Hư Hỏng Mới (Damage Report)
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Hàng hóa báo hư sẽ ngay lập tức được chuyển từ số dư <code>on_hand</code> sang số dư cách ly <code>damaged</code> để tránh việc bán nhầm.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="qc-dmg-warehouse" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Hàng:</label>
            <select
              id="qc-dmg-warehouse"
              className="select"
              value={warehouseId}
              onChange={(e) => onWarehouseChange(Number(e.target.value))}
            >
              <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
              <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
            </select>
          </div>

          <div>
            <label htmlFor="qc-dmg-product" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Sản phẩm:</label>
            <select
              id="qc-dmg-product"
              className="select"
              value={lines[0]?.productId}
              onChange={(e) => onLinesChange([{ ...first, productId: Number(e.target.value) }])}
            >
              <option value={4}>Samsung 990 PRO NVMe 2TB</option>
              <option value={1}>Intel Core i7-14700K 20-Core</option>
              <option value={5}>ASUS TUF RTX 4080 SUPER 16GB</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label htmlFor="qc-dmg-qty" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Số lượng:</label>
              <input
                id="qc-dmg-qty"
                type="number"
                className="input font-mono"
                value={lines[0]?.qty}
                onChange={(e) => onLinesChange([{ ...first, qty: Number(e.target.value) }])}
              />
            </div>
            <div>
              <label htmlFor="qc-dmg-disposition" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Hướng xử lý mong muốn:</label>
              <select
                id="qc-dmg-disposition"
                className="select"
                value={lines[0]?.disposition}
                onChange={(e) => onLinesChange([{ ...first, disposition: e.target.value }])}
              >
                <option value="WRITE_OFF">Hủy Hàng (Write-Off)</option>
                <option value="RETURN_TO_SUPPLIER">Trả Lại Nhà Cung Cấp (Return)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="qc-dmg-reason" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Lý do hư hỏng:</label>
            <textarea
              id="qc-dmg-reason"
              className="textarea"
              rows={2}
              value={lines[0]?.reason}
              onChange={(e) => onLinesChange([{ ...first, reason: e.target.value }])}
              placeholder="Ghi rõ tình trạng móp méo, vỡ, ẩm mốc..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="button" className="btn btn-danger" onClick={onSubmit}>Ghi Nhận Hàng Lỗi</button>
          </div>
        </div>
      </div>
    </div>
  );
};
