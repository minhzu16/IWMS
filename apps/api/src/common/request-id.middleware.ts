import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const logger = new Logger('HTTP');

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const rawHeader = req.headers['x-request-id'];
  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const id = typeof headerValue === 'string' && /^[\w-]{1,64}$/.test(headerValue)
    ? headerValue
    : crypto.randomUUID();

  req.id = id;
  res.setHeader('x-request-id', id);

  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const path = (req.originalUrl || req.url || '').split('?')[0];
    logger.log({
      id,
      method: req.method,
      path,
      status: res.statusCode,
      ms,
    });
  });

  next();
}
