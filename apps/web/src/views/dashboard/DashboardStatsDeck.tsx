import React from 'react';
import { AlertTriangle, Truck, CheckCircle } from 'lucide-react';

interface DashboardStatsDeckProps {
  totalValuation: number;
  totalUnits: number;
  lowStockCount: number;
}

export const DashboardStatsDeck: React.FC<DashboardStatsDeckProps> = ({
  totalValuation,
  totalUnits,
  lowStockCount,
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
    {/* Total Valuation */}
    <div className="stat-card stat-emerald">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng giá trị tồn kho</span>
        <span className="badge badge-emerald font-mono">$ USD</span>
      </div>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Quy mô: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{totalUnits.toLocaleString()}</span> đơn vị hàng hóa trên 3 kho
      </p>
    </div>

    {/* Low Stock Alerts */}
    <div className="stat-card stat-amber">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cảnh báo dưới điểm đặt hàng</span>
        <AlertTriangle size={16} color="var(--safety-amber)" />
      </div>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--safety-amber)', letterSpacing: '-0.02em' }}>
        {lowStockCount} SKU
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Khả dụng &le; Reorder point (Đề xuất tạo đơn PO)
      </p>
    </div>

    {/* In-Transit Transfers */}
    <div className="stat-card stat-cyan">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Hàng đang điều chuyển</span>
        <Truck size={16} color="var(--telemetry-cyan)" />
      </div>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--telemetry-cyan)', letterSpacing: '-0.02em' }}>
        1 chứng từ
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Kho Tổng Miền Bắc &rarr; Kho Trung Chuyển
      </p>
    </div>

    {/* Ledger Integrity Rate */}
    <div className="stat-card stat-emerald">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Độ toàn vẹn sổ cái</span>
        <CheckCircle size={16} color="var(--invariant-emerald)" />
      </div>
      <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--invariant-emerald)', letterSpacing: '-0.02em' }}>
        100.0%
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        Zero discrepancy giữa Ledger và live balances
      </p>
    </div>
  </div>
);
