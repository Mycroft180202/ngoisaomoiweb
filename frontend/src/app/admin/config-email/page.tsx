"use client";

import { useEffect, useState } from "react";

interface EmailConfig {
  smtp_server: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  sender_name: string;
  use_ssl: boolean;
}

export default function ConfigEmailPage() {
  const [smtpServer, setSmtpServer] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [senderName, setSenderName] = useState("");
  const [useSsl, setUseSsl] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/settings/config_email");
      if (!res.ok) {
        if (res.status === 404) {
          // Setting not seeded yet, use defaults
          setLoading(false);
          return;
        }
        throw new Error("Không thể tải cấu hình email.");
      }
      const data = await res.json();
      if (data && data.value) {
        const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setSmtpServer(val.smtp_server || "");
        setSmtpPort(val.smtp_port || 587);
        setSmtpUser(val.smtp_user || "");
        setSmtpPass(val.smtp_pass || "");
        setSenderName(val.sender_name || "");
        setUseSsl(val.use_ssl || false);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setSaving(false);
      return;
    }

    const payload: EmailConfig = {
      smtp_server: smtpServer,
      smtp_port: Number(smtpPort),
      smtp_user: smtpUser,
      smtp_pass: smtpPass,
      sender_name: senderName,
      use_ssl: useSsl
    };

    try {
      const res = await fetch(
        `http://localhost:8000/api/settings/config_email?value=${encodeURIComponent(JSON.stringify(payload))}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình email thất bại.");
      setSuccess("Cấu hình email đã được cập nhật thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="admin-panel-header">
        <h3>📧 Cấu hình email hệ thống</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <form onSubmit={handleSave} className="auth-form">
        <div className="form-group">
          <label>Máy chủ SMTP (SMTP Host)</label>
          <input type="text" value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} placeholder="Ví dụ: smtp.gmail.com" required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label>Cổng SMTP (Port)</label>
            <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} placeholder="587 hoặc 465" required />
          </div>
          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.8rem" }}>
            <input type="checkbox" id="useSslCheck" checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} style={{ width: "auto" }} />
            <label htmlFor="useSslCheck" style={{ marginBottom: 0 }}>Sử dụng SSL (Cổng 465)</label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label>Tài khoản email (Username)</label>
            <input type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="Ví dụ: hotro@startour.vn" required />
          </div>
          <div className="form-group">
            <label>Mật khẩu ứng dụng (Password)</label>
            <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="Mật khẩu 16 chữ số" required />
          </div>
        </div>

        <div className="form-group">
          <label>Tên người gửi (Sender name)</label>
          <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Ví dụ: Du lịch StarTour" required />
        </div>

        <button type="submit" className="admin-btn-primary" style={{ width: "100%", padding: "0.9rem", marginTop: "1rem" }} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </form>
    </div>
  );
}
