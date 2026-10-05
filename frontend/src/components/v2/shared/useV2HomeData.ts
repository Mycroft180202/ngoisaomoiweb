"use client";

import { useEffect, useMemo, useState } from "react";
import { getDriveThumbnailUrl } from "@/utils/image";

interface ApiTourImage {
  url?: string | null;
  image_type?: string | null;
  is_primary?: boolean;
}

interface ApiTour {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  image?: string | null;
  images?: ApiTourImage[];
  price?: number | null;
  price_daily?: number | null;
  price_promo_daily?: number | null;
  is_daily?: boolean;
  is_promo?: boolean;
  is_featured?: boolean;
  is_international?: boolean;
  duration?: string | null;
  location?: string | null;
  region?: string | null;
  departure_point?: { name?: string | null } | null;
  destination_domestic?: { name?: string | null } | null;
  destination_foreign?: { name?: string | null } | null;
}

export interface V2HomeTour {
  id: number;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  duration: string;
  location: string;
  departure: string;
  destination: string;
  badge: string;
  isPromo: boolean;
}

const resolveMediaUrl = (value?: string | null) => {
  if (!value) return "";
  const driveUrl = getDriveThumbnailUrl(value);
  if (driveUrl) return driveUrl;
  if (/^https?:\/\//i.test(value)) return value;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${apiBase}${value.startsWith("/") ? "" : "/"}${value}`;
};

const pickImage = (tour: ApiTour) => {
  const images = Array.isArray(tour.images) ? tour.images : [];
  const selected = images.find((item) => item.is_primary)
    || images.find((item) => item.image_type === "banner")
    || images[0];
  return resolveMediaUrl(selected?.url || tour.image);
};

const pickPrice = (tour: ApiTour) => {
  if (tour.is_daily && tour.is_promo && Number(tour.price_promo_daily) > 0) {
    return Number(tour.price_promo_daily);
  }
  if (tour.is_daily && Number(tour.price_daily) > 0) return Number(tour.price_daily);
  return Number(tour.price) || 0;
};

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

export function useV2HomeData(limit = 6) {
  const [tours, setTours] = useState<V2HomeTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${apiBase}/api/tours/?limit=30`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Không thể tải danh sách tour");
        return response.json();
      })
      .then((items: ApiTour[]) => {
        const mapped = (Array.isArray(items) ? items : [])
          .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
          .slice(0, limit)
          .map((tour) => ({
            id: tour.id,
            slug: tour.slug,
            title: tour.title,
            description: tour.description || "Hành trình được New Star Tour thiết kế chỉn chu cho từng trải nghiệm.",
            imageUrl: pickImage(tour),
            price: pickPrice(tour),
            duration: tour.duration || "Lịch trình linh hoạt",
            location: tour.location || tour.region || "Đang cập nhật",
            departure: tour.departure_point?.name || "Hà Nội",
            destination: tour.destination_domestic?.name
              || tour.destination_foreign?.name
              || tour.location
              || tour.region
              || "Điểm đến mới",
            badge: tour.is_international ? "Quốc tế" : "Việt Nam",
            isPromo: Boolean(tour.is_promo),
          }));
        setTours(mapped);
        setError(false);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [limit]);

  const featuredTour = useMemo(() => tours[0] || null, [tours]);
  return { tours, featuredTour, loading, error };
}
