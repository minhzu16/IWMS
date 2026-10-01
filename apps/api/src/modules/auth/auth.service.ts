import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { pool } from '@iwms/db';
import bcrypt from 'bcrypt';
import { LoginInput } from '@iwms/shared';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(input: LoginInput) {
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active
       FROM users u WHERE u.email = $1`,
      [input.email.toLowerCase().trim()],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Get assigned warehouses
    const whRes = await pool.query(
      `SELECT warehouse_id FROM user_warehouses WHERE user_id = $1`,
      [user.id],
    );
    const warehouses = whRes.rows.map((r) => Number(r.warehouse_id));

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      warehouses,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: (process.env.JWT_EXPIRATION || '1h') as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id },
      { expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as any },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        warehouses,
      },
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: number) {
    const userRes = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at
       FROM users u WHERE u.id = $1`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy tài khoản');
    }

    const user = userRes.rows[0];
    const whRes = await pool.query(
      `SELECT w.id, w.code, w.name FROM warehouses w
       JOIN user_warehouses uw ON uw.warehouse_id = w.id
       WHERE uw.user_id = $1`,
      [userId],
    );

    return {
      ...user,
      warehouses: whRes.rows,
    };
  }
}
