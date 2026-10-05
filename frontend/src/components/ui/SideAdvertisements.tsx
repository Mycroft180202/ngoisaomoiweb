"use client";

import { useEffect, useMemo, useState } from "react";

interface Advertisement {
  id: number;
  title?: string;
  image_url: string;
  media_type?: "image" | "video";
  media_url?: string;
  poster_url?: string;
  link_url?: string;
  position: string;
  order_index: number;
  is_active: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  show_close_button?: boolean;
  open_in_new_tab?: boolean;
  start_at?: string;
  end_at?: string;
}

export default function SideAdvertisements() {
  const [items, setItems] = useState<Advertisement[]>([]);
  const [closed, setClosed] = useState<number[]>([]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/content-panels/`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const now = Date.now();
        const scheduled = Array.isArray(data) ? data.filter((item: Advertisement) =>
          (!item.start_at || new Date(item.start_at).getTime() <= now)
          && (!item.end_at || new Date(item.end_at).getTime() >= now)) : [];
        setItems(scheduled);
      })
      .catch(() => setItems([]));
  }, []);

  const active = useMemo(() => {
    return items.filter((item) => item.is_active && !closed.includes(item.id));
  }, [items, closed]);

  const leftItems = useMemo(() => active.filter((item) => item.position === "left_rail")
    .sort((a, b) => a.order_index - b.order_index), [active]);
  const rightItems = useMemo(() => active.filter((item) => item.position === "right_rail")
    .sort((a, b) => a.order_index - b.order_index), [active]);

  const renderAd = (position: "left_rail" | "right_rail") => {
    const ads = position === "left_rail" ? leftItems : rightItems;
    if (!ads.length) return null;

    return (
      <aside className={`promo-rail promo-rail--${position === "left_rail" ? "left" : "right"}`} aria-label="Nội dung được tài trợ">
        {ads.slice(0, 2).map((ad) => {
          const mediaUrl = ad.media_url || ad.image_url;
          const content = ad.media_type === "video" ? (
            <video src={mediaUrl} poster={ad.poster_url || ad.image_url || undefined} autoPlay={ad.autoplay !== false}
              muted={ad.muted !== false} loop={ad.loop !== false} playsInline preload="metadata" aria-label={ad.title || "Video giới thiệu"} />
          ) : <img src={mediaUrl} alt={ad.title || "Nội dung giới thiệu"} />;
          return <div className="promo-rail__item" key={ad.id}>
            {ad.show_close_button !== false && (
              <button type="button" className="promo-rail__close" onClick={() => setClosed((old) => [...old, ad.id])} aria-label="Đóng nội dung đề xuất">×</button>
            )}
            <div className="promo-rail__media">
              {ad.link_url ? <a href={ad.link_url} target={ad.open_in_new_tab === false ? undefined : "_blank"} rel="noopener noreferrer">{content}</a> : content}
            </div>
          </div>
        })}
      </aside>
    );
  };

  return <>{renderAd("left_rail")}{renderAd("right_rail")}</>;
}
