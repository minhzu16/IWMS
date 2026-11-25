import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  StockValuationItem,
  LowStockAlert,
  StockMovement,
  ABCAnalysisItem,
} from '../api/client.js';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';
import {
  FALLBACK_VALUATION,
  FALLBACK_LOW_STOCK,
  FALLBACK_MOVEMENTS,
  FALLBACK_ABC,
} from './dashboard/dashboardFallbacks.js';
import { DashboardStatsDeck } from './dashboard/DashboardStatsDeck.js';
import { RecentMovementsCard } from './dashboard/RecentMovementsCard.js';
import { AbcAnalysisCard } from './dashboard/AbcAnalysisCard.js';

interface Props {
  onNavigateTab: (tab: string) => void;
  selectedWarehouse: number | null;
}

export const DashboardView: React.FC<Props> = ({ onNavigateTab, selectedWarehouse }) => {
  const [valuation, setValuation] = useState<StockValuationItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [abc, setAbc] = useState<ABCAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [valData, lowData, movData, abcData] = await Promise.all([
        api.getStockValuation().catch(() => FALLBACK_VALUATION),
        api.getLowStockAlerts(selectedWarehouse || undefined).catch(() => FALLBACK_LOW_STOCK),
        api.getMovements({ limit: 6 }).catch(() => FALLBACK_MOVEMENTS),
        api.getABCAnalysis().catch(() => FALLBACK_ABC),
      ]);

      setValuation(valData);
      setLowStock(lowData);
      setRecentMovements(movData.data || []);
      setAbc(abcData);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.getStockValuation().catch(() => FALLBACK_VALUATION),
      api.getLowStockAlerts(selectedWarehouse || undefined).catch(() => FALLBACK_LOW_STOCK),
      api.getMovements({ limit: 6 }).catch(() => FALLBACK_MOVEMENTS),
      api.getABCAnalysis().catch(() => FALLBACK_ABC),
    ])
      .then(([valData, lowData, movData, abcData]) => {
        if (!ignore) {
          setValuation(valData);
          setLowStock(lowData);
          setRecentMovements(movData.data || []);
          setAbc(abcData);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedWarehouse]);

  const totalValuation = valuation.reduce((acc, v) => acc + (v.total_valuation || 0), 0);
  const totalUnits = valuation.reduce((acc, v) => acc + (v.total_on_hand || 0), 0);

  return (
    <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Header Deck */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Trung tâm chỉ huy vận hành kho
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Giám sát thời gian thực số dư khả dụng, luồng chứng từ và tính toàn vẹn sổ cái bất biến.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadDashboardData}
          disabled={loading}
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Đồng bộ dữ liệu
        </button>
      </div>

      <DashboardStatsDeck
        totalValuation={totalValuation}
        totalUnits={totalUnits}
        lowStockCount={lowStock.length}
      />

      {/* Urgent Reorder Banner */}
      {lowStock.length > 0 && (
        <div
          style={{
            background: 'var(--deck-panel)',
            border: '1px solid var(--border-medium)',
            borderLeft: '4px solid var(--safety-amber)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="var(--safety-amber)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Phát hiện {lowStock.length} sản phẩm chạm ngưỡng tồn tối thiểu
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Đề xuất bổ sung dựa trên định mức: <span className="font-mono">max(reorder_qty, max_stock - available)</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-goto-purchasing-suggest"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateTab('purchasing')}
          >
            <ShoppingCart size={14} />
            Mở danh sách đề xuất & tạo đơn PO
          </button>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
        <RecentMovementsCard movements={recentMovements} onNavigateTab={onNavigateTab} />
        <AbcAnalysisCard abc={abc} onNavigateTab={onNavigateTab} />
      </div>
    </div>
  );
};
