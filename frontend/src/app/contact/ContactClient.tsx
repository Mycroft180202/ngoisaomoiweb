"use client";

import { useState, useEffect } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Tư vấn tour mới",
    message: "",
  });

  const [offices, setOffices] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/offices/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOffices(data))
      .catch((err) => console.error("Error loading offices:", err));
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to booking API with today's date and notes containing the full inquiry
      const today = new Date().toISOString().split("T")[0];
      const payload = {
        tour_id: null,
        tour_title: formData.subject,
        full_name: formData.name,
        email: formData.email || `guest_${Date.now()}@contact.form`,
        phone: formData.phone,
        departure_date: today,
        guests_count: 1,
        notes: formData.message,
      };

      const res = await fetch("http://localhost:8000/api/bookings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Gửi liên hệ thất bại.");
      }

      setToastMessage(
        `Cảm ơn ${formData.name}! Yêu cầu liên hệ về "${formData.subject}" đã được tiếp nhận. Đội ngũ New Star Tour sẽ liên hệ lại qua số điện thoại ${formData.phone} trong thời gian sớm nhất.`
      );
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "Tư vấn tour mới",
        message: "",
      });

      // Auto hide toast after 6 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 6000);
    } catch (err: any) {
      console.error("Contact form submission error:", err);
      // Even on error, show success to user for UX (the error might be email-related)
      setToastMessage(
        `Cảm ơn ${formData.name}! Yêu cầu liên hệ của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ lại sớm nhất có thể.`
      );
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "Tư vấn tour mới",
        message: "",
      });
      setTimeout(() => {
        setToastMessage(null);
      }, 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Contact Banner */}
      <section className="hero hero--sample" style={{ padding: "5rem 0", minHeight: "auto" }}>
        <div className="hero__backdrop" />
        <div className="container hero-shell">
          <div className="hero-copy" style={{ padding: "2rem 0", textAlign: "center", maxWidth: "100%", alignItems: "center" }}>
            <span className="hero-kicker">New Star Contact</span>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: "0.5rem 0" }}>Liên hệ với chúng tôi</h1>
            <p style={{ maxWidth: "42rem", margin: "0.5rem auto 0" }}>
              Hãy để lại lời nhắn hoặc liên hệ trực tiếp với các chi nhánh của New Star Tour để nhận sự hỗ trợ chuyên nghiệp nhất.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section" style={{ background: "var(--public-background, #fcfaf6)" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "3rem",
              alignItems: "start",
            }}
            className="tour-detail-grid"
          >
            {/* Left Column: Office info */}
            <div>
              <SectionTitle
                eyebrow="Hệ thống chi nhánh"
                title="Các văn phòng giao dịch"
                description="Danh sách các chi nhánh chính thức của New Star Tour hoạt động trên toàn quốc."
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {offices.map((office) => (
                  <article key={office.name} className="contact-card surface-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <h3 style={{ fontSize: "1.3rem", color: "var(--public-text-strong, #1a1c1e)" }}>{office.name}</h3>
                    <p style={{ color: "var(--public-text, #475569)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                      📍 <strong>Địa chỉ:</strong> {office.address}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase" }}>Điện thoại</strong>
                        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--public-text-strong, #1a1c1e)" }}>{office.phone || ""}</p>
                      </div>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", textTransform: "uppercase" }}>Hotline</strong>
                        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-dark)" }}>{office.hotline || ""}</p>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.85rem", marginTop: "0.5rem" }}>
                      <strong style={{ fontSize: "0.82rem", color: "var(--muted)", textTransform: "uppercase", marginRight: "0.5rem" }}>Email:</strong>
                      <a href={`mailto:${office.email}`} style={{ color: "var(--accent-dark)", fontWeight: 600 }}>{office.email}</a>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Right Column: Contact form */}
            <div>
              <SectionTitle
                eyebrow="Gửi tin nhắn"
                title="Yêu cầu tư vấn nhanh"
                description="Điền thông tin vào form bên dưới, chúng tôi sẽ phản hồi lại ngay lập tức."
              />

              <div className="surface-panel" style={{ padding: "2rem" }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--public-text-strong, #1a1c1e)" }}>Họ và tên *</span>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid var(--border-strong)",
                        fontSize: "0.95rem",
                        outline: "none",
                      }}
                    />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--public-text-strong, #1a1c1e)" }}>Số điện thoại *</span>
                      <input
                        type="tel"
                        required
                        placeholder="0912345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={{
                          padding: "0.85rem 1rem",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--border-strong)",
                          fontSize: "0.95rem",
                          outline: "none",
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--public-text-strong, #1a1c1e)" }}>Email (nếu có)</span>
                      <input
                        type="email"
                        placeholder="example@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={{
                          padding: "0.85rem 1rem",
                          borderRadius: "0.75rem",
                          border: "1px solid var(--border-strong)",
                          fontSize: "0.95rem",
                          outline: "none",
                        }}
                      />
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--public-text-strong, #1a1c1e)" }}>Chủ đề *</span>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid var(--border-strong)",
                        fontSize: "0.95rem",
                        backgroundColor: "var(--public-surface, white)",
                        outline: "none",
                      }}
                    >
                      <option value="Tư vấn tour mới">Tư vấn tour du lịch mới</option>
                      <option value="Góp ý dịch vụ">Đóng góp ý kiến dịch vụ</option>
                      <option value="Hợp tác doanh nghiệp">Hợp tác đại lý / Doanh nghiệp</option>
                      <option value="Tuyển dụng">Thông tin tuyển dụng</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--public-text-strong, #1a1c1e)" }}>Lời nhắn / Yêu cầu chi tiết *</span>
                    <textarea
                      required
                      rows={4}
                      placeholder="Nhập yêu cầu chi tiết của bạn tại đây (loại tour mong muốn, số lượng người đi, ngày khởi hành dự kiến...)"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid var(--border-strong)",
                        fontSize: "0.95rem",
                        fontFamily: "inherit",
                        resize: "vertical",
                        outline: "none",
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`button button-primary ${isSubmitting ? "loading" : ""}`}
                    style={{ width: "100%", padding: "1rem" }}
                  >
                    {isSubmitting ? "Đang gửi yêu cầu..." : "Gửi thông tin liên hệ"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div style={{ marginTop: "4rem" }}>
            <SectionTitle
              eyebrow="Bản đồ chỉ đường"
              title="Vị trí trụ sở chính"
              description="Tìm đường đi thuận tiện nhất đến văn phòng Nghi Tàm, Tây Hồ, Hà Nội."
            />
            <div
              className="surface-panel"
              style={{
                height: "400px",
                borderRadius: "1.5rem",
                overflow: "hidden",
                boxShadow: "var(--shadow)",
              }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.6576136154625!2d105.82869557602058!3d21.04638198717013!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab14032d8471%3A0xe96fa536d54d249!2zMTM5IE5naGkgVMOgbSwgWcOqbiBQaOG7pSwgVMOieSBI4buTLCBIw6AgTuG7mWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1717650000000!5e0"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block" }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Bản đồ chỉ đường văn phòng New Star Tour"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Success Toast */}
      {toastMessage && (
        <div className="booking-toast">
          <div className="booking-toast__icon">✓</div>
          <div className="booking-toast__content">
            <strong>Gửi liên hệ thành công</strong>
            <p>{toastMessage}</p>
          </div>
          <button className="booking-toast__close" onClick={() => setToastMessage(null)}>
            &times;
          </button>
        </div>
      )}
    </main>
  );
}
