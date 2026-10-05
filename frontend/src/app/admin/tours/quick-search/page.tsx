"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface QuickSearch {
  id: number;
  keyword: string;
  link_url: string;
  order_index: number;
  is_active: boolean;
}

export default function QuickSearchAdmin() {
  const [quickSearches, setQuickSearches] = useState<QuickSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchQuickSearches();
  }, []);

  const fetchQuickSearches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/quick-searches/");
      if (!res.ok) throw new Error("Không thể tải danh sách tìm kiếm nhanh.");
      const data = await res.json();
      setQuickSearches(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setKeyword("");
    setLinkUrl("");
    setOrderIndex(quickSearches.length + 1);
    setIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: QuickSearch) => {
    setEditId(item.id);
    setKeyword(item.keyword);
    setLinkUrl(item.link_url);
    setOrderIndex(item.order_index);
    setIsActive(item.is_active);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa từ khóa này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/quick-searches/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuickSearches(quickSearches.filter(q => q.id !== id));
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

    const payload = {
      keyword,
      link_url: linkUrl || "#booking",
      order_index: Number(orderIndex),
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/quick-searches/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/quick-searches/", {
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
        fetchQuickSearches();
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
        <h3>🔍 Quản lý Tìm nhanh trang chủ</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Thêm từ khóa mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa từ khóa" : "➕ Thêm từ khóa mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="quickKeyword">Từ khóa tìm nhanh</label>
            <input type="text" id="quickKeyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} required placeholder="Ví dụ: Phú Quốc, Sapa, Đà Nẵng..." />
          </div>

          <div className="form-group">
            <label htmlFor="quickLink">Đường dẫn liên kết (Link URL)</label>
            <input type="text" id="quickLink" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="#booking (hoặc đường dẫn cụ thể)" />
          </div>

          <div className="form-group">
            <label htmlFor="quickOrder">Thứ tự hiển thị</label>
            <input type="number" id="quickOrder" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} required min={0} />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" id="quickActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            <label htmlFor="quickActive" style={{ cursor: "pointer", fontWeight: 700 }}>Hiển thị ở trang chủ</label>
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
          ) : quickSearches.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có từ khóa tìm nhanh nào.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Thứ tự</th>
                    <th>Từ khóa</th>
                    <th>Đường dẫn liên kết</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {quickSearches.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.order_index}</strong></td>
                      <td><strong>{item.keyword}</strong></td>
                      <td><code>{item.link_url}</code></td>
                      <td>
                        <span className={`badge ${item.is_active ? "badge-confirmed" : "badge-pending"}`}>
                          {item.is_active ? "Hiển thị" : "Ẩn"}
                        </span>
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
