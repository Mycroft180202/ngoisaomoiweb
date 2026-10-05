"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getDriveThumbnailUrl } from "@/utils/image";
import { BookingCard } from "@/components/booking/BookingCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TestimonialMarquee } from "@/components/ui/TestimonialMarquee";
import { TourCard } from "@/components/tours/TourCard";
import {
  footerLinks,
  hero,
} from "@/data/travel";
import { useCms } from "@/components/cms/CmsProvider";
import AnnouncementTicker from "@/components/ui/AnnouncementTicker";
import InlineAdvertisements from "@/components/ui/InlineAdvertisements";

const featuredImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
];

const domesticImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=300&q=80",
];

const internationalImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=600&q=80",
];

const FALLBACK_SLIDES = [
  {
    id: -1,
    title: "Khám Phá Vịnh Hạ Long Kỳ Vĩ",
    subtitle: "Hành trình 3 ngày 2 đêm trên du thuyền 5 sao đẳng cấp và sang trọng bậc nhất.",
    image_url: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80",
    tour_image_url: "https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&w=600&q=80",
    link_url: "/tours",
    order_index: 0,
    is_active: true
  },
  {
    id: -2,
    title: "Hội An Cổ Kính & Thanh Bình",
    subtitle: "Trải nghiệm phố cổ lung linh ánh đèn lồng bên dòng sông Hoài thơ mộng.",
    image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80",
    tour_image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    link_url: "/tours",
    order_index: 1,
    is_active: true
  },
  {
    id: -3,
    title: "Sa Pa - Thị Trấn Trong Sương",
    subtitle: "Chinh phục đỉnh Fansipan huyền thoại và chiêm ngưỡng những thửa ruộng bậc thang kỳ vĩ.",
    image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1600&q=80",
    tour_image_url: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80",
    link_url: "/tours",
    order_index: 2,
    is_active: true
  }
];

export default function HomeClient() {
  const { config: cmsConfig } = useCms();
  const [heroData, setHeroData] = useState({
    kicker: hero.kicker,
    title: hero.title,
    description: hero.description,
    primaryCta: hero.primaryCta,
    secondaryCta: hero.secondaryCta,
    bg_image: ""
  });

  const [toursList, setToursList] = useState<any[]>([]);
  const [allTours, setAllTours] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);
  const [officesList, setOfficesList] = useState<any[]>([]);
  
  const [slides, setSlides] = useState<any[]>(FALLBACK_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  const heroKicker = cmsConfig.hero?.kicker || heroData.kicker;
  const primaryCta = { label: cmsConfig.hero?.primary_label || heroData.primaryCta.label, href: cmsConfig.hero?.primary_url || heroData.primaryCta.href };
  const secondaryCta = { label: cmsConfig.hero?.secondary_label || heroData.secondaryCta.label, href: cmsConfig.hero?.secondary_url || heroData.secondaryCta.href };
  const cmsQuickLinks = cmsConfig.footer?.quick_links?.length
    ? cmsConfig.footer.quick_links
    : footerLinks.map((label) => ({ label, url: `/tours?query=${encodeURIComponent(label)}` }));

  const [provinces, setProvinces] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [attractions, setAttractions] = useState<any[]>([]);

  const resolveImageUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${apiBase}${url}`;
  };

  const domesticList = useMemo(() => {
    if (provinces.length === 0) return [];
    return provinces.slice(0, 6);
  }, [provinces]);

  const internationalList = useMemo(() => {
    if (countries.length === 0) return [];
    return countries.slice(0, 6);
  }, [countries]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // 1. Fetch system settings
    fetch(`${apiBase}/api/settings/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const heroSetting = data.find((item: any) => item.key === "cms_hero_section");
        if (heroSetting && heroSetting.value) {
          setHeroData((prev) => ({
            ...prev,
            title: heroSetting.value.title || prev.title,
            description: heroSetting.value.subtitle || prev.description,
            bg_image: getDriveThumbnailUrl(heroSetting.value.bg_image) || ""
          }));
        }

        const brandingSetting = data.find((item: any) => item.key === "cms_branding");
        if (brandingSetting && brandingSetting.value) {
          document.documentElement.style.setProperty("--accent", brandingSetting.value.accent_color);
          document.documentElement.style.setProperty("--accent-dark", brandingSetting.value.accent_dark);
          document.documentElement.style.setProperty("--accent-light", brandingSetting.value.accent_light);
        }
      })
      .catch((err) => console.error("Error loading settings:", err));

    // 2. Fetch all tours
    fetch(`${apiBase}/api/tours/`)
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
              : getDriveThumbnailUrl(t.image) || "";

            return {
              id: t.id,
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
              is_featured: t.is_featured,
              image: t.image,           // Legacy field
              thumbnail,               // Resolved primary thumbnail
              tourImages: rawImages,   // Full images list
            };
          });
          setAllTours(mapped);

          const mappedFeatured = mapped.filter((t: any) => t.is_featured);
          if (mappedFeatured.length > 0) {
            setToursList(mappedFeatured);
          } else {
            setToursList(mapped.slice(0, 6));
          }
        } else {
          setToursList([]);
        }
      })
      .catch(() => setToursList([]));

    // 3. Fetch news
    fetch(`${apiBase}/api/news/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          const mapped = data.map((n: any) => ({
            title: n.title,
            date: new Date(n.created_at).toLocaleDateString("vi-VN"),
            summary: n.summary,
            slug: n.slug
          }));
          setNewsList(mapped);
        } else {
          setNewsList([]);
        }
      })
      .catch(() => setNewsList([]));

    // 4. Fetch representative offices
    fetch(`${apiBase}/api/offices/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOfficesList(data))
      .catch((err) => console.error("Error loading offices:", err));

    // 5. Fetch slide list for Hero slider
    fetch(`${apiBase}/api/slides/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          const activeOnes = data.filter((s: any) => s.is_active).sort((a: any, b: any) => a.order_index - b.order_index);
          if (activeOnes.length > 0) {
            setSlides(activeOnes);
          } else {
            setSlides(FALLBACK_SLIDES);
          }
        } else {
          setSlides(FALLBACK_SLIDES);
        }
      })
      .catch((err) => {
        console.error("Error loading slides:", err);
        setSlides(FALLBACK_SLIDES);
      });
    // 6. Fetch provinces, countries, and attractions
    fetch(`${apiBase}/api/provinces/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProvinces(data))
      .catch((err) => console.error("Error loading provinces:", err));

    fetch(`${apiBase}/api/countries/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCountries(data.filter((c: any) => c.slug !== "viet-nam"));
      })
      .catch((err) => console.error("Error loading countries:", err));

    fetch(`${apiBase}/api/attractions/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAttractions(data))
      .catch((err) => console.error("Error loading attractions:", err));
  }, []);

  const handleBookTour = (tourName: string) => {
    window.dispatchEvent(new CustomEvent("prefill-booking", { detail: tourName }));
  };

  // Auto-play interval for slides
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const activeSlide = slides[currentSlideIndex] || FALLBACK_SLIDES[0];

  return (
    <main>
      <section 
        className="hero hero--sample" 
        id="top"
        style={{
          position: "relative",
          overflow: "visible"
        }}
      >
        {/* Banner Slides Carousel */}
        <div className="hero-slides-container">
          {slides.map((slide, index) => {
            const isClickable = !!slide.link_url;
            return (
              <div 
                key={slide.id || index}
                className={`hero-slide ${index === currentSlideIndex ? 'active' : ''}`}
              >
                {isClickable ? (
                  <Link href={slide.link_url || "/tours"} className="hero-slide-link">
                    <Image
                      src={slide.image_url}
                      alt={slide.title || "Hero Slide"}
                      fill
                      priority={index === 0}
                      sizes="100vw"
                      style={{
                        objectFit: "cover",
                        objectPosition: "center",
                        zIndex: 0
                      }}
                    />
                  </Link>
                ) : (
                  <Image
                    src={slide.image_url}
                    alt={slide.title || "Hero Slide"}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    style={{
                      objectFit: "cover",
                      objectPosition: "center",
                      zIndex: 0
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.45) 100%)",
                    zIndex: 1
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="hero__backdrop" style={{ zIndex: 2 }} />

        {/* Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button 
              className="slider-arrow prev" 
              onClick={handlePrevSlide}
              aria-label="Slide trước"
              style={{ zIndex: 10 }}
            >
              &#10094;
            </button>
            <button 
              className="slider-arrow next" 
              onClick={handleNextSlide}
              aria-label="Slide tiếp theo"
              style={{ zIndex: 10 }}
            >
              &#10095;
            </button>
            
            {/* Dots indicator */}
            <div className="slider-dots" style={{ zIndex: 10 }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  className={`slider-dot ${idx === currentSlideIndex ? 'active' : ''}`}
                  onClick={() => setCurrentSlideIndex(idx)}
                  aria-label={`Đi tới slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="container hero-shell" style={{ position: "relative", zIndex: 20 }}>
          <div className={`hero-stage surface-panel ${activeSlide.tour_image_url ? 'hero-stage-split' : ''}`}>
            <div className="hero-copy">
              <span className="hero-kicker">
                {activeSlide.title ? heroKicker : heroKicker}
              </span>
              <h1>{activeSlide.title || heroData.title}</h1>
              <p>{activeSlide.subtitle || heroData.description}</p>
              <div className="hero-actions">
                <Link 
                  className="button button-primary" 
                  href={activeSlide.link_url || primaryCta.href}
                >
                  {activeSlide.link_url ? primaryCta.label : primaryCta.label}
                </Link>
                <Link className="button button-secondary" href={secondaryCta.href}>
                  {secondaryCta.label}
                </Link>
              </div>
              <div className="hero-points" aria-label="Lợi ích nổi bật">
                <span>Hỗ trợ 24/7</span>
                <span>Lịch trình linh hoạt</span>
                <span>Giá tốt &amp; minh bạch</span>
              </div>
            </div>
            {activeSlide.tour_image_url && (
              <div className="hero-tour-image">
                <Link href={activeSlide.link_url || "/tours"}>
                  <Image
                    src={activeSlide.tour_image_url}
                    alt={activeSlide.title || "Tour image"}
                    width={400}
                    height={300}
                    priority
                    sizes="(max-width: 768px) 100vw, 400px"
                    style={{
                      objectFit: "cover",
                      borderRadius: "1rem",
                      width: "100%",
                      height: "100%",
                      display: "block"
                    }}
                  />
                </Link>
              </div>
            )}
          </div>
          <div className="booking-strip surface-panel">
            <BookingCard />
          </div>
        </div>
      </section>
      <AnnouncementTicker />
      <InlineAdvertisements />
      <section className="section section--featured" id="featured-tours">
        <div className="container">
          <SectionTitle
            eyebrow="Nổi bật"
            title="Tour ghép và hành trình hot"
            description="Danh sách tour nổi bật từ New Star Tour, được thiết kế sang trọng, dễ so sánh và đặt lịch ngay."
          />
          {toursList.length === 0 ? (
            <div style={{ width: "100%", textAlign: "center", padding: "2rem", color: "var(--muted)", fontStyle: "italic" }}>
              Đang tải danh sách tour...
            </div>
          ) : (
            <div className="featured-rail">
              {toursList.map((tour) => (
                <TourCard tour={tour} key={tour.slug} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--split section-alt" id="domestic">
        <div className="container split split--premium">
          <div>
            <SectionTitle
              eyebrow="Trong nước"
              title="Điểm đến phổ biến"
              description="Các điểm đến nội địa đang được quan tâm nhiều trên New Star Tour. Bấm vào điểm đến để nhận lịch trình và tư vấn nhanh."
            />
            <div className="destination-list">
              {domesticList.map((item: any, index) => (
                <Link
                  href={`/tours?query=${encodeURIComponent(item.name)}`}
                  className="destination-pill surface-panel clickable"
                  key={item.id}
                  style={{ textDecoration: "none" }}
                >
                  <div className="destination-pill__left">
                    <div className="destination-pill__image" style={{ position: "relative", width: "60px", height: "45px", overflow: "hidden", borderRadius: "0.375rem" }}>
                      <Image
                        src={resolveImageUrl(item.image) || domesticImages[index % domesticImages.length]}
                        alt={item.name}
                        fill
                        sizes="60px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="destination-pill__info">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.name}</strong>
                    </div>
                  </div>
                  <span className="destination-pill__arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="info-panel surface-panel" id="about">
            <span className="stats">Uy tín &amp; linh hoạt</span>
            <h3>Hệ thống tour nội địa được trình bày gọn, rõ và dễ tra cứu.</h3>
            <p>
              Giao diện mới giữ sự thoáng sạch, chuyển trọng tâm sang trải nghiệm khách hàng, thông tin doanh nghiệp thật và hành trình thực tế.
            </p>
            <div className="info-panel__grid">
              <div>
                <strong>12+</strong>
                <span>Năm kinh nghiệm</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Hỗ trợ khách hàng</span>
              </div>
              <div>
                <strong>Giá tốt</strong>
                <span>Đảm bảo tốt nhất</span>
              </div>
              <div>
                <strong>Ưu đãi</strong>
                <span>Nhiều chương trình hấp dẫn</span>
              </div>
            </div>
            <ul className="info-panel__list">
              <li>
                <span className="info-check">✓</span>
                <span>Lịch trình tour thiết kế linh hoạt, cá nhân hóa</span>
              </li>
              <li>
                <span className="info-check">✓</span>
                <span>Đội ngũ hướng dẫn viên chuyên nghiệp, tận tâm</span>
              </li>
              <li>
                <span className="info-check">✓</span>
                <span>Bảo hiểm du lịch trọn gói mức bồi thường cao</span>
              </li>
              <li>
                <span className="info-check">✓</span>
                <span>Đảm bảo giá tốt nhất thị trường với chất lượng vượt trội</span>
              </li>
              <li>
                <span className="info-check">✓</span>
                <span>Nhiều ưu đãi hấp dẫn quanh năm & quà tặng kèm</span>
              </li>
              <li>
                <span className="info-check">✓</span>
                <span>Hỗ trợ khách hàng 24/7 nhanh chóng, tận tâm, trách nhiệm</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" id="international">
        <div className="container">
          <SectionTitle eyebrow="Quốc tế" title="Điểm đến nước ngoài" description="Nhóm tour quốc tế nổi bật được trình bày như một bộ sưu tập chọn lọc đặc sắc." />
          <div className="international-grid">
            {internationalList.map((item: any, index: number) => (
              <article className="international-card surface-panel" key={item.id}>
                <div className="international-card__image" style={{ position: "relative", height: "200px" }}>
                  <Image
                    src={resolveImageUrl(item.image) || internationalImages[index % internationalImages.length]}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="international-card__body">
                  <div className="international-card__header">
                    <span className="stats">{String(index + 1).padStart(2, "0")}</span>
                    <h3>{item.name}</h3>
                  </div>
                  <p>Tour du lịch quốc tế chọn lọc cao cấp theo điểm đến.</p>
                  <Link
                    href={`/tours?query=${encodeURIComponent(item.name)}`}
                    className="card-link"
                  >
                    Khám phá tour &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt gallery-section" id="daily-tours">
        <div className="container">
          <SectionTitle eyebrow="Địa danh" title="Khám phá các điểm hot" description="Bộ sưu tập hình ảnh đầy cảm hứng từ các hành trình thực tế của du khách." />
          <div className="gallery-mosaic">
            {(attractions.length > 0 ? attractions.slice(0, 5) : Array(5).fill(null)).map((item, index) => {
              const imageSrc = item?.image ? resolveImageUrl(item.image) : featuredImages[index];
              const title = item?.name || toursList[index]?.title || "Điểm đến nổi bật";
              const desc = item?.description || "Hình ảnh hành trình du lịch thực tế.";
              
              return (
                <div 
                  className={`gallery-item surface-panel gallery-item--${index + 1}`} 
                  key={item?.id || index}
                  style={{ position: "relative", overflow: "hidden" }}
                >
                  <Image 
                    src={imageSrc} 
                    alt={title} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw" 
                    style={{ objectFit: "cover" }}
                  />
                  <div className="gallery-item-overlay" style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    padding: "1.25rem",
                    color: "white"
                  }}>
                    <h4 style={{ color: "white", margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{title}</h4>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section testimonials-section">
        <div className="container">
          <SectionTitle eyebrow="Khách hàng" title="Cảm nhận & độ tin cậy" description="Social proof và những đánh giá chân thực từ khách hàng đồng hành cùng New Star Tour." />
          <TestimonialMarquee />
        </div>
      </section>

      <section className="section section-alt" id="news">
        <div className="container">
          <SectionTitle eyebrow="Tin tức" title="Tin mới về du lịch và điểm đến" description="Những chia sẻ hữu ích, tin tức du lịch cập nhật và cẩm nang khám phá địa phương." />
          <div className="story-grid">
            {newsList.map((post, index) => (
              <article className={`story-card surface-panel story-card--${index + 1}`} key={post.title || index}>
                <span className="story-date">{post.date}</span>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <Link
                  href={`/news/${post.slug}`}
                  className="story-link"
                >
                  Đọc thêm &rarr;
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="container split split--premium">
          <div>
            <SectionTitle eyebrow="Liên hệ" title="Thông tin doanh nghiệp và văn phòng" description="Hệ thống chi nhánh và văn phòng giao dịch của New Star Tour trên toàn quốc." />
            <div className="contact-grid">
              {officesList.map((office) => (
                <article className="contact-card surface-panel" key={office.name}>
                  <h3>{office.name}</h3>
                  <p className="contact-address">{office.address}</p>
                  <div className="contact-details">
                    <div>
                      <strong>Điện thoại</strong>
                      <p>{office.phone || ""}</p>
                    </div>
                    <div>
                      <strong>Hotline</strong>
                      <p className="contact-hotlines">{office.hotline || ""}</p>
                    </div>
                  </div>
                  <a className="contact-email" href={`mailto:${office.email}`}>{office.email}</a>
                </article>
              ))}
            </div>
          </div>
          <div className="contact-aside">
            <div className="info-panel surface-panel">
              <span className="stats">Liên kết nhanh</span>
              <h3>Các tour ghép nổi tiếng</h3>
              <ul className="footer-link-list">
                {cmsQuickLinks.map((item) => (
                  <li key={`${item.label}-${item.url}`}>
                    <Link href={item.url}>{item.label} &rarr;</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="map-panel surface-panel">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.6576136154625!2d105.82869557602058!3d21.04638198717013!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab14032d8471%3A0xe96fa536d54d249!2zMTM5IE5naGkgVMOgbSwgWcOqbiBQaOG7pSwgVMOieSBI4buTLCBIw6AgTuG7mWksIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1717650000000!5e0"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block" }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Bản đồ Trụ sở chính New Star Tour"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
