import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Header from '../../components/Layout/Header';
import UpdaterNotification from '../../components/UI/UpdaterNotification';
import TitleBar from '../../components/UI/TitleBar';

export default function DesktopAppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  return (
    <div className={`app-layout v2-shell v2-shell--desktop ${isElectron ? 'has-titlebar' : ''}`}>
      <TitleBar />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(current => !current)}
      />
      <div className={`main-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(current => !current)}
        />
        <main className="main-content v2-main-content">
          <Outlet />
        </main>
      </div>
      <UpdaterNotification />
    </div>
  );
}
