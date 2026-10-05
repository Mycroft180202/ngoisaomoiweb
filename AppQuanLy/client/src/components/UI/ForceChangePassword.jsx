import toast from 'react-hot-toast';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { KeyRound, ShieldAlert } from 'lucide-react';

export default function ForceChangePassword() {
  const { loadUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại');
      return;
    }

    setLoading(true);

    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Đổi mật khẩu thành công! Chào mừng bạn đến với hệ thống.');
      await loadUser(); // Reload user context (this resets needsPasswordChange to false)
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="login-card animate-fadeIn" style={{ maxWidth: 440, width: '100%', margin: '0 20px', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            marginBottom: 16
          }}>
            <ShieldAlert size={24} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>
            Bảo mật tài khoản
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Đây là lần đăng nhập đầu tiên. Bạn bắt buộc phải đổi mật khẩu mặc định để tiếp tục sử dụng hệ thống.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: '0.75rem',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mật khẩu hiện tại (Mặc định)</label>
            <input
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mật khẩu mới</label>
            <input
              type="password"
              className="form-control"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={loading}
            >
              <KeyRound size={16} />
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={logout}
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              Đăng xuất
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
