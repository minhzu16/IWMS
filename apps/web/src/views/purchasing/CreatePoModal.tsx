import React from 'react';
import { X } from 'lucide-react';
import type { SupplierOption, ProductOption, CreatePOLineDraft } from './types.js';
import { createPoModalContentStyle } from './styles.js';

export interface CreatePoModalProps {
  isOpen: boolean;
  suppliers: SupplierOption[];
  products: ProductOption[];
  newSupplierId: number;
  newWarehouseId: number;
  poLines: CreatePOLineDraft[];
  onSupplierChange: (id: number) => void;
  onWarehouseChange: (id: number) => void;
  onLinesChange: React.Dispatch<React.SetStateAction<CreatePOLineDraft[]>>;
  onClose: () => void;
  onSubmit: () => void;
}

export const CreatePoModal: React.FC<CreatePoModalProps> = ({
  isOpen,
  suppliers,
  products,
  newSupplierId,
  newWarehouseId,
  poLines,
  onSupplierChange,
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
        style={createPoModalContentStyle}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Đơn Đặt Hàng Mới (Purchase Order)</h3>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label
                htmlFor="po-create-supplier"
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}
              >
                Nhà Cung Cấp:
              </label>
              <select
                id="po-create-supplier"
                className="select"
                value={newSupplierId}
                onChange={(e) => onSupplierChange(Number(e.target.value))}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="po-create-warehouse"
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}
              >
                Kho Tiếp Nhận:
              </label>
              <select
                id="po-create-warehouse"
                className="select"
                value={newWarehouseId}
                onChange={(e) => onWarehouseChange(Number(e.target.value))}
              >
                <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="po-line-product-0"
              style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}
            >
              Sản Phẩm Cần Nhập:
            </label>
            {poLines.map((line, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select
                  id={`po-line-product-${idx}`}
                  aria-label="Chọn sản phẩm"
                  className="select"
                  value={line.productId}
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    onLinesChange((prev) => prev.map((p, i) => (i === idx ? { ...p, productId: pid } : p)));
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>

                <input
                  id={`po-line-qty-${idx}`}
                  aria-label="Số lượng đặt"
                  type="number"
                  className="input font-mono"
                  placeholder="Số lượng"
                  value={line.qtyOrdered}
                  onChange={(e) => {
                    const qty = Number(e.target.value);
                    onLinesChange((prev) => prev.map((p, i) => (i === idx ? { ...p, qtyOrdered: qty } : p)));
                  }}
                />

                <input
                  id={`po-line-price-${idx}`}
                  aria-label="Đơn giá"
                  type="number"
                  className="input font-mono"
                  placeholder="Đơn giá"
                  value={line.unitPrice}
                  onChange={(e) => {
                    const pr = Number(e.target.value);
                    onLinesChange((prev) => prev.map((p, i) => (i === idx ? { ...p, unitPrice: pr } : p)));
                  }}
                />

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--quarantine-crimson)' }}
                  onClick={() => onLinesChange((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={poLines.length <= 1}
                  aria-label="Xóa dòng sản phẩm"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onLinesChange((prev) => [...prev, { productId: 1, qtyOrdered: 10, unitPrice: 100 }])}
              style={{ marginTop: 6 }}
            >
              + Thêm dòng sản phẩm
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={onSubmit}>Lưu Đơn PO (DRAFT)</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePoModal;
