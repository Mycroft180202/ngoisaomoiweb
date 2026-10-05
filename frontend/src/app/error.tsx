"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to an error reporting service if needed
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at 50% 50%, #1e293b, #0f172a)",
      color: "white",
      fontFamily: "'Outfit', sans-serif",
      padding: "2rem",
      textAlign: "center"
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .error-title {
          font-size: 6rem;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(135deg, #ef4444, #b91c1c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 15px rgba(239,68,68,0.25));
          animation: float 4s ease-in-out infinite;
        }
        .error-circle {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 0;
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}} />
      
      <div className="error-circle" style={{ top: "35%", left: "40%" }} />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: "520px" }}>
        <h1 className="error-title">Lỗi</h1>
        
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "1rem 0", color: "#f8fafc" }}>
          Đã xảy ra sự cố hệ thống
        </h2>
        
        <p style={{ color: "#94a3b8", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "2.5rem" }}>
          Rất tiếc, đã có lỗi ngoài ý muốn xảy ra khi xử lý yêu cầu của bạn. Đội ngũ kỹ thuật của chúng tôi đã được thông báo.
        </p>
        
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              padding: "0.85rem 1.75rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.95rem",
              boxShadow: "0 10px 15px -3px rgba(239,68,68,0.3)",
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
          >
            🔄 Thử Lại
          </button>
          
          <Link href="/" style={{
            background: "rgba(255,255,255,0.06)",
            color: "#e2e8f0",
            padding: "0.85rem 1.75rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            Về Trang Chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
