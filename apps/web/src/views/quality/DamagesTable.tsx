import React from 'react';
import { CheckCircle } from 'lucide-react';
import { UserRole } from '@iwms/shared';
import type { DamageReport } from '../../api/client.js';

interface DamagesTableProps {
  damages: DamageReport[];
  currentRole: UserRole;
  onApproveDamage: (id: number) => void;
}

export const DamagesTable: React.FC<DamagesTableProps> = ({
  damages,
  currentRole,
  onApproveDamage,
}) => (
  <div>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Mã Báo Cáo</th>
            <th>Kho Hàng</th>
            <th>Trạng Thái</th>
            <th>Tổng Số Hàng Lỗi</th>
            <th>Người Lập</th>
            <th>Người Duyệt</th>
            <th>Ngày Tạo</th>
            <th style={{ textAlign: 'right' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {damages.map((d) => (
            <tr key={d.id}>
              <td className="font-mono" style={{ color: 'var(--quarantine-crimson)', fontWeight: 700 }}>
                {d.report_number}
              </td>
              <td>
                <span className="badge badge-indigo">{d.warehouse_name}</span>
              </td>
              <td>
                <span className={`badge ${d.status === 'APPROVED' ? 'badge-emerald' : 'badge-amber'}`}>
                  {d.status}
                </span>
              </td>
              <td style={{ fontWeight: 700, color: 'var(--quarantine-crimson)' }}>{d.total_qty || 2} món</td>
              <td style={{ fontSize: 13 }}>{d.created_by_name}</td>
              <td style={{ fontSize: 13 }}>{d.approved_by_name || '—'}</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(d.created_at).toLocaleString('vi-VN')}
              </td>
              <td style={{ textAlign: 'right' }}>
                {d.status === 'REPORTED' && ['ADMIN', 'MANAGER'].includes(currentRole) ? (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => onApproveDamage(d.id)}
                  >
                    <CheckCircle size={14} />
                    Duyệt Xử Lý (Hủy / Trả NCC)
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--invariant-emerald)', fontWeight: 600 }}>
                    ✓ Đã Xử Lý Hết
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
