"use client";

import Link from "next/link";

export default function NotFound() {
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
          50% { transform: translateY(-12px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
        .error-title {
          font-size: 7rem;
          font-weight: 900;
          margin: 0;
          background: linear-gradient(135deg, #38bdf8, #0369a1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 15px rgba(56,189,248,0.25));
          animation: float 5s ease-in-out infinite;
        }
        .error-circle {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 0;
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}} />
      
      <div className="error-circle" style={{ top: "35%", left: "40%" }} />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: "500px" }}>
        <h1 className="error-title">404</h1>
        
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "1rem 0", color: "#f8fafc" }}>
          Không tìm thấy trang
        </h2>
        
        <p style={{ color: "#94a3b8", lineHeight: 1.6, fontSize: "1rem", marginBottom: "2.5rem" }}>
          Có vẻ như đường dẫn bạn đang truy cập không tồn tại hoặc đã được chuyển đi nơi khác. Hãy để chúng tôi đưa bạn trở lại hành trình.
        </p>
        
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link href="/" style={{
            background: "linear-gradient(135deg, #0284c7, #0369a1)",
            color: "white",
            padding: "0.85rem 1.75rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "0.95rem",
            boxShadow: "0 10px 15px -3px rgba(3,105,161,0.3)",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
          >
            Về Trang Chủ
          </Link>
          
          <Link href="/tours" style={{
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
            Xem Các Tour
          </Link>
        </div>
      </div>
    </main>
  );
}
