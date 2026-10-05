"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface CarouselSlide {
  id: number;
  title?: string;
  subtitle?: string;
  image_url: string;
  tour_image_url?: string;
  link_url?: string;
  order_index: number;
  is_active: boolean;
}

export default function SlidesManager() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tourImageUrl, setTourImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tourUploading, setTourUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/slides/");
      if (!res.ok) throw new Error("Không thể tải danh sách slide");
      const data = await res.json();
      setSlides(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setTourImageUrl("");
    setLinkUrl("");
    setOrderIndex(0);
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CarouselSlide) => {
    setEditId(item.id);
    setTitle(item.title || "");
    setSubtitle(item.subtitle || "");
    setImageUrl(item.image_url);
    setTourImageUrl(item.tour_image_url || "");
    setLinkUrl(item.link_url || "");
    setOrderIndex(item.order_index);
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
      setImageUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadTourImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTourUploading(true);
    setFormError(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      setTourUploading(false);
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
      setTourImageUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setTourUploading(false);
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

    if (!imageUrl) {
      setFormError("Vui lòng chọn hoặc tải ảnh lên.");
      return;
    }

    const payload = {
      title: title || null,
      subtitle: subtitle || null,
      image_url: imageUrl,
      tour_image_url: tourImageUrl || null,
      link_url: linkUrl || null,
      order_index: orderIndex,
      is_active: isActive,
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/slides/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/slides/", {
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
        throw new Error(errData.detail || "Không thể lưu slide.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchSlides();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa slide này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/slides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchSlides();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Slide ảnh trang chủ</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm slide mới
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : slides.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có slide nào được tạo.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
          {slides.map((item) => (
            <div key={item.id} className="admin-card" style={{
              display: "flex", flexDirection: "column", border: "1px solid var(--border)",
              borderRadius: "0.85rem", overflow: "hidden", background: "var(--public-surface, white)"
            }}>
              <img src={item.image_url} alt={item.title || "Slide image"} style={{ width: "100%", height: "160px", objectFit: "cover" }} />
              <div style={{ padding: "1.2rem", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>{item.title || "Không có tiêu đề"}</h4>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>{item.subtitle || "Không có phụ đề"}</p>
                  <p style={{ fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🖼️ Ảnh Tour: <code>{item.tour_image_url || "Không có"}</code>
                  </p>
                  <p style={{ fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🔗 Link: <code>{item.link_url || "Không có"}</code>
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.8rem" }}>
                  <span style={{ fontSize: "0.8rem" }}>
                    Thứ tự: <strong>{item.order_index}</strong> | {item.is_active ? "🟢 Hiện" : "🔴 Ẩn"}
                  </span>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button onClick={() => handleOpenEdit(item)} className="btn-action">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete">🗑️</button>
                  </div>
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
            <h4>{editId ? "✏️ Chỉnh sửa slide" : "➕ Thêm slide mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tiêu đề chính (Title)</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Du lịch Phú Quốc" />
              </div>
              <div className="form-group">
                <label>Tiêu đề phụ (Subtitle)</label>
                <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ví dụ: Giảm giá 30% khi đặt trong tuần" />
              </div>
              <div className="form-group">
                <label>Ảnh Slide (URL hoặc tải lên)</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Đường dẫn ảnh..." required style={{ flexGrow: 1 }} />
                  <label style={{
                    padding: "0.75rem 1.25rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #cbd5e1)",
                    borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {uploading ? "Tải lên..." : "📁 Tải lên"}
                    <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Ảnh đại diện Tour (URL hoặc tải lên)</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="text" value={tourImageUrl} onChange={(e) => setTourImageUrl(e.target.value)} placeholder="Đường dẫn ảnh đại diện..." style={{ flexGrow: 1 }} />
                  <label style={{
                    padding: "0.75rem 1.25rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #cbd5e1)",
                    borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {tourUploading ? "Tải lên..." : "📁 Tải lên"}
                    <input type="file" accept="image/*" onChange={handleUploadTourImage} style={{ display: "none" }} disabled={tourUploading} />
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>URL liên kết khi click</label>
                <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Ví dụ: /tours/phu-quoc" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Số thứ tự sắp xếp</label>
                  <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} required />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.8rem" }}>
                  <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                  <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Hiển thị slide này</label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="admin-btn-primary" style={{ flexGrow: 1 }}>Lưu</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-view-site" style={{ padding: "0.9rem 1.5rem" }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
