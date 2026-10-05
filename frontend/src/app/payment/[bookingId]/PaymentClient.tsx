"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

interface Booking {
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
  notes?: string;
  discount_code?: string;
  discount_amount?: number;
}

interface PaymentTransaction {
  id: number;
  transaction_ref: string;
  amount: number;
  status: string;
  qr_code_url: string;
  checkout_url?: string;
  created_at: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  transfer_content?: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

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

export default function PaymentClient({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Dev only simulator states
  const [simulating, setSimulating] = useState(false);
  
  const isLocalhost = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || "";
      const tokenParam = token ? `?token=${token}` : "";

      const res = await fetch(`${API_BASE}/bookings/${bookingId}${tokenParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (res.ok) {
        showToast("Hủy đơn đặt tour thành công.", "success");
        setBooking(prev => prev ? { ...prev, status: "cancelled" } : null);
        setShowCancelModal(false);
      } else {
        const data = await res.json();
        showToast(data.detail || "Không thể hủy đơn đặt tour.", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi hủy đơn đặt tour.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/payments/simulate-success/${bookingId}`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("Giả lập thanh toán thành công!", "success");
        checkPaymentStatus(false);
      } else {
        showToast("Giả lập thanh toán thất bại.", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi giả lập thanh toán.", "error");
    } finally {
      setSimulating(false);
    }
  };

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = useCallback(async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast("Không thể sao chép. Vui lòng copy thủ công.", "error");
    }
  }, [showToast]);

  // Load booking info và generate QR
  useEffect(() => {
    const loadPaymentInfo = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token") || "";
        const tokenParam = token ? `?token=${token}` : "";

        const bookingRes = await fetch(`${API_BASE}/bookings/${bookingId}${tokenParam}`);
        if (!bookingRes.ok) throw new Error("Không tìm thấy thông tin đặt tour");
        let bookingData = await bookingRes.json();

        // Nếu URL có status=CANCELLED, cập nhật local state và backend
        if (params.get('status') === 'CANCELLED' && bookingData.status !== 'cancelled') {
          try {
            await fetch(`${API_BASE}/bookings/${bookingId}${tokenParam}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'cancelled' })
            });
            bookingData.status = 'cancelled';
          } catch (err) {
            console.error('Failed to update booking status:', err);
          }
        }

        setBooking(bookingData);

        // Không generate QR nếu booking bị cancelled hoặc refunded
        if (bookingData.status === "cancelled" || bookingData.payment_status === "refunded") {
          setLoading(false);
          return;
        }

        if (bookingData.payment_status === "unpaid") {
          const paymentRes = await fetch(`${API_BASE}/payments/generate-qr/${bookingId}${tokenParam}`, {
            method: "POST",
          });
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            setPaymentTransaction(paymentData);
          }
        } else {
          const paymentRes = await fetch(`${API_BASE}/payments/status/${bookingId}${tokenParam}`);
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            setPaymentTransaction(paymentData);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải thông tin thanh toán";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentInfo();
  }, [bookingId]);

  const checkPaymentStatus = useCallback(
    async (showNotification = false) => {
      setCheckingPayment(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token") || "";
        const tokenParam = token ? `?token=${token}` : "";

        const res = await fetch(`${API_BASE}/payments/status/${bookingId}${tokenParam}`);
        if (res.ok) {
          const data = await res.json();
          // Chỉ merge status/completed_at, không ghi đè bank info đã có từ generate-qr
          setPaymentTransaction(prev => prev ? { ...prev, status: data.status, completed_at: data.completed_at } : data);
          if (data.status === "completed") {
            const bookingRes = await fetch(`${API_BASE}/bookings/${bookingId}${tokenParam}`);
            if (bookingRes.ok) {
              const bookingData = await bookingRes.json();
              if (bookingData) setBooking(bookingData);
            }
            if (showNotification) showToast("Xác nhận thanh toán thành công!", "success");
          } else if (showNotification) {
            showToast("Hệ thống chưa nhận được thanh toán. Vui lòng đợi trong giây lát.", "info");
          }
        }
      } catch {
        if (showNotification) showToast("Lỗi khi kiểm tra trạng thái thanh toán.", "error");
      } finally {
        setCheckingPayment(false);
      }
    },
    [bookingId, showToast]
  );

  const isPaid = useMemo(
    () => booking?.payment_status === "paid" || paymentTransaction?.status === "completed",
    [booking, paymentTransaction]
  );
  const isPending = useMemo(
    () => booking?.payment_status === "pending" || paymentTransaction?.status === "pending",
    [booking, paymentTransaction]
  );
  const isCancelled = useMemo(
    () => booking?.status === "cancelled",
    [booking]
  );
  const isRefunded = useMemo(
    () => booking?.payment_status === "refunded",
    [booking]
  );

  // Auto check mỗi 3 giây — chỉ khi chưa paid và không cancelled/refunded
  useEffect(() => {
    if (!paymentTransaction || paymentTransaction.status === "completed" || isCancelled || isRefunded) return;
    const interval = setInterval(() => checkPaymentStatus(false), 3000);
    return () => clearInterval(interval);
  }, [paymentTransaction, checkPaymentStatus, isCancelled, isRefunded]);

  if (loading) {
    return (
      <div className="container" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div className="animate-pulse">
          <div style={{ width: "200px", height: "24px", background: "var(--public-border, #e2e8f0)", borderRadius: "4px", margin: "0 auto 2rem" }} />
          <div style={{ width: "100%", maxWidth: "600px", height: "400px", background: "var(--public-border, #e2e8f0)", borderRadius: "12px", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Lỗi thanh toán</h2>
        <p style={{ color: "var(--public-muted, #6b7280)", marginBottom: "2rem" }}>{error || "Không thể tải thông tin đặt tour"}</p>
        <Link href="/tours" className="button button-primary">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: "900px", padding: "2rem 1rem", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -1rem); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .copy-btn { transition: all 0.2s; }
        .copy-btn:hover { opacity: 0.85; }
      `}} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "2rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999,
          background: toast.type === "success" ? "#10b981" : toast.type === "error" ? "#ef4444" : "#3b82f6",
          color: "white", padding: "0.875rem 1.5rem", borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.15)", fontWeight: 600, fontSize: "0.95rem",
          textAlign: "center", minWidth: "280px", maxWidth: "90%", animation: "slideDown 0.3s ease",
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", marginBottom: "0.5rem", color: "var(--public-text-strong, #0f172a)", fontWeight: 800 }}>
          Thanh toán đặt tour
        </h1>
        <p style={{ color: "var(--public-muted, #64748b)", fontSize: "0.95rem" }}>
          Mã đơn hàng: <strong style={{ color: "var(--public-text-strong, #0f172a)" }}>#{bookingId}</strong>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>

        {/* Booking Info */}
        <div className="surface-panel" style={{ padding: "1.75rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "1.25rem", color: "var(--public-text-strong, #0f172a)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📋</span> Thông tin đặt tour
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem 1.5rem" }}>
            <InfoItem label="Tour" value={booking.tour_title} />
            <InfoItem label="Khách hàng" value={booking.full_name} />
            <InfoItem label="Ngày khởi hành" value={formatDate(booking.departure_date)} />
            <InfoItem label="Số khách" value={`${booking.guests_count} người`} />
            <InfoItem label="Email" value={booking.email} />
            <InfoItem label="Điện thoại" value={booking.phone} />
          </div>
          
          {/* Pricing Details Breakdown */}
          <div style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px dashed var(--public-border, #cbd5e1)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            {booking.discount_code && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--public-text, #475569)" }}>
                <span>Áp dụng mã: <strong style={{ color: "var(--public-success-text, #0d9488)" }}>{booking.discount_code}</strong></span>
                <span style={{ color: "#ef4444", fontWeight: 600 }}>-{formatCurrency(booking.discount_amount || 0)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
              <span style={{ fontWeight: 700, color: "var(--public-text-strong, #0f172a)" }}>Tổng thanh toán:</span>
              <strong style={{ fontSize: "1.25rem", color: "#ef4444" }}>
                {formatCurrency(booking.total_amount || 0)}
              </strong>
            </div>
          </div>
        </div>

        {/* Cancelled Banner */}
        {isCancelled && (
          <div className="surface-panel public-status--error" style={{ padding: "2rem", background: "linear-gradient(135deg, var(--public-error-surface, #fef2f2), var(--public-error-surface, #fff5f5))", border: "2px solid var(--public-error-border, #fca5a5)", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", lineHeight: 1, marginBottom: "0.75rem" }}>🚫</div>
            <h3 style={{ fontSize: "1.3rem", color: "var(--public-error-text, #991b1b)", marginTop: 0, marginBottom: "0.5rem" }}>Đơn hàng đã bị huỷ</h3>
            <p style={{ color: "var(--public-error-text, #7f1d1d)", fontSize: "0.95rem", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              Booking <strong>#{bookingId}</strong> đã bị huỷ và không thể thực hiện thanh toán.
              Nếu bạn vẫn muốn đặt tour này, vui lòng đặt lại từ đầu.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/tours" style={{ background: "#dc2626", color: "white", textDecoration: "none", fontWeight: 700, padding: "0.75rem 1.5rem", borderRadius: "0.5rem" }}>
                Đặt tour mới
              </Link>
              <Link href="/" style={{ background: "var(--public-surface, white)", color: "var(--public-error-text, #991b1b)", textDecoration: "none", fontWeight: 600, padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid var(--public-error-border, #fca5a5)" }}>
                Về trang chủ
              </Link>
            </div>
          </div>
        )}

        {/* Refunded Banner */}
        {isRefunded && !isCancelled && (
          <div className="surface-panel public-status--refund" style={{ padding: "2rem", background: "linear-gradient(135deg, var(--public-refund-surface, #f5f3ff), var(--public-refund-surface, #faf5ff))", border: "2px solid var(--public-refund-border, #c4b5fd)", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", lineHeight: 1, marginBottom: "0.75rem" }}>💜</div>
            <h3 style={{ fontSize: "1.3rem", color: "var(--public-refund-text, #5b21b6)", marginTop: 0, marginBottom: "0.5rem" }}>Đã hoàn tiền</h3>
            <p style={{ color: "var(--public-refund-text, #4c1d95)", fontSize: "0.95rem", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              Khoản tiền của booking <strong>#{bookingId}</strong> đã được hoàn trả.
              Vui lòng kiểm tra tài khoản ngân hàng trong 3–5 ngày làm việc.
              Liên hệ hỗ trợ nếu chưa nhận được.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/contact" style={{ background: "#7c3aed", color: "white", textDecoration: "none", fontWeight: 700, padding: "0.75rem 1.5rem", borderRadius: "0.5rem" }}>
                Liên hệ hỗ trợ
              </Link>
              <Link href="/tours" style={{ background: "var(--public-surface, white)", color: "var(--public-refund-text, #5b21b6)", textDecoration: "none", fontWeight: 600, padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid var(--public-refund-border, #c4b5fd)" }}>
                Khám phá tour khác
              </Link>
            </div>
          </div>
        )}

        {/* Payment Status — only show when not cancelled/refunded */}
        {!isCancelled && !isRefunded && (
        <div className="surface-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--public-text-strong, #0f172a)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>💳</span> Trạng thái thanh toán
            </h3>
            {!isPaid && (
              <div style={{ fontSize: "0.8rem", color: "var(--public-success-text, #0d9488)", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--public-success-text, #0d9488)", animation: "pulseDot 1.5s infinite ease-in-out" }} />
                Đang theo dõi giao dịch
              </div>
            )}
          </div>

          <div style={{
            padding: "1rem 1.5rem", borderRadius: "0.75rem",
            border: `2px solid ${isPaid ? "#10b981" : isPending ? "#f59e0b" : "#3b82f6"}`,
            background: isPaid ? "var(--public-success-surface, #f0fdf4)" : isPending ? "var(--public-warning-surface, #fffbeb)" : "var(--public-info-surface, #eff6ff)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: isPaid ? "var(--public-success-text, #065f46)" : isPending ? "var(--public-warning-text, #92400e)" : "var(--public-info-text, #1e40af)", marginBottom: "0.35rem" }}>
              {isPaid ? "✅ Đã thanh toán" : isPending ? "⏳ Chờ xác nhận" : "💳 Đang chờ thanh toán"}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--public-text, #475569)" }}>
              {isPaid
                ? "Booking đã được xác nhận. Chúng tôi sẽ liên hệ với bạn sớm."
                : isPending
                ? "Chúng tôi đang xác minh giao dịch của bạn."
                : "Vui lòng thực hiện thanh toán theo hướng dẫn bên dưới."}
            </div>
          </div>

          {!isPaid && (
            <>
              <button
                onClick={() => checkPaymentStatus(true)}
                disabled={checkingPayment}
                style={{
                  marginTop: "1rem", width: "100%", padding: "0.85rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  fontWeight: 600, fontSize: "0.95rem",
                  background: checkingPayment ? "var(--public-muted, #94a3b8)" : "#3b82f6",
                  color: "white", border: "none", borderRadius: "0.5rem",
                  cursor: checkingPayment ? "not-allowed" : "pointer", transition: "background 0.2s",
                }}
              >
                {checkingPayment ? "Đang kiểm tra..." : "🔄 Tôi đã chuyển khoản — Kiểm tra ngay"}
              </button>

              <div style={{ marginTop: "1.5rem", borderTop: "1px dashed var(--public-border, #cbd5e1)", paddingTop: "1rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--public-text, #475569)", margin: "0 0 0.5rem 0", fontWeight: 700, textAlign: "left" }}>
                  Chính sách hủy đặt tour:
                </h4>
                <ul style={{ fontSize: "0.8rem", color: "var(--public-muted, #64748b)", margin: "0 0 1rem 0", paddingLeft: "1.2rem", lineHeight: 1.5, textAlign: "left" }}>
                  <li>Bạn có thể hủy đơn đặt tour miễn phí bất cứ lúc nào trước khi thanh toán.</li>
                  <li>Sau khi thanh toán thành công, vui lòng liên hệ hotline để được hỗ trợ hoàn/hủy theo quy định của StarTour.</li>
                </ul>
                <button
                  onClick={() => setShowCancelModal(true)}
                  style={{
                    width: "100%", padding: "0.6rem",
                    fontSize: "0.85rem", fontWeight: 600,
                    color: "#ef4444", background: "none", border: "1px solid var(--public-error-border, #fca5a5)",
                    borderRadius: "0.5rem", cursor: "pointer", transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--public-error-surface, #fef2f2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "none";
                  }}
                >
                  🚫 Hủy đơn đặt tour này
                </button>
              </div>
            </>
          )}
        </div>
        )}

        {/* Payment Panel */}
        {!isPaid && !isCancelled && !isRefunded && paymentTransaction && (
          <div className="surface-panel" style={{ padding: "2rem 1.75rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--public-text, #475569)", margin: "0 0 1.5rem 0", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <span>💡</span>
              <span>Mở App Ngân hàng bất kỳ để <strong>quét mã VietQR</strong> hoặc <strong>chuyển khoản</strong> chính xác số tiền, nội dung bên dưới</span>
            </p>

            {/* QR + Info layout */}
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>

              {/* QR Code */}
              {paymentTransaction.qr_code_url && (
                <div className="payment-qr-surface" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem",
                  padding: "1.25rem", background: "var(--public-surface, white)", border: "1px solid var(--public-border, #e2e8f0)",
                  borderRadius: "1rem", boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  position: "relative", overflow: "hidden", flexShrink: 0,
                }}>
                  {/* scan line */}
                  <div style={{
                    position: "absolute", left: 0, width: "100%", height: "3px",
                    background: "linear-gradient(90deg, transparent, var(--public-success-text, #0d9488), transparent)",
                    animation: "scanLine 3s infinite ease-in-out",
                  }} />

                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(paymentTransaction.qr_code_url)}`}
                    alt="VietQR"
                    style={{ width: "220px", height: "220px", display: "block" }}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--public-muted, #94a3b8)", fontWeight: 600, letterSpacing: "0.05em" }}>NAPAS 247</span>
                    <span style={{ color: "var(--public-border, #cbd5e1)" }}>|</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--public-info-text, #1d4ed8)" }}>VietQR</span>
                  </div>
                </div>
              )}

              {/* Bank info */}
              <div style={{ flex: 1, minWidth: "240px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

                {/* Ngân hàng */}
                {paymentTransaction.bank_name && (
                  <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--public-surface-soft, #f1f5f9)" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--public-muted, #94a3b8)", display: "block", marginBottom: "0.2rem" }}>Ngân hàng</span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--public-text-strong, #0f172a)" }}>{paymentTransaction.bank_name}</span>
                  </div>
                )}

                {/* Chủ tài khoản */}
                {paymentTransaction.account_name && (
                  <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--public-surface-soft, #f1f5f9)" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--public-muted, #94a3b8)", display: "block", marginBottom: "0.2rem" }}>Chủ tài khoản</span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--public-text-strong, #0f172a)" }}>{paymentTransaction.account_name}</span>
                  </div>
                )}

                {/* Số tài khoản */}
                {paymentTransaction.account_number && (
                  <CopyRow
                    label="Số tài khoản"
                    value={paymentTransaction.account_number}
                    fieldKey="account"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}

                {/* Số tiền */}
                <CopyRow
                  label="Số tiền"
                  value={formatCurrency(paymentTransaction.amount)}
                  copyValue={String(Math.round(paymentTransaction.amount))}
                  fieldKey="amount"
                  copiedField={copiedField}
                  onCopy={copyToClipboard}
                />

                {/* Nội dung */}
                {paymentTransaction.transfer_content && (
                  <CopyRow
                    label="Nội dung"
                    value={paymentTransaction.transfer_content}
                    fieldKey="content"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                )}

                {/* Lưu ý */}
                {paymentTransaction.transfer_content && (
                  <p style={{ fontSize: "0.8rem", color: "#f59e0b", margin: 0, padding: "0.6rem 0.75rem", background: "var(--public-warning-surface, #fffbeb)", borderRadius: "0.5rem", border: "1px solid var(--public-warning-border, #fde68a)" }}>
                    ⚠️ Lưu ý: Nhập chính xác số tiền <strong>{formatCurrency(paymentTransaction.amount)}</strong>, nội dung <strong>{paymentTransaction.transfer_content}</strong> khi chuyển khoản
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0", color: "var(--public-muted, #94a3b8)", fontSize: "0.85rem" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--public-border, #e2e8f0)" }} />
              <span>HOẶC</span>
              <div style={{ flex: 1, height: "1px", background: "var(--public-border, #e2e8f0)" }} />
            </div>

            {/* PayOS button */}
            {paymentTransaction.checkout_url && (
              <div style={{ textAlign: "center" }}>
                <a
                  href={paymentTransaction.checkout_url}
                  className="button button-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                    background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "white",
                    padding: "0.95rem 2rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "1rem",
                    textDecoration: "none", boxShadow: "0 8px 15px -3px rgba(13,148,136,0.3)",
                  }}
                >
                  💳 Thanh toán bằng Thẻ / Apple Pay qua PayOS
                </a>
                <p style={{ fontSize: "0.8rem", color: "var(--public-muted, #94a3b8)", margin: "0.75rem 0 0 0" }}>
                  🔒 Giao dịch được xử lý an toàn qua cổng PayOS. Trang tự động cập nhật khi thanh toán thành công.
                </p>
              </div>
            )}
          </div>
        )}

        {/* No transaction fallback */}
        {!isPaid && !isCancelled && !isRefunded && !paymentTransaction && !loading && (
          <div className="surface-panel" style={{ padding: "2rem", color: "#ef4444", textAlign: "center" }}>
            ⚠️ Không tìm thấy liên kết thanh toán PayOS. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.
          </div>
        )}

        {/* Success */}
        {isPaid && (
          <div className="surface-panel public-status--success" style={{ padding: "2.5rem 2rem", background: "linear-gradient(135deg, #10b981, #065f46)", color: "white", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", lineHeight: 1, marginBottom: "1rem" }}>🎉</div>
            <h3 style={{ fontSize: "1.5rem", marginTop: 0, marginBottom: "0.75rem", color: "white" }}>
              Cảm ơn bạn đã đặt tour!
            </h3>
            <p style={{ fontSize: "1rem", marginBottom: "1.75rem", color: "rgba(255,255,255,0.92)", maxWidth: "520px", margin: "0 auto 1.75rem", lineHeight: 1.6 }}>
              Thanh toán thành công. Chúng tôi sẽ liên hệ trong vòng 24 giờ để xác nhận chi tiết hành trình.
              Email xác nhận đã được gửi tới <strong>{booking.email}</strong>.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/profile" style={{ background: "var(--public-surface, white)", color: "var(--public-success-text, #065f46)", textDecoration: "none", fontWeight: 700, padding: "0.75rem 1.5rem", borderRadius: "0.5rem" }}>
                Xem booking của tôi
              </Link>
              <Link href="/tours" style={{ background: "rgba(255,255,255,0.15)", color: "white", textDecoration: "none", fontWeight: 600, padding: "0.75rem 1.5rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.3)" }}>
                Khám phá tour khác
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Dev-only Simulation Box */}
      {isLocalhost && !isPaid && !isCancelled && !isRefunded && (
        <div style={{
          marginTop: "2rem",
          padding: "1.5rem",
          border: "2px dashed #a855f7",
          background: "var(--public-refund-surface, #faf5ff)",
          borderRadius: "1rem",
          textAlign: "center"
        }}>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--public-refund-text, #7e22ce)", fontWeight: 800 }}>
            🛠️ [DEV ONLY] Giả lập thanh toán thành công
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--public-refund-text, #6b21a8)", margin: "0 0 1rem 0" }}>
            Nhấp nút bên dưới để gửi yêu cầu giả lập thanh toán thành công tới Backend.
            Hệ thống sẽ cập nhật trạng thái đơn hàng và gửi email xác nhận.
          </p>
          <button
            onClick={handleSimulatePayment}
            disabled={simulating}
            style={{
              padding: "0.6rem 1.5rem",
              background: "#9333ea",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {simulating ? "Đang xử lý..." : "⚡ Giả lập thanh toán thành công"}
          </button>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
          background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)"
        }}>
          <div className="surface-panel" style={{ maxWidth: "440px", padding: "2rem", margin: "1rem", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.25rem", color: "var(--public-text-strong, #0f172a)", marginTop: 0, marginBottom: "1rem" }}>
              Xác nhận hủy đặt tour
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--public-text, #475569)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Bạn có chắc chắn muốn hủy đơn đặt tour này không? Hành động này sẽ giải phóng số ghế của bạn và không thể hoàn tác.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "1px solid var(--public-border, #cbd5e1)",
                  background: "var(--public-surface, white)", color: "var(--public-text, #475569)", fontWeight: 600, cursor: "pointer"
                }}
              >
                Quay lại
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                style={{
                  padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
                  background: "#ef4444", color: "white", fontWeight: 700, cursor: "pointer"
                }}
              >
                {cancelling ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "var(--public-muted, #64748b)", display: "block", marginBottom: "0.2rem", fontSize: "0.82rem" }}>{label}</span>
      <strong style={{ color: "var(--public-text-strong, #0f172a)", fontSize: "0.95rem" }}>{value}</strong>
    </div>
  );
}

function CopyRow({
  label,
  value,
  copyValue,
  fieldKey,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  copyValue?: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const isCopied = copiedField === fieldKey;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid var(--public-surface-soft, #f1f5f9)", gap: "0.75rem" }}>
      <div>
        <span style={{ fontSize: "0.8rem", color: "var(--public-muted, #94a3b8)", display: "block", marginBottom: "0.2rem" }}>{label}</span>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--public-text-strong, #0f172a)", fontFamily: fieldKey === "account" ? "ui-monospace, monospace" : "inherit" }}>{value}</span>
      </div>
      <button
        className="copy-btn"
        onClick={() => onCopy(copyValue ?? value, fieldKey)}
        style={{
          flexShrink: 0,
          padding: "0.3rem 0.75rem",
          background: isCopied ? "var(--public-success-surface, #dcfce7)" : "var(--public-surface-soft, #f1f5f9)",
          color: isCopied ? "var(--public-success-text, #166534)" : "var(--public-text, #475569)",
          border: `1px solid ${isCopied ? "#86efac" : "var(--public-border, #e2e8f0)"}`,
          borderRadius: "0.4rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {isCopied ? "✓ Đã chép" : "Sao chép"}
      </button>
    </div>
  );
}
