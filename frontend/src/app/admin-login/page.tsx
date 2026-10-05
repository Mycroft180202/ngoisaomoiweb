import type { Metadata } from "next";
import LoginClient from "../login/LoginClient";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị | New Star Tour",
  description: "Cổng đăng nhập dành riêng cho quản trị viên New Star Tour.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginClient adminOnly />;
}
