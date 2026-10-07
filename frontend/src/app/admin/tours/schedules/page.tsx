"use client";

import { FormEvent, useEffect, useState } from "react";
import { appToast } from "@/components/ui/AppDialogProvider";
import AdminDatePicker from "@/components/ui/AdminDatePicker";
import { formatDateVN } from "@/utils/date";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";
type Tour = { id: number; title: string; tour_code?: string };
type Schedule = { id: number; tour_id: number; departure_date: string; max_capacity: number; booked_seats: number; actual_cost?: number | null; status: "active" | "locked" | "cancelled"; departure_code?: string };

export default function TourSchedulesPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [rows, setRows] = useState<Schedule[]>([]);
  const [tourId, setTourId] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [actualCost, setActualCost] = useState<number | "">("");
  const [status, setStatus] = useState<Schedule["status"]>("active");
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}` });
  const load = async () => {
    setLoading(true);
    try {
      const [tourResponse, scheduleResponse] = await Promise.all([
        fetch(`${API}/tours/?limit=500&include_inactive=true`, { headers: headers() }),
        fetch(`${API}/tour-schedules/?limit=500`, { headers: headers() }),
      ]);
      if (!tourResponse.ok || !scheduleResponse.ok) throw new Error("Không thể tải lịch khởi hành");
      setTours(await tourResponse.json());
      setRows(await scheduleResponse.json());
    } catch (error: any) { appToast(error.message || "Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setTourId(""); setDate(""); setCapacity(""); setActualCost(""); setStatus("active"); };
  const edit = (row: Schedule) => { setEditing(row); setTourId(String(row.tour_id)); setDate(row.departure_date); setCapacity(row.max_capacity); setActualCost(row.actual_cost ?? ""); setStatus(row.status); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!tourId || !date || !capacity || capacity < 1) return appToast("Vui lòng nhập tour, ngày và sức chứa hợp lệ");
    const url = editing ? `${API}/tour-schedules/${editing.id}` : `${API}/tour-schedules/`;
    const response = await fetch(url, { method: editing ? "PUT" : "POST", headers: headers(), body: JSON.stringify({ tour_id: Number(tourId), departure_date: date, max_capacity: Number(capacity), actual_cost: actualCost === "" ? null : Number(actualCost), status }) });
    const data = await response.json();
    if (!response.ok) return appToast(data.detail || "Không thể lưu lịch khởi hành");
    appToast(editing ? "Đã cập nhật lịch khởi hành" : "Đã tạo lịch khởi hành"); reset(); load();
  };
  const remove = async (row: Schedule) => {
    if (!window.confirm(`Xóa lịch ${row.departure_code || row.departure_date}?`)) return;
    const response = await fetch(`${API}/tour-schedules/${row.id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) return appToast("Không thể xóa lịch đã có booking");
    load();
  };
  const tourName = (id: number) => tours.find(item => item.id === id)?.title || `Tour #${id}`;

  return <div className="admin-panel admin-schedules-page">
    <div className="admin-panel-header"><div><h3>📅 Lịch khởi hành & sức chứa</h3><p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>Cấu hình sức chứa riêng cho từng ngày, không dùng một mức 30 khách cho mọi tour.</p></div></div>
    <form onSubmit={submit} className="auth-form admin-schedule-form">
      <label>Tour<select value={tourId} onChange={e => setTourId(e.target.value)} required><option value="">Chọn tour</option>{tours.map(tour => <option key={tour.id} value={tour.id}>{tour.tour_code ? `${tour.tour_code} · ` : ""}{tour.title}</option>)}</select></label>
      <AdminDatePicker label="Ngày khởi hành" value={date} onChange={setDate} required />
      <label>Sức chứa<input type="number" min="1" max="5000" value={capacity} onChange={e => setCapacity(Number(e.target.value))} required /></label>
      <label>Chi phí thực tế (đ)<input type="number" min="0" value={actualCost} onChange={e => setActualCost(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Tùy chọn" /></label>
      <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value as Schedule["status"])}><option value="active">Đang mở</option><option value="locked">Đã khóa</option><option value="cancelled">Đã hủy</option></select></label>
      <div className="admin-schedule-actions"><button className="admin-btn-primary" type="submit">{editing ? "Lưu" : "Tạo lịch"}</button>{editing && <button className="btn-view-site" type="button" onClick={reset}>Hủy</button>}</div>
    </form>
    {loading ? <div className="admin-spinner" /> : <div className="admin-table-container"><table className="admin-table"><thead><tr><th>Mã</th><th>Tour</th><th>Ngày</th><th>Sức chứa</th><th>Đã đặt</th><th>Còn lại</th><th>Trạng thái</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.departure_code || `#${row.id}`}</strong></td><td>{tourName(row.tour_id)}</td><td>{formatDateVN(row.departure_date)}</td><td><strong>{row.max_capacity}</strong></td><td>{row.booked_seats}</td><td>{Math.max(0, row.max_capacity - row.booked_seats)}</td><td>{row.status === "active" ? "Đang mở" : row.status === "locked" ? "Đã khóa" : "Đã hủy"}</td><td><button type="button" className="btn-action" onClick={() => edit(row)}>✏️</button><button type="button" className="btn-action btn-delete" onClick={() => remove(row)}>✕</button></td></tr>)}</tbody></table>{!rows.length && <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>Chưa có lịch khởi hành.</p>}</div>}
  </div>;
}
