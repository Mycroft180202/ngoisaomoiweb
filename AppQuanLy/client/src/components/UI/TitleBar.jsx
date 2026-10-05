import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

export default function TitleBar() {
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (!isElectron || !window.electron) return;
    
    // Detect OS
    if (window.electron.platform === 'darwin') {
      setIsMac(true);
    }
  }, [isElectron]);

  if (!isElectron) return null;

  const handleMinimize = () => {
    if (window.electron && typeof window.electron.minimizeWindow === 'function') {
      window.electron.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electron && typeof window.electron.maximizeWindow === 'function') {
      window.electron.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electron && typeof window.electron.closeWindow === 'function') {
      window.electron.closeWindow();
    }
  };

  return (
    <div className={`titlebar ${isMac ? 'mac' : ''}`}>
      {/* Drag Area */}
      <div className="titlebar-drag-area">
        {isMac ? (
          // On macOS, native traffic lights are on the left, so we shift title/logo to center or right
          <div className="titlebar-logo" style={{ marginLeft: 80 }}>
            <img src="./icon.png" alt="Logo" />
            <span>NewStarTour <strong>CRM</strong></span>
          </div>
        ) : (
          <div className="titlebar-logo">
            <img src="./icon.png" alt="Logo" />
            <span>NewStarTour <strong>CRM</strong></span>
          </div>
        )}
      </div>

      {/* Window Controls (Windows/Linux) */}
      {!isMac && (
        <div className="titlebar-controls">
          <button onClick={handleMinimize} className="titlebar-btn" title="Thu nhỏ">
            <Minus size={14} />
          </button>
          <button onClick={handleMaximize} className="titlebar-btn" title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to'}>
            {isMaximized ? <Copy size={12} style={{ transform: 'rotate(180deg)' }} /> : <Square size={12} />}
          </button>
          <button onClick={handleClose} className="titlebar-btn close" title="Đóng">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
