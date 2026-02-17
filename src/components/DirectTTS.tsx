import { useState, FormEvent } from "react";
import { useStreamingTTS } from "../hooks/useStreamingTTS";

interface DirectTTSProps {
  onGenerate: (text: string) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  useStreaming?: boolean; // Use real-time streaming TTS
  sessionId?: string;
}

export function DirectTTS({ 
  onGenerate, 
  disabled, 
  isLoading: externalLoading,
  useStreaming = true,
  sessionId,
}: DirectTTSProps) {
  const [value, setValue] = useState("");
  const { streamSpeech, stop, isStreaming } = useStreamingTTS();
  const isLoading = externalLoading || isStreaming;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled || isLoading) return;
    
    const text = value.trim();
    setValue("");

    if (useStreaming) {
      // Use real-time streaming TTS
      await streamSpeech(text, { sessionId });
    } else {
      // Use traditional non-streaming endpoint
      await onGenerate(text);
    }
  };

  return (
    <div className="p-4 border-t border-white/10 bg-white/5">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter text to convert to speech..."
            disabled={disabled || isLoading}
            rows={3}
            className="w-full px-4 py-3 text-sm rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sinai-400/50 focus:border-sinai-400/50 disabled:opacity-50 backdrop-blur-sm resize-none"
          />
          <div className="flex gap-2">
            {isStreaming && (
              <button
                type="button"
                onClick={stop}
                className="px-4 py-3 rounded-xl border border-red-400/50 text-red-400 hover:bg-red-400/10 transition-all"
                title="Stop streaming"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={disabled || isLoading || !value.trim()}
              className="flex-1 px-5 py-3 rounded-xl bg-sinai-400 text-white font-medium hover:bg-sinai-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-sinai-400/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {useStreaming ? "Streaming..." : "Generating..."}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {useStreaming ? "Stream Speech" : "Generate Speech"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
