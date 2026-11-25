import React from 'react';
import { UserPlus, RotateCw } from 'lucide-react';
import type { AdminUser } from '../../api/client.js';
import { ROLES, visuallyHiddenStyle } from './styles.js';

const formatDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
};

export interface UsersTableProps {
  users: AdminUser[];
  usersLoading: boolean;
  usersError: string | null;
  totalUsers: number;
  page: number;
  pageSize: number;
  searchInput: string;
  roleFilter: string;
  selfId: number | null;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPageChange: (newPage: number) => void;
  onRetryUsers: () => void;
  onRoleChange: (userId: number, newRole: string) => void;
  onToggleStatus: (userId: number, currentActive: boolean) => void;
  onToggleCreate: () => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  usersLoading,
  usersError,
  totalUsers,
  page,
  pageSize,
  searchInput,
  roleFilter,
  selfId,
  onSearchChange,
  onRoleFilterChange,
  onPageChange,
  onRetryUsers,
  onRoleChange,
  onToggleStatus,
  onToggleCreate,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="admin-search-input" style={visuallyHiddenStyle}>
              Tìm kiếm người dùng theo tên hoặc email
            </label>
            <input
              id="admin-search-input"
              type="text"
              className="input"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchInput}
              onChange={onSearchChange}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="admin-role-filter" style={visuallyHiddenStyle}>
              Lọc người dùng theo vai trò
            </label>
            <select
              id="admin-role-filter"
              className="select"
              value={roleFilter}
              onChange={onRoleFilterChange}
            >
              <option value="">Tất cả vai trò</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onToggleCreate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <UserPlus size={16} />
          Thêm người dùng
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col">Họ tên</th>
              <th scope="col">Email</th>
              <th scope="col">Vai trò</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            ) : usersError ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ color: 'var(--quarantine-crimson)', marginBottom: 12 }}>
                    {usersError}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onRetryUsers}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <RotateCw size={14} />
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Không có người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === selfId;
                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {user.fullName}
                        {isSelf && <span className="badge badge-indigo">Bạn</span>}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      {user.email}
                    </td>
                    <td>
                      <label htmlFor={`role-select-${user.id}`} style={visuallyHiddenStyle}>
                        Thay đổi vai trò cho {user.fullName}
                      </label>
                      <select
                        id={`role-select-${user.id}`}
                        className="select"
                        value={user.role}
                        onChange={(e) => onRoleChange(user.id, e.target.value)}
                        disabled={isSelf}
                        title={isSelf ? 'Không thể thay đổi tài khoản của chính bạn' : undefined}
                        style={{ padding: '4px 8px', fontSize: 13 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${user.isActive ? 'badge-emerald' : 'badge-slate'}`}>
                          {user.isActive ? 'Hoạt động' : 'Đã khoá'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isSelf}
                          title={isSelf ? 'Không thể thay đổi tài khoản của chính bạn' : undefined}
                          onClick={() => onToggleStatus(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Khoá' : 'Mở khoá'}
                        </button>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 13,
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          Tổng số: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalUsers}</span> người dùng
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1 || usersLoading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Trước
          </button>
          <span>
            Trang <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages || usersLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersTable;
