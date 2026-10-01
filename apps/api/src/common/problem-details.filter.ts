import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

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

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let problem: any = {
      type: 'https://iwms.local/errors/internal-server-error',
      title: 'Lỗi máy chủ nội bộ',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Đã xảy ra lỗi không mong muốn trên hệ thống.',
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        problem = {
          ...problem,
          ...res,
          status,
          instance: request.url,
        };
      } else {
        problem.detail = res;
        problem.status = status;
      }
    } else if (exception instanceof Error) {
      console.error('[UnhandledException]', exception);
      problem.detail = exception.message;
    }

    response.status(status).header('Content-Type', 'application/problem+json').json(problem);
  }
}
