"use client";

import { createContext, useContext } from "react";

export type SiteUiVersion = "legacy" | "v2";
export type SiteViewportMode = "desktop" | "touch";

interface SiteUiVersionContextValue {
  uiVersion: SiteUiVersion;
  viewportMode: SiteViewportMode;
}

const SiteUiVersionContext = createContext<SiteUiVersionContextValue>({
  uiVersion: "legacy",
  viewportMode: "desktop",
});

export function SiteUiVersionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SiteUiVersionContextValue;
}) {
  return <SiteUiVersionContext.Provider value={value}>{children}</SiteUiVersionContext.Provider>;
}

export function useSiteUiVersion() {
  return useContext(SiteUiVersionContext);
}
