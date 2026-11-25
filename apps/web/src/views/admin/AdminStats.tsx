import React from 'react';
import type { AdminStats as AdminStatsType } from '../../api/client.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export interface AdminStatsProps {
  stats: AdminStatsType | null;
  error?: string | null;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, error }) => {
  return (
    <>
      {/* Stats Row: 4 .stat-card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Người dùng */}
        <div className="stat-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Người dùng
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {stats ? `${stats.users.active} / ${stats.users.total}` : '— / —'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Hoạt động / Tổng số tài khoản
          </div>
        </div>

        {/* Card 2: Sản phẩm đang bán */}
        <div className="stat-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Sản phẩm đang bán
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {stats ? stats.catalog.products : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Hết hàng: <span style={{ fontWeight: 600, color: 'var(--quarantine-crimson)' }}>{stats ? stats.stock.outOfStock : '—'}</span>
          </div>
        </div>

        {/* Card 3: Kho hoạt động */}
        <div className="stat-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Kho hoạt động
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {stats ? stats.catalog.warehouses : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Cơ sở kho đang vận hành
          </div>
        </div>

        {/* Card 4: Giá trị tồn kho */}
        <div className="stat-card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Giá trị tồn kho
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {stats ? currencyFormatter.format(stats.stock.onHandValue) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Biến động 24h: <span style={{ fontWeight: 600, color: 'var(--invariant-emerald)' }}>{stats ? stats.movements.last24h : '—'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            padding: '10px 14px',
            marginBottom: 20,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--quarantine-crimson-subtle)',
            color: 'var(--quarantine-crimson)',
            fontSize: 13,
            border: '1px solid var(--quarantine-crimson)',
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

export default AdminStats;
