"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Duration {
  id: number;
  name: string;
  days: number;
  nights: number;
}

export default function DurationsAdmin() {
  const [durations, setDurations] = useState<Duration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [days, setDays] = useState(1);
  const [nights, setNights] = useState(0);

  useEffect(() => {
    fetchDurations();
  }, []);

  const fetchDurations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/durations/");
      if (!res.ok) throw new Error("Không thể tải danh sách thời lượng tour.");
      const data = await res.json();
      setDurations(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName("");
    setDays(1);
    setNights(0);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Duration) => {
    setEditId(item.id);
    setName(item.name);
    setDays(item.days);
    setNights(item.nights);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa mốc thời gian này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/durations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDurations(durations.filter(d => d.id !== id));
      } else {
        appToast("Xóa thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const payload = { name, days: Number(days), nights: Number(nights) };
    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/durations/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/durations/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsFormOpen(false);
        fetchDurations();
      } else {
        const errData = await res.json();
        appToast(errData.detail || "Lưu thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Gặp lỗi khi lưu.");
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>⏱️ Quản lý Thời gian tour</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Thêm thời gian mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa thời gian" : "➕ Thêm thời gian mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="durationName">Tên hiển thị</label>
            <input type="text" id="durationName" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ví dụ: 3 ngày 2 đêm, Trong ngày..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="durationDays">Số ngày</label>
              <input type="number" id="durationDays" value={days} onChange={(e) => setDays(Number(e.target.value))} required min={0} />
            </div>

            <div className="form-group">
              <label htmlFor="durationNights">Số đêm</label>
              <input type="number" id="durationNights" value={nights} onChange={(e) => setNights(Number(e.target.value))} required min={0} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit" className="admin-btn-primary" style={{ flex: 1, justifyContent: "center" }}>Lưu thay đổi</button>
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-view-site" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          </div>
        </form>
      ) : (
        <>
          {error && <div className="auth-message error">{error}</div>}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><div className="admin-spinner"></div></div>
          ) : durations.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có mốc thời gian nào được thiết lập.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên hiển thị</th>
                    <th>Số ngày</th>
                    <th>Số đêm</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {durations.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.days} ngày</td>
                      <td>{item.nights} đêm</td>
                      <td>
                        <button onClick={() => handleOpenEdit(item)} className="btn-action" title="Sửa">✏️</button>
                        <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete" title="Xóa">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
