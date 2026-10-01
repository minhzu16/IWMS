import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Normal load
    { duration: '30s', target: 100 }, // Peak load 100 VUs
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/api/v1';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `K6-${__VU}-${__ITER}-${Date.now()}`,
  };

  // 1. Read Stock Levels
  const levelsRes = http.get(`${BASE_URL}/inventory/levels`, { headers });
  check(levelsRes, {
    'status is 200 on levels': (r) => r.status === 200,
  });

  sleep(0.5);

  // 2. Read Stock Movements
  const movementsRes = http.get(`${BASE_URL}/inventory/movements?limit=25`, { headers });
  check(movementsRes, {
    'status is 200 on movements': (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Periodic Reconcile Check (Invariant Check)
  if (__ITER % 20 === 0) {
    const reconRes = http.get(`${BASE_URL}/inventory/reconcile`, { headers });
    check(reconRes, {
      'status is 200 on reconcile': (r) => r.status === 200,
      'discrepancy count is 0': (r) => JSON.parse(r.body).discrepancyCount === 0,
    });
  }

  sleep(1);
}
