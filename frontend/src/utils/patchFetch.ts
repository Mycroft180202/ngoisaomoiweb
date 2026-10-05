if (typeof globalThis !== "undefined" && !(globalThis as any).__fetchPatched) {
  (globalThis as any).__fetchPatched = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let targetInput = input;
    if (typeof targetInput === "string") {
      if (targetInput.includes("http://localhost:8000")) {
        targetInput = targetInput.replace("http://localhost:8000", apiBase);
      }
    } else if (targetInput instanceof URL) {
      const urlStr = targetInput.toString();
      if (urlStr.includes("http://localhost:8000")) {
        targetInput = new URL(urlStr.replace("http://localhost:8000", apiBase));
      }
    } else if (targetInput && typeof targetInput === "object" && "url" in targetInput) {
      const urlStr = (targetInput as any).url;
      if (typeof urlStr === "string" && urlStr.includes("http://localhost:8000")) {
        try {
          const newUrl = urlStr.replace("http://localhost:8000", apiBase);
          targetInput = new Request(newUrl, targetInput as Request);
        } catch (e) {
          // Fallback if failed to construct Request
        }
      }
    }
    return originalFetch(targetInput, init);
  };
}
