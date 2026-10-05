import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, AtSign, CheckCircle2, ChevronRight, Cloud, Inbox,
  Info, Mail, Plus, RefreshCw, Save, ShieldCheck, Trash2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './EmailRouting.css';

const emptyForm = { id: '', name: '', localPart: '', destinationAddress: '', enabled: true };

export default function EmailRouting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [destinationEmail, setDestinationEmail] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setData(await api.get('/email-routing'));
      setLastUpdated(new Date());
    } catch (error) {
      if (!silent) toast.error(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const verifiedAddresses = useMemo(() => (data?.addresses || []).filter((item) => item.verified), [data]);
  const forwardingRules = useMemo(() => (data?.rules || []).filter((rule) =>
    rule.actions?.some((action) => action.type === 'forward')
  ), [data]);
  const activeRules = useMemo(() => forwardingRules.filter((rule) => rule.enabled), [forwardingRules]);
  const domain = data?.domain || 'newstartour.vn';
  const ready = verifiedAddresses.length > 0 && activeRules.length > 0;

  const addDestination = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const result = await api.post('/email-routing/destinations', { email: destinationEmail });
      toast.success(result.message);
      setDestinationEmail('');
      await load();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const submitRule = async (event) => {
    event.preventDefault();
    const payload = {
      name: form.name || `Chuyển tiếp ${form.localPart}`,
      customAddress: `${form.localPart.trim().toLowerCase()}@${domain}`,
      destinationAddress: form.destinationAddress,
      enabled: form.enabled
    };
    try {
      setSaving(true);
      const result = form.id
        ? await api.put(`/email-routing/rules/${form.id}`, payload)
        : await api.post('/email-routing/rules', payload);
      toast.success(result.message);
      setForm(emptyForm);
      await load();
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const editRule = (rule) => {
    const source = rule.matchers?.find((item) => item.field === 'to')?.value || '';
    const destination = rule.actions?.find((item) => item.type === 'forward')?.value?.[0] || '';
    setForm({ id: rule.id, name: rule.name || '', localPart: source.split('@')[0], destinationAddress: destination, enabled: rule.enabled !== false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeRule = async (rule) => {
    if (!window.confirm(`Xóa routing rule “${rule.name || rule.id}”?`)) return;
    try {
      const result = await api.delete(`/email-routing/rules/${rule.id}`);
      toast.success(result.message);
      await load();
    } catch (error) { toast.error(error.message); }
  };

  if (loading && !data) return <div className="email-routing-loading"><div className="loading-spinner" /></div>;

  return <div className="email-routing-page">
    <div className="page-header email-page-heading">
      <div className="email-title-wrap"><span className="email-title-icon"><Mail size={24} /></span><div><h1>Email Công Ty</h1><p>Tạo địa chỉ @{domain} và chuyển thư về Gmail hoặc Google Group.</p></div></div>
      <button className="btn btn-ghost" onClick={() => load()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Đồng bộ dữ liệu</button>
    </div>

    {!data?.configured ? <div className="email-setup-card">
      <Cloud size={42} /><div><h2>Chưa kết nối Cloudflare</h2><p>Thêm bốn biến sau vào file <code>AppQuanLy/server/.env</code>, sau đó restart server:</p>
      <pre>CLOUDFLARE_API_TOKEN=...{`\n`}CLOUDFLARE_ACCOUNT_ID=...{`\n`}CLOUDFLARE_ZONE_ID=...{`\n`}CLOUDFLARE_EMAIL_DOMAIN={domain}</pre>
      <p>API Token cần quyền <b>Email Routing Rules Read/Write</b> và <b>Email Routing Addresses Read/Write</b>. Token chỉ được lưu trên server.</p></div>
    </div> : <>
      <div className={`email-readiness ${ready ? 'is-ready' : 'needs-action'}`}>
        <div className="email-readiness-icon">{ready ? <ShieldCheck /> : <Info />}</div>
        <div><b>{ready ? 'Hệ thống chuyển tiếp đang hoạt động' : 'Cần hoàn tất cấu hình chuyển tiếp'}</b>
          <span>{ready ? `Email gửi đến @${domain} sẽ được chuyển theo các quy tắc bên dưới.` : 'Thêm email nhận, xác minh và tạo ít nhất một địa chỉ công ty.'}</span>
        </div>
        <span className="email-health-dot">{ready ? 'Sẵn sàng' : 'Cần thiết lập'}</span>
      </div>

      <div className="email-routing-stats">
        <div className="email-stat"><span className="email-stat-icon blue"><AtSign /></span><span><b>{activeRules.length}</b><small>Địa chỉ đang hoạt động</small></span></div>
        <div className="email-stat"><span className="email-stat-icon green"><CheckCircle2 /></span><span><b>{verifiedAddresses.length}</b><small>Hộp thư đã xác minh</small></span></div>
        <div className="email-stat"><span className="email-stat-icon purple"><Cloud /></span><span><b>Cloudflare</b><small>Nền tảng chuyển tiếp</small></span></div>
      </div>

      <section className="email-flow-card">
        <div className="email-section-heading"><div><span className="email-eyebrow">LUỒNG HOẠT ĐỘNG</span><h2>Email được chuyển như thế nào?</h2></div>
          <span className="email-secure"><ShieldCheck size={15} /> Không lưu nội dung thư</span></div>
        <div className="email-flow">
          <div className="email-flow-node"><span className="email-flow-icon source"><AtSign /></span><div><small>1. Khách hàng gửi đến</small><b>ten-phong-ban@{domain}</b></div></div>
          <ChevronRight className="email-flow-arrow" />
          <div className="email-flow-node"><span className="email-flow-icon route"><Cloud /></span><div><small>2. Cloudflare xử lý</small><b>Áp dụng routing rule</b></div></div>
          <ChevronRight className="email-flow-arrow" />
          <div className="email-flow-node"><span className="email-flow-icon inbox"><Inbox /></span><div><small>3. Nhân viên nhận tại</small><b>Gmail / Google Group</b></div></div>
        </div>
      </section>

      <div className="email-workspace">
        <section className="email-panel email-destination-panel">
          <div className="email-destination-heading">
            <div className="email-step-title"><span>1</span><div><h2>Thêm hộp thư nhận</h2><p>Email cá nhân hoặc Google Group sẽ nhận thư chuyển tiếp.</p></div></div>
            <div className="email-live-status" title="Tự động kiểm tra Cloudflare mỗi 10 giây"><i /><span>Realtime</span><small>{lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Đang kết nối'}</small></div>
          </div>
          <form className="destination-form" onSubmit={addDestination}><input type="email" required value={destinationEmail} onChange={(e) => setDestinationEmail(e.target.value)} placeholder="vidu@gmail.com" /><button className="btn btn-primary" disabled={saving}><Plus size={16} /> Thêm email</button></form>
          <div className="destination-list">{(data.addresses || []).map((item) => <div key={item.id}><span className="destination-address"><Inbox size={16} /> {item.email}</span>{item.verified ? <b className="verified"><CheckCircle2 size={15} /> Đã xác minh</b> : <b className="pending"><XCircle size={15} /> Kiểm tra hộp thư</b>}</div>)}
            {!data.addresses?.length && <div className="email-inline-empty">Chưa có hộp thư nhận.</div>}
          </div>
          <div className="email-tip"><Info size={15} /><span>Cloudflare sẽ gửi email xác minh. Chỉ email đã xác minh mới có thể nhận thư.</span></div>
        </section>

        <section className={`email-panel email-rule-form ${form.id ? 'is-editing' : ''}`}>
          <div className="email-step-title"><span>2</span><div><h2>{form.id ? 'Chỉnh sửa địa chỉ công ty' : 'Tạo địa chỉ công ty'}</h2><p>Chọn tên địa chỉ và hộp thư sẽ nhận email.</p></div></div>
          <form onSubmit={submitRule} className="email-form">
            <label>Tên gợi nhớ <span className="email-optional">(không bắt buộc)</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Phòng Kinh doanh" /></label>
            <label>Địa chỉ email công ty<div className="email-local-input"><input required pattern="[a-zA-Z0-9._-]+" value={form.localPart} onChange={(e) => setForm({ ...form, localPart: e.target.value })} placeholder="sale" /><span>@{domain}</span></div></label>
            <div className="email-route-preview"><span>{form.localPart || 'ten-dia-chi'}@{domain}</span><ArrowRight size={17} /><span>{form.destinationAddress || 'Chọn hộp thư nhận'}</span></div>
            <label>Hộp thư nhận<select required value={form.destinationAddress} onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}>
              <option value="">Chọn email/Google Group đã xác minh</option>
              {verifiedAddresses.map((item) => <option value={item.email} key={item.id}>{item.email}</option>)}
            </select></label>
            <label className="email-checkbox"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /><span><b>Kích hoạt ngay</b><small>Có thể tắt hoặc chỉnh sửa sau.</small></span></label>
            <div className="email-form-actions"><button className="btn btn-primary" disabled={saving || !verifiedAddresses.length}><Save size={16} /> {form.id ? 'Lưu thay đổi' : 'Tạo địa chỉ'}</button>
            {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(emptyForm)}>Hủy chỉnh sửa</button>}</div>
            {!verifiedAddresses.length && <small className="email-warning">Cần thêm và xác minh ít nhất một email đích trước.</small>}
          </form>
        </section>
      </div>

      <section className="email-panel email-rules-panel"><div className="email-step-title"><span>3</span><div><h2>Các địa chỉ Email Công Ty</h2><p>Danh sách địa chỉ và nơi nhận thư tương ứng.</p></div></div>
        <div className="data-table-wrapper"><table className="data-table"><thead><tr><th>Địa chỉ công ty</th><th>Chuyển đến</th><th>Tên rule</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{forwardingRules.map((rule) => {
          const source = rule.matchers?.find((item) => item.field === 'to')?.value || 'Catch-all';
          const destination = rule.actions?.find((item) => item.type === 'forward')?.value?.[0] || rule.actions?.[0]?.type || '—';
          return <tr key={rule.id}><td><b className="company-email"><AtSign size={15} />{source}</b></td><td><span className="routing-destination"><ArrowRight size={15} />{destination}</span></td><td>{rule.name || '—'}</td><td><span className={`email-status ${rule.enabled ? 'on' : 'off'}`}><i />{rule.enabled ? 'Đang hoạt động' : 'Đã tắt'}</span></td><td><div className="email-row-actions"><button onClick={() => editRule(rule)}>Chỉnh sửa</button><button title="Xóa địa chỉ" className="danger" onClick={() => removeRule(rule)}><Trash2 size={15} /></button></div></td></tr>;
        })}{!forwardingRules.length && <tr><td colSpan="5" className="email-empty"><AtSign size={24} /><b>Chưa có địa chỉ công ty</b><span>Hoàn thành bước 1 và 2 để bắt đầu nhận thư.</span></td></tr>}</tbody></table></div>
        <div className="email-group-note"><Info size={16} /><span>Cần chuyển đến nhiều người? Hãy dùng một địa chỉ <b>Google Group</b> làm hộp thư nhận.</span></div>
      </section>
    </>}
  </div>;
}
