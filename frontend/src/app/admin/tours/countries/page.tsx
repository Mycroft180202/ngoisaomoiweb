"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Country {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  continent?: string | null;
}

export default function CountriesAdmin() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [continent, setContinent] = useState("");

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/countries/");
      if (!res.ok) throw new Error("Không thể tải danh sách quốc gia.");
      const data = await res.json();
      setCountries(data);
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
    setImage("");
    setContinent("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Country) => {
    setEditId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setImage(item.image || "");
    setContinent(item.continent || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa quốc gia này không? Tất cả tỉnh thành liên quan sẽ bị ảnh hưởng.")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/countries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCountries(countries.filter(c => c.id !== id));
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

    const payload = { name, slug, image: image || null, continent: continent || null };
    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/countries/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/countries/", {
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
        fetchCountries();
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
        <h3>🌏 Quản lý danh sách Quốc gia</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Thêm quốc gia mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa Quốc gia" : "➕ Thêm quốc gia mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="countryName">Tên quốc gia</label>
            <input type="text" id="countryName" value={name} onChange={(e) => handleNameChange(e.target.value)} required placeholder="Ví dụ: Việt Nam, Nhật Bản..." />
          </div>

          <div className="form-group">
            <label htmlFor="countrySlug">Đường dẫn Slug</label>
            <input type="text" id="countrySlug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="viet-nam" />
          </div>

          <div className="form-group">
            <label htmlFor="countryImage">Hình ảnh tiêu biểu (URL)</label>
            <input type="text" id="countryImage" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://images.unsplash.com/..." />
          </div>

          <div className="form-group">
            <label htmlFor="countryContinent">Châu lục</label>
            <select
              id="countryContinent"
              value={continent}
              onChange={(e) => setContinent(e.target.value)}
              required
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
                fontSize: "0.98rem",
              }}
            >
              <option value="">-- Chọn châu lục --</option>
              <option value="Châu Á">Châu Á</option>
              <option value="Châu Âu">Châu Âu</option>
              <option value="Châu Úc">Châu Úc</option>
              <option value="Châu Mỹ - Châu Phi">Châu Mỹ - Châu Phi</option>
            </select>
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
          ) : countries.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có quốc gia nào được cấu hình.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên quốc gia</th>
                    <th>Châu lục</th>
                    <th>Slug</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td>
                        {item.image ? (
                          <img src={item.image} alt={item.name} style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "0.25rem", border: "1px solid #cbd5e1" }} />
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Không có</span>
                        )}
                      </td>
                      <td><strong>{item.name}</strong></td>
                      <td><span className="badge" style={{ background: "#f1f5f9", color: "#334155", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.8rem", fontWeight: 600 }}>{item.continent || "Châu Á"}</span></td>
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
