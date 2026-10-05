"use client";

import { useEffect, useState } from "react";

interface GeneralConfig {
  site_name: string;
  slogan: string;
  hotline: string;
  email: string;
  address: string;
  logo_url: string;
  facebook_url?: string;
  youtube_url?: string;
}

export default function ConfigGeneralPage() {
  const [siteName, setSiteName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [hotline, setHotline] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchGeneralConfig();
  }, []);

  const fetchGeneralConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/settings/config_general");
      if (!res.ok) {
        if (res.status === 404) {
          setLoading(false);
          return;
        }
        throw new Error("Không thể tải cấu hình chung.");
      }
      const data = await res.json();
      if (data && data.value) {
        const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setSiteName(val.site_name || "");
        setSlogan(val.slogan || "");
        setHotline(val.hotline || "");
        setEmail(val.email || "");
        setAddress(val.address || "");
        setLogoUrl(val.logo_url || "");
        setFacebookUrl(val.facebook_url || "");
        setYoutubeUrl(val.youtube_url || "");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/news/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Tải logo lên thất bại.");
      const data = await res.json();
      setLogoUrl(data.url);
      setSuccess("Tải ảnh Logo thành công!");
    } catch (err: any) {
      setError(err.message || "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("admin_token");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setSaving(false);
      return;
    }

    const payload: GeneralConfig = {
      site_name: siteName,
      slogan,
      hotline,
      email,
      address,
      logo_url: logoUrl,
      facebook_url: facebookUrl || undefined,
      youtube_url: youtubeUrl || undefined
    };

    try {
      const res = await fetch(
        `http://localhost:8000/api/settings/config_general?value=${encodeURIComponent(JSON.stringify(payload))}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình chung thất bại.");
      setSuccess("Cấu hình chung hệ thống đã được cập nhật thành công!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-container" style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="admin-panel-header">
        <h3>⚙️ Cấu hình chung hệ thống</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <form onSubmit={handleSave} className="auth-form">
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label>Tên Website (Brand Name)</label>
            <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Ví dụ: StarTour Du Lịch" required />
          </div>
          <div className="form-group">
            <label>Hotline CSKH</label>
            <input type="text" value={hotline} onChange={(e) => setHotline(e.target.value)} placeholder="0988-xxx-xxx" required />
          </div>
        </div>

        <div className="form-group">
          <label>Khẩu hiệu Slogan thương hiệu</label>
          <input type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Ví dụ: Nâng tầm trải nghiệm chuyến đi của bạn" required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label>Email hỗ trợ</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@startour.vn" required />
          </div>
          <div className="form-group">
            <label>Địa chỉ Trụ sở chính</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, Tên đường, Quận, Thành phố..." required />
          </div>
        </div>

        <div className="form-group">
          <label>Logo Website (URL hoặc tải lên)</label>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Đường dẫn URL logo..." style={{ flexGrow: 1 }} />
            <label style={{
              padding: "0.75rem 1.25rem", background: "var(--public-surface-soft, #f1f5f9)", border: "1px solid var(--public-border, #cbd5e1)",
              borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600,
              whiteSpace: "nowrap"
            }}>
              {uploading ? "Tải lên..." : "📁 Tải Logo"}
              <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
            </label>
          </div>
          {logoUrl && (
            <img src={logoUrl} alt="Logo Preview" style={{ marginTop: "1rem", maxHeight: "60px", objectFit: "contain", padding: "0.5rem", background: "var(--public-surface-soft, #f1f5f9)", borderRadius: "0.5rem" }} />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div className="form-group">
            <label>Địa chỉ trang Facebook (Link)</label>
            <input type="text" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div className="form-group">
            <label>Địa chỉ kênh Youtube (Link)</label>
            <input type="text" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          </div>
        </div>

        <button type="submit" className="admin-btn-primary" style={{ width: "100%", padding: "0.9rem", marginTop: "1rem" }} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu tất cả cấu hình"}
        </button>
      </form>
    </div>
  );
}
