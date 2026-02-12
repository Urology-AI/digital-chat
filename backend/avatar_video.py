"""
Optional SadTalker integration for full lip-sync video from photo + audio.
Requires REPLICATE_API_TOKEN. Uses drtewari.png as source.
Install: pip install replicate edge-tts
"""
import os
import tempfile
from pathlib import Path

AVATAR_IMAGE_PATH = Path(__file__).parent.parent / "public" / "drtewari.png"


def generate_talking_video(text: str) -> str | None:
    """
    Generate lip-synced talking video from text using SadTalker via Replicate.
    Returns video URL or None on failure.
    """
    if not os.getenv("REPLICATE_API_TOKEN"):
        return None

    try:
        import replicate
    except ImportError:
        return None

    audio_path = _generate_tts(text)
    if not audio_path:
        return None

    try:
        # Replicate accepts file paths or file-like objects
        with open(AVATAR_IMAGE_PATH, "rb") as img_f, open(audio_path, "rb") as audio_f:
            output = replicate.run(
                "cjwbw/sadtalker:3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376",
                input={
                    "source_image": img_f,
                    "driven_audio": audio_f,
                    "preprocess": "full",
                    "enhancer": "gfpgan",
                },
            )
        if isinstance(output, str):
            return output
        if isinstance(output, (list, tuple)) and output:
            return output[0]
        return str(output) if output else None
    except Exception:
        return None
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except OSError:
                pass


def _generate_tts(text: str) -> str | None:
    """Generate TTS audio file. Uses edge-tts (free) or gTTS."""
    try:
        import edge_tts
        import asyncio

        async def _run():
            communicate = edge_tts.Communicate(text, "en-US-GuyNeural")
            path = tempfile.mktemp(suffix=".mp3")
            await communicate.save(path)
            return path

        return asyncio.run(_run())
    except ImportError:
        pass

    try:
        from gtts import gTTS
        path = tempfile.mktemp(suffix=".mp3")
        gTTS(text=text, lang="en").save(path)
        return path
    except ImportError:
        pass

    return None
