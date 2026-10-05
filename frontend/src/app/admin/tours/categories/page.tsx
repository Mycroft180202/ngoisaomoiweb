"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/categories/");
      if (!res.ok) throw new Error("Không thể tải danh sách danh mục.");
      const data = await res.json();
      setCategories(data);
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
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Category) => {
    setEditId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa danh mục này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
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

    const payload = { name, slug, description: description || null };
    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/categories/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/categories/", {
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
        fetchCategories();
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
        <h3>📁 Quản lý Danh mục tour</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Thêm danh mục mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa danh mục" : "➕ Thêm danh mục mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="catName">Tên danh mục</label>
            <input type="text" id="catName" value={name} onChange={(e) => handleNameChange(e.target.value)} required placeholder="Ví dụ: Tour ghép đoàn, Tour trọn gói..." />
          </div>

          <div className="form-group">
            <label htmlFor="catSlug">Đường dẫn Slug</label>
            <input type="text" id="catSlug" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="tour-ghep-doan" />
          </div>

          <div className="form-group">
            <label htmlFor="catDesc">Mô tả danh mục</label>
            <textarea
              id="catDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả giới thiệu danh mục..."
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
          ) : categories.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có danh mục nào.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tên danh mục</th>
                    <th>Slug</th>
                    <th>Mô tả</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td><strong>{item.name}</strong></td>
                      <td><code>{item.slug}</code></td>
                      <td>{item.description || <span style={{ color: "var(--muted)" }}>Không có</span>}</td>
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
