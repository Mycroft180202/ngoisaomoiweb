"use client";

import { useCallback, useEffect, useState } from "react";
import { appToast } from "@/components/ui/AppDialogProvider";
import AdminDatePicker from "@/components/ui/AdminDatePicker";
import { formatDateVN } from "@/utils/date";
import TourFinanceConfig from "@/components/ui/TourFinanceConfig";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";
type Row = { id: string; code: string; tour?: { title?: string; name?: string }; startDate: string; status: string; revenue: number; cost: number; commission: number; partner_commission: number; own_commission: number; profit: number };
const money = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export default function TourReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, cost: 0, commission: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const response = await fetch(`${API}/tour-operations/finance-report?${query}`, { headers: { Authorization: `Bearer ${token || ""}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Không thể tải báo cáo");
      setRows(data.rows || []);
      setTotals(data.totals || { revenue: 0, cost: 0, commission: 0, profit: 0 });
    } catch (error: unknown) { appToast(error instanceof Error ? error.message : "Không thể tải báo cáo"); }
    finally { setLoading(false); }
  }, [from, to]);

  // Fetch external report data whenever the selected date range changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return <div className="admin-panel admin-report-page">
    <div className="admin-panel-header"><div><h3>📊 Báo cáo lợi nhuận tour</h3><p style={{ color: "var(--muted)" }}>Tổng hợp doanh thu, chi phí, hoa hồng và lợi nhuận theo từng lịch khởi hành.</p></div></div>
    <TourFinanceConfig onSaved={load} />
    <div className="admin-report-filters admin-tour-controls"><AdminDatePicker label="Từ ngày" value={from} onChange={setFrom} /><AdminDatePicker label="Đến ngày" value={to} onChange={setTo} /><div className="admin-report-actions"><button className="admin-btn-primary" type="button" onClick={load}>Lọc báo cáo</button><button className="btn-view-site" type="button" onClick={() => { setFrom(""); setTo(""); }}>Xóa lọc</button></div></div>
    <div className="admin-report-summary"><div className="surface-panel"><small>Doanh thu</small><h3>{money(totals.revenue)}</h3></div><div className="surface-panel"><small>Chi phí</small><h3>{money(totals.cost)}</h3></div><div className="surface-panel"><small>Hoa hồng</small><h3>{money(totals.commission)}</h3></div><div className="surface-panel"><small>Lợi nhuận</small><h3 className={totals.profit >= 0 ? "profit-positive" : "profit-negative"}>{money(totals.profit)}</h3></div></div>
    {loading ? <div className="admin-spinner" /> : <div className="admin-table-container"><table className="admin-table"><thead><tr><th>Chuyến</th><th>Tour</th><th>Ngày đi</th><th>Doanh thu</th><th>Chi phí</th><th>HH đối tác</th><th>HH bên mình</th><th>Tổng hoa hồng</th><th>Lợi nhuận</th><th>Trạng thái</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.tour?.title || row.tour?.name || "-"}</td><td>{formatDateVN(row.startDate)}</td><td>{money(row.revenue)}</td><td>{money(row.cost)}</td><td>{money(row.partner_commission)}</td><td>{money(row.own_commission)}</td><td>{money(row.commission)}</td><td className={row.profit >= 0 ? "profit-positive" : "profit-negative"}>{money(row.profit)}</td><td>{row.status}</td></tr>)}</tbody></table>{!rows.length && <p className="admin-empty-state">Chưa có dữ liệu tài chính trong khoảng thời gian này.</p>}</div>}
  </div>;
}

