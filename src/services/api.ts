const HARDCODED_RENDER_BACKEND = "https://digital-chat.onrender.com";
const STORAGE_KEY_SPEECH_API_BASE = "app_speech_api_base_url";

/**
 * Main API base URL - from env/build only (not user-configurable).
 */
function getApiBaseUrl(): string {
  const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (rawApiBase) {
    return rawApiBase.replace(/\/+$/, "");
  }
  return import.meta.env.PROD ? HARDCODED_RENDER_BACKEND : "";
}

/**
 * Speech API base URL - user-configurable in Settings; used only for /api/speech and generated audio.
 */
function getSpeechApiBaseUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_SPEECH_API_BASE);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, "");
  }
  const rawSpeechApiBase = (import.meta.env.VITE_SPEECH_API_BASE_URL || "").trim();
  if (rawSpeechApiBase) {
    return rawSpeechApiBase.replace(/\/+$/, "");
  }
  return getApiBaseUrl();
}

export function getCurrentSpeechApiBaseUrl(): string {
  return getSpeechApiBaseUrl();
}

export function setSpeechApiBaseUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_SPEECH_API_BASE, url.trim().replace(/\/+$/, ""));
  } else {
    localStorage.removeItem(STORAGE_KEY_SPEECH_API_BASE);
  }
}

export function buildApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export function buildSpeechApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`Speech API path must start with '/': ${path}`);
  }
  const base = getSpeechApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export function buildMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Use speech server for media URLs if it's different from main API
  const speechBase = getSpeechApiBaseUrl();
  const apiBase = getApiBaseUrl();
  const mediaBase = speechBase !== apiBase ? speechBase : apiBase;
  if (url.startsWith("/") && mediaBase) return `${mediaBase}${url}`;
  return url;
}

