import Image from "next/image";
import Link from "next/link";
import { getDriveThumbnailUrl } from "@/utils/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cẩm nang & Tin tức du lịch | New Star Tour",
  description: "Cập nhật những xu hướng du lịch mới nhất, cẩm nang chi tiết và tin tức điểm đến hấp dẫn từ đội ngũ New Star Tour.",
  openGraph: {
    title: "Cẩm nang & Tin tức du lịch | New Star Tour",
    description: "Cập nhật những xu hướng du lịch mới nhất, cẩm nang chi tiết và tin tức điểm đến hấp dẫn từ đội ngũ New Star Tour.",
    url: "https://newstartour.vn/news",
    siteName: "New Star Tour",
    images: [
      {
        url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Cẩm nang & Tin tức du lịch New Star Tour",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

type NewsItem = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  hasVideo: boolean;
  category: string;
  author: string;
  date: string;
  readingTime: number;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const getReadingTime = (content?: string) => {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 220));
};

export default async function NewsPage() {
  let newsList: NewsItem[] = [];

  try {
    const res = await fetch("http://localhost:8000/api/news/", { next: { revalidate: 10 } });
    if (res.ok) {
      const data = await res.json();
      newsList = (Array.isArray(data) ? data : []).map((item: any) => ({
        slug: item.slug,
        title: item.title,
        summary: item.summary || "Khám phá thêm những thông tin và kinh nghiệm hữu ích cho hành trình của bạn.",
        image: getDriveThumbnailUrl(item.image) || FALLBACK_IMAGE,
        hasVideo: Boolean(item.video_url),
        category: item.category_rel?.name || item.category || "Cẩm nang du lịch",
        author: item.author || "New Star Tour",
        date: formatDate(item.created_at),
        readingTime: getReadingTime(item.content),
      }));
    }
  } catch (err) {
    console.error("Không thể tải danh sách tin tức:", err);
  }

  const featured = newsList[0];
  const latestNews = newsList.slice(1);

  return (
    <main className="news-index">
      <section className="news-index-hero">
        <div className="news-index-hero__glow" aria-hidden="true" />
        <div className="container news-index-hero__inner">
          <nav className="news-breadcrumb news-breadcrumb--light" aria-label="Điều hướng">
            <Link href="/">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span>Tin tức</span>
          </nav>
          <div className="news-index-hero__content">
            <span className="news-eyebrow">New Star Journal</span>
            <h1>Cảm hứng cho mọi hành trình</h1>
            <p>
              Cẩm nang thực tế, câu chuyện điểm đến và những cập nhật mới nhất giúp bạn chuẩn bị cho chuyến đi trọn vẹn hơn.
            </p>
          </div>
          <div className="news-index-hero__stat" aria-label={`${newsList.length} bài viết`}>
            <strong>{String(newsList.length).padStart(2, "0")}</strong>
            <span>Bài viết<br />đang có</span>
          </div>
        </div>
      </section>

      <section className="news-index-content">
        <div className="container">
          {featured ? (
            <>
              <div className="news-section-heading">
                <div>
                  <span className="news-eyebrow news-eyebrow--dark">Được chọn cho bạn</span>
                  <h2>Bài viết nổi bật</h2>
                </div>
                <p>Gợi ý mới nhất từ đội ngũ biên tập New Star Tour.</p>
              </div>

              <article className="news-featured-card">
                <Link href={`/news/${featured.slug}`} className="news-featured-card__media" aria-label={`Đọc ${featured.title}`}>
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 58vw"
                    priority
                    className="news-card-image"
                  />
                  <span className="news-featured-card__shade" aria-hidden="true" />
                  {featured.hasVideo && <span className="news-card-video-badge"><b>▶</b> Có video</span>}
                </Link>
                <div className="news-featured-card__body">
                  <span className="news-category-pill">{featured.category}</span>
                  <Link href={`/news/${featured.slug}`}>
                    <h2>{featured.title}</h2>
                  </Link>
                  <p>{featured.summary}</p>
                  <div className="news-card-meta">
                    <span>{featured.date}</span>
                    <i aria-hidden="true" />
                    <span>{featured.readingTime} phút đọc</span>
                  </div>
                  <Link href={`/news/${featured.slug}`} className="news-read-link">
                    Đọc bài viết <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>

              {latestNews.length > 0 && (
                <div className="news-latest-block">
                  <div className="news-section-heading news-section-heading--latest">
                    <div>
                      <span className="news-eyebrow news-eyebrow--dark">Khám phá thêm</span>
                      <h2>Bài viết mới nhất</h2>
                    </div>
                    <p>{latestNews.length} câu chuyện và kinh nghiệm đang chờ bạn khám phá.</p>
                  </div>

                  <div className="news-modern-grid">
                    {latestNews.map((item) => (
                      <article key={item.slug} className="news-modern-card">
                        <Link href={`/news/${item.slug}`} className="news-modern-card__media" aria-label={`Đọc ${item.title}`}>
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"
                            className="news-card-image"
                          />
                          <span className="news-modern-card__category">{item.category}</span>
                          {item.hasVideo && <span className="news-card-video-badge news-card-video-badge--compact"><b>▶</b> Video</span>}
                        </Link>
                        <div className="news-modern-card__body">
                          <div className="news-card-meta">
                            <span>{item.date}</span>
                            <i aria-hidden="true" />
                            <span>{item.readingTime} phút đọc</span>
                          </div>
                          <Link href={`/news/${item.slug}`}>
                            <h3>{item.title}</h3>
                          </Link>
                          <p>{item.summary}</p>
                          <div className="news-modern-card__footer">
                            <span>Bởi {item.author}</span>
                            <Link href={`/news/${item.slug}`} aria-label={`Đọc tiếp ${item.title}`}>→</Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="news-empty-state">
              <span aria-hidden="true">N</span>
              <h2>Chưa có bài viết</h2>
              <p>Những câu chuyện du lịch mới sẽ sớm được cập nhật tại đây.</p>
              <Link href="/tours" className="button button-primary">Khám phá các tour</Link>
            </div>
          )}
        </div>
      </section>

      <section className="news-index-cta">
        <div className="container news-index-cta__inner">
          <div>
            <span className="news-eyebrow">Bắt đầu hành trình</span>
            <h2>Đi xa hơn những điều bạn vừa đọc</h2>
          </div>
          <p>Khám phá các chương trình tour được thiết kế chỉn chu bởi đội ngũ New Star Tour.</p>
          <Link href="/tours" className="news-index-cta__button">Xem tất cả tour <span>→</span></Link>
        </div>
      </section>
    </main>
  );
}
