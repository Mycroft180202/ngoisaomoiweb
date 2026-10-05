"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface NavigationMenu {
  id: number;
  title: string;
  url: string;
  parent_id?: number;
  order_index: number;
  is_active: boolean;
}

export default function MenusManager() {
  const [flatMenus, setFlatMenus] = useState<NavigationMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/menus/flat");
      if (!res.ok) throw new Error("Không thể tải danh sách menu");
      const data = await res.json();
      setFlatMenus(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setTitle("");
    setUrl("");
    setParentId(undefined);
    setOrderIndex(0);
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: NavigationMenu) => {
    setEditId(item.id);
    setTitle(item.title);
    setUrl(item.url);
    setParentId(item.parent_id);
    setOrderIndex(item.order_index);
    setIsActive(item.is_active);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
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
      title,
      url,
      parent_id: parentId || null,
      order_index: orderIndex,
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/menus/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/menus/", {
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
        throw new Error(errData.detail || "Không thể lưu menu.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchMenus();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa menu này? Tất cả các menu con cũng sẽ bị xóa.")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/menus/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchMenus();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Menu điều hướng</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm menu mới
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : flatMenus.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có menu nào được tạo.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề menu</th>
                <th>URL liên kết</th>
                <th>Menu cha</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {flatMenus.map((item) => {
                const parent = flatMenus.find(m => m.id === item.parent_id);
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ paddingLeft: item.parent_id ? "1.5rem" : "0", fontWeight: item.parent_id ? "normal" : "bold" }}>
                        {item.parent_id ? "↳ " : ""} {item.title}
                      </span>
                    </td>
                    <td><code>{item.url}</code></td>
                    <td>{parent ? parent.title : <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Chính</span>}</td>
                    <td>{item.order_index}</td>
                    <td>{item.is_active ? "🟢 Đang hoạt động" : "🔴 Tạm ẩn"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button onClick={() => handleOpenEdit(item)} className="btn-action">✏️</button>
                        <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <div className="admin-panel" style={{ width: "90%", maxWidth: "500px", padding: "2rem", borderRadius: "1rem" }}>
            <h4>{editId ? "✏️ Chỉnh sửa menu" : "➕ Thêm menu mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tiêu đề hiển thị</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Trang chủ" required />
              </div>
              <div className="form-group">
                <label>URL đường dẫn</label>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ví dụ: / hoặc /tours" required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Menu cha (nếu có)</label>
                  <select value={parentId || ""} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : undefined)} style={{
                    width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                    padding: "0.9rem 1.1rem", background: "white"
                  }}>
                    <option value="">-- Cấp cao nhất --</option>
                    {flatMenus.filter(m => !m.parent_id && m.id !== editId).map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số thứ tự sắp xếp</label>
                  <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} required />
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Cho phép hoạt động</label>
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
