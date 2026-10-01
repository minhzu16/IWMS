import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  Clock,
  PackageCheck,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '@iwms/shared';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const PurchasingView: React.FC<Props> = ({ currentRole, selectedWarehouse }) => {
  const [pos, setPos] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Create PO Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newSupplierId, setNewSupplierId] = useState<number>(1);
  const [newWarehouseId, setNewWarehouseId] = useState<number>(1);
  const [poLines, setPoLines] = useState<any[]>([
    { productId: 1, qtyOrdered: 30, unitPrice: 375 },
  ]);

  // Goods Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptLines, setReceiptLines] = useState<any[]>([]);

  useEffect(() => {
    loadPOs();
    loadLookups();
  }, [selectedWarehouse]);

  const loadPOs = async () => {
    setLoading(true);
    try {
      const data = await api.getPOs();
      setPos(data);
      if (data.length > 0 && !selectedPO) {
        loadPODetail(data[0].id);
      }
    } catch {
      // Fallback sample data
      const sample = [
        {
          id: 1,
          po_number: 'PO-2026-000001',
          supplier_name: 'Samsung Electronics VN',
          warehouse_name: 'Kho Tổng Miền Bắc',
          status: 'APPROVED',
          expected_date: '2026-10-10',
          item_count: 1,
          total_amount: 6720.0,
          received_amount: 0,
          version: 1,
          created_by_name: 'Lê Thu Mua',
        },
      ];
      setPos(sample);
      loadPODetail(1);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [sups, prods] = await Promise.all([api.getSuppliers(), api.getProducts()]);
      setSuppliers(sups);
      setProducts(prods);
    } catch {
      // Ignore
    }
  };

  const loadPODetail = async (id: number) => {
    try {
      const detail = await api.getPOById(id);
      setSelectedPO(detail);
    } catch {
      setSelectedPO({
        id,
        po_number: `PO-2026-${String(id).padStart(6, '0')}`,
        supplier_name: 'Samsung Electronics VN',
        warehouse_name: 'Kho Tổng Miền Bắc',
        warehouse_id: 1,
        status: 'APPROVED',
        version: 1,
        lines: [
          {
            id: 1,
            product_id: 4,
            sku: 'SSD-SAM-990P-2TB',
            product_name: 'Samsung 990 PRO NVMe 2TB',
            uom: 'pcs',
            qty_ordered: 40,
            qty_received: 0,
            unit_price: 168.0,
          },
        ],
        receipts: [],
      });
    }
  };

  const handleTransition = async (action: 'submit' | 'approve' | 'reject') => {
    if (!selectedPO) return;
    try {
      if (action === 'submit') await api.submitPO(selectedPO.id, selectedPO.version);
      if (action === 'approve') await api.approvePO(selectedPO.id, selectedPO.version);
      if (action === 'reject') await api.rejectPO(selectedPO.id, selectedPO.version);
      loadPOs();
      loadPODetail(selectedPO.id);
    } catch (err: any) {
      alert(err.message || 'Lỗi thao tác trạng thái');
    }
  };

  const handleOpenReceipt = () => {
    if (!selectedPO) return;
    setReceiptLines(
      selectedPO.lines.map((l: any) => ({
        poLineId: l.id,
        productName: l.product_name,
        qtyOrdered: l.qty_ordered,
        qtyAlreadyReceived: l.qty_received,
        qtyReceived: Math.max(0, l.qty_ordered - l.qty_received),
        qtyDamaged: 0,
      })),
    );
    setIsReceiptOpen(true);
  };

  const handleExecuteReceipt = async () => {
    if (!selectedPO) return;
    try {
      await api.processReceipt(selectedPO.id, {
        lines: receiptLines.map((l) => ({
          poLineId: l.poLineId,
          qtyReceived: Number(l.qtyReceived),
          qtyDamaged: Number(l.qtyDamaged),
        })),
      });
      setIsReceiptOpen(false);
      loadPOs();
      loadPODetail(selectedPO.id);
    } catch (err: any) {
      alert(err.message || 'Lỗi nhận hàng');
    }
  };

  const handleCreatePO = async () => {
    try {
      await api.createPO({
        supplierId: newSupplierId,
        warehouseId: newWarehouseId,
        lines: poLines.map((l) => ({
          productId: Number(l.productId),
          qtyOrdered: Number(l.qtyOrdered),
          unitPrice: Number(l.unitPrice),
        })),
      });
      setIsCreateOpen(false);
      loadPOs();
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo PO');
    }
  };

  const handleAutoSuggestReorder = async () => {
    try {
      const low = await api.getLowStockAlerts(selectedWarehouse || undefined);
      if (low.length === 0) {
        alert('Tất cả sản phẩm hiện đang ở trên ngưỡng an toàn!');
        return;
      }
      // Populate create modal with suggested reorder lines
      setNewSupplierId(low[0].preferred_supplier_id || 1);
      setNewWarehouseId(low[0].warehouse_id || 1);
      setPoLines(
        low.map((item: any) => ({
          productId: item.product_id,
          qtyOrdered: item.suggested_po_qty || 20,
          unitPrice: 150,
        })),
      );
      setIsCreateOpen(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi quét gợi ý');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Quản Trị Mua Hàng & Kiểm Nhận Kho (Purchasing & Receipts)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Máy trạng thái chứng từ (State Machine) · Kiểm nhận hàng lỗi cách ly tức thời · Tự động cập nhật giá vốn bình quân
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleAutoSuggestReorder}>
            <Sparkles size={16} color="#fbbf24" />
            Gợi Ý Tạo PO Tự Động
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            Tạo Đơn PO Mới
          </button>
        </div>
      </div>

      {/* Main Grid: PO List on Left, PO Details & Workflow on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        {/* Left: PO Master List */}
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Danh Sách Đơn Mua Hàng ({pos.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pos.map((p) => {
              const isSelected = selectedPO?.id === p.id;
              const badgeClass =
                p.status === 'RECEIVED'
                  ? 'badge-emerald'
                  : p.status === 'APPROVED'
                  ? 'badge-indigo'
                  : p.status === 'PARTIALLY_RECEIVED'
                  ? 'badge-amber'
                  : 'badge-purple';

              return (
                <div
                  key={p.id}
                  onClick={() => loadPODetail(p.id)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                    border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>
                      {p.po_number}
                    </span>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: 11 }}>
                      {p.status}
                    </span>
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{p.supplier_name}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{p.warehouse_name}</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>
                      ${Number(p.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: PO Detail & State Machine Actions */}
        {selectedPO ? (
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
                  <button className="btn btn-primary btn-sm" onClick={() => handleTransition('submit')}>
                    Gửi Phê Duyệt (Submit)
                  </button>
                )}

                {selectedPO.status === 'SUBMITTED' && ['ADMIN', 'MANAGER'].includes(currentRole) && (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleTransition('reject')}>
                      Từ Chối
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => handleTransition('approve')}>
                      Phê Duyệt Đơn (Approve)
                    </button>
                  </>
                )}

                {(selectedPO.status === 'APPROVED' || selectedPO.status === 'PARTIALLY_RECEIVED') &&
                  ['ADMIN', 'MANAGER', 'WAREHOUSE'].includes(currentRole) && (
                    <button className="btn btn-primary btn-sm" onClick={handleOpenReceipt}>
                      <PackageCheck size={16} />
                      Kiểm Nhận Hàng Vào Kho (Goods Receipt)
                    </button>
                  )}
              </div>
            </div>

            {/* State Machine Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 18px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
              {['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].map((s, idx) => {
                const isPassed =
                  selectedPO.status === s ||
                  (s === 'DRAFT' && selectedPO.status !== 'DRAFT') ||
                  (s === 'SUBMITTED' && ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(selectedPO.status)) ||
                  (s === 'APPROVED' && ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(selectedPO.status)) ||
                  (s === 'PARTIALLY_RECEIVED' && selectedPO.status === 'RECEIVED');

                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isPassed ? '#10b981' : 'var(--bg-tertiary)',
                        color: isPassed ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isPassed ? 700 : 500, color: isPassed ? '#f8fafc' : 'var(--text-muted)' }}>
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
                  {selectedPO.lines?.map((line: any) => {
                    const total = line.qty_ordered * line.unit_price;
                    return (
                      <tr key={line.id}>
                        <td className="font-mono" style={{ color: '#818cf8', fontWeight: 600 }}>{line.sku}</td>
                        <td style={{ fontWeight: 600 }}>{line.product_name}</td>
                        <td style={{ fontWeight: 700 }}>{line.qty_ordered} {line.uom}</td>
                        <td style={{ fontWeight: 700, color: line.qty_received >= line.qty_ordered ? '#34d399' : '#fbbf24' }}>
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
            {selectedPO.receipts?.length > 0 && (
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Lịch Sử Các Đợt Nhập Hàng (Goods Receipts)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedPO.receipts.map((gr: any) => (
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
                        <span className="font-mono" style={{ fontWeight: 700, color: '#34d399' }}>{gr.gr_number}</span>
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
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <p style={{ color: 'var(--text-muted)' }}>Chọn đơn mua hàng để xem chi tiết</p>
          </div>
        )}
      </div>

      {/* Goods Receipt Modal */}
      {isReceiptOpen && (
        <div className="modal-overlay" onClick={() => setIsReceiptOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Kiểm Nhận Hàng Vào Kho (Goods Receipt Wizard)</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Hỗ trợ phân tách hàng đạt chuẩn (nhập on_hand) và hàng móp méo/vỡ (cách ly vào damaged)
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsReceiptOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Quy tắc an toàn: Dung sai nhập vượt tối đa 10%. Đơn giá bình quân gia quyền sẽ được tính toán lại ngay khi ghi sổ cái.
              </p>
            </div>

            <div className="table-container" style={{ marginBottom: 20 }}>
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đặt / Đã Nhận</th>
                    <th>Hàng Chuẩn (Good)</th>
                    <th>Hàng Hư Hỏng (Damaged)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptLines.map((line, idx) => (
                    <tr key={line.poLineId}>
                      <td style={{ fontWeight: 600 }}>{line.productName}</td>
                      <td>{line.qtyOrdered} / {line.qtyAlreadyReceived}</td>
                      <td>
                        <input
                          type="number"
                          className="input font-mono"
                          style={{ width: 100 }}
                          value={line.qtyReceived}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setReceiptLines((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, qtyReceived: val } : p)),
                            );
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input font-mono"
                          style={{ width: 100, borderColor: Number(line.qtyDamaged) > 0 ? '#f43f5e' : undefined }}
                          value={line.qtyDamaged}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setReceiptLines((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, qtyDamaged: val } : p)),
                            );
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setIsReceiptOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleExecuteReceipt}>
                Xác Nhận Nhập & Ghi Sổ Cái
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tạo Đơn Đặt Hàng Mới (Purchase Order)</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Nhà Cung Cấp:</label>
                  <select
                    className="select"
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(Number(e.target.value))}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Kho Tiếp Nhận:</label>
                  <select
                    className="select"
                    value={newWarehouseId}
                    onChange={(e) => setNewWarehouseId(Number(e.target.value))}
                  >
                    <option value={1}>Kho Tổng Miền Bắc (Hà Nội)</option>
                    <option value={2}>Kho Phân Phối Miền Nam (TP.HCM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>Sản Phẩm Cần Nhập:</label>
                {poLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select
                      className="select"
                      value={line.productId}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        setPoLines((prev) => prev.map((p, i) => (i === idx ? { ...p, productId: pid } : p)));
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Số lượng"
                      value={line.qtyOrdered}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setPoLines((prev) => prev.map((p, i) => (i === idx ? { ...p, qtyOrdered: qty } : p)));
                      }}
                    />

                    <input
                      type="number"
                      className="input font-mono"
                      placeholder="Đơn giá"
                      value={line.unitPrice}
                      onChange={(e) => {
                        const pr = Number(e.target.value);
                        setPoLines((prev) => prev.map((p, i) => (i === idx ? { ...p, unitPrice: pr } : p)));
                      }}
                    />

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fb7185' }}
                      onClick={() => setPoLines((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={poLines.length <= 1}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPoLines((prev) => [...prev, { productId: 1, qtyOrdered: 10, unitPrice: 100 }])}
                  style={{ marginTop: 6 }}
                >
                  + Thêm dòng sản phẩm
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleCreatePO}>Lưu Đơn PO (DRAFT)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
