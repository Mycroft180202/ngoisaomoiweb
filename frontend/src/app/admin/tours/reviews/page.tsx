"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Tour {
  id: number;
  title: string;
}

interface Review {
  id: number;
  tour_id: number;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  tour?: Tour;
}

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isApproved, setIsApproved] = useState(true);
  const [tourId, setTourId] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const toursRes = await fetch("http://localhost:8000/api/tours/");
      const toursData = toursRes.ok ? await toursRes.json() : [];
      setTours(toursData);
      if (toursData.length > 0) setTourId(toursData[0].id);

      const res = await fetch("http://localhost:8000/api/reviews/");
      if (!res.ok) throw new Error("Không thể tải danh sách đánh giá.");
      const data = await res.json();
      setReviews(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setCustomerName("");
    setRating(5);
    setComment("");
    setIsApproved(true);
    if (tours.length > 0) setTourId(tours[0].id);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Review) => {
    setEditId(item.id);
    setCustomerName(item.customer_name);
    setRating(item.rating);
    setComment(item.comment || "");
    setIsApproved(item.is_approved);
    setTourId(item.tour_id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa đánh giá này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
      } else {
        appToast("Xóa thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi.");
    }
  };

  const handleApproveToggle = async (item: Review) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const payload = {
      tour_id: item.tour_id,
      customer_name: item.customer_name,
      rating: item.rating,
      comment: item.comment,
      is_approved: !item.is_approved
    };

    try {
      const res = await fetch(`http://localhost:8000/api/reviews/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchData();
      } else {
        appToast("Thao tác thất bại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    if (!tourId) {
      appToast("Vui lòng chọn Tour hợp lệ.");
      return;
    }

    const payload = {
      tour_id: Number(tourId),
      customer_name: customerName,
      rating: Number(rating),
      comment: comment || null,
      is_approved: isApproved
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/reviews/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/reviews/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsFormOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        appToast(errData.detail || "Lưu thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Gặp lỗi khi lưu.");
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>⭐ Quản lý Đánh giá tour du lịch</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary" disabled={tours.length === 0}>
            ➕ Thêm đánh giá thủ công
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa đánh giá" : "➕ Thêm đánh giá mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="tourSelect">Tour du lịch</label>
            <select
              id="tourSelect"
              value={tourId}
              onChange={(e) => setTourId(Number(e.target.value))}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
                fontSize: "0.98rem",
              }}
              required
            >
              {tours.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="customerName">Tên khách hàng</label>
            <input type="text" id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Ví dụ: Nguyễn Văn A" />
          </div>

          <div className="form-group">
            <label htmlFor="ratingSelect">Đánh giá sao (1-5)</label>
            <select
              id="ratingSelect"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
                fontSize: "0.98rem",
              }}
              required
            >
              <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
              <option value="4">⭐⭐⭐⭐ (4 sao)</option>
              <option value="3">⭐⭐⭐ (3 sao)</option>
              <option value="2">⭐⭐ (2 sao)</option>
              <option value="1">⭐ (1 sao)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reviewComment">Bình luận/Nhận xét</label>
            <textarea
              id="reviewComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập ý kiến đánh giá của khách..."
              rows={3}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
                fontFamily: "inherit",
                fontSize: "0.98rem",
              }}
              required
            />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" id="reviewApproved" checked={isApproved} onChange={(e) => setIsApproved(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            <label htmlFor="reviewApproved" style={{ cursor: "pointer", fontWeight: 700 }}>Duyệt hiển thị (Public)</label>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit" className="admin-btn-primary" style={{ flex: 1, justifyContent: "center" }}>Lưu thay đổi</button>
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn-view-site" style={{ flex: 1, justifyContent: "center" }}>Hủy</button>
          </div>
        </form>
      ) : (
        <>
          {error && <div className="auth-message error">{error}</div>}
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><div className="admin-spinner"></div></div>
          ) : reviews.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có đánh giá nào được gửi.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tour</th>
                    <th>Khách hàng</th>
                    <th>Sao</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tours.find(t => t.id === item.tour_id)?.title || <span style={{ color: "red" }}>Tour đã bị xóa</span>}
                      </td>
                      <td><strong>{item.customer_name}</strong></td>
                      <td><span style={{ color: "#facc15" }}>{"★".repeat(item.rating)}</span></td>
                      <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.comment}</td>
                      <td>
                        <button
                          onClick={() => handleApproveToggle(item)}
                          className={`badge ${item.is_approved ? "badge-confirmed" : "badge-pending"}`}
                          style={{ border: "none", cursor: "pointer" }}
                        >
                          {item.is_approved ? "Đã duyệt" : "Chờ duyệt"}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => handleOpenEdit(item)} className="btn-action" title="Sửa">✏️</button>
                        <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete" title="Xóa">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
