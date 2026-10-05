"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface AdBanner {
  id: number;
  title?: string;
  image_url: string;
  media_type?: "image" | "video";
  media_url?: string;
  poster_url?: string;
  link_url?: string;
  position: string;
  order_index: number;
  is_active: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  show_close_button?: boolean;
  open_in_new_tab?: boolean;
  start_at?: string;
  end_at?: string;
}

export default function BannersManager() {
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [position, setPosition] = useState("home_sidebar");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [loop, setLoop] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  async function fetchBanners() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/banners/");
      if (!res.ok) throw new Error("Không thể tải danh sách banner");
      const data = await res.json();
      setBanners(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchBanners(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setTitle("");
    setImageUrl("");
    setMediaType("image"); setMediaUrl(""); setPosterUrl("");
    setLinkUrl("");
    setPosition("home_sidebar");
    setOrderIndex(0);
    setIsActive(true);
    setAutoplay(true); setLoop(true); setShowCloseButton(true);
    setStartAt(""); setEndAt("");
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AdBanner) => {
    setEditId(item.id);
    setTitle(item.title || "");
    setImageUrl(item.image_url);
    setMediaType(item.media_type || "image"); setMediaUrl(item.media_url || item.image_url); setPosterUrl(item.poster_url || "");
    setLinkUrl(item.link_url || "");
    setPosition(item.position);
    setOrderIndex(item.order_index);
    setIsActive(item.is_active);
    setAutoplay(item.autoplay !== false); setLoop(item.loop !== false); setShowCloseButton(item.show_close_button !== false);
    setStartAt(item.start_at ? item.start_at.slice(0, 16) : ""); setEndAt(item.end_at ? item.end_at.slice(0, 16) : "");
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
      const res = await fetch("http://localhost:8000/api/banners/upload-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Tải ảnh lên thất bại.");
      const data = await res.json();
      setMediaUrl(data.url); setMediaType(data.media_type);
      if (data.media_type === "image") setImageUrl(data.url);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Lỗi tải ảnh lên.");
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

    if (!mediaUrl && !imageUrl) {
      setFormError("Vui lòng tải hoặc điền URL nội dung quảng cáo.");
      return;
    }

    const payload = {
      title: title || null,
      image_url: imageUrl || posterUrl || mediaUrl,
      media_type: mediaType,
      media_url: mediaUrl || imageUrl,
      poster_url: posterUrl || null,
      link_url: linkUrl || null,
      position,
      order_index: orderIndex,
      is_active: isActive,
      autoplay, muted: true, loop, show_close_button: showCloseButton, open_in_new_tab: true,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      end_at: endAt ? new Date(endAt).toISOString() : null
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/banners/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/banners/", {
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
        throw new Error(errData.detail || "Không thể lưu banner quảng cáo.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchBanners();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Không thể lưu quảng cáo.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa quảng cáo này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/banners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchBanners();
    } catch (err: unknown) {
      appToast(err instanceof Error ? err.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Banners quảng cáo</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm quảng cáo
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : banners.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có banner quảng cáo nào.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Tiêu đề quảng cáo</th>
                <th>Vị trí hiển thị</th>
                <th>Liên kết</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((item) => (
                <tr key={item.id}>
                  <td>
                    {(item.media_type === "video") ? <video src={item.media_url || item.image_url} muted style={{ width: 100, height: 60, objectFit: "cover", borderRadius: ".4rem" }} /> : <img src={item.media_url || item.image_url} alt={item.title || "Banner"} style={{ width: "100px", height: "50px", objectFit: "cover", borderRadius: "0.4rem" }} />}
                  </td>
                  <td><strong>{item.title || "Không tiêu đề"}</strong></td>
                  <td><code>{item.position}</code></td>
                  <td><code>{item.link_url || "-"}</code></td>
                  <td>{item.is_active ? "🟢 Đang chạy" : "🔴 Đang ẩn"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button onClick={() => handleOpenEdit(item)} className="btn-action">✏️</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1000
        }}>
          <div className="admin-panel" style={{ width: "90%", maxWidth: "550px", padding: "2rem", borderRadius: "1rem" }}>
            <h4>{editId ? "✏️ Chỉnh sửa quảng cáo" : "➕ Thêm quảng cáo mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tên / Tiêu đề quảng cáo</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Banner sidebar trang chủ" />
              </div>
              <div className="form-group">
                <label>Loại quảng cáo</label>
                <select value={mediaType} onChange={(e) => setMediaType(e.target.value as "image" | "video")}><option value="image">Ảnh</option><option value="video">Video</option></select>
              </div>
              <div className="form-group">
                <label>Ảnh/Video quảng cáo (URL hoặc tải lên)</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="text" value={mediaUrl} onChange={(e) => { setMediaUrl(e.target.value); if (mediaType === "image") setImageUrl(e.target.value); }} placeholder="Đường dẫn ảnh hoặc video..." required style={{ flexGrow: 1 }} />
                  <label style={{
                    padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "1px solid #cbd5e1",
                    borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {uploading ? "Đang tải..." : "📁 Tải tệp"}
                    <input type="file" accept="image/*,video/mp4,video/webm" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>URL liên kết đích (khi click)</label>
                <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Ví dụ: /khuyen-mai" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Vị trí quảng cáo</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} style={{
                    width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                    padding: "0.9rem 1.1rem", background: "white"
                  }}>
                    <option value="home_sidebar">Sidebar trang chủ</option>
                    <option value="home_between_sections">Giữa Hero và section thứ hai</option>
                    <option value="home_top">Đầu trang chủ</option>
                    <option value="footer_banner">Footer Banner</option>
                    <option value="left_rail">Sát bên trái website</option>
                    <option value="right_rail">Sát bên phải website</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Thứ tự hiển thị</label>
                  <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} required />
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Bật hiển thị quảng cáo</label>
              </div>
              {mediaType === "video" && <>
                <div className="form-group"><label>Ảnh poster video (URL, không bắt buộc)</label><input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} /></div>
                <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                  <label><input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} style={{ width: "auto" }} /> Tự phát (tắt tiếng)</label>
                  <label><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} style={{ width: "auto" }} /> Phát lặp</label>
                </div>
              </>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group"><label>Bắt đầu hiển thị</label><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
                <div className="form-group"><label>Kết thúc hiển thị</label><input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
              </div>
              <label><input type="checkbox" checked={showCloseButton} onChange={(e) => setShowCloseButton(e.target.checked)} style={{ width: "auto" }} /> Cho phép người dùng đóng quảng cáo</label>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="admin-btn-primary" style={{ flexGrow: 1 }}>Lưu quảng cáo</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-view-site" style={{ padding: "0.9rem 1.5rem" }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
