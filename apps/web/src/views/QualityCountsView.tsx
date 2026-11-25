import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  type DamageReport,
  type StockCount,
  type CreateDamageReportLineInput,
  type CreateStockCountLineInput,
} from '../api/client.js';
import { Plus } from 'lucide-react';
import { UserRole } from '@iwms/shared';
import { DamagesTable } from './quality/DamagesTable.js';
import { CountsTable } from './quality/CountsTable.js';
import { DamageReportModal } from './quality/DamageReportModal.js';
import { StockCountModal } from './quality/StockCountModal.js';

interface Props {
  currentRole: UserRole;
  selectedWarehouse: number | null;
}

export const QualityCountsView: React.FC<Props> = ({ currentRole, selectedWarehouse }) => {
  const [activeTab, setActiveTab] = useState<'damages' | 'counts'>('damages');
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [_loading, setLoading] = useState(true);

  // New Damage Report Modal
  const [isDamageOpen, setIsDamageOpen] = useState(false);
  const [dmgWarehouseId, setDmgWarehouseId] = useState<number>(1);
  const [dmgLines, setDmgLines] = useState<CreateDamageReportLineInput[]>([
    { productId: 4, qty: 2, reason: 'Rách bao bì niêm phong khi vận chuyển', disposition: 'WRITE_OFF' },
  ]);

  // New Cycle Count Modal
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [countWarehouseId, setCountWarehouseId] = useState<number>(1);
  const [countLines, setCountLines] = useState<CreateStockCountLineInput[]>([
    { productId: 1, countedQty: 49 },
    { productId: 4, countedQty: 80 },
  ]);

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'damages') {
        const data = await api.getDamages();
        setDamages(data);
      } else {
        const data = await api.getCounts();
        setCounts(data);
      }
    } catch {
      // Fallback
    }
  }, [activeTab]);

  useEffect(() => {
    let ignore = false;
    if (activeTab === 'damages') {
      api.getDamages()
        .then((data) => {
          if (!ignore) setDamages(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    } else {
      api.getCounts()
        .then((data) => {
          if (!ignore) setCounts(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [activeTab, selectedWarehouse]);

  const handleApproveDamage = async (id: number) => {
    try {
      await api.approveDamageReport(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi duyệt báo cáo');
    }
  };

  const handleApproveCount = async (id: number) => {
    try {
      await api.approveCount(id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi duyệt phiếu kiểm kê');
    }
  };

  const handleCreateDamage = async () => {
    try {
      await api.createDamageReport({
        warehouseId: dmgWarehouseId,
        lines: dmgLines.map((l) => ({
          productId: Number(l.productId),
          qty: Number(l.qty),
          reason: l.reason,
          disposition: l.disposition,
        })),
      });
      setIsDamageOpen(false);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi tạo báo cáo');
    }
  };

  const handleCreateCount = async () => {
    try {
      await api.createCount({
        warehouseId: countWarehouseId,
        lines: countLines.map((l) => ({
          productId: Number(l.productId),
          countedQty: Number(l.countedQty),
        })),
      });
      setIsCountOpen(false);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message || 'Lỗi tạo phiếu kiểm kê');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Kiểm Soát Hàng Hư Hỏng & Kiểm Kê Định Kỳ</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Quản trị khu vực cách ly hàng lỗi (Quarantine) · Xử lý Write-Off / Hoàn trả NCC · Bù trừ chênh lệch kiểm kê (Cycle Count)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'damages' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('damages')}
            >
              Hàng Hư Hỏng (Damaged)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'counts' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('counts')}
            >
              Kiểm Kê Kho (Cycle Count)
            </button>
          </div>

          {activeTab === 'damages' ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setIsDamageOpen(true)}>
              <Plus size={16} />
              Báo Hàng Hư Hỏng
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsCountOpen(true)}>
              <Plus size={16} />
              Tạo Phiếu Kiểm Kê Mới
            </button>
          )}
        </div>
      </div>

      {activeTab === 'damages' && (
        <DamagesTable
          damages={damages}
          currentRole={currentRole}
          onApproveDamage={handleApproveDamage}
        />
      )}

      {activeTab === 'counts' && (
        <CountsTable
          counts={counts}
          currentRole={currentRole}
          onApproveCount={handleApproveCount}
        />
      )}

      <DamageReportModal
        isOpen={isDamageOpen}
        warehouseId={dmgWarehouseId}
        lines={dmgLines}
        onWarehouseChange={setDmgWarehouseId}
        onLinesChange={setDmgLines}
        onClose={() => setIsDamageOpen(false)}
        onSubmit={handleCreateDamage}
      />

      <StockCountModal
        isOpen={isCountOpen}
        warehouseId={countWarehouseId}
        lines={countLines}
        onWarehouseChange={setCountWarehouseId}
        onLinesChange={setCountLines}
        onClose={() => setIsCountOpen(false)}
        onSubmit={handleCreateCount}
      />
    </div>
  );
};
