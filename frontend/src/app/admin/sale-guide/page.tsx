import Link from "next/link";

const steps = [
  ["1", "Chuẩn bị dữ liệu", "Tuyến, thời lượng, giá theo độ tuổi, lịch khởi hành, lịch trình, điều khoản, ảnh và PDF."],
  ["2", "Thông tin chính", "Chọn đúng Tour trong nước/quốc tế, điểm đi–đến, danh mục và hướng dẫn viên."],
  ["3", "Giá & lịch khởi hành", "Nhập giá người lớn trước, sau đó trẻ em/em bé, hạng phòng, số khách và ngày chạy."],
  ["4", "Nội dung & tài liệu", "Hoàn thiện lịch trình từng ngày, ảnh đại diện, album, PDF và các điều khoản."],
  ["5", "Kiểm tra & xuất bản", "Lưu khi đang tắt kích hoạt, kiểm tra mobile rồi mới công khai Tour."],
];

export default function SaleGuidePage() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", color: "var(--public-text-strong, #172033)" }}>
      <section style={{ padding: "28px 30px", borderRadius: 20, background: "linear-gradient(135deg,#0f2447,#126b91)", color: "white", marginBottom: 20 }}>
        <div style={{ fontSize: 13, opacity: .78, fontWeight: 700, letterSpacing: 1 }}>CẨM NANG NGHIỆP VỤ SALE</div>
        <h1 style={{ margin: "8px 0", fontSize: 30 }}>Tạo Tour đúng chuẩn trên CMS</h1>
        <p style={{ margin: 0, maxWidth: 760, lineHeight: 1.6, opacity: .9 }}>Quy trình ngắn gọn từ chuẩn bị dữ liệu đến xử lý booking, kèm phạm vi quyền để tránh sửa nhầm cấu hình hệ thống.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <Link href="/admin/tours" style={{ padding: "11px 17px", borderRadius: 10, background: "var(--admin-action-bg, #13aee8)", color: "var(--public-on-accent, white)", textDecoration: "none", fontWeight: 700 }}>＋ Tạo Tour</Link>
          <a href="/guides/HUONG_DAN_SALE_TAO_TOUR.md" target="_blank" rel="noreferrer" style={{ padding: "11px 17px", borderRadius: 10, border: "1px solid rgba(255,255,255,.35)", color: "white", textDecoration: "none", fontWeight: 700 }}>Tải/xem file Markdown</a>
        </div>
      </section>

      <section style={{ background: "var(--public-surface, white)", borderRadius: 18, padding: 24, marginBottom: 18, boxShadow: "0 8px 30px rgba(15,35,65,.07)" }}>
        <h2 style={{ marginTop: 0 }}>Quy trình 5 bước</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {steps.map(([number, title, description]) => (
            <div key={number} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 14, padding: 16, border: "1px solid #e3eaf3", borderRadius: 14 }}>
              <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 12, background: "#e7f7ff", color: "#087cac", fontWeight: 800 }}>{number}</span>
              <div><strong>{title}</strong><p style={{ margin: "5px 0 0", color: "#637087", lineHeight: 1.5 }}>{description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
        <section style={{ background: "#effbf4", border: "1px solid #bfe8cf", borderRadius: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0, color: "var(--public-success-text, #13783d)" }}>Sale được phép</h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.9 }}><li>Tạo, sửa và tạm tắt Tour</li><li>Tải ảnh, PDF và quản lý album Tour</li><li>Xử lý booking và liên hệ khách</li><li>Xem giao dịch phục vụ đối soát</li></ul>
        </section>
        <section style={{ background: "#fff4f3", border: "1px solid #f0cbc6", borderRadius: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0, color: "var(--public-error-text, #a33a30)" }}>Cần Manager xử lý</h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.9 }}><li>Xóa vĩnh viễn Tour</li><li>Sửa danh mục, tag, địa điểm, mã giảm giá</li><li>Đồng bộ CRM hàng loạt</li><li>Cấu hình thanh toán, tài khoản và hệ thống</li></ul>
        </section>
      </div>
      <p style={{ marginTop: 18, color: "#69778b" }}>Quy tắc quan trọng: chỉ đánh dấu “Đã thanh toán” khi tiền đã được xác nhận; nếu Tour công khai sai giá hoặc lịch trình, hãy tắt kích hoạt trước khi chỉnh sửa.</p>
    </div>
  );
}
