"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  is_admin: boolean;
  role: string;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState<User[]>([]);
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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/users/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách khách hàng");
      const data = await res.json();
      setCustomers(data);
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
    setPhoneVerified(false);
    setEmailVerified(false);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: User) => {
    setEditId(item.id);
    setEmail(item.email);
    setFullName(item.full_name || "");
    setPhone(item.phone || "");
    setPassword(""); // Do not populate password
    setIsActive(item.is_active);
    setPhoneVerified(item.phone_verified);
    setEmailVerified(item.email_verified);
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
      is_admin: false,
      role: "customer",
      phone_verified: phoneVerified,
      email_verified: emailVerified
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
        throw new Error(errData.detail || "Không thể lưu thông tin khách hàng.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Đăng ký thành công!");
      fetchCustomers();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa tài khoản khách hàng này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchCustomers();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.full_name && c.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Danh sách tài khoản khách hàng ({filteredCustomers.length})</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm khách hàng
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="🔍 Tìm theo email, tên, số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%", maxWidth: "400px", borderRadius: "0.5rem",
            border: "1px solid #cbd5e1", padding: "0.65rem 1rem", fontSize: "0.92rem"
          }}
        />
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Không tìm thấy khách hàng nào.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Xác thực</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.full_name || "-"}</strong></td>
                  <td>{item.email}</td>
                  <td>{item.phone || "-"}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.78rem" }}>
                      <span>📧 Email: {item.email_verified ? "✅ Rồi" : "❌ Chưa"}</span>
                      <span>📞 Phone: {item.phone_verified ? "✅ Rồi" : "❌ Chưa"}</span>
                    </div>
                  </td>
                  <td>{item.is_active ? "🟢 Đang hoạt động" : "🔴 Đang khóa"}</td>
                  <td>{new Date(item.created_at).toLocaleDateString("vi-VN")}</td>
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
            <h4>{editId ? "✏️ Chỉnh sửa tài khoản khách hàng" : "➕ Thêm khách hàng mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Địa chỉ Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!!editId} />
                </div>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ví dụ: 0988888888" />
                </div>
                <div className="form-group">
                  <label>{editId ? "Mật khẩu mới (bỏ trống nếu giữ nguyên)" : "Mật khẩu"}</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editId} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "0.5rem" }}>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" id="emailVerifyCheck" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} style={{ width: "auto" }} />
                  <label htmlFor="emailVerifyCheck" style={{ marginBottom: 0 }}>Xác thực email</label>
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" id="phoneVerifyCheck" checked={phoneVerified} onChange={(e) => setPhoneVerified(e.target.checked)} style={{ width: "auto" }} />
                  <label htmlFor="phoneVerifyCheck" style={{ marginBottom: 0 }}>Xác thực sđt</label>
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Kích hoạt tài khoản</label>
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
