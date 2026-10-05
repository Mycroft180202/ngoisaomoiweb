"use client";

import { use, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { TourCard } from "@/components/tours/TourCard";
import { TourCardSkeleton } from "@/components/tours/TourCardSkeleton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getDriveThumbnailUrl } from "@/utils/image";


export default function ToursClient({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; query?: string }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const initialType = resolvedSearchParams.type || "all";
  const initialQuery = resolvedSearchParams.query || "";

  const [prevInitialType, setPrevInitialType] = useState(initialType);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [selectedType, setSelectedType] = useState(initialType);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    return tours
      .filter((tour) => {
        const matchesType = selectedType === "all" || tour.type === selectedType;
        const matchesSearch =
          tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tour.route.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      })
      .slice(0, 5);
  }, [tours, searchQuery, selectedType]);

  if (initialType !== prevInitialType || initialQuery !== prevInitialQuery) {
    setPrevInitialType(initialType);
    setPrevInitialQuery(initialQuery);
    setSelectedType(initialType);
    setSearchQuery(initialQuery);
  }

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/api/tours/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          const mapped = data.map((t: any) => {
            // Resolve primary thumbnail from new images system
            const rawImages: any[] = t.images || [];
            const primaryImg = rawImages.find((img: any) => img.is_primary);
            const bannerImg = rawImages.find((img: any) => img.image_type === "banner");
            const firstImg = rawImages[0];
            const chosenImg = primaryImg || bannerImg || firstImg;
            const thumbnail = chosenImg
              ? (getDriveThumbnailUrl(chosenImg.url) || chosenImg.url)
              : getDriveThumbnailUrl(t.image) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";

            return {
              slug: t.slug,
              title: t.title,
              route: t.location,
              duration: t.duration,
              price: new Intl.NumberFormat("vi-VN").format(t.price) + " VNĐ",
              departurePoint: t.departure_point?.name || "",
              tag: !t.is_international ? "Trong nước" : "Nước ngoài",
              tags: t.tags || [],
              isPromo: !!t.is_promo,
              type: !t.is_international ? "domestic" : "international",
              thumbnail,
              tourImages: rawImages,
              description: t.description || "",
            };
          });
          setTours(mapped);
        } else {
          setTours([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch tours from API:", err);
        setTours([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const matchesType =
        selectedType === "all" || tour.type === selectedType;
      const matchesSearch =
        tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tour.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [tours, selectedType, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: tours.length,
      domestic: tours.filter((t) => t.type === "domestic").length,
      international: tours.filter((t) => t.type === "international").length,
    };
  }, [tours]);

  return (
    <main className="min-h-screen">
      <section className="hero hero--sample" style={{ padding: "5rem 0", minHeight: "auto" }}>
        <div className="hero__backdrop" />
        <div className="container hero-shell">
          <div className="hero-copy" style={{ padding: "2rem 0", textAlign: "center", maxWidth: "100%", alignItems: "center" }}>
            <span className="hero-kicker">New Star Tour</span>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: "0.5rem 0" }}>Hành trình của bạn bắt đầu từ đây</h1>
            <p style={{ maxWidth: "42rem", margin: "0.5rem auto 0" }}>
              Tìm kiếm và lựa chọn tour du lịch trong nước &amp; quốc tế phù hợp nhất với mong muốn của bạn.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "3rem" }}>
        <div className="container">
          {/* Filters and Search Strip */}
          <div className="surface-panel" style={{ padding: "1.5rem", marginBottom: "3rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "space-between", alignItems: "center" }}>
            {/* Filter buttons */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                className={`button ${selectedType === "all" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.88rem" }}
                onClick={() => setSelectedType("all")}
              >
                Tất cả ({counts.all})
              </button>
              <button
                className={`button ${selectedType === "domestic" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.88rem" }}
                onClick={() => setSelectedType("domestic")}
              >
                Trong nước ({counts.domestic})
              </button>
              <button
                className={`button ${selectedType === "international" ? "button-primary" : "button-secondary"}`}
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.88rem" }}
                onClick={() => setSelectedType("international")}
              >
                Nước ngoài ({counts.international})
              </button>
            </div>

            {/* Search Input */}
            <div ref={dropdownRef} style={{ flex: "1", maxWidth: "24rem", minWidth: "15rem", position: "relative" }}>
              <input
                type="text"
                placeholder="Tìm Phú Quốc, Sapa, Singapore..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{
                  width: "100%",
                  padding: "0.7rem 1rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-strong)",
                  fontSize: "0.92rem",
                  outline: "none",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
                }}
              />
              {showDropdown && suggestions.length > 0 && (
                <div className="tour-search-dropdown" style={{ top: "110%" }}>
                  {suggestions.map((tour) => (
                    <Link
                      key={tour.slug}
                      href={`/tours/${tour.slug}`}
                      className="tour-search-item"
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={tour.thumbnail}
                        alt={tour.title}
                        className="tour-search-item__thumb"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=60";
                        }}
                      />
                      <div className="tour-search-item__info">
                        <span className="tour-search-item__name">{tour.title}</span>
                        <div className="tour-search-item__meta">
                          <span className="tour-search-item__tag">{tour.tag}</span>
                          <span style={{ color: "var(--public-muted, #94a3b8)" }}>·</span>
                          <span style={{ color: "var(--public-muted, #64748b)" }}>{tour.duration}</span>
                          <span style={{ color: "var(--public-muted, #94a3b8)" }}>·</span>
                          <span className="tour-search-item__price">{tour.price}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SectionTitle
            eyebrow="Danh sách hành trình"
            title={
              selectedType === "all"
                ? "Tất cả các tour du lịch"
                : selectedType === "domestic"
                ? "Tour du lịch trong nước"
                : "Tour du lịch quốc tế"
            }
            description={`Hiển thị ${filteredTours.length} tour tìm thấy theo bộ lọc của bạn.`}
          />

          {loading ? (
            <div className="featured-rail">
              {Array.from({ length: 6 }).map((_, idx) => (
                <TourCardSkeleton key={idx} />
              ))}
            </div>
          ) : filteredTours.length > 0 ? (
            <div className="featured-rail">
              {filteredTours.map((tour) => (
                <TourCard tour={tour} key={tour.slug} />
              ))}
            </div>
          ) : (
            <div className="surface-panel" style={{ padding: "4rem 2rem", textAlign: "center", borderRadius: "1.5rem" }}>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Không tìm thấy tour phù hợp</h3>
              <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>Thử thay đổi từ khóa tìm kiếm hoặc chuyển đổi bộ lọc khác.</p>
              <button
                className="button button-primary"
                onClick={() => {
                  setSelectedType("all");
                  setSearchQuery("");
                }}
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
