import React from 'react';
import { Calendar } from 'lucide-react';
import type { AsOfStockLevel } from '../../api/client.js';

export interface AsOfTabProps {
  asOfDate: string;
  asOfData: AsOfStockLevel[];
  loading: boolean;
  onAsOfDateChange: (val: string) => void;
  onLoadAsOf: () => void;
}

export const AsOfTab: React.FC<AsOfTabProps> = ({
  asOfDate,
  asOfData,
  loading,
  onAsOfDateChange,
  onLoadAsOf,
}) => {
  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Truy vấn số dư tại thời điểm bất kỳ (As-of Date)
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Nhờ kiến trúc Ledger-First, hệ thống tính toán nguyên tử <code>SUM(qty_on_hand_delta) WHERE created_at &le; T</code> phục vụ kiểm toán tài chính và báo cáo thuế.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <input
              id="inv-asof-date"
              aria-label="Thời điểm truy vấn số dư"
              type="datetime-local"
              className="input font-mono"
              value={asOfDate}
              onChange={(e) => onAsOfDateChange(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onLoadAsOf}
            disabled={loading}
          >
            <Calendar size={14} />
            Tính tồn tức thời
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm / SKU</th>
              <th>Kho hàng</th>
              <th style={{ textAlign: 'right' }}>Tồn thực có tại mốc (On hand as-of)</th>
              <th style={{ textAlign: 'right' }}>Hàng hư hỏng tại mốc</th>
            </tr>
          </thead>
          <tbody>
            {asOfData.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <div style={{ fontWeight: 600 }}>{row.product_name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--telemetry-cyan)' }}>{row.sku}</div>
                </td>
                <td>
                  <span className="badge badge-slate">{row.warehouse_name}</span>
                </td>
                <td className="font-mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--telemetry-cyan)', textAlign: 'right' }}>
                  {row.on_hand_as_of} {row.uom}
                </td>
                <td className="font-mono" style={{ fontWeight: 600, color: 'var(--quarantine-crimson)', textAlign: 'right' }}>
                  {row.damaged_as_of}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AsOfTab;
