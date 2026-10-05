import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import { taskStatusMap, taskPriorityMap, formatDate, getInitials, departmentNames } from '../../utils/helpers';
import {
  ListTodo, Plus, GripVertical, MessageSquare,
  Calendar, User, Filter, X, Clock, CheckCircle, Download, Pin,
  Kanban, Paperclip, AlertCircle, Check, Edit, ArrowRight, Search, MoreHorizontal
} from 'lucide-react';
import DatePickerVN from '../../components/ui/DatePickerVN';

export default function TaskBoard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [viewTask, setViewTask] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [showCancelled, setShowCancelled] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    assignee: '', department: user?.department || '', deadline: ''
  });

  const [departments, setDepartments] = useState([]);

  const getDepartmentName = (deptKey) => {
    const dept = departments.find(d => d.key === deptKey);
    return dept ? dept.name : (departmentNames[deptKey] || deptKey);
  };

  // Tuần từ thứ 2 đến chủ nhật
  const getWeekRange = (date) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const { monday, sunday } = getWeekRange(currentWeekDate);

  const handlePrevWeek = () => {
    setCurrentWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    setCurrentWeekDate(new Date());
  };

  const formatDateRange = (start, end) => {
    const fs = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`;
    const fe = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;
    return `${fs} - ${fe}`;
  };

  const handleOpenDetail = async (task) => {
    try {
      const data = await api.get(`/tasks/${task._id}`);
      setViewTask(data.task);
    } catch (err) {
      toast.error('Không thể tải chi tiết công việc');
    }
  };

  useEffect(() => {
    const taskId = searchParams.get('id');
    if (taskId) {
      handleOpenDetail({ _id: taskId });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    loadTasks();
  }, [filterDept, currentWeekDate]);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  const loadTasks = async () => {
    try {
      const params = {
        limit: 100,
        startDate: monday.toISOString(),
        endDate: sunday.toISOString()
      };
      if (filterDept) params.department = filterDept;
      const data = await api.get('/tasks', params);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.get('/users', { limit: 50 });
      setUsers(data.users || []);
    } catch (e) {}
  };

  const loadDepartments = async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data.departments || []);
    } catch (e) {}
  };

  const canDragTask = (task) => {
    if (!user || task.status === 'cancelled') return false;
    const isDirector = user.role === 'director';
    const isManagerOfDept = user.role.includes('manager') && user.department === task.department;
    
    const creatorId = task.createdBy?._id || task.createdBy;
    const assigneeId = task.assignee?._id || task.assignee;
    
    const isCreator = creatorId === user._id;
    const isAssignee = assigneeId === user._id;
    
    return isDirector || isManagerOfDept || isCreator || isAssignee;
  };

  const canCancelTask = (task) => {
    if (!user || !task) return false;
    const isDirector = user.role === 'director';
    const isIT = user.department === 'it';
    
    const creatorId = task.createdBy?._id || task.createdBy;
    const isCreator = creatorId === user._id;
    const isManager = user.role.includes('manager');
    
    if (isDirector || isIT) return true;
    
    if (isManager && isCreator) {
      const createdDate = new Date(task.createdAt);
      const now = new Date();
      const isSameDay = 
        createdDate.getFullYear() === now.getFullYear() &&
        createdDate.getMonth() === now.getMonth() &&
        createdDate.getDate() === now.getDate();
      return isSameDay;
    }
    
    return false;
  };

  const confirm = useConfirm();

  const handleCancelTask = async (taskId) => {
    const isConfirmed = await confirm({
      title: 'Hủy công việc',
      message: `Bạn có chắc chắn muốn hủy công việc "${viewTask?.title || ''}" này không?`,
      confirmText: 'Hủy công việc',
      cancelText: 'Đóng',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const res = await api.delete(`/tasks/${taskId}`);
      setViewTask(null);
      loadTasks();
      toast.success(res.message || 'Đã hủy công việc');
    } catch (err) {
      toast.error(err.message || 'Không thể hủy công việc');
    }
  };

  const canApproveTask = (task) => {
    if (!user || !task) return false;
    if (task.status !== 'review') return false;
    const isDirector = user.role === 'director';
    const isIT = user.department === 'it';
    const isManagerOfDept = user.role?.includes('manager') && user.department === task.department;
    return isDirector || isIT || isManagerOfDept;
  };

  const handleApproveTask = async (task) => {
    const isConfirmed = await confirm({
      title: 'Duyệt Hoàn Thành',
      message: `Bạn có chắc chắn muốn duyệt hoàn thành công việc "${task.title}"?`,
      confirmText: 'Duyệt Hoàn Thành',
      cancelText: 'Hủy',
      type: 'primary'
    });
    if (!isConfirmed) return;
    try {
      const res = await api.patch(`/tasks/${task._id}/status`, { status: 'done' });
      if (res.task) {
        setTasks(prev => prev.map(t => t._id === res.task._id ? res.task : t));
        setViewTask(res.task);
      }
    } catch (err) {
      await confirm({
        title: 'Lỗi',
        message: err.message || 'Không thể duyệt hoàn thành công việc',
        confirmText: 'Đã hiểu',
        showCancel: false,
        type: 'danger'
      });
    }
  };

  const columns = [
    { key: 'todo', label: 'Mới', color: '#64748B' },
    { key: 'in_progress', label: 'Đang Làm', color: '#0EA5E9' },
    { key: 'review', label: 'Review', color: '#EAB308' },
    { key: 'done', label: 'Hoàn Thành', color: '#22C55E' },
  ];
  if (showCancelled) {
    columns.push({ key: 'cancelled', label: 'Đã Hủy', color: '#EF4444' });
  }

  const handleDragStart = (e, task) => {
    if (!canDragTask(task)) {
      e.preventDefault();
      toast('Bạn không có quyền di chuyển công việc này');
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDragEnd = (e) => {
    setDraggedTask(null);
    const columns = document.querySelectorAll('.kanban-column-body');
    columns.forEach(col => col.classList.remove('drag-over'));
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!draggedTask || draggedTask.status === newStatus) return;

    // Restrict "done" (Hoàn thành) status changes
    const isDirector = user?.role === 'director';
    const isIT = user?.department === 'it';
    const isManagerOfDept = user?.role?.includes('manager') && user?.department === draggedTask.department;

    if (newStatus === 'done') {
      // Chỉ Director, IT, Trưởng phòng mới được phê duyệt hoàn thành
      if (!isDirector && !isIT && !isManagerOfDept) {
        await confirm({
          title: 'Hành động bị chặn',
          message: 'Bạn không có quyền di chuyển công việc sang cột Hoàn thành. Chỉ Giám đốc, Trưởng phòng liên quan hoặc bộ phận IT mới có thể phê duyệt hoàn thành công việc.',
          confirmText: 'Đã hiểu',
          showCancel: false,
          type: 'warning'
        });
        setDraggedTask(null);
        return;
      }
      // Chỉ cho phép chuyển sang Hoàn thành khi task đang ở trạng thái Review
      if (draggedTask.status !== 'review') {
        await confirm({
          title: 'Hành động bị chặn',
          message: 'Chỉ có thể chuyển sang Hoàn thành khi công việc đang ở trạng thái Review.',
          confirmText: 'Đã hiểu',
          showCancel: false,
          type: 'warning'
        });
        setDraggedTask(null);
        return;
      }
    }
    const isProgressiveMove = 
      (draggedTask.status === 'todo' && newStatus === 'in_progress') || 
      (draggedTask.status === 'in_progress' && newStatus === 'review');

    if (!isDirector && !isProgressiveMove && draggedTask.lastStatusChange) {
      const oneHour = 60 * 60 * 1000;
      const timeDiff = new Date() - new Date(draggedTask.lastStatusChange);
      if (timeDiff < oneHour) {
        const remainingMinutes = Math.ceil((oneHour - timeDiff) / (60 * 1000));
        await confirm({
          title: 'Hành động bị chặn',
          message: `Bạn phải đợi thêm ${remainingMinutes} phút trước khi di chuyển công việc này tiếp.`,
          confirmText: 'Đã hiểu',
          showCancel: false,
          type: 'warning'
        });
        setDraggedTask(null);
        return;
      }
    }

    const columnLabel = columns.find(c => c.key === newStatus)?.label || newStatus;
    const isConfirmed = await confirm({
      title: 'Di chuyển công việc',
      message: `Bạn có chắc muốn chuyển công việc "${draggedTask.title}" sang cột "${columnLabel}"?`,
      confirmText: 'Di chuyển',
      cancelText: 'Hủy',
      type: 'primary'
    });
    if (!isConfirmed) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t._id === draggedTask._id ? { ...t, status: newStatus, lastStatusChange: new Date().toISOString() } : t
    ));

    try {
      const res = await api.patch(`/tasks/${draggedTask._id}/status`, { status: newStatus });
      if (res.task) {
        setTasks(prev => prev.map(t => t._id === res.task._id ? res.task : t));
      }
    } catch (err) {
      toast.error(err.message || 'Không thể di chuyển công việc');
      loadTasks(); // rollback
    }
    setDraggedTask(null);
  };

  const handleOpenCreateForm = () => {
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      assignee: '',
      department: user?.department || '',
      deadline: ''
    });
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', form);
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', assignee: '', department: user?.department || '', deadline: '' });
      loadTasks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTogglePin = async (e, task) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/tasks/${task._id}/pin`);
      if (res.task) {
        setTasks(prev => prev.map(t => t._id === res.task._id ? res.task : t));
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getColumnTasks = (status) => {
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1><ListTodo size={24} /> Quản Lý Công Việc</h1>
        <div className="page-header-actions">
          <select
            className="form-control form-control-sm"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map(d => (
              <option key={d.key} value={d.key}>{d.name}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={() => window.open('/api/exports/tasks', '_blank')} title="Xuất báo cáo Excel">
            <Download size={18} /> Xuất Excel
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreateForm}>
            <Plus size={18} /> Tạo Mới
          </button>
        </div>
      </div>

      {/* Sub-toolbar for Filtering */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Week Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={handlePrevWeek} style={{ padding: '2px 6px', height: 28 }}>&lt;</button>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, minWidth: 150, textAlign: 'center', color: 'var(--text-h)' }}>
              Tuần: {formatDateRange(monday, sunday)}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleNextWeek} style={{ padding: '2px 6px', height: 28 }}>&gt;</button>
            <button className="btn btn-ghost btn-sm" onClick={handleCurrentWeek} style={{ padding: '2px 8px', height: 28, fontSize: '0.6875rem', marginLeft: 4, borderLeft: '1px solid var(--border)' }}>Tuần này</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Show Cancelled Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-h)' }}>
            <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} />
            Hiển thị việc đã hủy
          </label>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map(col => {
          const colTasks = getColumnTasks(col.key);
          return (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  {col.label}
                </div>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>
              <div
                className="kanban-column-body"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {colTasks.map(task => {
                  const isMyTask = task.assignee?._id === user?._id || task.assignee === user?._id;
                  return (
                    <div
                      key={task._id}
                      className={`kanban-card ${draggedTask?._id === task._id ? 'dragging' : ''} ${!canDragTask(task) ? 'readonly' : ''} ${isMyTask ? 'my-task' : ''}`}
                      draggable={canDragTask(task)}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenDetail(task)}
                      style={{
                        borderLeft: task.isPinned ? '3px solid var(--warning)' : undefined,
                        background: task.isPinned ? 'rgba(234, 179, 8, 0.04)' : undefined
                      }}
                    >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="text-xs text-muted">{task.code}</span>
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, task)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            color: task.isPinned ? 'var(--warning)' : 'var(--text-muted)', opacity: task.isPinned ? 1 : 0.4
                          }}
                          title={task.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        >
                          <Pin size={12} fill={task.isPinned ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <span className={`badge badge-${taskPriorityMap[task.priority]?.color}`} style={{ fontSize: '0.625rem' }}>
                        {taskPriorityMap[task.priority]?.label}
                      </span>
                    </div>
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {task.assignee && (
                          <div className="avatar avatar-sm" title={task.assignee.fullName}>
                            {getInitials(task.assignee.fullName)}
                          </div>
                        )}
                        {task.comments?.length > 0 && (
                          <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <MessageSquare size={12} /> {task.comments.length}
                          </span>
                        )}
                      </div>
                      {task.deadline && (
                        <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} />
                          {formatDate(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Plus size={20} /> Tạo Công Việc Mới</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tiêu đề *</label>
                  <input type="text" className="form-control" value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea className="form-control" value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})} rows={3} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phòng ban *</label>
                    <select className="form-control" value={form.department}
                      onChange={e => setForm({...form, department: e.target.value, assignee: ''})}
                      disabled={user?.role !== 'director'}
                      required>
                      <option value="">Chọn phòng ban</option>
                      {departments.map(d => (
                        <option key={d.key} value={d.key}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Giao cho</label>
                    <select className="form-control" value={form.assignee}
                      onChange={e => setForm({...form, assignee: e.target.value})}>
                      <option value="">Chưa giao</option>
                      {users.filter(u => u.department === form.department).map(u => (
                        <option key={u._id} value={u._id}>{u.fullName} - {getDepartmentName(u.department)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Độ ưu tiên</label>
                    <select className="form-control" value={form.priority}
                      onChange={e => setForm({...form, priority: e.target.value})}>
                      {Object.entries(taskPriorityMap).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Deadline</label>
                    <DatePickerVN value={form.deadline}
                      onChange={e => setForm({...form, deadline: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Công Việc</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {viewTask && (
        <div className="modal-overlay" onClick={() => setViewTask(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewTask.code} — {viewTask.title}</h2>
              <button className="modal-close" onClick={() => setViewTask(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Trạng thái</div>
                  <span className={`badge badge-${taskStatusMap[viewTask.status]?.color}`}>
                    {taskStatusMap[viewTask.status]?.label}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Độ ưu tiên</div>
                  <span className={`badge badge-${taskPriorityMap[viewTask.priority]?.color}`}>
                    {taskPriorityMap[viewTask.priority]?.label}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Phòng ban</div>
                  <div className="font-semibold">{getDepartmentName(viewTask.department)}</div>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Người giao</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar avatar-sm">{getInitials(viewTask.createdBy?.fullName)}</div>
                    <span>{viewTask.createdBy?.fullName}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Người nhận việc</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {viewTask.assignee ? (
                      <>
                        <div className="avatar avatar-sm">{getInitials(viewTask.assignee.fullName)}</div>
                        <span>{viewTask.assignee.fullName}</span>
                      </>
                    ) : (
                      <span className="text-muted">Chưa giao</span>
                    )}
                  </div>
                </div>
              </div>

              {viewTask.deadline && (
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Hạn chót</div>
                  <div>{formatDate(viewTask.deadline)}</div>
                </div>
              )}

              {viewTask.description && (
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Mô tả</div>
                  <div className="text-sm card" style={{ padding: 12, background: 'var(--bg-tertiary)', border: 'none' }}>
                    {viewTask.description}
                  </div>
                </div>
              )}

              {/* Subtasks (Checklist) */}
              <div style={{ marginBottom: 20 }}>
                <div className="text-xs text-muted" style={{ marginBottom: 8 }}>Danh sách kiểm tra (Subtasks)</div>
                {!viewTask.subtasks || viewTask.subtasks.length === 0 ? (
                  <div className="text-xs text-muted">Không có subtask</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewTask.subtasks.map((sub, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={async () => {
                            const updatedSubtasks = [...viewTask.subtasks];
                            updatedSubtasks[idx].completed = !updatedSubtasks[idx].completed;
                            try {
                              const res = await api.put(`/tasks/${viewTask._id}`, { subtasks: updatedSubtasks });
                              setViewTask(res.task);
                              setTasks(prev => prev.map(t => t._id === viewTask._id ? res.task : t));
                            } catch (e) {
                              toast.error('Không thể cập nhật subtask');
                            }
                          }}
                        />
                        <span style={{ textDecoration: sub.completed ? 'line-through' : 'none', opacity: sub.completed ? 0.6 : 1 }}>
                          {sub.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12 }}>Bình luận ({viewTask.comments?.length || 0})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                  {viewTask.comments?.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.8125rem' }}>
                      <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>{getInitials(c.user?.fullName)}</div>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 8, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span className="font-semibold">{c.user?.fullName}</span>
                          <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
                        </div>
                        <div>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {(!viewTask.comments || viewTask.comments.length === 0) && (
                    <div className="text-xs text-muted" style={{ padding: '12px 0' }}>Chưa có bình luận nào</div>
                  )}
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newComment.trim()) return;
                  try {
                    const res = await api.post(`/tasks/${viewTask._id}/comments`, { content: newComment });
                    setViewTask(res.task);
                    setNewComment('');
                    setTasks(prev => prev.map(t => t._id === viewTask._id ? res.task : t));
                  } catch (e) {
                    toast.error('Không thể gửi bình luận');
                  }
                }} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Viết bình luận..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Gửi</button>
                </form>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {canCancelTask(viewTask) && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleCancelTask(viewTask._id)}>
                    Hủy công việc
                  </button>
                )}
                {canApproveTask(viewTask) && (
                  <button type="button" className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleApproveTask(viewTask)}>
                    <CheckCircle size={16} /> Duyệt Hoàn Thành
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewTask(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
