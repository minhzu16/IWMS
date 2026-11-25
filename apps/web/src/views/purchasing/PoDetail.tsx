import React from 'react';
import { PackageCheck } from 'lucide-react';
import type { UserRole } from '@iwms/shared';
import type { PurchaseOrderDetail } from './types.js';
import { stepperContainerStyle, stepCircleStyle, emptyDetailCardStyle, PO_STEPS } from './styles.js';

export interface PoDetailProps {
  selectedPO: PurchaseOrderDetail | null;
  currentRole: UserRole;
  onTransition: (action: 'submit' | 'approve' | 'reject') => void;
  onOpenReceipt: () => void;
}

export const PoDetail: React.FC<PoDetailProps> = ({
  selectedPO,
  currentRole,
  onTransition,
  onOpenReceipt,
}) => {
  if (!selectedPO) {
    return (
      <div className="card" style={emptyDetailCardStyle}>
        <p style={{ color: 'var(--text-muted)' }}>Chọn đơn mua hàng để xem chi tiết</p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header with State Machine Pipeline Visualizer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 18, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <h3 style={{ fontSize: 19, fontWeight: 800 }}>{selectedPO.po_number}</h3>
            <span className="badge badge-indigo">Phiên bản {selectedPO.version}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            NCC: <strong>{selectedPO.supplier_name}</strong> | Kho đích: <strong>{selectedPO.warehouse_name}</strong>
          </p>
        </div>

        {/* State Machine Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedPO.status === 'DRAFT' && ['ADMIN', 'MANAGER', 'PURCHASING'].includes(currentRole) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onTransition('submit')}>
              Gửi Phê Duyệt (Submit)
            </button>
          )}

          {selectedPO.status === 'SUBMITTED' && ['ADMIN', 'MANAGER'].includes(currentRole) && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onTransition('reject')}>
                Từ Chối
              </button>
              <button type="button" className="btn btn-success btn-sm" onClick={() => onTransition('approve')}>
                Phê Duyệt Đơn (Approve)
              </button>
            </>
          )}

          {(selectedPO.status === 'APPROVED' || selectedPO.status === 'PARTIALLY_RECEIVED') &&
            ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(currentRole) && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onOpenReceipt}>
                <PackageCheck size={16} />
                Kiểm Nhận Hàng Vào Kho (Goods Receipt)
              </button>
            )}
        </div>
      </div>

      {/* State Machine Stepper */}
      <div style={stepperContainerStyle}>
        {PO_STEPS.map((s, idx) => {
          const isPassed =
            selectedPO.status === s ||
            (s === 'DRAFT' && selectedPO.status !== 'DRAFT') ||
            (s === 'SUBMITTED' && ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(selectedPO.status)) ||
            (s === 'APPROVED' && ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(selectedPO.status)) ||
            (s === 'PARTIALLY_RECEIVED' && selectedPO.status === 'RECEIVED');

          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={stepCircleStyle(isPassed)}>
                {idx + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: isPassed ? 700 : 500, color: isPassed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s}
              </span>
            </div>
          );
        })}
      </div>

      {/* Line Items Table */}
      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Danh Sách Sản Phẩm Trong Đơn</h4>
      <div className="table-container" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Mã SKU</th>
              <th>Tên Sản Phẩm</th>
              <th>Số Lượng Đặt</th>
              <th>Đã Nhận</th>
              <th>Đơn Giá ($)</th>
              <th>Thành Tiền ($)</th>
            </tr>
          </thead>
          <tbody>
            {selectedPO.lines?.map((line) => {
              const total = line.qty_ordered * line.unit_price;
              return (
                <tr key={line.id}>
                  <td className="font-mono" style={{ color: 'var(--transit-indigo)', fontWeight: 600 }}>{line.sku}</td>
                  <td style={{ fontWeight: 600 }}>{line.product_name}</td>
                  <td style={{ fontWeight: 700 }}>{line.qty_ordered} {line.uom}</td>
                  <td style={{ fontWeight: 700, color: line.qty_received >= line.qty_ordered ? 'var(--invariant-emerald)' : 'var(--safety-amber)' }}>
                    {line.qty_received}
                  </td>
                  <td>${line.unit_price?.toFixed(2)}</td>
                  <td style={{ fontWeight: 700 }}>${total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Goods Receipts Audit History */}
      {selectedPO.receipts && selectedPO.receipts.length > 0 && (
        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Lịch Sử Các Đợt Nhập Hàng (Goods Receipts)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedPO.receipts.map((gr) => (
              <div
                key={gr.id}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--invariant-emerald)' }}>{gr.gr_number}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Nhận bởi: <strong>{gr.received_by_name}</strong> lúc {new Date(gr.received_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className="badge badge-emerald">Đã Ghi Bút Toán Sổ Cái</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PoDetail;
