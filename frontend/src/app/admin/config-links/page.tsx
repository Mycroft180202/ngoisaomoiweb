"use client";

import { useEffect, useState } from "react";

interface QuickLinkItem {
  id: string;
  title: string;
  url: string;
}

export default function ConfigLinksPage() {
  const [links, setLinks] = useState<QuickLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New item form states
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/settings/config_quick_links");
      if (!res.ok) {
        if (res.status === 404) {
          // Defaults if none exist
          setLinks([
            { id: "1", title: "Điều khoản dịch vụ", url: "/terms" },
            { id: "2", title: "Chính sách bảo mật", url: "/privacy" },
            { id: "3", title: "Hướng dẫn đặt tour", url: "/guide" }
          ]);
          setLoading(false);
          return;
        }
        throw new Error("Không thể tải cấu hình links.");
      }
      const data = await res.json();
      if (data && data.value) {
        const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setLinks(Array.isArray(val) ? val : []);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUrl) return;

    const newItem: QuickLinkItem = {
      id: Date.now().toString(),
      title: newTitle,
      url: newUrl
    };

    setLinks(prev => [...prev, newItem]);
    setNewTitle("");
    setNewUrl("");
  };

  const handleRemoveLink = (id: string) => {
    setLinks(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/api/settings/config_quick_links?value=${encodeURIComponent(JSON.stringify(links))}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình liên kết thất bại.");
      setSuccess("Cấu hình Quick Links đã được cập nhật thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="admin-panel-header">
        <h3>🔗 Quản lý Quick Links (Liên kết nhanh ở chân trang)</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <div className="admin-card" style={{ padding: "1.5rem", border: "1px solid var(--border)", borderRadius: "0.85rem", background: "white", marginBottom: "2rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontWeight: 700 }}>Thêm liên kết mới</h4>
        <form onSubmit={handleAddLink} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flexGrow: 1, marginBottom: 0, minWidth: "180px" }}>
            <label style={{ fontSize: "0.8rem" }}>Tiêu đề liên kết</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Chính sách bảo mật" style={{ padding: "0.6rem 1rem" }} required />
          </div>
          <div className="form-group" style={{ flexGrow: 1, marginBottom: 0, minWidth: "180px" }}>
            <label style={{ fontSize: "0.8rem" }}>Đường dẫn URL / Slug</label>
            <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="/privacy" style={{ padding: "0.6rem 1rem" }} required />
          </div>
          <button type="submit" className="admin-btn-primary" style={{ padding: "0.75rem 1.5rem" }}>➕ Thêm</button>
        </form>
      </div>

      <div className="admin-table-container" style={{ background: "white" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Đường dẫn liên kết</th>
              <th style={{ width: "80px" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
                  Chưa có liên kết nào được cấu hình.
                </td>
              </tr>
            ) : (
              links.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td><code>{item.url}</code></td>
                  <td>
                    <button type="button" onClick={() => handleRemoveLink(item.id)} className="btn-action btn-delete" title="Xóa liên kết">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        className="admin-btn-primary"
        style={{ width: "100%", padding: "0.9rem", marginTop: "2rem" }}
        disabled={saving}
      >
        {saving ? "Đang lưu..." : "Lưu danh sách liên kết"}
      </button>
    </div>
  );
}
