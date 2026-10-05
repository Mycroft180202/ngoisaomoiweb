"use client";

import { useEffect, useState } from "react";

export default function MaintenanceManager() {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("Website đang được bảo trì");
  const [message, setMessage] = useState("Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau ít phút.");
  const [expectedEnd, setExpectedEnd] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/settings/cms_maintenance")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const rawValue = data?.value;
        const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        if (value) {
          setEnabled(Boolean(value.enabled));
          setTitle(value.title || title);
          setMessage(value.message || message);
          setExpectedEnd(value.expected_end || "");
          setContactEmail(value.contact_email || "");
        }
      }).finally(() => setLoading(false));
  // Defaults intentionally loaded once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return setNotice("Phiên đăng nhập đã hết hạn.");
    setSaving(true);
    setNotice("");
    const value = { enabled, title, message, expected_end: expectedEnd || null, contact_email: contactEmail || null };
    try {
      const res = await fetch("http://localhost:8000/api/settings/cms_maintenance/json", {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(value)
      });
      if (!res.ok) throw new Error("Không thể lưu cấu hình bảo trì. Chức năng này yêu cầu quyền Super Admin.");
      setNotice(enabled ? "Đã bật chế độ bảo trì cho người dùng." : "Đã tắt chế độ bảo trì.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Có lỗi xảy ra."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;
  return (
    <div className="admin-panel" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="admin-panel-header"><h3>🚧 Chế độ bảo trì</h3></div>
      {notice && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{notice}</div>}
      <form onSubmit={save} className="auth-form">
        <div style={{ padding: "1rem", borderRadius: ".75rem", background: enabled ? "#fff7ed" : "#f0fdf4", border: `1px solid ${enabled ? "#fed7aa" : "#bbf7d0"}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: ".75rem", margin: 0, cursor: "pointer" }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ width: "auto" }} />
            <strong>{enabled ? "Đang bật — khách truy cập chỉ thấy trang bảo trì" : "Đang tắt — website hoạt động bình thường"}</strong>
          </label>
        </div>
        <div className="form-group"><label>Tiêu đề</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="form-group"><label>Nội dung thông báo</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required /></div>
        <div className="form-group"><label>Thời gian dự kiến hoàn tất (nội dung hiển thị)</label><input value={expectedEnd} onChange={(e) => setExpectedEnd(e.target.value)} placeholder="Ví dụ: 09:00 ngày 20/07/2026" /></div>
        <div className="form-group"><label>Email hỗ trợ</label><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="support@example.com" /></div>
        <button className="admin-btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu cấu hình bảo trì"}</button>
      </form>
    </div>
  );
}
