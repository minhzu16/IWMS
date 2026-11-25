import React from 'react';
import type { PurchaseOrderSummary } from './types.js';
import { poListCardStyle, poListContainerStyle, poItemCardStyle, getPoBadgeClass } from './styles.js';

export interface PoListProps {
  pos: PurchaseOrderSummary[];
  selectedPoId: number | null | undefined;
  onSelectPO: (id: number) => void;
}

export const PoList: React.FC<PoListProps> = ({
  pos,
  selectedPoId,
  onSelectPO,
}) => {
  return (
    <div className="card" style={poListCardStyle}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Danh Sách Đơn Mua Hàng ({pos.length})</h3>
      <div style={poListContainerStyle}>
        {pos.map((p) => {
          const isSelected = selectedPoId === p.id;
          const badgeClass = getPoBadgeClass(p.status);

          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectPO(p.id)}
              style={{
                all: 'unset',
                display: 'block',
                boxSizing: 'border-box',
                width: '100%',
                textAlign: 'left',
                ...poItemCardStyle(isSelected),
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--transit-indigo)' }}>
                  {p.po_number}
                </span>
                <span className={`badge ${badgeClass}`} style={{ fontSize: 11 }}>
                  {p.status}
                </span>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.supplier_name}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{p.warehouse_name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                  ${Number(p.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PoList;
