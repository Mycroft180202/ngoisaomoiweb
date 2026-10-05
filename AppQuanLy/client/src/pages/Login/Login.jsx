import toast from 'react-hot-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PlaneTakeoff, Eye, EyeOff, Settings } from 'lucide-react';
import TitleBar from '../../components/UI/TitleBar';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('travelops_api_server') || 'https://api.newstartour.vn/quanly');

  const handleSaveServer = () => {
    let cleanUrl = serverUrl.trim();
    if (!cleanUrl) {
      setError('Vui lòng nhập địa chỉ server');
      return;
    }
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    localStorage.setItem('travelops_api_server', cleanUrl);
    toast.success('Đã lưu cấu hình server! Ứng dụng sẽ tự động tải lại.');
    window.location.reload();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page ${isElectron ? 'has-titlebar' : ''}`}>
      <TitleBar />
      <div className="login-bg" />
      <div className="login-card">
        {isElectron && (
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            title="Cấu hình kết nối VPS Server"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Settings size={20} />
          </button>
        )}

        <div className="login-logo">
          <img 
            src={`${import.meta.env.BASE_URL}icon.png`} 
            alt="Logo" 
            style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 12 }} 
          />
          <h1>NewStarTour <span>CRM</span></h1>
          <p>Hệ thống quản lý công ty du lịch</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--danger-ghost)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        {showServerConfig ? (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>⚙️ Cấu hình VPS Server</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Nhập địa chỉ IP hoặc tên miền của VPS chạy dịch vụ TravelOps.
              </p>
            </div>
            
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8125rem' }}>Địa chỉ Server (Ví dụ: http://103.x.x.x:3001)</label>
              <input
                type="text"
                className="form-control"
                placeholder="http://localhost:3001"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowServerConfig(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="login-btn"
                onClick={handleSaveServer}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', marginTop: 0 }}
              >
                Lưu kết nối
              </button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn"
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </button>
            </form>


          </>
        )}
      </div>
    </div>
  );
}
