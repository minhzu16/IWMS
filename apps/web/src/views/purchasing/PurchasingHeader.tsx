import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { headerStyle } from './styles.js';

export interface PurchasingHeaderProps {
  onAutoSuggestReorder: () => void;
  onOpenCreate: () => void;
}

export const PurchasingHeader: React.FC<PurchasingHeaderProps> = ({
  onAutoSuggestReorder,
  onOpenCreate,
}) => {
  return (
    <div style={headerStyle}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Quản Trị Mua Hàng & Kiểm Nhận Kho (Purchasing & Receipts)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Máy trạng thái chứng từ (State Machine) · Kiểm nhận hàng lỗi cách ly tức thời · Tự động cập nhật giá vốn bình quân
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAutoSuggestReorder}>
          <Sparkles size={16} color="var(--safety-amber)" />
          Gợi Ý Tạo PO Tự Động
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpenCreate}>
          <Plus size={16} />
          Tạo Đơn PO Mới
        </button>
      </div>
    </div>
  );
};

export default PurchasingHeader;
