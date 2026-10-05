"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Tour {
  id: number;
  title: string;
  price: number;
}

interface Booking {
  id: number;
  tour_id?: number;
  tour_title: string;
  full_name: string;
  email: string;
  phone: string;
  departure_date: string;
  guests_count: number;
  total_amount?: number;
  payment_status?: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
}

interface News {
  id: number;
  title: string;
}

export default function AdminDashboard() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("admin_token");

    if (!token) {
      setError("Vui lòng đăng nhập để truy cập quản trị.");
      setLoading(false);
      return;
    }

    try {
      // Fetch Tours
      const toursRes = await fetch("http://localhost:8000/api/tours/");
      const toursData = toursRes.ok ? await toursRes.json() : [];

      // Fetch Bookings (requires Auth)
      const bookingsRes = await fetch("http://localhost:8000/api/bookings/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];

      // Fetch News
      const newsRes = await fetch("http://localhost:8000/api/news/");
      const newsData = newsRes.ok ? await newsRes.json() : [];

      // Sort bookings by id desc or date desc to get recent bookings
      const sortedBookings = Array.isArray(bookingsData)
        ? [...bookingsData].sort((a, b) => b.id - a.id)
        : [];

      setTours(Array.isArray(toursData) ? toursData : []);
      setBookings(sortedBookings);
      setNews(Array.isArray(newsData) ? newsData : []);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu bảng điều khiển.");
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
        // Update local state
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
      } else {
        appToast("Cập nhật trạng thái thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi khi cập nhật trạng thái.");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel error-panel" style={{ color: "#ef4444", borderLeft: "4px solid #ef4444" }}>
        <h4>⚠️ Đã xảy ra lỗi</h4>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="admin-btn-primary" style={{ marginTop: "1rem" }}>
          Thử lại
        </button>
      </div>
    );
  }

  // Calculations
  const totalTours = tours.length;
  const totalBookings = bookings.length;
  const totalNews = news.length;

  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const expectedRevenue = confirmedBookings.reduce((sum, b) => {
    if (b.total_amount !== undefined && b.total_amount !== null) {
      return sum + b.total_amount;
    }
    const tour = tours.find((t) => t.id === b.tour_id || t.title === b.tour_title);
    const price = tour ? tour.price : 0;
    return sum + (price * b.guests_count);
  }, 0);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + " VNĐ";
  };

  return (
    <div>
      {/* Thống kê Tổng quan */}
      <section className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="icon-box">✈️</div>
          <div className="stat-info">
            <span className="label">Tổng số Tour</span>
            <span className="value">{totalTours}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="icon-box">📝</div>
          <div className="stat-info">
            <span className="label">Đơn đặt tour</span>
            <span className="value">{totalBookings}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="icon-box">⏳</div>
          <div className="stat-info">
            <span className="label">Chờ xác nhận</span>
            <span className="value">{pendingBookings}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="icon-box">💰</div>
          <div className="stat-info">
            <span className="label">Doanh thu dự kiến</span>
            <span className="value" title={formatPrice(expectedRevenue)}>
              {formatPrice(expectedRevenue)}
            </span>
          </div>
        </div>
      </section>

      {/* Danh sách đặt tour gần đây */}
      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>📝 Đơn đặt tour gần đây</h3>
          <Link href="/admin/bookings" className="admin-btn-primary" style={{ background: "transparent", border: "1px solid var(--accent)", color: "var(--accent-dark)", boxShadow: "none" }}>
            Xem tất cả
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
            Chưa có đơn đặt tour nào được ghi nhận.
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
                  <th>Thao tác nhanh</th>
                </tr>
              </thead>
              <tbody>
                {bookings.slice(0, 8).map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>#{booking.id}</strong></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{booking.full_name}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{booking.phone}</span>
                      </div>
                    </td>
                    <td>{booking.tour_title}</td>
                    <td>{new Date(booking.departure_date).toLocaleDateString("vi-VN")}</td>
                    <td>{booking.guests_count} khách</td>
                     <td><strong>{formatPrice(booking.total_amount ?? ((tours.find((t) => t.id === booking.tour_id || t.title === booking.tour_title)?.price || 0) * booking.guests_count))}</strong></td>
                    <td>
                      <span className={`badge badge-${booking.status}`}>
                        {booking.status === "pending" && "Chờ xử lý"}
                        {booking.status === "confirmed" && "Đã xác nhận"}
                        {booking.status === "cancelled" && "Đã hủy"}
                      </span>
                    </td>
                    <td>
                      {booking.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            title="Xác nhận đơn"
                            className="btn-action"
                            onClick={() => handleUpdateStatus(booking.id, "confirmed")}
                            style={{ color: "#15803d", borderColor: "#bbf7d0" }}
                          >
                            ✓
                          </button>
                          <button
                            title="Hủy đơn"
                            className="btn-action btn-delete"
                            onClick={() => handleUpdateStatus(booking.id, "cancelled")}
                          >
                            ✗
                          </button>
                        </div>
                      )}
                      {booking.status !== "pending" && (
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Không có</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tin tức mới nhất và liên kết nhanh */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.5rem" }}>
        <section className="admin-panel" style={{ marginBottom: 0 }}>
          <div className="admin-panel-header">
            <h3>📰 Tin tức mới đăng</h3>
            <Link href="/admin/news" className="admin-btn-primary" style={{ background: "transparent", border: "1px solid var(--accent)", color: "var(--accent-dark)", boxShadow: "none" }}>
              Quản lý
            </Link>
          </div>
          {news.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Chưa có bài viết nào.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {news.slice(0, 5).map((item) => (
                <li key={item.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500, color: "#334155" }}>{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel" style={{ marginBottom: 0 }}>
          <div className="admin-panel-header">
            <h3>⚙️ Tác vụ nhanh</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/admin/tours?action=add" className="admin-btn-primary" style={{ justifyContent: "center" }}>
              ✈️ Tạo tour du lịch mới
            </Link>
            <Link href="/admin/settings" className="admin-btn-primary" style={{ justifyContent: "center", background: "#334155" }}>
              🎨 Thiết lập giao diện CMS
            </Link>
            <Link href="/" target="_blank" className="admin-btn-primary" style={{ justifyContent: "center", background: "#64748b" }}>
              🌐 Kiểm tra trang chủ
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
