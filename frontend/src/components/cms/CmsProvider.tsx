"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFontFamily } from "@/lib/fontCatalog";

export interface CmsLink { label: string; url: string; }
export interface CmsGlobeDestination {
  key: string;
  name: string;
  country: string;
  eyebrow: string;
  lat: number;
  lng: number;
}
export interface CmsConfig {
  identity?: { site_name?: string; logo_url?: string; footer_logo_url?: string; favicon_url?: string; hotline?: string; email?: string; address?: string; };
  typography?: { body_font?: string; heading_font?: string; };
  theme?: { primary?: string; primary_dark?: string; primary_light?: string; body_background?: string; body_text?: string; header_background?: string; menu_text?: string; footer_background?: string; footer_text?: string; section_background?: string; };
  hero?: { kicker?: string; primary_label?: string; primary_url?: string; secondary_label?: string; secondary_url?: string; };
  ticker?: { enabled?: boolean; background?: string; color?: string; speed_seconds?: number; items?: CmsLink[]; };
  footer?: { description?: string; copyright?: string; quick_links?: CmsLink[]; external_links?: CmsLink[]; };
  payment?: { online_enabled?: boolean; };
  globe?: { destinations?: CmsGlobeDestination[]; };
}

export interface CmsMenu { id?: number; label: string; href: string; }
interface CmsContextValue { config: CmsConfig; menus: CmsMenu[]; loading: boolean; }

const CmsContext = createContext<CmsContextValue>({ config: {}, menus: [], loading: true });

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CmsConfig>({});
  const [menus, setMenus] = useState<CmsMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    Promise.all([
      fetch(`${apiBase}/api/settings/public/site-config`).then((res) => res.ok ? res.json() : {}),
      fetch(`${apiBase}/api/menus/flat`).then((res) => res.ok ? res.json() : []),
    ]).then(([settings, menuData]) => {
      const publicSettings = settings as Record<string, unknown>;
      const siteConfig = publicSettings.cms_site_config as CmsConfig | undefined;
      const general = publicSettings.config_general as CmsConfig["identity"] | undefined;
      const branding = publicSettings.cms_branding as { accent_color?: string; accent_dark?: string; accent_light?: string } | undefined;
      const merged: CmsConfig = siteConfig || {};
      merged.identity = { ...(general || {}), ...(merged.identity || {}) };
      merged.theme = { primary: branding?.accent_color, primary_dark: branding?.accent_dark, primary_light: branding?.accent_light, ...(merged.theme || {}) };
      setConfig(merged);
      if (Array.isArray(menuData)) setMenus(menuData.filter((item) => item.is_active && !item.parent_id).sort((a, b) => a.order_index - b.order_index).map((item) => ({ id: item.id, label: item.title, href: item.url })));
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = config.theme;
    const vars: Record<string, string | undefined> = {
      "--accent": theme?.primary, "--accent-dark": theme?.primary_dark, "--accent-light": theme?.primary_light,
      "--background": theme?.body_background, "--foreground": theme?.body_text,
      "--header-background": theme?.header_background, "--menu-text": theme?.menu_text,
      "--footer-background": theme?.footer_background, "--footer-text": theme?.footer_text,
      "--section-background": theme?.section_background,
      "--font-inter": getFontFamily(config.typography?.body_font),
      "--font-outfit": getFontFamily(config.typography?.heading_font || config.typography?.body_font),
    };
    Object.entries(vars).forEach(([key, value]) => value && root.style.setProperty(key, value));
    if (config.identity?.favicon_url) {
      let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
      icon.href = config.identity.favicon_url;
    }
  }, [config]);

  const value = useMemo(() => ({ config, menus, loading }), [config, menus, loading]);
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export const useCms = () => useContext(CmsContext);
