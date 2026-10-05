"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function GoogleCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState("Đang xác thực tài khoản Google của bạn...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processAuth = async () => {
      // Extract access_token from hash fragment
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const errorMsg = params.get("error");
      const state = params.get("state");
      const savedState = sessionStorage.getItem("google_auth_state");

      if (errorMsg) {
        setError(`Lỗi xác thực từ Google: ${errorMsg}`);
        return;
      }

      // CSRF protection check
      if (!state || state !== savedState) {
        setError("Yêu cầu xác thực không hợp lệ (Lỗi bảo mật CSRF). Vui lòng thử đăng nhập lại.");
        return;
      }

      // Cleanup
      sessionStorage.removeItem("google_auth_state");

      if (!accessToken) {
        setError("Không tìm thấy Access Token xác thực từ Google.");
        return;
      }

      try {
        const currentToken = localStorage.getItem("admin_token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (currentToken) {
          headers["Authorization"] = `Bearer ${currentToken}`;
        }

        const res = await fetch("http://localhost:8000/api/auth/google", {
          method: "POST",
          headers,
          body: JSON.stringify({ access_token: accessToken }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Xác thực với Google thất bại.");
        }

        // If we were linking, we stay logged in but may want to show success on profile
        if (currentToken) {
          setStatus("Liên kết tài khoản Google thành công! Đang quay lại hồ sơ...");
          setTimeout(() => {
            router.push("/profile");
          }, 1500);
        } else {
          // If we were logging in, store token
          localStorage.setItem("admin_token", data.access_token);
          
          // Fetch user info to get email
          const meRes = await fetch("http://localhost:8000/api/auth/me", {
            headers: { Authorization: `Bearer ${data.access_token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            localStorage.setItem("admin_email", meData.email);
            if (meData.avatar_url) {
              localStorage.setItem("admin_avatar_url", meData.avatar_url);
            }
            if (meData.full_name) {
              localStorage.setItem("admin_name", meData.full_name);
            }
          }

          // Dispatch event to update Header
          window.dispatchEvent(new Event("auth-state-change"));
          setStatus("Đăng nhập bằng Google thành công! Đang chuyển hướng...");
          setTimeout(() => {
            router.push("/");
          }, 1500);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Đã xảy ra lỗi trong quá trình đăng nhập Google.");
      }
    };

    processAuth();
  }, [router]);

  return (
    <div className="auth-callback-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "2rem", textAlign: "center" }}>
      <div className="surface-panel" style={{ padding: "3rem", borderRadius: "1rem", maxWidth: "480px", width: "100%", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
        {error ? (
          <div className="auth-callback-error">
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>❌</span>
            <h3 style={{ color: "var(--public-error-text, #ef4444)", marginBottom: "1rem", fontWeight: 700 }}>Xác thực thất bại</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="button button-primary"
              style={{ width: "100%" }}
            >
              Quay lại trang Đăng nhập
            </button>
          </div>
        ) : (
          <div>
            <div className="admin-spinner" style={{ margin: "0 auto 1.5rem" }}></div>
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Đang xử lý</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
        <div className="admin-spinner"></div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
