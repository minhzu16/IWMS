import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { StockMovement } from '../../api/client.js';

export interface MovementsTabProps {
  movements: StockMovement[];
}

export const MovementsTab: React.FC<MovementsTabProps> = ({ movements }) => {
  return (
    <div>
      <div style={{ background: 'var(--deck-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={20} color="var(--invariant-emerald)" />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Bảng <code>stock_movements</code> kích hoạt <strong>trigger cấm UPDATE & DELETE</strong>. Mọi sự biến động đều được lưu vết tuần tự kèm theo số dư tức thời tại thời điểm giao dịch (<code>balance_after</code>).
        </p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Mã số</th>
              <th>Thời gian</th>
              <th>Sản phẩm / Kho</th>
              <th>Loại bút toán</th>
              <th style={{ textAlign: 'right' }}>Biến động delta</th>
              <th style={{ textAlign: 'right' }}>Số dư sau</th>
              <th>Chứng từ gốc</th>
              <th>Người ghi sổ</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const isIn = Number(m.qty_on_hand_delta) > 0;
              return (
                <tr key={m.id}>
                  <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{m.id}</td>
                  <td className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {new Date(m.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.warehouse_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-cyan font-mono">{m.movement_type}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, color: isIn ? 'var(--invariant-emerald)' : 'var(--quarantine-crimson)', textAlign: 'right' }}>
                    {isIn ? `+${m.qty_on_hand_delta}` : m.qty_on_hand_delta}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                    {m.balance_after}
                  </td>
                  <td>
                    <span className="badge badge-slate font-mono">{m.source_doc_type} #{m.source_doc_id}</span>
                  </td>
                  <td style={{ fontSize: 12 }}>{m.created_by_name}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.note || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovementsTab;
