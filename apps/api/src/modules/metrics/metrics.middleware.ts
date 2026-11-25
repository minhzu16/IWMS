import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) { }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (path.includes('/metrics')) {
      return next();
    }

    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const rawPath = (req.originalUrl || req.url || req.path || '').split('?')[0];
      let route: string;
      if (res.statusCode === 404) {
        route = 'unmatched';
      } else {
        route =
          req.route?.path ||
          rawPath.replace(/\/(\d+|[0-9a-f-]{36})(?=\/|$)/gi, '/:id') ||
          '/';
      }
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.httpRequestsTotal.inc(labels);
      this.metrics.httpRequestDuration.observe(labels, seconds);
    });

    next();
  }
}
