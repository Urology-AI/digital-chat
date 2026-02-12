/**
 * Chat API service - session-based with history.
 */
import { buildApiUrl, buildMediaUrl } from "./api";

export interface Message {
  role: "user" | "assistant";
  content: string;
  audio_url?: string;
}

export interface ChatResponse {
  response: string;
  message?: string;
  session_id: string;
  audio_url?: string;
  voice_used?: boolean;
}

export interface SpeechResponse {
  session_id: string;
  audio_url?: string;
  voice_used?: boolean;
  error?: string;
}

export interface HistoryResponse {
  session_id: string;
  messages: Message[];
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
  }
  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error(`Expected JSON response, got: ${bodyText.slice(0, 120)}`);
  }
}

export async function createSession(): Promise<string> {
  const res = await fetch(buildApiUrl("/api/chat/sessions"), { method: "POST" });
  const data = await parseJsonResponse<{ session_id: string }>(res);
  return data.session_id;
}

export async function getHistory(sessionId: string): Promise<HistoryResponse> {
  const res = await fetch(
    buildApiUrl(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`)
  );
  const data = await parseJsonResponse<HistoryResponse>(res);
  return {
    ...data,
    messages: (data.messages || []).map((m: Message) => ({
      ...m,
      audio_url: buildMediaUrl(m.audio_url),
    })),
  };
}

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const res = await fetch(buildApiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  });
  const data = await parseJsonResponse<ChatResponse>(res);
  return { ...data, audio_url: buildMediaUrl(data.audio_url) };
}

export async function sendSpeech(
  text: string,
  sessionId?: string
): Promise<SpeechResponse> {
  const res = await fetch(buildApiUrl("/api/speech"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, session_id: sessionId ?? null }),
  });
  const data = await parseJsonResponse<SpeechResponse>(res);
  return { ...data, audio_url: buildMediaUrl(data.audio_url) };
}
