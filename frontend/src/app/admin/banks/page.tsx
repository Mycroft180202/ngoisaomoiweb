"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string;
  qr_code_url?: string;
  is_active: boolean;
}

export default function BanksManager() {
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form states
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/banks/");
      if (!res.ok) throw new Error("Không thể tải danh sách tài khoản ngân hàng");
      const data = await res.json();
      setBanks(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setBranch("");
    setQrCodeUrl("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: BankAccount) => {
    setEditId(item.id);
    setBankName(item.bank_name);
    setAccountName(item.account_name);
    setAccountNumber(item.account_number);
    setBranch(item.branch || "");
    setQrCodeUrl(item.qr_code_url || "");
    setIsActive(item.is_active);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setFormError(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/news/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Tải ảnh lên thất bại.");
      const data = await res.json();
      setQrCodeUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
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
      bank_name: bankName,
      account_name: accountName,
      account_number: accountNumber,
      branch: branch || null,
      qr_code_url: qrCodeUrl || null,
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/banks/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/banks/", {
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
        throw new Error(errData.detail || "Không thể lưu tài khoản ngân hàng.");
      }

      setFormSuccess(editId ? "Cập nhật thành công!" : "Tạo mới thành công!");
      fetchBanks();
      setTimeout(() => setIsModalOpen(false), 1000);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/banks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại.");
      fetchBanks();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Tài khoản ngân hàng</h3>
        <button onClick={handleOpenAdd} className="admin-btn-primary">
          ➕ Thêm tài khoản
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : banks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Chưa có tài khoản ngân hàng nào được cấu hình.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
          {banks.map((item) => (
            <div key={item.id} className="admin-card" style={{
              display: "flex", flexDirection: "column", border: "1px solid var(--border)",
              borderRadius: "0.85rem", overflow: "hidden", background: "white"
            }}>
              {item.qr_code_url ? (
                <img src={item.qr_code_url} alt="QR Code" style={{ width: "100%", height: "200px", objectFit: "contain", background: "#f8fafc", padding: "1rem" }} />
              ) : (
                <div style={{ height: "200px", display: "flex", justifyContent: "center", alignItems: "center", background: "#f1f5f9", color: "var(--muted)" }}>
                  Chưa có mã QR
                </div>
              )}
              <div style={{ padding: "1.2rem", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>{item.bank_name}</h4>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.9rem" }}>STK: <strong>{item.account_number}</strong></p>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.9rem" }}>Chủ tài khoản: <strong>{item.account_name}</strong></p>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "0" }}>Chi nhánh: {item.branch || "Chính"}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.8rem" }}>
                  <span style={{ fontSize: "0.8rem" }}>
                    {item.is_active ? "🟢 Đang kích hoạt" : "🔴 Tạm ẩn"}
                  </span>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button onClick={() => handleOpenEdit(item)} className="btn-action">✏️</button>
                    <button onClick={() => handleDelete(item.id)} className="btn-action btn-delete">🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center",
          alignItems: "center", zIndex: 1000
        }}>
          <div className="admin-panel" style={{ width: "90%", maxWidth: "550px", padding: "2rem", borderRadius: "1rem" }}>
            <h4>{editId ? "✏️ Chỉnh sửa tài khoản ngân hàng" : "➕ Thêm tài khoản mới"}</h4>
            {formError && <div className="auth-message error" style={{ marginBottom: "1rem" }}>{formError}</div>}
            {formSuccess && <div className="auth-message success" style={{ marginBottom: "1rem" }}>{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Tên Ngân hàng</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ví dụ: Vietcombank" required />
                </div>
                <div className="form-group">
                  <label>Số tài khoản</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
                </div>
              </div>

              <div className="form-group">
                <label>Chủ tài khoản (Viết hoa không dấu)</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ví dụ: NGUYEN VAN A" required />
              </div>

              <div className="form-group">
                <label>Chi nhánh ngân hàng</label>
                <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Ví dụ: Chi nhánh Hoàn Kiếm, Hà Nội" />
              </div>

              <div className="form-group">
                <label>Mã QR thanh toán (URL hoặc tải lên)</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input type="text" value={qrCodeUrl} onChange={(e) => setQrCodeUrl(e.target.value)} placeholder="Đường dẫn ảnh QR..." style={{ flexGrow: 1 }} />
                  <label style={{
                    padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "1px solid #cbd5e1",
                    borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}>
                    {uploading ? "Tải lên..." : "📁 Tải ảnh QR"}
                    <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" id="isActiveCheck" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "auto" }} />
                <label htmlFor="isActiveCheck" style={{ marginBottom: 0 }}>Kích hoạt tài khoản này</label>
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
