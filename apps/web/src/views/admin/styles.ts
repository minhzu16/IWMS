import type { CSSProperties } from 'react';
import { getAuthToken } from '../../api/client.js';

export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const overflowCardStyle: CSSProperties = {
  overflow: 'hidden',
};

export const alertBoxStyle: CSSProperties = {
  padding: '10px 14px',
  marginBottom: 16,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--quarantine-crimson-subtle)',
  color: 'var(--quarantine-crimson)',
  fontSize: 13,
  border: '1px solid var(--quarantine-crimson)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const statusSuccessBoxStyle: CSSProperties = {
  padding: '10px 14px',
  marginBottom: 16,
  borderRadius: 'var(--radius-sm)',
  background: 'var(--invariant-emerald-subtle)',
  color: 'var(--invariant-emerald)',
  fontSize: 13,
  border: '1px solid var(--invariant-emerald)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const ROLES = ['ADMIN', 'MANAGER', 'PURCHASING', 'WAREHOUSE', 'SALES', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** Reads the user id from the access token payload (UI hint only; the server enforces the rule). */
export function currentUserId(): number | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.id !== undefined ? Number(payload.id) : null;
  } catch {
    return null;
  }
}
