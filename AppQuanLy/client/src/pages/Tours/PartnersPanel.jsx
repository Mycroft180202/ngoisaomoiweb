import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const empty = { code: '', name: '', contactName: '', phone: '', email: '', commissionPerDay: 160000, note: '', status: 'active', allowedTours: [] };

export default function PartnersPanel({ tours = [] }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState('');

  const load = async () => setRows((await api.get('/tour-operations/partners')).partners || []);
  useEffect(() => { load().catch(error => toast.error(error.message)); }, []);

  const save = async event => {
    event.preventDefault();
    try {
      const payload = { ...form, allowedTours: form.allowedTours || [] };
      if (editing) await api.put(`/tour-operations/partners/${editing}`, payload);
      else await api.post('/tour-operations/partners', payload);
      setEditing(''); setForm(empty); await load(); toast.success('Đã lưu đại lý/đối tác');
    } catch (error) { toast.error(error.message); }
  };

  const edit = row => setForm({ ...empty, ...row, allowedTours: (row.allowedTours || []).map(tour => tour._id || tour) });
  const toggleTour = tourId => setForm(current => ({ ...current, allowedTours: current.allowedTours.includes(tourId) ? current.allowedTours.filter(id => id !== tourId) : [...current.allowedTours, tourId] }));

  return <div className="fleet-layout">
    <section className="ops-panel">
      <h2>Đại lý/đối tác bán tour</h2>
      <p className="ops-form-note">Hoa hồng được tính theo số ngày tour × mức hoa hồng/ngày × số khách thuộc booking.</p>
      <div className="fleet-list">{rows.map(row => {
        const allowedCount = row.allowedTours?.length || 0;
        return <div className="fleet-row" key={row._id}><div><b>{row.code} · {row.name}</b><small>{row.contactName || 'Chưa có liên hệ'} · {Number(row.commissionPerDay || 0).toLocaleString('vi-VN')} đ/ngày/khách · {allowedCount ? `${allowedCount} tour được phép` : 'Tất cả tour'}</small></div><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(row._id); edit(row); }}>Sửa</button></div>;
      })}</div>
    </section>
    <section className="ops-panel">
      <h2>{editing ? 'Sửa đại lý/đối tác' : 'Thêm đại lý/đối tác'}</h2>
      <form className="ops-form" onSubmit={save}>
        {[['code', 'Mã đối tác'], ['name', 'Tên đối tác'], ['contactName', 'Người liên hệ'], ['phone', 'Số điện thoại'], ['email', 'Email'], ['note', 'Ghi chú']].map(([key, label]) => <label key={key}>{label}<input className="form-control" required={key === 'code' || key === 'name'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
        <label>Hoa hồng/ngày/khách<input className="form-control" type="number" min="0" value={form.commissionPerDay} onChange={event => setForm({ ...form, commissionPerDay: event.target.value })} /></label>
        <label>Trạng thái<select className="form-control" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="active">Hoạt động</option><option value="inactive">Tạm ngừng</option></select></label>
        <div><span className="ops-label">Tour được phép bán</span><p className="ops-form-note">Không chọn tour nào = được phép bán tất cả tour.</p><div className="vehicle-picker">{tours.map(tour => { const checked = form.allowedTours.includes(tour._id); return <button type="button" key={tour._id} className={checked ? 'selected' : ''} onClick={() => toggleTour(tour._id)}><span><b>{tour.code} · {tour.name}</b><small>{tour.destination || 'Chưa có điểm đến'}</small></span>{checked && <span className="vehicle-check">✓</span>}</button>; })}{!tours.length && <p className="text-muted text-sm">Chưa có tour để phân quyền.</p>}</div></div>
        <div><button className="btn btn-primary">Lưu đối tác</button>{editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(''); setForm(empty); }}>Hủy</button>}</div>
      </form>
    </section>
  </div>;
}
