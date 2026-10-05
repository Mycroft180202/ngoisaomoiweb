import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import DatePickerVN from '../../components/ui/DatePickerVN';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Plus, X, CheckCircle, XCircle, Clock
} from 'lucide-react';

export default function CalendarPage() {
  const { user, isDirector, departments, getDepartmentName } = useAuth();
  const confirm = useConfirm();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'tour' | 'task' | 'leave' | 'meeting'
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: new Date().toISOString().substring(0, 10),
    start: '09:00',
    end: '10:00',
    room: 'Phòng họp T5',
    purpose: '',
    meetingWithDirector: false,
    departments: user?.department ? [user.department] : [],
    attendeesNote: ''
  });

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    loadEvents();
  }, [month, year]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const [res, meetingRes] = await Promise.all([
        api.get('/calendar/events', { month, year }),
        api.get('/meetings', { month, year })
      ]);
      setEvents(res.events || []);
      setMeetings(meetingRes.meetings || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  // Logic vẽ lịch tháng (Grid 35 hoặc 42 ô)
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();

  // Chuyển Chủ nhật (0) thành 6, Thứ hai (1) thành 0 để hợp chuẩn Việt Nam (Bắt đầu từ Thứ 2)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const daysGrid = [];
  for (let i = 0; i < startOffset; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const filteredEvents = events.filter(e => {
    if (filterType === 'all') return true;
    if (filterType === 'tour') return e.type === 'tour';
    if (filterType === 'task') return e.type === 'task';
    if (filterType === 'leave') return e.type === 'leave' || e.type === 'travel';
    if (filterType === 'meeting') return e.type === 'meeting';
    return true;
  });

  const toggleMeetingDepartment = (key) => {
    setMeetingForm(prev => {
      const exists = prev.departments.includes(key);
      const next = exists ? prev.departments.filter(item => item !== key) : [...prev.departments, key];
      return { ...prev, departments: next };
    });
  };

  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    const startTime = new Date(`${meetingForm.date}T${meetingForm.start}`);
    const endTime = new Date(`${meetingForm.date}T${meetingForm.end}`);
    if (!meetingForm.title.trim()) return toast.error('Vui lòng nhập tiêu đề cuộc họp');
    if (!meetingForm.purpose.trim()) return toast.error('Vui lòng nhập mục đích cuộc họp');
    if (!meetingForm.departments.length) return toast.error('Vui lòng chọn ít nhất một phòng/ban liên quan');
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      return toast.error('Thời gian họp không hợp lệ');
    }
    try {
      const res = await api.post('/meetings', {
        title: meetingForm.title,
        room: meetingForm.room,
        startTime,
        endTime,
        purpose: meetingForm.purpose,
        meetingWithDirector: meetingForm.meetingWithDirector,
        departments: meetingForm.departments,
        attendeesNote: meetingForm.attendeesNote
      });
      toast.success(res.message || 'Đã gửi đăng ký họp');
      setShowMeetingForm(false);
      setMeetingForm({
        title: '',
        date: meetingForm.date,
        start: '09:00',
        end: '10:00',
        room: 'Phòng họp T5',
        purpose: '',
        meetingWithDirector: false,
        departments: user?.department ? [user.department] : [],
        attendeesNote: ''
      });
      loadEvents();
    } catch (err) {
      toast.error(err.message || 'Không thể đăng ký họp');
    }
  };

  const handleReviewMeeting = async (meeting, action) => {
    const isReject = action === 'reject';
    const result = await confirm({
      title: isReject ? 'Từ chối lịch họp' : action === 'cancel' ? 'Hủy lịch họp' : 'Duyệt lịch họp',
      message: `"${meeting.title}" tại ${meeting.room}.`,
      confirmText: isReject ? 'Từ chối' : action === 'cancel' ? 'Hủy lịch' : 'Duyệt',
      cancelText: 'Đóng',
      type: isReject || action === 'cancel' ? 'danger' : 'success',
      input: isReject,
      inputLabel: 'Lý do từ chối',
      inputRequired: isReject
    });
    if (!result) return;
    try {
      const res = await api.patch(`/meetings/${meeting._id}/review`, {
        action,
        reason: isReject ? result : ''
      });
      toast.success(res.message || 'Đã cập nhật lịch họp');
      loadEvents();
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật lịch họp');
    }
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    return filteredEvents.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === day && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === year;
    });
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1>
          <CalendarIcon size={24} /> Lịch Vận Hành Tổng Hợp
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowMeetingForm(true)}>
            <Plus size={18} /> Đăng ký họp
          </button>
          <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={20} /></button>
          <span className="font-semibold" style={{ minWidth: 140, textAlign: 'center', fontSize: '1.125rem' }}>
            {monthNames[currentDate.getMonth()]} - {year}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <span className="text-sm font-medium text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={16} /> Lọc sự kiện:
        </span>
        <button
          className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('all')}
        >
          Tất cả ({events.length})
        </button>
        <button
          className={`btn btn-sm ${filterType === 'tour' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('tour')}
        >
          ✈️ Tour khởi hành
        </button>
        <button
          className={`btn btn-sm ${filterType === 'task' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('task')}
        >
          📋 Hạn chót công việc
        </button>
        <button
          className={`btn btn-sm ${filterType === 'leave' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('leave')}
        >
          🏖️ Nghỉ phép / Công tác
        </button>
        <button
          className={`btn btn-sm ${filterType === 'meeting' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('meeting')}
        >
          🏢 Lịch họp
        </button>
      </div>

      {meetings.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title"><Clock size={18} /> Đăng ký họp trong tháng</div>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {meetings.map(meeting => {
              const canReview = (isDirector || user?.department === 'it' || user?.role?.includes('manager')) && meeting.status === 'pending';
              const canCancel = meeting.createdBy?._id === user?._id && ['pending', 'approved'].includes(meeting.status);
              return (
                <div key={meeting._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="font-semibold truncate">{meeting.title}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                      {new Date(meeting.startTime).toLocaleString('vi-VN')} - {new Date(meeting.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {' • '}{meeting.room}
                      {' • '}{(meeting.departments || []).map(getDepartmentName).join(', ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${meeting.status === 'approved' ? 'badge-success' : meeting.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {meeting.status === 'approved' ? 'Đã duyệt' : meeting.status === 'pending' ? 'Chờ duyệt' : meeting.status === 'cancelled' ? 'Đã hủy' : 'Từ chối'}
                    </span>
                    {canReview && (
                      <>
                        <button className="btn btn-icon btn-ghost btn-sm" title="Duyệt" onClick={() => handleReviewMeeting(meeting, 'approve')}><CheckCircle size={15} /></button>
                        <button className="btn btn-icon btn-ghost btn-sm" title="Từ chối" onClick={() => handleReviewMeeting(meeting, 'reject')}><XCircle size={15} /></button>
                      </>
                    )}
                    {canCancel && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleReviewMeeting(meeting, 'cancel')}>Hủy</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)'
        }}>
          <div style={{ padding: '12px 0' }}>T2</div>
          <div style={{ padding: '12px 0' }}>T3</div>
          <div style={{ padding: '12px 0' }}>T4</div>
          <div style={{ padding: '12px 0' }}>T5</div>
          <div style={{ padding: '12px 0' }}>T6</div>
          <div style={{ padding: '12px 0' }}>T7</div>
          <div style={{ padding: '12px 0', color: 'var(--danger)' }}>CN</div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="loading-spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, background: 'var(--border)' }}>
            {daysGrid.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 110, background: day ? 'var(--bg-secondary)' : 'rgba(15, 23, 42, 0.4)',
                    padding: 8, display: 'flex', flexDirection: 'column', minWidth: 0
                  }}
                >
                  {day && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: '0.875rem', fontWeight: isToday ? 700 : 500,
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isToday ? 'var(--primary)' : 'transparent',
                          color: isToday ? '#FFF' : 'var(--text-primary)'
                        }}
                      >
                        {day}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                    {dayEvents.map(evt => (
                      <div
                        key={evt.id}
                        title={`${evt.title}\n${evt.details}`}
                        style={{
                          fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4,
                          background: `${evt.badgeColor}22`, borderLeft: `3px solid ${evt.badgeColor}`,
                          color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showMeetingForm && (
        <div className="modal-overlay" onClick={() => setShowMeetingForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Đăng ký họp</h2>
              <button className="modal-close" onClick={() => setShowMeetingForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleMeetingSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Tiêu đề</label>
                  <input className="form-control" value={meetingForm.title} onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })} placeholder="VD: Họp kế hoạch tour hè" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Ngày họp</label>
                    <DatePickerVN value={meetingForm.date} onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Phòng họp</label>
                    <input className="form-control" value={meetingForm.room} onChange={e => setMeetingForm({ ...meetingForm, room: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Bắt đầu</label>
                    <input type="time" className="form-control" value={meetingForm.start} onChange={e => setMeetingForm({ ...meetingForm, start: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Kết thúc</label>
                    <input type="time" className="form-control" value={meetingForm.end} onChange={e => setMeetingForm({ ...meetingForm, end: e.target.value })} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label required">Mục đích</label>
                  <textarea className="form-control" rows={3} value={meetingForm.purpose} onChange={e => setMeetingForm({ ...meetingForm, purpose: e.target.value })} placeholder="Nội dung cần trao đổi, quyết định cần chốt..." required />
                </div>
                <div className="form-group">
                  <button type="button" className={`btn ${meetingForm.meetingWithDirector ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMeetingForm({ ...meetingForm, meetingWithDirector: !meetingForm.meetingWithDirector })}>
                    Họp với TGĐ
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label required">Phòng/ban liên quan</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    {departments.map(dept => (
                      <button key={dept.key} type="button" className={`btn ${meetingForm.departments.includes(dept.key) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleMeetingDepartment(dept.key)} style={{ justifyContent: 'flex-start' }}>
                        {meetingForm.departments.includes(dept.key) ? '✓' : '○'} {dept.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú người tham dự</label>
                  <input className="form-control" value={meetingForm.attendeesNote} onChange={e => setMeetingForm({ ...meetingForm, attendeesNote: e.target.value })} placeholder="VD: Sale team, Marketing lead, kế toán..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMeetingForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Gửi đăng ký</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
