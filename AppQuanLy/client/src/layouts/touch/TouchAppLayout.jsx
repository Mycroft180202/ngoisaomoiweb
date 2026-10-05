import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Header from '../../components/Layout/Header';
import UpdaterNotification from '../../components/UI/UpdaterNotification';
import TitleBar from '../../components/UI/TitleBar';

export default function TouchAppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className={`app-layout v2-shell v2-shell--touch ${isElectron ? 'has-titlebar' : ''}`}>
      <TitleBar />
      <button
        type="button"
        className={`v2-touch-overlay ${menuOpen ? 'active' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Dong menu dieu huong"
        tabIndex={menuOpen ? 0 : -1}
      />
      <Sidebar
        collapsed={!menuOpen}
        onToggle={() => setMenuOpen(current => !current)}
        closeOnNavigate
      />
      <div className="main-area collapsed">
        <Header
          collapsed
          onToggle={() => setMenuOpen(current => !current)}
        />
        <main className="main-content v2-main-content">
          <Outlet />
        </main>
      </div>
      <UpdaterNotification />
    </div>
  );
}
