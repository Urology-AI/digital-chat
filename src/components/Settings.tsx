import { useState, useEffect } from "react";
import {
  getSettings,
  updateSettings,
  getPresets,
  type Settings,
  type PresetsResponse,
} from "../services/settings";
import {
  getCurrentSpeechApiBaseUrl,
  setSpeechApiBaseUrl,
} from "../services/api";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (settings: Settings) => void;
}

const PRESET_LABELS: Record<string, string> = {
  default: "Default (Dr Tewari)",
  concise: "Concise",
  empathetic: "Empathetic",
  educational: "Educational",
};

const DEFAULT_VOICE = {
  enabled: false,
  speaker_id: "dr_tewari",
  language: "en",
  auto_play: true,
};

function withVoiceDefaults(settings: Settings): Settings {
  return {
    ...settings,
    voice: {
      ...DEFAULT_VOICE,
      ...(settings.voice ?? {}),
    },
  };
}

export function Settings({ isOpen, onClose, onUpdated }: SettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [presets, setPresets] = useState<PresetsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [speechApiBaseUrl, setSpeechApiBaseUrlState] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      getSettings()
        .then((s) => setSettings(withVoiceDefaults(s)))
        .catch(() => setSettings(null));
      getPresets().then(setPresets).catch(() => setPresets(null));
      setSpeechApiBaseUrlState(getCurrentSpeechApiBaseUrl());
    }
  }, [isOpen]);

  const handlePresetChange = async (preset: string) => {
    if (!preset) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSettings({ preset });
      const next = withVoiceDefaults(updated);
      setSettings(next);
      onUpdated?.(next);
      setMessage("Preset applied.");
    } catch {
      setMessage("Failed to apply preset.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    // Save speech API URL so generate-speech requests use it after reload
    setSpeechApiBaseUrl(speechApiBaseUrl);

    try {
      // Then try to save backend settings (uses current API URL until reload)
      const updated = await updateSettings({
        system_prompt: settings.system_prompt,
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        voice: settings.voice,
      });
      const next = withVoiceDefaults(updated);
      setSettings(next);
      onUpdated?.(next);
      setMessage("Settings saved. Reloading to apply speech API…");
    } catch {
      setMessage("Speech API URL saved. Backend settings could not be updated. Reloading…");
    }

    setSaving(false);
    // Always reload so new API URLs from localStorage take effect
    setTimeout(() => window.location.reload(), 800);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f0f1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Settings & Master Prompts</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset selector */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Quick presets (apply to master prompt)
            </label>
            <select
              value={settings?.preset ?? "default"}
              onChange={(e) => handlePresetChange(e.target.value)}
              disabled={saving}
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
            >
              {presets &&
                Object.keys(presets.presets).map((key) => (
                  <option key={key} value={key} className="bg-[#0f0f1a] text-white">
                    {PRESET_LABELS[key] ?? key}
                  </option>
                ))}
            </select>
          </div>

          {/* Master prompt */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Master prompt (system prompt for the model)
            </label>
            <textarea
              value={settings?.system_prompt ?? ""}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, system_prompt: e.target.value } : null))
              }
              rows={10}
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white font-mono text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
              placeholder="System prompt that instructs the model how to respond..."
            />
            <p className="mt-1 text-xs text-white/50">
              This prompt trains the model&apos;s behavior. Edit to customize tone, scope, and knowledge.
            </p>
          </div>

          {/* Model & params */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Model</label>
              <input
                type="text"
                value={settings?.model ?? ""}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, model: e.target.value } : null))
                }
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
                placeholder="llama3.2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Temperature (0–1)
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={settings?.temperature ?? 0.7}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, temperature: parseFloat(e.target.value) || 0.7 } : null
                  )
                }
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Max tokens</label>
              <input
                type="number"
                min={100}
                max={2000}
                value={settings?.max_tokens ?? 500}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, max_tokens: parseInt(e.target.value, 10) || 500 } : null
                  )
                }
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
              />
            </div>
          </div>

          {/* Speech API (generate speech / TTS only) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <h3 className="text-sm font-medium text-white/90">Speech API (generate speech)</h3>
            <p className="text-xs text-white/50">
              URL of the server used for text-to-speech. Chat and settings always use the main API.
            </p>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Speech API Base URL
              </label>
              <input
                type="text"
                value={speechApiBaseUrl}
                onChange={(e) => setSpeechApiBaseUrlState(e.target.value)}
                placeholder="Leave empty to use main API for speech too"
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
              />
              <p className="mt-1 text-xs text-white/50">
                Only /api/speech and generated audio use this. Save and reload to apply.
              </p>
            </div>
          </div>

          {/* Voice */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
            <h3 className="text-sm font-medium text-white/90">Voice</h3>

            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={settings?.voice?.enabled ?? false}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          voice: {
                            ...DEFAULT_VOICE,
                            ...(s.voice ?? {}),
                            enabled: e.target.checked,
                          },
                        }
                      : null
                  )
                }
                className="h-4 w-4 rounded border-white/30 bg-white/10 text-sinai-400 focus:ring-sinai-400/50"
              />
              Enable voice response
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Speaker</label>
                <select
                  value={settings?.voice?.speaker_id ?? "dr_tewari"}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            voice: {
                              ...DEFAULT_VOICE,
                              ...(s.voice ?? {}),
                              speaker_id: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
                >
                  <option value="dr_tewari" className="bg-[#0f0f1a] text-white">
                    Dr Ash Tewari
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Language</label>
                <select
                  value={settings?.voice?.language ?? "en"}
                  onChange={(e) =>
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            voice: {
                              ...DEFAULT_VOICE,
                              ...(s.voice ?? {}),
                              language: e.target.value,
                            },
                          }
                        : null
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50"
                >
                  <option value="en" className="bg-[#0f0f1a] text-white">
                    English
                  </option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-white/80">
              <input
                type="checkbox"
                checked={settings?.voice?.auto_play ?? true}
                onChange={(e) =>
                  setSettings((s) =>
                    s
                      ? {
                          ...s,
                          voice: {
                            ...DEFAULT_VOICE,
                            ...(s.voice ?? {}),
                            auto_play: e.target.checked,
                          },
                        }
                      : null
                  )
                }
                className="h-4 w-4 rounded border-white/30 bg-white/10 text-sinai-400 focus:ring-sinai-400/50"
              />
              Auto-play voice response
            </label>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.includes("Failed") ? "text-red-400" : "text-sinai-300"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-sinai-400 text-white font-medium hover:bg-sinai-300 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
