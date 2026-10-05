import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatDate, formatCurrency, formatDateTime } from '../../utils/helpers';
import {
  Users, Plus, Search, Phone, Mail, MapPin, CreditCard, Calendar, Eye, Edit, Trash2, X, Send, Clock
} from 'lucide-react';

export default function CustomerList() {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);

  // Form chính để thêm/sửa khách hàng
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    passportNumber: '',
    source: 'direct',
    status: 'potential',
    notes: '',
    nextContactDate: '',
    nextContactNote: ''
  });

  // Form phụ ghi nhận nhanh lịch sử cuộc gọi / liên hệ
  const [quickContact, setQuickContact] = useState({
    note: '',
    nextContactDate: '',
    nextContactNote: ''
  });

  useEffect(() => {
    loadCustomers();
  }, [search, statusFilter]);

  const loadCustomers = async () => {
    try {
      const params = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/customers', params);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/customers/${id}`);
      setViewCustomer(res.customer);
      setCustomerBookings(res.bookings || []);
      setQuickContact({ note: '', nextContactDate: '', nextContactNote: '' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatForDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        nextContactDate: formData.nextContactDate || null
      };

      if (editingItem) {
        await api.put(`/customers/${editingItem._id}`, dataToSend);
        toast.success('Cập nhật khách hàng thành công!');
      } else {
        await api.post('/customers', dataToSend);
        toast.success('Thêm khách hàng thành công!');
      }
      setShowModal(false);
      setEditingItem(null);
      loadCustomers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleQuickContactSubmit = async (e) => {
    e.preventDefault();
    if (!quickContact.note.trim()) return;

    try {
      const res = await api.post(`/customers/${viewCustomer._id}/contact-history`, {
        note: quickContact.note.trim(),
        nextContactDate: quickContact.nextContactDate || null,
        nextContactNote: quickContact.nextContactNote.trim()
      });
      toast.success('Đã ghi nhận lịch sử liên hệ chăm sóc khách hàng!');
      setViewCustomer(res.customer);
      setQuickContact({ note: '', nextContactDate: '', nextContactNote: '' });
      loadCustomers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Xóa khách hàng',
      message: 'Khách hàng này sẽ bị xóa khỏi hệ thống CRM.',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Đã xóa khách hàng!');
      loadCustomers();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (cust) => {
    setEditingItem(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      passportNumber: cust.passportNumber || '',
      source: cust.source || 'direct',
      status: cust.status || 'potential',
      notes: cust.notes || '',
      nextContactDate: cust.nextContactDate ? formatForDateTimeLocal(cust.nextContactDate) : '',
      nextContactNote: cust.nextContactNote || ''
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  const sourceLabels = {
    direct: 'Trực tiếp', facebook: 'Facebook', zalo: 'Zalo', website: 'Website', referral: 'Giới thiệu', other: 'Khác'
  };

  const statusBadges = {
    potential: { label: 'Tiềm năng', color: 'info' },
    booked: { label: 'Đã mua tour', color: 'success' },
    vip: { label: 'Khách VIP', color: 'warning' },
    blacklisted: { label: 'Hạn chế', color: 'danger' }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>
          <Users size={24} /> Quản Lý Khách Hàng (CRM)
        </h1>
        <button className="btn btn-primary" onClick={() => {
          setEditingItem(null);
          setFormData({
            name: '',
            phone: '',
            email: '',
            address: '',
            passportNumber: '',
            source: 'direct',
            status: 'potential',
            notes: '',
            nextContactDate: '',
            nextContactNote: ''
          });
          setShowModal(true);
        }}>
          <Plus size={18} /> Thêm Khách Hàng
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="header-search" style={{ width: 260 }}>
          <Search size={18} />
          <input type="text" placeholder="Tìm tên, SĐT, email, mã..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control form-control-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">Tất cả trạng thái</option>
          <option value="potential">Tiềm năng</option>
          <option value="booked">Đã mua tour</option>
          <option value="vip">Khách VIP</option>
          <option value="blacklisted">Hạn chế</option>
        </select>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
          Tổng: {customers.length} khách hàng
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {customers.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: 32 }}>Không tìm thấy khách hàng nào</div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã KH</th>
                    <th>Họ và Tên</th>
                    <th>Số điện thoại</th>
                    <th>Nguồn</th>
                    <th>Trạng thái</th>
                    <th>Lịch Hẹn Gọi Lại</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(cust => {
                    const isOverdue = cust.nextContactDate && new Date(cust.nextContactDate) < new Date();
                    const isToday = cust.nextContactDate && new Date(cust.nextContactDate).toDateString() === new Date().toDateString();
                    
                    return (
                      <tr key={cust._id}>
                        <td className="font-semibold">{cust.code}</td>
                        <td className="font-medium" style={{ color: 'var(--primary)' }}>{cust.name}</td>
                        <td>{cust.phone}</td>
                        <td><span className="badge badge-ghost">{sourceLabels[cust.source] || cust.source}</span></td>
                        <td>
                          <span className={`badge badge-${statusBadges[cust.status]?.color || 'secondary'}`}>
                            {statusBadges[cust.status]?.label || cust.status}
                          </span>
                        </td>
                        <td>
                          {cust.nextContactDate ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span className={`badge badge-${isOverdue ? 'danger' : isToday ? 'warning' : 'info'}`} style={{ fontSize: '0.75rem', width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} /> {isOverdue ? '⚠️ Trễ hẹn: ' : ''}
                                {formatDateTime(cust.nextContactDate)}
                              </span>
                              {cust.nextContactNote && (
                                <span className="text-xs text-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cust.nextContactNote}>
                                  {cust.nextContactNote}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted text-xs">--</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleViewDetail(cust._id)} title="Xem chi tiết & CRM">
                              <Eye size={14} />
                            </button>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleEdit(cust)} title="Sửa">
                              <Edit size={14} />
                            </button>
                            <button className="btn btn-icon btn-ghost btn-sm text-danger" onClick={() => handleDelete(cust._id)} title="Xóa">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail & Booking History & CRM */}
      {viewCustomer && (
        <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h2>👤 Hồ Sơ Khách Hàng: {viewCustomer.name} ({viewCustomer.code})</h2>
              <button className="modal-close" onClick={() => setViewCustomer(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ marginBottom: 20 }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Thông tin liên hệ</h4>
                  <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>SĐT:</strong> {viewCustomer.phone}</div>
                    <div><strong>Email:</strong> {viewCustomer.email || 'Chưa cập nhật'}</div>
                    <div><strong>Địa chỉ:</strong> {viewCustomer.address || 'Chưa cập nhật'}</div>
                    <div><strong>Hộ chiếu:</strong> {viewCustomer.passportNumber || 'Chưa có'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--primary)' }}>Phân loại & CRM</h4>
                  <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>Nguồn:</strong> {sourceLabels[viewCustomer.source]}</div>
                    <div><strong>Trạng thái:</strong> {statusBadges[viewCustomer.status]?.label}</div>
                    <div><strong>Người phụ trách:</strong> {viewCustomer.assignedTo?.fullName || viewCustomer.createdBy?.fullName || 'Hệ thống'}</div>
                    <div><strong>Ghi chú nhu cầu:</strong> {viewCustomer.notes || 'Không có'}</div>
                    {viewCustomer.nextContactDate && (
                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6 }}>
                        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> Hẹn Gọi Lại Tiếp Theo
                        </div>
                        <div style={{ fontWeight: 600, margin: '2px 0' }}>{formatDateTime(viewCustomer.nextContactDate)}</div>
                        {viewCustomer.nextContactNote && <div className="text-xs text-muted">{viewCustomer.nextContactNote}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginTop: 24 }}>
                {/* Lịch sử đặt tour */}
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>✈️ Lịch Sử Đặt Tour ({customerBookings.length})</h4>
                  {customerBookings.length === 0 ? (
                    <div className="text-muted text-center" style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.875rem' }}>Khách hàng chưa có đơn đặt tour nào trong hệ thống</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Mã Đơn</th>
                            <th>Tour</th>
                            <th>Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerBookings.map(b => (
                            <tr key={b._id}>
                              <td className="font-semibold">{b.code}</td>
                              <td style={{ fontSize: '0.85rem' }}>{b.tour?.name}</td>
                              <td><span className="badge badge-info">{b.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Nhật ký chăm sóc CRM */}
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>📞 Nhật Ký Chăm Sóc Khách Hàng</h4>
                  
                  {/* Form ghi nhận tương tác nhanh */}
                  <form onSubmit={handleQuickContactSubmit} style={{ marginBottom: 20, background: 'var(--bg-tertiary)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label text-xs font-semibold">Kết quả liên hệ / cuộc gọi *</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Ví dụ: Đã gọi điện, khách đang tham khảo tour Thái Lan..."
                        value={quickContact.note}
                        onChange={e => setQuickContact({ ...quickContact, note: e.target.value })}
                        required
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label text-xs font-semibold">Hẹn gọi lại lần sau</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={quickContact.nextContactDate}
                        onChange={e => setQuickContact({ ...quickContact, nextContactDate: e.target.value })}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label text-xs font-semibold">Ghi chú cuộc gọi sau</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ví dụ: Gọi vào buổi tối"
                        value={quickContact.nextContactNote}
                        onChange={e => setQuickContact({ ...quickContact, nextContactNote: e.target.value })}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Send size={14} /> Ghi nhận & Hẹn lịch
                    </button>
                  </form>

                  {/* Danh sách nhật ký */}
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                    {(!viewCustomer.contactHistory || viewCustomer.contactHistory.length === 0) ? (
                      <div className="text-muted text-center text-xs" style={{ padding: 10 }}>Chưa ghi nhận cuộc gọi nào</div>
                    ) : (
                      viewCustomer.contactHistory.slice().reverse().map((hist, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, borderLeft: '3px solid var(--primary)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                            <span>👤 {hist.contactedBy?.fullName || 'Nhân viên'}</span>
                            <span>{formatDateTime(hist.contactDate)}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{hist.note}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? '✏️ Sửa Thông Tin Khách Hàng' : '➕ Thêm Khách Hàng Mới'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Họ và tên *</label>
                    <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Số điện thoại *</label>
                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số hộ chiếu</label>
                    <input type="text" className="form-control" value={formData.passportNumber} onChange={e => setFormData({ ...formData, passportNumber: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ</label>
                  <input type="text" className="form-control" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nguồn khách hàng</label>
                    <select className="form-control" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                      <option value="direct">Trực tiếp</option>
                      <option value="facebook">Facebook</option>
                      <option value="zalo">Zalo</option>
                      <option value="website">Website</option>
                      <option value="referral">Giới thiệu</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phân loại / Trạng thái</label>
                    <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="potential">Tiềm năng</option>
                      <option value="booked">Đã mua tour</option>
                      <option value="vip">Khách VIP</option>
                      <option value="blacklisted">Hạn chế</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú nhu cầu / sở thích</label>
                  <textarea className="form-control" rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                </div>

                {/* CRM fields in main form */}
                <div style={{ marginTop: 15, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px dashed var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--primary)' }}>📅 Thiết Lập Hẹn Gọi Lại (Lịch CRM)</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ngày hẹn gọi lại</label>
                      <input type="datetime-local" className="form-control" value={formData.nextContactDate} onChange={e => setFormData({ ...formData, nextContactDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nội dung hẹn cuộc gọi</label>
                      <input type="text" className="form-control" placeholder="Ví dụ: Gọi lại hỏi kết quả bàn bạc" value={formData.nextContactNote} onChange={e => setFormData({ ...formData, nextContactNote: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingItem ? 'Cập Nhật' : 'Lưu Hồ Sơ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
