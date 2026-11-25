import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Navbar } from './Navbar';
import { AdminStats } from '../views/admin/AdminStats';
import { AdminStats as AdminStatsType } from '../api/client';

afterEach(() => {
  cleanup();
});

describe('PJ2 Web UI Components', () => {
  it('Navbar renders brand, tabs, and handles warehouse and tab changes', () => {
    const setActiveTab = vi.fn();
    const setSelectedWarehouse = vi.fn();
    const setCurrentRole = vi.fn();
    const onOpenReconcile = vi.fn();
    const onOpenBarcode = vi.fn();

    render(
      <Navbar
        activeTab="inventory"
        setActiveTab={setActiveTab}
        selectedWarehouse={1}
        setSelectedWarehouse={setSelectedWarehouse}
        currentRole="ADMIN"
        setCurrentRole={setCurrentRole}
        onOpenReconcile={onOpenReconcile}
        onOpenBarcode={onOpenBarcode}
      />
    );

    expect(screen.getByText('IWMS')).toBeTruthy();
    expect(screen.getByText('Console')).toBeTruthy();
    expect(screen.getByText('Sổ cái bất biến: Đồng bộ 100%')).toBeTruthy();

    // Tab buttons
    const purchasingTab = screen.getByText('Mua hàng & Nhập kho');
    fireEvent.click(purchasingTab);
    expect(setActiveTab).toHaveBeenCalledWith('purchasing');

    // Action buttons
    const reconcileBtn = screen.getByText('Đối soát số dư');
    fireEvent.click(reconcileBtn);
    expect(onOpenReconcile).toHaveBeenCalledTimes(1);

    const barcodeBtn = screen.getByText('Mã vạch Code128');
    fireEvent.click(barcodeBtn);
    expect(onOpenBarcode).toHaveBeenCalledTimes(1);
  });

  it('AdminStats renders 4 stat cards with formatted metrics', () => {
    const mockStats: AdminStatsType = {
      users: {
        total: 10,
        active: 8,
        byRole: {
          ADMIN: 2,
          MANAGER: 2,
          PURCHASING: 2,
          WAREHOUSE: 2,
          SALES: 1,
          VIEWER: 1,
        },
      },
      catalog: {
        products: 45,
        warehouses: 3,
      },
      stock: {
        outOfStock: 2,
        onHandValue: 1250000000,
      },
      movements: {
        last24h: 34,
      },
    };

    render(<AdminStats stats={mockStats} error={null} />);

    expect(screen.getByText('8 / 10')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // out of stock
    expect(screen.getByText('3')).toBeTruthy(); // warehouses
    expect(screen.getByText('34')).toBeTruthy(); // movements last 24h
  });

  it('AdminStats renders error alert when error is provided', () => {
    render(<AdminStats stats={null} error="Không thể tải dữ liệu thống kê" />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Không thể tải dữ liệu thống kê')).toBeTruthy();
    expect(screen.getByText('— / —')).toBeTruthy();
  });
});
