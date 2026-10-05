"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Province {
  id: number;
  name: string;
}

interface Attraction {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  province_id: number;
  province?: Province;
}

export default function AttractionsAdmin() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [provinceId, setProvinceId] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const provincesRes = await fetch("http://localhost:8000/api/provinces/");
      const provincesData = provincesRes.ok ? await provincesRes.json() : [];
      setProvinces(provincesData);
      if (provincesData.length > 0) setProvinceId(provincesData[0].id);

      const res = await fetch("http://localhost:8000/api/attractions/");
      if (!res.ok) throw new Error("Không thể tải danh sách địa điểm.");
      const data = await res.json();
      setAttractions(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editId) {
      const generatedSlug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setSlug(generatedSlug);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    if (provinces.length > 0) setProvinceId(provinces[0].id);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Attraction) => {
    setEditId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description || "");
    setImage(item.image || "");
    setProvinceId(item.province_id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa địa điểm du lịch này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/attractions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAttractions(attractions.filter(a => a.id !== id));
      } else {
        appToast("Xóa thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    if (!provinceId) {
      appToast("Vui lòng chọn tỉnh thành hợp lệ.");
      return;
    }

    const payload = { name, slug, description: description || null, image: image || null, province_id: Number(provinceId) };
    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/attractions/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/attractions/", {
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
        <h3>🗺️ Quản lý Địa điểm du lịch</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary" disabled={provinces.length === 0}>
            ➕ Thêm địa điểm mới
          </button>
        )}
      </div>

      {provinces.length === 0 && !loading && (
        <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>
          ⚠️ Bạn cần cấu hình ít nhất một Tỉnh / Thành phố trước khi thêm Địa điểm du lịch.
        </div>
      )}

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa địa điểm" : "➕ Thêm địa điểm mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="provinceSelect">Thuộc tỉnh/thành phố</label>
            <select
              id="provinceSelect"
              value={provinceId}
              onChange={(e) => setProvinceId(Number(e.target.value))}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "var(--public-surface, white)",
                fontSize: "0.98rem",
              }}
              required
            >
              {provinces.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="attractionName">Tên địa điểm du lịch</label>
            <input type="text" id="attractionName" value={name} onChange={(e) => handleNameChange(e.target.value)} required placeholder="Ví dụ: Bà Nà Hills, Hồ Hoàn Kiếm..." />
          </div>

          <div className="form-group">
            <label htmlFor="attractionSlug">Đường dẫn Slug</label>
            <input type="text" id="attractionSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="ba-na-hills" />
          </div>

          <div className="form-group">
            <label htmlFor="attractionImage">Hình ảnh tiêu biểu (URL)</label>
            <input type="text" id="attractionImage" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://images.unsplash.com/..." />
          </div>

          <div className="form-group">
            <label htmlFor="attractionDesc">Mô tả địa điểm</label>
            <textarea
              id="attractionDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập giới thiệu ngắn gọn..."
              rows={3}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "var(--public-surface, white)",
                fontFamily: "inherit",
                fontSize: "0.98rem",
              }}
            />
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
          ) : attractions.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có địa điểm du lịch nào được gieo.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên địa điểm</th>
                    <th>Thuộc Tỉnh/TP</th>
                    <th>Slug</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {attractions.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td>
                        {item.image ? (
                          <img src={item.image} alt={item.name} style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "0.25rem", border: "1px solid var(--public-border, #cbd5e1)" }} />
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Không có</span>
                        )}
                      </td>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.province?.name || <span style={{ color: "red" }}>Chưa phân loại</span>}</td>
                      <td><code>{item.slug}</code></td>
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
