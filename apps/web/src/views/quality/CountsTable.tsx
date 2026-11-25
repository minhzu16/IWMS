import React from 'react';
import { CheckCircle } from 'lucide-react';
import { UserRole } from '@iwms/shared';
import type { StockCount } from '../../api/client.js';

interface CountsTableProps {
  counts: StockCount[];
  currentRole: UserRole;
  onApproveCount: (id: number) => void;
}

export const CountsTable: React.FC<CountsTableProps> = ({
  counts,
  currentRole,
  onApproveCount,
}) => (
  <div>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Mã Phiếu Kiểm Kê</th>
            <th>Kho Kiểm Kê</th>
            <th>Trạng Thái</th>
            <th>Tổng Chênh Lệch</th>
            <th>Người Kiểm</th>
            <th>Người Duyệt</th>
            <th>Thời Gian</th>
            <th style={{ textAlign: 'right' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c) => (
            <tr key={c.id}>
              <td className="font-mono" style={{ color: 'var(--transit-indigo)', fontWeight: 700 }}>
                {c.count_number}
              </td>
              <td>
                <span className="badge badge-indigo">{c.warehouse_name}</span>
              </td>
              <td>
                <span className={`badge ${c.status === 'APPROVED' ? 'badge-emerald' : 'badge-amber'}`}>
                  {c.status}
                </span>
              </td>
              <td style={{ fontWeight: 700, color: Number(c.total_variance) !== 0 ? 'var(--safety-amber)' : 'var(--invariant-emerald)' }}>
                {c.total_variance || 0} lệch
              </td>
              <td style={{ fontSize: 13 }}>{c.created_by_name}</td>
              <td style={{ fontSize: 13 }}>{c.approved_by_name || '—'}</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleString('vi-VN')}
              </td>
              <td style={{ textAlign: 'right' }}>
                {c.status === 'DRAFT' && ['ADMIN', 'MANAGER'].includes(currentRole) ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onApproveCount(c.id)}
                  >
                    <CheckCircle size={14} />
                    Duyệt & Bù Trừ Vào Sổ Cái
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--invariant-emerald)', fontWeight: 600 }}>
                    ✓ Đã Điều Chỉnh Tồn
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
