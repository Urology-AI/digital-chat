const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE_URL = rawApiBase.replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function buildMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`;
  return url;
}

