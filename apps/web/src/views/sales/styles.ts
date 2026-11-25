import type { CSSProperties } from 'react';

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

export const sectionSwitcherStyle: CSSProperties = {
  display: 'flex',
  background: 'var(--bg-tertiary)',
  padding: 4,
  borderRadius: 10,
};

export const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
};

export const formStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
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

export function getSoBadgeClass(status: string): string {
  if (status === 'SHIPPED') return 'badge-emerald';
  if (status === 'CONFIRMED') return 'badge-amber';
  if (status === 'CANCELLED') return 'badge-rose';
  return 'badge-indigo';
}

export function getTransferBadgeClass(status: string): string {
  if (status === 'RECEIVED') return 'badge-emerald';
  if (status === 'DISPATCHED') return 'badge-cyan';
  return 'badge-indigo';
}
