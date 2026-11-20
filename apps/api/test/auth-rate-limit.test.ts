import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Module, type INestApplication } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@iwms/db', () => ({ pool: { query } }));

import { AuthController } from '../src/modules/auth/auth.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { throttlerOptions, AUTH_THROTTLE } from '../src/common/throttle.config.js';

@Module({
  imports: [ThrottlerModule.forRoot(throttlerOptions(1000))],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useValue: {
        login: async () => ({ accessToken: 'a', refreshToken: 'r', user: {} }),
      },
    },
    {
      provide: JwtService,
      useValue: new JwtService({ secret: 'test-secret-0123456789abcdef0123456789' }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class TestModule {}

describe('Auth rate limiting', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('login is limited to AUTH_THROTTLE.default.limit requests per minute per client', async () => {
    for (let i = 0; i < AUTH_THROTTLE.default.limit; i++) {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
      });
      expect(res.status).toBe(200);
    }

    const blocked = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
    });
    expect(blocked.status).toBe(429);
  });
});
