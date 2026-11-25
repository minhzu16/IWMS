import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Body,
  Controller,
  Post,
  Get,
  Module,
  UseGuards,
  UnauthorizedException,
  type CanActivate,
  type INestApplication,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoginSchema } from '@iwms/shared';
import { MetricsModule } from '../src/modules/metrics/metrics.module.js';
import { MetricsService } from '../src/modules/metrics/metrics.service.js';
import { ProblemDetailsFilter } from '../src/common/problem-details.filter.js';

@Controller()
class TestController {
  @Post('boom')
  boom(@Body() b: unknown) {
    LoginSchema.parse(b);
  }

  @Get('guarded')
  @UseGuards(
    class implements CanActivate {
      canActivate() {
        throw new UnauthorizedException();
      }
    },
  )
  guarded() {
    return { ok: true };
  }
}

@Module({
  imports: [MetricsModule],
  controllers: [TestController],
})
class TestModule {}

describe('HTTP metrics error status code (F4)', () => {
  let app: INestApplication;
  let base: string;
  let metricsService: MetricsService;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    metricsService = app.get(MetricsService);
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('records 400 instead of 500 when exception filter maps validation error', async () => {
    const res = await fetch(`${base}/boom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);

    let metrics = '';
    for (let i = 0; i < 20 && !metrics.includes('status_code="400"'); i++) {
      metrics = await metricsService.getMetrics();
      if (!metrics.includes('status_code="400"')) await new Promise((r) => setTimeout(r, 25));
    }

    expect(metrics).toContain('status_code="400"');
    expect(metrics).not.toContain('status_code="500"');
  });

  it('records 401 when route is rejected by guard', async () => {
    const res = await fetch(`${base}/guarded`);

    expect(res.status).toBe(401);

    let metrics = '';
    for (let i = 0; i < 20 && !metrics.includes('status_code="401"'); i++) {
      metrics = await metricsService.getMetrics();
      if (!metrics.includes('status_code="401"')) await new Promise((r) => setTimeout(r, 25));
    }

    expect(metrics).toContain('status_code="401"');
    expect(metrics).toContain('route="/guarded"');
  });

  it('records route="unmatched" for 404 responses (W5-2)', async () => {
    const res = await fetch(`${base}/random-unmatched-path-12345`);
    expect(res.status).toBe(404);

    let metrics = '';
    for (let i = 0; i < 20 && !metrics.includes('route="unmatched"'); i++) {
      metrics = await metricsService.getMetrics();
      if (!metrics.includes('route="unmatched"')) await new Promise((r) => setTimeout(r, 25));
    }

    expect(metrics).toContain('route="unmatched"');
    expect(metrics).toContain('status_code="404"');
  });

  it('protects /metrics endpoint with METRICS_TOKEN when configured (W5-1)', async () => {
    const originalToken = process.env.METRICS_TOKEN;
    try {
      process.env.METRICS_TOKEN = 'secret-metrics-token-xyz';

      // Anonymous / missing header -> 401
      const unauthRes = await fetch(`${base}/metrics`);
      expect(unauthRes.status).toBe(401);

      // Wrong token -> 401
      const wrongRes = await fetch(`${base}/metrics`, {
        headers: { Authorization: 'Bearer wrong-token' },
      });
      expect(wrongRes.status).toBe(401);

      // Valid token -> 200
      const okRes = await fetch(`${base}/metrics`, {
        headers: { Authorization: 'Bearer secret-metrics-token-xyz' },
      });
      expect(okRes.status).toBe(200);
      const text = await okRes.text();
      expect(text).toContain('iwms_http_requests_total');
    } finally {
      if (originalToken !== undefined) {
        process.env.METRICS_TOKEN = originalToken;
      } else {
        delete process.env.METRICS_TOKEN;
      }
    }
  });
});
