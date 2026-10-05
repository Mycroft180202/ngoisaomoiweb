import TourDetailClient from "./TourDetailClient";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = decodeURIComponent(slug).trim().replace(/\s+/g, "-");
  let tour: any = null;
  
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiBase}/api/tours/${normalizedSlug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      tour = {
        title: data.title,
        description: data.description || "",
        image: data.image || "",
        duration: data.duration
      };
    }
  } catch (err) {
    console.error("Error fetching tour metadata:", err);
  }

  if (!tour) {
    return { title: "Không tìm thấy Tour | New Star Tour" };
  }

  return {
    title: `${tour.title} - ${tour.duration} | New Star Tour`,
    description: tour.description,
    openGraph: {
      title: `${tour.title} - ${tour.duration} | New Star Tour`,
      description: tour.description,
      url: `https://newstartour.vn/tours/${normalizedSlug}`,
      siteName: "New Star Tour",
      images: [
        {
          url: tour.image || "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
          width: 1200,
          height: 630,
          alt: tour.title,
        },
      ],
      locale: "vi_VN",
      type: "website",
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();
  
  if (decoded.includes(" ")) {
    const normalized = decoded.replace(/\s+/g, "-");
    redirect(`/tours/${normalized}`);
  }
  
  return <TourDetailClient slug={slug} />;
}

