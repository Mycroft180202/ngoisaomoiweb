"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getDriveThumbnailUrl } from "@/utils/image";

import { BookingCard } from "@/components/booking/BookingCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TourCard } from "@/components/tours/TourCard";

interface TourImageData {
  id: number;
  url: string;
  image_type: string;   // "banner" | "gallery"
  is_primary: boolean;
  order_index: number;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80";

function resolveImageUrl(url: string): string {
  if (!url) return FALLBACK_IMAGE;
  // If it's already a full URL (Unsplash etc.) leave it as-is
  if (url.startsWith("http")) return url;
  return getDriveThumbnailUrl(url) || FALLBACK_IMAGE;
}

function renderActivityLine(act: string, idx: number) {
  let emoji = "●";
  let color = "var(--accent-dark)";
  
  const text = act.toLowerCase();
  if (text.includes("ăn ") || text.includes("buffet") || text.includes("bữa trưa") || text.includes("bữa tối") || text.includes("bữa sáng") || text.includes("ẩm thực") || text.includes("nhà hàng")) {
    emoji = "🍽️";
    color = "#10b981"; // emerald
  } else if (text.includes("xe ") || text.includes("di chuyển") || text.includes("bay") || text.includes("đón") || text.includes("sân bay") || text.includes("tàu") || text.includes("cáp treo")) {
    emoji = "🚐";
    color = "#3b82f6"; // blue
  } else if (text.includes("khách sạn") || text.includes("nhận phòng") || text.includes("nghỉ ngơi") || text.includes("resort") || text.includes("hotel") || text.includes("check in") || text.includes("check-in")) {
    emoji = "🏨";
    color = "#8b5cf6"; // purple
  } else if (text.includes("tham quan") || text.includes("khám phá") || text.includes("tự do") || text.includes("vui chơi") || text.includes("checkin") || text.includes("chụp ảnh") || text.includes("tắm biển")) {
    emoji = "🏖️";
    color = "#f59e0b"; // amber
  }

  return (
    <li key={idx} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.95rem", color: "var(--public-text, #475569)", lineHeight: "1.6" }}>
      <span style={{ color, fontSize: emoji === "●" ? "0.8rem" : "1.05rem", marginTop: emoji === "●" ? "0.3rem" : "0.05rem", display: "inline-block", width: "1.25rem", textAlign: "center" }}>
        {emoji}
      </span>
      <span>{act}</span>
    </li>
  );
}

function parseHighlights(description: string): string[] {
  if (!description) return [];
  
  // Try splitting by newline first
  const lines = description.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
    
  let items: string[] = [];
  
  for (const line of lines) {
    // If line starts with a bullet point character like -, *, ✓, •, +, etc.
    if (/^[-\*✓•\+]\s*/.test(line)) {
      items.push(line.replace(/^[-\*✓•\+]\s*/, ''));
    } else {
      // If the line contains " - " (dash surrounded by spaces), it might be multi-bullet inline
      // e.g. "ĐẶC SẮC CHƯƠNG TRÌNH - Nhập cảnh... - Đặc biệt chương trình NO SHOPPING - Trải nghiệm..."
      if (line.includes(' - ')) {
        const parts = line.split(' - ').map(p => p.trim()).filter(p => p.length > 0);
        parts.forEach((part, index) => {
          if (index === 0 && (part.toUpperCase().includes('ĐẶC SẮC') || part.toUpperCase().includes('CHƯƠNG TRÌNH') || part.toUpperCase().includes('NỔI BẬT'))) {
            // skip title
            return;
          }
          items.push(part);
        });
      } else {
        // If it's a regular sentence and we don't have many bullets yet, we can add it if it's long enough
        if (line.length > 20 && !line.toUpperCase().includes('ĐẶC SẮC CHƯƠNG TRÌNH')) {
          items.push(line);
        }
      }
    }
  }
  
  // If we couldn't parse any items, fall back to sentences
  if (items.length === 0) {
    const sentences = description.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    return sentences.slice(0, 5);
  }
  
  return items;
}

export default function TourDetailClient({ slug }: { slug: string }) {
  const [tour, setTour] = useState<any | null>(null);
  const [allTours, setAllTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Load all tours for related tours suggestion
  useEffect(() => {
    fetch("http://localhost:8000/api/tours/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          const mapped = data.map((t: any) => {
            // Compute thumbnail from new images system first, then legacy image field
            const primaryImg = t.images?.find((img: TourImageData) => img.is_primary);
            const firstImg = t.images?.[0];
            const chosenImg = primaryImg || firstImg;
            const thumbnail = chosenImg
              ? resolveImageUrl(chosenImg.url)
              : getDriveThumbnailUrl(t.image) || FALLBACK_IMAGE;

            return {
              slug: t.slug,
              title: t.title,
              route: t.location,
              duration: t.duration,
              price: new Intl.NumberFormat("vi-VN").format(t.price) + " VNĐ",
              departurePoint: t.departure_point?.name || "",
              tag: !t.is_international ? "Trong nước" : "Nước ngoài",
              type: !t.is_international ? "domestic" : "international",
              thumbnail,
              tourImages: (t.images || []).map((img: TourImageData) => ({
                ...img,
                url: resolveImageUrl(img.url),
              })),
              description: t.description || "",
            };
          });
          setAllTours(mapped);
        }
      })
      .catch((err) => console.error("Error loading related tours:", err));
  }, []);

  // Accordion state
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 0: true });
  const toggleDay = (index: number) => {
    setExpandedDays((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Load current tour detail
  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/tours/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy tour.");
        return res.json();
      })
      .then((data) => {
        const rawImages: TourImageData[] = data.images || [];

        // Resolve banner: image with image_type==="banner", else primary, else first, else legacy image field
        const bannerImg = rawImages.find((img) => img.image_type === "banner");
        const primaryImg = rawImages.find((img) => img.is_primary);
        const firstImg = rawImages[0];

        const heroImage = bannerImg
          ? resolveImageUrl(bannerImg.url)
          : primaryImg
          ? resolveImageUrl(primaryImg.url)
          : firstImg
          ? resolveImageUrl(firstImg.url)
          : getDriveThumbnailUrl(data.image) || FALLBACK_IMAGE;

        // Gallery: all non-banner images (or all images if no banner separation)
        const galleryImages = rawImages.length > 0
          ? rawImages
              .filter((img) => img.image_type === "gallery")
              .map((img) => resolveImageUrl(img.url))
          : [getDriveThumbnailUrl(data.image) || FALLBACK_IMAGE];

        const mapped = {
          id: data.id,
          slug: data.slug,
          title: data.title,
          route: data.location,
          duration: data.duration,
          price: new Intl.NumberFormat("vi-VN").format(data.price) + " VNĐ",
          departurePoint: data.departure_point?.name || "",
          tag: !data.is_international ? "Trong nước" : "Nước ngoài",
          type: !data.is_international ? "domestic" : "international",
          heroImage,
          galleryImages,
          description: data.description || "",
          highlights: parseHighlights(data.description || ""),
          notes: data.notes || "",
          tags: data.tags || [],
          isPromo: !!data.is_promo,
          minGroupSize: data.min_group_size || 1,
          priceIncludes: data.price_includes || "",
          priceExcludes: data.price_excludes || "",
          cancellationPolicy: data.cancellation_policy || "",
          paymentTerms: data.payment_terms || "",
          importantNote: data.important_note || "",
          accommodationPrices: data.accommodation_prices || [],
          priceChild: data.price_child && data.price_child > 0 
            ? new Intl.NumberFormat("vi-VN").format(data.price_child) + " VNĐ" 
            : null,
          priceInfant: data.price_infant && data.price_infant > 0 
            ? new Intl.NumberFormat("vi-VN").format(data.price_infant) + " VNĐ" 
            : null,
          documentUrl: data.document_url || "",
          itinerary: (data.itinerary || []).map((item: any) => ({
            day: `Ngày ${item.day}`,
            title: item.title,
            meals: item.meals || "",
            overnight: item.overnight || "",
            activities: item.content
              ? item.content.split("\n").map((line: string) => line.trim()).filter(Boolean)
              : [],
          })),
        };
        setTour(mapped);
      })
      .catch((err) => {
        console.error("Failed to load tour details from API:", err);
        setTour(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="animate-pulse" style={{ background: "var(--public-background, #fcfaf6)", minHeight: "100vh" }}>
        {/* Banner Hero Skeleton */}
        <section 
          className="hero" 
          style={{ 
            height: "350px", 
            background: "linear-gradient(90deg, var(--public-border, #cbd5e1) 25%, var(--public-border, #e2e8f0) 50%, var(--public-border, #cbd5e1) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            position: "relative" 
          }}
        >
          <div className="container hero-shell" style={{ position: "relative", zIndex: 3, height: "100%", display: "flex", alignItems: "flex-end", paddingBottom: "2rem" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ width: "6rem", height: "1.5rem", borderRadius: "9999px", background: "rgba(255,255,255,0.2)" }} />
              <div style={{ width: "50%", height: "2.5rem", borderRadius: "0.5rem", background: "rgba(255,255,255,0.2)" }} />
              <div style={{ width: "30%", height: "1.2rem", borderRadius: "0.25rem", background: "rgba(255,255,255,0.25)" }} />
            </div>
          </div>
        </section>

        {/* Content Skeleton */}
        <section className="section" style={{ paddingTop: "2rem" }}>
          <div className="container">
            {/* Breadcrumb Skeleton */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
              <span style={{ width: "4rem", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
              <span style={{ color: "var(--public-border, #cbd5e1)" }}>&gt;</span>
              <span style={{ width: "3rem", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
              <span style={{ color: "var(--public-border, #cbd5e1)" }}>&gt;</span>
              <span style={{ width: "8rem", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
            </div>

            <div 
              style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "2.5rem" }}
              className="tour-detail-grid"
            >
              {/* Left Column Skeletons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
                
                {/* Overview Skeleton */}
                <div className="surface-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ width: "35%", height: "1.5rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
                  <div style={{ width: "100%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                  <div style={{ width: "95%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                  <div style={{ width: "98%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                  <div style={{ width: "60%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                </div>

                {/* Highlights Skeleton */}
                <div className="surface-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ width: "30%", height: "1.5rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ width: "1rem", height: "1rem", borderRadius: "9999px", background: "var(--public-border, #cbd5e1)" }} />
                      <span style={{ width: "80%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ width: "1rem", height: "1rem", borderRadius: "9999px", background: "var(--public-border, #cbd5e1)" }} />
                      <span style={{ width: "70%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ width: "1rem", height: "1rem", borderRadius: "9999px", background: "var(--public-border, #cbd5e1)" }} />
                      <span style={{ width: "85%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ width: "1rem", height: "1rem", borderRadius: "9999px", background: "var(--public-border, #cbd5e1)" }} />
                      <span style={{ width: "75%", height: "1rem", borderRadius: "0.25rem", background: "var(--public-border, #e2e8f0)" }} />
                    </div>
                  </div>
                </div>

                {/* Itinerary Accordion Skeletons */}
                <div className="surface-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ width: "25%", height: "1.5rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)", marginBottom: "0.5rem" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "2px dashed var(--public-border, #cbd5e1)", paddingLeft: "1.5rem", marginLeft: "0.25rem" }}>
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} style={{ height: "3.5rem", borderRadius: "0.75rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #e2e8f0)", width: "100%" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column Booking Skeleton */}
              <div>
                <div className="surface-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ width: "50%", height: "1.5rem", borderRadius: "0.25rem", background: "var(--public-border, #cbd5e1)" }} />
                  <div style={{ width: "100%", height: "2.75rem", borderRadius: "0.75rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #e2e8f0)" }} />
                  <div style={{ width: "100%", height: "2.75rem", borderRadius: "0.75rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #e2e8f0)" }} />
                  <div style={{ width: "100%", height: "3rem", borderRadius: "0.75rem", background: "var(--public-border, #cbd5e1)", marginTop: "0.5rem" }} />
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!tour) {
    return (
      <div className="container" style={{ padding: "8rem 2rem", textAlign: "center" }}>
        <h2>Không tìm thấy Tour du lịch</h2>
        <p style={{ color: "var(--muted)", margin: "1rem 0 2rem" }}>
          Đường dẫn không tồn tại hoặc tour đã dừng khởi hành.
        </p>
        <Link href="/tours" className="button button-primary">
          Xem tất cả tour
        </Link>
      </div>
    );
  }

  // Get related tours (excluding current one, same type)
  const relatedTours = allTours.length > 0
    ? allTours.filter((t) => t.slug !== tour.slug && t.type === tour.type).slice(0, 3)
    : [];

  return (
    <main>
      {/* ── Tour Banner Hero ── */}
      <section
        className="hero"
        style={{ padding: "6rem 0", position: "relative", overflow: "hidden" }}
      >
        <Image
          src={tour.heroImage}
          alt={tour.title}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center", zIndex: 0 }}
        />
        <div
          className="tour-detail-hero-overlay"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(26, 22, 17, 0.88), rgba(46, 38, 28, 0.75))",
            zIndex: 1,
          }}
        />
        <div className="hero__backdrop" style={{ zIndex: 2 }} />
        <div className="container hero-shell" style={{ position: "relative", zIndex: 3 }}>
          <div style={{ color: "white", maxWidth: "48rem" }}>
            <span
              className="hero-kicker"
              style={{
                background: "rgba(181, 129, 63, 0.25)",
                padding: "0.3rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(4px)",
              }}
            >
              {tour.tag}
            </span>
            <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", margin: "1rem 0 0.5rem", color: "#ffffff" }}>
              {tour.title}
            </h1>
            <p style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.9)", fontWeight: 500, marginBottom: "1.5rem" }}>
              🛫 Khởi hành: <strong>{tour.departurePoint || "Chưa xác định"}</strong> &nbsp;|&nbsp; 📍 Lộ trình: {tour.route}
            </p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.95rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🕒 <strong>Thời gian:</strong> {tour.duration}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                💰 <strong>Giá khoảng:</strong> {tour.price}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                📍 <strong>Loại:</strong> {tour.type === "domestic" ? "Tour trong nước" : "Tour quốc tế"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <section className="section" style={{ background: "var(--public-background, #fcfaf6)" }}>
        <div className="container">
          {/* Breadcrumb */}
          <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "2rem" }}>
            <Link href="/">Trang chủ</Link> &gt; <Link href="/tours">Tours</Link> &gt;{" "}
            <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{tour.title}</span>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "2.5rem", alignItems: "start" }}
            className="tour-detail-grid"
          >
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              {/* Overview */}
              <div className="surface-panel" style={{ padding: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <h3 style={{ fontSize: "1.45rem", margin: 0, position: "relative", paddingBottom: "0.5rem" }}>
                    Tổng quan hành trình
                    <span style={{ position: "absolute", bottom: 0, left: 0, width: "3rem", height: "3px", background: "var(--accent)" }} />
                  </h3>
                  {tour.documentUrl && (
                    <a
                      href={tour.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent"
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "var(--accent)",
                        color: "white",
                        boxShadow: "var(--shadow)"
                      }}
                    >
                      📄 Xem Chương Trình Tour
                    </a>
                  )}
                </div>
                <p style={{ whiteSpace: "pre-line", lineHeight: "1.8", color: "var(--public-text, #475569)" }}>{tour.description}</p>
                {(tour.isPromo || tour.tags?.length > 0) && <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>{tour.isPromo && <span style={{ padding: "0.35rem 0.7rem", borderRadius: "999px", background: "#dc2626", color: "white", fontSize: "0.78rem", fontWeight: 800 }}>🔥 Đang giảm giá</span>}{tour.tags?.map((tag: any) => <span key={tag.id || tag.name} style={{ padding: "0.35rem 0.7rem", borderRadius: "999px", background: "var(--public-warning-surface, #fff7ed)", border: "1px solid var(--public-warning-border, #fed7aa)", color: "var(--public-warning-text, #9a3412)", fontSize: "0.78rem", fontWeight: 700 }}>🏷 {tag.name}</span>)}</div>}
              </div>

              {/* Bảng giá chi tiết */}
              <div className="surface-panel" style={{ padding: "2rem" }}>
                <h3 style={{ fontSize: "1.45rem", marginBottom: "1.2rem", position: "relative", paddingBottom: "0.5rem" }}>
                  Bảng giá Tour chi tiết
                  <span style={{ position: "absolute", bottom: 0, left: 0, width: "3rem", height: "3px", background: "var(--accent)" }} />
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.95rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-strong)", background: "var(--public-surface-soft, #f8fafc)" }}>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--public-text-strong, #1e293b)" }}>Đối tượng</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--public-text-strong, #1e293b)" }}>Độ tuổi áp dụng</th>
                        <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--public-text-strong, #1e293b)", textAlign: "right" }}>Giá tour</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "1rem", fontWeight: 600, color: "var(--public-text-strong, #0f172a)" }}>Người lớn</td>
                        <td style={{ padding: "1rem", color: "var(--public-text, #475569)" }}>Từ 12 tuổi trở lên</td>
                        <td style={{ padding: "1rem", fontWeight: 700, color: "var(--accent)", textAlign: "right" }}>{tour.price}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "1rem", fontWeight: 600, color: "var(--public-text-strong, #0f172a)" }}>Trẻ em</td>
                        <td style={{ padding: "1rem", color: "var(--public-text, #475569)" }}>Từ 2 đến dưới 12 tuổi</td>
                        <td style={{ padding: "1rem", fontWeight: 700, color: "var(--public-text-strong, #0f172a)", textAlign: "right" }}>{tour.priceChild || "Liên hệ tư vấn"}</td>
                      </tr>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "1rem", fontWeight: 600, color: "var(--public-text-strong, #0f172a)" }}>Em bé</td>
                        <td style={{ padding: "1rem", color: "var(--public-text, #475569)" }}>Dưới 2 tuổi</td>
                        <td style={{ padding: "1rem", fontWeight: 700, color: "var(--public-text-strong, #0f172a)", textAlign: "right" }}>{tour.priceInfant || "Liên hệ tư vấn"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <small style={{ color: "var(--public-muted, #64748b)", marginTop: "1rem", display: "block", lineHeight: "1.5" }}>
                  * Lưu ý: Giá tour có thể thay đổi tùy thuộc vào ngày khởi hành và các chương trình khuyến mãi hiện hành. Vui lòng liên hệ hỗ trợ hoặc nhấn "Đặt tour" để nhận giá chính xác nhất.
                </small>
              </div>

              {tour.accommodationPrices?.length > 0 && (
                <div className="surface-panel" style={{ padding: "2rem", overflowX: "auto" }}>
                  <h3 style={{ fontSize: "1.45rem", marginBottom: "1rem" }}>Giá theo hạng lưu trú</h3>
                  <p style={{ color: "var(--public-muted, #64748b)", marginBottom: "1rem" }}>Bảng giá áp dụng cho đoàn từ {tour.minGroupSize} khách.</p>
                  <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse" }}><thead><tr style={{ background: "var(--public-surface-soft, #f8fafc)" }}>{["Khách sạn", "Loại phòng", "Khách/phòng", "Người lớn", "Trẻ em", "Phụ thu phòng đơn"].map((label) => <th key={label} style={{ padding: "0.8rem", textAlign: "left", borderBottom: "1px solid var(--public-border, #e2e8f0)" }}>{label}</th>)}</tr></thead><tbody>{tour.accommodationPrices.map((option: any, index: number) => <tr key={index}>{[`${option.hotel_stars} sao`, option.room_type, option.guests_per_room, `${new Intl.NumberFormat("vi-VN").format(option.adult_price)} VNĐ`, `${new Intl.NumberFormat("vi-VN").format(option.child_price)} VNĐ`, `${new Intl.NumberFormat("vi-VN").format(option.single_supplement)} VNĐ`].map((value, i) => <td key={i} style={{ padding: "0.8rem", borderBottom: "1px solid var(--public-border, #e2e8f0)" }}>{value}</td>)}</tr>)}</tbody></table>
                </div>
              )}

              {(tour.priceIncludes || tour.priceExcludes || tour.cancellationPolicy || tour.paymentTerms) && (
                <div className="surface-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.45rem", marginBottom: "1.2rem" }}>Điều kiện và chính sách Tour</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                    {[["✅ Giá Tour bao gồm", tour.priceIncludes], ["➖ Giá Tour không bao gồm", tour.priceExcludes], ["↩️ Điều khoản hoàn – huỷ", tour.cancellationPolicy], ["💳 Điều kiện thanh toán", tour.paymentTerms]].filter(([, value]) => value).map(([label, value]) => <div key={label} style={{ padding: "1rem", background: "var(--public-surface-soft, #f8fafc)", borderRadius: "0.75rem", border: "1px solid var(--public-border, #e2e8f0)" }}><h4 style={{ marginBottom: "0.6rem" }}>{label}</h4><p style={{ whiteSpace: "pre-line", color: "var(--public-text, #475569)", lineHeight: 1.7 }}>{value}</p></div>)}
                  </div>
                </div>
              )}

              {/* Lưu ý hành trình */}
              {tour.notes && (
                <div className="surface-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.45rem", marginBottom: "1.2rem", position: "relative", paddingBottom: "0.5rem" }}>
                    📝 Lưu ý hành trình
                    <span style={{ position: "absolute", bottom: 0, left: 0, width: "3rem", height: "3px", background: "var(--accent)" }} />
                  </h3>
                  <p style={{ whiteSpace: "pre-line", lineHeight: "1.8", color: "var(--public-text, #475569)", fontSize: "0.95rem" }}>
                    {tour.notes}
                  </p>
                </div>
              )}

              {tour.importantNote && <div style={{ padding: "1.25rem 1.5rem", borderRadius: "0.75rem", border: "1px solid var(--public-error-border, #fca5a5)", background: "var(--public-error-surface, #fff1f2)", color: "var(--public-error-text, #b91c1c)", whiteSpace: "pre-line", lineHeight: 1.7, fontWeight: 600 }}><strong style={{ display: "block", marginBottom: "0.4rem" }}>⚠️ Lưu ý quan trọng</strong>{tour.importantNote}</div>}

              {/* Itinerary */}
              {tour.itinerary && tour.itinerary.length > 0 && (
                <div className="surface-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.45rem", marginBottom: "1.5rem", position: "relative", paddingBottom: "0.5rem" }}>
                    Lịch trình chi tiết
                    <span style={{ position: "absolute", bottom: 0, left: 0, width: "3rem", height: "3px", background: "var(--accent)" }} />
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", position: "relative", paddingLeft: "1.5rem", borderLeft: "2px dashed var(--border-strong)" }}>
                    {tour.itinerary.map((item: any, index: number) => {
                      const isExpanded = !!expandedDays[index];
                      return (
                        <div key={index} style={{ position: "relative", marginBottom: "0.5rem" }}>
                          <div
                            style={{
                              position: "absolute",
                              left: "calc(-1.5rem - 6px)",
                              top: "0.6rem",
                              width: "10px",
                              height: "10px",
                              borderRadius: "999px",
                              background: isExpanded ? "var(--accent)" : "white",
                              border: "2px solid var(--accent)",
                              zIndex: 2,
                              boxShadow: "var(--shadow)",
                              transition: "all 0.2s ease",
                            }}
                          />
                          <div
                            className="surface-panel"
                            style={{
                              padding: "1rem 1.25rem",
                              cursor: "pointer",
                              borderColor: isExpanded ? "var(--accent-light)" : "var(--border)",
                              boxShadow: isExpanded ? "var(--shadow-lift)" : "var(--shadow)",
                              transform: "none",
                            }}
                            onClick={() => toggleDay(index)}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <h4 style={{ fontSize: "1.05rem", color: "var(--public-text-strong, #0f172a)", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                                <span style={{ color: "var(--accent)" }}>{item.day}:</span>
                                <span>{item.title}</span>
                              </h4>
                              <span style={{ fontSize: "1.25rem", color: "var(--muted)", fontWeight: "bold" }}>
                                {isExpanded ? "−" : "+"}
                              </span>
                            </div>
                            {isExpanded && (
                              <div
                                style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem", animation: "fadeIn 0.3s ease-out" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(item.meals || item.overnight) && (
                                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.85rem", fontSize: "0.88rem", background: "var(--public-surface-soft, #f8fafc)", padding: "0.6rem 0.85rem", borderRadius: "0.5rem", border: "1px solid var(--public-border, #e2e8f0)", color: "var(--public-text, #475569)", flexWrap: "wrap" }}>
                                    {item.overnight && (
                                      <span><strong>🏨 Nghỉ đêm:</strong> {item.overnight}</span>
                                    )}
                                    {item.meals && (
                                      <span><strong>🍴 Bữa ăn:</strong> {item.meals}</span>
                                    )}
                                  </div>
                                )}
                                <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
                                  {item.activities.map((act: string, idx: number) => renderActivityLine(act, idx))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Gallery Section ── */}
              {tour.galleryImages && tour.galleryImages.length > 0 && (
                <div className="surface-panel" style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.45rem", marginBottom: "1.2rem", position: "relative", paddingBottom: "0.5rem" }}>
                    Hình ảnh điểm đến
                    <span style={{ position: "absolute", bottom: 0, left: 0, width: "3rem", height: "3px", background: "var(--accent)" }} />
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                    {tour.galleryImages.map((img: string, index: number) => (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          aspectRatio: "4/3",
                          borderRadius: "1rem",
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                        }}
                        onClick={() => setLightboxImg(img)}
                      >
                        <Image
                          src={img}
                          alt={`${tour.title} hình ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 20vw"
                          style={{ objectFit: "cover" }}
                          className="transition-transform duration-500 hover:scale-110"
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s ease",
                          }}
                          className="gallery-overlay"
                        >
                          <span style={{ color: "white", fontSize: "1.5rem", opacity: 0 }}>🔍</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Booking Widget */}
            <div id="booking-card-container" style={{ position: "sticky", top: "128px", display: "flex", flexDirection: "column", gap: "1.5rem", zIndex: 10 }}>
              <div className="surface-panel" style={{ padding: "2rem", borderRadius: "1.25rem", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--public-muted, #64748b)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Giá tour từ</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", margin: "0.4rem 0 1rem" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{tour.price}</span>
                  <span style={{ fontSize: "0.88rem", color: "var(--public-muted, #64748b)" }}>/khách</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "var(--public-text, #475569)", borderTop: "1px solid var(--border)", paddingTop: "1.25rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>⏱</span>
                    <span>Lịch trình: <strong>{tour.duration}</strong></span>
                  </div>
                  {tour.departurePoint && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>🛫</span>
                      <span>Điểm đi: <strong>{tour.departurePoint}</strong></span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.1rem", marginTop: "0.1rem" }}>📍</span>
                    <span style={{ color: "var(--public-text, #475569)", lineHeight: "1.5" }}>
                      Tuyến: <strong>{tour.route}</strong>
                    </span>
                  </div>
                </div>

                <Link
                  href={`/checkout?tourSlug=${tour.slug}`}
                  className="button button-primary"
                  style={{
                    width: "100%",
                    textAlign: "center",
                    textDecoration: "none",
                    padding: "0.9rem",
                    fontSize: "1rem",
                    fontWeight: 800,
                    borderRadius: "0.75rem",
                    display: "block",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)"
                  }}
                >
                  ⚡️ ĐẶT TOUR NGAY
                </Link>

                <a
                  href="https://zalo.me/0367535688"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary"
                  style={{
                    width: "100%",
                    textAlign: "center",
                    textDecoration: "none",
                    padding: "0.8rem",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    borderRadius: "0.75rem",
                    marginTop: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem"
                  }}
                >
                  💬 Nhận tư vấn qua Zalo
                </a>
              </div>

              <div className="surface-panel" style={{ padding: "1.5rem 2rem", background: "linear-gradient(180deg, var(--surface-dark), #1a1c22)", color: "white", borderRadius: "1.25rem", position: "relative", zIndex: 1 }}>
                <h4 style={{ color: "white", marginBottom: "0.5rem", fontSize: "1rem" }}>Cần tư vấn trực tiếp?</h4>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: "1.5", marginBottom: "1.2rem" }}>
                  Đội ngũ hỗ trợ của New Star Tour phục vụ 24/7. Nhấp gọi ngay hotline hỗ trợ.
                </p>
                <a
                  href="tel:0367535688"
                  className="button button-primary"
                  style={{ width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}
                >
                  📞 Gọi 0367.535.688
                </a>
              </div>
            </div>
          </div>

          {/* Related Tours */}
          {relatedTours.length > 0 && (
            <div style={{ marginTop: "5rem" }}>
              <SectionTitle
                eyebrow="Gợi ý dành cho bạn"
                title="Các tour tương tự nổi bật"
                description={`Khám phá thêm các hành trình ${tour.type === "domestic" ? "nội địa" : "quốc tế"} hấp dẫn khác.`}
              />
              <div className="featured-rail">
                {relatedTours.map((t: any) => (
                  <TourCard tour={t} key={t.slug} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setLightboxImg(null)}
        >
          <button
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "none", border: "none", color: "white", fontSize: "2rem", cursor: "pointer" }}
            onClick={() => setLightboxImg(null)}
          >
            ×
          </button>
          <div
            style={{ position: "relative", width: "90vw", maxWidth: "1000px", aspectRatio: "16/9", borderRadius: "1rem", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={lightboxImg} alt="Tour image full" fill style={{ objectFit: "contain" }} sizes="90vw" />
          </div>
        </div>
      )}

      {/* ── Mobile Sticky Booking Bar ── */}
      <div 
        className="tour-detail-mobile-booking fixed bottom-0 left-0 right-0 z-50 p-4 flex md:hidden justify-between items-center border-t border-[var(--border-strong)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md bg-white/90"
        style={{
          boxShadow: "0 -8px 24px rgba(143, 100, 44, 0.08)"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500 }}>Giá khoảng:</span>
          <strong style={{ fontSize: "1.15rem", color: "var(--accent-dark)", fontWeight: 700 }}>{tour.price}</strong>
        </div>
        <button
          onClick={() => {
            const formElement = document.getElementById("booking-card-container");
            if (formElement) {
              formElement.scrollIntoView({ behavior: "smooth" });
            } else {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }
          }}
          className="button button-primary"
          style={{ padding: "0.6rem 1.4rem", borderRadius: "0.75rem", fontSize: "0.9rem", fontWeight: 700 }}
        >
          Đặt ngay
        </button>
      </div>
    </main>
  );
}
