import { Injectable } from '@nestjs/common';
import { pool } from '@iwms/db';

@Injectable()
export class AuditService {
  async getAuditLogs(params: {
    entityType?: string;
    entityId?: number;
    userId?: number;
    limit?: number;
    page?: number;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Math.min(100, Number(params.limit || 30)));
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const values: any[] = [];

    if (params.entityType) {
      values.push(params.entityType);
      where += ` AND al.entity_type = $${values.length}`;
    }
    if (params.entityId) {
      values.push(params.entityId);
      where += ` AND al.entity_id = $${values.length}`;
    }
    if (params.userId) {
      values.push(params.userId);
      where += ` AND al.user_id = $${values.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${where}`,
      values,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(
      `SELECT
        al.id,
        al.user_id,
        u.full_name AS user_name,
        u.role AS user_role,
        al.action,
        al.entity_type,
        al.entity_id,
        al.before,
        al.after,
        al.ip,
        al.request_id,
        al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values,
    );

    return {
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
