import React from 'react';
import { X } from 'lucide-react';
import type { ReceiptLineDraft } from './types.js';
import { receiptModalContentStyle } from './styles.js';

export interface GoodsReceiptModalProps {
  isOpen: boolean;
  receiptLines: ReceiptLineDraft[];
  onLinesChange: React.Dispatch<React.SetStateAction<ReceiptLineDraft[]>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  receiptLines,
  onLinesChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={() => onClose()}
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
        style={receiptModalContentStyle}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Kiểm Nhận Hàng Vào Kho (Goods Receipt Wizard)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Hỗ trợ phân tách hàng đạt chuẩn (nhập on_hand) và hàng móp méo/vỡ (cách ly vào damaged)
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Quy tắc an toàn: Dung sai nhập vượt tối đa 10%. Đơn giá bình quân gia quyền sẽ được tính toán lại ngay khi ghi sổ cái.
          </p>
        </div>

        <div className="table-container" style={{ marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Đặt / Đã Nhận</th>
                <th>Hàng Chuẩn (Good)</th>
                <th>Hàng Hư Hỏng (Damaged)</th>
              </tr>
            </thead>
            <tbody>
              {receiptLines.map((line, idx) => (
                <tr key={line.poLineId}>
                  <td style={{ fontWeight: 600 }}>{line.productName}</td>
                  <td>{line.qtyOrdered} / {line.qtyAlreadyReceived}</td>
                  <td>
                    <input
                      id={`gr-line-received-${line.poLineId}`}
                      aria-label={`Số lượng hàng chuẩn cho ${line.productName}`}
                      type="number"
                      className="input font-mono"
                      style={{ width: 100 }}
                      value={line.qtyReceived}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onLinesChange((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, qtyReceived: val } : p)),
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      id={`gr-line-damaged-${line.poLineId}`}
                      aria-label={`Số lượng hàng hư hỏng cho ${line.productName}`}
                      type="number"
                      className="input font-mono"
                      style={{ width: 100, borderColor: Number(line.qtyDamaged) > 0 ? 'var(--quarantine-crimson)' : undefined }}
                      value={line.qtyDamaged}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onLinesChange((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, qtyDamaged: val } : p)),
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>
            Xác Nhận Nhập & Ghi Sổ Cái
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptModal;
