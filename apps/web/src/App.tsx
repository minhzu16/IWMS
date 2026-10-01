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
import { Zap, X } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  // Global Modals
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  // Real-time SSE Toast
  const [liveToast, setLiveToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/inventory/stream');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const delta = data.qty_on_hand_delta;
          const isIn = Number(delta) > 0;
          setLiveToast({
            message: `⚡ Biến động tức thời: ${data.movement_type} (${isIn ? '+' : ''}${delta}) [Balance After: ${data.balance_after}]`,
            type: isIn ? 'in' : 'out',
          });
          setTimeout(() => setLiveToast(null), 4500);
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
      <main style={{ flex: 1, paddingBottom: 60 }}>
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

      {/* Real-time SSE Live Toast */}
      {liveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: 'var(--bg-secondary)',
            border: liveToast.type === 'in' ? '1px solid #10b981' : '1px solid #f43f5e',
            borderRadius: 12,
            padding: '14px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: 420,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: liveToast.type === 'in' ? 'var(--accent-emerald-light)' : 'var(--accent-rose-light)',
              color: liveToast.type === 'in' ? '#34d399' : '#fb7185',
            }}
          >
            <Zap size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              {liveToast.message}
            </span>
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
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-muted)',
          background: 'rgba(11, 15, 25, 0.8)',
        }}
      >
        IWMS · Enterprise Inventory & Warehouse Management System · Built with Ledger-First Architecture, Concurrency Locks & RBAC
      </footer>
    </div>
  );
};
