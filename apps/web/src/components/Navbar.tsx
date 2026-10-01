import React from 'react';
import {
  Boxes,
  ShieldCheck,
  Barcode,
  Layers,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  AlertOctagon,
  History,
  Store,
  ChevronDown,
} from 'lucide-react';
import { UserRole } from '@iwms/shared';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedWarehouse: number | null;
  setSelectedWarehouse: (id: number | null) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  onOpenReconcile: () => void;
  onOpenBarcode: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  selectedWarehouse,
  setSelectedWarehouse,
  currentRole,
  setCurrentRole,
  onOpenReconcile,
  onOpenBarcode,
}) => {
  const roles: UserRole[] = [
    'ADMIN',
    'MANAGER',
    'PURCHASING',
    'WAREHOUSE',
    'SALES',
    'VIEWER',
  ];

  const warehouses = [
    { id: null, name: 'Toàn bộ hệ thống kho' },
    { id: 1, name: 'Kho Tổng Miền Bắc (Hà Nội)' },
    { id: 2, name: 'Kho Phân Phối Miền Nam (TP.HCM)' },
    { id: 3, name: 'Kho Trung Chuyển Miền Trung' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'inventory', label: 'Tồn Kho & Sổ Cái', icon: Layers },
    { id: 'catalog', label: 'Sản Phẩm & NCC', icon: Store },
    { id: 'purchasing', label: 'Mua Hàng (PO)', icon: ShoppingCart },
    { id: 'sales', label: 'Bán Hàng & Chuyển Kho', icon: Truck },
    { id: 'quality', label: 'Hàng Lỗi & Kiểm Kê', icon: AlertOctagon },
    { id: 'audit', label: 'Kiểm Toán (Audit)', icon: History },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Boxes size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                IWMS <span style={{ color: '#818cf8', fontWeight: 500, fontSize: 14 }}>Enterprise</span>
              </span>
              <span className="badge badge-emerald animate-pulse-glow" style={{ fontSize: 11, padding: '2px 8px' }}>
                ● Ledger Verified 100%
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Inventory & Warehouse Management System · Concurrency & Ledger-First
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Warehouse Selector */}
          <div style={{ position: 'relative' }}>
            <select
              id="select-active-warehouse"
              className="select"
              style={{
                width: 230,
                fontSize: 13,
                padding: '7px 12px',
                background: 'var(--bg-tertiary)',
              }}
              value={selectedWarehouse || ''}
              onChange={(e) =>
                setSelectedWarehouse(e.target.value ? Number(e.target.value) : null)
              }
            >
              {warehouses.map((w) => (
                <option key={String(w.id)} value={w.id || ''}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barcode Quick Button */}
          <button
            id="btn-nav-barcode"
            className="btn btn-secondary btn-sm"
            onClick={onOpenBarcode}
            title="Quét mã vạch sản phẩm"
          >
            <Barcode size={16} />
            Mã Vạch
          </button>

          {/* Reconcile Button */}
          <button
            id="btn-nav-reconcile"
            className="btn btn-primary btn-sm"
            onClick={onOpenReconcile}
            title="Chạy đối soát toán học bất biến"
          >
            <ShieldCheck size={16} />
            Đối Soát Sổ Cái
          </button>

          {/* User Role Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vai trò:</span>
            <select
              id="select-user-role"
              className="select"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#818cf8',
                fontWeight: 700,
                fontSize: 12,
                width: 'auto',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: 4,
          padding: '6px 24px',
          overflowX: 'auto',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-primary-light)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? '#818cf8' : 'currentColor'} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
