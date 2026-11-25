import React, { useState, useEffect, useCallback } from 'react';
import { api, type LowStockAlert } from '../api/client.js';
import type { UserRole } from '@iwms/shared';
import type {
  PurchaseOrderSummary,
  PurchaseOrderDetail,
  SupplierOption,
  ProductOption,
  CreatePOLineDraft,
  ReceiptLineDraft,
} from './purchasing/types.js';
import { PurchasingHeader } from './purchasing/PurchasingHeader.js';
import { PoList } from './purchasing/PoList.js';
import { PoDetail } from './purchasing/PoDetail.js';
import { GoodsReceiptModal } from './purchasing/GoodsReceiptModal.js';
import { CreatePoModal } from './purchasing/CreatePoModal.js';
import {
  containerStyle,
  mainGridStyle,
  SAMPLE_POS,
  createSamplePoDetail,
} from './purchasing/styles.js';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const PurchasingView: React.FC<Props> = ({ currentRole, selectedWarehouse }) => {
  const [pos, setPos] = useState<PurchaseOrderSummary[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderDetail | null>(null);
  const [, setLoading] = useState(false);

  // Create PO Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [newSupplierId, setNewSupplierId] = useState<number>(1);
  const [newWarehouseId, setNewWarehouseId] = useState<number>(1);
  const [poLines, setPoLines] = useState<CreatePOLineDraft[]>([
    { productId: 1, qtyOrdered: 30, unitPrice: 375 },
  ]);

  // Goods Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptLines, setReceiptLines] = useState<ReceiptLineDraft[]>([]);

  const loadPODetail = useCallback(async (id: number) => {
    try {
      const detail = await api.getPOById(id);
      setSelectedPO(detail);
    } catch {
      setSelectedPO(createSamplePoDetail(id));
    }
  }, []);

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPOs();
      setPos(data);
      setSelectedPO((prev) => {
        if (!prev && data.length > 0) {
          loadPODetail(data[0].id);
        }
        return prev;
      });
    } catch {
      setPos(SAMPLE_POS);
      setSelectedPO((prev) => {
        if (!prev) {
          loadPODetail(1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [loadPODetail]);

  useEffect(() => {
    let ignore = false;
    api.getPOs()
      .then((data) => {
        if (!ignore) {
          setPos(data);
          if (data.length > 0) {
            loadPODetail(data[0].id);
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setPos(SAMPLE_POS);
          loadPODetail(1);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    Promise.all([api.getSuppliers(), api.getProducts()])
      .then(([sups, prods]) => {
        if (!ignore) {
          setSuppliers(sups);
          setProducts(prods);
        }
      })
      .catch(() => {
        // Lookups are optional: the create-PO form falls back to empty lists.
      });

    return () => {
      ignore = true;
    };
  }, [loadPODetail, selectedWarehouse]);

  const handleTransition = async (action: 'submit' | 'approve' | 'reject') => {
    if (!selectedPO) return;
    try {
      if (action === 'submit') await api.submitPO(selectedPO.id, selectedPO.version);
      if (action === 'approve') await api.approvePO(selectedPO.id, selectedPO.version);
      if (action === 'reject') await api.rejectPO(selectedPO.id, selectedPO.version);
      loadPOs();
      loadPODetail(selectedPO.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi thao tác trạng thái');
    }
  };

  const handleOpenReceipt = () => {
    if (!selectedPO) return;
    setReceiptLines(
      selectedPO.lines.map((l) => ({
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi nhận hàng');
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi tạo PO');
    }
  };

  const handleAutoSuggestReorder = async () => {
    try {
      const low = await api.getLowStockAlerts(selectedWarehouse || undefined);
      if (low.length === 0) {
        alert('Tất cả sản phẩm hiện đang ở trên ngưỡng an toàn!');
        return;
      }
      setNewSupplierId(low[0].preferred_supplier_id || 1);
      setNewWarehouseId(low[0].warehouse_id || 1);
      setPoLines(
        low.map((item: LowStockAlert) => ({
          productId: item.product_id,
          qtyOrdered: item.suggested_po_qty || 20,
          unitPrice: 150,
        })),
      );
      setIsCreateOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi quét gợi ý');
    }
  };

  return (
    <div style={containerStyle}>
      <PurchasingHeader
        onAutoSuggestReorder={handleAutoSuggestReorder}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      <div style={mainGridStyle}>
        <PoList
          pos={pos}
          selectedPoId={selectedPO?.id}
          onSelectPO={loadPODetail}
        />

        <PoDetail
          selectedPO={selectedPO}
          currentRole={currentRole}
          onTransition={handleTransition}
          onOpenReceipt={handleOpenReceipt}
        />
      </div>

      <GoodsReceiptModal
        isOpen={isReceiptOpen}
        receiptLines={receiptLines}
        onLinesChange={setReceiptLines}
        onClose={() => setIsReceiptOpen(false)}
        onSubmit={handleExecuteReceipt}
      />

      <CreatePoModal
        isOpen={isCreateOpen}
        suppliers={suppliers}
        products={products}
        newSupplierId={newSupplierId}
        newWarehouseId={newWarehouseId}
        poLines={poLines}
        onSupplierChange={setNewSupplierId}
        onWarehouseChange={setNewWarehouseId}
        onLinesChange={setPoLines}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePO}
      />
    </div>
  );
};

export default PurchasingView;
