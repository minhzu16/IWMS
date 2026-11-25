import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { requestId } from '../src/common/request-id.middleware.js';

@Controller()
class TestController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe('Request ID middleware', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    app.use(requestId);
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('a request with x-request-id: abc-123 gets the same header back', async () => {
    const res = await fetch(`${base}/ping`, {
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('abc-123');
  });

  it('a request without it gets a UUID', async () => {
    const res = await fetch(`${base}/ping`);
    expect(res.status).toBe(200);
    const id = res.headers.get('x-request-id');
    expect(id).toBeDefined();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('a request with x-request-id: <script> gets a fresh UUID instead', async () => {
    const res = await fetch(`${base}/ping`, {
      headers: { 'x-request-id': '<script>' },
    });
    expect(res.status).toBe(200);
    const id = res.headers.get('x-request-id');
    expect(id).toBeDefined();
    expect(id).not.toBe('<script>');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
