"use client";

import { useEffect, useState } from "react";

export default function InlineAdvertisements() {
  const [items, setItems] = useState<any[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/content-panels/`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const now = Date.now();
        setItems((Array.isArray(data) ? data : []).filter((item: any) => item.is_active
          && item.position === "home_between_sections"
          && (!item.start_at || new Date(item.start_at).getTime() <= now)
          && (!item.end_at || new Date(item.end_at).getTime() >= now))
          .sort((a: any, b: any) => a.order_index - b.order_index));
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 8000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const safeIndex = index % items.length;
  const item = items[safeIndex];
  const source = item.media_url || item.image_url;
  const media = item.media_type === "video"
    ? <video key={item.id} src={source} poster={item.poster_url || item.image_url} autoPlay={item.autoplay !== false} muted={item.muted !== false} loop={item.loop !== false} playsInline />
    : <img key={item.id} src={source} alt={item.title || "Nội dung nổi bật"} />;

  return (
    <section className="inline-promo" aria-label="Nội dung được tài trợ">
      <div className="container inline-promo__frame">
        {item.link_url ? <a href={item.link_url} target={item.open_in_new_tab === false ? undefined : "_blank"} rel="noopener noreferrer">{media}</a> : media}
        {items.length > 1 && <div className="inline-promo__nav">
          <button type="button" onClick={() => setIndex((safeIndex - 1 + items.length) % items.length)} aria-label="Nội dung trước">‹</button>
          <span>{safeIndex + 1}/{items.length}</span>
          <button type="button" onClick={() => setIndex((safeIndex + 1) % items.length)} aria-label="Nội dung tiếp theo">›</button>
        </div>}
      </div>
    </section>
  );
}
