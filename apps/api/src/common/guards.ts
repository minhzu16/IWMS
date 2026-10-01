import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RequestUser } from './decorators.js';
import { UserRole } from '@iwms/shared';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies && request.cookies.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('Chưa cung cấp token xác thực hoặc phiên đăng nhập đã hết hạn');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-iwms-2026-production-grade',
      });
      request.user = payload as RequestUser;
      return true;
    } catch {
      throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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
