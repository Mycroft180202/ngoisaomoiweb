import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import UpdaterNotification from '../UI/UpdaterNotification';
import TitleBar from '../UI/TitleBar';

/**
 * Ban layout cu duoc dong bang de lam diem lui an toan.
 * Khong dua style/cau truc cua V2 vao component nay.
 */
export default function LegacyMainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-layout legacy-layout ${isElectron ? 'has-titlebar' : ''}`}>
      <TitleBar />
      <div
        className={`mobile-overlay ${!sidebarCollapsed ? 'active' : ''}`}
        onClick={() => setSidebarCollapsed(true)}
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`main-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <UpdaterNotification />
    </div>
  );
}
