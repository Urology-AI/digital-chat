import { useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  audio_url?: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSpeak: (message: Message) => void;
}

export function MessageList({ messages, isLoading, onSpeak }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm px-4">
        <p className="text-center">
          Type a question below.
          <br />
          <span className="text-white/40">I'm here to provide educational information and support.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[90%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "bg-sinai-400/90 text-white"
                : "bg-white/10 text-white/95 backdrop-blur-sm border border-white/10"
            }`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            {m.role === "assistant" && (
              <button
                onClick={() => onSpeak(m)}
                className="mt-2 text-xs text-sinai-300 hover:text-sinai-200 underline"
              >
                Play voice
              </button>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-3">
            <svg
              className="w-5 h-5 animate-spin text-sinai-400 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="30 40"
              />
            </svg>
            <span className="text-sm text-white/70">Thinking...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
