import React, { useState, useEffect } from 'react';
import {
  api,
  getAuthToken,
  setAuthToken,
  hasSessionHint,
  AdminStats as AdminStatsType,
  AdminUser,
  type ApiError,
} from '../api/client.js';
import { LogOut, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AdminLogin } from './admin/AdminLogin.js';
import { AdminStats } from './admin/AdminStats.js';
import { CreateUserForm } from './admin/CreateUserForm.js';
import { UsersTable } from './admin/UsersTable.js';
import { alertBoxStyle, statusSuccessBoxStyle, currentUserId } from './admin/styles.js';

export const AdminView: React.FC = () => {
  const selfId = currentUserId();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getAuthToken()));
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState<AdminStatsType | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Users list state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Inline feedback messages (optimistic updates, actions)
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Inline Create User Card
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createRole, setCreateRole] = useState('WAREHOUSE');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Debounce search input (300 ms) without calling setState synchronously in effect body
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch((prev) => (prev !== searchInput ? searchInput : prev));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Attempt silent refresh on mount if not authenticated
  useEffect(() => {
    let ignore = false;
    if (!isAuthenticated && hasSessionHint()) {
      api.refresh()
        .then((res) => {
          if (!ignore && res.accessToken) {
            setAuthToken(res.accessToken);
            setIsAuthenticated(true);
            setUsersLoading(true);
            setReloadKey((k) => k + 1);
          }
        })
        .catch(() => {
          // Stay in login state
        });
    }
    return () => { ignore = true; };
  }, []);

  const handleAuthErr = (err: ApiError) => {
    if (err.status === 401 || err.status === 403 || err.message?.includes('401') || err.message?.includes('403')) {
      setAuthToken('');
      setIsAuthenticated(false);
      setAuthError('Phiên đăng nhập hết hạn hoặc không có quyền quản trị (401/403).');
      return true;
    }
    return false;
  };

  // Fetch Stats
  useEffect(() => {
    if (!isAuthenticated) return;
    let ignore = false;
    api.adminStats()
      .then((data) => {
        if (!ignore) {
          setStats(data);
          setStatsError(null);
        }
      })
      .catch((err: ApiError) => {
        if (!ignore && !handleAuthErr(err)) setStatsError(err.message || 'Không thể tải dữ liệu thống kê');
      });
    return () => { ignore = true; };
  }, [isAuthenticated, reloadKey]);

  // Fetch Users
  useEffect(() => {
    if (!isAuthenticated) return;
    let ignore = false;
    api.adminListUsers({ search: debouncedSearch, role: roleFilter, page, pageSize })
      .then((res) => {
        if (!ignore) {
          setUsers(res.items || []);
          setTotalUsers(res.total || 0);
          setUsersError(null);
          setUsersLoading(false);
        }
      })
      .catch((err: ApiError) => {
        if (!ignore) {
          setUsersLoading(false);
          if (!handleAuthErr(err)) setUsersError(err.message || 'Không thể tải danh sách người dùng');
        }
      });
    return () => { ignore = true; };
  }, [isAuthenticated, debouncedSearch, roleFilter, page, reloadKey]);

  // Handlers
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setAuthError(null);
    try {
      const res = await api.login({ email: loginEmail.trim(), password: loginPassword });
      if (!res.accessToken) throw new Error('Không nhận được access token từ máy chủ');
      setAuthToken(res.accessToken);
      setLoginLoading(false);
      setIsAuthenticated(true);
      setUsersLoading(true);
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setLoginLoading(false);
      setLoginError((caught as ApiError).message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    setAuthToken('');
    setIsAuthenticated(false);
    setStats(null);
    setUsers([]);
    setLoginPassword('');
    setActionError(null);
    setActionSuccess(null);
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (userId === selfId) return;
    const originalUsers = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await api.adminUpdateUser(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setActionSuccess(`Đã cập nhật vai trò người dùng #${userId} thành ${newRole}`);
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setUsers(originalUsers);
      setActionError((caught as ApiError).message || 'Cập nhật vai trò thất bại');
    }
  };

  const handleToggleStatus = async (userId: number, currentActive: boolean) => {
    if (userId === selfId) return;
    const originalUsers = users;
    const nextActive = !currentActive;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)));
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await api.adminUpdateUser(userId, { isActive: nextActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setActionSuccess(`Đã ${nextActive ? 'mở khoá' : 'khoá'} tài khoản #${userId} thành công`);
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setUsers(originalUsers);
      setActionError((caught as ApiError).message || 'Thay đổi trạng thái tài khoản thất bại');
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (createPassword.length < 10) {
      setCreateError('Mật khẩu phải có tối thiểu 10 ký tự');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.adminCreateUser({
        email: createEmail.trim(),
        fullName: createFullName.trim(),
        role: createRole,
        password: createPassword,
      });
      setCreateSubmitting(false);
      setIsCreateOpen(false);
      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setCreateRole('WAREHOUSE');
      setActionSuccess('Đã thêm người dùng mới thành công');
      setUsersLoading(true);
      setReloadKey((k) => k + 1);
    } catch (caught) {
      setCreateSubmitting(false);
      const err = caught as ApiError;
      const isConflict = err.status === 409 || err.message?.includes('409') || err.message?.toLowerCase().includes('exist') || err.message?.toLowerCase().includes('tồn tại');
      setCreateError(isConflict ? 'Email đã tồn tại' : (err.message || 'Lỗi khi tạo người dùng'));
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin
        loginEmail={loginEmail} loginPassword={loginPassword}
        loginLoading={loginLoading} loginError={loginError}
        authError={authError} onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword} onSubmit={handleLogin}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Quản trị hệ thống</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>Quản lý tài khoản người dùng, phân quyền truy cập và giám sát toàn diện hệ thống</p>
        </div>
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </div>

      <AdminStats stats={stats} error={statsError} />

      {/* Action Messages Area (aria-live="polite") */}
      <div aria-live="polite" aria-atomic="true">
        {actionError && (
          <div role="alert" style={alertBoxStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={16} /><span>{actionError}</span></div>
            <button type="button" onClick={() => setActionError(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }} aria-label="Đóng cảnh báo"><X size={14} /></button>
          </div>
        )}
        {actionSuccess && (
          <div role="status" style={statusSuccessBoxStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} /><span>{actionSuccess}</span></div>
            <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }} aria-label="Đóng thông báo"><X size={14} /></button>
          </div>
        )}
      </div>

      <CreateUserForm
        isOpen={isCreateOpen} fullName={createFullName} email={createEmail}
        role={createRole} password={createPassword} error={createError} submitting={createSubmitting}
        onFullNameChange={setCreateFullName} onEmailChange={setCreateEmail}
        onRoleChange={setCreateRole} onPasswordChange={setCreatePassword}
        onSubmit={handleCreateUser} onClose={() => { setIsCreateOpen(false); setCreateError(null); }}
      />

      <UsersTable
        users={users} usersLoading={usersLoading} usersError={usersError}
        totalUsers={totalUsers} page={page} pageSize={pageSize}
        searchInput={searchInput} roleFilter={roleFilter} selfId={selfId}
        onSearchChange={(e) => { setSearchInput(e.target.value); setPage(1); setUsersLoading(true); }}
        onRoleFilterChange={(e) => { setRoleFilter(e.target.value); setPage(1); setUsersLoading(true); }}
        onPageChange={(newPage) => { setPage(newPage); setUsersLoading(true); }}
        onRetryUsers={() => { setUsersLoading(true); setReloadKey((k) => k + 1); }}
        onRoleChange={handleRoleChange} onToggleStatus={handleToggleStatus}
        onToggleCreate={() => { setIsCreateOpen((prev) => !prev); setCreateError(null); }}
      />
    </div>
  );
};

export default AdminView;
