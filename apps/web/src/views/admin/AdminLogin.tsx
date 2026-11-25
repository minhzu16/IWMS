import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface AdminLoginProps {
  loginEmail: string;
  loginPassword: string;
  loginLoading: boolean;
  loginError: string | null;
  authError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  loginEmail,
  loginPassword,
  loginLoading,
  loginError,
  authError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        padding: '24px 16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 32,
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 12px auto',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Đăng nhập quản trị
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Cung cấp thông tin xác thực để truy cập bảng điều khiển hệ thống
          </p>
        </div>

        <div aria-live="polite">
          {(loginError || authError) && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                marginBottom: 16,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--quarantine-crimson-subtle)',
                color: 'var(--quarantine-crimson)',
                fontSize: 13,
                border: '1px solid var(--quarantine-crimson)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{loginError || authError}</span>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              htmlFor="admin-login-email"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="admin-login-email"
              type="email"
              className="input"
              value={loginEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="admin@iwms.internal"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              htmlFor="admin-login-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Mật khẩu
            </label>
            <input
              id="admin-login-password"
              type="password"
              className="input"
              value={loginPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••••••"
              required
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loginLoading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loginLoading ? 'Đang xác thực...' : 'Đăng nhập quản trị'}
          </button>
        </form>

        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 0,
          }}
        >
          Chỉ tài khoản ADMIN mới truy cập được trang này.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
