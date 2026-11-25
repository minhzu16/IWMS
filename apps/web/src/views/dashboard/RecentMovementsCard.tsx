import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { StockMovement } from '../../api/client.js';

interface RecentMovementsCardProps {
  movements: StockMovement[];
  onNavigateTab: (tab: string) => void;
}

export const RecentMovementsCard: React.FC<RecentMovementsCardProps> = ({
  movements,
  onNavigateTab,
}) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          Nhật ký sổ cái biến động gần nhất
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Cơ chế Append-Only lưu vết từng giao dịch tức thời
        </p>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onNavigateTab('inventory')}
        style={{ fontSize: 11, padding: '4px 8px' }}
      >
        Xem tất cả
      </button>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {movements.map((m) => {
        const isIn = m.qty_on_hand_delta > 0;
        return (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--deck-panel)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  padding: 6,
                  borderRadius: 'var(--radius-xs)',
                  background: isIn ? 'var(--invariant-emerald-subtle)' : 'var(--quarantine-crimson-subtle)',
                  color: isIn ? 'var(--invariant-emerald)' : 'var(--quarantine-crimson)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.product_name}</h4>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                  <span className="badge badge-slate font-mono" style={{ fontSize: 10, padding: '1px 5px' }}>
                    {m.movement_type}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Bởi {m.created_by_name}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isIn ? 'var(--invariant-emerald)' : 'var(--quarantine-crimson)',
                }}
              >
                {isIn ? `+${m.qty_on_hand_delta}` : m.qty_on_hand_delta}
              </span>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Tồn sau: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{m.balance_after}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
