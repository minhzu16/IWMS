import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  Truck,
  Plus,
  CheckCircle,
  Package,
  Send,
  ArrowRight,
  X,
  Lock,
} from 'lucide-react';
import { UserRole } from '@iwms/shared';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const SalesTransfersView: React.FC<Props> = ({ currentRole, selectedWarehouse }) => {
  const [activeSection, setActiveSection] = useState<'sales' | 'transfers'>('sales');
  const [sos, setSos] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New SO modal
  const [isSoOpen, setIsSoOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [soWarehouseId, setSoWarehouseId] = useState<number>(1);
  const [soLines, setSoLines] = useState<any[]>([{ productId: 1, qtyOrdered: 2, unitPrice: 420 }]);

  // New Transfer modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [srcWh, setSrcWh] = useState<number>(1);
  const [tgtWh, setTgtWh] = useState<number>(3);
  const [trLines, setTrLines] = useState<any[]>([{ productId: 4, qtyDispatched: 10 }]);

  useEffect(() => {
    loadData();
  }, [activeSection, selectedWarehouse]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSection === 'sales') {
        const data = await api.getSOs();
        setSos(data);
      } else {
        const data = await api.getTransfers();
        setTransfers(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSO = async (id: number) => {
    try {
      await api.confirmSO(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi giữ chỗ hàng');
    }
  };

  const handleShipSO = async (id: number) => {
    try {
      await api.shipSO(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xuất hàng');
    }
  };

  const handleCancelSO = async (id: number) => {
    try {
      await api.cancelSO(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi hủy đơn');
    }
  };

  const handleDispatchTransfer = async (id: number) => {
    try {
      await api.dispatchTransfer(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi xuất điều chuyển');
    }
  };

  const handleReceiveTransfer = async (id: number) => {
    try {
      const tr = await api.getTransfers();
      const target = tr.find((t: any) => t.id === id);
      const lines = target?.lines || [{ lineId: 1, qtyReceived: 10, qtyDamaged: 0 }];

      await api.receiveTransfer(id, {
        lines: lines.map((l: any) => ({
          lineId: l.id || 1,
          qtyReceived: Number(l.qty_dispatched || 10),
          qtyDamaged: 0,
        })),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi nhận điều chuyển');
    }
  };

  const handleCreateSO = async () => {
    if (!customerName) return;
    try {
      await api.createSO({
        customerName,
        warehouseId: soWarehouseId,
        lines: soLines.map((l) => ({
          productId: Number(l.productId),
          qtyOrdered: Number(l.qtyOrdered),
          unitPrice: Number(l.unitPrice),
        })),
      });
      setIsSoOpen(false);
      setCustomerName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo SO');
    }
  };

  const handleCreateTransfer = async () => {
    if (srcWh === tgtWh) {
      alert('Kho nguồn và kho đích không được trùng nhau');
      return;
    }
    try {
      await api.createTransfer({
        sourceWarehouseId: srcWh,
        targetWarehouseId: tgtWh,
        lines: trLines.map((l) => ({
          productId: Number(l.productId),
          qtyDispatched: Number(l.qtyDispatched),
        })),
      });
      setIsTransferOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo phiếu chuyển kho');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header with Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Xuất Bán Hàng & Điều Chuyển Liên Kho (Sales & Transfers)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Cơ chế Giữ Chỗ (Reservation) chống bán vượt tồn · Điều chuyển 2 bước kiểm soát thất thoát
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 10 }}>
            <button
              className={`btn btn-sm ${activeSection === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('sales')}
            >
              Đơn Bán Hàng (SO)
            </button>
            <button
              className={`btn btn-sm ${activeSection === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('transfers')}
            >
              Điều Chuyển Kho 2 Bước
            </button>
          </div>

          {activeSection === 'sales' ? (
            <button className="btn btn-primary btn-sm" onClick={() => setIsSoOpen(true)}>
              <Plus size={16} />
              Tạo Đơn Bán Mới
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setIsTransferOpen(true)}>
              <Plus size={16} />
              Tạo Phiếu Điều Chuyển
            </button>
          )}
        </div>
      </div>

      {/* SALES ORDERS VIEW */}
      {activeSection === 'sales' && (
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
                  const badgeClass =
                    so.status === 'SHIPPED'
                      ? 'badge-emerald'
                      : so.status === 'CONFIRMED'
                      ? 'badge-amber'
                      : so.status === 'CANCELLED'
                      ? 'badge-rose'
                      : 'badge-indigo';

                  return (
                    <tr key={so.id}>
                      <td className="font-mono" style={{ color: '#818cf8', fontWeight: 700 }}>{so.so_number}</td>
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
                              className="btn btn-primary btn-sm"
                              onClick={() => handleConfirmSO(so.id)}
                            >
                              <Lock size={14} />
                              Xác Nhận Giữ Chỗ
                            </button>
                          )}
                          {so.status === 'CONFIRMED' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleShipSO(so.id)}
                              >
                                <Send size={14} />
                                Xuất Kho Ngay
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#fb7185' }}
                                onClick={() => handleCancelSO(so.id)}
                              >
                                Hủy Đơn
                              </button>
                            </>
                          )}
                          {so.status === 'SHIPPED' && (
                            <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
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
      )}

      {/* TRANSFERS VIEW */}
      {activeSection === 'transfers' && (
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
                  const badgeClass =
                    t.status === 'RECEIVED'
                      ? 'badge-emerald'
                      : t.status === 'DISPATCHED'
                      ? 'badge-cyan'
                      : 'badge-indigo';

                  return (
                    <tr key={t.id}>
                      <td className="font-mono" style={{ color: '#818cf8', fontWeight: 700 }}>{t.transfer_number}</td>
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
                              className="btn btn-primary btn-sm"
                              onClick={() => handleDispatchTransfer(t.id)}
                            >
                              <Send size={14} />
                              Bước 1: Xuất Kho (Dispatch)
                            </button>
                          )}
                          {t.status === 'DISPATCHED' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReceiveTransfer(t.id)}
                            >
                              <CheckCircle size={14} />
                              Bước 2: Nhận Hàng (Receive)
                            </button>
                          )}
                          {t.status === 'RECEIVED' && (
                            <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
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
      )}

      {/* New SO Modal */}
      {isSoOpen && (
        <div className="modal-overlay" onClick={() => setIsSoOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Đơn Bán Hàng Mới (Sales Order)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsSoOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Tên Khách Hàng:</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ví dụ: Công ty TNHH Giải Pháp Công Nghệ..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Xuất Hàng:</label>
                <select
                  className="select"
                  value={soWarehouseId}
                  onChange={(e) => setSoWarehouseId(Number(e.target.value))}
                >
                  <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                  <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Chi Tiết Hàng Đặt:</label>
                {soLines.map((l, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <select
                      className="select"
                      value={l.productId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        setSoLines((prev) => prev.map((item, i) => (i === idx ? { ...item, productId: pid } : item)));
                      }}
                    >
                      <option value={1}>Intel Core i7-14700K (CPU-INT-14700K)</option>
                      <option value={4}>Samsung 990 PRO 2TB (SSD-SAM-990P-2TB)</option>
                      <option value={5}>ASUS RTX 4080 SUPER (GPU-RTX-4080S)</option>
                    </select>

                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Số lượng"
                      value={l.qtyOrdered}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setSoLines((prev) => prev.map((item, i) => (i === idx ? { ...item, qtyOrdered: qty } : item)));
                      }}
                    />

                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Đơn giá"
                      value={l.unitPrice}
                      onChange={(e) => {
                        const pr = Number(e.target.value);
                        setSoLines((prev) => prev.map((item, i) => (i === idx ? { ...item, unitPrice: pr } : item)));
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsSoOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleCreateSO}>Tạo Đơn Bán</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      {isTransferOpen && (
        <div className="modal-overlay" onClick={() => setIsTransferOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Phiếu Điều Chuyển Liên Kho (Transfer)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsTransferOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Nguồn:</label>
                  <select className="select" value={srcWh} onChange={(e) => setSrcWh(Number(e.target.value))}>
                    <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                    <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Đích:</label>
                  <select className="select" value={tgtWh} onChange={(e) => setTgtWh(Number(e.target.value))}>
                    <option value={3}>Kho Trung Chuyển Miền Trung</option>
                    <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                    <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Sản phẩm chuyển:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <select
                    className="select"
                    value={trLines[0]?.productId}
                    onChange={(e) => setTrLines([{ ...trLines[0], productId: Number(e.target.value) }])}
                  >
                    <option value={4}>Samsung 990 PRO NVMe 2TB</option>
                    <option value={1}>Intel Core i7-14700K 20-Core</option>
                    <option value={8}>Logitech G PRO X Superlight 2</option>
                  </select>
                  <input
                    type="number"
                    className="input font-mono"
                    value={trLines[0]?.qtyDispatched}
                    onChange={(e) => setTrLines([{ ...trLines[0], qtyDispatched: Number(e.target.value) }])}
                    placeholder="Số lượng"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setIsTransferOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleCreateTransfer}>Lập Phiếu Điều Chuyển</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
