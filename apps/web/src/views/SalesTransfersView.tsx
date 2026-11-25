import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Plus } from 'lucide-react';
import type { UserRole } from '@iwms/shared';
import type {
  SalesOrderItem,
  TransferLine,
  TransferItem,
  SOLineItem,
  TransferCreateLine,
} from './sales/types.js';
import { SalesOrdersTab } from './sales/SalesOrdersTab.js';
import { TransfersTab } from './sales/TransfersTab.js';
import { CreateSoModal } from './sales/CreateSoModal.js';
import { CreateTransferModal } from './sales/CreateTransferModal.js';
import { containerStyle, headerStyle, sectionSwitcherStyle } from './sales/styles.js';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const SalesTransfersView: React.FC<Props> = ({ currentRole: _currentRole, selectedWarehouse }) => {
  const [activeSection, setActiveSection] = useState<'sales' | 'transfers'>('sales');
  const [sos, setSos] = useState<SalesOrderItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [, setLoading] = useState(true);

  // New SO modal
  const [isSoOpen, setIsSoOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [soWarehouseId, setSoWarehouseId] = useState<number>(1);
  const [soLines, setSoLines] = useState<SOLineItem[]>([{ productId: 1, qtyOrdered: 2, unitPrice: 420 }]);

  // New Transfer modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [srcWh, setSrcWh] = useState<number>(1);
  const [tgtWh, setTgtWh] = useState<number>(3);
  const [trLines, setTrLines] = useState<TransferCreateLine[]>([{ productId: 4, qtyDispatched: 10 }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeSection === 'sales') {
        const data = (await api.getSOs()) as SalesOrderItem[];
        setSos(data);
      } else {
        const data = (await api.getTransfers()) as TransferItem[];
        setTransfers(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    let ignore = false;
    if (activeSection === 'sales') {
      api.getSOs()
        .then((data) => {
          if (!ignore) setSos(data as SalesOrderItem[]);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else {
      api.getTransfers()
        .then((data) => {
          if (!ignore) setTransfers(data as TransferItem[]);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeSection, selectedWarehouse]);

  const handleConfirmSO = async (id: number) => {
    try {
      await api.confirmSO(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi giữ chỗ hàng');
    }
  };

  const handleShipSO = async (id: number) => {
    try {
      await api.shipSO(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi xuất hàng');
    }
  };

  const handleCancelSO = async (id: number) => {
    try {
      await api.cancelSO(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi hủy đơn');
    }
  };

  const handleDispatchTransfer = async (id: number) => {
    try {
      await api.dispatchTransfer(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi xuất điều chuyển');
    }
  };

  const handleReceiveTransfer = async (id: number) => {
    try {
      const tr = (await api.getTransfers()) as TransferItem[];
      const target = tr.find((t) => t.id === id);
      const lines: TransferLine[] = target?.lines || [{ lineId: 1, qtyReceived: 10, qtyDamaged: 0 }];

      await api.receiveTransfer(id, {
        lines: lines.map((l) => ({
          lineId: l.id || l.lineId || 1,
          qtyReceived: Number(l.qty_dispatched || l.qtyDispatched || l.qtyReceived || 10),
          qtyDamaged: 0,
        })),
      });
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi nhận điều chuyển');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi tạo SO');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi tạo phiếu chuyển kho');
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header with Switcher */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Xuất Bán Hàng & Điều Chuyển Liên Kho (Sales & Transfers)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Cơ chế Giữ Chỗ (Reservation) chống bán vượt tồn · Điều chuyển 2 bước kiểm soát thất thoát
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={sectionSwitcherStyle}>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('sales')}
            >
              Đơn Bán Hàng (SO)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === 'transfers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSection('transfers')}
            >
              Điều Chuyển Kho 2 Bước
            </button>
          </div>

          {activeSection === 'sales' ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsSoOpen(true)}>
              <Plus size={16} />
              Tạo Đơn Bán Mới
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsTransferOpen(true)}>
              <Plus size={16} />
              Tạo Phiếu Điều Chuyển
            </button>
          )}
        </div>
      </div>

      {activeSection === 'sales' && (
        <SalesOrdersTab
          sos={sos}
          onConfirmSO={handleConfirmSO}
          onShipSO={handleShipSO}
          onCancelSO={handleCancelSO}
        />
      )}

      {activeSection === 'transfers' && (
        <TransfersTab
          transfers={transfers}
          onDispatchTransfer={handleDispatchTransfer}
          onReceiveTransfer={handleReceiveTransfer}
        />
      )}

      <CreateSoModal
        isOpen={isSoOpen}
        customerName={customerName}
        soWarehouseId={soWarehouseId}
        soLines={soLines}
        onCustomerNameChange={setCustomerName}
        onWarehouseChange={setSoWarehouseId}
        onLinesChange={setSoLines}
        onClose={() => setIsSoOpen(false)}
        onSubmit={handleCreateSO}
      />

      <CreateTransferModal
        isOpen={isTransferOpen}
        srcWh={srcWh}
        tgtWh={tgtWh}
        trLines={trLines}
        onSrcWhChange={setSrcWh}
        onTgtWhChange={setTgtWh}
        onLinesChange={setTrLines}
        onClose={() => setIsTransferOpen(false)}
        onSubmit={handleCreateTransfer}
      />
    </div>
  );
};

export default SalesTransfersView;
