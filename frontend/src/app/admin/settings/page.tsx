"use client";

import { useEffect, useState } from "react";

interface HeroSectionSettings {
  title: string;
  subtitle: string;
  bg_image: string;
}

interface BrandingSettings {
  accent_color: string;
  accent_dark: string;
  accent_light: string;
}

export default function AdminSettings() {
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroBgImage, setHeroBgImage] = useState("");
  
  const [accentColor, setAccentColor] = useState("#b5813f");
  const [accentDark, setAccentDark] = useState("#8f642c");
  const [accentLight, setAccentLight] = useState("#e6cb9e");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/settings/");
      if (!res.ok) throw new Error("Không thể tải cấu hình hệ thống.");
      const data = await res.json();

      // Find hero setting
      const heroSetting = data.find((item: any) => item.key === "cms_hero_section");
      if (heroSetting && heroSetting.value) {
        setHeroTitle(heroSetting.value.title || "");
        setHeroSubtitle(heroSetting.value.subtitle || "");
        setHeroBgImage(heroSetting.value.bg_image || "");
      } else {
        // Defaults
        setHeroTitle("Khám Phá Thế Giới Cùng StarTour");
        setHeroSubtitle("Trải nghiệm những chuyến đi đẳng cấp, lịch trình riêng biệt.");
        setHeroBgImage("https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80");
      }

      // Find branding setting
      const brandingSetting = data.find((item: any) => item.key === "cms_branding");
      if (brandingSetting && brandingSetting.value) {
        setAccentColor(brandingSetting.value.accent_color || "#b5813f");
        setAccentDark(brandingSetting.value.accent_dark || "#8f642c");
        setAccentLight(brandingSetting.value.accent_light || "#e6cb9e");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi tải cấu hình.");
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
      const res = await fetch("http://localhost:8000/api/tours/upload-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload ảnh thất bại.");
      const data = await res.json();
      setHeroBgImage(data.url);
      setSuccess("Tải ảnh bìa thành công!");
    } catch (err: any) {
      console.error(err);
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

    try {
      const heroValue: HeroSectionSettings = {
        title: heroTitle,
        subtitle: heroSubtitle,
        bg_image: heroBgImage,
      };

      const brandingValue: BrandingSettings = {
        accent_color: accentColor,
        accent_dark: accentDark,
        accent_light: accentLight,
      };

      // Save hero settings
      // We pass the stringified value encoded inside the query parameter as required by OpenAPI schemas
      const heroRes = await fetch(
        `http://localhost:8000/api/settings/cms_hero_section?value=${encodeURIComponent(JSON.stringify(heroValue))}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!heroRes.ok) throw new Error("Không thể lưu cấu hình Hero Section.");

      // Save branding settings
      const brandingRes = await fetch(
        `http://localhost:8000/api/settings/cms_branding?value=${encodeURIComponent(JSON.stringify(brandingValue))}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!brandingRes.ok) throw new Error("Không thể lưu cấu hình màu sắc thương hiệu.");

      setSuccess("Lưu cấu hình hệ thống thành công!");
      
      // Dynamic apply color settings in admin interface or trigger preview update
      document.documentElement.style.setProperty("--accent", accentColor);
      document.documentElement.style.setProperty("--accent-dark", accentDark);
      document.documentElement.style.setProperty("--accent-light", accentLight);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi lưu cấu hình.");
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
        <h3>⚙️ Cấu hình giao diện trang chủ</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <form onSubmit={handleSave} className="auth-form" style={{ gap: "2rem" }}>
        {/* Banner Hero Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", color: "#0f172a" }}>🌅 Cấu hình Banner Hero</h4>

          <div className="form-group">
            <label htmlFor="heroTitle">Tiêu đề chính (Title)</label>
            <input
              type="text"
              id="heroTitle"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="Ví dụ: Khám Phá Thế Giới Cùng StarTour"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="heroSubtitle">Mô tả ngắn (Subtitle)</label>
            <textarea
              id="heroSubtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Đoạn văn ngắn chào mừng hoặc giới thiệu dịch vụ"
              rows={3}
              style={{
                width: "100%",
                borderRadius: "0.85rem",
                border: "1px solid var(--border-strong)",
                padding: "0.9rem 1.1rem",
                background: "white",
                fontFamily: "inherit",
                fontSize: "0.98rem",
              }}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="heroBg">Ảnh nền Banner Hero</label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <input
                type="text"
                id="heroBg"
                value={heroBgImage}
                onChange={(e) => setHeroBgImage(e.target.value)}
                placeholder="Đường dẫn ảnh hoặc tải lên ảnh mới"
                required
                style={{ flexGrow: 1 }}
              />
              <label
                style={{
                  padding: "0.75rem 1.25rem",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {uploading ? "Đang tải..." : "📁 Chọn tệp"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  style={{ display: "none" }}
                  disabled={uploading}
                />
              </label>
            </div>
            {heroBgImage && (
              <div style={{ marginTop: "1rem" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>Xem trước ảnh nền:</p>
                <img
                  src={heroBgImage}
                  alt="Preview bg"
                  style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1100&q=80";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Color Palette Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginTop: "1.5rem" }}>
          <h4 style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", color: "#0f172a" }}>🎨 Tông màu chủ đạo (Branding Colors)</h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="colorAccent">Màu chủ đạo (Accent)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="color"
                  id="colorAccent"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#b5813f"
                  style={{ flexGrow: 1, height: "40px", padding: "0 0.5rem" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="colorAccentDark">Màu tối (Dark)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="color"
                  id="colorAccentDark"
                  value={accentDark}
                  onChange={(e) => setAccentDark(e.target.value)}
                  style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={accentDark}
                  onChange={(e) => setAccentDark(e.target.value)}
                  placeholder="#8f642c"
                  style={{ flexGrow: 1, height: "40px", padding: "0 0.5rem" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="colorAccentLight">Màu sáng (Light)</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="color"
                  id="colorAccentLight"
                  value={accentLight}
                  onChange={(e) => setAccentLight(e.target.value)}
                  style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={accentLight}
                  onChange={(e) => setAccentLight(e.target.value)}
                  placeholder="#e6cb9e"
                  style={{ flexGrow: 1, height: "40px", padding: "0 0.5rem" }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="admin-btn-primary"
          style={{ width: "100%", padding: "0.9rem", marginTop: "1rem" }}
          disabled={saving}
        >
          {saving ? "Đang lưu cấu hình..." : "Lưu tất cả thay đổi"}
        </button>
      </form>
    </div>
  );
}
