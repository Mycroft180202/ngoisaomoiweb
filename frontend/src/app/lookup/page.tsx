"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCms } from "@/components/cms/CmsProvider";

interface BookingResult {
  id: number;
  tour_title: string;
  full_name: string;
  email: string;
  phone: string;
  departure_date: string;
  guests_count: number;
  status: string;
  payment_status: string;
  total_amount?: number;
  secure_token?: string;
}

export default function BookingLookupPage() {
  const router = useRouter();
  const { config } = useCms();
  const [bookingId, setBookingId] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const cleanBookingId = parseInt(bookingId.replace(/#/g, "").trim());
    if (isNaN(cleanBookingId)) {
      setError("Mã đơn hàng phải là số hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/bookings/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: cleanBookingId,
          email_or_phone: emailOrPhone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Không tìm thấy thông tin đơn hàng khớp với yêu cầu.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <main className="auth-page" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="auth-overlay"></div>
      <div className="auth-container" style={{ width: "100%", maxWidth: "600px", zIndex: 10 }}>
        <div className="auth-card" style={{ padding: "2.5rem", borderRadius: "1.5rem", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)" }}>
          <div className="auth-header" style={{ marginBottom: "2rem", textAlign: "center" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
              Tra cứu đơn đặt tour
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Nhập mã đơn hàng và Email/Số điện thoại để kiểm tra trạng thái và tiếp tục thanh toán.
            </p>
          </div>

          {error && (
            <div className="auth-message error" style={{ padding: "1rem", borderRadius: "0.75rem", background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              ⚠️ {error}
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSubmit} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label htmlFor="bookingId" style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1c1e" }}>Mã đơn hàng (Booking ID) *</label>
                <input
                  type="text"
                  id="bookingId"
                  placeholder="Ví dụ: 12 hoặc #12"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="emailOrPhone" style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1c1e" }}>Email hoặc Số điện thoại *</label>
                <input
                  type="text"
                  id="emailOrPhone"
                  placeholder="Nhập Email hoặc SĐT đã dùng khi đặt tour"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1" }}
                />
              </div>

              <button type="submit" className="btn-auth-submit" disabled={loading} style={{ width: "100%", padding: "0.85rem", borderRadius: "0.75rem", fontWeight: 700, background: "var(--primary)", color: "white", cursor: "pointer", border: "none", marginTop: "0.5rem" }}>
                {loading ? "Đang tìm kiếm..." : "Tra cứu đơn hàng"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{
                background: "var(--accent-soft)",
                padding: "1.25rem 1.5rem",
                borderRadius: "1rem",
                border: "1px solid var(--accent-light)",
                fontSize: "0.95rem",
                color: "#334155",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>
                  Thông tin đơn đặt: #{result.id}
                </h4>
                <div>📍 <strong>Tour đặt:</strong> {result.tour_title}</div>
                <div>👤 <strong>Khách hàng:</strong> {result.full_name}</div>
                <div>📅 <strong>Ngày đi:</strong> {formatDate(result.departure_date)}</div>
                <div>👥 <strong>Số khách:</strong> {result.guests_count} người</div>
                {result.total_amount && (
                  <div>💰 <strong>Tổng thanh toán:</strong> <strong style={{ color: "#ef4444" }}>{formatCurrency(result.total_amount)}</strong></div>
                )}
                <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span className={`badge badge-${result.status}`} style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "9999px" }}>
                    Trạng thái: {result.status === "pending" && "Chờ xử lý"}
                    {result.status === "confirmed" && "Đã xác nhận"}
                    {result.status === "cancelled" && "Đã hủy"}
                  </span>
                  <span className={`badge badge-${result.payment_status === "paid" ? "confirmed" : result.payment_status === "pending" ? "pending" : "cancelled"}`} style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "9999px" }}>
                    Thanh toán: {result.payment_status === "paid" && "Đã thanh toán"}
                    {result.payment_status === "pending" && "Chờ xác minh"}
                    {result.payment_status === "unpaid" && "Chưa thanh toán"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {result.payment_status !== "paid" && result.status !== "cancelled" && config.payment?.online_enabled && result.status === "confirmed" ? (
                  <button onClick={() => router.push(`/payment/${result.id}${result.secure_token ? `?token=${result.secure_token}` : ""}`)} className="btn-auth-submit" style={{ width: "100%", padding: ".9rem", border: 0, borderRadius: ".75rem", fontWeight: 800, cursor: "pointer" }}>
                    Thanh toán online qua QR
                  </button>
                ) : result.payment_status !== "paid" && result.status !== "cancelled" && (
                  <div style={{ padding: "0.9rem", borderRadius: "0.75rem", background: "#eff6ff", color: "#1e40af", textAlign: "center", fontWeight: 600 }}>
                    {config.payment?.online_enabled ? "Nhân viên New Star Tour sẽ xác nhận đơn trước khi mở thanh toán online." : "Nhân viên New Star Tour sẽ liên hệ xác nhận và hướng dẫn thanh toán."}
                  </div>
                )}
                <button
                  onClick={() => setResult(null)}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "0.75rem",
                    fontWeight: 700,
                    background: "none",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Tra cứu đơn hàng khác
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
