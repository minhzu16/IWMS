import React from 'react';
import { X } from 'lucide-react';
import type { SOLineItem } from './types.js';
import {
  modalHeaderStyle,
  formStackStyle,
  fieldLabelStyle,
  modalFooterStyle,
} from './styles.js';

export interface CreateSoModalProps {
  isOpen: boolean;
  customerName: string;
  soWarehouseId: number;
  soLines: SOLineItem[];
  onCustomerNameChange: (name: string) => void;
  onWarehouseChange: (warehouseId: number) => void;
  onLinesChange: React.Dispatch<React.SetStateAction<SOLineItem[]>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreateSoModal: React.FC<CreateSoModalProps> = ({
  isOpen,
  customerName,
  soWarehouseId,
  soLines,
  onCustomerNameChange,
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Đơn Bán Hàng Mới (Sales Order)</h3>
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
          <div>
            <label htmlFor="sales-customer-name" style={fieldLabelStyle}>
              Tên Khách Hàng:
            </label>
            <input
              id="sales-customer-name"
              type="text"
              className="input"
              placeholder="Ví dụ: Công ty TNHH Giải Pháp Công Nghệ..."
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="sales-so-warehouse" style={fieldLabelStyle}>
              Kho Xuất Hàng:
            </label>
            <select
              id="sales-so-warehouse"
              className="select"
              value={soWarehouseId}
              onChange={(e) => onWarehouseChange(Number(e.target.value))}
            >
              <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
              <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="sales-so-product-0"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}
            >
              Chi Tiết Hàng Đặt:
            </label>
            {soLines.map((l, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <select
                  id={`sales-so-product-${idx}`}
                  aria-label="Chọn sản phẩm"
                  className="select"
                  value={l.productId}
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    onLinesChange((prev) => prev.map((item, i) => (i === idx ? { ...item, productId: pid } : item)));
                  }}
                >
                  <option value={1}>Intel Core i7-14700K (CPU-INT-14700K)</option>
                  <option value={4}>Samsung 990 PRO 2TB (SSD-SAM-990P-2TB)</option>
                  <option value={5}>ASUS RTX 4080 SUPER (GPU-RTX-4080S)</option>
                </select>

                <input
                  id={`sales-so-qty-${idx}`}
                  aria-label="Số lượng"
                  type="number"
                  className="input font-mono"
                  placeholder="Số lượng"
                  value={l.qtyOrdered}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    onLinesChange((prev) => prev.map((item, i) => (i === idx ? { ...item, qtyOrdered: qty } : item)));
                  }}
                />

                <input
                  id={`sales-so-price-${idx}`}
                  aria-label="Đơn giá"
                  type="number"
                  className="input font-mono"
                  placeholder="Đơn giá"
                  value={l.unitPrice}
                  onChange={(e) => {
                    const pr = Number(e.target.value);
                    onLinesChange((prev) => prev.map((item, i) => (i === idx ? { ...item, unitPrice: pr } : item)));
                  }}
                />
              </div>
            ))}
          </div>

          <div style={modalFooterStyle}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>
              Tạo Đơn Bán
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSoModal;
