import { useState, useEffect } from 'react';
import { Download, AlertCircle, ArrowUpCircle } from 'lucide-react';

export default function UpdaterNotification() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Return early if not running in Electron
    if (!window.electron) return;

    // Listen to auto-updater events
    const unsubAvailable = window.electron.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setShow(true);
    });

    const unsubProgress = window.electron.onDownloadProgress((prog) => {
      setProgress(prog);
    });

    const unsubDownloaded = window.electron.onUpdateDownloaded((info) => {
      setDownloaded(true);
      setProgress(null);
    });

    const unsubError = window.electron.onUpdateError((err) => {
      setError(err);
      setTimeout(() => setError(null), 5000);
    });

    // Check for updates after 5 seconds of launch
    const timer = setTimeout(() => {
      window.electron.checkForUpdates();
    }, 5000);

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
      clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 320,
      background: 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowUpCircle size={20} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cập nhật ứng dụng</span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--danger)' }}>
          <AlertCircle size={14} />
          <span>Lỗi: {error}</span>
        </div>
      )}

      {!downloaded ? (
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Đang tải bản cập nhật mới v{updateInfo?.version}...
          </div>
          {progress && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>{Math.round(progress.percent)}%</span>
                <span>{Math.round(progress.bytesPerSecond / 1024)} KB/s</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.1s' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            Bản cập nhật v{updateInfo?.version} đã tải xong. Vui lòng khởi động lại ứng dụng để áp dụng.
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            style={{ width: '100%' }}
            onClick={() => window.electron.restartApp()}
          >
            Khởi động lại ngay
          </button>
        </div>
      )}
    </div>
  );
}
