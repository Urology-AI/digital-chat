"""
FastAPI backend for Chat with Dr Ash Tewari.
Educational and emotional support only - non-diagnostic, non-therapeutic.
Uses Gemini API for LLM. Session-based chat history (in-memory).
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from backend.chat import get_chat_response
from backend.config import CLINICIAN
from backend.settings import get_settings, update_settings, get_presets
from backend.services.voice import generate_response_audio
from backend.services.voice_stream import stream_speech_audio_chunked
from backend.store import (
    create_session,
    get_history,
    append_message,
    get_or_create_session,
)

app = FastAPI(
    title="Chat with Dr Ash Tewari",
    description="Educational and emotional support only. Non-diagnostic, non-therapeutic.",
    version="0.1.0",
)

AUDIO_DIR = Path(__file__).resolve().parent.parent / "generated_audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(AUDIO_DIR)), name="media")

default_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
cors_from_env = os.getenv("CORS_ALLOW_ORIGINS", "")
if cors_from_env.strip():
    allow_origins = [o.strip() for o in cors_from_env.split(",") if o.strip()]
else:
    allow_origins = default_cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    response: str
    message: str | None = None
    session_id: str
    audio_url: str | None = None
    voice_used: bool = False


class SpeechRequest(BaseModel):
    text: str
    session_id: str | None = None
    speaker_id: str | None = None
    language: str | None = None
    turn_index: int | None = None


class SpeechResponse(BaseModel):
    session_id: str
    audio_url: str | None = None
    voice_used: bool = False
    error: str | None = None


class MessageItem(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[MessageItem]


class SessionResponse(BaseModel):
    session_id: str


class SettingsUpdate(BaseModel):
    system_prompt: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    preset: str | None = None
    voice: dict | None = None


@app.get("/")
def root():
    return {"status": "ok", "app": "Chat with Dr Ash Tewari", "llm": "gemini"}


@app.get("/api/health")
def health():
    """Simple health check for runtime readiness."""
    current_settings = get_settings()
    return {
        "status": "ok",
        "gemini_api_key_loaded": bool(os.getenv("GEMINI_API_KEY")),
        "gemini_model": current_settings.get("model"),
        "audio_dir_writable": AUDIO_DIR.exists() and os.access(AUDIO_DIR, os.W_OK),
    }


@app.get("/api/config")
def get_config():
    """Clinician config for frontend - swappable for other specialties."""
    return {
        "clinician_name": CLINICIAN.name,
        "clinician_title": CLINICIAN.title,
        "avatar_image_url": CLINICIAN.avatar_image_url,
    }


@app.get("/api/settings")
def api_get_settings():
    """Get current settings and master prompt."""
    return get_settings()


@app.put("/api/settings")
def api_update_settings(update: SettingsUpdate):
    """Update settings and master prompt (training)."""
    return update_settings(
        system_prompt=update.system_prompt,
        model=update.model,
        temperature=update.temperature,
        max_tokens=update.max_tokens,
        preset=update.preset,
        voice=update.voice,
    )


@app.get("/api/prompts/presets")
def api_get_presets():
    """Get available prompt presets for quick training."""
    return {"presets": get_presets()}


@app.post("/api/chat/sessions", response_model=SessionResponse)
def create_chat_session():
    """Create a new chat session."""
    session_id = create_session()
    return SessionResponse(session_id=session_id)


@app.get("/api/chat/history", response_model=HistoryResponse)
def get_chat_history(session_id: str):
    """Get chat history for a session."""
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    messages = get_history(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[MessageItem(role=m["role"], content=m["content"]) for m in messages],
    )


class AvatarVideoRequest(BaseModel):
    text: str


def _synthesize_for_session(
    *,
    http_request: Request | None,
    text: str,
    session_id: str | None,
    speaker_id: str | None = None,
    language: str | None = None,
    turn_index: int | None = None,
) -> SpeechResponse:
    """
    Shared speech generation path used by both /api/speech and /api/chat.
    """
    resolved_session_id = get_or_create_session(session_id)
    clean_text = (text or "").strip()
    if not clean_text:
        return SpeechResponse(
            session_id=resolved_session_id,
            audio_url=None,
            voice_used=False,
            error="text required",
        )

    settings = get_settings()
    voice_settings = dict(settings.get("voice", {}))
    if speaker_id:
        voice_settings["speaker_id"] = speaker_id
    if language:
        voice_settings["language"] = language

    resolved_turn_index = turn_index
    if resolved_turn_index is None:
        resolved_turn_index = (len(get_history(resolved_session_id)) // 2) + 1

    audio_url = generate_response_audio(
        text=clean_text,
        session_id=resolved_session_id,
        turn_index=resolved_turn_index,
        voice_settings=voice_settings,
    )
    if audio_url and http_request is not None and audio_url.startswith("/"):
        audio_url = f"{str(http_request.base_url).rstrip('/')}{audio_url}"

    return SpeechResponse(
        session_id=resolved_session_id,
        audio_url=audio_url,
        voice_used=audio_url is not None,
        error=None if audio_url else "voice generation unavailable",
    )


@app.post("/api/speech", response_model=SpeechResponse)
def generate_speech(http_request: Request, request: SpeechRequest):
    """
    Generate speech audio for text and return audio_url.
    (Non-streaming - generates full file then returns URL)
    """
    return _synthesize_for_session(
        http_request=http_request,
        text=request.text,
        session_id=request.session_id,
        speaker_id=request.speaker_id,
        language=request.language,
        turn_index=request.turn_index,
    )


@app.post("/api/speech/stream")
async def stream_speech(request: SpeechRequest):
    """
    Stream TTS audio in real-time as MP3 chunks.
    Returns audio chunks as they're generated - no waiting for full file.
    
    Frontend uses fetch with streaming to receive and play chunks immediately.
    Better for real-time playback than waiting for full file generation.
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    
    speaker_id = request.speaker_id or "dr_tewari"
    language = request.language or "en"
    
    async def generate_audio_stream():
        """Generator that yields raw MP3 audio chunks."""
        try:
            async for audio_chunk in stream_speech_audio_chunked(
                text=text,
                speaker_id=speaker_id,
                language=language,
                chunk_size=8192,  # 8KB chunks for smooth streaming
            ):
                yield audio_chunk
        except Exception as e:
            # Log error - client will handle disconnection
            print(f"TTS streaming error: {e}")
            raise
    
    return StreamingResponse(
        generate_audio_stream(),
        media_type="audio/mpeg",  # MP3 format
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx/proxy buffering
            "Transfer-Encoding": "chunked",
        },
    )


@app.post("/api/avatar/video")
def generate_avatar_video(request: AvatarVideoRequest):
    """
    Optional: Generate full lip-sync video from text using SadTalker (Replicate).
    Requires REPLICATE_API_TOKEN and: pip install replicate edge-tts
    Returns { "video_url": "..." } or { "error": "..." }.
    """
    try:
        from backend.avatar_video import generate_talking_video
    except ImportError:
        return {"error": "SadTalker not configured. Install: pip install replicate edge-tts"}
    text = (request.text or "").strip()
    if not text:
        return {"error": "message required"}
    url = generate_talking_video(text)
    if url:
        return {"video_url": url}
    return {"error": "Failed to generate video. Check REPLICATE_API_TOKEN and dependencies."}


@app.post("/api/chat", response_model=ChatResponse)
def chat(http_request: Request, request: ChatRequest):
    """Send a message, get response. Maintains chat history per session."""
    message = (request.message or "").strip()
    if not message:
        return ChatResponse(
            response="Please type a question. I'm here to provide educational information and support.",
            message="Please type a question. I'm here to provide educational information and support.",
            session_id=get_or_create_session(request.session_id),
        )

    session_id = get_or_create_session(request.session_id)
    history = get_history(session_id)

    # Get LLM response with full history (uses current master prompt from settings)
    response = get_chat_response(message, history)
    speech_result = _synthesize_for_session(
        http_request=http_request,
        text=response,
        session_id=session_id,
        turn_index=(len(history) // 2) + 1,
    )

    # Persist to session
    append_message(session_id, "user", message)
    append_message(session_id, "assistant", response)

    return ChatResponse(
        response=response,
        message=response,
        session_id=session_id,
        audio_url=speech_result.audio_url,
        voice_used=speech_result.voice_used,
    )
