import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service.js';

/** Constant-time comparison so the token cannot be guessed from response timing. */
function tokenMatches(header: string | undefined, token: string): boolean {
  const expected = Buffer.from(`Bearer ${token}`);
  const actual = Buffer.from(header ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const requiredToken = process.env.METRICS_TOKEN;
    if (requiredToken && !tokenMatches(req.headers.authorization, requiredToken)) {
      res.status(401).send('Unauthorized: Invalid or missing metrics token');
      return;
    }
    res.setHeader('Content-Type', this.metricsService.getContentType());
    res.send(await this.metricsService.getMetrics());
  }
}
