import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  formatCurrency, departmentNames, departmentColors,
  taskStatusMap, tourStatusMap, formatDate
} from '../../utils/helpers';
import {
  Users, Map, ListTodo, FileCheck, TrendingUp,
  Calendar, AlertTriangle, DollarSign, PlaneTakeoff,
  Clock, LifeBuoy, Bell, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

export default function Dashboard() {
  const { user, isDirector, isManager, getDepartmentName } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isManagement = isDirector || isManager;

  useEffect(() => {
    loadDashboard();
  }, [isManagement]);

  const loadDashboard = async () => {
    try {
      if (isManagement) {
        const data = await api.get('/dashboard/stats');
        setStats(data);
      } else {
        const data = await api.get('/dashboard/my-summary');
        setStats(data);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
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

  if (!stats) return null;

  // Staff Personal Dashboard View
  if (!isManagement) {
    const { summary, urgentTasks, recentTickets, recentNotifications } = stats;
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <h1>
            <LayoutDashboardIcon />
            Xin chào, {user?.fullName}!
          </h1>
          <span className="text-secondary text-sm">
            Bảng làm việc cá nhân • {getDepartmentName(user?.department)}
          </span>
        </div>

        {/* Personal Stat Cards */}
        <div className="grid-3 stagger-children" style={{ marginBottom: 24 }}>
          <div className="stat-card primary">
            <div className="stat-icon primary"><ListTodo size={24} /></div>
            <div className="stat-info">
              <h3>{summary?.activeTasksCount || 0}</h3>
              <p>Công việc đang xử lý</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon warning"><LifeBuoy size={24} /></div>
            <div className="stat-info">
              <h3>{summary?.activeTicketsCount || 0}</h3>
              <p>Ticket yêu cầu trợ giúp</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon success"><FileCheck size={24} /></div>
            <div className="stat-info">
              <h3>{summary?.pendingApprovalsCount || 0}</h3>
              <p>Đề xuất chờ duyệt</p>
            </div>
          </div>
        </div>

        {/* Content Rows */}
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {/* Urgent Tasks */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                Công việc gấp sắp đến hạn
              </div>
            </div>
            <div className="card-body">
              {!urgentTasks || urgentTasks.length === 0 ? (
                <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                  Không có việc nào sắp đến hạn
                </div>
              ) : (
                urgentTasks.map(task => (
                  <div key={task._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-xs text-muted">Mã: {task.code}</div>
                    </div>
                    <div className="badge badge-danger" style={{ fontSize: '0.6875rem', flexShrink: 0 }}>
                      <Clock size={10} style={{ marginRight: 4 }} />
                      {formatDate(task.deadline)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket status */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <LifeBuoy size={18} style={{ color: 'var(--warning)' }} />
                Ticket hỗ trợ mới nhất
              </div>
            </div>
            <div className="card-body">
              {!recentTickets || recentTickets.length === 0 ? (
                <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                  Bạn chưa tạo ticket nào
                </div>
              ) : (
                recentTickets.map(ticket => (
                  <div key={ticket._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div className="text-sm font-medium truncate">{ticket.title}</div>
                      <div className="text-xs text-muted">Mã: {ticket.code}</div>
                    </div>
                    <span className={`badge badge-${ticket.status === 'open' ? 'info' : ticket.status === 'in_progress' ? 'warning' : ticket.status === 'resolved' ? 'success' : 'secondary'}`} style={{ fontSize: '0.6875rem' }}>
                      {ticket.status === 'open' ? 'Mới' : ticket.status === 'in_progress' ? 'Đang sửa' : ticket.status === 'resolved' ? 'Đã xong' : 'Đã đóng'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Bell size={18} style={{ color: 'var(--info)' }} />
                Thông báo mới
              </div>
            </div>
            <div className="card-body">
              {!recentNotifications || recentNotifications.length === 0 ? (
                <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                  Không có thông báo mới
                </div>
              ) : (
                recentNotifications.map(notif => (
                  <div key={notif._id} style={{
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                  }}>
                    <div className="text-sm font-medium">{notif.title}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{notif.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { stats: s, revenue, upcomingTours, urgentTasks, staffByDept } = stats;

  const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  const revenueChartData = revenue?.map(r => ({
    name: monthNames[r._id - 1],
    revenue: r.total || 0,
    count: r.count || 0
  })) || [];

  const staffChartData = staffByDept?.map(d => ({
    name: getDepartmentName(d._id) || d._id,
    value: d.count,
    color: departmentColors[d._id] || '#64748B'
  })) || [];

  const taskChartData = Object.entries(s.tasksByStatus).map(([key, value]) => ({
    name: taskStatusMap[key]?.label || key,
    value,
    color: key === 'done' ? '#22C55E' : key === 'in_progress' ? '#0EA5E9' : key === 'review' ? '#EAB308' : '#64748B'
  }));

  return (
    <div className="animate-fadeIn">
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
      <div className="grid-4 stagger-children" style={{ marginBottom: 24 }}>
        <div className="stat-card primary">
          <div className="stat-icon primary"><Users size={24} /></div>
          <div className="stat-info">
            <h3>{s.totalUsers}</h3>
            <p>Nhân viên</p>
          </div>
        </div>
        <div className="stat-card secondary">
          <div className="stat-icon secondary"><Map size={24} /></div>
          <div className="stat-info">
            <h3>{s.activeTours}</h3>
            <p>Tour đang bán</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><ListTodo size={24} /></div>
          <div className="stat-info">
            <h3>{s.totalTasks}</h3>
            <p>Công việc</p>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon warning"><FileCheck size={24} /></div>
          <div className="stat-info">
            <h3>{s.pendingApprovals}</h3>
            <p>Chờ duyệt</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Revenue Chart */}
        {(isDirector || user?.department === 'sale') && revenueChartData.length > 0 && (
          <div className="card animate-fadeInUp">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                Doanh thu theo tháng
              </div>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                  <Tooltip
                    contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }}
                    formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0EA5E9" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Staff Distribution */}
        <div className="card animate-fadeInUp">
          <div className="card-header">
            <div className="card-title">
              <Users size={18} style={{ color: 'var(--info)' }} />
              Phân bố nhân sự
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={staffChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {staffChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {staffChartData.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                  <span className="text-sm text-secondary" style={{ flex: 1 }}>{item.name}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Task Status + Upcoming Tours + Urgent Tasks */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {/* Task Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <ListTodo size={18} style={{ color: 'var(--primary)' }} />
              Trạng thái công việc
            </div>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={taskChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {taskChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Tours */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <PlaneTakeoff size={18} style={{ color: 'var(--secondary)' }} />
              Tour sắp khởi hành
            </div>
          </div>
          <div className="card-body">
            {upcomingTours?.length === 0 ? (
              <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                Không có tour nào
              </div>
            ) : (
              upcomingTours?.map(tour => (
                <div key={tour._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                }}>
                  <div>
                    <div className="text-sm font-medium">{tour.name}</div>
                    <div className="text-xs text-muted">{tour.destination}</div>
                  </div>
                  <div className="text-right">
                    <div className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                      <Calendar size={10} />
                      {formatDate(tour.departureDate)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              Sắp đến hạn
            </div>
          </div>
          <div className="card-body">
            {urgentTasks?.length === 0 ? (
              <div className="text-muted text-sm text-center" style={{ padding: 24 }}>
                Không có task gấp
              </div>
            ) : (
              urgentTasks?.map(task => (
                <div key={task._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-medium truncate">{task.title}</div>
                    <div className="text-xs text-muted">
                      {task.assignee?.fullName}
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
      </div>
    </div>
  );
}

function LayoutDashboardIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>;
}
