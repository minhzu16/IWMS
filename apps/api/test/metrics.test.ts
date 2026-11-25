import { describe, it, expect } from 'vitest';
import { MetricsService } from '../src/modules/metrics/metrics.service.js';

describe('MetricsService (PJ2)', () => {
  it('initializes custom metrics and registers default node metrics with iwms_ prefix', async () => {
    const service = new MetricsService();
    service.httpRequestsTotal.inc({ method: 'GET', route: '/api/v1/inventory/levels', status_code: '200' });
    service.httpRequestDuration.observe({ method: 'GET', route: '/api/v1/inventory/levels', status_code: '200' }, 0.05);

    const output = await service.getMetrics();
    expect(output).toContain('iwms_http_requests_total');
    expect(output).toContain('iwms_http_request_duration_seconds');
    expect(output).toContain('iwms_process_cpu_user_seconds_total');
    expect(service.getContentType()).toContain('text/plain');
  });
});
