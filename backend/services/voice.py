"""
Voice synthesis service for chat responses.

Primary path: edge-tts
Fallback path: gTTS
"""
from __future__ import annotations

import asyncio
from pathlib import Path

SPEAKER_VOICE_MAP = {
    "dr_tewari": "en-US-GuyNeural",
}

AUDIO_BASE_DIR = Path(__file__).resolve().parents[2] / "generated_audio"


def generate_response_audio(
    text: str,
    session_id: str,
    turn_index: int,
    voice_settings: dict | None,
) -> str | None:
    """
    Generate response audio and return a backend-served URL path.
    Returns None if synthesis fails or voice is disabled.
    """
    if not text or not text.strip():
        return None

    cfg = voice_settings or {}
    if not bool(cfg.get("enabled", False)):
        return None

    speaker_id = str(cfg.get("speaker_id", "dr_tewari"))
    language = str(cfg.get("language", "en"))
    voice_name = SPEAKER_VOICE_MAP.get(speaker_id, "en-US-GuyNeural")

    session_dir = AUDIO_BASE_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    filename = f"response_{turn_index}.mp3"
    output_path = session_dir / filename

    if _synthesize_with_edge_tts(text, voice_name, output_path):
        return f"/media/{session_id}/{filename}"

    if _synthesize_with_gtts(text, language, output_path):
        return f"/media/{session_id}/{filename}"

    return None


def _synthesize_with_edge_tts(text: str, voice_name: str, output_path: Path) -> bool:
    try:
        import edge_tts
    except ImportError:
        return False

    async def _run() -> None:
        communicate = edge_tts.Communicate(text, voice_name)
        await communicate.save(str(output_path))

    try:
        asyncio.run(_run())
        return output_path.exists() and output_path.stat().st_size > 0
    except Exception:
        return False


def _synthesize_with_gtts(text: str, language: str, output_path: Path) -> bool:
    try:
        from gtts import gTTS
    except ImportError:
        return False

    try:
        gTTS(text=text, lang=language).save(str(output_path))
        return output_path.exists() and output_path.stat().st_size > 0
    except Exception:
        return False

