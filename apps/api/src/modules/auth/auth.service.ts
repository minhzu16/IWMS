import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { pool } from '@iwms/db';
import bcrypt from 'bcrypt';
import { LoginInput, UserRole } from '@iwms/shared';
import { requireSecret } from '../../common/secrets.js';

export interface AuthUserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserWarehouseRow {
  warehouse_id: number;
}

export interface UserProfileRow {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface WarehouseBasicRow {
  id: number;
  code: string;
  name: string;
}

export interface UserProfileDetail extends UserProfileRow {
  warehouses: WarehouseBasicRow[];
}

export interface LoginResult {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
    warehouses: number[];
  };
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const userRes = await pool.query<AuthUserRow>(
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
    const whRes = await pool.query<UserWarehouseRow>(
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

    const accessToken = await this.jwtService.signAsync(
      { ...payload, typ: 'access' },
      { expiresIn: (process.env.JWT_EXPIRATION || '1h') as JwtSignOptions['expiresIn'] },
    );

    // Separate secret + typ claim: a refresh token can never pass the access-token guard.
    const refreshToken = await this.jwtService.signAsync(
      { id: user.id, typ: 'refresh' },
      {
        secret: requireSecret('JWT_REFRESH_SECRET'),
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as JwtSignOptions['expiresIn'],
      },
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

  async getProfile(userId: number): Promise<UserProfileDetail> {
    const userRes = await pool.query<UserProfileRow>(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at
       FROM users u WHERE u.id = $1`,
      [userId],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy tài khoản');
    }

    const user = userRes.rows[0];
    const whRes = await pool.query<WarehouseBasicRow>(
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

  async refreshToken(token: string): Promise<LoginResult> {
    let payload: { id: number; typ?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: requireSecret('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token làm mới không hợp lệ hoặc đã hết hạn');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Token không phải là refresh token hợp lệ');
    }

    const userRes = await pool.query<AuthUserRow>(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active
       FROM users u WHERE u.id = $1`,
      [payload.id],
    );

    if (userRes.rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy tài khoản người dùng');
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const whRes = await pool.query<UserWarehouseRow>(
      `SELECT warehouse_id FROM user_warehouses WHERE user_id = $1`,
      [user.id],
    );
    const warehouses = whRes.rows.map((r) => Number(r.warehouse_id));

    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      warehouses,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...tokenPayload, typ: 'access' },
      { expiresIn: (process.env.JWT_EXPIRATION || '1h') as JwtSignOptions['expiresIn'] },
    );

    const refreshToken = await this.jwtService.signAsync(
      { id: user.id, typ: 'refresh' },
      {
        secret: requireSecret('JWT_REFRESH_SECRET'),
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as JwtSignOptions['expiresIn'],
      },
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
}
