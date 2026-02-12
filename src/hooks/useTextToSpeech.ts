import { useState, useCallback } from "react";

/**
 * Browser Web Speech API for TTS - doctor-like, calm tone.
 * Uses system voices; no external API needed.
 */
export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes("Daniel") ||
        v.name.includes("Samantha") ||
        v.lang?.startsWith("en")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, isSpeaking };
}
