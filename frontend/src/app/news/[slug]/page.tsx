import NewsDetailClient from "./NewsDetailClient";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let article: any = null;
  
  try {
    const res = await fetch(`http://localhost:8000/api/news/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      article = {
        title: data.title,
        summary: data.summary || "",
        image: data.image || ""
      };
    }
  } catch (err) {
    console.error("Error fetching news metadata:", err);
  }

  if (!article) {
    return { title: "Không tìm thấy bài viết | New Star Tour" };
  }

  return {
    title: `${article.title} | New Star Tour`,
    description: article.summary,
    openGraph: {
      title: `${article.title} | New Star Tour`,
      description: article.summary,
      url: `https://newstartour.vn/news/${slug}`,
      siteName: "New Star Tour",
      images: [
        {
          url: article.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: "vi_VN",
      type: "article",
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  return <NewsDetailClient slug={slug} />;
}
