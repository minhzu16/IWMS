import React from 'react';
import { Award, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { Supplier, SupplierPerformance } from '../../api/client.js';
import { suppliersGridStyle, supplierCardButtonStyle, metricCardStyle } from './styles.js';

export interface SuppliersTabProps {
  suppliers: Supplier[];
  selectedSupplierPerf: SupplierPerformance | null;
  onSelectSupplier: (supplierId: number) => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  selectedSupplierPerf,
  onSelectSupplier,
}) => {
  return (
    <div style={suppliersGridStyle}>
      {/* Supplier List */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Danh Sách Nhà Cung Cấp Đối Tác</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {suppliers.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => onSelectSupplier(s.id)}
              style={supplierCardButtonStyle(selectedSupplierPerf?.supplierId === s.id)}
            >
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: 12, color: 'var(--transit-indigo)', fontWeight: 700 }}>
                    {s.code}
                  </span>
                  <h4 style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</h4>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Lead time: <strong>{s.default_lead_time_days || 7} ngày</strong> | {s.email || 'b2b@supplier.vn'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng chi mua:</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--invariant-emerald)' }}>
                  ${Number(s.total_spend || 45000).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Performance Scorecard */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Chỉ Số Hiệu Năng NCC (Supplier Scorecard)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Đánh giá dựa trên PO lịch sử, thời gian giao hàng thực tế và tỷ lệ hàng hư hỏng
            </p>
          </div>
          {selectedSupplierPerf && (
            <span
              className={`badge ${
                selectedSupplierPerf.rating === 'EXCELLENT'
                  ? 'badge-emerald'
                  : 'badge-amber'
              }`}
              style={{ fontSize: 12 }}
            >
              <Award size={14} />
              Xếp loại: {selectedSupplierPerf.rating}
            </span>
          )}
        </div>

        {selectedSupplierPerf ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div style={metricCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tỷ Lệ Giao Đúng Hạn</span>
                  <Clock size={16} color="var(--invariant-emerald)" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--invariant-emerald)' }}>
                  {selectedSupplierPerf.onTimeRate}%
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Dựa trên ngày giao dự kiến vs thực tế
                </p>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill Rate (Đáp ứng đặt hàng)</span>
                  <CheckCircle size={16} color="var(--telemetry-cyan)" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--telemetry-cyan)' }}>
                  {selectedSupplierPerf.fillRate}%
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Số lượng thực nhận / số lượng đặt
                </p>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thời Gian Giao Trung Bình</span>
                  <Clock size={16} color="var(--transit-indigo)" />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--transit-indigo)' }}>
                  {selectedSupplierPerf.avgLeadTimeDays} Ngày
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Lead time thực tế từ lúc duyệt PO
                </p>
              </div>

              <div style={metricCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tỷ Lệ Hàng Hư / Lỗi</span>
                  <AlertTriangle size={16} color={selectedSupplierPerf.damageRate > 2 ? 'var(--quarantine-crimson)' : 'var(--invariant-emerald)'} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: selectedSupplierPerf.damageRate > 2 ? 'var(--quarantine-crimson)' : 'var(--invariant-emerald)' }}>
                  {selectedSupplierPerf.damageRate}%
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Hàng hư hỏng phát hiện lúc kiểm nhận
                </p>
              </div>
            </div>

            <div style={metricCardStyle}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng Giá Trị Chi Tiêu Mua Hàng:</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                ${Number(selectedSupplierPerf.totalSpend || 0).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Chọn nhà cung cấp để xem scorecard</p>
        )}
      </div>
    </div>
  );
};

export default SuppliersTab;
