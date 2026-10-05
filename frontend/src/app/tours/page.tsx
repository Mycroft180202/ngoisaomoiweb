import ToursClient from "./ToursClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danh sách Tour du lịch | New Star Tour",
  description: "Khám phá danh sách các tour du lịch trong nước và quốc tế hấp dẫn nhất từ New Star Tour. Đặt tour nhanh chóng, dễ dàng, hỗ trợ 24/7.",
  openGraph: {
    title: "Danh sách Tour du lịch trong nước & quốc tế | New Star Tour",
    description: "Khám phá danh sách các tour du lịch trong nước và quốc tế hấp dẫn nhất từ New Star Tour. Đặt tour nhanh chóng, dễ dàng, hỗ trợ 24/7.",
    url: "https://newstartour.vn/tours",
    siteName: "New Star Tour",
    images: [
      {
        url: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Danh sách Tour du lịch New Star Tour",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

type Props = {
  searchParams: Promise<{ type?: string; query?: string }>;
};

export default async function ToursPage({ searchParams }: Props) {
  return <ToursClient searchParams={searchParams} />;
}
