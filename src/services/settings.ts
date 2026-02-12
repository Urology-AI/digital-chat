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

export async function getSettings(): Promise<Settings> {
  const res = await fetch(buildApiUrl("/api/settings"));
  return res.json();
}

export async function updateSettings(update: SettingsUpdate): Promise<Settings> {
  const res = await fetch(buildApiUrl("/api/settings"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return res.json();
}

export async function getPresets(): Promise<PresetsResponse> {
  const res = await fetch(buildApiUrl("/api/prompts/presets"));
  return res.json();
}
