import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export const metadata = {
  title: "Đặt Tour – New Star Tour",
  description: "Điền thông tin và xác nhận đặt tour du lịch cùng New Star Tour.",
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="admin-spinner" />
      </div>
    }>
      <CheckoutClient />
    </Suspense>
  );
}
