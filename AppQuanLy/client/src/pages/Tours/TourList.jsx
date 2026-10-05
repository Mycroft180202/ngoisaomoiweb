import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';
import {
  formatCurrency, formatDate, tourStatusMap, departmentNames, getInitials
} from '../../utils/helpers';
import {
  Map, Plus, Search, Eye, Edit, Trash2, X,
  Calendar, Users, DollarSign, MapPin
} from 'lucide-react';
import DatePickerVN from '../../components/ui/DatePickerVN';

export default function TourList() {
  const { user, isDirector, canAccess } = useAuth();
  const canCreateTour = canAccess('tours.create');
  const canEditTour = canAccess('tours.edit');
  const canDeleteTour = canAccess('tours.delete');
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [viewTour, setViewTour] = useState(null);
  const [pagination, setPagination] = useState({});

  const handleOpenDetail = async (id) => {
    try {
      const data = await api.get(`/tours/${id}`);
      setViewTour(data.tour);
    } catch (err) {
      toast.error('Không thể tải chi tiết tour');
    }
  };

  useEffect(() => {
    const tourId = searchParams.get('id');
    if (tourId) {
      handleOpenDetail(tourId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    code: '', name: '', destination: '', description: '',
    durationDays: 4, durationNights: 3,
    priceAdult: '', priceChild: '', priceSurcharge: '',
    departureDate: '', returnDate: '', maxGuests: 30, status: 'draft',
    estimatedCost: '', actualCost: ''
  });

  useEffect(() => {
    loadTours();
  }, [search, statusFilter]);

  const loadTours = async () => {
    try {
      const params = { limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await api.get('/tours', params);
      setTours(data.tours || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code, name: form.name, destination: form.destination,
        description: form.description,
        durationDays: parseInt(form.durationDays),
        durationNights: parseInt(form.durationNights),
        price: {
          adult: parseInt(form.priceAdult),
          child: parseInt(form.priceChild) || 0,
          surcharge: parseInt(form.priceSurcharge) || 0
        },
        departureDate: form.departureDate, returnDate: form.returnDate,
        maxGuests: parseInt(form.maxGuests), status: form.status,
        estimatedCost: parseInt(form.estimatedCost) || 0,
        actualCost: parseInt(form.actualCost) || 0
      };

      if (editingTour) {
        await api.put(`/tours/${editingTour._id}`, payload);
      } else {
        await api.post('/tours', payload);
      }
      setShowForm(false);
      setEditingTour(null);
      resetForm();
      loadTours();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (tour) => {
    setEditingTour(tour);
    setForm({
      code: tour.code, name: tour.name, destination: tour.destination,
      description: tour.description || '',
      durationDays: tour.durationDays, durationNights: tour.durationNights,
      priceAdult: tour.price?.adult || '', priceChild: tour.price?.child || '',
      priceSurcharge: tour.price?.surcharge || '',
      departureDate: tour.departureDate ? tour.departureDate.split('T')[0] : '',
      returnDate: tour.returnDate ? tour.returnDate.split('T')[0] : '',
      maxGuests: tour.maxGuests, status: tour.status,
      estimatedCost: tour.estimatedCost || '', actualCost: tour.actualCost || ''
    });
    setShowForm(true);
  };

  const confirm = useConfirm();

  const handleDelete = async (id) => {
    const tour = tours.find(t => t._id === id);
    const isConfirmed = await confirm({
      title: 'Xóa tour du lịch',
      message: `Bạn có chắc muốn xóa tour "${tour?.name || ''}" này không?`,
      confirmText: 'Xóa tour',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/tours/${id}`);
      loadTours();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setForm({
      code: '', name: '', destination: '', description: '',
      durationDays: 4, durationNights: 3,
      priceAdult: '', priceChild: '', priceSurcharge: '',
      departureDate: '', returnDate: '', maxGuests: 30, status: 'draft',
      estimatedCost: '', actualCost: ''
    });
  };

  if (loading) {
    return <div className="loading-overlay"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1><Map size={24} /> Quản Lý Tour</h1>
        <div className="page-header-actions">
          <Link to="/tour-operations" className="btn btn-secondary">
            <MapPin size={18} /> Điều hành chuyến
          </Link>
          {canCreateTour && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setEditingTour(null); setShowForm(true); }}>
              <Plus size={18} /> Tạo Tour
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="header-search" style={{ width: 250 }}>
          <Search size={18} />
          <input type="text" placeholder="Tìm tour..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control form-control-sm" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(tourStatusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
          Tổng: {pagination.total || tours.length} tour
        </span>
      </div>

      {/* Tour Grid */}
      <div className="grid-3 stagger-children">
        {tours.map(tour => (
          <div key={tour._id} className="card" style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
            {/* Tour Image Placeholder */}
            <div style={{
              height: 140,
              background: `linear-gradient(135deg, ${tour.status === 'active' ? '#0EA5E9' : '#64748B'}33, ${tour.status === 'active' ? '#8B5CF6' : '#334155'}33)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative'
            }}>
              <MapPin size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span className={`badge badge-${tourStatusMap[tour.status]?.color}`}>
                  {tourStatusMap[tour.status]?.label}
                </span>
              </div>
              <div style={{ position: 'absolute', top: 10, left: 10 }}>
                <span className="badge badge-ghost">{tour.code}</span>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>
                {tour.name}
              </h3>
              <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <MapPin size={14} /> {tour.destination}
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div className="text-xs text-secondary">
                  <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {tour.durationDays}N{tour.durationNights}Đ
                </div>
                <div className="text-xs text-secondary">
                  <Users size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {tour.currentGuests || 0}/{tour.maxGuests}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="text-lg font-bold" style={{ color: 'var(--secondary)' }}>
                    {formatCurrency(tour.price?.adult)}
                  </div>
                  <div className="text-xs text-muted">/người lớn</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setViewTour(tour)} title="Xem">
                    <Eye size={16} />
                  </button>
                  {(canEditTour || canDeleteTour) && (
                    <>
                      {canEditTour && (
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleEdit(tour)} title="Sửa">
                          <Edit size={16} />
                        </button>
                      )}
                      {canDeleteTour && (
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={() => handleDelete(tour._id)} title="Xóa"
                          style={{ color: 'var(--danger)' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tours.length === 0 && (
        <div className="empty-state">
          <Map size={48} />
          <h3>Chưa có tour nào</h3>
          <p>Tạo tour đầu tiên để bắt đầu</p>
        </div>
      )}

      {/* Tour Detail Modal */}
      {viewTour && (
        <div className="modal-overlay" onClick={() => setViewTour(null)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Map size={20} /> {viewTour.name}</h2>
              <button className="modal-close" onClick={() => setViewTour(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted mb-8">Mã tour</div>
                  <div className="font-semibold">{viewTour.code}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-8">Điểm đến</div>
                  <div className="font-semibold">{viewTour.destination}</div>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted mb-8">Thời gian</div>
                  <div>{viewTour.durationDays} ngày {viewTour.durationNights} đêm</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-8">Ngày khởi hành</div>
                  <div>{formatDate(viewTour.departureDate)}</div>
                </div>
              </div>
              <div className="form-row-3" style={{ marginBottom: 16 }}>
                <div>
                  <div className="text-xs text-muted mb-8">Giá người lớn</div>
                  <div className="font-bold" style={{ color: 'var(--secondary)' }}>{formatCurrency(viewTour.price?.adult)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-8">Giá trẻ em</div>
                  <div>{formatCurrency(viewTour.price?.child)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-8">Phụ thu</div>
                  <div>{formatCurrency(viewTour.price?.surcharge)}</div>
                </div>
              </div>

              {/* Financial Profit summary */}
              <div className="grid-3" style={{ marginBottom: 16, background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8 }}>
                <div>
                  <div className="text-xs text-muted">Doanh thu thực tế</div>
                  <div className="font-semibold text-success">{formatCurrency(viewTour.totalRevenue || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Chi phí vận hành</div>
                  <div className="font-semibold text-warning">{formatCurrency(viewTour.actualCost || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Lợi nhuận ròng</div>
                  <div className="font-bold" style={{ color: (viewTour.netProfit || 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                    {formatCurrency(viewTour.netProfit || 0)}
                  </div>
                </div>
              </div>

              {viewTour.description && (
                <div style={{ marginBottom: 16 }}>
                  <div className="text-xs text-muted mb-8">Mô tả</div>
                  <div className="text-sm">{viewTour.description}</div>
                </div>
              )}
              {viewTour.itinerary?.length > 0 && (
                <div>
                  <div className="text-xs text-muted mb-8">Lịch trình</div>
                  {viewTour.itinerary.map((day, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px', marginBottom: 8,
                      background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
                    }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                        Ngày {day.day}: {day.title}
                      </div>
                      <div className="text-sm text-secondary" style={{ marginTop: 4 }}>{day.description}</div>
                      {day.meals?.length > 0 && (
                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                          🍽️ {day.meals.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Tour Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingTour(null); }}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTour ? '✏️ Sửa Tour' : '➕ Tạo Tour Mới'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditingTour(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Mã tour *</label>
                    <input type="text" className="form-control" value={form.code}
                      onChange={e => setForm({...form, code: e.target.value})} required
                      disabled={!!editingTour} placeholder="VD: TOUR-DN-001" />
                  </div>
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select className="form-control" value={form.status}
                      onChange={e => setForm({...form, status: e.target.value})}>
                      {Object.entries(tourStatusMap).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tên tour *</label>
                  <input type="text" className="form-control" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Điểm đến *</label>
                  <input type="text" className="form-control" value={form.destination}
                    onChange={e => setForm({...form, destination: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <textarea className="form-control" value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})} rows={3} />
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Số ngày</label>
                    <input type="number" className="form-control" value={form.durationDays}
                      onChange={e => setForm({...form, durationDays: e.target.value})} min={1} />
                  </div>
                  <div className="form-group">
                    <label>Số đêm</label>
                    <input type="number" className="form-control" value={form.durationNights}
                      onChange={e => setForm({...form, durationNights: e.target.value})} min={0} />
                  </div>
                  <div className="form-group">
                    <label>Số khách tối đa</label>
                    <input type="number" className="form-control" value={form.maxGuests}
                      onChange={e => setForm({...form, maxGuests: e.target.value})} min={1} />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Giá người lớn (₫) *</label>
                    <input type="number" className="form-control" value={form.priceAdult}
                      onChange={e => setForm({...form, priceAdult: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Giá trẻ em (₫)</label>
                    <input type="number" className="form-control" value={form.priceChild}
                      onChange={e => setForm({...form, priceChild: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Phụ thu (₫)</label>
                    <input type="number" className="form-control" value={form.priceSurcharge}
                      onChange={e => setForm({...form, priceSurcharge: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ngày khởi hành</label>
                    <DatePickerVN value={form.departureDate}
                      onChange={e => setForm({...form, departureDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Ngày về</label>
                    <DatePickerVN value={form.returnDate}
                      onChange={e => setForm({...form, returnDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Dự toán chi phí Tour (₫)</label>
                    <input type="number" className="form-control" value={form.estimatedCost}
                      onChange={e => setForm({...form, estimatedCost: e.target.value})} placeholder="VD: 50000000" />
                  </div>
                  <div className="form-group">
                    <label>Chi phí thực tế vận hành (₫)</label>
                    <input type="number" className="form-control" value={form.actualCost}
                      onChange={e => setForm({...form, actualCost: e.target.value})} placeholder="VD: 48000000" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingTour(null); }}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingTour ? 'Cập Nhật' : 'Tạo Tour'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
