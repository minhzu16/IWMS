import React from 'react';
import type { ABCAnalysisItem } from '../../api/client.js';

interface AbcAnalysisCardProps {
  abc: ABCAnalysisItem[];
  onNavigateTab: (tab: string) => void;
}

export const AbcAnalysisCard: React.FC<AbcAnalysisCardProps> = ({
  abc,
  onNavigateTab,
}) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          Phân tích định lượng Pareto ABC
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Nhóm A: 80% doanh số xuất · Nhóm B: 15% · Nhóm C: 5%
        </p>
      </div>
      <span className="badge badge-cyan font-mono">Pareto 80/20</span>
    </div>

    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Mã SKU</th>
            <th>Sản phẩm</th>
            <th style={{ textAlign: 'right' }}>Giá trị xuất</th>
            <th>Phân loại</th>
          </tr>
        </thead>
        <tbody>
          {abc.slice(0, 6).map((item, idx) => {
            const badgeClass =
              item.abc_class === 'A'
                ? 'badge-emerald'
                : item.abc_class === 'B'
                ? 'badge-cyan'
                : 'badge-amber';
            return (
              <tr key={idx}>
                <td className="font-mono" style={{ color: 'var(--telemetry-cyan)', fontWeight: 600 }}>
                  {item.sku}
                </td>
                <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                <td className="font-mono" style={{ fontWeight: 600, textAlign: 'right' }}>
                  ${Number(item.total_shipped_value || 0).toLocaleString()}
                </td>
                <td>
                  <span className={`badge ${badgeClass}`}>Nhóm {item.abc_class}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Direct Tactical Operation Triggers */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onNavigateTab('purchasing')}
        style={{ justifyContent: 'center' }}
      >
        + Đơn mua PO
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onNavigateTab('sales')}
        style={{ justifyContent: 'center' }}
      >
        + Đơn bán SO
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => onNavigateTab('quality')}
        style={{ justifyContent: 'center' }}
      >
        + Phiếu kiểm kê
      </button>
    </div>
  </div>
);
