import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import {
  ticketStatusMap, ticketCategoryMap, taskPriorityMap,
  formatDate, formatDateTime, getInitials, departmentNames, timeAgo
} from '../../utils/helpers';
import {
  Headphones, Plus, X, MessageSquare, Clock, Search,
  ArrowRight, UserCheck, Play, CheckCircle, XCircle
} from 'lucide-react';

export default function TicketList() {
  const { user } = useAuth();
  const confirm = useConfirm();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    priority: 'medium', targetDepartment: ''
  });

  // Detail modal
  const [viewTicket, setViewTicket] = useState(null);
  const [newComment, setNewComment] = useState('');

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.departments || []);
    } catch (e) { /* ignore */ }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (deptFilter) params.set('targetDepartment', deptFilter);
      if (catFilter) params.set('category', catFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/tickets?${params.toString()}`);
      setTickets(res.tickets || []);
    } catch (e) {
      console.error('Load tickets error:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, catFilter, search]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const getDepartmentName = (key) => {
    const dept = departments.find(d => d.key === key);
    return dept?.name || departmentNames[key] || key;
  };

  // ====== Create Ticket ======
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', form);
      setShowForm(false);
      setForm({ title: '', description: '', category: 'other', priority: 'medium', targetDepartment: '' });
      loadTickets();
    } catch (err) {
      await confirm({
        title: 'Lỗi',
        message: err.message || 'Không thể tạo ticket',
        confirmText: 'Đã hiểu',
        showCancel: false,
        type: 'danger'
      });
    }
  };

  // ====== Assign Ticket ======
  const handleAssign = async (ticket) => {
    const isConfirmed = await confirm({
      title: 'Nhận xử lý ticket',
      message: `Bạn có chắc muốn nhận xử lý yêu cầu "${ticket.title}"?`,
      confirmText: 'Nhận Xử Lý',
      cancelText: 'Hủy',
      type: 'primary'
    });
    if (!isConfirmed) return;
    try {
      const res = await api.patch(`/tickets/${ticket._id}/assign`);
      if (res.ticket) {
        setTickets(prev => prev.map(t => t._id === res.ticket._id ? res.ticket : t));
        setViewTicket(res.ticket);
      }
    } catch (err) {
      await confirm({ title: 'Lỗi', message: err.message, confirmText: 'Đã hiểu', showCancel: false, type: 'danger' });
    }
  };

  // ====== Update Status ======
  const handleStatusChange = async (ticket, newStatus) => {
    const statusLabels = { in_progress: 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đã đóng' };
    const isConfirmed = await confirm({
      title: `Cập nhật trạng thái`,
      message: `Bạn có chắc muốn chuyển ticket "${ticket.title}" sang trạng thái "${statusLabels[newStatus]}"?`,
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      type: newStatus === 'resolved' ? 'primary' : 'warning'
    });
    if (!isConfirmed) return;
    try {
      const res = await api.patch(`/tickets/${ticket._id}/status`, { status: newStatus });
      if (res.ticket) {
        setTickets(prev => prev.map(t => t._id === res.ticket._id ? res.ticket : t));
        setViewTicket(res.ticket);
      }
    } catch (err) {
      await confirm({ title: 'Lỗi', message: err.message, confirmText: 'Đã hiểu', showCancel: false, type: 'danger' });
    }
  };

  // ====== Add Comment ======
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !viewTicket) return;
    try {
      const res = await api.post(`/tickets/${viewTicket._id}/comments`, { content: newComment });
      if (res.ticket) {
        setViewTicket(res.ticket);
        setTickets(prev => prev.map(t => t._id === res.ticket._id ? res.ticket : t));
      }
      setNewComment('');
    } catch (err) {
      await confirm({ title: 'Lỗi', message: err.message || 'Không thể gửi bình luận', confirmText: 'Đã hiểu', showCancel: false, type: 'danger' });
    }
  };

  // ====== Permission Helpers ======
  const canAssign = (ticket) => {
    if (!user || ticket.assignee) return false;
    return user.role === 'director' || user.department === ticket.targetDepartment;
  };

  const canChangeStatus = (ticket) => {
    if (!user) return false;
    if (user.role === 'director') return true;
    return ticket.assignee?._id === user._id || ticket.assignee === user._id;
  };

  const canClose = (ticket) => {
    if (!user) return false;
    if (user.role === 'director') return true;
    const requesterId = ticket.requester?._id || ticket.requester;
    return requesterId === user._id && ticket.status === 'resolved';
  };

  const getPriorityBorder = (priority) => {
    const map = { urgent: '#EF4444', high: '#F97316', medium: '#3B82F6', low: '#94A3B8' };
    return map[priority] || '#94A3B8';
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1><Headphones size={24} /> Yêu Cầu Hỗ Trợ</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Tạo Ticket
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: 8,
        border: '1px solid var(--border)', alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Tìm kiếm ticket..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select className="form-control form-control-sm" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(ticketStatusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="form-control form-control-sm" value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => (
            <option key={d.key} value={d.key}>{d.name}</option>
          ))}
        </select>
        <select className="form-control form-control-sm" value={catFilter}
          onChange={e => setCatFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">Tất cả phân loại</option>
          {Object.entries(ticketCategoryMap).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Ticket Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Mã</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Tiêu đề</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Phân loại</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Gửi đến</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Người tạo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Người xử lý</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Ưu tiên</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Chưa có ticket nào
                  </td>
                </tr>
              ) : tickets.map(ticket => (
                <tr key={ticket._id} onClick={() => setViewTicket(ticket)} style={{
                  cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${getPriorityBorder(ticket.priority)}`,
                  transition: 'background 0.15s'
                }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {ticket.code}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.8125rem', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ticket.title}
                    {ticket.comments?.length > 0 && (
                      <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <MessageSquare size={10} /> {ticket.comments.length}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.75rem' }}>
                    <span>{ticketCategoryMap[ticket.category]?.icon} {ticketCategoryMap[ticket.category]?.label}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.75rem' }}>
                    {getDepartmentName(ticket.targetDepartment)}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar avatar-sm">{getInitials(ticket.requester?.fullName)}</div>
                      <span>{ticket.requester?.fullName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.75rem' }}>
                    {ticket.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="avatar avatar-sm">{getInitials(ticket.assignee?.fullName)}</div>
                        <span>{ticket.assignee?.fullName}</span>
                      </div>
                    ) : (
                      <span className="text-muted" style={{ fontStyle: 'italic' }}>Chưa tiếp nhận</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span className={`badge badge-${taskPriorityMap[ticket.priority]?.color}`} style={{ fontSize: '0.625rem' }}>
                      {taskPriorityMap[ticket.priority]?.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span className={`badge badge-${ticketStatusMap[ticket.status]?.color}`} style={{ fontSize: '0.625rem' }}>
                      {ticketStatusMap[ticket.status]?.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {timeAgo(ticket.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Plus size={20} /> Tạo Yêu Cầu Hỗ Trợ</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tiêu đề *</label>
                  <input type="text" className="form-control" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Mô tả ngắn gọn vấn đề..." required />
                </div>
                <div className="form-group">
                  <label>Mô tả chi tiết</label>
                  <textarea className="form-control" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={4} placeholder="Mô tả chi tiết vấn đề cần hỗ trợ..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gửi đến phòng ban *</label>
                    <select className="form-control" value={form.targetDepartment}
                      onChange={e => setForm({ ...form, targetDepartment: e.target.value })} required>
                      <option value="">Chọn phòng ban</option>
                      {departments
                        .filter(d => user?.role === 'director' || d.key !== user?.department)
                        .map(d => (
                          <option key={d.key} value={d.key}>{d.name}</option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Phân loại</label>
                    <select className="form-control" value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}>
                      {Object.entries(ticketCategoryMap).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Độ ưu tiên</label>
                  <select className="form-control" value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {Object.entries(taskPriorityMap).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {viewTicket && (
        <div className="modal-overlay" onClick={() => setViewTicket(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{viewTicket.code}</span>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.95rem' }}>{viewTicket.title}</span>
              </h2>
              <button className="modal-close" onClick={() => setViewTicket(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              {/* Info Row */}
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Trạng thái</div>
                  <span className={`badge badge-${ticketStatusMap[viewTicket.status]?.color}`}>
                    {ticketStatusMap[viewTicket.status]?.label}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Ưu tiên</div>
                  <span className={`badge badge-${taskPriorityMap[viewTicket.priority]?.color}`}>
                    {taskPriorityMap[viewTicket.priority]?.label}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Phân loại</div>
                  <div className="font-semibold">{ticketCategoryMap[viewTicket.category]?.icon} {ticketCategoryMap[viewTicket.category]?.label}</div>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Người tạo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar avatar-sm">{getInitials(viewTicket.requester?.fullName)}</div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{viewTicket.requester?.fullName}</div>
                      <div className="text-xs text-muted">{getDepartmentName(viewTicket.requesterDepartment)}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Gửi đến</div>
                  <div className="font-semibold">{getDepartmentName(viewTicket.targetDepartment)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Người xử lý</div>
                  {viewTicket.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar avatar-sm">{getInitials(viewTicket.assignee?.fullName)}</div>
                      <span style={{ fontSize: '0.8125rem' }}>{viewTicket.assignee?.fullName}</span>
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.8125rem' }}>Chưa có người tiếp nhận</span>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Ngày tạo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                    <Clock size={12} /> {formatDateTime(viewTicket.createdAt)}
                  </div>
                </div>
                {viewTicket.resolvedAt && (
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Ngày giải quyết</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                      <CheckCircle size={12} style={{ color: '#22C55E' }} /> {formatDateTime(viewTicket.resolvedAt)}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewTicket.description && (
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Mô tả</div>
                  <div className="card" style={{ padding: 12, background: 'var(--bg-tertiary)', border: 'none', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                    {viewTicket.description}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12 }}>
                  Trao đổi ({viewTicket.comments?.length || 0})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                  {viewTicket.comments?.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.8125rem' }}>
                      <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>{getInitials(c.user?.fullName)}</div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 8, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span className="font-semibold">{c.user?.fullName}</span>
                          <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                        </div>
                        <div>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {(!viewTicket.comments || viewTicket.comments.length === 0) && (
                    <div className="text-xs text-muted" style={{ padding: '12px 0' }}>Chưa có trao đổi nào</div>
                  )}
                </div>

                {/* Comment Form — only show if ticket is not closed */}
                {viewTicket.status !== 'closed' && (
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Viết tin nhắn..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Gửi</button>
                  </form>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Nhận xử lý */}
                {canAssign(viewTicket) && (
                  <button className="btn btn-sm" style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 6
                  }} onClick={() => handleAssign(viewTicket)}>
                    <UserCheck size={15} /> Nhận Xử Lý
                  </button>
                )}
                {/* Bắt đầu xử lý */}
                {canChangeStatus(viewTicket) && viewTicket.status === 'assigned' && (
                  <button className="btn btn-sm" style={{
                    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 6
                  }} onClick={() => handleStatusChange(viewTicket, 'in_progress')}>
                    <Play size={15} /> Bắt Đầu Xử Lý
                  </button>
                )}
                {/* Đã giải quyết */}
                {canChangeStatus(viewTicket) && (viewTicket.status === 'assigned' || viewTicket.status === 'in_progress') && (
                  <button className="btn btn-sm" style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 6
                  }} onClick={() => handleStatusChange(viewTicket, 'resolved')}>
                    <CheckCircle size={15} /> Đã Giải Quyết
                  </button>
                )}
                {/* Đóng ticket */}
                {canClose(viewTicket) && (
                  <button className="btn btn-sm" style={{
                    background: 'linear-gradient(135deg, #64748B, #475569)', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 6
                  }} onClick={() => handleStatusChange(viewTicket, 'closed')}>
                    <XCircle size={15} /> Đóng Ticket
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewTicket(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
