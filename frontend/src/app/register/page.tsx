import RegisterClient from "./RegisterClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký | New Star Tour",
  description: "Đăng ký tài khoản thành viên New Star Tour để nhận các ưu đãi hấp dẫn và đặt lịch nhanh chóng.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
