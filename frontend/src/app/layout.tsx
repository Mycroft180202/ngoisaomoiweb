import "@/utils/patchFetch";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter, Lora, Noto_Sans, Open_Sans, Roboto } from "next/font/google";
import SiteShell from "@/components/layout/SiteShell";
import "./globals.css";
import "./v2.css";
import AppDialogProvider from "@/components/ui/AppDialogProvider";

async function getInitialUiVersion(): Promise<"legacy" | "v2"> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    // Render the selected public shell on the server without making every route fully dynamic.
    // The client still revalidates immediately; this cache only protects first-render performance.
    const response = await fetch(`${apiBase}/api/settings/public/site-config`, { next: { revalidate: 10 } });
    if (!response.ok) return "legacy";
    const settings = await response.json() as Record<string, unknown>;
    const rawSetting = settings.cms_ui_version;
    const setting = typeof rawSetting === "string" ? JSON.parse(rawSetting) : rawSetting;
    return setting && typeof setting === "object" && (setting as { active_version?: unknown }).active_version === "v2"
      ? "v2"
      : "legacy";
  } catch {
    return "legacy";
  }
}


const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter-loaded",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-noto-sans",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  variable: "--font-roboto",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-open-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "New Star Tour | Du lịch trong nước & quốc tế",
  description: "Trang web New Star Tour với nội dung tour, điểm đến, tin tức và thông tin liên hệ được migrate sang UI mới.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUiVersion = await getInitialUiVersion();
  return (
    <html lang="vi" className={`${inter.variable} ${beVietnamPro.variable} ${notoSans.variable} ${roboto.variable} ${openSans.variable} ${lora.variable}`}>
      <body>
        <SiteShell initialUiVersion={initialUiVersion}>
        <AppDialogProvider>{children}</AppDialogProvider>
        </SiteShell>
      </body>
    </html>
  );
}
