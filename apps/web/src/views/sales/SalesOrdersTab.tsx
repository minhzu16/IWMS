import React from 'react';
import { Lock, Send } from 'lucide-react';
import type { SalesOrderItem } from './types.js';
import { getSoBadgeClass } from './styles.js';

export interface SalesOrdersTabProps {
  sos: SalesOrderItem[];
  onConfirmSO: (id: number) => void;
  onShipSO: (id: number) => void;
  onCancelSO: (id: number) => void;
}

export const SalesOrdersTab: React.FC<SalesOrdersTabProps> = ({
  sos,
  onConfirmSO,
  onShipSO,
  onCancelSO,
}) => {
  return (
    <div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Số Đơn SO</th>
              <th>Khách Hàng</th>
              <th>Kho Xuất</th>
              <th>Trạng Thái</th>
              <th>Số Mặt Hàng</th>
              <th>Tổng Tiền ($)</th>
              <th>Người Tạo</th>
              <th style={{ textAlign: 'right' }}>Quy Trình Xử Lý</th>
            </tr>
          </thead>
          <tbody>
            {sos.map((so) => {
              const badgeClass = getSoBadgeClass(so.status);

              return (
                <tr key={so.id}>
                  <td className="font-mono" style={{ color: 'var(--transit-indigo)', fontWeight: 700 }}>
                    {so.so_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{so.customer_name}</td>
                  <td>
                    <span className="badge badge-indigo">{so.warehouse_name}</span>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{so.status}</span>
                  </td>
                  <td>{so.item_count || 1} SKU</td>
                  <td style={{ fontWeight: 700 }}>${Number(so.total_amount || 0).toLocaleString()}</td>
                  <td style={{ fontSize: 13 }}>{so.created_by_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {so.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onConfirmSO(so.id)}
                        >
                          <Lock size={14} />
                          Xác Nhận Giữ Chỗ
                        </button>
                      )}
                      {so.status === 'CONFIRMED' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => onShipSO(so.id)}
                          >
                            <Send size={14} />
                            Xuất Kho Ngay
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--quarantine-crimson)' }}
                            onClick={() => onCancelSO(so.id)}
                          >
                            Hủy Đơn
                          </button>
                        </>
                      )}
                      {so.status === 'SHIPPED' && (
                        <span style={{ fontSize: 12, color: 'var(--invariant-emerald)', fontWeight: 600 }}>
                          ✓ Đã Ghi Sổ Cái
                        </span>
                      )}
                    </div>
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

export default SalesOrdersTab;
