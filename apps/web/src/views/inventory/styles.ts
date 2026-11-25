import type { CSSProperties } from 'react';
import type { StockLevel } from '../../api/client.js';

export const containerStyle: CSSProperties = {
  padding: '24px',
  maxWidth: 1440,
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

export const subTabGroupStyle: CSSProperties = {
  display: 'flex',
  background: 'var(--deck-panel)',
  padding: 3,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  gap: 3,
};

export const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  display: 'block',
};

export const successAlertStyle: CSSProperties = {
  padding: 10,
  background: 'var(--invariant-emerald-subtle)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 12,
  color: 'var(--invariant-emerald)',
  fontSize: 12,
};

export const FALLBACK_LEVELS: StockLevel[] = [
  {
    product_id: 1,
    sku: 'CPU-INT-14700K',
    product_name: 'Intel Core i7-14700K 20-Core',
    barcode: '893850123001',
    uom: 'box',
    warehouse_code: 'WH-NORTH',
    warehouse_name: 'Kho Tổng Miền Bắc',
    on_hand: 50,
    reserved: 5,
    available: 45,
    damaged: 0,
    avg_cost: 380,
    reorder_point: 15,
  },
  {
    product_id: 4,
    sku: 'SSD-SAM-990P-2TB',
    product_name: 'Samsung 990 PRO NVMe 2TB',
    barcode: '893850123004',
    uom: 'pcs',
    warehouse_code: 'WH-NORTH',
    warehouse_name: 'Kho Tổng Miền Bắc',
    on_hand: 80,
    reserved: 0,
    available: 80,
    damaged: 2,
    avg_cost: 172.5,
    reorder_point: 20,
  },
  {
    product_id: 5,
    sku: 'GPU-RTX-4080S',
    product_name: 'ASUS TUF RTX 4080 SUPER 16GB',
    barcode: '893850123005',
    uom: 'box',
    warehouse_code: 'WH-SOUTH',
    warehouse_name: 'Kho Phân Phối Miền Nam',
    on_hand: 30,
    reserved: 2,
    available: 28,
    damaged: 0,
    avg_cost: 990,
    reorder_point: 10,
  },
];
