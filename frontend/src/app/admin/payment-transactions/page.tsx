"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface PaymentTransaction {
  id: number;
  booking_id: number;
  transaction_ref: string;
  amount: number;
  status: string;
  payment_method: string;
  bank_transaction_id?: string;
  casso_transaction_id?: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
  booking?: {
    tour_title: string;
    full_name: string;
    email: string;
  };
}

export default function PaymentTransactionsManager() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Vui lòng đăng nhập");

      const res = await fetch("http://localhost:8000/api/payments/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách giao dịch");
      const data = await res.json();
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleManualConfirm = async (id: number) => {
    if (!await appConfirm("Xác nhận giao dịch này đã được thanh toán thành công?")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/payments/transactions/${id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xác nhận thất bại");
      fetchTransactions();
    } catch (err: any) {
      appToast(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "🟢";
      case "pending": return "🟡";
      case "failed": return "🔴";
      case "expired": return "⚫";
      default: return "🔵";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Hoàn thành";
      case "pending": return "Chờ xử lý";
      case "failed": return "Thất bại";
      case "expired": return "Hết hạn";
      default: return status;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount) + " VNĐ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN");
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Giao dịch thanh toán</h3>
        <button onClick={fetchTransactions} className="admin-btn-primary">
          🔄 Làm mới
        </button>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {/* Filter */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {[
          { key: "all", label: "Tất cả" },
          { key: "pending", label: "🟡 Chờ xử lý" },
          { key: "completed", label: "🟢 Hoàn thành" },
          { key: "failed", label: "🔴 Thất bại" },
          { key: "expired", label: "⚫ Hết hạn" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              background: filter === f.key ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "var(--public-surface, #ffffff)",
              color: filter === f.key ? "var(--public-on-accent, #ffffff)" : "var(--public-text-strong, #1e293b)",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: filter === f.key ? 700 : 600,
              boxShadow: filter === f.key ? "0 6px 16px rgba(143, 100, 44, 0.18)" : "none"
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          {filter === "all" ? "Chưa có giao dịch nào." : "Không có giao dịch nào với trạng thái này."}
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Booking</th>
                <th>Khách hàng</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <code style={{
                      background: "var(--public-surface-soft, #f3f4f6)",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.8rem"
                    }}>
                      {transaction.transaction_ref}
                    </code>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                        #{transaction.booking_id}
                      </div>
                      {transaction.booking && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {transaction.booking.tour_title}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {transaction.booking && (
                      <div>
                        <div style={{ fontWeight: "bold" }}>
                          {transaction.booking.full_name}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {transaction.booking.email}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: "var(--public-error-text, #dc2626)" }}>
                      {formatAmount(transaction.amount)}
                    </strong>
                  </td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {getStatusColor(transaction.status)}
                      {getStatusText(transaction.status)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.9rem" }}>
                      {formatDate(transaction.created_at)}
                    </div>
                    {transaction.completed_at && (
                      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                        Hoàn thành: {formatDate(transaction.completed_at)}
                      </div>
                    )}
                    {transaction.expires_at && transaction.status === "pending" && (
                      <div style={{ fontSize: "0.8rem", color: "var(--public-warning-text, #f59e0b)" }}>
                        Hết hạn: {formatDate(transaction.expires_at)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {transaction.status === "pending" && (
                        <button
                          onClick={() => handleManualConfirm(transaction.id)}
                          className="btn-action"
                          title="Xác nhận thủ công"
                          style={{ background: "var(--admin-action-bg, #10b981)", color: "var(--public-on-accent, white)" }}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/admin/bookings?id=${transaction.booking_id}`, '_blank')}
                        className="btn-action"
                        title="Xem booking"
                      >
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
        marginTop: "2rem",
        padding: "1.5rem",
        background: "var(--public-surface-soft, #f8fafc)",
        borderRadius: "0.75rem"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--public-success-text, #10b981)" }}>
            {transactions.filter(t => t.status === "completed").length}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Đã hoàn thành</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--public-warning-text, #f59e0b)" }}>
            {transactions.filter(t => t.status === "pending").length}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Chờ xử lý</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--public-error-text, #dc2626)" }}>
            {formatAmount(
              transactions
                .filter(t => t.status === "completed")
                .reduce((sum, t) => sum + t.amount, 0)
            )}
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Tổng doanh thu</div>
        </div>
      </div>
    </div>
  );
}
