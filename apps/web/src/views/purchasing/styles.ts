import type { CSSProperties } from 'react';
import type { PurchaseOrderSummary, PurchaseOrderDetail } from './types.js';

export const containerStyle: CSSProperties = {
  padding: '24px',
  maxWidth: 1400,
  margin: '0 auto',
};

export const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
  gap: 14,
};

export const mainGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '380px 1fr',
  gap: 24,
};

export const poListCardStyle: CSSProperties = {
  padding: 16,
};

export const poListContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

export const poItemCardStyle = (isSelected: boolean): CSSProperties => ({
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer',
  background: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
  border: isSelected ? '1px solid var(--transit-indigo)' : '1px solid var(--border-subtle)',
  transition: 'all 0.15s ease',
});

export const emptyDetailCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 300,
};

export const stepperContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
  padding: '12px 18px',
  background: 'var(--bg-secondary)',
  borderRadius: 10,
};

export const stepCircleStyle = (isPassed: boolean): CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: isPassed ? 'var(--invariant-emerald)' : 'var(--bg-tertiary)',
  color: isPassed ? '#ffffff' : 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
});

export const receiptModalContentStyle: CSSProperties = {
  maxWidth: 720,
};

export const createPoModalContentStyle: CSSProperties = {
  maxWidth: 700,
};

export const PO_STEPS = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
] as const;

export function getPoBadgeClass(status: string): string {
  if (status === 'RECEIVED') return 'badge-emerald';
  if (status === 'APPROVED') return 'badge-indigo';
  if (status === 'PARTIALLY_RECEIVED') return 'badge-amber';
  return 'badge-purple';
}

export const SAMPLE_POS: PurchaseOrderSummary[] = [
  {
    id: 1,
    po_number: 'PO-2026-000001',
    supplier_name: 'Samsung Electronics VN',
    warehouse_name: 'Kho Tổng Miền Bắc',
    status: 'APPROVED',
    expected_date: '2026-10-10',
    item_count: 1,
    total_amount: 6720.0,
    received_amount: 0,
    version: 1,
    created_by_name: 'Lê Thu Mua',
  },
];

export const createSamplePoDetail = (id: number): PurchaseOrderDetail => ({
  id,
  po_number: `PO-2026-${String(id).padStart(6, '0')}`,
  supplier_name: 'Samsung Electronics VN',
  warehouse_name: 'Kho Tổng Miền Bắc',
  warehouse_id: 1,
  status: 'APPROVED',
  version: 1,
  lines: [
    {
      id: 1,
      product_id: 4,
      sku: 'SSD-SAM-990P-2TB',
      product_name: 'Samsung 990 PRO NVMe 2TB',
      uom: 'pcs',
      qty_ordered: 40,
      qty_received: 0,
      unit_price: 168.0,
    },
  ],
  receipts: [],
});
