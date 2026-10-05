"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getDriveThumbnailUrl } from "@/utils/image";
import { apiRequest } from "@/utils/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";

interface TourSchedule {
  id: number;
  departure_date: string;  // ISO date string "YYYY-MM-DD"
  max_capacity: number;
  booked_seats: number;
  status: string;
}

interface CustomDeparture {
  date: string;
  price?: number;
  promo_price?: number;
}

interface TourData {
  id: number;
  slug: string;
  title: string;
  price: number;
  price_child: number;
  price_infant: number;
  duration: string;
  location: string;
  departure_point?: { name: string };
  is_international: boolean;
  thumbnail: string;
  custom_departures?: (string | CustomDeparture)[];
  is_daily: boolean;
  recurring_days?: number[];
  is_promo?: boolean;
  price_daily?: number;
  price_promo_daily?: number;
  schedules?: TourSchedule[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " VNĐ";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}

function CalendarPicker({
  value,
  minDate,
  onChange,
}: {
  value: string;
  minDate: string;
  onChange: (value: string) => void;
}) {
  const minimumDate = parseDateKey(minDate) || new Date();
  const selectedDate = parseDateKey(value);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = selectedDate || minimumDate;
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(visibleMonth);
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - firstDay + 1)
  );
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const isPreviousMonthDisabled = previousMonth < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1);

  return (
    <div className="checkout-calendar" aria-label="Chọn ngày khởi hành">
      <div className="checkout-calendar__topbar">
        <div>
          <span className="checkout-calendar__eyebrow">Ngày khởi hành</span>
          <strong>{value ? formatDate(value) : "Chọn ngày của bạn"}</strong>
        </div>
        <span className="checkout-calendar__icon" aria-hidden>📅</span>
      </div>
      <div className="checkout-calendar__monthbar">
        <button
          type="button"
          onClick={() => setVisibleMonth(previousMonth)}
          disabled={isPreviousMonthDisabled}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <strong>{monthLabel}</strong>
        <button
          type="button"
          onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>
      <div className="checkout-calendar__weekdays" aria-hidden>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="checkout-calendar__days">
        {calendarCells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="checkout-calendar__empty" />;
          const valueKey = dateKey(day);
          const isPast = valueKey < dateKey(minimumDate);
          const isSelected = valueKey === value;
          return (
            <button
              key={valueKey}
              type="button"
              className={isSelected ? "is-selected" : ""}
              disabled={isPast}
              onClick={() => onChange(valueKey)}
              aria-label={`Chọn ngày ${formatDate(valueKey)}`}
              aria-pressed={isSelected}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <p className="checkout-calendar__hint">Định dạng ngày: ngày / tháng / năm</p>
    </div>
  );
}

function GuestStepper({ label, count, setCount, min = 0 }: { label: string; count: number; setCount: (c: number) => void; min?: number }) {
  return (
    <div className="checkout-field">
      <label>{label}</label>
      <div className="checkout-stepper">
        <button type="button" onClick={() => setCount(Math.max(min, count - 1))}>−</button>
        <span>{count}</span>
        <button type="button" onClick={() => setCount(count + 1)}>+</button>
      </div>
    </div>
  );
}

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tourSlug = searchParams.get("tourSlug") || "";
  const tourTitle = searchParams.get("tourTitle") || "";
  const dateParam = searchParams.get("date") || "";
  const guestsParam = parseInt(searchParams.get("guests") || "1");

  // Tour data
  const [tour, setTour] = useState<TourData | null>(null);
  const [tourLoading, setTourLoading] = useState(!!tourSlug);
  const [tourError, setTourError] = useState(false);

  // Form: contact
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Form: guests
  const [adultsCount, setAdultsCount] = useState(guestsParam > 0 ? guestsParam : 1);
  const [childrenCount, setChildrenCount] = useState(0);  // 2–11 tuổi
  const [infantCount, setInfantCount] = useState(0);      // dưới 2 tuổi

  // Form: departure date
  const [selectedDateStr, setSelectedDateStr] = useState<string>(dateParam || "");

  // Promo code
  const [discountCode, setDiscountCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_type: string; value: number; min_value: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Submit states and anti-spam lock
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load user profile if logged in OR restore guest contact details
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (token) {
      apiRequest("auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setFullName(data.full_name || "");
            setEmail(data.email || "");
            setPhone(data.phone || "");
          }
        })
        .catch(() => {});
    } else {
      const savedName = localStorage.getItem("guest_fullName");
      const savedEmail = localStorage.getItem("guest_email");
      const savedPhone = localStorage.getItem("guest_phone");
      if (savedName) setFullName(savedName);
      if (savedEmail) setEmail(savedEmail);
      if (savedPhone) setPhone(savedPhone);
    }
  }, []);

  // Save guest details on input change for persistence across reloads/backs
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token && typeof window !== "undefined") {
      if (fullName) localStorage.setItem("guest_fullName", fullName);
      if (email) localStorage.setItem("guest_email", email);
      if (phone) localStorage.setItem("guest_phone", phone);
    }
  }, [fullName, email, phone]);


  // Load tour data
  useEffect(() => {
    if (!tourSlug) {
      setTourLoading(false);
      return;
    }
    setTourLoading(true);
    setTourError(false);
    fetch(`${API_BASE}/tours/${tourSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy thông tin đặt tour.");
        return res.json();
      })
      .then((data) => {
        const rawImages: any[] = data.images || [];
        const primaryImg = rawImages.find((img: any) => img.is_primary);
        const bannerImg = rawImages.find((img: any) => img.image_type === "banner");
        const firstImg = rawImages[0];
        const chosenImg = primaryImg || bannerImg || firstImg;
        const thumbnail = chosenImg
          ? getDriveThumbnailUrl(chosenImg.url) || chosenImg.url
          : getDriveThumbnailUrl(data.image) || FALLBACK_IMAGE;
        setTour({ ...data, thumbnail });
      })
      .catch(() => setTourError(true))
      .finally(() => setTourLoading(false));
  }, [tourSlug]);

  // ─── Available departure dates ─────────────────────────────────────────────
  // Priority: TourSchedule (active only) > custom_departures > free date input
  const availableDates = useMemo<string[]>(() => {
    if (!tour) return [];

    // 1. Use TourSchedule if available
    if (tour.schedules && tour.schedules.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      return tour.schedules
        .filter((s) => s.status === "active" && s.departure_date >= today)
        .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
        .map((s) => s.departure_date);
    }

    // 2. Use recurring_days if available
    const rDays = (tour as any).recurring_days || [];
    if (rDays.length > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const dates = new Set<string>();

      // Generate upcoming dates for the next 90 days starting from today
      const current = new Date();
      for (let i = 0; i < 90; i++) {
        const d = new Date(current);
        d.setDate(current.getDate() + i);
        const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, etc.
        if (rDays.includes(dayOfWeek)) {
          dates.add(d.toISOString().split("T")[0]);
        }
      }

      // Also merge with any one-off custom departures (overrides)
      if (tour.custom_departures && tour.custom_departures.length > 0) {
        (tour.custom_departures as any[]).forEach((d) => {
          const dateStr = typeof d === "string" ? d : d?.date || "";
          if (dateStr && dateStr >= todayStr) {
            dates.add(dateStr);
          }
        });
      }

      return Array.from(dates).sort();
    }

    // 3. Fall back to custom_departures
    // custom_departures can be string[] OR {date, price, promo_price}[]
    if (tour.custom_departures && tour.custom_departures.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      return (tour.custom_departures as any[])
        .map((d) => (typeof d === "string" ? d : d?.date || ""))
        .filter((d) => d && d >= today)
        .sort();
    }

    return []; // Free input mode
  }, [tour]);

  const hasConfiguredDepartures = Boolean(tour?.schedules?.length || tour?.custom_departures?.length || tour?.recurring_days?.length);
  const useFreeInput = !hasConfiguredDepartures && !tourLoading;

  // Helper: get per-date price from custom_departures (may have promo_price)
  const priceForDate = useCallback((dateStr: string): { price: number; promoPrice: number } | null => {
    if (!tour) return null;
    if (tour.custom_departures && tour.custom_departures.length > 0) {
      const entry = (tour.custom_departures as any[]).find(
        (d) => (typeof d === "string" ? d : d?.date) === dateStr
      );
      if (entry && typeof entry !== "string") {
        const fallbackPrice = (tour.is_daily || tour.recurring_days?.length) && tour.price_daily ? tour.price_daily : tour.price;
        const fallbackPromo = (tour.is_daily || tour.recurring_days?.length || tour.is_promo) ? tour.price_promo_daily || 0 : 0;
        return { price: entry.price || fallbackPrice, promoPrice: entry.promo_price || (!entry.price ? fallbackPromo : 0) };
      }
    }
    // Check if daily or weekly recurring price is configured
    const rDays = (tour as any).recurring_days || [];
    if (tour.is_daily || rDays.length > 0) {
      if (tour.price_daily && tour.price_daily > 0) {
        return { price: tour.price_daily, promoPrice: tour.price_promo_daily || 0 };
      }
    }
    // Fall back to tour defaults (only if we have a scheduled or weekly generated date)
    return { price: tour.price, promoPrice: tour.is_promo ? (tour.price_promo_daily || 0) : 0 };
  }, [tour]);

  // ─── Price calculation ─────────────────────────────────────────────────────
  const currentAdultPrice = useMemo(() => {
    if (!tour) return 0;
    if (selectedDateStr) {
      const datePrice = priceForDate(selectedDateStr);
      if (datePrice) {
        return datePrice.promoPrice > 0 ? datePrice.promoPrice : datePrice.price;
      }
    }
    return tour.price;
  }, [tour, selectedDateStr, priceForDate]);

  const adultSubtotal = currentAdultPrice * adultsCount;
  const childSubtotal = (tour && tour.price_child > 0) ? tour.price_child * childrenCount : 0;
  const infantSubtotal = (tour && tour.price_infant > 0) ? tour.price_infant * infantCount : 0;
  const subtotal = adultSubtotal + childSubtotal + infantSubtotal;
  const discountAmount = useMemo(() => {
    if (!appliedPromo || appliedPromo.code !== discountCode.trim().toUpperCase() || subtotal < appliedPromo.min_value) return 0;
    const amount = appliedPromo.discount_type === "percentage" ? subtotal * appliedPromo.value / 100 : appliedPromo.value;
    return Math.min(amount, subtotal);
  }, [appliedPromo, discountCode, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = async () => {
    if (!discountCode.trim()) return;
    setPromoError(null);
    setPromoSuccess(null);
    setPromoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/discounts/code/${discountCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Mã giảm giá không hợp lệ.");

      if (subtotal < data.min_value) {
        throw new Error(`Mã giảm giá chỉ áp dụng cho đơn từ ${formatCurrency(data.min_value)}.`);
      }

      setAppliedPromo(data);
      setPromoSuccess(`Đã áp dụng mã ${data.code}. Mức giảm được cập nhật theo tổng tiền hiện tại.`);
    } catch (err: any) {
      setPromoError(err.message || "Không thể áp dụng mã giảm giá.");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (submittingRef.current) return;
    if (!tour || tourLoading) {
      setErrorMsg("Vui lòng chọn một tour hợp lệ và chờ tải xong thông tin trước khi đặt.");
      return;
    }
    if (hasConfiguredDepartures && !availableDates.includes(selectedDateStr)) {
      setErrorMsg("Vui lòng chọn ngày khởi hành đang được mở bán.");
      return;
    }

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Họ tên, Email và Số điện thoại.");
      return;
    }
    if (!selectedDateStr) {
      setErrorMsg("Vui lòng chọn ngày khởi hành.");
      return;
    }
    if (adultsCount < 1) {
      setErrorMsg("Cần ít nhất 1 người lớn.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const totalGuests = adultsCount + childrenCount + infantCount;
      const notesArr = [];
      if (childrenCount > 0) notesArr.push(`${childrenCount} trẻ em (2-11 tuổi)`);
      if (infantCount > 0) notesArr.push(`${infantCount} em bé (<2 tuổi)`);
      const guestNotes = notesArr.length > 0 ? `[${notesArr.join(", ")}] ` : "";

      const payload = {
        tour_id: tour?.id || null,
        tour_title: tour?.title || tourTitle || "Tour tư vấn",
        full_name: fullName,
        email,
        phone,
        departure_date: selectedDateStr,
        guests_count: totalGuests,
        adults_count: adultsCount,
        children_count: childrenCount,
        infants_count: infantCount,
        notes: (guestNotes + (notes.trim() || "")).trim() || null,
        discount_code: appliedPromo && discountAmount > 0 && appliedPromo.code === discountCode.trim().toUpperCase() ? appliedPromo.code : null,
        total_amount: total > 0 ? total : null,
        discount_amount: discountAmount > 0 ? discountAmount : 0,
      };

      const res = await fetch(`${API_BASE}/bookings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể tạo đơn đặt tour.");

      router.push(`/checkout/success?bookingId=${data.id}&token=${data.secure_token}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Gửi yêu cầu thất bại. Vui lòng thử lại.");
      submittingRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error state
  if (tourError) {
    return (
      <main style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="surface-panel" style={{ maxWidth: 480, width: "100%", padding: "3rem 2rem", textAlign: "center", borderRadius: "1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😔</div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "0.75rem" }}>Tour không tìm thấy</h2>
          <p style={{ color: "var(--public-muted, #64748b)", marginBottom: "1.5rem" }}>Tour bạn đang tìm có thể đã hết hoặc không tồn tại.</p>
          <Link href="/tours" className="button button-primary">Xem tất cả tour</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Breadcrumb */}
      <div className="container" style={{ marginBottom: "1.5rem" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", color: "var(--public-muted, #64748b)", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>Trang chủ</Link>
          <span>›</span>
          <Link href="/tours" style={{ color: "var(--accent)", textDecoration: "none" }}>Tours</Link>
          {tour && (
            <>
              <span>›</span>
              <Link href={`/tours/${tour.slug}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                {tour.title.length > 40 ? tour.title.slice(0, 40) + "…" : tour.title}
              </Link>
            </>
          )}
          <span>›</span>
          <span style={{ color: "var(--public-text-strong, #0f172a)", fontWeight: 600 }}>Đặt tour</span>
        </nav>
      </div>

      <div className="container">
        <div className="checkout-grid">
          {/* ─── LEFT COLUMN: Form ─── */}
          <div className="checkout-form-col">
            <div className="surface-panel" style={{ padding: "2rem", borderRadius: "1.25rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.4rem", color: "var(--public-text-strong, #0f172a)" }}>
                📋 Thông tin đặt tour
              </h1>
              <p style={{ color: "var(--public-muted, #64748b)", fontSize: "0.92rem", marginBottom: "1.75rem" }}>
                Vui lòng kiểm tra và điền đầy đủ thông tin bên dưới.
              </p>

              {errorMsg && (
                <div style={{
                  background: "var(--public-error-surface, #fef2f2)", border: "1px solid var(--public-error-border, #fca5a5)", color: "#dc2626",
                  padding: "0.85rem 1rem", borderRadius: "0.75rem",
                  marginBottom: "1.25rem", fontSize: "0.9rem", fontWeight: 500
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* ── Section 1: Contact ── */}
                <div>
                  <h3 className="checkout-section-title">👤 Thông tin liên hệ</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="checkout-field">
                      <label>Họ và tên <span style={{ color: "#ef4444" }}>*</span></label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A" required className="checkout-input" />
                    </div>
                    <div className="checkout-row-2">
                      <div className="checkout-field">
                        <label>Email <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@example.com" required className="checkout-input" />
                      </div>
                      <div className="checkout-field">
                        <label>Số điện thoại <span style={{ color: "#ef4444" }}>*</span></label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="0912 345 678" required className="checkout-input" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 2: Departure Date ── */}
                <div>
                  <h3 className="checkout-section-title">📅 Ngày khởi hành <span style={{ color: "#ef4444" }}>*</span></h3>

                  {tourLoading ? (
                    <div style={{ height: "3rem", borderRadius: "0.75rem", background: "var(--public-border, #e2e8f0)", animation: "pulse 1.5s infinite" }} />
                  ) : availableDates.length > 0 ? (
                    /* ── Scheduled departure dates ── */
                    <div className="departure-date-grid">
                      {availableDates.map((dateStr) => {
                        const schedule = tour?.schedules?.find((s) => s.departure_date === dateStr);
                        const isFull = schedule && schedule.booked_seats >= schedule.max_capacity;
                        const remaining = schedule ? schedule.max_capacity - schedule.booked_seats : null;
                        const isSelected = selectedDateStr === dateStr;
                        const datePrice = priceForDate(dateStr);

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!!isFull}
                            onClick={() => !isFull && setSelectedDateStr(dateStr)}
                            className={`departure-date-btn ${isSelected ? "selected" : ""} ${isFull ? "full" : ""}`}
                          >
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.15rem" }}>
                              <span className="departure-date-btn__date">{formatDate(dateStr)}</span>
                              {datePrice && datePrice.price > 0 && (
                                <span style={{ fontSize: "0.78rem", color: "var(--public-muted, #64748b)" }}>
                                  {datePrice.promoPrice > 0 ? (
                                    <>
                                      <span style={{ textDecoration: "line-through", marginRight: "0.3rem" }}>
                                        {formatCurrency(datePrice.price)}
                                      </span>
                                      <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                                        {formatCurrency(datePrice.promoPrice)}
                                      </span>
                                    </>
                                  ) : (
                                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                                      {formatCurrency(datePrice.price)}
                                    </span>
                                  )}
                                  /người
                                </span>
                              )}
                            </div>
                            {remaining !== null ? (
                              <span className={`departure-date-btn__seats ${remaining <= 5 ? "low" : ""}`}>
                                {isFull ? "🔴 Hết chỗ" : remaining <= 5 ? `⚠️ Còn ${remaining} chỗ` : `✅ Còn chỗ`}
                              </span>
                            ) : (
                              <span className="departure-date-btn__seats">✅</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : useFreeInput ? (
                    /* ── Free date picker ── */
                    <div className="checkout-field">
                      <label style={{ fontSize: "0.82rem", color: "var(--public-muted, #64748b)", marginBottom: "0.35rem", fontWeight: 400 }}>
                        Tour này chưa có lịch cố định, vui lòng chọn ngày dự kiến khởi hành:
                      </label>
                      <CalendarPicker
                        value={selectedDateStr}
                        minDate={new Date().toISOString().split("T")[0]}
                        onChange={setSelectedDateStr}
                      />
                    </div>
                  ) : (
                    <p style={{ color: "var(--public-muted, #64748b)" }}>Tour hiện chưa có ngày khởi hành mở bán. Vui lòng liên hệ để được tư vấn.</p>
                  )}

                  {!selectedDateStr && !tourLoading && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#f59e0b", fontWeight: 500 }}>
                      ⚠️ Vui lòng chọn ngày khởi hành
                    </p>
                  )}
                </div>

                {/* ── Section 3: Guests ── */}
                <div>
                  <h3 className="checkout-section-title">👥 Số lượng khách</h3>
                  <div className="checkout-guests-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    
                    {/* Adults row */}
                    <div className="checkout-guest-row">
                      <div className="guest-info">
                        <span className="guest-title">🧑 Người lớn</span>
                        <span className="guest-subtitle">Từ 12 tuổi trở lên</span>
                      </div>
                      <div className="guest-price-col">
                        <span className="guest-price">{formatCurrency(currentAdultPrice)}</span>
                      </div>
                      <div className="checkout-stepper-wrapper">
                        <div className="checkout-stepper">
                          <button type="button" onClick={() => setAdultsCount(g => Math.max(1, g - 1))}>−</button>
                          <span>{adultsCount}</span>
                          <button type="button" onClick={() => setAdultsCount(g => g + 1)}>+</button>
                        </div>
                      </div>
                    </div>

                    {/* Children row */}
                    {tour && tour.price_child > 0 && (
                      <div className="checkout-guest-row">
                        <div className="guest-info">
                          <span className="guest-title">👧 Trẻ em</span>
                          <span className="guest-subtitle">Từ 2 đến 11 tuổi</span>
                        </div>
                        <div className="guest-price-col">
                          <span className="guest-price">{formatCurrency(tour.price_child)}</span>
                        </div>
                        <div className="checkout-stepper-wrapper">
                          <div className="checkout-stepper">
                            <button type="button" onClick={() => setChildrenCount(c => Math.max(0, c - 1))}>−</button>
                            <span>{childrenCount}</span>
                            <button type="button" onClick={() => setChildrenCount(c => c + 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Infant row */}
                    {tour && tour.price_infant > 0 && (
                      <div className="checkout-guest-row">
                        <div className="guest-info">
                          <span className="guest-title">👶 Em bé</span>
                          <span className="guest-subtitle">Dưới 2 tuổi</span>
                        </div>
                        <div className="guest-price-col">
                          <span className="guest-price">{formatCurrency(tour.price_infant)}</span>
                        </div>
                        <div className="checkout-stepper-wrapper">
                          <div className="checkout-stepper">
                            <button type="button" onClick={() => setInfantCount(i => Math.max(0, i - 1))}>−</button>
                            <span>{infantCount}</span>
                            <button type="button" onClick={() => setInfantCount(i => i + 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fallback children if no pricing set */}
                    {tour && tour.price_child === 0 && tour.price_infant === 0 && (
                      <div className="checkout-guest-row">
                        <div className="guest-info">
                          <span className="guest-title">👧 Trẻ em đi kèm</span>
                          <span className="guest-subtitle">Độ tuổi 2-11</span>
                        </div>
                        <div className="guest-price-col">
                          <span style={{ fontSize: "0.85rem", color: "var(--public-muted, #64748b)", fontWeight: 500 }}>Liên hệ báo giá</span>
                        </div>
                        <div className="checkout-stepper-wrapper">
                          <div className="checkout-stepper">
                            <button type="button" onClick={() => setChildrenCount(c => Math.max(0, c - 1))}>−</button>
                            <span>{childrenCount}</span>
                            <button type="button" onClick={() => setChildrenCount(c => c + 1)}>+</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Section 4: Notes ── */}
                <div className="checkout-field">
                  <h3 className="checkout-section-title">📝 Ghi chú thêm</h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ví dụ: yêu cầu phòng hướng biển, cần xe lăn, dị ứng thực phẩm..."
                    rows={3} className="checkout-input" style={{ resize: "none", fontFamily: "inherit" }} />
                </div>

                {/* ── Section 5: Promo ── */}
                <div>
                  <h3 className="checkout-section-title">🎁 Mã giảm giá</h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Nhập mã giảm giá..." className="checkout-input"
                      style={{ flex: 1, textTransform: "uppercase" }} />
                    <button type="button" onClick={handleApplyPromo} disabled={promoLoading}
                      style={{
                        padding: "0 1.25rem", borderRadius: "0.75rem", background: "var(--accent)",
                        color: "var(--public-on-accent, white)", fontWeight: 700, border: "none", cursor: "pointer",
                        whiteSpace: "nowrap", fontSize: "0.9rem", opacity: promoLoading ? 0.7 : 1
                      }}>
                      {promoLoading ? "..." : "Áp dụng"}
                    </button>
                  </div>
                  {promoError && <p style={{ marginTop: "0.4rem", color: "#ef4444", fontSize: "0.84rem", fontWeight: 500 }}>❌ {promoError}</p>}
                  {promoSuccess && <p style={{ marginTop: "0.4rem", color: "#10b981", fontSize: "0.84rem", fontWeight: 500 }}>✅ {promoSuccess}</p>}
                </div>

                {/* Submit */}
                <button type="submit" disabled={isSubmitting || tourLoading || !tour || (hasConfiguredDepartures && availableDates.length === 0)} className="checkout-submit-btn">
                  {isSubmitting ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <span className="search-spinner" style={{ position: "static", transform: "none", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                      Đang xử lý...
                    </span>
                  ) : "✅ Xác nhận đặt tour"}
                </button>

                <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--public-muted, #94a3b8)" }}>
                  Bằng cách đặt tour, bạn đồng ý với{" "}
                  <a href="/contact" style={{ color: "var(--accent)", textDecoration: "underline" }}>điều khoản dịch vụ</a> của chúng tôi.
                </p>
              </form>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: Order Summary ─── */}
          <div className="checkout-summary-col">
            <div className="surface-panel checkout-summary" style={{ padding: "1.75rem", borderRadius: "1.25rem", position: "sticky", top: "6rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "1.25rem", color: "var(--public-text-strong, #0f172a)" }}>
                🧾 Tóm tắt đơn hàng
              </h2>

              {tourLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ height: "1.2rem", borderRadius: "0.4rem", background: "var(--public-border, #e2e8f0)", animation: "pulse 1.5s infinite" }} />
                  ))}
                </div>
              ) : tour ? (
                <>
                  {/* Tour thumbnail + title */}
                  <div style={{ borderRadius: "0.85rem", overflow: "hidden", marginBottom: "1rem", position: "relative", height: "160px" }}>
                    <Image
                      src={tour.thumbnail}
                      alt={tour.title}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="(max-width: 768px) 100vw, 380px"
                      onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
                    <div style={{ position: "absolute", bottom: "0.75rem", left: "0.85rem" }}>
                      <span style={{
                        background: tour.is_international ? "#6366f1" : "#10b981",
                        color: "white", fontSize: "0.72rem", fontWeight: 700,
                        padding: "0.2rem 0.55rem", borderRadius: "9999px"
                      }}>
                        {tour.is_international ? "Quốc tế" : "Trong nước"}
                      </span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.65rem", color: "var(--public-text-strong, #0f172a)", lineHeight: 1.4 }}>
                    {tour.title}
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.875rem", color: "var(--public-muted, #64748b)", marginBottom: "1.25rem" }}>
                    <span>⏱ Thời gian: <strong style={{ color: "var(--public-text, #334155)" }}>{tour.duration}</strong></span>
                    <span>📍 Lộ trình: <strong style={{ color: "var(--public-text, #334155)" }}>{tour.location}</strong></span>
                    {tour.departure_point && (
                      <span>🛫 Điểm đi: <strong style={{ color: "var(--public-text, #334155)" }}>{tour.departure_point.name}</strong></span>
                    )}
                    {selectedDateStr && (
                      <span>📅 Ngày đi: <strong style={{ color: "var(--accent)" }}>{formatDate(selectedDateStr)}</strong></span>
                    )}
                    {adultsCount > 0 && (
                      <span>🧑 Người lớn: <strong style={{ color: "var(--public-text, #334155)" }}>{adultsCount}</strong></span>
                    )}
                    {childrenCount > 0 && (
                      <span>👧 Trẻ em: <strong style={{ color: "var(--public-text, #334155)" }}>{childrenCount}</strong></span>
                    )}
                    {infantCount > 0 && (
                      <span>👶 Em bé: <strong style={{ color: "var(--public-text, #334155)" }}>{infantCount}</strong></span>
                    )}
                  </div>

                  {/* Price breakdown */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--public-muted, #64748b)" }}>
                      <span>{formatCurrency(tour.price)} × {adultsCount} người lớn</span>
                      <span>{formatCurrency(adultSubtotal)}</span>
                    </div>
                    {childrenCount > 0 && tour.price_child > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--public-muted, #64748b)" }}>
                        <span>{formatCurrency(tour.price_child)} × {childrenCount} trẻ em</span>
                        <span>{formatCurrency(childSubtotal)}</span>
                      </div>
                    )}
                    {infantCount > 0 && tour.price_infant > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "var(--public-muted, #64748b)" }}>
                        <span>{formatCurrency(tour.price_infant)} × {infantCount} em bé</span>
                        <span>{formatCurrency(infantSubtotal)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", color: "#10b981", fontWeight: 600 }}>
                        <span>🎁 Giảm giá</span>
                        <span>− {formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontWeight: 800, fontSize: "1.1rem", color: "var(--public-text-strong, #0f172a)",
                      borderTop: "1px dashed var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem"
                    }}>
                      <span>Tổng thanh toán</span>
                      <span style={{ color: "var(--accent)" }}>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Trust badges */}
                  <div style={{
                    marginTop: "1.25rem", padding: "0.85rem 1rem",
                    background: "var(--accent-soft, #f0fdf4)", borderRadius: "0.75rem",
                    display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem", color: "var(--public-text, #334155)"
                  }}>
                    <div>✅ Xác nhận đặt chỗ ngay sau khi đặt</div>
                    <div>📧 Email xác nhận gửi tới hộp thư của bạn</div>
                    <div>🔒 Thanh toán an toàn qua chuyển khoản</div>
                    <div>📞 Hỗ trợ 24/7 trước và trong chuyến đi</div>
                  </div>
                </>
              ) : (
                /* No tour slug – advisory booking */
                <div style={{ padding: "1rem", background: "var(--public-surface-soft, #f8fafc)", borderRadius: "0.75rem", color: "var(--public-muted, #64748b)", fontSize: "0.9rem" }}>
                  <p style={{ marginBottom: "0.5rem" }}>📝 <strong>Tour tư vấn:</strong></p>
                  <p style={{ fontWeight: 600, color: "var(--public-text, #334155)" }}>{tourTitle || "Chưa chọn tour cụ thể"}</p>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}>
                    Sau khi đặt, nhân viên sẽ liên hệ để tư vấn và báo giá chính xác.
                  </p>
                  {selectedDateStr && (
                    <div style={{ marginTop: "0.75rem" }}>
                      <span>📅 Ngày dự kiến: <strong>{formatDate(selectedDateStr)}</strong></span>
                    </div>
                  )}
                  <div style={{ marginTop: "0.25rem" }}>
                    <span>👥 Tổng khách: <strong>{adultsCount + childrenCount + infantCount} người</strong></span>
                  </div>
                </div>
              )}

              <Link href="/tours" style={{ display: "block", marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--accent)" }}>
                ← Quay lại danh sách tour
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
