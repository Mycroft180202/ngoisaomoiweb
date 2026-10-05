"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { CalendarField } from "@/components/booking/CalendarField";
import { useRouter } from "next/navigation";
import { getDriveThumbnailUrl } from "@/utils/image";

interface BookingCardProps {
  tourId?: number;
  tourSlug?: string;   // When provided, use directly for checkout redirect
  prefillValue?: string;
  isVertical?: boolean;
}

interface TourSuggestion {
  id: number;
  slug: string;
  title: string;
  price: number;
  duration: string;
  thumbnail: string;
  tag: string;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

export function BookingCard({ tourId, tourSlug, prefillValue = "", isVertical = false }: BookingCardProps) {
  const router = useRouter();
  const [prevPrefill, setPrevPrefill] = useState(prefillValue);
  const [destination, setDestination] = useState(prefillValue);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [guestsCount, setGuestsCount] = useState<number>(1);

  // Selected tour from suggestion
  const [selectedTour, setSelectedTour] = useState<TourSuggestion | null>(null);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<TourSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  if (prefillValue !== prevPrefill) {
    setPrevPrefill(prefillValue);
    setDestination(prefillValue);
    setSelectedTour(null);
  }

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDestinationChange = useCallback((value: string) => {
    setDestination(value);
    setSelectedTour(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setNoResults(false);
      try {
        const res = await fetch(`${API_BASE}/tours/?search=${encodeURIComponent(value.trim())}&limit=8`);
        const data = res.ok ? await res.json() : [];
        const mapped: TourSuggestion[] = (data || []).map((t: any) => {
          const rawImages: any[] = t.images || [];
          const primaryImg = rawImages.find((img: any) => img.is_primary);
          const bannerImg = rawImages.find((img: any) => img.image_type === "banner");
          const firstImg = rawImages[0];
          const chosenImg = primaryImg || bannerImg || firstImg;
          const thumbnail = chosenImg
            ? (getDriveThumbnailUrl(chosenImg.url) || chosenImg.url)
            : getDriveThumbnailUrl(t.image) || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=60";
          return {
            id: t.id,
            slug: t.slug,
            title: t.title,
            price: t.price,
            duration: t.duration,
            thumbnail,
            tag: !t.is_international ? "Trong nước" : "Nước ngoài",
          };
        });
        setSuggestions(mapped);
        setNoResults(mapped.length === 0);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
        setNoResults(true);
        setShowDropdown(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleSelectSuggestion = (tour: TourSuggestion) => {
    setDestination(tour.title);
    setSelectedTour(tour);
    setSuggestions([]);
    setShowDropdown(false);
    setNoResults(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync destination scroll and pulse highlight on prefill event
  useEffect(() => {
    const handlePrefill = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const value = customEvent.detail;
      setDestination(value);
      setSelectedTour(null);

      const bookingSection = document.getElementById("booking");
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.classList.add("highlight-pulse");
          setTimeout(() => {
            inputRef.current?.classList.remove("highlight-pulse");
          }, 1500);
        }
      }, 500);
    };

    window.addEventListener("prefill-booking", handlePrefill);
    return () => window.removeEventListener("prefill-booking", handlePrefill);
  }, []);

  // Submit handler — go to checkout
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destination.trim()) {
      inputRef.current?.focus();
      inputRef.current?.classList.add("highlight-pulse");
      setTimeout(() => inputRef.current?.classList.remove("highlight-pulse"), 1500);
      return;
    }

    if (!selectedDate) {
      triggerToast("Vui lòng chọn ngày khởi hành trước khi tiếp tục.", "error");
      return;
    }

    if (guestsCount < 1) {
      triggerToast("Số lượng khách phải lớn hơn hoặc bằng 1.", "error");
      return;
    }

    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

    // If BookingCard has a pre-known tourSlug (e.g. tour detail sidebar)
    if (tourSlug) {
      router.push(`/checkout?tourSlug=${tourSlug}&date=${dateStr}&guests=${guestsCount}`);
      return;
    }

    // If a tour was selected from suggestions — go directly to checkout
    if (selectedTour) {
      router.push(`/checkout?tourSlug=${selectedTour.slug}&date=${dateStr}&guests=${guestsCount}`);
      return;
    }

    // Option A: Free-text — pick first matching tour from API
    try {
      const res = await fetch(`${API_BASE}/tours/?search=${encodeURIComponent(destination.trim())}&limit=1`);
      const data = res.ok ? await res.json() : [];

      if (data && data.length > 0) {
        router.push(`/checkout?tourSlug=${data[0].slug}&date=${dateStr}&guests=${guestsCount}`);
      } else {
        // No match at all — go to checkout with free-text title
        router.push(`/checkout?tourTitle=${encodeURIComponent(destination.trim())}&date=${dateStr}&guests=${guestsCount}`);
      }
    } catch {
      triggerToast("Lỗi khi tìm kiếm tour. Vui lòng thử lại.", "error");
    }
  };

  return (
    <div className="booking-card" id="booking">
      <div className="booking-card__header">
        <span className="booking-card__eyebrow">Đặt Tour / Tư Vấn</span>
        <h2>Tìm tour phù hợp</h2>
        <p>Chọn điểm đến, ngày khởi hành và số khách để nhận tư vấn nhanh.</p>
      </div>

      <form className={`booking-form ${isVertical ? "booking-form--vertical" : ""}`} onSubmit={handleSubmit}>
        <label className="booking-field">
          <span>Điểm đến / tour</span>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div style={{ position: "relative" }}>
              <input
                ref={inputRef}
                type="text"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                onFocus={() => {
                  if (destination.trim().length >= 2 && (suggestions.length > 0 || noResults)) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Phú Quốc, Sapa, Singapore..."
                required
                autoComplete="off"
              />
              {searchLoading && (
                <span className="search-spinner" />
              )}
              {selectedTour && (
                <span style={{
                  position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  color: "#10b981", fontWeight: 700, fontSize: "1rem"
                }}>✓</span>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div className="tour-search-dropdown">
                {noResults ? (
                  <div className="tour-search-noresult">
                    <span style={{ fontSize: "1.5rem" }}>🔍</span>
                    <div>
                      <strong>Không tìm thấy tour phù hợp</strong>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--public-muted, #64748b)" }}>
                        Thử từ khoá khác hoặc xem{" "}
                        <a href="/tours" style={{ color: "var(--accent)", textDecoration: "underline" }}>tất cả tour</a>
                      </p>
                    </div>
                  </div>
                ) : (
                  suggestions.map((tour) => (
                    <button
                      key={tour.id}
                      type="button"
                      className="tour-search-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(tour)}
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
                          <span className="tour-search-item__price">
                            {new Intl.NumberFormat("vi-VN").format(tour.price)} VNĐ
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </label>

        <CalendarField selectedDate={selectedDate} onChange={setSelectedDate} />

        <label className="booking-field">
          <span>Số khách</span>
          <input
            type="number"
            min={1}
            value={guestsCount}
            onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
            placeholder="1"
            required
          />
        </label>

        <button
          className="button button-primary booking-submit"
          type="submit"
        >
          {selectedTour ? "Đặt ngay" : "Tìm & Đặt tour"}
        </button>
      </form>

      {toast && (
        <div style={{
          position: "fixed", bottom: "2rem", right: "2rem", zIndex: 99999,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "white", padding: "1.5rem", borderRadius: "0.75rem",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: "0.75rem",
          fontWeight: 600, fontFamily: "inherit", fontSize: "0.95rem"
        }}>
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <div>{toast.message}</div>
          <button type="button" onClick={() => setToast(null)}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.25rem", marginLeft: "1rem", lineHeight: 1 }}>
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
