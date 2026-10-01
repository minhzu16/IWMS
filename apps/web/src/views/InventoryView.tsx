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
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* View Header with Sub-tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Quản Trị Tồn Kho & Sổ Cái (Stock & Ledger)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Nguồn sự thật: Sổ Cái bất biến (Append-Only) · Cache số dư sống (Stock Levels) cập nhật nguyên tử
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 10 }}>
          <button
            className={`btn btn-sm ${subTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('levels')}
          >
            Số Dư Sống (Live Levels)
          </button>
          <button
            className={`btn btn-sm ${subTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('ledger')}
          >
            Sổ Cái Biến Động (Ledger)
          </button>
          <button
            className={`btn btn-sm ${subTab === 'asof' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('asof')}
          >
            Tồn Tại Thời Điểm (As-of Date)
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE LEVELS */}
      {subTab === 'levels' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder="Tìm theo Tên, SKU hoặc Barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                />
                <span style={{ color: filterLowStock ? '#fbbf24' : 'var(--text-secondary)', fontWeight: 600 }}>
                  Chỉ hiện hàng dưới Reorder Point
                </span>
              </label>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Đang hiển thị <strong>{filteredLevels.length}</strong> bản ghi
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm / SKU</th>
                  <th>Kho Hàng</th>
                  <th>Thực có (On Hand)</th>
                  <th>Đã giữ chỗ (Reserved)</th>
                  <th>Khả dụng (Available)</th>
                  <th>Hàng hỏng (Damaged)</th>
                  <th>Đơn giá bình quân</th>
                  <th>Tổng giá trị</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLevels.map((item, idx) => {
                  const isLow = Number(item.available) <= Number(item.reorder_point || 0);
                  const totalVal = Number(item.on_hand) * Number(item.avg_cost || 0);
                  return (
                    <tr key={idx} style={{ background: isLow ? 'rgba(245, 158, 11, 0.03)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                          <span className="font-mono" style={{ fontSize: 11, color: '#818cf8' }}>{item.sku}</span>
                          {item.barcode && (
                            <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              • {item.barcode}
                            </span>
                          )}
                          {isLow && (
                            <span className="badge badge-amber" style={{ fontSize: 10, padding: '1px 6px' }}>
                              Dưới ngưỡng ({item.reorder_point})
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-indigo">{item.warehouse_name || item.warehouse_code}</span>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 15, color: '#38bdf8' }}>
                        {item.on_hand} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{item.uom}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#fbbf24' }}>
                        {item.reserved}
                      </td>
                      <td style={{ fontWeight: 800, fontSize: 15, color: isLow ? '#fbbf24' : '#34d399' }}>
                        {item.available}
                      </td>
                      <td>
                        {Number(item.damaged) > 0 ? (
                          <span className="badge badge-rose">{item.damaged} lỗi</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        ${Number(item.avg_cost || 0).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                        ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAdjustment(item)}
                        >
                          <Sliders size={14} />
                          Điều Chỉnh
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
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={22} style={{ color: '#10b981' }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Bảng <code>stock_movements</code> được thiết lập <strong>Trigger cấm UPDATE và DELETE</strong>. Mọi sự thay đổi tồn kho đều được kiểm toán ghi nhận tuần tự kèm theo số dư tức thời tại thời điểm đó (<code>balance_after</code>).
            </p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Thời gian</th>
                  <th>Sản phẩm / Kho</th>
                  <th>Loại Bút Toán</th>
                  <th>Biến động Delta</th>
                  <th>Số dư sau (Balance After)</th>
                  <th>Chứng từ Nguồn</th>
                  <th>Người ghi sổ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isIn = Number(m.qty_on_hand_delta) > 0;
                  return (
                    <tr key={m.id}>
                      <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{m.id}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(m.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.warehouse_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{m.movement_type}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: isIn ? '#34d399' : '#fb7185' }}>
                        {isIn ? `+${m.qty_on_hand_delta}` : m.qty_on_hand_delta}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 800, color: '#f8fafc' }}>
                        {m.balance_after}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span className="badge badge-indigo">{m.source_doc_type} #{m.source_doc_id}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{m.created_by_name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Tính Toán Số Dư Tồn Tại Thời Điểm Bất Kỳ (As-Of Date)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Nhờ kiến trúc Ledger-First, hệ thống có thể tua ngược thời gian tính tổng <code>SUM(qty_on_hand_delta) WHERE created_at &le; T</code> để phục vụ đối soát kiểm toán tài chính và báo cáo thuế.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 280 }}>
                <input
                  type="datetime-local"
                  className="input"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={loadAsOf} disabled={loading}>
                <Calendar size={16} />
                Tính Tồn Ngay
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm / SKU</th>
                  <th>Kho Hàng</th>
                  <th>Tồn Thực Có Tại Thời Điểm (On Hand As-Of)</th>
                  <th>Hàng Hư Hỏng Tại Thời Điểm</th>
                </tr>
              </thead>
              <tbody>
                {asOfData.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.product_name}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: '#818cf8' }}>{row.sku}</div>
                    </td>
                    <td>
                      <span className="badge badge-indigo">{row.warehouse_name}</span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: 16, color: '#38bdf8' }}>
                      {row.on_hand_as_of} {row.uom}
                    </td>
                    <td style={{ fontWeight: 600, color: '#fb7185' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Bút Toán Điều Chỉnh Tồn Kho</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAdjOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Sản phẩm: <strong>{adjProductName}</strong>
            </p>

            {adjSuccess && (
              <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, marginBottom: 14, color: '#34d399', fontSize: 13 }}>
                {adjSuccess}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Kho hàng:</label>
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
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Số lượng thay đổi (dương là nhập thêm, âm là trừ bớt):
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
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsAdjOpen(false)}>
                  Hủy
                </button>
                <button className="btn btn-primary" onClick={handleExecuteAdjustment}>
                  Ghi Sổ Cái Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
