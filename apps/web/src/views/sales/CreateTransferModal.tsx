import React from 'react';
import { X } from 'lucide-react';
import type { TransferCreateLine } from './types.js';
import {
  modalHeaderStyle,
  formStackStyle,
  fieldLabelStyle,
  modalFooterStyle,
} from './styles.js';

export interface CreateTransferModalProps {
  isOpen: boolean;
  srcWh: number;
  tgtWh: number;
  trLines: TransferCreateLine[];
  onSrcWhChange: (warehouseId: number) => void;
  onTgtWhChange: (warehouseId: number) => void;
  onLinesChange: React.Dispatch<React.SetStateAction<TransferCreateLine[]>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  srcWh,
  tgtWh,
  trLines,
  onSrcWhChange,
  onTgtWhChange,
  onLinesChange,
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Phiếu Điều Chuyển Liên Kho (Transfer)</h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={formStackStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="transfer-src-wh" style={fieldLabelStyle}>
                Kho Nguồn:
              </label>
              <select
                id="transfer-src-wh"
                className="select"
                value={srcWh}
                onChange={(e) => onSrcWhChange(Number(e.target.value))}
              >
                <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
              </select>
            </div>
            <div>
              <label htmlFor="transfer-tgt-wh" style={fieldLabelStyle}>
                Kho Đích:
              </label>
              <select
                id="transfer-tgt-wh"
                className="select"
                value={tgtWh}
                onChange={(e) => onTgtWhChange(Number(e.target.value))}
              >
                <option value={3}>Kho Trung Chuyển Miền Trung</option>
                <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="transfer-product-0"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}
            >
              Sản phẩm chuyển:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <select
                id="transfer-product-0"
                aria-label="Sản phẩm chuyển"
                className="select"
                value={trLines[0]?.productId}
                onChange={(e) => {
                  const productId = Number(e.target.value);
                  onLinesChange((prev) => [{ ...prev[0], productId }]);
                }}
              >
                <option value={4}>Samsung 990 PRO NVMe 2TB</option>
                <option value={1}>Intel Core i7-14700K 20-Core</option>
                <option value={8}>Logitech G PRO X Superlight 2</option>
              </select>
              <input
                id="transfer-qty-0"
                aria-label="Số lượng"
                type="number"
                className="input font-mono"
                value={trLines[0]?.qtyDispatched}
                onChange={(e) => {
                  const qtyDispatched = Number(e.target.value);
                  onLinesChange((prev) => [{ ...prev[0], qtyDispatched }]);
                }}
                placeholder="Số lượng"
              />
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>
              Lập Phiếu Điều Chuyển
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTransferModal;
