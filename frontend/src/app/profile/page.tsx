import ProfileClient from "./ProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân | New Star Tour",
  description: "Quản lý thông tin tài khoản cá nhân, xem lịch sử đặt tour và trạng thái xác thực Zalo/Email tại New Star Tour.",
};

export default function UserProfilePage() {
  return <ProfileClient />;
}
