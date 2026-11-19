import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@iwms/db', () => ({ pool: { query } }));

import { requireSecret } from '../src/common/secrets.js';
import { JwtAuthGuard } from '../src/common/guards.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const ACCESS = 'access-secret-for-tests-0123456789abcdef';
const REFRESH = 'refresh-secret-for-tests-0123456789abcdef';
const LEAKED_DEFAULT = 'super-secret-jwt-key-iwms-2026-production-grade';
const saved = { JWT_SECRET: process.env.JWT_SECRET, JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET };

beforeAll(() => {
  process.env.JWT_SECRET = ACCESS;
  process.env.JWT_REFRESH_SECRET = REFRESH;
});

afterAll(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

// Same wiring as AuthModule: the access secret is the JwtService default.
const jwt = new JwtService({ secret: ACCESS, signOptions: { expiresIn: '1h' } });
const guard = new JwtAuthGuard(jwt);

async function guardAccepts(token: string): Promise<boolean> {
  const request: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  try {
    return await guard.canActivate(context as never);
  } catch {
    return false;
  }
}

async function login() {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  query
    .mockResolvedValueOnce({
      rows: [{ id: 7, email: 'keeper@iwms.test', password_hash: passwordHash, full_name: 'Keeper', role: 'WAREHOUSE', is_active: true }],
    })
    .mockResolvedValueOnce({ rows: [{ warehouse_id: 1 }] });
  return new AuthService(jwt).login({ email: 'keeper@iwms.test', password: 'correct-password' });
}

describe('Signing secrets have no built-in defaults', () => {
  it.each([undefined, '', 'too-short'])('requireSecret refuses %j', (value) => {
    const previous = process.env.JWT_SECRET;
    if (value === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = value;
    try {
      expect(() => requireSecret('JWT_SECRET')).toThrow(/JWT_SECRET must be set/);
    } finally {
      process.env.JWT_SECRET = previous;
    }
  });

  it('rejects tokens signed with the old public default secret', async () => {
    const forged = await new JwtService({ secret: LEAKED_DEFAULT }).signAsync({ id: 1, role: 'ADMIN', typ: 'access' });
    expect(await guardAccepts(forged)).toBe(false);
  });
});

describe('Refresh tokens cannot be used as access tokens', () => {
  it('accepts the access token issued at login', async () => {
    const { accessToken } = await login();
    expect(await guardAccepts(accessToken)).toBe(true);
  });

  it('rejects the refresh token issued at login', async () => {
    const { refreshToken } = await login();
    expect(await guardAccepts(refreshToken)).toBe(false);
  });

  it('signs the refresh token with JWT_REFRESH_SECRET only', async () => {
    const { refreshToken } = await login();
    await expect(jwt.verifyAsync(refreshToken)).rejects.toThrow();
    expect((await jwt.verifyAsync(refreshToken, { secret: REFRESH })).typ).toBe('refresh');
  });

  it('rejects an access-secret token that is not typed as an access token', async () => {
    expect(await guardAccepts(await jwt.signAsync({ id: 7, role: 'ADMIN', typ: 'refresh' }))).toBe(false);
    expect(await guardAccepts(await jwt.signAsync({ id: 7, role: 'ADMIN' }))).toBe(false);
  });
});
