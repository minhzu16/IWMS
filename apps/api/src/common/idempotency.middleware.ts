import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { pool } from '@iwms/db';
import crypto from 'crypto';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const key = req.headers['idempotency-key'] as string;
    if (!key || req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const userId = (req as any).user?.id || 1;
    const requestHash = crypto
      .createHash('sha256')
      .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}`)
      .digest('hex');

    try {
      const existing = await pool.query(
        'SELECT response_status, response_body FROM idempotency_keys WHERE key = $1',
        [key],
      );

      if (existing.rows.length > 0) {
        const cached = existing.rows[0];
        if (cached.response_status) {
          res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
          return res.status(cached.response_status).json(cached.response_body);
        }
      } else {
        await pool.query(
          'INSERT INTO idempotency_keys (key, user_id, request_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [key, userId, requestHash],
        );
      }

      // Intercept response body
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          pool
            .query(
              'UPDATE idempotency_keys SET response_status = $1, response_body = $2 WHERE key = $3',
              [res.statusCode, JSON.stringify(body), key],
            )
            .catch((err) => console.error('[Idempotency] Failed to store response:', err));
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[Idempotency] Error checking key:', err);
      next();
    }
  }
}
