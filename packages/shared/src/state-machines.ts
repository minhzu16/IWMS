import {
  POStatus,
  POStatuses,
  SOStatus,
  SOStatuses,
  TransferStatus,
  TransferStatuses,
  DamageStatus,
  DamageStatuses,
  CountStatus,
  CountStatuses,
  UserRole,
} from './constants.js';

export interface StateTransition<TState extends string> {
  from: TState[];
  to: TState;
  action: string;
  allowedRoles: UserRole[];
}

export const PO_TRANSITIONS: Record<string, StateTransition<POStatus>> = {
  SUBMIT: {
    from: [POStatuses.DRAFT],
    to: POStatuses.SUBMITTED,
    action: 'SUBMIT',
    allowedRoles: ['ADMIN', 'MANAGER', 'PURCHASING'],
  },
  APPROVE: {
    from: [POStatuses.SUBMITTED],
    to: POStatuses.APPROVED,
    action: 'APPROVE',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  REJECT: {
    from: [POStatuses.SUBMITTED],
    to: POStatuses.DRAFT,
    action: 'REJECT',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  RECEIVE_PARTIAL: {
    from: [POStatuses.APPROVED, POStatuses.PARTIALLY_RECEIVED],
    to: POStatuses.PARTIALLY_RECEIVED,
    action: 'RECEIVE_PARTIAL',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  RECEIVE_FULL: {
    from: [POStatuses.APPROVED, POStatuses.PARTIALLY_RECEIVED],
    to: POStatuses.RECEIVED,
    action: 'RECEIVE_FULL',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  CLOSE: {
    from: [POStatuses.PARTIALLY_RECEIVED],
    to: POStatuses.CLOSED,
    action: 'CLOSE',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
  CANCEL: {
    from: [POStatuses.DRAFT, POStatuses.SUBMITTED, POStatuses.APPROVED],
    to: POStatuses.CANCELLED,
    action: 'CANCEL',
    allowedRoles: ['ADMIN', 'MANAGER', 'PURCHASING'],
  },
};

export function canTransitionPO(
  current: POStatus,
  action: string,
  userRole: UserRole,
): { allowed: boolean; nextStatus?: POStatus; reason?: string } {
  const transition = PO_TRANSITIONS[action];
  if (!transition) {
    return { allowed: false, reason: `Unknown action "${action}"` };
  }
  if (!transition.from.includes(current)) {
    return {
      allowed: false,
      reason: `Cannot ${action} when order status is ${current}. Allowed source statuses: ${transition.from.join(', ')}`,
    };
  }
  if (!transition.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role ${userRole} is not authorized to execute action ${action}`,
    };
  }
  return { allowed: true, nextStatus: transition.to };
}

export const SO_TRANSITIONS: Record<string, StateTransition<SOStatus>> = {
  CONFIRM: {
    from: [SOStatuses.DRAFT],
    to: SOStatuses.CONFIRMED,
    action: 'CONFIRM',
    allowedRoles: ['ADMIN', 'MANAGER', 'SALES'],
  },
  SHIP_PARTIAL: {
    from: [SOStatuses.CONFIRMED, SOStatuses.PARTIALLY_SHIPPED],
    to: SOStatuses.PARTIALLY_SHIPPED,
    action: 'SHIP_PARTIAL',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  SHIP_FULL: {
    from: [SOStatuses.CONFIRMED, SOStatuses.PARTIALLY_SHIPPED],
    to: SOStatuses.SHIPPED,
    action: 'SHIP_FULL',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  CANCEL: {
    from: [SOStatuses.DRAFT, SOStatuses.CONFIRMED],
    to: SOStatuses.CANCELLED,
    action: 'CANCEL',
    allowedRoles: ['ADMIN', 'MANAGER', 'SALES'],
  },
};

export function canTransitionSO(
  current: SOStatus,
  action: string,
  userRole: UserRole,
): { allowed: boolean; nextStatus?: SOStatus; reason?: string } {
  const transition = SO_TRANSITIONS[action];
  if (!transition) {
    return { allowed: false, reason: `Unknown action "${action}"` };
  }
  if (!transition.from.includes(current)) {
    return {
      allowed: false,
      reason: `Cannot ${action} when sales order status is ${current}`,
    };
  }
  if (!transition.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role ${userRole} is not authorized to execute action ${action}`,
    };
  }
  return { allowed: true, nextStatus: transition.to };
}

export const TRANSFER_TRANSITIONS: Record<string, StateTransition<TransferStatus>> = {
  DISPATCH: {
    from: [TransferStatuses.DRAFT],
    to: TransferStatuses.DISPATCHED,
    action: 'DISPATCH',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  RECEIVE: {
    from: [TransferStatuses.DISPATCHED],
    to: TransferStatuses.RECEIVED,
    action: 'RECEIVE',
    allowedRoles: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  CANCEL: {
    from: [TransferStatuses.DRAFT],
    to: TransferStatuses.CANCELLED,
    action: 'CANCEL',
    allowedRoles: ['ADMIN', 'MANAGER'],
  },
};

export function canTransitionTransfer(
  current: TransferStatus,
  action: string,
  userRole: UserRole,
): { allowed: boolean; nextStatus?: TransferStatus; reason?: string } {
  const transition = TRANSFER_TRANSITIONS[action];
  if (!transition) {
    return { allowed: false, reason: `Unknown action "${action}"` };
  }
  if (!transition.from.includes(current)) {
    return {
      allowed: false,
      reason: `Cannot ${action} when transfer status is ${current}`,
    };
  }
  if (!transition.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role ${userRole} is not authorized to execute action ${action}`,
    };
  }
  return { allowed: true, nextStatus: transition.to };
}
