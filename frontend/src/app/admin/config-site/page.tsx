"use client";

import { useEffect, useState } from "react";
import type { CmsConfig, CmsGlobeDestination, CmsLink } from "@/components/cms/CmsProvider";
import { FONT_OPTIONS, getFontFamily } from "@/lib/fontCatalog";

const defaults: CmsConfig = {
  identity: { site_name: "New Star Tour", logo_url: "/Logo.png", footer_logo_url: "/Logo.png", hotline: "0367.535.688", email: "sales@newstartour.vn" },
  typography: { body_font: "Be Vietnam Pro", heading_font: "Be Vietnam Pro" },
  theme: { primary: "#b5813f", primary_dark: "#8f642c", primary_light: "#e6cb9e", body_background: "#fbf9f6", body_text: "#22252a", header_background: "#fbf9f6", menu_text: "#22252a", footer_background: "#1e2229", footer_text: "#ffffff", section_background: "#f5efe4" },
  hero: { kicker: "New Star Tour", primary_label: "Xem tour nổi bật", primary_url: "/#featured-tours", secondary_label: "Liên hệ ngay", secondary_url: "/contact" },
  ticker: { enabled: false, background: "#8f642c", color: "#ffffff", speed_seconds: 28, items: [] },
  footer: { description: "Đồng hành cùng bạn trên mọi hành trình.", quick_links: [], external_links: [] },
  payment: { online_enabled: false },
  globe: { destinations: [
    { key: "ha-long", name: "Vịnh Hạ Long", country: "Việt Nam", eyebrow: "Kỳ quan thiên nhiên", lat: 20.95045, lng: 107.07336 },
    { key: "da-nang", name: "Đà Nẵng", country: "Việt Nam", eyebrow: "Thành phố đáng sống", lat: 16.06778, lng: 108.22083 },
    { key: "phu-quoc", name: "Phú Quốc", country: "Việt Nam", eyebrow: "Đảo ngọc phương Nam", lat: 10.28715, lng: 104.01047 },
    { key: "tokyo", name: "Tokyo", country: "Nhật Bản", eyebrow: "Nhịp sống Á Đông", lat: 35.6895, lng: 139.6917 },
    { key: "paris", name: "Paris", country: "Pháp", eyebrow: "Kinh đô ánh sáng", lat: 48.8566, lng: 2.3522 },
  ] },
};

const linksToText = (links?: CmsLink[]) => (links || []).map((item) => `${item.label}|${item.url}`).join("\n");
const textToLinks = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [label, ...url] = line.split("|"); return { label: label.trim(), url: url.join("|").trim() || "#" };
});

export default function SiteConfigPage() {
  const [data, setData] = useState<CmsConfig>(defaults);
  const [tickerText, setTickerText] = useState("");
  const [quickText, setQuickText] = useState("");
  const [externalText, setExternalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/settings/cms_site_config").then((res) => res.ok ? res.json() : null).then((result) => {
      if (!result?.value) return;
      const value = (typeof result.value === "string" ? JSON.parse(result.value) : result.value) as CmsConfig;
      setData({ ...defaults, ...value, identity: { ...defaults.identity, ...value.identity }, typography: { ...defaults.typography, ...value.typography }, theme: { ...defaults.theme, ...value.theme }, hero: { ...defaults.hero, ...value.hero }, ticker: { ...defaults.ticker, ...value.ticker }, footer: { ...defaults.footer, ...value.footer }, payment: { ...defaults.payment, ...value.payment }, globe: { ...defaults.globe, ...value.globe } });
      setTickerText(linksToText(value.ticker?.items)); setQuickText(linksToText(value.footer?.quick_links)); setExternalText(linksToText(value.footer?.external_links));
    }).finally(() => setLoading(false));
  }, []);

  const section = <K extends keyof CmsConfig>(key: K, values: Partial<NonNullable<CmsConfig[K]>>) => setData((old) => ({ ...old, [key]: { ...old[key], ...values } }));
  const globeDestinations = data.globe?.destinations || [];
  const updateGlobeDestination = (index: number, patch: Partial<CmsGlobeDestination>) => section("globe", {
    destinations: globeDestinations.map((destination, itemIndex) => itemIndex === index ? { ...destination, ...patch } : destination),
  });
  const addGlobeDestination = () => section("globe", { destinations: [...globeDestinations, { key: `destination-${Date.now()}`, name: "Điểm đến mới", country: "", eyebrow: "Điểm đến nổi bật", lat: 0, lng: 0 }] });
  const removeGlobeDestination = (index: number) => section("globe", { destinations: globeDestinations.filter((_, itemIndex) => itemIndex !== index) });
  const upload = async (file: File, target: "logo_url" | "footer_logo_url" | "favicon_url") => {
    const token = localStorage.getItem("admin_token"); const body = new FormData(); body.append("file", file);
    const res = await fetch("http://localhost:8000/api/banners/upload-media", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    if (!res.ok) throw new Error("Không thể tải hình ảnh"); const result = await res.json(); section("identity", { [target]: result.url });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    const invalidDestination = globeDestinations.find((destination) => !destination.name.trim() || !destination.key.trim() || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng) || destination.lat < -90 || destination.lat > 90 || destination.lng < -180 || destination.lng > 180);
    if (invalidDestination) {
      setSaving(false); setMessage("Điểm Globe chưa hợp lệ: kiểm tra tên, mã điểm, vĩ độ (-90 đến 90) và kinh độ (-180 đến 180)."); return;
    }
    const duplicateKey = globeDestinations.some((destination, index) => globeDestinations.findIndex((item) => item.key.trim().toLowerCase() === destination.key.trim().toLowerCase()) !== index);
    if (duplicateKey) { setSaving(false); setMessage("Mã điểm Globe không được trùng nhau."); return; }
    const payload: CmsConfig = { ...data, globe: { destinations: globeDestinations.map((destination) => ({ ...destination, key: destination.key.trim(), name: destination.name.trim(), country: destination.country.trim(), eyebrow: destination.eyebrow.trim(), lat: Number(destination.lat), lng: Number(destination.lng) })) }, ticker: { ...data.ticker, items: textToLinks(tickerText) }, footer: { ...data.footer, quick_links: textToLinks(quickText), external_links: textToLinks(externalText) } };
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:8000/api/settings/cms_site_config/json", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Không thể lưu. Chức năng này yêu cầu quyền Super Admin."); setData(payload); setMessage("Đã lưu cấu hình CMS website.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra"); } finally { setSaving(false); }
  };
  if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;
  const identity = data.identity || {}; const theme = data.theme || {}; const typography = data.typography || {}; const hero = data.hero || {}; const ticker = data.ticker || {}; const footer = data.footer || {}; const payment = data.payment || {};
  return <div className="admin-panel" style={{ maxWidth: 980, margin: "0 auto" }}>
    <div className="admin-panel-header"><h3>🧩 CMS Website</h3></div>
    {message && <div className="auth-message success">{message}</div>}
    <form onSubmit={save} className="auth-form">
      <h4>Nhận diện website</h4>
      <div className="cms-form-grid"><label>Tên website<input value={identity.site_name || ""} onChange={(e) => section("identity", { site_name: e.target.value })} /></label><label>Hotline<input value={identity.hotline || ""} onChange={(e) => section("identity", { hotline: e.target.value })} /></label><label>Email<input type="email" value={identity.email || ""} onChange={(e) => section("identity", { email: e.target.value })} /></label><label>Địa chỉ<input value={identity.address || ""} onChange={(e) => section("identity", { address: e.target.value })} /></label></div>
      <div className="cms-form-grid">{(["logo_url", "footer_logo_url", "favicon_url"] as const).map((key) => <label key={key}>{key === "logo_url" ? "Logo header" : key === "footer_logo_url" ? "Logo footer" : "Favicon"}<input value={identity[key] || ""} onChange={(e) => section("identity", { [key]: e.target.value })} /><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], key)} /></label>)}</div>
      <section className="cms-font-settings">
        <div className="cms-section-heading">
          <div><h4>Font chữ toàn website</h4><p>Chọn font hỗ trợ đầy đủ dấu tiếng Việt. Thay đổi được xem trước ngay bên dưới trước khi lưu.</p></div>
          <span className="cms-font-badge">Hỗ trợ tiếng Việt</span>
        </div>
        <div className="cms-form-grid">
          <label className="cms-font-field"><span className="cms-field-label"><b>Aa</b> Font nội dung</span>
            <div className="cms-select-wrap">
              <select aria-label="Chọn font nội dung" value={typography.body_font || "Be Vietnam Pro"} onChange={(e) => section("typography", { body_font: e.target.value })} style={{ fontFamily: getFontFamily(typography.body_font) }}>
                {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
              <span className="cms-select-chevron" aria-hidden="true">⌄</span>
            </div>
            <small>{FONT_OPTIONS.find((font) => font.value === typography.body_font)?.description || "Font tối ưu để nội dung tiếng Việt dễ đọc."}</small>
          </label>
          <label className="cms-font-field"><span className="cms-field-label"><b>H1</b> Font tiêu đề</span>
            <div className="cms-select-wrap">
              <select aria-label="Chọn font tiêu đề" value={typography.heading_font || "Be Vietnam Pro"} onChange={(e) => section("typography", { heading_font: e.target.value })} style={{ fontFamily: getFontFamily(typography.heading_font) }}>
                {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
              <span className="cms-select-chevron" aria-hidden="true">⌄</span>
            </div>
            <small>{FONT_OPTIONS.find((font) => font.value === typography.heading_font)?.description || "Font rõ nét cho tiêu đề tiếng Việt."}</small>
          </label>
        </div>
        <div className="cms-font-preview" style={{ fontFamily: getFontFamily(typography.body_font) }}>
          <div className="cms-font-preview-label">Xem trước trên website</div>
          <h2 style={{ fontFamily: getFontFamily(typography.heading_font || typography.body_font) }}>Khám phá vẻ đẹp Việt Nam</h2>
          <p>Hành trình đáng nhớ qua Hà Nội, Đà Nẵng, Huế và Thành phố Hồ Chí Minh.</p>
          <div className="cms-font-preview-samples">
            <span>Chữ thường 400</span><strong>Chữ đậm 700</strong><span>0123456789 — 3.500.000 VNĐ</span>
          </div>
          <p className="cms-vietnamese-test">ă â ê ô ơ ư đ · Á À Ả Ã Ạ · Ắ Ằ Ẳ Ẵ Ặ · Ế Ề Ể Ễ Ệ · Ứ Ừ Ử Ữ Ự</p>
        </div>
      </section>
      <h4>Màu giao diện</h4><div className="cms-color-grid">{Object.entries(theme).map(([key, value]) => <label key={key}>{key.replaceAll("_", " ")}<span><input type="color" value={value || "#ffffff"} onChange={(e) => section("theme", { [key]: e.target.value })} /><input value={value || ""} onChange={(e) => section("theme", { [key]: e.target.value })} /></span></label>)}</div>
      <h4>Hero</h4><div className="cms-form-grid"><label>Kicker<input value={hero.kicker || ""} onChange={(e) => section("hero", { kicker: e.target.value })} /></label><label>Nút chính<input value={hero.primary_label || ""} onChange={(e) => section("hero", { primary_label: e.target.value })} /></label><label>URL nút chính<input value={hero.primary_url || ""} onChange={(e) => section("hero", { primary_url: e.target.value })} /></label><label>Nút phụ<input value={hero.secondary_label || ""} onChange={(e) => section("hero", { secondary_label: e.target.value })} /></label><label>URL nút phụ<input value={hero.secondary_url || ""} onChange={(e) => section("hero", { secondary_url: e.target.value })} /></label></div>
      <section className="cms-globe-settings">
        <div className="cms-section-heading"><div><h4>Điểm đến trên Globe 3D</h4><p>Marker được đặt chính xác từ vĩ độ và kinh độ WGS84. Không chỉnh vị trí bằng mắt.</p></div><button type="button" className="admin-btn-secondary" onClick={addGlobeDestination}>+ Thêm điểm</button></div>
        <div className="cms-globe-settings__note">Vĩ độ: -90 đến 90 · Kinh độ: -180 đến 180 · Mỗi mã điểm phải là duy nhất. Dùng Decimal coordinates (WGS84) từ nguồn xác minh như Geodatos, không dùng UTM hoặc DMS.</div>
        {globeDestinations.map((destination, index) => <fieldset className="cms-globe-destination" key={`${destination.key}-${index}`}><legend>Điểm {index + 1}</legend><div className="cms-form-grid cms-globe-destination__grid"><label>Mã điểm<input value={destination.key} onChange={(e) => updateGlobeDestination(index, { key: e.target.value })} placeholder="tokyo" /></label><label>Tên hiển thị<input value={destination.name} onChange={(e) => updateGlobeDestination(index, { name: e.target.value })} placeholder="Tokyo" /></label><label>Quốc gia<input value={destination.country} onChange={(e) => updateGlobeDestination(index, { country: e.target.value })} placeholder="Nhật Bản" /></label><label>Nhãn mô tả<input value={destination.eyebrow} onChange={(e) => updateGlobeDestination(index, { eyebrow: e.target.value })} placeholder="Nhịp sống Á Đông" /></label><label>Vĩ độ (Latitude)<input type="number" min="-90" max="90" step="0.000001" value={destination.lat} onChange={(e) => updateGlobeDestination(index, { lat: Number(e.target.value) })} /></label><label>Kinh độ (Longitude)<input type="number" min="-180" max="180" step="0.000001" value={destination.lng} onChange={(e) => updateGlobeDestination(index, { lng: Number(e.target.value) })} /></label></div><button type="button" className="cms-globe-destination__remove" onClick={() => removeGlobeDestination(index)} disabled={globeDestinations.length <= 1}>Xóa điểm này</button></fieldset>)}
      </section>
      <h4>Ticker thông báo</h4><label className="cms-check"><input type="checkbox" checked={ticker.enabled || false} onChange={(e) => section("ticker", { enabled: e.target.checked })} /> Bật ticker</label><div className="cms-form-grid"><label>Màu nền<input type="color" value={ticker.background} onChange={(e) => section("ticker", { background: e.target.value })} /></label><label>Màu chữ<input type="color" value={ticker.color} onChange={(e) => section("ticker", { color: e.target.value })} /></label><label>Tốc độ (giây)<input type="number" min="8" value={ticker.speed_seconds} onChange={(e) => section("ticker", { speed_seconds: Number(e.target.value) })} /></label></div><label>Mỗi dòng: Nội dung|URL<textarea rows={5} value={tickerText} onChange={(e) => setTickerText(e.target.value)} placeholder={"Khuyến mãi mùa hè|/tours\nHotline tư vấn|/contact"} /></label>
      <h4>Thanh toán tour</h4>
      <div style={{ padding: "1rem 1.1rem", border: "1px solid var(--public-border, #dbe3ee)", borderRadius: 12, background: payment.online_enabled ? "var(--public-success-surface, #ecfdf5)" : "var(--public-surface-soft, #f8fafc)", marginBottom: "1.5rem" }}>
        <label className="cms-check" style={{ marginBottom: 8 }}><input type="checkbox" checked={payment.online_enabled || false} onChange={(e) => section("payment", { online_enabled: e.target.checked })} /> Bật thanh toán online qua QR</label>
        <div style={{ color: "var(--public-muted, #64748b)", fontSize: ".9rem", lineHeight: 1.5 }}>{payment.online_enabled ? "Khách có đơn đã được xác nhận sẽ thấy nút thanh toán và có thể tạo mã QR." : "Khách chỉ thấy hướng dẫn liên hệ; nhân viên xác nhận và cập nhật trạng thái thanh toán thủ công."}</div>
      </div>
      <h4>Footer và liên kết</h4><label>Mô tả footer<textarea value={footer.description || ""} onChange={(e) => section("footer", { description: e.target.value })} /></label><label>Copyright<input value={footer.copyright || ""} onChange={(e) => section("footer", { copyright: e.target.value })} /></label><div className="cms-form-grid"><label>Liên kết nhanh — Nhãn|URL<textarea rows={6} value={quickText} onChange={(e) => setQuickText(e.target.value)} /></label><label>Website ngoài — Nhãn|URL<textarea rows={6} value={externalText} onChange={(e) => setExternalText(e.target.value)} /></label></div>
      <button className="admin-btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu toàn bộ cấu hình CMS"}</button>
    </form>
  </div>;
}
