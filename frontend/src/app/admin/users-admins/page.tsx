"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  is_admin: boolean;
  role: string;
  created_at: string;
}

export default function AdminsManager() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState("editor"); // super_admin, editor
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleFullName, setSaleFullName] = useState("");
  const [saleEmail, setSaleEmail] = useState("");
  const [salePhone, setSalePhone] = useState("");
  const [saleCreating, setSaleCreating] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleResult, setSaleResult] = useState<User | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/users/admins", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách tài khoản quản trị");
      const data = await res.json();
      setAdmins(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setEmail("");
    setFullName("");
    setPhone("");
    setPassword("");
    setIsActive(true);
    setRole("editor");
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: User) => {
    setEditId(item.id);
    setEmail(item.email);
    setFullName(item.full_name || "");
    setPhone(item.phone || "");
    setPassword("");
    setIsActive(item.is_active);
    setRole(item.role || "editor");
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

    const payload: any = {
      email,
      full_name: fullName || null,
      phone: phone || null,
      is_active: isActive,
      is_admin: true,
      role
    };

    if (password) {
      payload.password = password;
    } else if (!editId) {
      setFormError("Mật khẩu là bắt buộc đối với tài khoản mới.");
      return;
    }

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/users/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/users/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Không thể lưu thông tin.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo admin mới thành công!");
      fetchAdmins();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa tài khoản quản trị này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchAdmins();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  const openSaleModal = () => {
    setSaleFullName(""); setSaleEmail(""); setSalePhone("");
    setSaleError(""); setSaleResult(null); setSaleModalOpen(true);
  };

  const handleAutoCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const full_name = saleFullName.trim();
    if (!full_name) return setSaleError("Vui lòng nhập đầy đủ họ và tên nhân viên.");
    const token = localStorage.getItem("admin_token");
    setSaleCreating(true); setSaleError("");
    try {
      const res = await fetch("http://localhost:8000/api/users/sales/auto", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name, email: saleEmail.trim() || null, phone: salePhone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể tạo tài khoản Sale");
      setSaleResult(data); fetchAdmins();
    } catch (err: any) { setSaleError(err.message || "Không thể tạo tài khoản Sale"); }
    finally { setSaleCreating(false); }
  };

  const usernamePreview = (() => {
    const normalized = saleFullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    const parts = normalized.match(/[A-Za-z0-9]+/g) || [];
    if (!parts.length) return "Tự động tạo sau khi nhập họ tên";
    const value = parts[parts.length - 1] + parts.slice(0, -1).map(part => part[0]).join("");
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  })();

  const filteredAdmins = admins.filter(a =>
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.full_name && a.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Danh sách tài khoản quản trị ({filteredAdmins.length})</h3>
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}><button onClick={openSaleModal} className="admin-btn-primary">⚡ Tạo nhanh Sale</button><button onClick={handleOpenAdd} className="admin-btn-primary">➕ Tạo tài khoản Admin</button></div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="🔍 Tìm kiếm admin theo email, tên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%", maxWidth: "400px", borderRadius: "0.5rem",
            border: "1px solid var(--public-border, #cbd5e1)", padding: "0.65rem 1rem", fontSize: "0.92rem"
          }}
        />
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Không tìm thấy tài khoản quản trị nào.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Tên đăng nhập</th>
                <th>Điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.full_name || "-"}</strong></td>
                  <td>{item.email}</td>
                  <td><strong>{item.username || "-"}</strong></td>
                  <td>{item.phone || "-"}</td>
                  <td>
                    <span style={{
                      fontWeight: 600, fontSize: "0.82rem", padding: "0.25rem 0.6rem", borderRadius: "0.5rem",
                      background: 
                        item.role === "super_admin" ? "var(--public-warning-surface, #fef3c7)" :
                        item.role === "manager" ? "var(--public-info-surface, #dbeafe)" :
                        item.role === "sale" ? "var(--public-success-surface, #dcfce7)" :
                        item.role === "support" ? "var(--public-refund-surface, #f3e8ff)" : "var(--public-border, #e2e8f0)",
                      color: 
                        item.role === "super_admin" ? "var(--public-warning-text, #d97706)" :
                        item.role === "manager" ? "var(--public-info-text, #1e40af)" :
                        item.role === "sale" ? "var(--public-success-text, #15803d)" :
                        item.role === "support" ? "var(--public-refund-text, #6b21a8)" : "var(--public-text, #475569)"
                    }}>
                      {
                        item.role === "super_admin" ? "🔑 Super Admin" : 
                        item.role === "manager" ? "💼 Manager" : 
                        item.role === "sale" ? "📈 Sale" : 
                        item.role === "support" ? "💬 Support" : "✍️ Editor"
                      }
                    </span>
                  </td>
                  <td>{item.is_active ? "🟢 Hoạt động" : "🔴 Khóa"}</td>
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
            <h4>{editId ? "✏️ Chỉnh sửa tài khoản Admin" : "➕ Thêm quản trị viên mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Email đăng nhập</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!editId} />
                </div>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" />
                </div>
                <div className="form-group">
                  <label>{editId ? "Mật khẩu mới (bỏ trống nếu giữ nguyên)" : "Mật khẩu"}</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editId} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Nhóm quyền (Vai trò)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={{
                    width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                    padding: "0.9rem 1.1rem", background: "var(--public-surface, white)"
                  }}>
                    <option value="super_admin">Super Admin (Toàn quyền hệ thống)</option>
                    <option value="manager">Manager (Quản lý nội dung & Bookings)</option>
                    <option value="sale">Sale (Nhân viên kinh doanh)</option>
                    <option value="support">Support (Trực web/CSKH)</option>
                    <option value="editor">Editor (Quyền biên tập nội dung)</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.8rem" }}>
                  <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                  <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Cho phép hoạt động</label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="admin-btn-primary" style={{ flexGrow: 1 }}>Lưu tài khoản</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-view-site" style={{ padding: "0.9rem 1.5rem" }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {saleModalOpen && (
        <div className="modal-overlay sale-account-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSaleModalOpen(false)}>
          <div className="sale-account-modal" role="dialog" aria-modal="true" aria-labelledby="sale-modal-title">
            <div className="sale-account-modal__header">
              <div className="sale-account-modal__icon">⚡</div>
              <div><p>TẠO TÀI KHOẢN NHANH</p><h3 id="sale-modal-title">Nhân viên Sale</h3></div>
              <button type="button" className="sale-account-modal__close" onClick={() => setSaleModalOpen(false)} aria-label="Đóng">×</button>
            </div>

            {saleResult ? (
              <div className="sale-account-result">
                <div className="sale-account-result__check">✓</div>
                <h4>Tạo tài khoản thành công</h4>
                <p>Gửi thông tin dưới đây cho <strong>{saleResult.full_name}</strong>. Nhân viên sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
                <div className="sale-credential-card">
                  <div><span>Tên đăng nhập</span><strong>{saleResult.username}</strong></div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(saleResult.username || "")}>Sao chép</button>
                  <div><span>Mật khẩu tạm thời</span><strong>12345678</strong></div>
                  <button type="button" onClick={() => navigator.clipboard.writeText("12345678")}>Sao chép</button>
                </div>
                <button type="button" className="admin-btn-primary sale-account-done" onClick={() => setSaleModalOpen(false)}>Hoàn tất</button>
              </div>
            ) : (
              <form onSubmit={handleAutoCreateSale} className="sale-account-form">
                <div className="sale-account-notice"><span>i</span><p>Hệ thống tự tạo username theo tên nhân viên. Mật khẩu tạm thời mặc định là <strong>12345678</strong>.</p></div>
                {saleError && <div className="auth-message error">{saleError}</div>}
                <label>Họ và tên nhân viên <b>*</b><input autoFocus type="text" value={saleFullName} onChange={e => setSaleFullName(e.target.value)} placeholder="Ví dụ: Đào Thị Vân Anh" required /></label>
                <div className="sale-username-preview"><span>Tên đăng nhập dự kiến</span><strong>{usernamePreview}</strong></div>
                <div className="sale-account-grid">
                  <label>Email cá nhân <small>(không bắt buộc)</small><input type="email" value={saleEmail} onChange={e => setSaleEmail(e.target.value)} placeholder="nhanvien@gmail.com" /></label>
                  <label>Số điện thoại <small>(không bắt buộc)</small><input type="tel" value={salePhone} onChange={e => setSalePhone(e.target.value)} placeholder="09xx xxx xxx" /></label>
                </div>
                <div className="sale-account-actions"><button type="button" className="sale-account-cancel" onClick={() => setSaleModalOpen(false)}>Hủy</button><button type="submit" className="admin-btn-primary" disabled={saleCreating}>{saleCreating ? "Đang tạo..." : "⚡ Tạo tài khoản Sale"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
