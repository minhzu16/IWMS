import React from 'react';
import { CheckCircle, Send } from 'lucide-react';
import type { TransferItem } from './types.js';
import { getTransferBadgeClass } from './styles.js';

export interface TransfersTabProps {
  transfers: TransferItem[];
  onDispatchTransfer: (id: number) => void;
  onReceiveTransfer: (id: number) => void;
}

export const TransfersTab: React.FC<TransfersTabProps> = ({
  transfers,
  onDispatchTransfer,
  onReceiveTransfer,
}) => {
  return (
    <div>
      <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong>Quy trình điều chuyển 2 bước:</strong> Bước 1 xuất kho nguồn (trừ on_hand, hàng chuyển sang In-Transit) &rarr; Bước 2 nhận kho đích (cộng on_hand kho đích, ghi nhận hao hụt/hư hỏng nếu có).
        </p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Số Phiếu Chuyển</th>
              <th>Kho Nguồn</th>
              <th></th>
              <th>Kho Đích</th>
              <th>Trạng Thái</th>
              <th>Xuất / Nhận</th>
              <th>Người Lập</th>
              <th style={{ textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => {
              const badgeClass = getTransferBadgeClass(t.status);

              return (
                <tr key={t.id}>
                  <td className="font-mono" style={{ color: 'var(--transit-indigo)', fontWeight: 700 }}>
                    {t.transfer_number}
                  </td>
                  <td>
                    <span className="badge badge-indigo">{t.source_warehouse_name}</span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>&rarr;</td>
                  <td>
                    <span className="badge badge-purple">{t.target_warehouse_name}</span>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{t.status}</span>
                  </td>
                  <td>{t.total_dispatched} / {t.total_received}</td>
                  <td style={{ fontSize: 13 }}>{t.created_by_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {t.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onDispatchTransfer(t.id)}
                        >
                          <Send size={14} />
                          Bước 1: Xuất Kho (Dispatch)
                        </button>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => onReceiveTransfer(t.id)}
                        >
                          <CheckCircle size={14} />
                          Bước 2: Nhận Hàng (Receive)
                        </button>
                      )}
                      {t.status === 'RECEIVED' && (
                        <span style={{ fontSize: 12, color: 'var(--invariant-emerald)', fontWeight: 600 }}>
                          ✓ Đã Nhập Kho Đích
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

export default TransfersTab;
