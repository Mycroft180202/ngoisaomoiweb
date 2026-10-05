"use client";

interface SocialLoginProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function SocialLogin({ onSuccess, onError }: SocialLoginProps) {
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes("your-google-client-id")) {
      onError("Google Client ID chưa được cấu hình. Vui lòng cập nhật trong file .env.local!");
      return;
    }
    const redirectUri = window.location.origin + "/auth/callback/google";
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("google_auth_state", state);
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent("openid profile email")}&state=${state}`;
    window.location.href = googleUrl;
  };

  return (
    <>
      <div className="social-auth-divider">
        <span>Hoặc đăng nhập bằng</span>
      </div>

      <div className="social-auth-buttons">
        <button
          type="button"
          className="btn-social google"
          onClick={handleGoogleLogin}
          style={{ width: "100%" }}
        >
          <svg className="social-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.08-.2-.15-.42-.2-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Đăng nhập bằng Google
        </button>
      </div>

      <style jsx global>{`
        .social-auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.5rem 0;
          color: var(--text-light, #6b7280);
          font-size: 0.85rem;
        }
        .social-auth-divider::before,
        .social-auth-divider::after {
          content: "";
          flex: 1;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }
        .social-auth-divider span {
          padding: 0 10px;
        }
        .social-auth-buttons {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .btn-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: white;
          color: var(--text-dark, #1f2937);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }
        .btn-social:hover {
          background: var(--bg-hover, #f9fafb);
          border-color: #d1d5db;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .social-icon {
          flex-shrink: 0;
        }
      `}</style>
    </>
  );
}
