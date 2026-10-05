"use client";

import Link from "next/link";
import { useCms } from "@/components/cms/CmsProvider";
import PaymentClient from "./PaymentClient";

export default function PaymentGate({ bookingId }: { bookingId: string }) {
  const { config, loading } = useCms();

  if (loading) return <main style={{ minHeight: "70vh", padding: "5rem 1rem", textAlign: "center" }}>Đang kiểm tra hình thức thanh toán...</main>;
  if (!config.payment?.online_enabled) {
    return <main style={{ minHeight: "70vh", padding: "5rem 1rem", background: "#fcfaf6" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "2rem", borderRadius: 18, background: "white", boxShadow: "0 16px 40px rgba(15,23,42,.1)", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 12 }}>Thanh toán trực tuyến đang tạm tắt</h1>
        <p style={{ color: "#64748b", lineHeight: 1.7 }}>Nhân viên New Star Tour sẽ liên hệ xác nhận đơn, thống nhất thông tin và hướng dẫn thanh toán thủ công.</p>
        <Link href="/lookup" className="btn-primary" style={{ display: "inline-flex", marginTop: 16 }}>Tra cứu đơn hàng</Link>
      </div>
    </main>;
  }
  return <main style={{ background: "#fcfaf6", minHeight: "100vh", paddingTop: "2rem" }}><PaymentClient bookingId={bookingId} /></main>;
}
