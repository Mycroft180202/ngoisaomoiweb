"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCms } from "@/components/cms/CmsProvider";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

function SuccessContent() {
  const { config } = useCms();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const url = `${API_BASE}/bookings/${bookingId}` + (token ? `?token=${token}` : "");
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setBooking(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, token]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat("vi-VN").format(n) + " VNĐ";
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "3.5rem", height: "3.5rem", border: "4px solid #cbd5e1", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
          <p style={{ color: "#64748b", fontWeight: 600 }}>Đang tải thông tin xác nhận...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "1.5rem" }}>
        <div style={{ maxWidth: "480px", width: "100%", background: "white", padding: "3rem 2rem", borderRadius: "1.5rem", textAlign: "center", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem" }}>Không tìm thấy đơn hàng</h2>
          <p style={{ color: "#64748b", marginBottom: "2rem", lineHeight: 1.6 }}>Thông tin đơn hàng không tồn tại hoặc bạn không có quyền truy cập liên kết này.</p>
          <Link href="/" className="button button-primary" style={{ padding: "0.8rem 2rem", textDecoration: "none", borderRadius: "0.75rem", fontWeight: 700 }}>
            Quay lại Trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "90vh", background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        {/* Success Card */}
        <div style={{ background: "white", borderRadius: "2rem", boxShadow: "0 20px 40px -15px rgba(15,23,42,0.08)", border: "1px solid #e2e8f0", overflow: "hidden", padding: "3rem 2.5rem", textAlign: "center" }}>
          
          {/* Checkmark icon */}
          <div style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", boxShadow: "0 0 0 10px #f0fdf4" }}>
            <span style={{ fontSize: "3rem", color: "#16a34a", fontWeight: "bold" }}>✓</span>
          </div>

          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#0f172a", marginBottom: "1rem", letterSpacing: "-0.025em" }}>Đã tiếp nhận yêu cầu đặt tour!</h1>
          
          <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.6, maxWidth: "560px", margin: "0 auto 2.5rem" }}>
            Cảm ơn bạn đã lựa chọn <strong>StarTour</strong>. Yêu cầu đặt tour của bạn đã được tiếp nhận thành công. 
            Mã yêu cầu của bạn là <strong>{booking.booking_code || `#${booking.id}`}</strong>. Nhân viên sẽ liên hệ xác nhận trước khi hướng dẫn thanh toán.
          </p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "1.25rem", padding: "2rem", textAlign: "left", marginBottom: "2.5rem" }}>
            <h3 style={{ margin: "0 0 1.25rem 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>📋 Chi tiết đặt tour</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Chuyến đi:</span>
                <span style={{ color: "#0f172a", fontWeight: 700, textAlign: "right", maxWidth: "70%" }}>{booking.tour_title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Ngày khởi hành:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{formatDate(booking.departure_date)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Người liên hệ:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{booking.full_name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Số điện thoại:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{booking.phone}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Email liên hệ:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{booking.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Số khách đăng ký:</span>
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{booking.guests_count} khách</span>
              </div>
              {booking.notes && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b", fontWeight: 500 }}>Chi tiết độ tuổi/Lưu ý:</span>
                  <span style={{ color: "#0f172a", fontWeight: 600, fontStyle: "italic", textAlign: "right" }}>{booking.notes}</span>
                </div>
              )}
              {booking.total_amount && (
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "0.85rem", marginTop: "0.25rem" }}>
                  <span style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.05rem" }}>Tổng tiền tạm tính:</span>
                  <span style={{ color: "var(--accent)", fontWeight: 900, fontSize: "1.15rem" }}>{formatCurrency(booking.total_amount)}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "1.25rem", padding: "1.5rem 2rem", textAlign: "left", marginBottom: "3rem", display: "flex", gap: "1rem" }}>
            <span style={{ fontSize: "1.75rem" }}>📞</span>
            <div>
              <h4 style={{ margin: "0 0 0.25rem 0", color: "#1e3a8a", fontWeight: 800, fontSize: "1rem" }}>Lưu ý dành cho quý khách:</h4>
              <p style={{ margin: 0, color: "#1e40af", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Giá trên đơn là giá tạm tính để quý khách tham khảo. Đội ngũ tư vấn sẽ liên hệ số <strong>{booking.phone}</strong>, xác nhận lịch và số chỗ trước khi thanh toán. {config.payment?.online_enabled ? "Sau khi đơn được xác nhận, quý khách có thể thanh toán online qua QR tại trang tra cứu đơn." : "Hiện tại thanh toán được hướng dẫn thủ công bởi nhân viên."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/" className="button button-secondary" style={{ padding: "0.85rem 2rem", textDecoration: "none", borderRadius: "0.75rem", fontWeight: 700 }}>
              Về Trang chủ
            </Link>
            <Link href={`/tours`} className="button button-primary" style={{ padding: "0.85rem 2rem", textDecoration: "none", borderRadius: "0.75rem", fontWeight: 700 }}>
              Xem Tour Khác
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <p style={{ color: "#64748b", fontWeight: 600 }}>Đang chuẩn bị thông tin...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
