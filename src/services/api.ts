const HARDCODED_RENDER_BACKEND = "https://digital-chat.onrender.com";
const STORAGE_KEY_API_BASE = "app_api_base_url";
const STORAGE_KEY_SPEECH_API_BASE = "app_speech_api_base_url";

/**
 * Get API base URL from localStorage (runtime config) or environment variable (build-time config)
 */
function getApiBaseUrl(): string {
  // Check localStorage first (runtime config from Settings UI)
  const stored = localStorage.getItem(STORAGE_KEY_API_BASE);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, "");
  }
  // Fall back to environment variable
  const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (rawApiBase) {
    return rawApiBase.replace(/\/+$/, "");
  }
  // Fall back to hardcoded for production
  return import.meta.env.PROD ? HARDCODED_RENDER_BACKEND : "";
}

/**
 * Get Speech API base URL from localStorage or environment variable
 */
function getSpeechApiBaseUrl(): string {
  // Check localStorage first (runtime config from Settings UI)
  const stored = localStorage.getItem(STORAGE_KEY_SPEECH_API_BASE);
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, "");
  }
  // Fall back to environment variable
  const rawSpeechApiBase = (import.meta.env.VITE_SPEECH_API_BASE_URL || "").trim();
  if (rawSpeechApiBase) {
    return rawSpeechApiBase.replace(/\/+$/, "");
  }
  // Fall back to main API URL
  return getApiBaseUrl();
}

// Export functions to get current URLs (for Settings UI)
export function getCurrentApiBaseUrl(): string {
  return getApiBaseUrl();
}

export function getCurrentSpeechApiBaseUrl(): string {
  return getSpeechApiBaseUrl();
}

// Export functions to update URLs (for Settings UI)
export function setApiBaseUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_API_BASE, url.trim().replace(/\/+$/, ""));
  } else {
    localStorage.removeItem(STORAGE_KEY_API_BASE);
  }
}

export function setSpeechApiBaseUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_SPEECH_API_BASE, url.trim().replace(/\/+$/, ""));
  } else {
    localStorage.removeItem(STORAGE_KEY_SPEECH_API_BASE);
  }
}

// Note: These are computed at module load time, but functions above read from localStorage dynamically

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

