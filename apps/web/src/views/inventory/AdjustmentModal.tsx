import React from 'react';
import { X } from 'lucide-react';
import { modalHeaderStyle, fieldLabelStyle, successAlertStyle } from './styles.js';

export interface AdjustmentModalProps {
  isOpen: boolean;
  productName: string;
  warehouseId: number;
  delta: number;
  reason: string;
  successMessage: string | null;
  onWarehouseChange: (id: number) => void;
  onDeltaChange: (delta: number) => void;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  productName,
  warehouseId,
  delta,
  reason,
  successMessage,
  onWarehouseChange,
  onDeltaChange,
  onReasonChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className="modal-content"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={modalHeaderStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tạo bút toán điều chỉnh tồn kho</h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Sản phẩm: <strong style={{ color: 'var(--text-primary)' }}>{productName}</strong>
        </p>

        {successMessage && (
          <div style={successAlertStyle}>
            {successMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="inv-adj-warehouse" style={fieldLabelStyle}>
              Kho hàng:
            </label>
            <select
              id="inv-adj-warehouse"
              className="select"
              value={warehouseId}
              onChange={(e) => onWarehouseChange(Number(e.target.value))}
            >
              <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
              <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
              <option value={3}>Kho Trung Chuyển Miền Trung</option>
            </select>
          </div>

          <div>
            <label htmlFor="inv-adj-delta" style={fieldLabelStyle}>
              Số lượng thay đổi (dương: nhập thêm, âm: trừ bớt):
            </label>
            <input
              id="inv-adj-delta"
              type="number"
              className="input font-mono"
              value={delta}
              onChange={(e) => onDeltaChange(Number(e.target.value))}
              placeholder="Ví dụ: 5 hoặc -3"
            />
          </div>

          <div>
            <label htmlFor="inv-adj-reason" style={fieldLabelStyle}>
              Lý do điều chỉnh (Audit Reason):
            </label>
            <textarea
              id="inv-adj-reason"
              className="textarea"
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ghi rõ lý do điều chỉnh để lưu vết vào Audit Log..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSubmit}
            >
              Ghi vào sổ cái ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentModal;
