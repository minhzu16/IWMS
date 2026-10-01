import React, { useState } from 'react';
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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  // Global Modals
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

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
