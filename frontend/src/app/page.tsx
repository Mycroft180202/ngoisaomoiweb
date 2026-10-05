import VersionedHome from "./VersionedHome";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Star Tour | Du lịch trong nước & quốc tế chất lượng cao",
  description: "New Star Tour chuyên cung cấp các tour du lịch trong nước và quốc tế chất lượng cao, thiết kế lịch trình linh hoạt, hỗ trợ 24/7.",
  openGraph: {
    title: "New Star Tour | Du lịch trong nước & quốc tế chất lượng cao",
    description: "New Star Tour chuyên cung cấp các tour du lịch trong nước và quốc tế chất lượng cao, thiết kế lịch trình linh hoạt, hỗ trợ 24/7.",
    url: "https://newstartour.vn",
    siteName: "New Star Tour",
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "New Star Tour - Trải nghiệm kỳ nghỉ trọn vẹn",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

export default function Home() {
  return <VersionedHome />;
}
