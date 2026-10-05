/**
 * Converts a Google Drive share or export URL into a cookieless, CORS-friendly direct thumbnail URL.
 * Bypasses Chrome third-party cookie blocking.
 *
 * @param url The original Google Drive URL
 * @param size The requested image width (default 1000px)
 */
export function getDriveThumbnailUrl(url: string, size: number = 1000): string {
  if (!url) return "";
  
  // Convert standard /uc?export=view&id=... links
  if (url.includes("drive.google.com/uc?export=view") || url.includes("drive.google.com/uc?id=")) {
    const params = new URL(url).searchParams;
    const id = params.get("id");
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
    }
  }
  
  // Convert standard sharing links (/file/d/FILE_ID/view)
  if (url.includes("drive.google.com/file/d/")) {
    const parts = url.split("/file/d/");
    if (parts.length > 1) {
      const id = parts[1].split("/")[0];
      return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
    }
  }
  
  return url;
}
