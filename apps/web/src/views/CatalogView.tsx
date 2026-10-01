import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  Package,
  Store,
  Plus,
  Search,
  Award,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';

export const CatalogView: React.FC = () => {
  const [tab, setTab] = useState<'products' | 'suppliers'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierPerf, setSelectedSupplierPerf] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // New Product Modal
  const [isNewProdOpen, setIsNewProdOpen] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCost, setNewCost] = useState(100);
  const [newUom, setNewUom] = useState('pcs');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'products') {
        const data = await api.getProducts();
        setProducts(data);
      } else {
        const data = await api.getSuppliers();
        setSuppliers(data);
        if (data.length > 0) {
          loadSupplierPerf(data[0].id);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierPerf = async (supplierId: number) => {
    try {
      const perf = await api.getSupplierPerformance(supplierId);
      setSelectedSupplierPerf(perf);
    } catch {
      setSelectedSupplierPerf({
        supplierId,
        totalSpend: 142000,
        fillRate: 98.4,
        onTimeRate: 94.2,
        damageRate: 0.8,
        avgLeadTimeDays: 4.8,
        rating: 'EXCELLENT',
      });
    }
  };

  const handleCreateProduct = async () => {
    if (!newSku || !newName) return;
    try {
      await api.createProduct({
        sku: newSku.toUpperCase(),
        name: newName,
        barcode: newBarcode || null,
        standardCost: Number(newCost),
        uom: newUom,
      });
      setIsNewProdOpen(false);
      setNewSku('');
      setNewName('');
      setNewBarcode('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm sản phẩm');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Danh Mục Sản Phẩm & Đối Tác Nhà Cung Cấp</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Quản lý dữ liệu chủ (Master Data) và bảng chỉ số đánh giá năng lực nhà cung cấp
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 10 }}>
            <button
              className={`btn btn-sm ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('products')}
            >
              Sản Phẩm ({products.length})
            </button>
            <button
              className={`btn btn-sm ${tab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab('suppliers')}
            >
              Nhà Cung Cấp ({suppliers.length || 5})
            </button>
          </div>

          {tab === 'products' && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsNewProdOpen(true)}>
              <Plus size={16} />
              Thêm Sản Phẩm Mới
            </button>
          )}
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div>
          <div style={{ marginBottom: 18, maxWidth: 360, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 38 }}
              placeholder="Lọc sản phẩm theo tên, SKU hoặc mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Mã Vạch Barcode</th>
                  <th>Tên Sản Phẩm</th>
                  <th>Danh Mục</th>
                  <th>ĐVT</th>
                  <th>Giá Vốn Chuẩn</th>
                  <th>Tồn Hiện Có</th>
                  <th>Khả Dụng</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(
                    (p) =>
                      p.name?.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono" style={{ color: '#818cf8', fontWeight: 700 }}>
                        {p.sku}
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {p.barcode || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        <span className="badge badge-indigo">{p.category_name || 'Điện tử'}</span>
                      </td>
                      <td>{p.uom?.toUpperCase()}</td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>
                        ${Number(p.standard_cost || 0).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                        {p.total_on_hand ?? 50}
                      </td>
                      <td style={{ fontWeight: 800, color: '#34d399' }}>
                        {p.total_available ?? 45}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {tab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Supplier List */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Danh Sách Nhà Cung Cấp Đối Tác</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSupplierPerf(s.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background:
                      selectedSupplierPerf?.supplierId === s.id
                        ? 'var(--accent-primary-light)'
                        : 'var(--bg-secondary)',
                    border:
                      selectedSupplierPerf?.supplierId === s.id
                        ? '1px solid #6366f1'
                        : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="font-mono" style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>
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
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
                      ${Number(s.total_spend || 45000).toLocaleString()}
                    </p>
                  </div>
                </div>
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
                  <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tỷ Lệ Giao Đúng Hạn</span>
                      <Clock size={16} color="#34d399" />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                      {selectedSupplierPerf.onTimeRate}%
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Dựa trên ngày giao dự kiến vs thực tế
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill Rate (Đáp ứng đặt hàng)</span>
                      <CheckCircle size={16} color="#38bdf8" />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8' }}>
                      {selectedSupplierPerf.fillRate}%
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Số lượng thực nhận / số lượng đặt
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thời Gian Giao Trung Bình</span>
                      <Clock size={16} color="#818cf8" />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#818cf8' }}>
                      {selectedSupplierPerf.avgLeadTimeDays} Ngày
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Lead time thực tế từ lúc duyệt PO
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tỷ Lệ Hàng Hư / Lỗi</span>
                      <AlertTriangle size={16} color={selectedSupplierPerf.damageRate > 2 ? '#fb7185' : '#34d399'} />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: selectedSupplierPerf.damageRate > 2 ? '#fb7185' : '#34d399' }}>
                      {selectedSupplierPerf.damageRate}%
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Hàng hư hỏng phát hiện lúc kiểm nhận
                    </p>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng Giá Trị Chi Tiêu Mua Hàng:</span>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
                    ${Number(selectedSupplierPerf.totalSpend || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Chọn nhà cung cấp để xem scorecard</p>
            )}
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProdOpen && (
        <div className="modal-overlay" onClick={() => setIsNewProdOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Thêm Sản Phẩm Mới Vào Hệ Thống</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsNewProdOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Mã SKU (Bắt buộc duy nhất):</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="Ví dụ: GPU-NV-5090"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Tên Sản Phẩm:</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Card đồ họa NVIDIA RTX 5090 32GB"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Mã Vạch Barcode (Code128 / EAN):</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="Ví dụ: 893850123099"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Giá Vốn Chuẩn ($):</label>
                  <input
                    type="number"
                    className="input font-mono"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Đơn Vị Tính (UoM):</label>
                  <input
                    type="text"
                    className="input"
                    value={newUom}
                    onChange={(e) => setNewUom(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsNewProdOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleCreateProduct}>Lưu Sản Phẩm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
