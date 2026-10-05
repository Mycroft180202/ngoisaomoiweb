"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface RepresentativeOffice {
  id: number;
  name: string;
  address: string;
  phone?: string;
  hotline?: string;
  email?: string;
  order_index: number;
}

export default function OfficesManager() {
  const [offices, setOffices] = useState<RepresentativeOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hotline, setHotline] = useState("");
  const [email, setEmail] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/offices/");
      if (!res.ok) throw new Error("Không thể tải danh sách văn phòng");
      const data = await res.json();
      setOffices(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setName("");
    setAddress("");
    setPhone("");
    setHotline("");
    setEmail("");
    setOrderIndex(0);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RepresentativeOffice) => {
    setEditId(item.id);
    setName(item.name);
    setAddress(item.address);
    setPhone(item.phone || "");
    setHotline(item.hotline || "");
    setEmail(item.email || "");
    setOrderIndex(item.order_index);
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
      address,
      phone: phone || null,
      hotline: hotline || null,
      email: email || null,
      order_index: orderIndex
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/offices/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/offices/", {
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
        throw new Error(errData.detail || "Không thể lưu văn phòng.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchOffices();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa văn phòng đại diện này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/offices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchOffices();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Văn phòng đại diện</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm văn phòng
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : offices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có văn phòng đại diện nào được tạo.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên văn phòng</th>
                <th>Địa chỉ</th>
                <th>Điện thoại</th>
                <th>Hotline</th>
                <th>Email</th>
                <th>Thứ tự</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.address}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.hotline || "-"}</td>
                  <td>{item.email || "-"}</td>
                  <td>{item.order_index}</td>
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
            <h4>{editId ? "✏️ Chỉnh sửa văn phòng" : "➕ Thêm văn phòng mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Tên văn phòng</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Văn phòng Chi nhánh Hà Nội" required />
              </div>
              <div className="form-group">
                <label>Địa chỉ chi tiết</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, Tên đường, Quận, Thành phố..." required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Số điện thoại bàn</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ví dụ: 024-xxx-xxxx" />
                </div>
                <div className="form-group">
                  <label>Hotline di động</label>
                  <input type="text" value={hotline} onChange={(e) => setHotline(e.target.value)} placeholder="Ví dụ: 098-xxx-xxxx" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Email liên hệ</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Viết thường: hanoi@startour.vn" />
                </div>
                <div className="form-group">
                  <label>Thứ tự hiển thị</label>
                  <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} required />
                </div>
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
