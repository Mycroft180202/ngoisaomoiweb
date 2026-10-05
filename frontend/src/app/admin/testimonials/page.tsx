"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Testimonial {
  id: number;
  customer_name: string;
  customer_role?: string;
  avatar_url?: string;
  rating: number;
  comment: string;
  is_active: boolean;
}

export default function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerRole, setCustomerRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/testimonials/");
      if (!res.ok) throw new Error("Không thể tải danh sách cảm nhận khách hàng");
      const data = await res.json();
      setTestimonials(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setCustomerName("");
    setCustomerRole("");
    setAvatarUrl("");
    setRating(5);
    setComment("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Testimonial) => {
    setEditId(item.id);
    setCustomerName(item.customer_name);
    setCustomerRole(item.customer_role || "");
    setAvatarUrl(item.avatar_url || "");
    setRating(item.rating);
    setComment(item.comment);
    setIsActive(item.is_active);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/news/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Tải ảnh lên thất bại.");
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      return;
    }

    const payload = {
      customer_name: customerName,
      customer_role: customerRole || null,
      avatar_url: avatarUrl || null,
      rating,
      comment,
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/testimonials/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/testimonials/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Không thể lưu ý kiến đánh giá.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchTestimonials();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa cảm nhận khách hàng này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/testimonials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchTestimonials();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Ý kiến / Cảm nhận khách hàng</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm ý kiến mới
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : testimonials.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có ý kiến khách hàng nào được đăng.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
          {testimonials.map((item) => (
            <div key={item.id} className="admin-card" style={{
              display: "flex", flexDirection: "column", border: "1px solid var(--border)",
              borderRadius: "0.85rem", background: "white", padding: "1.5rem", justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                  <img src={item.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} alt={item.customer_name} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "50%", border: "1px solid #cbd5e1" }} />
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 700 }}>{item.customer_name}</h5>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{item.customer_role || "Khách hàng"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.1rem", color: "#eab308", marginBottom: "0.8rem" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ fontSize: "1rem" }}>{i < Math.round(item.rating) ? "★" : "☆"}</span>
                  ))}
                </div>
                <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "#334155", lineHeight: 1.5, margin: 0 }}>
                  "{item.comment}"
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.2rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.8rem" }}>
                <span style={{ fontSize: "0.8rem" }}>
                  {item.is_active ? "🟢 Đang hiển thị" : "🔴 Đang ẩn"}
                </span>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => handleOpenEdit(item)} className="btn-action">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1000
        }}>
          <div className="admin-panel" style={{ width: "90%", maxWidth: "550px", padding: "2rem", borderRadius: "1rem" }}>
            <h4>{editId ? "✏️ Chỉnh sửa cảm nhận" : "➕ Thêm cảm nhận mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Tên khách hàng</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Đánh giá (Sao)</label>
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{
                    width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                    padding: "0.9rem 1.1rem", background: "white"
                  }}>
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                    <option value={3}>⭐⭐⭐ (3/5)</option>
                    <option value={2}>⭐⭐ (2/5)</option>
                    <option value={1}>⭐ (1/5)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Vai trò / Danh xưng khách hàng</label>
                <input type="text" value={customerRole} onChange={(e) => setCustomerRole(e.target.value)} placeholder="Ví dụ: Du khách từ Hà Nội, Giám đốc doanh nghiệp" />
              </div>

              <div className="form-group">
                <label>Ảnh đại diện Avatar (URL hoặc tải lên)</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Đường dẫn ảnh..." style={{ flexGrow: 1 }} />
                  <label style={{
                    padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "1px solid #cbd5e1",
                    borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {uploading ? "Tải lên..." : "📁 Tải ảnh"}
                    <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Lời nhận xét / Ý kiến phản hồi</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nhập lời nhận xét chi tiết của khách hàng về chất lượng dịch vụ..." rows={4} style={{
                  width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                  padding: "0.9rem 1.1rem", background: "white", fontFamily: "inherit"
                }} required />
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Cho phép hiển thị lên trang chủ</label>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="admin-btn-primary" style={{ flexGrow: 1 }}>Lưu cảm nhận</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-view-site" style={{ padding: "0.9rem 1.5rem" }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
