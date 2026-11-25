import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { pool } from '@iwms/db';
import { UserRoles } from '@iwms/shared';
import bcrypt from 'bcrypt';
import { z } from 'zod';

export const ROLES = Object.values(UserRoles) as [string, ...string[]];

export const ListUsersSchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const CreateUserSchema = z.object({
  email: z.string().email().max(200),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(ROLES),
  password: z.string().min(10).max(200),
});

export const UpdateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, 'Nothing to update');

function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((i) => i.message).join(', '));
  }
  return result.data;
}

export interface UserRow {
  id: string | number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string | Date;
}

function toUser(row: UserRow) {
  return {
    id: Number(row.id),
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

@Injectable()
export class AdminService {
  async stats() {
    const [rolesRes, catalogRes, stockRes, movementsRes] = await Promise.all([
      pool.query(`SELECT role, count(*)::int AS n, count(*) FILTER (WHERE is_active)::int AS active FROM users GROUP BY role`),
      pool.query(`SELECT (SELECT count(*) FROM products WHERE is_active)::int AS products, (SELECT count(*) FROM warehouses WHERE is_active)::int AS warehouses`),
      pool.query(`SELECT count(*) FILTER (WHERE on_hand = 0)::int AS out_of_stock, COALESCE(sum(on_hand * avg_cost), 0) AS on_hand_value FROM stock_levels`),
      pool.query(`SELECT count(*)::int AS n FROM stock_movements WHERE created_at >= now() - interval '24 hours'`),
    ]);

    const byRole: Record<string, number> = Object.fromEntries(ROLES.map((r) => [r, 0]));
    let total = 0;
    let active = 0;

    for (const r of rolesRes.rows) {
      const count = Number(r.n);
      const activeCount = Number(r.active);
      total += count;
      active += activeCount;
      byRole[r.role] = count;
    }

    return {
      users: {
        total,
        active,
        byRole,
      },
      catalog: {
        products: Number(catalogRes.rows[0]?.products ?? 0),
        warehouses: Number(catalogRes.rows[0]?.warehouses ?? 0),
      },
      stock: {
        outOfStock: Number(stockRes.rows[0]?.out_of_stock ?? 0),
        onHandValue: Number(stockRes.rows[0]?.on_hand_value ?? 0),
      },
      movements: {
        last24h: Number(movementsRes.rows[0]?.n ?? 0),
      },
    };
  }

  async listUsers(query: unknown) {
    const { search, role, page, pageSize } = parse(ListUsersSchema, query);
    const offset = (page - 1) * pageSize;
    const searchParam = search ? `%${escapeIlike(search)}%` : null;
    const roleParam = role ?? null;

    const res = await pool.query(
      `SELECT id, email, full_name, role, is_active, created_at, count(*) OVER()::int AS total FROM users
       WHERE ($1::text IS NULL OR email ILIKE $1 OR full_name ILIKE $1) AND ($2::text IS NULL OR role = $2)
       ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4`,
      [searchParam, roleParam, pageSize, offset],
    );

    let total = res.rows[0]?.total ? Number(res.rows[0].total) : 0;
    if (res.rows.length === 0) {
      const countRes = await pool.query(
        `SELECT count(*)::int AS total FROM users
         WHERE ($1::text IS NULL OR email ILIKE $1 OR full_name ILIKE $1) AND ($2::text IS NULL OR role = $2)`,
        [searchParam, roleParam],
      );
      total = Number(countRes.rows[0]?.total ?? 0);
    }

    return {
      items: res.rows.map(toUser),
      total,
      page,
      pageSize,
    };
  }

  async createUser(body: unknown) {
    const { email, fullName, role, password } = parse(CreateUserSchema, body);
    const hash = await bcrypt.hash(password, 12);

    try {
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role, is_active, created_at`,
        [email.toLowerCase().trim(), hash, fullName.trim(), role],
      );
      return toUser(res.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Email already exists');
      }
      throw err;
    }
  }

  async updateUser(id: number, body: unknown, actorId: number) {
    const data = parse(UpdateUserSchema, body);
    // JWT ids come from BIGSERIAL columns, which pg returns as strings: compare numerically.
    if (id === Number(actorId)) {
      throw new BadRequestException('You cannot change your own role or status');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize every role/status change so the "keep one active ADMIN" check cannot interleave.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('iwms:admin-roster'))");
      const current = await client.query<{ id: string | number; role: string; is_active: boolean }>(
        'SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (current.rows.length === 0) throw new NotFoundException('User not found');
      const before = current.rows[0];
      const nextRole = data.role ?? before.role;
      const nextActive = data.isActive ?? before.is_active;
      const losesAdmin = before.role === 'ADMIN' && before.is_active && !(nextRole === 'ADMIN' && nextActive);
      if (losesAdmin) {
        const others = await client.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1",
          [id],
        );
        if (others.rows[0].n === 0) throw new BadRequestException('Phải giữ lại ít nhất một tài khoản ADMIN hoạt động');
      }
      const res = await client.query<UserRow>(
        `UPDATE users SET role = $1, is_active = $2 WHERE id = $3
         RETURNING id, email, full_name, role, is_active, created_at`,
        [nextRole, nextActive, id],
      );
      await client.query('COMMIT');
      return toUser(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
