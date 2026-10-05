"use client";

import Link from "next/link";
import { useCms } from "@/components/cms/CmsProvider";
import { formatVnd, useV2HomeData } from "../shared/useV2HomeData";

export default function TouchV2Home() {
  const { config } = useCms();
  const { tours, loading, error } = useV2HomeData(6);

  return (
    <main className="v2-home v2-home--touch">
      <section className="v2-touch-hero" aria-labelledby="v2-touch-title">
        <div className="v2-touch-hero__stars" aria-hidden="true" />
        <div className="v2-touch-planet" role="img" aria-label="Quả địa cầu cách điệu">
          <span className="v2-touch-planet__surface" />
          <span className="v2-touch-planet__orbit" />
          <i className="is-one" /><i className="is-two" /><i className="is-three" />
        </div>
        <div className="v2-touch-hero__copy">
          <div className="v2-eyebrow"><span /> {config.hero?.kicker || "Hành trình của riêng bạn"}</div>
          <h1 id="v2-touch-title">Thế giới rộng lớn.<br /><span>Chạm để bắt đầu.</span></h1>
          <p>Khám phá những hành trình được thiết kế chỉn chu, dễ xem và thuận tiện trên mọi thiết bị.</p>
          <div className="v2-touch-hero__actions">
            <Link href={config.hero?.primary_url || "/tours"}>{config.hero?.primary_label || "Khám phá tour"} <span>↗</span></Link>
            <Link href="/contact">Tư vấn riêng</Link>
          </div>
        </div>
        <div className="v2-touch-route">
          <span><i /> Hà Nội</span><b /> <span><i /> Thế giới</span>
        </div>
      </section>

      <section className="v2-touch-tours" id="featured-tours" aria-labelledby="v2-touch-tours-title">
        <header>
          <div><span>Hành trình nổi bật</span><h2 id="v2-touch-tours-title">Đi đâu tiếp theo?</h2></div>
          <Link href="/tours" aria-label="Xem tất cả tour">Xem tất cả</Link>
        </header>

        {loading && <div className="v2-touch-tour-skeleton" aria-label="Đang tải tour" />}
        {!loading && error && <div className="v2-inline-state">Chưa thể tải tour. Vui lòng thử lại sau.</div>}
        {!loading && !error && tours.length === 0 && <div className="v2-inline-state">Các hành trình mới đang được cập nhật.</div>}

        {!loading && tours.length > 0 && (
          <div className="v2-touch-tour-list">
            {tours.map((tour, index) => (
              <article className="v2-touch-tour-card" key={tour.id}>
                <Link href={`/tours/${tour.slug}`} className="v2-touch-tour-card__image" aria-label={`Xem ${tour.title}`}>
                  {tour.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tour.imageUrl} alt="" loading="lazy" />
                  ) : <span>✦</span>}
                  <small>0{index + 1}</small>
                  <b>{tour.badge}</b>
                </Link>
                <div className="v2-touch-tour-card__body">
                  <div className="v2-touch-tour-card__route">{tour.departure} <span>→</span> {tour.destination}</div>
                  <h3>{tour.title}</h3>
                  <div className="v2-touch-tour-card__meta"><span>◷ {tour.duration}</span><span>⌖ {tour.location}</span></div>
                  <div className="v2-touch-tour-card__price"><small>Giá từ</small><strong>{tour.price > 0 ? `${formatVnd(tour.price)} ₫` : "Liên hệ"}</strong></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="v2-touch-promise">
        <span>NEW STAR SIGNATURE</span>
        <h2>Một hành trình.<br />Ba lớp an tâm.</h2>
        <div>
          <article><b>01</b><h3>Lịch trình rõ ràng</h3><p>Thông tin được công khai trước khi bạn quyết định.</p></article>
          <article><b>02</b><h3>Tư vấn sát nhu cầu</h3><p>Chọn đúng điểm đến, ngân sách và thời gian.</p></article>
          <article><b>03</b><h3>Đồng hành 24/7</h3><p>Luôn có người hỗ trợ trong suốt chuyến đi.</p></article>
        </div>
        <Link href="/contact">Bắt đầu thiết kế chuyến đi <span>→</span></Link>
      </section>
    </main>
  );
}
