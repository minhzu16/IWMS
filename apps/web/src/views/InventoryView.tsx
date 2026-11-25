import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import type { StockLevel, StockMovement, AsOfStockLevel } from '../api/client.js';
import { StockLevelsTab } from './inventory/StockLevelsTab.js';
import { MovementsTab } from './inventory/MovementsTab.js';
import { AsOfTab } from './inventory/AsOfTab.js';
import { AdjustmentModal } from './inventory/AdjustmentModal.js';
import { containerStyle, headerStyle, subTabGroupStyle, FALLBACK_LEVELS } from './inventory/styles.js';

interface Props {
  selectedWarehouse: number | null;
}

export const InventoryView: React.FC<Props> = ({ selectedWarehouse }) => {
  const [subTab, setSubTab] = useState<'levels' | 'ledger' | 'asof'>('levels');
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 16));
  const [asOfData, setAsOfData] = useState<AsOfStockLevel[]>([]);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal State
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjProductId, setAdjProductId] = useState<number | null>(null);
  const [adjProductName, setAdjProductName] = useState('');
  const [adjWarehouseId, setAdjWarehouseId] = useState<number>(1);
  const [adjDelta, setAdjDelta] = useState<number>(1);
  const [adjReason, setAdjReason] = useState('Kiểm kê điều chỉnh chênh lệch thực tế');
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null);

  const loadLevels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLevels({
        warehouseId: selectedWarehouse || undefined,
        lowStock: filterLowStock,
      });
      setLevels(data);
    } catch {
      // Fallback sample data
      setLevels(FALLBACK_LEVELS);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, filterLowStock]);

  const loadAsOf = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAsOf(new Date(asOfDate).toISOString(), selectedWarehouse || undefined);
      setAsOfData(data);
    } catch {
      setAsOfData([]);
    } finally {
      setLoading(false);
    }
  }, [asOfDate, selectedWarehouse]);

  useEffect(() => {
    let ignore = false;
    if (subTab === 'levels') {
      api.getLevels({
        warehouseId: selectedWarehouse || undefined,
        lowStock: filterLowStock,
      })
        .then((data) => {
          if (!ignore) setLevels(data);
        })
        .catch(() => {
          if (!ignore) setLevels(FALLBACK_LEVELS);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else if (subTab === 'ledger') {
      api.getMovements({
        warehouseId: selectedWarehouse || undefined,
        limit: 50,
      })
        .then((res) => {
          if (!ignore) setMovements(res.data);
        })
        .catch(() => {
          if (!ignore) setMovements([]);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else if (subTab === 'asof') {
      api.getAsOf(new Date(asOfDate).toISOString(), selectedWarehouse || undefined)
        .then((data) => {
          if (!ignore) setAsOfData(data);
        })
        .catch(() => {
          if (!ignore) setAsOfData([]);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [subTab, selectedWarehouse, filterLowStock, asOfDate]);

  const handleOpenAdjustment = (prod: StockLevel) => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi điều chỉnh tồn kho');
    }
  };

  return (
    <div style={containerStyle}>
      {/* View Header with Sub-tabs */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Quản trị tồn kho & sổ cái biến động
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Nguồn sự thật: Sổ cái bất biến (Append-Only) · Số dư sống (Stock Levels) cập nhật nguyên tử
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div style={subTabGroupStyle}>
          <button
            type="button"
            className={`btn btn-sm ${subTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('levels')}
          >
            Số dư sống
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('ledger')}
          >
            Sổ cái biến động
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subTab === 'asof' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('asof')}
          >
            Tồn tại thời điểm (As-of)
          </button>
        </div>
      </div>

      {subTab === 'levels' && (
        <StockLevelsTab
          levels={levels}
          search={search}
          filterLowStock={filterLowStock}
          onSearchChange={setSearch}
          onFilterLowStockChange={setFilterLowStock}
          onOpenAdjustment={handleOpenAdjustment}
        />
      )}

      {subTab === 'ledger' && <MovementsTab movements={movements} />}

      {subTab === 'asof' && (
        <AsOfTab
          asOfDate={asOfDate}
          asOfData={asOfData}
          loading={loading}
          onAsOfDateChange={setAsOfDate}
          onLoadAsOf={loadAsOf}
        />
      )}

      <AdjustmentModal
        isOpen={isAdjOpen}
        productName={adjProductName}
        warehouseId={adjWarehouseId}
        delta={adjDelta}
        reason={adjReason}
        successMessage={adjSuccess}
        onWarehouseChange={setAdjWarehouseId}
        onDeltaChange={setAdjDelta}
        onReasonChange={setAdjReason}
        onClose={() => setIsAdjOpen(false)}
        onSubmit={handleExecuteAdjustment}
      />
    </div>
  );
};

export default InventoryView;
