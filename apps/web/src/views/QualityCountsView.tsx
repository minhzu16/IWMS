import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  AlertOctagon,
  ClipboardList,
  Plus,
  CheckCircle,
  XCircle,
  X,
  Sliders,
} from 'lucide-react';
import { UserRole } from '@iwms/shared';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const QualityCountsView: React.FC<Props> = ({ currentRole, selectedWarehouse }) => {
  const [activeTab, setActiveTab] = useState<'damages' | 'counts'>('damages');
  const [damages, setDamages] = useState<any[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Damage Report Modal
  const [isDamageOpen, setIsDamageOpen] = useState(false);
  const [dmgWarehouseId, setDmgWarehouseId] = useState<number>(1);
  const [dmgLines, setDmgLines] = useState<any[]>([
    { productId: 4, qty: 2, reason: 'Rách bao bì niêm phong khi vận chuyển', disposition: 'WRITE_OFF' },
  ]);

  // New Cycle Count Modal
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [countWarehouseId, setCountWarehouseId] = useState<number>(1);
  const [countLines, setCountLines] = useState<any[]>([
    { productId: 1, countedQty: 49 },
    { productId: 4, countedQty: 80 },
  ]);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'damages') {
        const data = await api.getDamages();
        setDamages(data);
      } else {
        const data = await api.getCounts();
        setCounts(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDamage = async (id: number) => {
    try {
      await api.approveDamageReport(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi duyệt báo cáo');
    }
  };

  const handleApproveCount = async (id: number) => {
    try {
      await api.approveCount(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi duyệt phiếu kiểm kê');
    }
  };

  const handleCreateDamage = async () => {
    try {
      await api.createDamageReport({
        warehouseId: dmgWarehouseId,
        lines: dmgLines.map((l) => ({
          productId: Number(l.productId),
          qty: Number(l.qty),
          reason: l.reason,
          disposition: l.disposition,
        })),
      });
      setIsDamageOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo báo cáo');
    }
  };

  const handleCreateCount = async () => {
    try {
      await api.createCount({
        warehouseId: countWarehouseId,
        lines: countLines.map((l) => ({
          productId: Number(l.productId),
          countedQty: Number(l.countedQty),
        })),
      });
      setIsCountOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo phiếu kiểm kê');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Kiểm Soát Hàng Hư Hỏng & Kiểm Kê Định Kỳ</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Quản trị khu vực cách ly hàng lỗi (Quarantine) · Xử lý Write-Off / Hoàn trả NCC · Bù trừ chênh lệch kiểm kê (Cycle Count)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 10 }}>
            <button
              className={`btn btn-sm ${activeTab === 'damages' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('damages')}
            >
              Hàng Hư Hỏng (Damaged)
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'counts' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('counts')}
            >
              Kiểm Kê Kho (Cycle Count)
            </button>
          </div>

          {activeTab === 'damages' ? (
            <button className="btn btn-danger btn-sm" onClick={() => setIsDamageOpen(true)}>
              <Plus size={16} />
              Báo Hàng Hư Hỏng
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setIsCountOpen(true)}>
              <Plus size={16} />
              Tạo Phiếu Kiểm Kê Mới
            </button>
          )}
        </div>
      </div>

      {/* DAMAGES VIEW */}
      {activeTab === 'damages' && (
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
                    <td className="font-mono" style={{ color: '#fb7185', fontWeight: 700 }}>
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
                    <td style={{ fontWeight: 700, color: '#fb7185' }}>{d.total_qty || 2} món</td>
                    <td style={{ fontSize: 13 }}>{d.created_by_name}</td>
                    <td style={{ fontSize: 13 }}>{d.approved_by_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(d.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {d.status === 'REPORTED' && ['ADMIN', 'MANAGER'].includes(currentRole) ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveDamage(d.id)}
                        >
                          <CheckCircle size={14} />
                          Duyệt Xử Lý (Hủy / Trả NCC)
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
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
      )}

      {/* CYCLE COUNTS VIEW */}
      {activeTab === 'counts' && (
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
                    <td className="font-mono" style={{ color: '#818cf8', fontWeight: 700 }}>
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
                    <td style={{ fontWeight: 700, color: Number(c.total_variance) !== 0 ? '#fbbf24' : '#34d399' }}>
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
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveCount(c.id)}
                        >
                          <CheckCircle size={14} />
                          Duyệt & Bù Trừ Vào Sổ Cái
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
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
      )}

      {/* New Damage Report Modal */}
      {isDamageOpen && (
        <div className="modal-overlay" onClick={() => setIsDamageOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fb7185' }}>Báo Cáo Hàng Hư Hỏng Mới (Damage Report)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsDamageOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Hàng hóa báo hư sẽ ngay lập tức được chuyển từ số dư <code>on_hand</code> sang số dư cách ly <code>damaged</code> để tránh việc bán nhầm.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Hàng:</label>
                <select
                  className="select"
                  value={dmgWarehouseId}
                  onChange={(e) => setDmgWarehouseId(Number(e.target.value))}
                >
                  <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                  <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Sản phẩm:</label>
                <select
                  className="select"
                  value={dmgLines[0]?.productId}
                  onChange={(e) => setDmgLines([{ ...dmgLines[0], productId: Number(e.target.value) }])}
                >
                  <option value={4}>Samsung 990 PRO NVMe 2TB</option>
                  <option value={1}>Intel Core i7-14700K 20-Core</option>
                  <option value={5}>ASUS TUF RTX 4080 SUPER 16GB</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Số lượng:</label>
                  <input
                    type="number"
                    className="input font-mono"
                    value={dmgLines[0]?.qty}
                    onChange={(e) => setDmgLines([{ ...dmgLines[0], qty: Number(e.target.value) }])}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Hướng xử lý mong muốn:</label>
                  <select
                    className="select"
                    value={dmgLines[0]?.disposition}
                    onChange={(e) => setDmgLines([{ ...dmgLines[0], disposition: e.target.value }])}
                  >
                    <option value="WRITE_OFF">Hủy Hàng (Write-Off)</option>
                    <option value="RETURN_TO_SUPPLIER">Trả Lại Nhà Cung Cấp (Return)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Lý do hư hỏng:</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={dmgLines[0]?.reason}
                  onChange={(e) => setDmgLines([{ ...dmgLines[0], reason: e.target.value }])}
                  placeholder="Ghi rõ tình trạng móp méo, vỡ, ẩm mốc..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsDamageOpen(false)}>Hủy</button>
                <button className="btn btn-danger" onClick={handleCreateDamage}>Ghi Nhận Hàng Lỗi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Cycle Count Modal */}
      {isCountOpen && (
        <div className="modal-overlay" onClick={() => setIsCountOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Phiếu Kiểm Kê Định Kỳ (Cycle Count)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsCountOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Hàng Cần Kiểm Kê:</label>
                <select
                  className="select"
                  value={countWarehouseId}
                  onChange={(e) => setCountWarehouseId(Number(e.target.value))}
                >
                  <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                  <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Số lượng thực tế đếm được:</label>
                {countLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {line.productId === 1 ? 'Intel Core i7-14700K' : 'Samsung 990 PRO 2TB'}
                    </span>
                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Số thực đếm"
                      value={line.countedQty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCountLines((prev) => prev.map((p, i) => (i === idx ? { ...p, countedQty: val } : p)));
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsCountOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleCreateCount}>Lập Phiếu Đếm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
