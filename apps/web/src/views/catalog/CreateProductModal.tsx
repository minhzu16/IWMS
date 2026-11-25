import React from 'react';
import { X } from 'lucide-react';
import { modalHeaderStyle, fieldLabelStyle, modalFooterStyle } from './styles.js';

export interface CreateProductModalProps {
  isOpen: boolean;
  sku: string;
  name: string;
  barcode: string;
  cost: number;
  uom: string;
  onSkuChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onBarcodeChange: (val: string) => void;
  onCostChange: (val: number) => void;
  onUomChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  sku,
  name,
  barcode,
  cost,
  uom,
  onSkuChange,
  onNameChange,
  onBarcodeChange,
  onCostChange,
  onUomChange,
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Thêm Sản Phẩm Mới Vào Hệ Thống</h3>
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
            <label htmlFor="catalog-new-sku" style={fieldLabelStyle}>
              Mã SKU (Bắt buộc duy nhất):
            </label>
            <input
              id="catalog-new-sku"
              type="text"
              className="input font-mono"
              placeholder="Ví dụ: GPU-NV-5090"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="catalog-new-name" style={fieldLabelStyle}>
              Tên Sản Phẩm:
            </label>
            <input
              id="catalog-new-name"
              type="text"
              className="input"
              placeholder="Ví dụ: Card đồ họa NVIDIA RTX 5090 32GB"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="catalog-new-barcode" style={fieldLabelStyle}>
              Mã Vạch Barcode (Code128 / EAN):
            </label>
            <input
              id="catalog-new-barcode"
              type="text"
              className="input font-mono"
              placeholder="Ví dụ: 893850123099"
              value={barcode}
              onChange={(e) => onBarcodeChange(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label htmlFor="catalog-new-cost" style={fieldLabelStyle}>
                Giá Vốn Chuẩn ($):
              </label>
              <input
                id="catalog-new-cost"
                type="number"
                className="input font-mono"
                value={cost}
                onChange={(e) => onCostChange(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="catalog-new-uom" style={fieldLabelStyle}>
                Đơn Vị Tính (UoM):
              </label>
              <input
                id="catalog-new-uom"
                type="text"
                className="input"
                value={uom}
                onChange={(e) => onUomChange(e.target.value)}
              />
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>
              Lưu Sản Phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProductModal;
