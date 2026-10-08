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
    { id: null, name: 'Tất cả các kho' },
    { id: 1, name: 'Kho Tổng Miền Bắc (Hà Nội)' },
    { id: 2, name: 'Kho Phân Phối Miền Nam (TP.HCM)' },
    { id: 3, name: 'Kho Trung Chuyển Miền Trung' },
  ];

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan vận hành', icon: LayoutDashboard },
    { id: 'inventory', label: 'Tồn kho & Sổ cái', icon: Layers },
    { id: 'catalog', label: 'Sản phẩm & Đối tác', icon: Store },
    { id: 'purchasing', label: 'Mua hàng & Nhập kho', icon: ShoppingCart },
    { id: 'sales', label: 'Bán hàng & Điều chuyển', icon: Truck },
    { id: 'quality', label: 'Hàng lỗi & Kiểm kê', icon: AlertOctagon },
    { id: 'audit', label: 'Nhật ký kiểm toán', icon: History },
  ];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 12, 20, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top Console Deck */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Brand & Telemetry Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--deck-panel)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--telemetry-cyan)',
            }}
          >
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                IWMS <span style={{ color: 'var(--telemetry-cyan)', fontWeight: 600, fontSize: 13 }}>Console</span>
              </span>
              <span
                className="badge badge-emerald font-mono"
                style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span className="beacon-dot" />
                Sổ cái bất biến: Đồng bộ 100%
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Kiểm soát tồn kho nguyên tử · Chống bán âm · Khử deadlock
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Warehouse Selector */}
          <div style={{ position: 'relative' }}>
            <select
              id="select-active-warehouse"
              className="select font-mono"
              style={{
                width: 220,
                fontSize: 12,
                padding: '6px 10px',
                background: 'var(--deck-panel)',
                borderColor: 'var(--border-medium)',
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
            title="Tra cứu & tạo mã vạch Code128"
          >
            <Barcode size={15} color="var(--telemetry-cyan)" />
            Mã vạch Code128
          </button>

          {/* Reconcile Button */}
          <button
            id="btn-nav-reconcile"
            className="btn btn-primary btn-sm"
            onClick={onOpenReconcile}
            title="Đối soát số dư toán học SUM(movements) == on_hand"
          >
            <ShieldCheck size={15} />
            Đối soát số dư
          </button>

          {/* User Role Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--deck-panel)',
              border: '1px solid var(--border-medium)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quyền:</span>
            <select
              id="select-user-role"
              className="select font-mono"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--telemetry-cyan)',
                fontWeight: 700,
                fontSize: 12,
                width: 'auto',
                padding: '2px 4px',
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

      {/* Segmented Industrial Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: 2,
          padding: '4px 20px',
          overflowX: 'auto',
          background: 'var(--deck-black)',
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
                gap: 7,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--deck-surface)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-medium)' : 'transparent',
                borderBottom: isActive ? '2px solid var(--telemetry-cyan)' : '2px solid transparent',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                cursor: 'pointer',
                transition: 'background-color 0.12s ease, border-color 0.12s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} color={isActive ? 'var(--telemetry-cyan)' : 'var(--text-muted)'} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
