import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { formatDate, timeAgo, ticketStatusMap, ticketCategoryMap } from '../../utils/helpers';
import {
  ListTodo, FileCheck, LifeBuoy, AlertTriangle, 
  Calendar, Clock, CheckCircle, Bell
} from 'lucide-react';

export default function StaffDashboard() {
  const { user, getDepartmentName } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await api.get('/dashboard/my-summary');
      setData(res);
    } catch (err) {
      console.error('My summary dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!data) return null;

  const { summary: s, urgentTasks, recentTickets, recentNotifications } = data;

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1>
          <LayoutDashboardIcon />
          Xin chào, {user?.fullName}!
        </h1>
        <span className="text-secondary text-sm">
          {getDepartmentName(user?.department)} • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid-3 stagger-children" style={{ marginBottom: 24 }}>
        <div className="stat-card primary" onClick={() => navigate('/tasks')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon primary"><ListTodo size={24} /></div>
          <div className="stat-info">
            <h3>{s.activeTasksCount}</h3>
            <p>Công việc đang làm</p>
          </div>
        </div>

        <div className="stat-card warning" onClick={() => navigate('/tickets')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon warning"><LifeBuoy size={24} /></div>
          <div className="stat-info">
            <h3>{s.activeTicketsCount}</h3>
            <p>Yêu cầu hỗ trợ chưa đóng</p>
          </div>
        </div>

        <div className="stat-card success" onClick={() => navigate('/approvals')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon success"><FileCheck size={24} /></div>
          <div className="stat-info">
            <h3>{s.pendingApprovalsCount}</h3>
            <p>Đề xuất chờ duyệt</p>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid-3">
        {/* Urgent Tasks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              Công việc khẩn cấp (Sắp hết hạn)
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {urgentTasks.length === 0 ? (
              <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                🎉 Không có công việc khẩn cấp nào sắp đến hạn!
              </div>
            ) : (
              urgentTasks.map(task => (
                <div key={task._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <Link to={`/tasks?id=${task._id}`} className="text-sm font-semibold hover-primary truncate block">
                      {task.title}
                    </Link>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      Mã: {task.code}
                    </div>
                  </div>
                  <div className="badge badge-danger" style={{ fontSize: '0.6875rem', flexShrink: 0 }}>
                    <Clock size={10} />
                    {formatDate(task.deadline)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <LifeBuoy size={18} style={{ color: 'var(--warning)' }} />
              Ticket hỗ trợ gửi gần đây
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentTickets.length === 0 ? (
              <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                Bạn chưa gửi yêu cầu hỗ trợ nào.
              </div>
            ) : (
              recentTickets.map(ticket => {
                const status = ticketStatusMap[ticket.status] || { label: ticket.status, color: 'ghost' };
                const category = ticketCategoryMap[ticket.category] || { label: ticket.category, icon: '📋' };
                return (
                  <div key={ticket._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                      <Link to={`/tickets?id=${ticket._id}`} className="text-sm font-semibold hover-primary truncate block">
                        {category.icon} {ticket.title}
                      </Link>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        Mã: {ticket.code} • {timeAgo(ticket.createdAt)}
                      </div>
                    </div>
                    <span className={`badge badge-${status.color}`} style={{ fontSize: '0.6875rem', flexShrink: 0 }}>
                      {status.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Bell size={18} style={{ color: 'var(--primary)' }} />
              Thông báo mới nhận
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentNotifications.length === 0 ? (
              <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                Chưa có thông báo nào.
              </div>
            ) : (
              recentNotifications.map(notification => (
                <div key={notification._id} style={{
                  padding: '12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                  opacity: notification.isRead ? 0.7 : 1, position: 'relative'
                }}>
                  {!notification.isRead && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12, width: 6, height: 6,
                      borderRadius: '50%', background: 'var(--primary)'
                    }} />
                  )}
                  <div className="text-sm font-medium" style={{ paddingRight: 10 }}>
                    {notification.title}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {notification.message}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{timeAgo(notification.createdAt)}</span>
                    {notification.link && (
                      <Link to={notification.link} className="hover-primary" style={{ fontWeight: 500 }}>
                        Chi tiết
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LayoutDashboardIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', marginRight: 10 }}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
}
