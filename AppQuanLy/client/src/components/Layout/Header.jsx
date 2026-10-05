import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials, timeAgo } from '../../utils/helpers';
import api, { getSocketConfig } from '../../services/api';
import {
  Search, Bell, Menu, ChevronRight, Sun, Moon
} from 'lucide-react';

export default function Header({ collapsed, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('travelops_theme') || 'dark');
  const dropdownRef = useRef(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get('/search', { q: searchQuery });
          setSearchResults(res.results || []);
          setShowSearchDropdown(true);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('travelops_theme', nextTheme);
  };

  const unreadCountRef = useRef(0);

  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(587.33, now, 0.3);       // D5 chime
      playTone(880.00, now + 0.1, 0.4);  // A5 chime
    } catch (e) {
      console.error('Failed to play notification chime:', e);
    }
  };

  const loadNotifications = async (isInitial = false) => {
    try {
      const data = await api.get('/notifications', { limit: 10 });
      const newNotifications = data.notifications || [];
      const newUnreadCount = data.unreadCount || 0;

      // Play sound only if unreadCount increased and it's not the initial mount load
      if (!isInitial && newUnreadCount > unreadCountRef.current) {
        playNotificationChime();
      }

      unreadCountRef.current = newUnreadCount;
      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
    } catch (e) {
      // silent fail
    }
  };

  useEffect(() => {
    loadNotifications(true);

    // Bỏ polling cũ, dùng Socket.io
    if (!user?._id) return;
    
    let socket;
    let isMounted = true;

    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;
      const { url, options } = getSocketConfig();
      
      socket = io(url, options);
      
      socket.on('connect', () => {
        socket.emit('join', user._id);
      });
      
      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => {
          const newCount = prev + 1;
          unreadCountRef.current = newCount;
          return newCount;
        });
        playNotificationChime();
        import('react-hot-toast').then(({ default: toast }) => {
          toast(`🔔 ${notification.title}`);
        });
      });
      
    });

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      unreadCountRef.current = 0;
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      // silent fail
    }
  };

  const handleNotificationClick = async (n) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n._id}/read`);
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
        unreadCountRef.current = Math.max(0, unreadCountRef.current - 1);
      }

      setShowNotifications(false);

      const parts = n.link ? n.link.split('/') : [];
      const id = parts[2];

      if (n.type === 'task' && id) {
        navigate(`/tasks?id=${id}`);
      } else if (n.type === 'approval' && id) {
        navigate(`/approvals?id=${id}`);
      } else if (n.type === 'tour' && id) {
        navigate(`/tours?id=${id}`);
      } else if (n.type === 'booking' && id) {
        navigate(`/tours?bookingId=${id}`);
      } else if (n.link) {
        navigate(n.link);
      }
    } catch (e) {
      console.error('Notification click error:', e);
    }
  };

  return (
    <header className={`header ${collapsed ? 'collapsed' : ''}`}>
      <div className="header-left">
        <button className="header-toggle" onClick={onToggle}>
          <Menu size={20} />
        </button>
        <div className="header-search" style={{ position: 'relative' }} ref={searchRef}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm tour, task, khách hàng, nhân sự..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length > 1 && setShowSearchDropdown(true)}
          />

          {showSearchDropdown && (
            <div
              className="notifications-dropdown"
              style={{ top: '120%', width: 340, left: 0, right: 'auto' }}
            >
              <div className="notifications-header">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Kết quả tìm kiếm ({searchResults.length})</h4>
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy kết quả phù hợp</div>
              ) : (
                searchResults.map(res => (
                  <div
                    key={`${res.type}-${res.id}`}
                    className="notification-item"
                    style={{ cursor: 'pointer', padding: '10px 14px' }}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      navigate(res.link);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="font-medium text-sm">{res.title}</div>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{res.subtitle}</div>
                      </div>
                      <span className="badge badge-ghost" style={{ fontSize: '0.6875rem' }}>{res.type.toUpperCase()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={20} style={{ color: '#FACC15' }} /> : <Moon size={20} style={{ color: '#6366F1' }} />}
        </button>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="header-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) loadNotifications();
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Thông báo {unreadCount > 0 && `(${unreadCount})`}
                </h4>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={markAllRead}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không có thông báo
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n._id} 
                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
