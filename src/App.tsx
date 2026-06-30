import { useState, useEffect, useCallback, useRef } from "react";
import { TalkingAvatar } from "./components/TalkingAvatar";
import { ChatInput } from "./components/ChatInput";
import { DirectTTS } from "./components/DirectTTS";
import { MessageList } from "./components/MessageList";
import { Settings } from "./components/Settings";
import { LanguageSelector } from "./components/LanguageSelector";
import { useTextToSpeech } from "./hooks/useTextToSpeech";
import { createSession, getHistory, sendMessage, sendSpeech } from "./services/chat";
import { getSettings, type Settings as AppSettings } from "./services/settings";
import { buildApiUrl, buildMediaUrl } from "./services/api";
import { t, TOPIC_CATEGORIES } from "./i18n/index";
import { useLang } from "./i18n/LanguageContext";
import type { ClinicianConfig } from "./config/clinician";
import type { Message } from "./services/chat";

const SESSION_KEY = "chat_session_id";

type AppMode = "chat" | "tts";

// DISCLAIMER is now translated at render time via t(lang, "web.disclaimer")

function resolveAvatarUrl(rawUrl?: string): string {
  const fallback = `${import.meta.env.BASE_URL}drtewari.png`;
  if (!rawUrl) return fallback;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  if (rawUrl.startsWith("/media/")) return buildMediaUrl(rawUrl) ?? fallback;
  if (rawUrl.startsWith("/")) return `${import.meta.env.BASE_URL}${rawUrl.slice(1)}`;
  return `${import.meta.env.BASE_URL}${rawUrl}`;
}

function App() {
  const { lang } = useLang();
  const [mode, setMode] = useState<AppMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<ClinicianConfig | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSGenerating, setIsTTSGenerating] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { speak, isSpeaking } = useTextToSpeech();
  const isAvatarSpeaking = isSpeaking || isAudioPlaying || isTTSGenerating;

  useEffect(() => {
    fetch(buildApiUrl("/api/config"))
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
    getSettings()
      .then(setAppSettings)
      .catch(() => setAppSettings(null));
  }, []);

  const initSession = useCallback(async () => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const data = await getHistory(stored);
        setSessionId(data.session_id);
        setMessages(
          data.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
        return;
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    const sid = await createSession();
    setSessionId(sid);
    sessionStorage.setItem(SESSION_KEY, sid);
    setMessages([]);
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsAudioPlaying(false);
    };
  }, []);

  const playAudioUrl = useCallback((audioUrl: string) => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsAudioPlaying(true);
    audio.onended = () => setIsAudioPlaying(false);
    audio.onerror = () => setIsAudioPlaying(false);
    audio.play().catch(() => setIsAudioPlaying(false));
  }, []);

  const handleSpeakMessage = useCallback(
    (message: Message) => {
      if (message.audio_url) {
        playAudioUrl(message.audio_url);
        return;
      }
      speak(message.content);
    },
    [playAudioUrl, speak]
  );

  const handleAsk = async (question: string) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", content: question.trim() }]);
    setIsLoading(true);
    try {
      const data = await sendMessage(question.trim(), sessionId ?? undefined, lang);
      setSessionId(data.session_id);
      sessionStorage.setItem(SESSION_KEY, data.session_id);
      const response = data.response || data.message || "I'm sorry, I couldn't process that.";
      let audioUrl = data.audio_url;
      const voiceEnabled = appSettings?.voice?.enabled ?? false;
      if (!audioUrl && voiceEnabled) {
        try {
          const speech = await sendSpeech(response, data.session_id);
          audioUrl = speech.audio_url;
        } catch {
          // Keep text-only response if speech endpoint fails.
        }
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        audio_url: audioUrl,
      };
      setMessages((m) => [...m, assistantMessage]);

      const autoPlay = appSettings?.voice?.auto_play ?? true;
      if (audioUrl) {
        if (autoPlay) {
          playAudioUrl(audioUrl);
        }
      } else {
        speak(response);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I'm sorry, I'm having trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsAudioPlaying(false);
    }
    const sid = await createSession();
    setSessionId(sid);
    sessionStorage.setItem(SESSION_KEY, sid);
    setMessages([]);
  };

  const handleDirectTTS = async (text: string) => {
    if (!text.trim()) return;
    setIsTTSGenerating(true);
    try {
      const currentSessionId = sessionId ?? (await createSession());
      if (!sessionId) {
        setSessionId(currentSessionId);
        sessionStorage.setItem(SESSION_KEY, currentSessionId);
      }
      const speech = await sendSpeech(text, currentSessionId);
      if (speech.audio_url) {
        playAudioUrl(speech.audio_url);
      } else {
        // Fallback to browser TTS if backend TTS fails
        speak(text);
      }
    } catch (error) {
      console.error("TTS generation failed:", error);
      // Fallback to browser TTS
      speak(text);
    } finally {
      setIsTTSGenerating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
      {/* Immersive dark gradient background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, rgba(0, 174, 239, 0.15) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 50% 50%, rgba(33, 32, 112, 0.25) 0%, transparent 60%), linear-gradient(180deg, #0a0a1a 0%, #050510 100%)",
        }}
      />

      {/* Subtle grid overlay for depth */}
      <div
        className="fixed inset-0 -z-[9] opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdated={setAppSettings}
      />

      {/* Minimal floating header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium text-white/90">
            {config?.clinician_name ?? "Dr Ash Tewari"}
          </h1>
          <span className="text-xs text-white/50">·</span>
          <span className="text-sm text-white/60">
            {config?.clinician_title ?? "Urologic Surgeon"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setMode("chat")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === "chat"
                  ? "bg-sinai-400 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMode("tts")}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                mode === "tts"
                  ? "bg-sinai-400 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              Direct TTS
            </button>
          </div>
          {mode === "chat" && (
            <button
              onClick={handleNewChat}
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              {t(lang, "web.new_chat")}
            </button>
          )}
          <LanguageSelector />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Avatar-centric immersive layout */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-screen pt-20 pb-40 lg:pb-32">
        {/* Avatar stage - full prominence */}
        <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="relative">
            {/* Spotlight/glow behind avatar */}
            <div
              className={`absolute inset-0 -m-16 rounded-full blur-3xl transition-opacity duration-500 ${
                isSpeaking ? "opacity-50" : "opacity-30"
              }`}
              style={{
                background: "radial-gradient(circle, rgba(0, 174, 239, 0.4) 0%, transparent 70%)",
              }}
            />
            <TalkingAvatar
              imageUrl={resolveAvatarUrl(config?.avatar_image_url)}
              name={config?.clinician_name ?? "Dr Ash Tewari"}
              isSpeaking={isAvatarSpeaking}
            />
          </div>
        </section>

        {/* Floating chat panel - glass morphism */}
        <section className="lg:w-[420px] shrink-0 flex flex-col">
          <div className="lg:fixed lg:right-6 lg:top-24 lg:bottom-24 lg:w-[380px] flex flex-col h-[320px] lg:h-auto lg:max-h-[calc(100vh-12rem)] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            {mode === "chat" ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  {messages.length === 0 && !isLoading ? (
                    <TopicChips lang={lang} onAsk={handleAsk} />
                  ) : (
                    <MessageList
                      messages={messages}
                      isLoading={isLoading}
                      onSpeak={handleSpeakMessage}
                      playVoiceLabel={t(lang, "web.play_voice")}
                      thinkingLabel={t(lang, "web.thinking")}
                    />
                  )}
                </div>
                <div className="p-4 border-t border-white/10 bg-white/5">
                  <ChatInput
                    onAsk={handleAsk}
                    disabled={isLoading}
                    placeholder={t(lang, "chat.input.placeholder")}
                    sendLabel={t(lang, "web.send")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 min-h-0 flex items-center justify-center">
                  <div className="text-center text-white/50 text-sm px-4">
                    <p className="mb-2">
                      <svg className="w-12 h-12 mx-auto mb-3 text-sinai-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </p>
                    <p className="text-white/70 font-medium mb-1">Direct Text-to-Speech</p>
                    <p className="text-white/40 text-xs">
                      Enter any text below to convert it to speech instantly.
                    </p>
                  </div>
                </div>
                <DirectTTS
                  onGenerate={handleDirectTTS}
                  disabled={false}
                  isLoading={isTTSGenerating}
                  useStreaming={true}
                  sessionId={sessionId ?? undefined}
                />
              </>
            )}
          </div>
        </section>
      </main>

      {/* Footer with disclaimer and tool links */}
      <footer className="absolute bottom-0 left-0 right-0 pb-3 pt-2">
        <p className="text-xs text-white/40 text-center max-w-xl mx-auto px-4 mb-2">{t(lang, "web.disclaimer")}</p>
        <div className="flex items-center justify-center gap-4 flex-wrap px-4">
          <a
            href="https://epsa.millionstrongmen.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-sinai-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t(lang, "web.screening_link")}
          </a>
          <span className="text-white/20">·</span>
          <a
            href="https://as.millionstrongmen.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-sinai-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t(lang, "web.surveillance_link")}
          </a>
        </div>
      </footer>
    </div>
  );
}

function TopicChips({ lang, onAsk }: { lang: Parameters<typeof t>[0]; onAsk: (q: string) => void }) {
  return (
    <div className="h-full flex flex-col justify-center gap-4 py-2">
      <p className="text-center text-xs text-white/40 uppercase tracking-wider font-medium">
        {t(lang, "web.suggested")}
      </p>
      {TOPIC_CATEGORIES.map((cat) => (
        <div key={cat.titleKey}>
          <p className="text-xs text-white/50 font-medium mb-1.5 px-1">{t(lang, cat.titleKey)}</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.questionKeys.map((qk) => (
              <button
                key={qk}
                onClick={() => onAsk(t(lang, qk))}
                className="text-xs px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-sinai-400/20 hover:border-sinai-400/40 transition-all text-left"
              >
                {t(lang, qk)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
