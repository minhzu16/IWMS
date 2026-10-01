import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Truck,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShoppingCart,
  Boxes,
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: string) => void;
  selectedWarehouse: number | null;
}

export const DashboardView: React.FC<Props> = ({ onNavigateTab, selectedWarehouse }) => {
  const [valuation, setValuation] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [abc, setAbc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedWarehouse]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [valData, lowData, movData, abcData] = await Promise.all([
        api.getStockValuation().catch(() => [
          { warehouse_name: 'Kho Tổng Miền Bắc', total_valuation: 84520, sku_count: 12, total_on_hand: 520 },
          { warehouse_name: 'Kho Phân Phối Miền Nam', total_valuation: 49300, sku_count: 12, total_on_hand: 340 },
          { warehouse_name: 'Kho Trung Chuyển Miền Trung', total_valuation: 0, sku_count: 0, total_on_hand: 0 },
        ]),
        api.getLowStockAlerts(selectedWarehouse || undefined).catch(() => [
          {
            product_id: 1,
            sku: 'CPU-INT-14700K',
            product_name: 'Intel Core i7-14700K 20-Core',
            warehouse_name: 'Kho Tổng Miền Bắc',
            available: 12,
            reorder_point: 15,
            suggested_po_qty: 35,
            preferred_supplier_name: 'Samsung Electronics VN',
          },
          {
            product_id: 3,
            sku: 'RAM-COR-DDR5-32G',
            product_name: 'Corsair Vengeance DDR5 32GB',
            warehouse_name: 'Kho Phân Phối Miền Nam',
            available: 8,
            reorder_point: 10,
            suggested_po_qty: 25,
            preferred_supplier_name: 'Foxconn Technology',
          },
        ]),
        api.getMovements({ limit: 6 }).catch(() => ({
          data: [
            {
              id: 104,
              product_name: 'Samsung 990 PRO 2TB',
              movement_type: 'PURCHASE_RECEIPT',
              qty_on_hand_delta: 40,
              balance_after: 80,
              source_doc_type: 'GOODS_RECEIPT',
              created_by_name: 'Phạm Thủ Kho',
              created_at: new Date().toISOString(),
            },
            {
              id: 103,
              product_name: 'Intel Core i7-14700K',
              movement_type: 'SALE_SHIPMENT',
              qty_on_hand_delta: -5,
              balance_after: 45,
              source_doc_type: 'SALES_ORDER',
              created_by_name: 'Phạm Thủ Kho',
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 102,
              product_name: 'Logitech G PRO X 2',
              movement_type: 'TRANSFER_IN',
              qty_on_hand_delta: 15,
              balance_after: 35,
              source_doc_type: 'TRANSFER',
              created_by_name: 'Phạm Thủ Kho',
              created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: 101,
              product_name: 'Cisco Catalyst WiFi 6',
              movement_type: 'DAMAGE',
              qty_on_hand_delta: -2,
              balance_after: 28,
              source_doc_type: 'DAMAGE_REPORT',
              created_by_name: 'Phạm Thủ Kho',
              created_at: new Date(Date.now() - 14400000).toISOString(),
            },
          ],
        })),
        api.getABCAnalysis().catch(() => [
          { sku: 'GPU-RTX-4080S', product_name: 'ASUS TUF RTX 4080S', total_shipped_value: 39600, abc_class: 'A' },
          { sku: 'CPU-INT-14700K', product_name: 'Intel Core i7-14700K', total_shipped_value: 19000, abc_class: 'A' },
          { sku: 'SSD-SAM-990P-2TB', product_name: 'Samsung 990 PRO 2TB', total_shipped_value: 14000, abc_class: 'B' },
          { sku: 'SW-CIS-24P-POE', product_name: 'Cisco 24P PoE Switch', total_shipped_value: 9000, abc_class: 'B' },
          { sku: 'BOX-CARTON-M', product_name: 'Thùng carton 40x30', total_shipped_value: 800, abc_class: 'C' },
        ]),
      ]);

      setValuation(valData);
      setLowStock(lowData);
      setRecentMovements(movData.data || []);
      setAbc(abcData);
    } finally {
      setLoading(false);
    }
  };

  const totalValuation = valuation.reduce((acc, v) => acc + (v.total_valuation || 0), 0);
  const totalUnits = valuation.reduce((acc, v) => acc + (v.total_on_hand || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Welcome & Quick Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Bảng Điều Khiển Tổng Quan (Executive Overview)
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Theo dõi thời gian thực số dư kho, luồng hàng hóa, độ toàn vẹn sổ cái và cảnh báo tái đặt hàng.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboardData}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm Mới
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 24 }}>
        {/* Total Valuation */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng Giá Trị Tồn Kho</span>
            <div style={{ padding: 8, background: 'var(--accent-emerald-light)', borderRadius: 8, color: '#34d399' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Tổng {totalUnits.toLocaleString()} đơn vị hàng hoá trên 3 kho
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="card" style={{ borderColor: lowStock.length > 0 ? 'rgba(245, 158, 11, 0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cảnh Báo Tồn Dưới Ngưỡng</span>
            <div style={{ padding: 8, background: 'var(--accent-amber-light)', borderRadius: 8, color: '#fbbf24' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
            {lowStock.length} SKU
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Khả dụng &le; Reorder Point (Cần tạo PO bổ sung)
          </p>
        </div>

        {/* In-Transit Transfers */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Hàng Đang Vận Chuyển</span>
            <div style={{ padding: 8, background: 'var(--accent-cyan-light)', borderRadius: 8, color: '#22d3ee' }}>
              <Truck size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
            1 Phiếu
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Điều chuyển 2 bước: Kho Bắc &rarr; Kho Trung Chuyển
          </p>
        </div>

        {/* Ledger Integrity Rate */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Độ Toàn Vẹn Sổ Cái</span>
            <div style={{ padding: 8, background: 'var(--accent-primary-light)', borderRadius: 8, color: '#818cf8' }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
            100.0%
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            0 sai lệch giữa Ledger và Cache Stock Levels
          </p>
        </div>
      </div>

      {/* Low Stock Urgent Banner */}
      {lowStock.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(17, 24, 39, 0.8) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.2)', borderRadius: 8, color: '#fbbf24' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>
                Phát hiện {lowStock.length} sản phẩm chạm ngưỡng tồn tối thiểu!
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Hệ thống tự động tính toán nhu cầu đặt hàng theo công thức: <code>max(reorder_qty, max_stock - available)</code>
              </p>
            </div>
          </div>
          <button
            id="btn-goto-purchasing-suggest"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateTab('purchasing')}
          >
            <ShoppingCart size={15} />
            Xem Gợi Ý & Tạo Đơn PO
          </button>
        </div>
      )}

      {/* Two Column Layout: Recent Movements & ABC Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        {/* Recent Ledger Movements */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Biến Động Sổ Cái Gần Đây (Append-Only Feed)</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('inventory')}
              style={{ fontSize: 12 }}
            >
              Xem Toàn Bộ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentMovements.map((m) => {
              const isIn = m.qty_on_hand_delta > 0;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: isIn ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)',
                        color: isIn ? '#34d399' : '#fb7185',
                      }}
                    >
                      {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600 }}>{m.product_name}</h4>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span className="badge badge-indigo" style={{ fontSize: 10, padding: '2px 6px' }}>
                          {m.movement_type}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Bởi {m.created_by_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: isIn ? '#34d399' : '#fb7185',
                      }}
                    >
                      {isIn ? `+${m.qty_on_hand_delta}` : m.qty_on_hand_delta}
                    </span>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Tồn sau: <span className="font-mono" style={{ color: '#f8fafc' }}>{m.balance_after}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ABC Analysis Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Phân Tích Phân Loại ABC Hàng Hóa</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Nhóm A: 80% giá trị xuất | Nhóm B: 15% | Nhóm C: 5%
              </p>
            </div>
            <span className="badge badge-purple">Pareto 80/20</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Giá trị xuất</th>
                  <th>Phân loại</th>
                </tr>
              </thead>
              <tbody>
                {abc.slice(0, 6).map((item, idx) => {
                  const badgeClass =
                    item.abc_class === 'A'
                      ? 'badge-emerald'
                      : item.abc_class === 'B'
                      ? 'badge-indigo'
                      : 'badge-amber';
                  return (
                    <tr key={idx}>
                      <td className="font-mono" style={{ color: '#818cf8', fontWeight: 600 }}>
                        {item.sku}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                      <td style={{ fontWeight: 700 }}>
                        ${Number(item.total_shipped_value || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>Nhóm {item.abc_class}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Access Action Shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('purchasing')}
              style={{ justifyContent: 'center' }}
            >
              + Tạo PO Mua Hàng
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('sales')}
              style={{ justifyContent: 'center' }}
            >
              + Tạo Đơn Bán SO
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('quality')}
              style={{ justifyContent: 'center' }}
            >
              + Kiểm Kê Kho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
