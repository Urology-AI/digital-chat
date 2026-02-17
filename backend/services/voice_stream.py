"""
Streaming TTS service - streams audio chunks in real-time as they're generated.
Uses edge-tts streaming API.
"""
from __future__ import annotations

import asyncio
import io
from typing import AsyncGenerator


SPEAKER_VOICE_MAP = {
    "dr_tewari": "en-US-GuyNeural",
}


async def stream_speech_audio(
    text: str,
    speaker_id: str = "dr_tewari",
    language: str = "en",
) -> AsyncGenerator[bytes, None]:
    """
    Stream TTS audio chunks as they're generated.
    Yields audio chunks (bytes) in real-time.
    
    Usage:
        async for chunk in stream_speech_audio("Hello world"):
            yield chunk  # Send to client
    """
    if not text or not text.strip():
        return

    try:
        import edge_tts
    except ImportError:
        # Fallback: return empty if edge-tts not available
        return

    voice_name = SPEAKER_VOICE_MAP.get(speaker_id, "en-US-GuyNeural")

    try:
        # edge-tts supports streaming via communicate.stream()
        communicate = edge_tts.Communicate(text, voice_name)
        
        # Stream audio chunks as they're generated
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                # chunk["data"] is bytes of audio
                yield chunk["data"]
    except Exception as e:
        # Log error but don't break the stream
        print(f"TTS streaming error: {e}")
        return


async def stream_speech_audio_chunked(
    text: str,
    speaker_id: str = "dr_tewari",
    language: str = "en",
    chunk_size: int = 8192,
) -> AsyncGenerator[bytes, None]:
    """
    Stream TTS audio in fixed-size chunks (for SSE/HTTP streaming).
    Useful when you need consistent chunk sizes for network protocols.
    """
    buffer = io.BytesIO()
    
    async for audio_data in stream_speech_audio(text, speaker_id, language):
        buffer.write(audio_data)
        
        # Yield chunks of specified size
        while buffer.tell() >= chunk_size:
            buffer.seek(0)
            chunk = buffer.read(chunk_size)
            yield chunk
            
            # Keep remaining data
            remaining = buffer.read()
            buffer.seek(0)
            buffer.truncate(0)
            buffer.write(remaining)
    
    # Yield any remaining data
    if buffer.tell() > 0:
        buffer.seek(0)
        remaining = buffer.read()
        if remaining:
            yield remaining
