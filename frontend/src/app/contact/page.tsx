import ContactClient from "./ContactClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liên hệ | New Star Tour",
  description: "Liên hệ với New Star Tour qua hotline, địa chỉ văn phòng Hà Nội hoặc gửi yêu cầu tư vấn nhanh tại đây.",
  openGraph: {
    title: "Liên hệ với New Star Tour",
    description: "Liên hệ với New Star Tour qua hotline, địa chỉ văn phòng Hà Nội hoặc gửi yêu cầu tư vấn nhanh tại đây.",
    url: "https://newstartour.vn/contact",
    siteName: "New Star Tour",
    images: [
      {
        url: "https://images.unsplash.com/photo-1423662055905-ec3d12f8b581?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Liên hệ New Star Tour",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
