"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: string; // pending, processed
  created_at: string;
}

export default function ContactsManager() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeMsg, setActiveMsg] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/api/contacts/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách tin nhắn");
      const data = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: ContactMessage) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const newStatus = item.status === "pending" ? "processed" : "pending";

    try {
      const res = await fetch(`http://localhost:8000/api/contacts/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      
      setMessages(prev => prev.map(m => m.id === item.id ? { ...m, status: newStatus } : m));
      if (activeMsg && activeMsg.id === item.id) {
        setActiveMsg({ ...activeMsg, status: newStatus });
      }
    } catch (err: any) {
      appToast(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa tin nhắn này không?")) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể xóa tin nhắn");
      setMessages(prev => prev.filter(m => m.id !== id));
      if (activeMsg && activeMsg.id === id) {
        setActiveMsg(null);
      }
    } catch (err: any) {
      appToast(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Tin nhắn liên hệ đặt tour</h3>
      </div>

      {error && <div className="auth-message error">{error}</div>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="admin-spinner"></div>
        </div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
          Không có tin nhắn liên hệ nào.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "2rem", marginTop: "1rem" }}>
          {/* Message List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", maxHeight: "600px" }}>
            {messages.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveMsg(item)}
                style={{
                  padding: "1.2rem",
                  borderRadius: "0.85rem",
                  border: `1px solid ${activeMsg?.id === item.id ? "var(--accent)" : "var(--border)"}`,
                  background: activeMsg?.id === item.id ? "rgba(255,255,255,0.06)" : "var(--public-surface, white)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <strong style={{ fontSize: "0.95rem" }}>{item.name}</strong>
                  <span style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "1rem",
                    fontWeight: 600,
                    background: item.status === "pending" ? "var(--public-error-surface, #fee2e2)" : "var(--public-success-surface, #dcfce7)",
                    color: item.status === "pending" ? "var(--public-error-text, #ef4444)" : "#22c55e"
                  }}>
                    {item.status === "pending" ? "Chưa xử lý" : "Đã xử lý"}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>{item.subject || "Không chủ đề"}</p>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{new Date(item.created_at).toLocaleString("vi-VN")}</span>
              </div>
            ))}
          </div>

          {/* Message Details */}
          <div>
            {activeMsg ? (
              <div className="admin-card" style={{ padding: "2rem", border: "1px solid var(--border)", borderRadius: "0.85rem", background: "var(--public-surface, white)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: 0, fontWeight: 700 }}>Chi tiết tin nhắn</h4>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleToggleStatus(activeMsg)} className="btn-view-site" style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}>
                      {activeMsg.status === "pending" ? "✓ Đánh dấu đã xử lý" : "⟲ Đánh dấu chưa xử lý"}
                    </button>
                    <button onClick={() => handleDelete(activeMsg.id)} className="btn-action btn-delete">🗑️ Xóa</button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Người gửi</label>
                    <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{activeMsg.name}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Email</label>
                    <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{activeMsg.email}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Số điện thoại</label>
                    <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{activeMsg.phone || "-"}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Thời gian gửi</label>
                    <p style={{ margin: "0.2rem 0 0", fontWeight: 600 }}>{new Date(activeMsg.created_at).toLocaleString("vi-VN")}</p>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Chủ đề</label>
                  <p style={{ margin: "0.2rem 0 1rem", fontWeight: 700, fontSize: "1.05rem" }}>{activeMsg.subject || "(Không chủ đề)"}</p>

                  <label style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Nội dung chi tiết</label>
                  <div style={{
                    marginTop: "0.5rem",
                    padding: "1.2rem",
                    borderRadius: "0.5rem",
                    background: "var(--public-surface-soft, #f8fafc)",
                    border: "1px solid var(--public-border, #e2e8f0)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6
                  }}>
                    {activeMsg.message}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                height: "100%", display: "flex", justifyContent: "center", alignItems: "center",
                border: "2px dashed var(--border)", borderRadius: "0.85rem", padding: "4rem", color: "var(--muted)"
              }}>
                Chọn một tin nhắn ở danh sách bên trái để đọc chi tiết.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
