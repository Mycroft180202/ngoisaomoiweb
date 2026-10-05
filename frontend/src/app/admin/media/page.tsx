"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type MediaItem = {
  path: string;
  name: string;
  url: string;
  mime_type: string;
  kind: "image" | "video" | "document";
  size: number;
  modified_at: string;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

export default function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadItems = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${apiBase}/api/media-library/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Không thể tải thư viện media");
      setItems(await res.json());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const visibleItems = useMemo(() => items.filter((item) =>
    (filter === "all" || item.kind === filter) && item.name.toLowerCase().includes(query.toLowerCase())),
  [items, filter, query]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${apiBase}/api/media-library/upload`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể tải tệp lên");
      setMessage("Tải tệp lên thành công.");
      await loadItems();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải tệp lên");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const remove = async (item: MediaItem) => {
    if (!await appConfirm(`Xóa vĩnh viễn tệp “${item.name}”? Các nội dung đang dùng URL này có thể bị mất hình ảnh.`)) return;
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${apiBase}/api/media-library/${item.path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setItems((current) => current.filter((file) => file.path !== item.path));
    else setMessage((await res.json()).detail || "Không thể xóa tệp");
  };

  return <div className="admin-content media-manager">
    <div className="admin-card">
      <div className="media-toolbar">
        <div>
          <h3>Thư viện Media</h3>
          <p>{items.length} tệp đang lưu trên máy chủ</p>
        </div>
        <label className="btn-primary-admin media-upload-btn">
          {uploading ? "Đang tải lên..." : "＋ Tải media lên"}
          <input type="file" hidden disabled={uploading} onChange={upload} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
        </label>
      </div>

      <div className="media-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên tệp..." />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Tất cả định dạng</option><option value="image">Hình ảnh</option>
          <option value="video">Video</option><option value="document">Tài liệu</option>
        </select>
      </div>
      {message && <div className="auth-message">{message}</div>}
      {loading ? <p>Đang tải thư viện...</p> : visibleItems.length === 0 ? <div className="media-empty">Không có tệp phù hợp.</div> :
        <div className="media-grid">{visibleItems.map((item) => <article className="media-card" key={item.path}>
          <div className="media-preview">
            {item.kind === "image" && <img src={item.url} alt={item.name} loading="lazy" />}
            {item.kind === "video" && <video src={item.url} controls preload="metadata" />}
            {item.kind === "document" && <span>📄<small>{item.mime_type}</small></span>}
          </div>
          <div className="media-info">
            <strong title={item.name}>{item.name}</strong>
            <span>{formatSize(item.size)} · {new Date(item.modified_at).toLocaleDateString("vi-VN")}</span>
            <code title={item.path}>{item.path}</code>
          </div>
          <div className="media-actions">
            <button onClick={() => navigator.clipboard.writeText(item.url)}>Sao chép URL</button>
            <a href={item.url} target="_blank" rel="noreferrer">Mở</a>
            <button className="danger" onClick={() => void remove(item)}>Xóa</button>
          </div>
        </article>)}</div>}
    </div>
  </div>;
}
