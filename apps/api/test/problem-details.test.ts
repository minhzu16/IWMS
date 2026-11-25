import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { ProblemDetailsFilter } from '../src/common/problem-details.filter';
import { LoginSchema } from '@iwms/shared';

describe('ProblemDetailsFilter', () => {
  let filter: ProblemDetailsFilter;

  beforeEach(() => {
    filter = new ProblemDetailsFilter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not leak internal error messages to clients for generic Error (status 500)', () => {
    const loggerSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    const res = {
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn(),
    };

    const req = {
      url: '/x',
      id: 'req-1',
      headers: {},
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    const error = new Error('duplicate key value violates unique constraint "users_email_key"');
    filter.catch(error, host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.header).toHaveBeenCalledWith('Content-Type', 'application/problem+json');
    expect(res.json).toHaveBeenCalled();

    const body = res.json.mock.calls[0][0];
    expect(body.detail).not.toContain('duplicate key');
    expect(body.detail).toBe('Đã xảy ra lỗi không mong muốn trên hệ thống.');
    expect(body.requestId).toBe('req-1');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate key'),
      expect.anything(),
    );
  });

  it('preserves detail message for 4xx HttpException (BadRequestException)', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn(),
    };

    const req = {
      url: '/x',
      id: 'req-1',
      headers: {},
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    const exception = new BadRequestException('Email đã tồn tại');
    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.header).toHaveBeenCalledWith('Content-Type', 'application/problem+json');
    expect(res.json).toHaveBeenCalled();

    const body = res.json.mock.calls[0][0];
    expect(body.detail).toBe('Email đã tồn tại');
  });

  it('maps ZodError to status 400 validation error without logging 5xx', () => {
    const loggerSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});

    const res = {
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn(),
    };

    const req = {
      url: '/api/v1/auth/login',
      id: 'req-zod-1',
      headers: {},
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    const result = LoginSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      filter.catch(result.error, host);
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.header).toHaveBeenCalledWith('Content-Type', 'application/problem+json');
    expect(res.json).toHaveBeenCalled();

    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe(400);
    expect(body.type).toBe('https://iwms.local/errors/validation');
    expect(body.title).toBe('Dữ liệu không hợp lệ');
    expect(body.instance).toBe('/api/v1/auth/login');
    expect(body.requestId).toBe('req-zod-1');
    expect(body.timestamp).toBeDefined();
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
      ]),
    );
    expect(body.errors.some((err: { path: string }) => err.path === 'email')).toBe(true);
    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
