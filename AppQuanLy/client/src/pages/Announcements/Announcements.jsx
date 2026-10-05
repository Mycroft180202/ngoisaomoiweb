import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import { formatDate, getInitials } from '../../utils/helpers';
import {
  Megaphone, Plus, Pin, Trash2, Edit, X, Send
} from 'lucide-react';

export default function Announcements() {
  const { user, isDirector, departments, getDepartmentName } = useAuth();
  const confirm = useConfirm();
  const canWrite = isDirector || user?.role?.includes('manager') || user?.department === 'it';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetDepartment: 'all',
    pinned: false
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await api.get('/announcements');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem._id}`, formData);
        toast.success('Cập nhật bảng tin thành công!');
      } else {
        await api.post('/announcements', formData);
        toast.success('Đăng thông báo thành công!');
      }
      setShowModal(false);
      setEditingItem(null);
      loadAnnouncements();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Xóa thông báo',
      message: 'Thông báo này sẽ bị xóa khỏi bảng tin nội bộ.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Đã xóa thông báo!');
      loadAnnouncements();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      targetDepartment: item.targetDepartment || 'all',
      pinned: item.pinned || false
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>
          <Megaphone size={24} /> Bảng Tin Nội Bộ
        </h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => {
            setEditingItem(null);
            setFormData({ title: '', content: '', targetDepartment: 'all', pinned: false });
            setShowModal(true);
          }}>
            <Plus size={18} /> Đăng Thông Báo
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {announcements.length === 0 ? (
          <div className="card text-center text-muted" style={{ padding: 32 }}>
            Chưa có thông báo nào trên bảng tin
          </div>
        ) : (
          announcements.map(item => (
            <div
              key={item._id}
              className="card"
              style={{
                position: 'relative',
                borderLeft: item.pinned ? '4px solid var(--primary)' : '1px solid var(--border-light)',
                background: item.pinned ? 'rgba(14, 165, 233, 0.03)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar avatar-md" style={{ background: 'var(--primary)' }}>
                    {getInitials(item.createdBy?.fullName)}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.title}
                      {item.pinned && (
                        <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                          <Pin size={10} style={{ marginRight: 4 }} /> Ghim
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {item.createdBy?.fullName || 'Ban Quản Trị'} • {formatDate(item.createdAt)} • Đối tượng: {item.targetDepartment === 'all' ? 'Toàn công ty' : getDepartmentName(item.targetDepartment)}
                    </div>
                  </div>
                </div>

                {(isDirector || user?.department === 'it' || item.createdBy?._id === user?._id) && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleEdit(item)} title="Sửa">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDelete(item._id)} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-secondary" style={{ whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '0.9375rem' }}>
                {item.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Đăng/Sửa */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? '✏️ Sửa Thông Báo' : '📢 Đăng Thông Báo Mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Tiêu đề thông báo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Lịch nghỉ lễ Quốc Khánh 2/9..."
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Nội dung thông báo</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="Nhập chi tiết thông báo nội bộ..."
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Gửi tới phòng ban</label>
                    <select
                      className="form-control"
                      value={formData.targetDepartment}
                      onChange={e => setFormData({ ...formData, targetDepartment: e.target.value })}
                    >
                      <option value="all">🌐 Tất cả phòng ban (Toàn công ty)</option>
                      {departments.map(dept => (
                        <option key={dept.key} value={dept.key}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 28 }}>
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.pinned}
                        onChange={e => setFormData({ ...formData, pinned: e.target.checked })}
                      />
                      <span>📌 Ghim thông báo lên đầu trang</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  <Send size={16} /> {editingItem ? 'Cập Nhật' : 'Đăng Tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
