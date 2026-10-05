"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Guide {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  bio: string | null;
}

export default function GuidesAdmin() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/guides/");
      if (!res.ok) throw new Error("Không thể tải danh sách hướng dẫn viên.");
      const data = await res.json();
      setGuides(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName("");
    setPhone("");
    setEmail("");
    setAvatar("");
    setBio("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Guide) => {
    setEditId(item.id);
    setName(item.name);
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setAvatar(item.avatar || "");
    setBio(item.bio || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa hướng dẫn viên này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/guides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setGuides(guides.filter(g => g.id !== id));
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
      name,
      phone: phone || null,
      email: email || null,
      avatar: avatar || null,
      bio: bio || null
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/guides/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/guides/", {
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
        fetchGuides();
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
        <h3>👤 Quản lý Thông tin hướng dẫn viên</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Thêm hướng dẫn viên mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa thông tin" : "➕ Thêm hướng dẫn viên"}</h4>
          
          <div className="form-group">
            <label htmlFor="guideName">Họ và tên</label>
            <input type="text" id="guideName" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nguyễn Văn A" />
          </div>

          <div className="form-group">
            <label htmlFor="guidePhone">Số điện thoại</label>
            <input type="text" id="guidePhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
          </div>

          <div className="form-group">
            <label htmlFor="guideEmail">Email liên hệ</label>
            <input type="email" id="guideEmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guide@newstartour.vn" />
          </div>

          <div className="form-group">
            <label htmlFor="guideAvatar">Ảnh đại diện (URL)</label>
            <input type="text" id="guideAvatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
          </div>

          <div className="form-group">
            <label htmlFor="guideBio">Tiểu sử ngắn / Giới thiệu</label>
            <textarea
              id="guideBio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Nhập thông tin giới thiệu về kinh nghiệm, thế mạnh hướng dẫn..."
              rows={3}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
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
          ) : guides.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có hướng dẫn viên nào.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Họ và tên</th>
                    <th>Điện thoại</th>
                    <th>Email</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #cbd5e1" }}>
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            "👤"
                          )}
                        </div>
                      </td>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.phone || <span style={{ color: "var(--muted)" }}>Chưa bổ sung</span>}</td>
                      <td>{item.email || <span style={{ color: "var(--muted)" }}>Chưa bổ sung</span>}</td>
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
