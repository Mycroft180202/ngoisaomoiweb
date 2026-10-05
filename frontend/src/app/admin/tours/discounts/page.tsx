"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface Discount {
  id: number;
  code: string;
  discount_type: string;
  value: number;
  min_value: number;
  expiry_date: string | null;
  is_active: boolean;
}

export default function DiscountsAdmin() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [value, setValue] = useState(0);
  const [minValue, setMinValue] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/discounts/");
      if (!res.ok) throw new Error("Không thể tải danh sách mã giảm giá.");
      const data = await res.json();
      setDiscounts(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setCode("");
    setDiscountType("percentage");
    setValue(0);
    setMinValue(0);
    setExpiryDate("");
    setIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Discount) => {
    setEditId(item.id);
    setCode(item.code);
    setDiscountType(item.discount_type);
    setValue(item.value);
    setMinValue(item.min_value);
    setExpiryDate(item.expiry_date ? item.expiry_date.split("T")[0] : "");
    setIsActive(item.is_active);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc muốn xóa mã giảm giá này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/discounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDiscounts(discounts.filter(d => d.id !== id));
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
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      value: Number(value),
      min_value: Number(minValue),
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: isActive
    };

    try {
      let res;
      if (editId) {
        res = await fetch(`http://localhost:8000/api/discounts/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("http://localhost:8000/api/discounts/", {
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
        fetchDiscounts();
      } else {
        const errData = await res.json();
        appToast(errData.detail || "Lưu thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Gặp lỗi khi lưu.");
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("vi-VN").format(p) + " VNĐ";
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>🎟️ Quản lý Mã giảm giá (Discount Coupon)</h3>
        {!isFormOpen && (
          <button onClick={handleOpenAdd} className="admin-btn-primary">
            ➕ Tạo mã giảm giá mới
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h4>{editId ? "✏️ Chỉnh sửa mã giảm giá" : "➕ Thêm mã giảm giá mới"}</h4>
          
          <div className="form-group">
            <label htmlFor="discountCode">Mã giảm giá (Coupon Code)</label>
            <input type="text" id="discountCode" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Ví dụ: HELLO2026, DISCOUNT10" />
          </div>

          <div className="form-group">
            <label htmlFor="discountType">Loại giảm giá</label>
            <select
              id="discountType"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "var(--public-surface, white)",
                fontSize: "0.98rem",
              }}
              required
            >
              <option value="percentage">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (VNĐ)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="discountValue">Giá trị giảm giá {discountType === "percentage" ? "(%)" : "(VNĐ)"}</label>
            <input type="number" id="discountValue" value={value} onChange={(e) => setValue(Number(e.target.value))} required min={0} />
          </div>

          <div className="form-group">
            <label htmlFor="discountMinVal">Giá trị đơn hàng tối thiểu để áp dụng (VNĐ)</label>
            <input type="number" id="discountMinVal" value={minValue} onChange={(e) => setMinValue(Number(e.target.value))} min={0} />
          </div>

          <div className="form-group">
            <label htmlFor="discountExpiry">Ngày hết hạn</label>
            <input type="date" id="discountExpiry" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" id="discountActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer" }} />
            <label htmlFor="discountActive" style={{ cursor: "pointer", fontWeight: 700 }}>Kích hoạt hoạt động</label>
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
          ) : discounts.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>Chưa có mã giảm giá nào.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã giảm giá</th>
                    <th>Loại</th>
                    <th>Giá trị giảm</th>
                    <th>Yêu cầu tối thiểu</th>
                    <th>Hết hạn</th>
                    <th>Kích hoạt</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.code}</strong></td>
                      <td>{item.discount_type === "percentage" ? "Phần trăm" : "Cố định"}</td>
                      <td>
                        <strong>
                          {item.discount_type === "percentage" ? `${item.value}%` : formatPrice(item.value)}
                        </strong>
                      </td>
                      <td>{formatPrice(item.min_value)}</td>
                      <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("vi-VN") : "Vô hạn"}</td>
                      <td>
                        <span className={`badge ${item.is_active ? "badge-confirmed" : "badge-cancelled"}`}>
                          {item.is_active ? "Hoạt động" : "Tắt"}
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
