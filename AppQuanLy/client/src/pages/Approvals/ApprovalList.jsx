import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import {
  approvalStatusMap, approvalTypeMap, formatDate, formatCurrency,
  getInitials, departmentNames, timeAgo
} from '../../utils/helpers';
import {
  FileCheck, Plus, X, Check, XCircle, RotateCcw,
  Clock, User, DollarSign, ChevronRight
} from 'lucide-react';
import DatePickerVN from '../../components/ui/DatePickerVN';

export default function ApprovalList() {
  const { user, isDirector, isManager, getDepartmentName } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [viewApproval, setViewApproval] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const handleOpenDetail = async (id) => {
    try {
      const data = await api.get(`/approvals/${id}`);
      setViewApproval(data.approval);
    } catch (err) {
      toast.error('Không thể tải chi tiết đề xuất');
    }
  };

  useEffect(() => {
    const approvalId = searchParams.get('id');
    if (approvalId) {
      handleOpenDetail(approvalId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    type: 'expense', title: '', content: '', amount: '', startDate: '', endDate: ''
  });

  useEffect(() => {
    loadApprovals();
  }, [tab]);

  const loadApprovals = async () => {
    try {
      const params = { limit: 50 };
      if (tab !== 'all') params.tab = tab;
      const data = await api.get('/approvals', params);
      setApprovals(data.approvals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/approvals', {
        ...form,
        amount: parseInt(form.amount) || 0
      });
      setShowForm(false);
      setForm({ type: 'expense', title: '', content: '', amount: '', startDate: '', endDate: '' });
      loadApprovals();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirm = useConfirm();

  const handleReview = async (id, action, options = {}) => {
    const needsDirector = Boolean(options.requireDirectorApproval);
    const actionText = action === 'approved' ? 'duyệt' : action === 'rejected' ? 'từ chối' : 'trả lại';
    const confirmType = action === 'approved' ? 'success' : action === 'rejected' ? 'danger' : 'warning';
    
    const isConfirmed = await confirm({
      title: 'Xét duyệt đề xuất',
      message: needsDirector
        ? `Đề xuất "${viewApproval?.title}" sẽ được chuyển tiếp lên Tổng giám đốc duyệt.`
        : `Bạn có chắc chắn muốn ${actionText} đề xuất "${viewApproval?.title}" không?`,
      confirmText: needsDirector ? 'Chuyển TGĐ' : action === 'approved' ? 'Phê duyệt' : action === 'rejected' ? 'Từ chối' : 'Trả lại',
      cancelText: 'Hủy',
      type: confirmType
    });
    
    if (!isConfirmed) return;
    
    try {
      await api.patch(`/approvals/${id}/review`, {
        action,
        note: reviewNote,
        requireDirectorApproval: needsDirector
      });
      setReviewNote('');
      setViewApproval(null);
      loadApprovals();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pendingCount = approvals.filter(a =>
    a.status === 'pending_manager' || a.status === 'pending_director'
  ).length;

  const getPendingStep = (approval) => approval?.approvalFlow?.find(step => step.status === 'pending');
  const isHrPendingStep = (approval) => {
    const step = getPendingStep(approval);
    return user?.role === 'hr_manager' && approval?.status === 'pending_manager' && step?.reviewer?._id === user?._id;
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1><FileCheck size={24} /> Xét Duyệt</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Tạo Đề Xuất
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-item ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Tất cả
        </button>
        {(isManager || isDirector) && (
          <button className={`tab-item ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Chờ tôi duyệt
            {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
          </button>
        )}
        <button className={`tab-item ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
          Đề xuất của tôi
        </button>
      </div>

      {/* Approval List */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Loại</th>
              <th>Tiêu đề</th>
              <th>Người tạo</th>
              <th>Phòng ban</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {approvals.map(apr => (
              <tr key={apr._id}>
                <td className="text-sm font-medium">{apr.code}</td>
                <td>
                  <span className="text-sm">
                    {approvalTypeMap[apr.type]?.icon} {approvalTypeMap[apr.type]?.label}
                  </span>
                </td>
                <td>
                  <div className="text-sm font-medium truncate" style={{ maxWidth: 250 }}>{apr.title}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar avatar-sm">{getInitials(apr.createdBy?.fullName)}</div>
                    <span className="text-sm">{apr.createdBy?.fullName}</span>
                  </div>
                </td>
                <td className="text-sm text-secondary">{getDepartmentName(apr.department)}</td>
                <td className="text-sm font-semibold" style={{ color: apr.amount > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                  {apr.amount > 0 ? formatCurrency(apr.amount) : '-'}
                </td>
                <td>
                  <span className={`badge badge-${approvalStatusMap[apr.status]?.color}`}>
                    {approvalStatusMap[apr.status]?.label}
                  </span>
                </td>
                <td className="text-sm text-muted">{formatDate(apr.createdAt)}</td>
                <td>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => {
                    setViewApproval(apr);
                    setReviewNote('');
                  }}>
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {approvals.length === 0 && (
        <div className="empty-state">
          <FileCheck size={48} />
          <h3>Chưa có đề xuất nào</h3>
          <p>Tạo đề xuất đầu tiên để bắt đầu</p>
        </div>
      )}

      {/* View Approval Detail */}
      {viewApproval && (
        <div className="modal-overlay" onClick={() => setViewApproval(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 {viewApproval.title}</h2>
              <button className="modal-close" onClick={() => setViewApproval(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {/* Info */}
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted">Mã đề xuất</div>
                  <div className="font-semibold">{viewApproval.code}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Loại</div>
                  <div>{approvalTypeMap[viewApproval.type]?.icon} {approvalTypeMap[viewApproval.type]?.label}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted">Người tạo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div className="avatar avatar-sm">{getInitials(viewApproval.createdBy?.fullName)}</div>
                    <div>
                      <div className="text-sm font-medium">{viewApproval.createdBy?.fullName}</div>
                      <div className="text-xs text-muted">{viewApproval.createdBy?.position}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Số tiền</div>
                  <div className="font-bold text-lg" style={{ color: 'var(--secondary)' }}>
                    {viewApproval.amount > 0 ? formatCurrency(viewApproval.amount) : 'Không có'}
                  </div>
                </div>
              </div>

              {viewApproval.content && (
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted mb-8">Nội dung</div>
                  <div style={{
                    padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem', lineHeight: 1.6
                  }}>
                    {viewApproval.content}
                  </div>
                </div>
              )}

              {/* Approval Flow Timeline */}
              <div style={{ marginBottom: 16 }}>
                <div className="text-xs text-muted mb-8">Quy trình duyệt</div>
                <div className="approval-timeline">
                  <div className="timeline-step approved">
                    <div className="timeline-dot"><User size={16} /></div>
                    <div className="timeline-label">
                      Người tạo<br />
                      <span className="text-xs" style={{ color: 'var(--success)' }}>✓ Đã gửi</span>
                    </div>
                  </div>
                  {viewApproval.approvalFlow?.map((step, idx) => (
                    <div key={idx} className={`timeline-step ${step.status}`}>
                      <div className="timeline-dot">
                        {step.status === 'approved' ? <Check size={16} /> :
                         step.status === 'rejected' ? <XCircle size={16} /> :
                         step.status === 'returned' ? <RotateCcw size={16} /> :
                         <Clock size={16} />}
                      </div>
                      <div className="timeline-label">
                        {step.roleRequired === 'manager' && step.reviewer?.fullName
                          ? 'Trưởng phòng Nhân sự'
                          : step.roleRequired === 'manager'
                            ? 'Trưởng phòng'
                            : 'Tổng giám đốc'}<br />
                        {step.reviewer?.fullName && (
                          <span className="text-xs text-muted">{step.reviewer.fullName}</span>
                        )}
                        {step.note && (
                          <div className="text-xs" style={{ marginTop: 4, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                            "{step.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Actions */}
              {(isManager || isDirector) &&
               (viewApproval.status === 'pending_manager' || viewApproval.status === 'pending_director') && (
                <div style={{
                  padding: 16, background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)', marginTop: 16
                }}>
                  <div className="text-sm font-semibold mb-8">Xét duyệt</div>
                  <div className="form-group">
                    <label>Ghi chú</label>
                    <textarea className="form-control" rows={2} value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Nhập ghi chú xét duyệt..." />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isHrPendingStep(viewApproval) ? (
                      <>
                        <button className="btn btn-success" onClick={() => handleReview(viewApproval._id, 'approved', { requireDirectorApproval: false })}>
                          <Check size={16} /> Tự duyệt
                        </button>
                        <button className="btn btn-primary" onClick={() => handleReview(viewApproval._id, 'approved', { requireDirectorApproval: true })}>
                          <ChevronRight size={16} /> Cần TGĐ duyệt
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-success" onClick={() => handleReview(viewApproval._id, 'approved')}>
                        <Check size={16} /> Duyệt
                      </button>
                    )}
                    <button className="btn btn-danger" onClick={() => handleReview(viewApproval._id, 'rejected')}>
                      <XCircle size={16} /> Từ chối
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleReview(viewApproval._id, 'returned')}>
                      <RotateCcw size={16} /> Trả lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Approval Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Plus size={20} /> Tạo Đề Xuất</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Loại đề xuất *</label>
                  <select className="form-control" value={form.type}
                    onChange={e => setForm({...form, type: e.target.value})}>
                    {Object.entries(approvalTypeMap).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tiêu đề *</label>
                  <input type="text" className="form-control" value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})} required
                    placeholder="VD: Đề xuất chi phí quảng cáo..." />
                </div>
                <div className="form-group">
                  <label>Nội dung chi tiết</label>
                  <textarea className="form-control" value={form.content}
                    onChange={e => setForm({...form, content: e.target.value})} rows={4}
                    placeholder="Mô tả chi tiết đề xuất..." />
                </div>
                {(form.type === 'leave' || form.type === 'travel') && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Từ ngày *</label>
                      <DatePickerVN value={form.startDate}
                        onChange={e => setForm({...form, startDate: e.target.value})} required={form.type === 'leave'} />
                    </div>
                    <div className="form-group">
                      <label>Đến ngày *</label>
                      <DatePickerVN value={form.endDate}
                        onChange={e => setForm({...form, endDate: e.target.value})} required={form.type === 'leave'} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Số tiền (nếu có)</label>
                  <input type="number" className="form-control" value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    placeholder="VD: 15000000" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Gửi Đề Xuất</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
