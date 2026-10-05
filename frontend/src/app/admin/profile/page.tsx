"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string;
  is_active: boolean;
}

export default function AdminProfile() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_email");
        window.location.href = "/admin-login";
        return;
      }
      if (!res.ok) throw new Error("Không thể tải thông tin hồ sơ.");
      const data = await res.json();
      setUser(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không trùng khớp.");
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setUpdating(true);
    try {
      const payload: any = {
        email,
        full_name: fullName,
      };

      if (password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch("http://localhost:8000/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Không thể cập nhật hồ sơ.");
      }

      setSuccess("Cập nhật thông tin hồ sơ thành công!");
      setUser(data);
      // Sync localstorage email
      localStorage.setItem("admin_email", data.email);
      window.dispatchEvent(new Event("auth-state-change"));
      
      // Reset password inputs
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gặp lỗi khi cập nhật hồ sơ.");
    } finally {
      setUpdating(false);
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
    <div className="admin-panel" style={{ maxWidth: "680px", margin: "0 auto" }}>
      <div className="admin-panel-header">
        <h3>👤 Quản lý thông tin hồ sơ cá nhân</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <form onSubmit={handleUpdateProfile} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Basic Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", color: "#0f172a" }}>📄 Thông tin cơ bản</h4>
          
          <div className="form-group">
            <label htmlFor="adminName">Họ và tên</label>
            <input
              type="text"
              id="adminName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên đầy đủ..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminEmail">Địa chỉ Email</label>
            <input
              type="email"
              id="adminEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
        </div>

        {/* Change Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", color: "#0f172a" }}>🔒 Đổi mật khẩu tài khoản</h4>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "-0.5rem" }}>
            * Bỏ trống nếu bạn không muốn thay đổi mật khẩu hiện tại.
          </p>

          <div className="form-group">
            <label htmlFor="adminPwd">Mật khẩu mới</label>
            <input
              type="password"
              id="adminPwd"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminConfirmPwd">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              id="adminConfirmPwd"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </div>
        </div>

        {user && (
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
            Hệ thống quản trị hoạt động từ: {new Date(user.created_at).toLocaleDateString("vi-VN")}
          </div>
        )}

        <button
          type="submit"
          className="admin-btn-primary"
          style={{ width: "100%", padding: "0.9rem", marginTop: "1rem" }}
          disabled={updating}
        >
          {updating ? "Đang lưu thay đổi..." : "Lưu cập nhật hồ sơ"}
        </button>
      </form>
    </div>
  );
}
