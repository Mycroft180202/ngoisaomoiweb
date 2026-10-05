"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Country {
  id: number;
  name: string;
}

interface Province {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  region?: string | null;
  country_id: number;
  country?: Country;
}

export default function ProvincesAdmin() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [region, setRegion] = useState("");
  const [countryId, setCountryId] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const countriesRes = await fetch("http://localhost:8000/api/countries/");
      const countriesData = countriesRes.ok ? await countriesRes.json() : [];
      setCountries(countriesData);
      if (countriesData.length > 0) setCountryId(countriesData[0].id);

      const res = await fetch("http://localhost:8000/api/provinces/");
      if (!res.ok) throw new Error("Không thể tải danh sách tỉnh thành.");
      const data = await res.json();
      setProvinces(data);
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
    setRegion("");
    if (countries.length > 0) setCountryId(countries[0].id);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Province) => {
    setEditId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setImage(item.image || "");
    setRegion(item.region || "");
    setCountryId(item.country_id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa tỉnh thành này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/provinces/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProvinces(provinces.filter(p => p.id !== id));
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

    if (!countryId) {
      appToast("Vui lòng chọn quốc gia hợp lệ.");
      return;
    }

    const payload = { name, slug, image: image || null, region: region || null, country_id: Number(countryId) };
    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/provinces/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/provinces/", {
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
        <h3>📍 Quản lý danh sách Tỉnh / Thành phố</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary" disabled={countries.length === 0}>
            ➕ Thêm tỉnh thành mới
          </button>
        )}
      </div>

      {countries.length === 0 && !loading && (
        <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>
          ⚠️ Bạn cần cấu hình ít nhất một Quốc gia trước khi thêm Tỉnh thành.
        </div>
      )}

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa Tỉnh thành" : "➕ Thêm tỉnh thành mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="countrySelect">Thuộc quốc gia</label>
            <select
              id="countrySelect"
              value={countryId}
              onChange={(e) => setCountryId(Number(e.target.value))}
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
              {countries.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="provinceName">Tên tỉnh/thành phố</label>
            <input type="text" id="provinceName" value={name} onChange={(e) => handleNameChange(e.target.value)} required placeholder="Ví dụ: Hà Nội, Đà Nẵng..." />
          </div>

          <div className="form-group">
            <label htmlFor="provinceSlug">Đường dẫn Slug</label>
            <input type="text" id="provinceSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="da-nang" />
          </div>

          <div className="form-group">
            <label htmlFor="provinceImage">Hình ảnh tiêu biểu (URL)</label>
            <input type="text" id="provinceImage" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://images.unsplash.com/..." />
          </div>

          <div className="form-group">
            <label htmlFor="provinceRegion">Khu vực / Vùng miền (Đối với Việt Nam)</label>
            <select
              id="provinceRegion"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "var(--public-surface, white)",
                fontSize: "0.98rem",
              }}
            >
              <option value="">-- Chọn vùng miền --</option>
              <option value="Miền Bắc">Miền Bắc</option>
              <option value="Miền Trung">Miền Trung</option>
              <option value="Miền Nam">Miền Nam</option>
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
          ) : provinces.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có tỉnh/thành phố nào được cấu hình.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên tỉnh thành</th>
                    <th>Vùng miền</th>
                    <th>Quốc gia</th>
                    <th>Slug</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {provinces.map((item) => (
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
                      <td><span className="badge" style={{ background: "var(--public-surface-soft, #f1f5f9)", color: "var(--public-text-strong, #334155)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.8rem", fontWeight: 600 }}>{item.region || "Chưa chọn"}</span></td>
                      <td>{item.country?.name || <span style={{ color: "red" }}>Chưa phân loại</span>}</td>
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
