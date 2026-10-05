"use client";

import { useEffect, useState } from "react";

interface TechConfig {
  zalo_oa_id?: string;
  zalo_access_token?: string;
  google_maps_key?: string;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
}

export default function ConfigTechPage() {
  const [zaloOaId, setZaloOaId] = useState("");
  const [zaloAccessToken, setZaloAccessToken] = useState("");
  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [facebookPixelId, setFacebookPixelId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTechConfig();
  }, []);

  const fetchTechConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/settings/config_tech");
      if (!res.ok) {
        if (res.status === 404) {
          setLoading(false);
          return;
        }
        throw new Error("Không thể tải cấu hình Tech.");
      }
      const data = await res.json();
      if (data && data.value) {
        const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setZaloOaId(val.zalo_oa_id || "");
        setZaloAccessToken(val.zalo_access_token || "");
        setGoogleMapsKey(val.google_maps_key || "");
        setGoogleAnalyticsId(val.google_analytics_id || "");
        setFacebookPixelId(val.facebook_pixel_id || "");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi tải cấu hình.");
    } finally {
      setLoading(false);
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

    const payload: TechConfig = {
      zalo_oa_id: zaloOaId || undefined,
      zalo_access_token: zaloAccessToken || undefined,
      google_maps_key: googleMapsKey || undefined,
      google_analytics_id: googleAnalyticsId || undefined,
      facebook_pixel_id: facebookPixelId || undefined
    };

    try {
      const res = await fetch(
        `http://localhost:8000/api/settings/config_tech?value=${encodeURIComponent(JSON.stringify(payload))}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) throw new Error("Lưu cấu hình Tech thất bại.");
      setSuccess("Cấu hình Tech & API đã được cập nhật thành công!");
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
    <div className="admin-panel" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="admin-panel-header">
        <h3>💻 Cấu hình API và Tích hợp kỹ thuật</h3>
      </div>

      {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
      {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

      <form onSubmit={handleSave} className="auth-form">
        <h4 style={{ borderBottom: "1px solid var(--public-border, #e2e8f0)", paddingBottom: "0.5rem", marginTop: "1rem" }}>💬 Cấu hình Zalo OA (Gửi OTP)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label>Zalo OA ID</label>
            <input type="text" value={zaloOaId} onChange={(e) => setZaloOaId(e.target.value)} placeholder="Nhập Zalo Official Account ID" />
          </div>
          <div className="form-group">
            <label>Zalo Access Token</label>
            <input type="password" value={zaloAccessToken} onChange={(e) => setZaloAccessToken(e.target.value)} placeholder="Zalo OA Access Token..." />
          </div>
        </div>

        <h4 style={{ borderBottom: "1px solid var(--public-border, #e2e8f0)", paddingBottom: "0.5rem", marginTop: "1.5rem" }}>🗺️ Google Maps API</h4>
        <div className="form-group">
          <label>Google Maps API Key</label>
          <input type="text" value={googleMapsKey} onChange={(e) => setGoogleMapsKey(e.target.value)} placeholder="AIzaSy..." />
        </div>

        <h4 style={{ borderBottom: "1px solid var(--public-border, #e2e8f0)", paddingBottom: "0.5rem", marginTop: "1.5rem" }}>📊 Phân tích & Theo dõi (Analytics)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label>Google Analytics ID (G-xxxxxx)</label>
            <input type="text" value={googleAnalyticsId} onChange={(e) => setGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label>Facebook Pixel ID</label>
            <input type="text" value={facebookPixelId} onChange={(e) => setFacebookPixelId(e.target.value)} placeholder="Nhập FB Pixel ID" />
          </div>
        </div>

        <button type="submit" className="admin-btn-primary" style={{ width: "100%", padding: "0.9rem", marginTop: "1rem" }} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu cấu hình Tech"}
        </button>
      </form>
    </div>
  );
}
