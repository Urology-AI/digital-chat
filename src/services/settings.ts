/**
 * Settings API - master prompts and model config.
 */
import { buildApiUrl } from "./api";

export interface Settings {
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  preset: string;
  voice?: {
    enabled: boolean;
    speaker_id: string;
    language: string;
    auto_play: boolean;
  };
}

export interface PresetsResponse {
  presets: Record<string, string>;
}

export interface SettingsUpdate {
  system_prompt?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  preset?: string;
  voice?: {
    enabled?: boolean;
    speaker_id?: string;
    language?: string;
    auto_play?: boolean;
  };
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

export async function getSettings(): Promise<Settings> {
  const res = await fetch(buildApiUrl("/api/settings"));
  return parseJsonResponse<Settings>(res);
}

export async function updateSettings(update: SettingsUpdate): Promise<Settings> {
  const res = await fetch(buildApiUrl("/api/settings"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return parseJsonResponse<Settings>(res);
}

export async function getPresets(): Promise<PresetsResponse> {
  const res = await fetch(buildApiUrl("/api/prompts/presets"));
  return parseJsonResponse<PresetsResponse>(res);
}
