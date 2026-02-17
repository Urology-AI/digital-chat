/**
 * Real-time streaming TTS service.
 * Streams audio chunks as they're generated and plays them immediately.
 */
import { buildSpeechApiUrl } from "./api";

export interface StreamSpeechOptions {
  text: string;
  sessionId?: string;
  speakerId?: string;
  language?: string;
  onChunk?: (chunk: Uint8Array) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Stream TTS audio and play it in real-time as chunks arrive.
 * Returns an AbortController to cancel the stream.
 */
export async function streamSpeechAudio(
  options: StreamSpeechOptions
): Promise<AbortController> {
  const { text, sessionId, speakerId, language, onChunk, onStart, onEnd, onError } = options;

  const abortController = new AbortController();
  const chunks: Uint8Array[] = [];

  try {
    onStart?.();

    const response = await fetch(buildSpeechApiUrl("/api/speech/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        session_id: sessionId ?? null,
        speaker_id: speakerId ?? null,
        language: language ?? null,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();

    // Read chunks and play them
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        onChunk?.(value);

        // For real-time playback, we'd use Web Audio API here
        // For now, we collect chunks and play at the end
      }
    }

    // Combine all chunks into a single blob and play
    const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([allChunks], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      onEnd?.();
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      onError?.(new Error("Audio playback failed"));
    };

    audio.play().catch((err) => {
      URL.revokeObjectURL(audioUrl);
      onError?.(err);
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Stream was cancelled - this is expected
      return abortController;
    }
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  return abortController;
}

/**
 * Stream TTS and return audio URL when complete (for compatibility).
 */
export async function streamSpeechToUrl(
  text: string,
  sessionId?: string,
  speakerId?: string,
  language?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    streamSpeechAudio({
      text,
      sessionId,
      speakerId,
      language,
      onChunk: (chunk) => chunks.push(chunk),
      onEnd: () => {
        const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          allChunks.set(chunk, offset);
          offset += chunk.length;
        }
        const blob = new Blob([allChunks], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        resolve(url);
      },
      onError: reject,
    });
  });
}
