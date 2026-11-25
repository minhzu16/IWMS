import type { CSSProperties } from 'react';
import type { SupplierPerformance } from '../../api/client.js';

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

export const tabSwitcherStyle: CSSProperties = {
  display: 'flex',
  background: 'var(--bg-tertiary)',
  padding: 4,
  borderRadius: 10,
};

export const suppliersGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: 24,
};

export const supplierCardButtonStyle = (isSelected: boolean): CSSProperties => ({
  all: 'unset',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer',
  boxSizing: 'border-box',
  width: '100%',
  background: isSelected ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
  border: isSelected ? '1px solid var(--transit-indigo)' : '1px solid var(--border-subtle)',
  transition: 'all 0.15s ease',
});

export const metricCardStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  padding: 14,
  borderRadius: 10,
};

export const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  display: 'block',
};

export const modalFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 10,
};

export const createFallbackSupplierPerf = (supplierId: number): SupplierPerformance => ({
  supplierId,
  totalSpend: 142000,
  fillRate: 98.4,
  onTimeRate: 94.2,
  damageRate: 0.8,
  avgLeadTimeDays: 4.8,
  rating: 'EXCELLENT',
});
