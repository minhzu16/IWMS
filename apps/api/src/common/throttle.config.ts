import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };
export const REFRESH_THROTTLE = { default: { limit: 60, ttl: 60_000 } };

export function throttlerOptions(limitPerMinute: number): ThrottlerModuleOptions {
  return {
    throttlers: [{ name: 'default', ttl: 60_000, limit: limitPerMinute }],
  };
}
