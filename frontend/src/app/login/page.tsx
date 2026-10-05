import LoginClient from "./LoginClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | New Star Tour",
  description: "Đăng nhập tài khoản New Star Tour để quản lý hành trình và đặt lịch nhanh chóng.",
};

export default function LoginPage() {
  return <LoginClient />;
}
