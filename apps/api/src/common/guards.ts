import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RequestUser, ALLOW_QUERY_TOKEN } from './decorators.js';
import { UserRole } from '@iwms/shared';
import { JwtService } from '@nestjs/jwt';
import { pool } from '@iwms/db';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(Reflector) private reflector: Reflector = new Reflector(),
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies && request.cookies.accessToken) {
      token = request.cookies.accessToken;
    } else if (
      request.query &&
      typeof request.query.token === 'string' &&
      this.reflector.getAllAndOverride<boolean>(ALLOW_QUERY_TOKEN, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    ) {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException('Chưa cung cấp token xác thực hoặc phiên đăng nhập đã hết hạn');
    }

    let payload: RequestUser & { typ?: string };
    try {
      // Verified with the access-token secret configured on JwtModule.
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }

    // Re-check is_active and current role in database to prevent deactivated/demoted users
    // from exploiting unexpired access tokens
    if (payload.id) {
      const userRes = await pool.query<{ role: UserRole; is_active: boolean }>(
        'SELECT role, is_active FROM users WHERE id = $1',
        [payload.id],
      );
      const row = userRes.rows[0];
      if (!row || !row.is_active) throw new UnauthorizedException('Tài khoản đã bị tạm khóa hoặc không tồn tại');
      payload.role = row.role;
    }

    request.user = payload;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new UnauthorizedException('Người dùng chưa được xác thực');
    }

    if (user.role === 'ADMIN') {
      return true; // Admin has universal access
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Vai trò "${user.role}" không có quyền truy cập tài nguyên này (yêu cầu: ${requiredRoles.join(', ')})`,
      );
    }

    return true;
  }
}
