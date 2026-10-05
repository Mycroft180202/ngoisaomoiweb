import toast from 'react-hot-toast';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getInitials, departmentNames, roleNames } from '../../utils/helpers';
import api, { getSocketConfig } from '../../services/api';
import {
  LayoutDashboard, ListTodo, Map, FileCheck, Users,
  Settings, LogOut, ChevronLeft, ChevronRight, PlaneTakeoff, Headphones,
  Clock, Megaphone, Calendar, UserCheck, MessageSquare, Folder, Award, Download, BarChart3, Mail
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle, closeOnNavigate = false }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();
  const [chatUnread, setChatUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const chatUnreadRef = useRef(0);
  const notificationUnreadRef = useRef(0);
  const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');

  const isDirector = user?.role === 'director';
  const isManager = user?.role?.includes('manager');
  const isIT = user?.department === 'it';
  const isITManager = user?.role === 'it_manager';
  const isMarketing = user?.department === 'marketing' || user?.role?.includes('mkt');

  const playSidebarChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      const osc = audioCtx.createOscillator();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // audio may be blocked until first user interaction
    }
  };

  const loadSidebarBadges = async (silent = true) => {
    try {
      const [chatRes, notificationRes] = await Promise.all([
        api.get('/chat/conversations'),
        api.get('/notifications', { limit: 1 })
      ]);
      const nextChatUnread = (chatRes.conversations || []).reduce((sum, item) => sum + (item.unread || 0), 0);
      const nextNotificationUnread = notificationRes.unreadCount || 0;

      if (!silent && (nextChatUnread > chatUnreadRef.current || nextNotificationUnread > notificationUnreadRef.current)) {
        playSidebarChime();
      }

      chatUnreadRef.current = nextChatUnread;
      notificationUnreadRef.current = nextNotificationUnread;
      setChatUnread(nextChatUnread);
      setNotificationUnread(nextNotificationUnread);
    } catch {
      // sidebar badges are non-critical
    }
  };

  useEffect(() => {
    if (!user?._id) return;
    loadSidebarBadges(true);

    let socket;
    let isMounted = true;

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;
      const { url, options } = getSocketConfig();
      socket = io(url, options);

      socket.on('connect', () => {
        socket.emit('join', user._id);
        socket.emit('chat:join', { channel: 'general', userId: user._id });
        socket.emit('chat:join', { channel: 'department', department: user.department, userId: user._id });
      });

      socket.on('new_notification', () => {
        setNotificationUnread(prev => {
          const next = prev + 1;
          notificationUnreadRef.current = next;
          return next;
        });
        playSidebarChime();
      });

      socket.on('chat:new_direct_message', () => {
        loadSidebarBadges(false);
      });

      socket.on('chat:new_message', () => {
        loadSidebarBadges(false);
      });
    });

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;
    loadSidebarBadges(true);
  }, [location.pathname, user?._id]);

  const navItems = [
    {
      section: 'Tổng quan',
      items: [
        (isDirector || isManager) ? { to: '/', icon: LayoutDashboard, label: 'Dashboard' } : null,
        { to: '/chat', icon: MessageSquare, label: 'Trao Đổi', badge: chatUnread },
        { to: '/calendar', icon: Calendar, label: 'Lịch Vận Hành' },
        { to: '/announcements', icon: Megaphone, label: 'Bảng Tin', badge: notificationUnread },
        { to: '/attendance', icon: Clock, label: 'Chấm Công' },
      ].filter(Boolean)
    },
    {
      section: 'Quản lý',
      items: [
        { to: '/tasks', icon: ListTodo, label: 'Công Việc' },
        { to: '/tours', icon: Map, label: 'Tour Du Lịch' },
        { to: '/tour-operations', icon: PlaneTakeoff, label: 'Điều Hành Chuyến' },
        { to: '/customers', icon: UserCheck, label: 'Khách Hàng' },
        (isDirector || isMarketing || isITManager || isIT) ? { to: '/marketing-report', icon: BarChart3, label: 'Báo Cáo Marketing' } : null,
        { to: '/documents', icon: Folder, label: 'Tài Liệu' },
        { to: '/kpi', icon: Award, label: 'Đánh Giá KPI' },
        { to: '/approvals', icon: FileCheck, label: 'Xét Duyệt' },
        { to: '/tickets', icon: Headphones, label: 'Hỗ Trợ' },
        { 
          to: '/staff', 
          icon: Users, 
          label: (isDirector || isIT) ? 'Tổ Chức' : 'Nhân Sự' 
        },
      ].filter(Boolean)
    },
    {
      section: 'Hệ thống',
      items: [
        (isDirector || isIT) ? { to: '/email-routing', icon: Mail, label: 'Email Công Ty' } : null,
        { to: '/settings', icon: Settings, label: 'Cài Đặt' },
        !isElectron ? {
          to: 'https://api.newstartour.vn/quanly/updates/NewStarTour%20CRM%20Setup%201.0.2.exe',
          icon: Download,
          label: 'Tải App Desktop',
          external: true
        } : {
          onClick: () => {
            if (window.electron && typeof window.electron.checkForUpdates === 'function') {
              const cleanupNotAvailable = window.electron.onUpdateNotAvailable((info) => {
                toast(`Ứng dụng của bạn đang ở phiên bản mới nhất (v${info.version}). Không cần cập nhật!`);
                cleanup();
              });
              
              const cleanupAvailable = window.electron.onUpdateAvailable((info) => {
                toast.success(`Phát hiện bản cập nhật mới v${info.version}! Bản cập nhật đang được tải xuống...`);
                cleanup();
              });
              
              const cleanupError = window.electron.onUpdateError((err) => {
                toast.error(`Lỗi khi kiểm tra cập nhật: ${err}`);
                cleanup();
              });
              
              const cleanup = () => {
                if (typeof cleanupNotAvailable === 'function') cleanupNotAvailable();
                if (typeof cleanupAvailable === 'function') cleanupAvailable();
                if (typeof cleanupError === 'function') cleanupError();
              };

              // Gọi kiểm tra cập nhật sau khi đã đăng ký lắng nghe sự kiện
              window.electron.checkForUpdates();
            }
          },
          icon: Download,
          label: 'Kiểm Tra Cập Nhật'
        }
      ].filter(Boolean)
    }
  ].filter(section => section.items.length > 0);

  const handleLogoutClick = async () => {
    const isConfirmed = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống NewStarTour CRM?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (isConfirmed) {
      logout();
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img 
          src={`${import.meta.env.BASE_URL}icon.png`} 
          alt="Logo" 
          style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} 
        />
        <div className="sidebar-logo-text">
          NewStarTour <span>CRM</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section, idx) => (
          <div key={idx}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map((item) => {
              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.to}
                    className="nav-item"
                    download
                  >
                    <item.icon size={20} />
                    <span className="nav-text">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
                  </a>
                );
              }
              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="nav-item"
                    style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}
                  >
                    <item.icon size={20} />
                    <span className="nav-text">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                    )}
                  </button>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if ((closeOnNavigate || window.innerWidth <= 768) && onToggle) {
                      onToggle();
                    }
                  }}
                >
                  <item.icon size={20} />
                  <span className="nav-text">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer - User Info */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogoutClick} title="Đăng xuất">
          <div className="sidebar-user-avatar">
            {getInitials(user?.fullName)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{roleNames[user?.role]}</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
