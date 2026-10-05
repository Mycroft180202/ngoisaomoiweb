"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  icon_url?: string;
  is_active: boolean;
}

export default function PaymentsManager() {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/payments/");
      if (!res.ok) throw new Error("Không thể tải danh sách hình thức thanh toán");
      const data = await res.json();
      setPayments(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setIconUrl("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PaymentMethod) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || "");
    setIconUrl(item.icon_url || "");
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
      name,
      description: description || null,
      icon_url: iconUrl || null,
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/payments/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/payments/", {
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
        throw new Error(errData.detail || "Không thể lưu hình thức thanh toán.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchPayments();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa phương thức thanh toán này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/payments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchPayments();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Các hình thức thanh toán</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm hình thức
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có hình thức thanh toán nào.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên hình thức</th>
                <th>Mô tả hướng dẫn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.description || "-"}</td>
                  <td>{item.is_active ? "🟢 Cho phép dùng" : "🔴 Đang tắt"}</td>
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
          <div className="admin-panel" style={{ width: "90%", maxWidth: "500px", padding: "2rem", borderRadius: "1rem" }}>
            <h4>{editId ? "✏️ Chỉnh sửa hình thức thanh toán" : "➕ Thêm hình thức mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tên hình thức thanh toán</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Chuyển khoản ngân hàng" required />
              </div>
              <div className="form-group">
                <label>Mô tả / Hướng dẫn thanh toán</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nhập hướng dẫn chuyển khoản hoặc nộp tiền..." rows={4} style={{
                  width: "100%", borderRadius: "0.85rem", border: "1px solid var(--border-strong)",
                  padding: "0.9rem 1.1rem", background: "white", fontFamily: "inherit"
                }} />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Cho phép khách hàng sử dụng</label>
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
