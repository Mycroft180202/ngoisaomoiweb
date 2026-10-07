import { useEffect, useState } from 'react';
import api from '../../services/api';

const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
export default function FinanceReportPanel() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [report, setReport] = useState({ rows: [], totals: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async (filters = range) => {
    if (filters.from && filters.to && filters.from > filters.to) return setError('Ngày kết thúc phải sau ngày bắt đầu');
    setBusy(true); setError('');
    try { setReport(await api.get('/tour-operations/finance-report', filters)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load({ from: '', to: '' }); }, []);
  return <section className="ops-panel"><h2>Báo cáo tài chính theo chuyến</h2>
    <form className="ops-form" onSubmit={e => { e.preventDefault(); load(); }}><div className="form-row"><label>Từ ngày<input className="form-control" type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></label><label>Đến ngày<input className="form-control" type="date" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></label></div><div><button disabled={busy} className="btn btn-primary">Lọc báo cáo</button> <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setRange({ from: '', to: '' }); load({ from: '', to: '' }); }}>Xóa lọc</button></div></form>
    {error && <p role="alert">{error}</p>}{busy ? <p>Đang tải báo cáo…</p> : <><div className="finance-summary">{[['revenue', 'Doanh thu xác nhận'], ['cost', 'Chi phí dự toán và thực tế'], ['profit', 'Lợi nhuận tạm tính']].map(([key, label]) => <div key={key}><small>{label}</small><b>{money(report.totals[key])}</b></div>)}</div><div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Chuyến</th><th>Tour</th><th>Ngày đi</th><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận</th></tr></thead><tbody>{report.rows.map(row => <tr key={row._id}><td>{row.code}</td><td>{row.tour?.name}</td><td>{new Date(row.startDate).toLocaleDateString('vi-VN')}</td><td>{money(row.revenue)}</td><td>{money(row.cost)}</td><td>{money(row.profit)}</td></tr>)}</tbody></table>{!report.rows.length && <p>Chưa có chuyến trong khoảng ngày này.</p>}</div></>}
  </section>;
}
