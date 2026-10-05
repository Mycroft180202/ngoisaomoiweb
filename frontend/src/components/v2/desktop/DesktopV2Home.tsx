"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCms, type CmsGlobeDestination } from "@/components/cms/CmsProvider";
import TravelGlobe, { type GlobeDestination } from "./TravelGlobe";
import TiltTourCard from "./TiltTourCard";
import { useV2HomeData } from "../shared/useV2HomeData";

const DEFAULT_DESTINATIONS: GlobeDestination[] = [
  { key: "ha-long", name: "Vịnh Hạ Long", country: "Việt Nam", eyebrow: "Kỳ quan thiên nhiên", lat: 20.95045, lng: 107.07336 },
  { key: "da-nang", name: "Đà Nẵng", country: "Việt Nam", eyebrow: "Thành phố đáng sống", lat: 16.06778, lng: 108.22083 },
  { key: "phu-quoc", name: "Phú Quốc", country: "Việt Nam", eyebrow: "Đảo ngọc phương Nam", lat: 10.28715, lng: 104.01047 },
  { key: "tokyo", name: "Tokyo", country: "Nhật Bản", eyebrow: "Nhịp sống Á Đông", lat: 35.6895, lng: 139.6917 },
  { key: "paris", name: "Paris", country: "Pháp", eyebrow: "Kinh đô ánh sáng", lat: 48.8566, lng: 2.3522 },
];

export default function DesktopV2Home() {
  const { config } = useCms();
  const { tours, loading, error } = useV2HomeData(6);
  const destinations = useMemo<GlobeDestination[]>(() => {
    const configured = config.globe?.destinations || [];
    const valid = configured.filter((item): item is CmsGlobeDestination => (
      Boolean(item?.key?.trim() && item?.name?.trim())
      && Number.isFinite(item.lat) && item.lat >= -90 && item.lat <= 90
      && Number.isFinite(item.lng) && item.lng >= -180 && item.lng <= 180
    ));
    return valid.length ? valid : DEFAULT_DESTINATIONS;
  }, [config.globe?.destinations]);
  const [activeDestination, setActiveDestination] = useState(DEFAULT_DESTINATIONS[0].key);
  const activeDestinationKey = destinations.some((destination) => destination.key === activeDestination)
    ? activeDestination
    : destinations[0].key;
  const primaryLabel = config.hero?.primary_label || "Khám phá tour";
  const primaryUrl = config.hero?.primary_url || "/tours";

  return (
    <main className="v2-home v2-home--desktop">
      <section className="v2-hero" aria-labelledby="v2-hero-title">
        <div className="v2-hero__aurora v2-hero__aurora--one" aria-hidden="true" />
        <div className="v2-hero__aurora v2-hero__aurora--two" aria-hidden="true" />
        <div className="v2-hero__grid" aria-hidden="true" />

        <div className="v2-container v2-hero__layout">
          <div className="v2-hero__copy">
            <div className="v2-eyebrow"><span /> {config.hero?.kicker || "Hành trình được thiết kế riêng"}</div>
            <h1 id="v2-hero-title">
              Chạm vào thế giới.<br />
              <span>Đi theo cách của bạn.</span>
            </h1>
            <p>
              Từ một điểm sáng trên địa cầu đến một hành trình trọn vẹn — New Star Tour kết nối trải nghiệm, con người và những miền đất đáng nhớ.
            </p>

            <div className="v2-hero__actions">
              <Link className="v2-button v2-button--primary" href={primaryUrl}>
                {primaryLabel} <span aria-hidden="true">↗</span>
              </Link>
              <Link className="v2-button v2-button--ghost" href="/contact">
                Thiết kế hành trình riêng
              </Link>
            </div>

            <dl className="v2-hero__stats">
              <div><dt>10+</dt><dd>Năm kinh nghiệm</dd></div>
              <div><dt>24/7</dt><dd>Đồng hành tận tâm</dd></div>
              <div><dt>100%</dt><dd>Lịch trình minh bạch</dd></div>
            </dl>
          </div>

          <div className="v2-hero__scene">
            <TravelGlobe
              destinations={destinations}
              activeKey={activeDestinationKey}
              onSelect={setActiveDestination}
            />
            <span className="v2-globe-hint"><b>↔</b> Kéo để xoay địa cầu</span>
          </div>
        </div>

        <div className="v2-container v2-destination-dock" aria-label="Chọn điểm đến nổi bật">
          <span className="v2-destination-dock__label">Điểm đến nổi bật</span>
          {destinations.map((destination, index) => (
            <button
              key={destination.key}
              type="button"
              className={destination.key === activeDestinationKey ? "is-active" : ""}
              onClick={() => setActiveDestination(destination.key)}
            >
              <small>0{index + 1}</small>{destination.name}
            </button>
          ))}
        </div>
      </section>

      <section className="v2-tours" id="featured-tours" aria-labelledby="v2-tours-title">
        <div className="v2-container">
          <header className="v2-section-heading">
            <div>
              <span className="v2-section-kicker">Tọa độ tiếp theo</span>
              <h2 id="v2-tours-title">Hành trình đang chờ bạn</h2>
            </div>
            <p>Mỗi tour được cập nhật trực tiếp từ CMS, với lịch trình và mức giá rõ ràng trước khi bạn lựa chọn.</p>
          </header>

          {loading && (
            <div className="v2-tour-grid" aria-label="Đang tải tour">
              {[0, 1, 2].map((item) => <div className="v2-tour-skeleton" key={item} />)}
            </div>
          )}
          {!loading && error && (
            <div className="v2-inline-state">Danh sách tour tạm thời chưa tải được. Bạn vẫn có thể xem toàn bộ hành trình tại trang Tour.</div>
          )}
          {!loading && !error && tours.length === 0 && (
            <div className="v2-inline-state">Các hành trình mới đang được cập nhật.</div>
          )}
          {!loading && tours.length > 0 && (
            <div className="v2-tour-grid">
              {tours.map((tour, index) => <TiltTourCard key={tour.id} tour={tour} index={index} />)}
            </div>
          )}

          <div className="v2-tours__all">
            <Link href="/tours">Xem tất cả hành trình <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>

      <section className="v2-story" aria-labelledby="v2-story-title">
        <div className="v2-story__orb v2-story__orb--one" aria-hidden="true" />
        <div className="v2-story__orb v2-story__orb--two" aria-hidden="true" />
        <div className="v2-container v2-story__layout">
          <div className="v2-story__copy">
            <span className="v2-section-kicker">New Star Signature</span>
            <h2 id="v2-story-title">Không chỉ đưa bạn đến nơi.<br />Chúng tôi tạo nên cách bạn nhớ về nơi đó.</h2>
          </div>
          <div className="v2-story__steps">
            <article><span>01</span><div><h3>Lắng nghe</h3><p>Hiểu mục đích, thời gian và nhịp trải nghiệm bạn mong muốn.</p></div></article>
            <article><span>02</span><div><h3>Thiết kế</h3><p>Chọn tuyến, dịch vụ và điểm dừng phù hợp với từng đoàn khách.</p></div></article>
            <article><span>03</span><div><h3>Đồng hành</h3><p>Theo sát xuyên suốt để mỗi thay đổi đều được xử lý chủ động.</p></div></article>
          </div>
        </div>
      </section>
    </main>
  );
}
