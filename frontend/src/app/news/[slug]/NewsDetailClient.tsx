"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getDriveThumbnailUrl } from "@/utils/image";

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

type RelatedNews = {
  title: string;
  date: string;
  image: string;
  slug: string;
  category: string;
  hasVideo: boolean;
};

type Article = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  videoUrl: string;
  date: string;
  author: string;
  category: string;
  readingTime: number;
  content: string[];
};

export default function NewsDetailClient({ slug }: { slug: string }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [allNews, setAllNews] = useState<RelatedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("http://localhost:8000/api/news/", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map((item: any) => ({
          title: item.title,
          date: formatDate(item.created_at),
          image: getDriveThumbnailUrl(item.image) || FALLBACK_IMAGE,
          slug: item.slug,
          category: item.category_rel?.name || item.category || "Cẩm nang du lịch",
          hasVideo: Boolean(item.video_url),
        }));
        setAllNews(mapped);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Không thể tải bài viết liên quan:", err);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const updateScrollProgress = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(totalHeight > 0 ? Math.min(100, (window.scrollY / totalHeight) * 100) : 0);
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);
    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCopied(false);

    fetch(`http://localhost:8000/api/news/${slug}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Không tìm thấy bài viết.");
        return res.json();
      })
      .then((data) => {
        const rawContent = data.content || "";
        setArticle({
          slug: data.slug,
          title: data.title,
          summary: data.summary || "",
          image: getDriveThumbnailUrl(data.image) || FALLBACK_IMAGE,
          videoUrl: data.video_url || "",
          date: formatDate(data.created_at),
          author: data.author || "New Star Tour",
          category: data.category_rel?.name || data.category || "Cẩm nang du lịch",
          readingTime: getReadingTime(rawContent),
          content: rawContent.split(/\n\s*\n/).map((paragraph: string) => paragraph.trim()).filter(Boolean),
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Không thể tải bài viết:", err);
          setArticle(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const relatedNews = useMemo(() => {
    if (!article) return [];
    return allNews
      .filter((item) => item.slug !== article.slug)
      .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
      .slice(0, 4);
  }, [allNews, article]);

  const handleShare = async () => {
    const shareData = { title: article?.title || "New Star Tour", url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Không thể chia sẻ bài viết:", err);
    }
  };

  if (loading) {
    return (
      <main className="news-detail-state" aria-busy="true">
        <div className="news-detail-loader"><span /><p>Đang tải bài viết...</p></div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="news-detail-state">
        <div className="news-not-found">
          <span aria-hidden="true">404</span>
          <h1>Không tìm thấy bài viết</h1>
          <p>Bài viết này không tồn tại hoặc đã được gỡ khỏi hệ thống.</p>
          <Link href="/news" className="button button-primary">Quay lại trang tin tức</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="news-detail">
      <div className="news-reading-progress" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      <header className="news-detail-hero">
        <div className="news-detail-hero__pattern" aria-hidden="true" />
        <div className="container news-detail-hero__inner">
          <nav className="news-breadcrumb" aria-label="Điều hướng">
            <Link href="/">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/news">Tin tức</Link>
            <span aria-hidden="true">/</span>
            <span>{article.category}</span>
          </nav>

          <span className="news-category-pill">{article.category}</span>
          <h1>{article.title}</h1>
          {article.summary && <p className="news-detail-hero__summary">{article.summary}</p>}

          <div className="news-detail-byline">
            <div className="news-author-avatar" aria-hidden="true">NS</div>
            <div className="news-detail-byline__author">
              <strong>{article.author}</strong>
              <span>Đội ngũ biên tập New Star Tour</span>
            </div>
            <i aria-hidden="true" />
            <div className="news-detail-byline__meta">
              <span>{article.date}</span>
              <span>{article.readingTime} phút đọc</span>
            </div>
            <button type="button" className="news-share-button" onClick={handleShare}>
              <span aria-hidden="true">↗</span> {copied ? "Đã sao chép" : "Chia sẻ"}
            </button>
          </div>
        </div>
      </header>

      <section className="news-detail-feature">
        <div className="container">
          <div className="news-detail-feature__image">
            <Image
              src={article.image}
              alt={article.title}
              fill
              sizes="(max-width: 900px) 100vw, 1200px"
              priority
            />
            <div className="news-detail-feature__caption">
              <span>New Star Journal</span>
              {article.videoUrl && <b><i aria-hidden="true">▶</i> Bài viết có video</b>}
            </div>
          </div>
        </div>
      </section>

      <section className="news-detail-content">
        <div className="container news-detail-layout">
          <article className="news-article">
            {article.summary && <p className="news-article-lead">{article.summary}</p>}

            {article.videoUrl && (
              <figure className="news-article-video">
                <div className="news-article-video__label"><span>▶</span> Video trong bài viết</div>
                <video
                  src={article.videoUrl}
                  poster={article.image}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`Video: ${article.title}`}
                >
                  Trình duyệt của bạn chưa hỗ trợ phát video này.
                </video>
              </figure>
            )}

            <div className="news-article-prose">
              {article.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>

            <footer className="news-article-footer">
              <div>
                <span>Chủ đề</span>
                <strong>{article.category}</strong>
              </div>
              <button type="button" onClick={handleShare}>{copied ? "Đã sao chép liên kết" : "Chia sẻ bài viết"} <span>↗</span></button>
            </footer>

            <div className="news-author-card">
              <div className="news-author-avatar news-author-avatar--large" aria-hidden="true">NS</div>
              <div>
                <span>Người biên soạn</span>
                <h3>{article.author}</h3>
                <p>Những nội dung và kinh nghiệm du lịch được chọn lọc bởi đội ngũ New Star Tour.</p>
              </div>
            </div>
          </article>

          <aside className="news-detail-sidebar">
            <div className="news-sidebar-card news-sidebar-card--share">
              <span className="news-sidebar-label">Chia sẻ bài viết</span>
              <h3>Gửi cảm hứng này đến bạn bè</h3>
              <button type="button" onClick={handleShare}><span>↗</span>{copied ? "Đã sao chép liên kết" : "Chia sẻ ngay"}</button>
            </div>

            {relatedNews.length > 0 && (
              <div className="news-related">
                <div className="news-related__heading">
                  <span className="news-sidebar-label">Đọc tiếp</span>
                  <h3>Bài viết liên quan</h3>
                </div>
                <div className="news-related__list">
                  {relatedNews.map((item) => (
                    <Link key={item.slug} href={`/news/${item.slug}`} className="news-related-item">
                      <div className="news-related-item__image">
                        <Image src={item.image} alt="" fill sizes="104px" />
                        {item.hasVideo && <span aria-label="Có video">▶</span>}
                      </div>
                      <div>
                        <span>{item.category}</span>
                        <h4>{item.title}</h4>
                        <time>{item.date}</time>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="news-sidebar-card news-sidebar-card--tour">
              <span className="news-sidebar-label">New Star Tour</span>
              <h3>Sẵn sàng cho hành trình tiếp theo?</h3>
              <p>Khám phá các chương trình tour được chuẩn bị chỉn chu cho bạn và gia đình.</p>
              <Link href="/tours">Xem các tour phù hợp <span>→</span></Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="news-detail-bottom">
        <div className="container">
          <Link href="/news"><span>←</span> Trở lại tất cả bài viết</Link>
        </div>
      </section>
    </main>
  );
}
