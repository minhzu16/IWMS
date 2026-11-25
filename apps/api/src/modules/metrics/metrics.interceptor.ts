import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service.js';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(@Inject(MetricsService) private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    const path = req.path || req.url || '';
    if (path.includes('/metrics')) {
      return next.handle();
    }

    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const route = req.route?.path || path;
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metricsService.httpRequestsTotal.inc(labels);
      this.metricsService.httpRequestDuration.observe(labels, seconds);
    });

    return next.handle();
  }
}
