import React from 'react';
import { X } from 'lucide-react';
import { ROLES } from './styles.js';

export interface CreateUserFormProps {
  isOpen: boolean;
  fullName: string;
  email: string;
  role: string;
  password: string;
  error: string | null;
  submitting: boolean;
  onFullNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onRoleChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export const CreateUserForm: React.FC<CreateUserFormProps> = ({
  isOpen,
  fullName,
  email,
  role,
  password,
  error,
  submitting,
  onFullNameChange,
  onEmailChange,
  onRoleChange,
  onPasswordChange,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        padding: 20,
        border: '1px solid var(--accent)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Thêm người dùng mới
        </h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
          aria-label="Đóng biểu mẫu"
        >
          <X size={14} />
        </button>
      </div>

      <div aria-live="polite">
        {error && (
          <div
            role="alert"
            style={{
              padding: '8px 12px',
              marginBottom: 16,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--quarantine-crimson-subtle)',
              color: 'var(--quarantine-crimson)',
              fontSize: 13,
              border: '1px solid var(--quarantine-crimson)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label
              htmlFor="create-user-fullname"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Họ tên
            </label>
            <input
              id="create-user-fullname"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              htmlFor="create-user-email"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="create-user-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="nguyenvana@iwms.internal"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label
              htmlFor="create-user-role"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Vai trò
            </label>
            <select
              id="create-user-role"
              className="select"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              style={{ width: '100%' }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="create-user-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}
            >
              Mật khẩu
            </label>
            <input
              id="create-user-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Tối thiểu 10 ký tự"
              minLength={10}
              required
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Mật khẩu tối thiểu 10 ký tự
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
