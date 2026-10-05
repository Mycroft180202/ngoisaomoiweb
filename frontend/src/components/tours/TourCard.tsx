"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDriveThumbnailUrl } from "@/utils/image";

interface TourImage {
  id: number;
  url: string;
  image_type: string;   // "banner" | "gallery"
  is_primary: boolean;
  order_index: number;
}

interface Tour {
  slug: string;
  title: string;
  route: string;
  duration: string;
  price: string;
  tag: string;
  tags?: { id?: number; name: string }[];
  isPromo?: boolean;
  departurePoint?: string;
  images?: string[];        // Legacy: array of string URLs
  tourImages?: TourImage[]; // New: structured image objects from DB
  thumbnail?: string;       // Precomputed primary thumbnail URL
}

interface TourCardProps {
  tour: Tour;
}

/**
 * Resolves the best thumbnail for a tour card:
 * 1. Precomputed `thumbnail` field (fastest)
 * 2. Primary image from `tourImages` (new system)
 * 3. First item in legacy `images` string array
 * 4. Fallback Unsplash image
 */
function resolveThumbnail(tour: Tour): string {
  const fallback = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";

  if (tour.thumbnail) return tour.thumbnail;

  if (tour.tourImages && tour.tourImages.length > 0) {
    const primary = tour.tourImages.find((img) => img.is_primary);
    const first = tour.tourImages[0];
    const chosen = primary || first;
    return getDriveThumbnailUrl(chosen.url) || fallback;
  }

  if (tour.images && tour.images.length > 0) {
    return tour.images[0] || fallback;
  }

  return fallback;
}

export function TourCard({ tour }: TourCardProps) {
  const router = useRouter();

  const handleBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/checkout?tourSlug=${tour.slug}`);
  };

  const displayImage = resolveThumbnail(tour);

  return (
    <article className="tour-card surface-panel">
      <Link href={`/tours/${tour.slug}`} className="tour-card__image" style={{ display: "block", position: "relative" }}>
        <Image 
          src={displayImage} 
          alt={tour.title} 
          fill 
          sizes="(max-width: 768px) 100vw, 25vw"
          className="transition-transform duration-500 hover:scale-105"
          style={{ objectFit: "cover" }}
        />
        {tour.isPromo && <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", zIndex: 2, background: "#dc2626", color: "white", padding: "0.35rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>🔥 Đang giảm giá</span>}
      </Link>
      <div className="tour-card__body">
        <div className="tour-card__row">
          <span className="card-tag">{tour.tag}</span>
          <strong className="card-duration">{tour.duration}</strong>
        </div>
        {!!tour.tags?.length && <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.65rem" }}>{tour.tags.slice(0, 3).map((tag) => <span key={tag.id || tag.name} style={{ padding: "0.2rem 0.5rem", borderRadius: "999px", background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: "0.7rem", fontWeight: 700 }}>🏷 {tag.name}</span>)}</div>}
        <Link href={`/tours/${tour.slug}`}>
          <h3 className="hover:text-[var(--accent)] transition-colors">{tour.title}</h3>
        </Link>
        <div className="tour-card__location" style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.4rem 0", display: "flex", flexDirection: "column", gap: "0.2rem", minWidth: "0px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: "0px" }}>
            <span>🛫</span> Khởi hành: <strong>{tour.departurePoint || "Chưa xác định"}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: "0px" }}>
            <span>📍</span> Tuyến: <span title={tour.route} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{tour.route}</span>
          </div>
        </div>
        <div className="tour-card__meta">
          <span className="card-price">{tour.price}</span>
          <button className="button-tour-cta" onClick={handleBookClick}>
            Đặt ngay
          </button>
        </div>
      </div>
    </article>
  );
}

