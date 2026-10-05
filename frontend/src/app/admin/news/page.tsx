"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState } from "react";

interface News {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  video_url?: string;
  category: string;
  category_id?: number;
  author: string;
  created_at: string;
  tags?: { id: number; name: string }[];
}

interface NewsCategory {
  id: number;
  name: string;
  slug: string;
}

interface NewsTag {
  id: number;
  name: string;
  slug: string;
}

export default function NewsManager() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // DB categories & tags
  const [dbCategories, setDbCategories] = useState<NewsCategory[]>([]);
  const [dbTags, setDbTags] = useState<NewsTag[]>([]);

  // Edit/Add Mode states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editNewsId, setEditNewsId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [author, setAuthor] = useState("Admin");

  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    fetchCategoriesAndTags();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/news/");
      if (!res.ok) throw new Error("Không thể tải danh sách bài viết.");
      const data = await res.json();
      setNewsList(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      const resCat = await fetch("http://localhost:8000/api/news-categories/");
      if (resCat.ok) {
        const catData = await resCat.json();
        setDbCategories(catData);
      }
      const resTag = await fetch("http://localhost:8000/api/news-categories/tags/all");
      if (resTag.ok) {
        const tagData = await resTag.json();
        setDbTags(tagData);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh mục/tags: ", err);
    }
  };

  const handleOpenAddForm = () => {
    setEditNewsId(null);
    setTitle("");
    setSlug("");
    setSummary("");
    setContent("");
    setImage("");
    setVideoUrl("");
    setCategoryId(dbCategories.length > 0 ? dbCategories[0].id : "");
    setSelectedTagIds([]);
    setAuthor("Admin");
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: News) => {
    setEditNewsId(item.id);
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setSummary(item.summary || "");
    setContent(item.content || "");
    setImage(item.image || "");
    setVideoUrl(item.video_url || "");
    setCategoryId(item.category_id || "");
    setSelectedTagIds(item.tags ? item.tags.map((t) => t.id) : []);
    setAuthor(item.author || "Admin");
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editNewsId) {
      const generatedSlug = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Tone marks
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      setSlug(generatedSlug);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Ảnh không được vượt quá 10 MB.");
      return;
    }

    setUploading(true);
    setFormError(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/news/upload-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Tải ảnh lên thất bại.");
      setImage(data.url);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setFormError("Video không được vượt quá 50 MB.");
      return;
    }
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    setUploadingVideo(true);
    setFormError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/news/upload-video", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Tải video lên thất bại.");
      setVideoUrl(data.url);
    } catch (err: any) {
      setFormError(err.message || "Không thể tải video lên máy chủ.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!await appConfirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/news/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setNewsList((prev) => prev.filter((item) => item.id !== id));
      } else {
        appToast("Xóa bài viết thất bại.");
      }
    } catch (err) {
      console.error(err);
      appToast("Đã xảy ra lỗi.");
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setFormError("Vui lòng đăng nhập lại.");
      return;
    }

    const matchedCatName = dbCategories.find(c => c.id === Number(categoryId))?.name || "";

    const payload = {
      slug,
      title,
      summary,
      content,
      image,
      video_url: videoUrl || null,
      category: matchedCatName,
      category_id: categoryId ? Number(categoryId) : null,
      author,
      tag_ids: selectedTagIds,
    };

    try {
      let res;
      if (editNewsId) {
        res = await fetch(`http://localhost:8000/api/news/${editNewsId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:8000/api/news/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Không thể lưu bài viết.");
      }

      setFormSuccess(editNewsId ? "Cập nhật bài viết thành công!" : "Đăng bài viết mới thành công!");
      fetchNews();
      setTimeout(() => {
        setIsFormOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Gặp lỗi khi lưu.");
    }
  };

  const filteredNews = newsList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.summary || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading && newsList.length === 0) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {isFormOpen ? (
        /* Form soạn thảo tin tức */
        <section className="admin-panel" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div className="admin-panel-header">
            <h3>{editNewsId ? `📰 Chỉnh sửa bài viết: ${title}` : "📰 Đăng bài viết mới"}</h3>
            <button onClick={() => setIsFormOpen(false)} className="btn-view-site" style={{ padding: "0.45rem 1rem" }}>
              Quay lại danh sách
            </button>
          </div>

          {formError && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{formError}</div>}
          {formSuccess && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{formSuccess}</div>}

          <form onSubmit={handleFormSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="newsTitle">Tiêu đề bài viết</label>
              <input
                type="text"
                id="newsTitle"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ví dụ: Cẩm nang du lịch Sapa tự túc từ A-Z năm 2026"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label htmlFor="newsSlug">Đường dẫn tĩnh Slug</label>
                <input
                  type="text"
                  id="newsSlug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="cam-nang-du-lich-sapa"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newsCategory">Danh mục bài viết</label>
                <select
                  id="newsCategory"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                  style={{
                    width: "100%",
                    borderRadius: "0.85rem",
                    border: "1px solid var(--border-strong)",
                    padding: "0.9rem 1.1rem",
                    background: "var(--public-surface, white)",
                    fontSize: "0.98rem",
                  }}
                  required
                >
                  <option value="">-- Chọn danh mục --</option>
                  {dbCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Tag tin tức</label>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", border: "1px solid var(--border)", padding: "1rem", borderRadius: "0.5rem", background: "var(--public-surface-soft, #f8fafc)" }}>
                {dbTags.length === 0 ? (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Chưa có tag nào, vui lòng tạo tag trước.</span>
                ) : (
                  dbTags.map((tag) => (
                    <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem" }}>
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        style={{ width: "auto" }}
                      />
                      {tag.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div className="form-group">
                <label htmlFor="newsAuthor">Tác giả</label>
                <input
                  type="text"
                  id="newsAuthor"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Admin"
                  required
                />
              </div>
            </div>

            <section className="news-media-manager">
              <div className="news-media-heading">
                <div><h4>Hình ảnh &amp; video</h4><p>Tệp tải lên sẽ được lưu trực tiếp trên máy chủ NewStar Tour.</p></div>
                <span>MP4/WebM tối đa 50 MB</span>
              </div>
              <div className="news-media-grid">
                <div className="news-media-card">
                  <div className="news-media-card-title"><span>🖼️</span><div><strong>Ảnh đại diện</strong><small>Bắt buộc · dùng cho danh sách và ảnh poster</small></div></div>
                  <label className={`news-upload-zone ${uploading ? "is-uploading" : ""}`}>
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUploadImage} disabled={uploading} />
                    <b>{uploading ? "Đang tải ảnh lên..." : "Chọn ảnh từ máy tính"}</b>
                    <small>JPG, PNG, GIF hoặc WebP · tối đa 10 MB</small>
                  </label>
                  <div className="news-media-or"><span>hoặc dùng đường dẫn ảnh</span></div>
                  <input id="newsImage" type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." required />
                  {image && <div className="news-media-preview"><img src={image} alt="Xem trước ảnh đại diện" /><button type="button" onClick={() => setImage("")} aria-label="Xóa ảnh">×</button></div>}
                </div>

                <div className="news-media-card">
                  <div className="news-media-card-title"><span>🎬</span><div><strong>Video bài viết</strong><small>Không bắt buộc · phát trong trang chi tiết</small></div></div>
                  <label className={`news-upload-zone ${uploadingVideo ? "is-uploading" : ""}`}>
                    <input type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={handleUploadVideo} disabled={uploadingVideo} />
                    <b>{uploadingVideo ? "Đang tải video lên..." : "Chọn video từ máy tính"}</b>
                    <small>Nên dùng MP4 (H.264) để tương thích tốt nhất</small>
                  </label>
                  <div className="news-media-or"><span>hoặc dùng đường dẫn video</span></div>
                  <input id="newsVideo" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://.../video.mp4" />
                  {videoUrl && <div className="news-media-preview news-video-preview"><video src={videoUrl} poster={image || undefined} controls preload="metadata" /><button type="button" onClick={() => setVideoUrl("")} aria-label="Xóa video">×</button></div>}
                </div>
              </div>
            </section>

            <div className="form-group">
              <label htmlFor="newsSummary">Tóm tắt ngắn</label>
              <textarea
                id="newsSummary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Nhập mô tả ngắn hiển thị ở trang danh sách tin..."
                rows={2}
                style={{
                  width: "100%",
                  borderRadius: "0.85rem",
                  border: "1px solid var(--border-strong)",
                  padding: "0.9rem 1.1rem",
                  background: "var(--public-surface, white)",
                  fontFamily: "inherit",
                  fontSize: "0.98rem",
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newsContent">Nội dung bài viết</label>
              <textarea
                id="newsContent"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung bài viết chi tiết..."
                rows={10}
                style={{
                  width: "100%",
                  borderRadius: "0.85rem",
                  border: "1px solid var(--border-strong)",
                  padding: "0.9rem 1.1rem",
                  background: "var(--public-surface, white)",
                  fontFamily: "inherit",
                  fontSize: "0.98rem",
                }}
                required
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button type="submit" className="admin-btn-primary" style={{ flexGrow: 1, padding: "0.9rem" }}>
                {editNewsId ? "✓ Lưu cập nhật" : "➕ Đăng bài viết"}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="btn-view-site"
                style={{ padding: "0.9rem 2rem", border: "1px solid var(--public-border, #cbd5e1)" }}
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        </section>
      ) : (
        /* Table Danh sách Tin tức */
        <section className="admin-panel">
          <div className="admin-panel-header">
            <h3>📰 Quản lý bài viết tin tức ({filteredNews.length})</h3>
            <button onClick={handleOpenAddForm} className="admin-btn-primary">
              ➕ Đăng bài mới
            </button>
          </div>

          {/* Tìm kiếm và Lọc */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="🔍 Tìm kiếm bài viết theo tiêu đề, tóm tắt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flexGrow: 1,
                minWidth: "260px",
                borderRadius: "0.5rem",
                border: "1px solid var(--public-border, #cbd5e1)",
                padding: "0.65rem 1rem",
                fontSize: "0.92rem",
              }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                borderRadius: "0.5rem",
                border: "1px solid var(--public-border, #cbd5e1)",
                padding: "0.65rem 1rem",
                background: "var(--public-surface, white)",
                fontSize: "0.92rem",
              }}
            >
              <option value="">Tất cả danh mục</option>
              {dbCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {filteredNews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
              Không tìm thấy bài viết nào.
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tiêu đề bài viết</th>
                    <th>Danh mục</th>
                    <th>Tags</th>
                    <th>Tác giả</th>
                    <th>Ngày đăng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNews.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "0.4rem", border: "1px solid var(--public-border, #cbd5e1)" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=80" }}
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "var(--public-text-strong, #0f172a)" }}>{item.title}</span>
                          <span style={{ fontSize: "0.82rem", color: "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "300px" }}>
                            {item.summary}
                          </span>
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", maxWidth: "160px" }}>
                          {item.tags && item.tags.length > 0 ? (
                            item.tags.map((t) => (
                              <span key={t.id} style={{ fontSize: "0.72rem", background: "var(--public-surface-soft, #f1f5f9)", padding: "0.15rem 0.45rem", borderRadius: "0.25rem", color: "var(--public-text, #475569)" }}>
                                {t.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>-</span>
                          )}
                        </div>
                      </td>
                      <td>{item.author}</td>
                      <td>{new Date(item.created_at).toLocaleDateString("vi-VN")}</td>
                      <td>
                        <div style={{ display: "flex" }}>
                          <button
                            onClick={() => handleOpenEditForm(item)}
                            className="btn-action"
                            title="Sửa bài viết"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteNews(item.id)}
                            className="btn-action btn-delete"
                            title="Xóa bài viết"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
