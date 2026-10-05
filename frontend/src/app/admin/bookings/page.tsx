"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Tour {
  id: number;
  title: string;
  price: number;
}

interface Booking {
  id: number;
  booking_code?: string;
  tour_id: number;
  tour_title: string;
  full_name: string;
  email: string;
  phone: string;
  departure_date: string;
  guests_count: number;
  notes: string;
  status: "pending" | "confirmed" | "cancelled";
  payment_status: "unpaid" | "pending" | "paid";
  payment_proof?: string;
  payment_ref?: string;
  total_amount?: number;
  discount_code?: string;
  discount_amount?: number;
  created_at: string;
  crm_sync_status?: "not_synced" | "not_configured" | "queued" | "syncing" | "synced" | "failed";
  crm_booking_id?: string;
  crm_customer_id?: string;
  crm_last_error?: string;
}

export default function BookingsManager() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Detail Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookingsData();
  }, []);

  const fetchBookingsData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập.");
      setLoading(false);
      return;
    }

    try {
      // Fetch Tours (for pricing lookup)
      const toursRes = await fetch("http://localhost:8000/api/tours/");
      const toursData = toursRes.ok ? await toursRes.json() : [];
      setTours(toursData);

      // Fetch Bookings
      const bookingsRes = await fetch("http://localhost:8000/api/bookings/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (bookingsRes.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_email");
        window.location.href = "/admin-login";
        return;
      }
      if (!bookingsRes.ok) throw new Error("Không thể tải danh sách đơn đặt.");
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: "confirmed" | "cancelled") => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        appToast("Cập nhật trạng thái thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Lỗi khi kết nối cập nhật trạng thái.");
    }
  };

  const handleUpdatePaymentStatus = async (bookingId: number, newPaymentStatus: "unpaid" | "paid") => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, payment_status: newPaymentStatus } : b))
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, payment_status: newPaymentStatus } : null));
        }
      } else {
        appToast("Cập nhật trạng thái thanh toán thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Lỗi khi kết nối cập nhật trạng thái thanh toán.");
    }
  };

  const handleRetryCrmSync = async (bookingId: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/sync-crm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      appToast("Không thể đưa đơn vào hàng đợi đồng bộ CRM.");
      return;
    }
    const updated = await res.json();
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    setSelectedBooking(updated);
  };

  const getTourPrice = (booking: Booking) => {
    const tour = tours.find((t) => t.id === booking.tour_id || t.title === booking.tour_title);
    return tour ? tour.price : 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " VNĐ";
  };

  // Filter Logic
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phone.includes(searchTerm) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.tour_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && bookings.length === 0) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>📝 Danh sách đơn đặt tour ({filteredBookings.length})</h3>
        </div>

        {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm theo tên khách, SĐT, Email, Tour..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flexGrow: 1,
              minWidth: "260px",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              padding: "0.65rem 1rem",
              fontSize: "0.92rem",
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              padding: "0.65rem 1rem",
              background: "white",
              fontSize: "0.92rem",
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {filteredBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
            Không tìm thấy đơn đặt tour nào phù hợp.
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tour du lịch</th>
                  <th>Ngày khởi hành</th>
                  <th>Số khách</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const totalPrice = booking.total_amount ?? (getTourPrice(booking) * booking.guests_count);

                  return (
                    <tr key={booking.id}>
                      <td><strong>#{booking.id}</strong></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{booking.full_name}</span>
                          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>📞 {booking.phone}</span>
                        </div>
                      </td>
                      <td>{booking.tour_title}</td>
                      <td>{new Date(booking.departure_date).toLocaleDateString("vi-VN")}</td>
                      <td>{booking.guests_count} khách</td>
                      <td><strong>{formatPrice(totalPrice)}</strong></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span className={`badge badge-${booking.status}`}>
                            {booking.status === "pending" && "Chờ xử lý"}
                            {booking.status === "confirmed" && "Đã xác nhận"}
                            {booking.status === "cancelled" && "Đã hủy"}
                          </span>
                          <span className={`badge badge-${booking.payment_status === "paid" ? "confirmed" : booking.payment_status === "pending" ? "pending" : "cancelled"}`} style={{ fontSize: "0.75rem", padding: "0.15rem 0.4rem" }}>
                            {booking.payment_status === "paid" && "Đã thanh toán"}
                            {booking.payment_status === "pending" && "Chờ xác minh"}
                            {booking.payment_status === "unpaid" && "Chưa thanh toán"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="btn-action"
                            title="Xem chi tiết đơn"
                          >
                            👁️
                          </button>
                          {booking.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(booking.id, "confirmed")}
                                className="btn-action"
                                style={{ color: "#15803d", borderColor: "#bbf7d0" }}
                                title="Xác nhận"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(booking.id, "cancelled")}
                                className="btn-action btn-delete"
                                title="Hủy bỏ"
                              >
                                ✗
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Booking Details Modal Popup */}
      {selectedBooking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "var(--shadow-deep)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                📝 Chi tiết đơn đặt tour #{selectedBooking.id}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "var(--muted)",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Tên khách hàng:</span>
                  <p style={{ fontWeight: 700, margin: "0.15rem 0 0" }}>{selectedBooking.full_name}</p>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Số điện thoại:</span>
                  <p style={{ fontWeight: 700, margin: "0.15rem 0 0" }}>{selectedBooking.phone}</p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Địa chỉ Email:</span>
                <p style={{ margin: "0.15rem 0 0", color: "#334155" }}>{selectedBooking.email}</p>
              </div>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Tour đã đặt:</span>
                <p style={{ fontWeight: 800, color: "var(--accent-dark)", margin: "0.15rem 0 0" }}>
                  {selectedBooking.tour_title}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Ngày khởi hành:</span>
                  <p style={{ margin: "0.15rem 0 0", fontWeight: 600 }}>
                    {new Date(selectedBooking.departure_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Số lượng hành khách:</span>
                  <p style={{ margin: "0.15rem 0 0", fontWeight: 600 }}>{selectedBooking.guests_count} khách</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Tổng tiền:</span>
                  <p style={{ margin: "0.15rem 0 0", fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
                    {formatPrice(selectedBooking.total_amount ?? (getTourPrice(selectedBooking) * selectedBooking.guests_count))}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Trạng thái đơn:</span>
                  <div style={{ marginTop: "0.15rem" }}>
                    <span className={`badge badge-${selectedBooking.status}`}>
                      {selectedBooking.status === "pending" && "Chờ xử lý"}
                      {selectedBooking.status === "confirmed" && "Đã xác nhận"}
                      {selectedBooking.status === "cancelled" && "Đã hủy"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.discount_code && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Mã giảm giá:</span>
                    <p style={{ margin: "0.15rem 0 0", fontWeight: 700, color: "#16a34a" }}>{selectedBooking.discount_code}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Số tiền được giảm:</span>
                    <p style={{ margin: "0.15rem 0 0", fontWeight: 700, color: "#dc2626" }}>-{formatPrice(selectedBooking.discount_amount || 0)}</p>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Trạng thái thanh toán:</span>
                  <div style={{ marginTop: "0.15rem" }}>
                    <span className={`badge badge-${selectedBooking.payment_status === "paid" ? "confirmed" : selectedBooking.payment_status === "pending" ? "pending" : "cancelled"}`}>
                      {selectedBooking.payment_status === "paid" && "🟢 Đã thanh toán"}
                      {selectedBooking.payment_status === "pending" && "⏳ Chờ xác minh"}
                      {selectedBooking.payment_status === "unpaid" && "🔴 Chưa thanh toán"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.payment_proof && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Ảnh biên lai chuyển khoản:</span>
                  <div style={{ marginTop: "0.5rem" }}>
                    <a href={selectedBooking.payment_proof} target="_blank" rel="noreferrer">
                      <img
                        src={selectedBooking.payment_proof}
                        alt="Biên lai chuyển khoản"
                        style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                      />
                    </a>
                    {selectedBooking.payment_ref && (
                      <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.88rem", color: "#475569" }}>
                        Ghi chú khách gửi: <strong>{selectedBooking.payment_ref}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedBooking.notes && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Ghi chú yêu cầu:</span>
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      background: "#f8fafc",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.9rem",
                      color: "#475569",
                      whiteSpace: "pre-line",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "right" }}>
                Mã đơn: {selectedBooking.booking_code || `#${selectedBooking.id}`} · Ngày tạo: {new Date(selectedBooking.created_at).toLocaleString("vi-VN")}
              </div>
              <div style={{ marginTop: "0.75rem", padding: "0.8rem", borderRadius: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                <strong>Đồng bộ CRM:</strong> {selectedBooking.crm_sync_status || "not_synced"}
                {selectedBooking.crm_booking_id && <span> · CRM booking: {selectedBooking.crm_booking_id}</span>}
                {selectedBooking.crm_last_error && <div style={{ color: "#dc2626", marginTop: "0.35rem" }}>{selectedBooking.crm_last_error}</div>}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
                background: "#f8fafc",
              }}
            >
              {selectedBooking.status === "pending" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, "confirmed")}
                    className="admin-btn-primary"
                    style={{ background: "#16a34a", padding: "0.55rem 1.25rem" }}
                  >
                    ✓ Xác nhận đơn
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, "cancelled")}
                    className="btn-sidebar-logout"
                    style={{ width: "auto", padding: "0.55rem 1.25rem", margin: 0 }}
                  >
                    ✗ Hủy đơn hàng
                  </button>
                </>
              )}
              {selectedBooking.status !== "cancelled" && (
                <>
                  {selectedBooking.payment_status !== "paid" ? (
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedBooking.id, "paid")}
                      className="admin-btn-primary"
                      style={{ background: "#2563eb", padding: "0.55rem 1.25rem" }}
                    >
                      💳 Xác nhận Đã thanh toán
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdatePaymentStatus(selectedBooking.id, "unpaid")}
                      className="btn-sidebar-logout"
                      style={{ width: "auto", padding: "0.55rem 1.25rem", margin: 0, borderColor: "#dc2626", color: "#dc2626", background: "none" }}
                    >
                      ↩️ Hủy xác nhận thanh toán
                    </button>
                  )}
                </>
              )}
              {selectedBooking.crm_sync_status !== "synced" && (
                <button
                  onClick={() => handleRetryCrmSync(selectedBooking.id)}
                  className="btn-view-site"
                  style={{ padding: "0.55rem 1.25rem", border: "1px solid #cbd5e1" }}
                >
                  ↻ Đồng bộ CRM
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn-view-site"
                style={{ padding: "0.55rem 1.25rem", border: "1px solid #cbd5e1" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
