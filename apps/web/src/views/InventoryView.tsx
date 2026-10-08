import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  Layers,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Sliders,
  X,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  selectedWarehouse: number | null;
}

export const InventoryView: React.FC<Props> = ({ selectedWarehouse }) => {
  const [subTab, setSubTab] = useState<'levels' | 'ledger' | 'asof'>('levels');
  const [levels, setLevels] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 16));
  const [asOfData, setAsOfData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [loading, setLoading] = useState(false);

  // Adjustment Modal State
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState<number | null>(null);
  const [adjProductName, setAdjProductName] = useState('');
  const [adjWarehouseId, setAdjWarehouseId] = useState<number>(1);
  const [adjDelta, setAdjDelta] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('Kiểm kê điều chỉnh chênh lệch thực tế');
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (subTab === 'levels') {
      loadLevels();
    } else if (subTab === 'ledger') {
      loadMovements();
    } else if (subTab === 'asof') {
      loadAsOf();
    }
  }, [subTab, selectedWarehouse, filterLowStock]);

  const loadLevels = async () => {
    setLoading(true);
    try {
      const data = await api.getLevels({
        warehouseId: selectedWarehouse || undefined,
        lowStock: filterLowStock,
      });
      setLevels(data);
    } catch {
      // Fallback sample data
      setLevels([
        {
          product_id: 1,
          sku: 'CPU-INT-14700K',
          product_name: 'Intel Core i7-14700K 20-Core',
          barcode: '893850123001',
          uom: 'box',
          warehouse_code: 'WH-NORTH',
          warehouse_name: 'Kho Tổng Miền Bắc',
          on_hand: 50,
          reserved: 5,
          available: 45,
          damaged: 0,
          avg_cost: 380,
          reorder_point: 15,
        },
        {
          product_id: 4,
          sku: 'SSD-SAM-990P-2TB',
          product_name: 'Samsung 990 PRO NVMe 2TB',
          barcode: '893850123004',
          uom: 'pcs',
          warehouse_code: 'WH-NORTH',
          warehouse_name: 'Kho Tổng Miền Bắc',
          on_hand: 80,
          reserved: 0,
          available: 80,
          damaged: 2,
          avg_cost: 172.5,
          reorder_point: 20,
        },
        {
          product_id: 5,
          sku: 'GPU-RTX-4080S',
          product_name: 'ASUS TUF RTX 4080 SUPER 16GB',
          barcode: '893850123005',
          uom: 'box',
          warehouse_code: 'WH-SOUTH',
          warehouse_name: 'Kho Phân Phối Miền Nam',
          on_hand: 30,
          reserved: 2,
          available: 28,
          damaged: 0,
          avg_cost: 990,
          reorder_point: 10,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const res = await api.getMovements({
        warehouseId: selectedWarehouse || undefined,
        limit: 50,
      });
      setMovements(res.data);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAsOf = async () => {
    setLoading(true);
    try {
      const data = await api.getAsOf(new Date(asOfDate).toISOString(), selectedWarehouse || undefined);
      setAsOfData(data);
    } catch {
      setAsOfData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjustment = (prod: any) => {
    setAdjProductId(prod.product_id);
    setAdjProductName(prod.product_name);
    setAdjWarehouseId(prod.warehouse_id || selectedWarehouse || 1);
    setAdjDelta(1);
    setAdjReason('Kiểm kê bổ sung định kỳ');
    setIsAdjOpen(true);
    setAdjSuccess(null);
  };

  const handleExecuteAdjustment = async () => {
    if (!adjProductId || adjDelta === 0) return;
    try {
      await api.createAdjustment({
        productId: adjProductId,
        warehouseId: adjWarehouseId,
        delta: adjDelta,
        reason: adjReason,
      });
      setAdjSuccess('Bút toán điều chỉnh đã được ghi thành công vào Sổ Cái!');
      loadLevels();
      setTimeout(() => {
        setIsAdjOpen(false);
        setAdjSuccess(null);
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Lỗi điều chỉnh tồn kho');
    }
  };

  const filteredLevels = levels.filter(
    (l) =>
      l.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.sku?.toLowerCase().includes(search.toLowerCase()) ||
      l.barcode?.includes(search),
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* View Header with Sub-tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Quản trị tồn kho & sổ cái biến động
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Nguồn sự thật: Sổ cái bất biến (Append-Only) · Số dư sống (Stock Levels) cập nhật nguyên tử
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', background: 'var(--deck-panel)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', gap: 3 }}>
          <button
            className={`btn btn-sm ${subTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('levels')}
          >
            Số dư sống
          </button>
          <button
            className={`btn btn-sm ${subTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('ledger')}
          >
            Sổ cái biến động
          </button>
          <button
            className={`btn btn-sm ${subTab === 'asof' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('asof')}
          >
            Tồn tại thời điểm (As-of)
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE LEVELS */}
      {subTab === 'levels' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: 34 }}
                  placeholder="Tìm theo tên, SKU hoặc mã vạch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                />
                <span style={{ color: filterLowStock ? 'var(--safety-amber)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  Chỉ hiện hàng dưới điểm đặt hàng
                </span>
              </label>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Hiển thị <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{filteredLevels.length}</strong> SKU
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm / SKU</th>
                  <th>Kho hàng</th>
                  <th style={{ textAlign: 'right' }}>Thực có (On Hand)</th>
                  <th style={{ textAlign: 'right' }}>Đã giữ chỗ</th>
                  <th style={{ textAlign: 'right' }}>Khả dụng bán</th>
                  <th style={{ textAlign: 'right' }}>Hàng lỗi</th>
                  <th style={{ textAlign: 'right' }}>Giá vốn bình quân</th>
                  <th style={{ textAlign: 'right' }}>Tổng giá trị</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLevels.map((item, idx) => {
                  const isLow = Number(item.available) <= Number(item.reorder_point || 0);
                  const totalVal = Number(item.on_hand) * Number(item.avg_cost || 0);
                  return (
                    <tr key={idx} style={{ background: isLow ? 'var(--safety-amber-subtle)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.product_name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                          <span className="font-mono" style={{ fontSize: 11, color: 'var(--telemetry-cyan)' }}>{item.sku}</span>
                          {item.barcode && (
                            <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              [{item.barcode}]
                            </span>
                          )}
                          {isLow && (
                            <span className="badge badge-amber font-mono" style={{ fontSize: 10, padding: '1px 5px' }}>
                              Dưới ngưỡng ({item.reorder_point})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-slate">{item.warehouse_name || item.warehouse_code}</span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--telemetry-cyan)', textAlign: 'right' }}>
                        {item.on_hand} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{item.uom}</span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 600, color: 'var(--safety-amber)', textAlign: 'right' }}>
                        {item.reserved}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: isLow ? 'var(--safety-amber)' : 'var(--invariant-emerald)', textAlign: 'right' }}>
                        {item.available}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>
                        {Number(item.damaged) > 0 ? (
                          <span className="badge badge-rose font-mono">{item.damaged} lỗi</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 600, textAlign: 'right' }}>
                        ${Number(item.avg_cost || 0).toFixed(2)}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                        ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAdjustment(item)}
                        >
                          <Sliders size={13} />
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: APPEND-ONLY LEDGER */}
      {subTab === 'ledger' && (
        <div>
          <div style={{ background: 'var(--deck-panel)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="var(--invariant-emerald)" />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Bảng <code>stock_movements</code> kích hoạt <strong>trigger cấm UPDATE & DELETE</strong>. Mọi sự biến động đều được lưu vết tuần tự kèm theo số dư tức thời tại thời điểm giao dịch (<code>balance_after</code>).
            </p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã số</th>
                  <th>Thời gian</th>
                  <th>Sản phẩm / Kho</th>
                  <th>Loại bút toán</th>
                  <th style={{ textAlign: 'right' }}>Biến động delta</th>
                  <th style={{ textAlign: 'right' }}>Số dư sau</th>
                  <th>Chứng từ gốc</th>
                  <th>Người ghi sổ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isIn = Number(m.qty_on_hand_delta) > 0;
                  return (
                    <tr key={m.id}>
                      <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{m.id}</td>
                      <td className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {new Date(m.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.warehouse_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-cyan font-mono">{m.movement_type}</span>
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: isIn ? 'var(--invariant-emerald)' : 'var(--quarantine-crimson)', textAlign: 'right' }}>
                        {isIn ? `+${m.qty_on_hand_delta}` : m.qty_on_hand_delta}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                        {m.balance_after}
                      </td>
                      <td>
                        <span className="badge badge-slate font-mono">{m.source_doc_type} #{m.source_doc_id}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{m.created_by_name}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AS-OF DATE EXPLORER */}
      {subTab === 'asof' && (
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
                  type="datetime-local"
                  className="input font-mono"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={loadAsOf} disabled={loading}>
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
      )}

      {/* Adjustment Modal */}
      {isAdjOpen && (
        <div className="modal-overlay" onClick={() => setIsAdjOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tạo bút toán điều chỉnh tồn kho</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAdjOpen(false)} aria-label="Đóng">
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Sản phẩm: <strong style={{ color: 'var(--text-primary)' }}>{adjProductName}</strong>
            </p>

            {adjSuccess && (
              <div style={{ padding: 10, background: 'var(--invariant-emerald-subtle)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 12, color: 'var(--invariant-emerald)', fontSize: 12 }}>
                {adjSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho hàng:</label>
                <select
                  className="select"
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(Number(e.target.value))}
                >
                  <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                  <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                  <option value={3}>Kho Trung Chuyển Miền Trung</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                  Số lượng thay đổi (dương: nhập thêm, âm: trừ bớt):
                </label>
                <input
                  type="number"
                  className="input font-mono"
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(Number(e.target.value))}
                  placeholder="Ví dụ: 5 hoặc -3"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                  Lý do điều chỉnh (Audit Reason):
                </label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Ghi rõ lý do điều chỉnh để lưu vết vào Audit Log..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsAdjOpen(false)}>
                  Hủy
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleExecuteAdjustment}>
                  Ghi vào sổ cái ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
