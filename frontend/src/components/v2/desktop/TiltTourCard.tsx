"use client";

import Link from "next/link";
import type { PointerEvent } from "react";
import { formatVnd, type V2HomeTour } from "../shared/useV2HomeData";

export default function TiltTourCard({ tour, index }: { tour: V2HomeTour; index: number }) {
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--v2-card-rx", `${y * -8}deg`);
    card.style.setProperty("--v2-card-ry", `${x * 10}deg`);
    card.style.setProperty("--v2-glow-x", `${(x + 0.5) * 100}%`);
    card.style.setProperty("--v2-glow-y", `${(y + 0.5) * 100}%`);
  };

  const resetTilt = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--v2-card-rx", "0deg");
    event.currentTarget.style.setProperty("--v2-card-ry", "0deg");
    event.currentTarget.style.setProperty("--v2-glow-x", "50%");
    event.currentTarget.style.setProperty("--v2-glow-y", "50%");
  };

  return (
    <article
      className="v2-tour-card"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={{ animationDelay: `${Math.min(index, 5) * 80}ms` }}
    >
      <div className="v2-tour-card__visual">
        {tour.imageUrl ? (
          // Ảnh CMS có thể đến từ nhiều máy chủ do admin cấu hình; giữ URL động thay vì khóa hostname.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tour.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="v2-tour-card__placeholder" aria-hidden="true"><span>✦</span></div>
        )}
        <div className="v2-tour-card__shade" />
        <span className="v2-tour-card__number">0{index + 1}</span>
        <div className="v2-tour-card__badges">
          <span>{tour.badge}</span>
          {tour.isPromo && <span className="is-promo">Ưu đãi</span>}
        </div>
      </div>
      <div className="v2-tour-card__body">
        <div className="v2-tour-card__route">
          <span>{tour.departure}</span><i aria-hidden="true" /> <strong>{tour.destination}</strong>
        </div>
        <h3>{tour.title}</h3>
        <div className="v2-tour-card__meta">
          <span>◷ {tour.duration}</span>
          <span>⌖ {tour.location}</span>
        </div>
        <div className="v2-tour-card__footer">
          <div>
            <small>Giá từ</small>
            <strong>{tour.price > 0 ? `${formatVnd(tour.price)} ₫` : "Liên hệ"}</strong>
          </div>
          <Link href={`/tours/${tour.slug}`} aria-label={`Xem tour ${tour.title}`}>
            Khám phá <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
