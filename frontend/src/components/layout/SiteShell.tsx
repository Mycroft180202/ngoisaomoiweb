"use client";

import "@/utils/patchFetch";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MaintenanceScreen, { MaintenanceConfig } from "./MaintenanceScreen";
import { CmsProvider } from "../cms/CmsProvider";
import LegacySiteFrame from "./versions/LegacySiteFrame";
import DesktopSiteFrame from "./versions/DesktopSiteFrame";
import TouchSiteFrame from "./versions/TouchSiteFrame";
import {
  SiteUiVersionProvider,
  type SiteUiVersion,
  type SiteViewportMode,
} from "@/contexts/SiteUiVersionContext";

const normalizeUiVersion = (value: unknown): SiteUiVersion => value === "v2" ? "v2" : "legacy";
const getViewportMode = (): SiteViewportMode => {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 1023px)").matches ? "touch" : "desktop";
};

export default function SiteShell({
  children,
  initialUiVersion = "legacy",
}: {
  children: React.ReactNode;
  initialUiVersion?: SiteUiVersion;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isAuth = pathname === "/login" || pathname === "/admin-login" || pathname === "/register";
  const [maintenance, setMaintenance] = useState<MaintenanceConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [uiVersion, setUiVersion] = useState<SiteUiVersion>(initialUiVersion);
  const [viewportMode, setViewportMode] = useState<SiteViewportMode>(getViewportMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateViewportMode = () => setViewportMode(mediaQuery.matches ? "touch" : "desktop");
    updateViewportMode();
    mediaQuery.addEventListener?.("change", updateViewportMode);
    return () => mediaQuery.removeEventListener?.("change", updateViewportMode);
  }, []);

  useEffect(() => {
    if (isAdmin || isAuth) {
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    Promise.all([
      fetch(`${apiBase}/api/settings/cms_maintenance`, { cache: "no-store" }).then((res) => res.ok ? res.json() : null),
      fetch(`${apiBase}/api/settings/public/site-config`, { cache: "no-store" }).then((res) => res.ok ? res.json() : {}),
    ])
      .then(([maintenanceData, publicSettings]) => {
        const value = maintenanceData?.value;
        if (typeof value === "string") {
          try { setMaintenance(JSON.parse(value)); } catch { setMaintenance(null); }
        } else setMaintenance(value || null);

        const settingsMap = (publicSettings || {}) as Record<string, unknown>;
        const rawUiSetting = settingsMap.cms_ui_version;
        const uiSetting = typeof rawUiSetting === "string"
          ? (() => { try { return JSON.parse(rawUiSetting); } catch { return {}; } })()
          : rawUiSetting;
        setUiVersion(normalizeUiVersion(uiSetting?.active_version));
      })
      .catch(() => {
        setMaintenance(null);
        setUiVersion("legacy");
      })
      .finally(() => setConfigLoaded(true));
  }, [isAdmin, isAuth]);

  useEffect(() => {
    if (isAdmin || isAuth) return;
    document.documentElement.dataset.siteUiVersion = uiVersion;
    document.documentElement.dataset.siteViewport = viewportMode;
  }, [isAdmin, isAuth, uiVersion, viewportMode]);

  if (isAdmin) {
    return <div className="admin-shell">{children}</div>;
  }

  if (!isAuth && configLoaded && maintenance?.enabled) {
    return <MaintenanceScreen config={maintenance} />;
  }

  if (isAuth) return <>{children}</>;

  const VersionedFrame = uiVersion === "v2"
    ? (viewportMode === "touch" ? TouchSiteFrame : DesktopSiteFrame)
    : LegacySiteFrame;

  return (
    <SiteUiVersionProvider value={{ uiVersion, viewportMode }}>
      <CmsProvider>
        <VersionedFrame>{children}</VersionedFrame>
      </CmsProvider>
    </SiteUiVersionProvider>
  );
}
