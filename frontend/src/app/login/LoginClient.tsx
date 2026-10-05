"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SocialLogin from "@/components/ui/SocialLogin";

export default function LoginClient({ adminOnly = false }: { adminOnly?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Create urlencoded body for OAuth2 Password flow
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
      }

      let verifiedUser: any = null;
      if (adminOnly) {
        const verifyResponse = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        verifiedUser = verifyResponse.ok ? await verifyResponse.json() : null;
        if (!verifiedUser?.is_admin) {
          throw new Error("Tài khoản này không có quyền truy cập trang quản trị.");
        }
      }

      setSuccess(adminOnly ? "Xác thực quản trị thành công! Đang chuyển hướng..." : "Đăng nhập thành công! Đang chuyển hướng...");

      localStorage.setItem("admin_token", data.access_token);
      localStorage.setItem("admin_email", email);
      
      // Dispatch custom event to notify Header component immediately
      window.dispatchEvent(new Event("auth-state-change"));

      setTimeout(() => {
        router.push(adminOnly && verifiedUser?.must_change_password ? "/admin/change-password" : adminOnly ? "/admin" : "/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-overlay"></div>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{adminOnly ? "Đăng nhập quản trị" : "Đăng nhập"}</h2>
            <p>{adminOnly ? "Cổng truy cập dành riêng cho quản trị viên New Star Tour" : "Đăng nhập tài khoản của bạn để đặt tour và trải nghiệm dịch vụ"}</p>
          </div>

          {error && <div className="auth-message error">{error}</div>}
          {success && <div className="auth-message success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Tên đăng nhập hoặc Email</label>
              <input
                type="text"
                id="email"
                placeholder="Nhathn hoặc email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? "Đang xác thực..." : adminOnly ? "Vào trang quản trị" : "Đăng nhập"}
            </button>
          </form>

          {!adminOnly && (
            <>
              <SocialLogin onSuccess={(msg) => setSuccess(msg)} onError={(msg) => setError(msg)} />
              <div className="auth-footer">
                <p>Chưa có tài khoản? <Link href="/register" className="auth-link">Đăng ký ngay</Link></p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
