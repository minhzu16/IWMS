import React from 'react';
import { X } from 'lucide-react';
import type { CreateStockCountLineInput } from '../../api/client.js';

interface StockCountModalProps {
  isOpen: boolean;
  warehouseId: number;
  lines: CreateStockCountLineInput[];
  onWarehouseChange: (id: number) => void;
  onLinesChange: React.Dispatch<React.SetStateAction<CreateStockCountLineInput[]>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const StockCountModal: React.FC<StockCountModalProps> = ({
  isOpen,
  warehouseId,
  lines,
  onWarehouseChange,
  onLinesChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Phiếu Kiểm Kê Định Kỳ (Cycle Count)</h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="qc-count-warehouse" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Hàng Cần Kiểm Kê:</label>
            <select
              id="qc-count-warehouse"
              className="select"
              value={warehouseId}
              onChange={(e) => onWarehouseChange(Number(e.target.value))}
            >
              <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
              <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
            </select>
          </div>

          <div>
            <span style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Số lượng thực tế đếm được:</span>
            {lines.map((line, idx) => (
              <div key={line.productId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <label htmlFor={`qc-count-qty-${line.productId}`} style={{ fontSize: 13, fontWeight: 600 }}>
                  {line.productId === 1 ? 'Intel Core i7-14700K' : 'Samsung 990 PRO 2TB'}
                </label>
                <input
                  id={`qc-count-qty-${line.productId}`}
                  type="number"
                  className="input font-mono"
                  placeholder="Số thực đếm"
                  value={line.countedQty}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onLinesChange((prev) => prev.map((p, i) => (i === idx ? { ...p, countedQty: val } : p)));
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>Lập Phiếu Đếm</button>
          </div>
        </div>
      </div>
    </div>
  );
};
