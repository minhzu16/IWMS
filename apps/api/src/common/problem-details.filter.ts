import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ZodError } from 'zod';

export class InsufficientStockException extends HttpException {
  constructor(details: { productId: number; warehouseId: number; available: number; requested: number }) {
    super(
      {
        type: 'https://iwms.local/errors/insufficient-stock',
        title: 'Tồn kho khả dụng không đủ',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: `Sản phẩm #${details.productId} tại kho #${details.warehouseId} chỉ còn ${details.available} khả dụng, nhưng yêu cầu ${details.requested}.`,
        code: 'INSUFFICIENT_STOCK',
        ...details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InvalidStateTransitionException extends HttpException {
  constructor(message: string) {
    super(
      {
        type: 'https://iwms.local/errors/invalid-state-transition',
        title: 'Chuyển trạng thái chứng từ không hợp lệ',
        status: HttpStatus.BAD_REQUEST,
        detail: message,
        code: 'INVALID_STATE_TRANSITION',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class VersionConflictException extends HttpException {
  constructor(message: string = 'Dữ liệu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.') {
    super(
      {
        type: 'https://iwms.local/errors/version-conflict',
        title: 'Xung đột phiên bản dữ liệu (Optimistic Lock)',
        status: HttpStatus.CONFLICT,
        detail: message,
        code: 'VERSION_CONFLICT',
      },
      HttpStatus.CONFLICT,
    );
  }
}

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: unknown;
  instance: string;
  timestamp: string;
  requestId: unknown;
  errors?: unknown;
  [key: string]: unknown;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Set by requestId middleware, which already validated or replaced the client's header.
    const requestId = request.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let problem: ProblemBody = {
      type: 'https://iwms.local/errors/internal-server-error',
      title: 'Lỗi máy chủ nội bộ',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Đã xảy ra lỗi không mong muốn trên hệ thống.',
      instance: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        // Built-in Nest exceptions answer { statusCode, message, error }; map them onto RFC 7807 fields.
        // Custom exceptions that already carry type/title/detail override these defaults via the spread.
        const { statusCode: _statusCode, message, error, ...rest } = res as Record<string, unknown>;
        const detail = Array.isArray(message) ? message.join(', ') : message;
        problem = {
          ...problem,
          type: `https://iwms.local/errors/http-${status}`,
          title: typeof error === 'string' ? error : exception.name,
          detail: typeof detail === 'string' ? detail : exception.message,
          ...rest,
          status,
          instance: request.url,
          requestId,
          // Preserve original NestJS fields for backward compatibility
          statusCode: status,
          message: message !== undefined ? message : (typeof detail === 'string' ? detail : exception.message),
          error: typeof error === 'string' ? error : exception.name,
        };
      } else {
        problem.detail = res;
        problem.status = status;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      problem = {
        type: 'https://iwms.local/errors/validation',
        title: 'Dữ liệu không hợp lệ',
        status: HttpStatus.BAD_REQUEST,
        detail: exception.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
        errors: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        instance: request.url,
        requestId,
        timestamp: problem.timestamp,
      };
    } else if (exception instanceof Error) {
      // Keep the generic Vietnamese detail that the default problem already has
      // ('Đã xảy ra lỗi không mong muốn trên hệ thống.'), do NOT copy exception.message.
      problem.detail = 'Đã xảy ra lỗi không mong muốn trên hệ thống.';
    }

    if (status >= 500) {
      const message = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : new Error(message).stack;
      Logger.error(`[${requestId}] ${message}`, stack);
    }

    response.status(status).header('Content-Type', 'application/problem+json').json(problem);
  }
}
