"use client";

import dynamic from "next/dynamic";
import HomeClient from "./HomeClient";
import { useSiteUiVersion } from "@/contexts/SiteUiVersionContext";

const DesktopV2Home = dynamic(
  () => import("@/components/v2/desktop/DesktopV2Home"),
  { ssr: false, loading: () => <V2LoadingScreen /> },
);

const TouchV2Home = dynamic(
  () => import("@/components/v2/touch/TouchV2Home"),
  { ssr: false, loading: () => <V2LoadingScreen compact /> },
);

function V2LoadingScreen({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`v2-home-loader${compact ? " is-compact" : ""}`} aria-live="polite">
      <span className="v2-home-loader__orbit" aria-hidden="true" />
      <strong>Đang mở hành trình mới</strong>
      <small>New Star Tour đang chuẩn bị trải nghiệm cho bạn…</small>
    </main>
  );
}

export default function VersionedHome() {
  const { uiVersion, viewportMode } = useSiteUiVersion();

  if (uiVersion !== "v2") return <HomeClient />;
  return viewportMode === "touch" ? <TouchV2Home /> : <DesktopV2Home />;
}
