import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { DashboardView } from './views/DashboardView.js';
import { InventoryView } from './views/InventoryView.js';
import { CatalogView } from './views/CatalogView.js';
import { PurchasingView } from './views/PurchasingView.js';
import { SalesTransfersView } from './views/SalesTransfersView.js';
import { QualityCountsView } from './views/QualityCountsView.js';
import { AuditView } from './views/AuditView.js';
import { ReconcileModal } from './components/ReconcileModal.js';
import { BarcodeModal } from './components/BarcodeModal.js';
import { UserRole } from '@iwms/shared';
import { Zap, X, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  // Global Modals
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  // Real-time SSE Telemetry Toast
  const [liveToast, setLiveToast] = useState<{
    movementType: string;
    delta: number;
    balanceAfter: number;
    isIn: boolean;
  } | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/inventory/stream');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const delta = Number(data.qty_on_hand_delta || 0);
          const isIn = delta > 0;
          setLiveToast({
            movementType: data.movement_type || 'POST_MOVEMENT',
            delta,
            balanceAfter: Number(data.balance_after || 0),
            isIn,
          });
          setTimeout(() => setLiveToast(null), 5000);
        } catch {
          // Ignore parse errors
        }
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedWarehouse={selectedWarehouse}
        setSelectedWarehouse={setSelectedWarehouse}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onOpenReconcile={() => setIsReconcileOpen(true)}
        onOpenBarcode={() => setIsBarcodeOpen(true)}
      />

      {/* Main View Container */}
      <main style={{ flex: 1, paddingBottom: 40 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setActiveTab}
            selectedWarehouse={selectedWarehouse}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryView selectedWarehouse={selectedWarehouse} />
        )}
        {activeTab === 'catalog' && <CatalogView />}
        {activeTab === 'purchasing' && (
          <PurchasingView
            currentRole={currentRole}
            selectedWarehouse={selectedWarehouse}
          />
        )}
        {activeTab === 'sales' && (
          <SalesTransfersView
            currentRole={currentRole}
            selectedWarehouse={selectedWarehouse}
          />
        )}
        {activeTab === 'quality' && (
          <QualityCountsView
            currentRole={currentRole}
            selectedWarehouse={selectedWarehouse}
          />
        )}
        {activeTab === 'audit' && <AuditView />}
      </main>

      {/* Reconcile Verification Modal */}
      <ReconcileModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
      />

      {/* Real-time SSE Live Event Toast */}
      {liveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            background: 'var(--deck-surface)',
            border: liveToast.isIn
              ? '1px solid var(--invariant-emerald)'
              : '1px solid var(--quarantine-crimson)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-overlay)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'modalScaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: 440,
          }}
        >
          <div
            style={{
              padding: 6,
              borderRadius: 'var(--radius-xs)',
              background: liveToast.isIn
                ? 'var(--invariant-emerald-subtle)'
                : 'var(--quarantine-crimson-subtle)',
              color: liveToast.isIn
                ? 'var(--invariant-emerald)'
                : 'var(--quarantine-crimson)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Biến động sổ cái trực tiếp
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 1 }}>
              <span className="badge badge-slate font-mono" style={{ fontSize: 10, padding: '1px 5px' }}>
                {liveToast.movementType}
              </span>{' '}
              <span
                className="font-mono"
                style={{
                  fontWeight: 700,
                  color: liveToast.isIn
                    ? 'var(--invariant-emerald)'
                    : 'var(--quarantine-crimson)',
                }}
              >
                {liveToast.isIn ? `+${liveToast.delta}` : liveToast.delta}
              </span>{' '}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                [Tồn sau: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{liveToast.balanceAfter}</span>]
              </span>
            </div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Industrial Console Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--deck-black)',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          IWMS Console · Kiến trúc Ledger-First & Khóa đồng thời mức cơ sở dữ liệu
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>PostgreSQL 16 + Drizzle ORM</span>
          <span>NestJS API + BullMQ</span>
          <span>Zero Oversell Guarantee</span>
        </div>
      </footer>
    </div>
  );
};
