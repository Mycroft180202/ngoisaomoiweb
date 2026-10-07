import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export const supplierCategories = { vehicle: 'Xe', restaurant: 'Nhà hàng', hotel: 'Khách sạn', ticket: 'Vé', flight: 'Vé máy bay', insurance: 'Bảo hiểm', other: 'Khác' };
const empty = { name: '', category: 'hotel', contactName: '', phone: '', email: '', address: '', bankAccount: '', note: '', status: 'active' };
export default function SuppliersPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    try { setRows((await api.get('/tour-operations/suppliers')).suppliers); setError(''); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); }, []);
  const save = async event => {
    event.preventDefault(); setBusy(true);
    try {
      if (editing) await api.put(`/tour-operations/suppliers/${editing}`, form);
      else await api.post('/tour-operations/suppliers', form);
      setForm(empty); setEditing(''); await load(); toast.success('Đã lưu nhà cung cấp');
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };
  return <div className="fleet-layout">
    <section className="ops-panel"><h2>Danh mục nhà cung cấp</h2>{error && <p role="alert">{error}</p>}<div className="fleet-list">{rows.map(row => <div className="fleet-row" key={row._id}><div><b>{row.name}</b><small>{supplierCategories[row.category]} · {row.phone || 'Chưa có SĐT'} · {row.status === 'active' ? 'Hoạt động' : 'Tạm ngừng'}</small></div><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(row._id); setForm({ ...empty, ...row }); }}>Sửa</button></div>)}</div></section>
    <section className="ops-panel"><h2>{editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h2><form className="ops-form" onSubmit={save}>
      <label>Tên *<input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Dịch vụ<select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{Object.entries(supplierCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {[['contactName', 'Người liên hệ'], ['phone', 'Số điện thoại'], ['email', 'Email'], ['address', 'Địa chỉ'], ['bankAccount', 'Ngân hàng / tài khoản / chủ tài khoản'], ['note', 'Ghi chú hợp đồng']].map(([key, label]) => <label key={key}>{label}<input className="form-control" type={key === 'email' ? 'email' : 'text'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <label>Trạng thái<select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="active">Hoạt động</option><option value="inactive">Tạm ngừng</option></select></label>
      <div><button disabled={busy} className="btn btn-primary">{busy ? 'Đang lưu…' : 'Lưu nhà cung cấp'}</button> {editing && <button type="button" className="btn btn-secondary" onClick={() => { setEditing(''); setForm(empty); }}>Hủy sửa</button>}</div>
    </form></section>
  </div>;
}
