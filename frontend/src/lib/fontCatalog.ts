export const FONT_OPTIONS = [
  { value: "Be Vietnam Pro", label: "Be Vietnam Pro", description: "Tối ưu riêng cho tiếng Việt, rõ nét và hiện đại." },
  { value: "Noto Sans", label: "Noto Sans", description: "Dễ đọc, dấu tiếng Việt cân đối trên mọi màn hình." },
  { value: "Inter", label: "Inter", description: "Gọn gàng, phù hợp nội dung và giao diện số." },
  { value: "Roboto", label: "Roboto", description: "Quen thuộc, rõ ràng trên điện thoại và máy tính." },
  { value: "Open Sans", label: "Open Sans", description: "Thoáng chữ, phù hợp các đoạn nội dung dài." },
  { value: "Lora", label: "Lora", description: "Font có chân trang nhã, phù hợp tiêu đề và bài viết." },
] as const;

export type SiteFontName = (typeof FONT_OPTIONS)[number]["value"];

const FONT_VARIABLES: Record<string, string> = {
  "Be Vietnam Pro": "var(--font-be-vietnam-pro)",
  "Noto Sans": "var(--font-noto-sans)",
  Inter: "var(--font-inter-loaded)",
  Roboto: "var(--font-roboto)",
  "Open Sans": "var(--font-open-sans)",
  Lora: "var(--font-lora)",
  // Tương thích cấu hình cũ đã lưu trong CMS.
  Outfit: "var(--font-be-vietnam-pro)",
  Arial: "Arial",
  Tahoma: "Tahoma",
  Georgia: "Georgia",
  "Times New Roman": "'Times New Roman'",
};

export function getFontFamily(fontName?: string, fallback = "Arial, sans-serif") {
  const selected = FONT_VARIABLES[fontName || ""] || FONT_VARIABLES["Be Vietnam Pro"];
  return `${selected}, ${fallback}`;
}
