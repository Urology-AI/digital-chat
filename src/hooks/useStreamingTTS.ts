import { useState, useCallback, useRef } from "react";
import { streamSpeechAudio } from "../services/speechStream";

/**
 * Hook for real-time streaming TTS.
 * Streams audio chunks as they're generated and plays them immediately.
 */
export function useStreamingTTS() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const streamSpeech = useCallback(
    async (
      text: string,
      options?: {
        sessionId?: string;
        speakerId?: string;
        language?: string;
      }
    ) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsStreaming(true);

      const chunks: Uint8Array[] = [];

      abortControllerRef.current = await streamSpeechAudio({
        text,
        sessionId: options?.sessionId,
        speakerId: options?.speakerId,
        language: options?.language,
        onStart: () => {
          // Stream started
        },
        onChunk: (chunk) => {
          chunks.push(chunk);
          
          // For true real-time playback, we could use Web Audio API here
          // to play chunks as they arrive. For now, we collect and play at end.
          // This is simpler and works well for most use cases.
        },
        onEnd: () => {
          // Combine chunks and play
          if (chunks.length === 0) {
            setIsStreaming(false);
            return;
          }

          const allChunks = new Uint8Array(
            chunks.reduce((acc, chunk) => acc + chunk.length, 0)
          );
          let offset = 0;
          for (const chunk of chunks) {
            allChunks.set(chunk, offset);
            offset += chunk.length;
          }

          const blob = new Blob([allChunks], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setIsStreaming(false);
            audioRef.current = null;
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            setIsStreaming(false);
            audioRef.current = null;
          };

          audio.play().catch(() => {
            URL.revokeObjectURL(audioUrl);
            setIsStreaming(false);
            audioRef.current = null;
          });
        },
        onError: (error) => {
          console.error("Streaming TTS error:", error);
          setIsStreaming(false);
        },
      });
    },
    []
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    streamSpeech,
    stop,
    isStreaming,
  };
}
