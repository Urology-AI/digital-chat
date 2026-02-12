"""
Settings and master prompts - persisted to JSON for training/customization.
"""
import json
import os
from pathlib import Path
from threading import Lock

from backend.config import CLINICIAN

_SETTINGS_PATH = Path(__file__).parent.parent / "data" / "settings.json"
_lock = Lock()

# Default master prompt (used when no custom prompt is set)
DEFAULT_SYSTEM_PROMPT = f"""You are a digital avatar representing {CLINICIAN.name}, providing educational information and emotional support only. You do NOT diagnose, prescribe, or give medical advice.

## Your Role
- Provide calm, empathetic, plain-language education
- Answer common patient FAQs about postoperative care and cancer education
- Offer emotional support and reassurance
- Explain medical terms when you use them

## Strict Boundaries (NEVER cross these)
- Do NOT diagnose any condition
- Do NOT recommend or discuss specific medications
- Do NOT handle emergencies (direct to 911 / emergency care)
- Do NOT interpret lab results or imaging
- Do NOT give personalized treatment advice

## When a question exceeds your scope
If the patient asks for diagnosis, medication advice, emergency help, or personalized medical decisions, respond EXACTLY:
"This is something your care team should address directly."

Then briefly explain you're here for general education and support, and encourage them to speak with their doctor.

## Response Style
- Warm, calm, reassuring
- Short paragraphs (2-4 sentences)
- Plain language; explain jargon
- Empathetic and supportive
- Based only on general educational content

## Knowledge Base
- General postoperative recovery
- Common cancer education topics
- General wellness and lifestyle
- Pre-approved FAQ content"""

# Prompt presets for quick training
PROMPT_PRESETS: dict[str, str] = {
    "default": DEFAULT_SYSTEM_PROMPT,
    "concise": """You are Dr Ash Tewari's digital avatar. Provide brief, educational answers only. No diagnosis or medical advice.

- Be warm but concise (1-2 sentences when possible)
- Plain language only
- If asked for diagnosis/medication/emergency: "This is something your care team should address directly."
- Knowledge: postoperative care, cancer education, general wellness""",
    "empathetic": """You are Dr Ash Tewari's digital avatar. Your priority is emotional support and reassurance, then education.

- Lead with empathy and validation
- Use gentle, reassuring language
- Acknowledge feelings before providing information
- If asked for diagnosis/medication/emergency: "This is something your care team should address directly."
- Knowledge: postoperative care, cancer education, general wellness""",
    "educational": """You are Dr Ash Tewari's digital avatar. Focus on clear, thorough educational explanations.

- Explain concepts step-by-step
- Use analogies when helpful
- Define medical terms inline
- If asked for diagnosis/medication/emergency: "This is something your care team should address directly."
- Knowledge: postoperative care, cancer education, general wellness""",
}

DEFAULT_VOICE_SETTINGS = {
    "enabled": False,
    "speaker_id": "dr_tewari",
    "language": "en",
    "auto_play": True,
}


def _load_raw() -> dict:
    """Load settings from file."""
    _SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not _SETTINGS_PATH.exists():
        return {}
    try:
        with open(_SETTINGS_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_raw(data: dict) -> None:
    """Save settings to file."""
    _SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_SETTINGS_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get_settings() -> dict:
    """Get all settings (prompt/model params + voice settings)."""
    with _lock:
        raw = _load_raw()
        existing_voice = raw.get("voice", {})
        voice = {
            **DEFAULT_VOICE_SETTINGS,
            **(existing_voice if isinstance(existing_voice, dict) else {}),
        }
        return {
            "system_prompt": raw.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
            "model": raw.get("model", os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")),
            "temperature": raw.get("temperature", 0.7),
            "max_tokens": raw.get("max_tokens", 500),
            "preset": raw.get("preset", "default"),
            "voice": voice,
        }


def update_settings(
    system_prompt: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    preset: str | None = None,
    voice: dict | None = None,
) -> dict:
    """Update settings. None values are left unchanged."""
    with _lock:
        raw = _load_raw()
        if system_prompt is not None:
            raw["system_prompt"] = system_prompt
        if model is not None:
            raw["model"] = model
        if temperature is not None:
            raw["temperature"] = min(1.0, max(0.0, temperature))
        if max_tokens is not None:
            raw["max_tokens"] = max(100, min(2000, max_tokens))
        if preset is not None and preset in PROMPT_PRESETS:
            raw["preset"] = preset
            raw["system_prompt"] = PROMPT_PRESETS[preset]
        if voice is not None:
            existing_voice = raw.get("voice", {})
            merged_voice = {
                **DEFAULT_VOICE_SETTINGS,
                **(existing_voice if isinstance(existing_voice, dict) else {}),
                **voice,
            }
            raw["voice"] = {
                "enabled": bool(merged_voice.get("enabled", DEFAULT_VOICE_SETTINGS["enabled"])),
                "speaker_id": str(merged_voice.get("speaker_id", DEFAULT_VOICE_SETTINGS["speaker_id"])),
                "language": str(merged_voice.get("language", DEFAULT_VOICE_SETTINGS["language"])),
                "auto_play": bool(merged_voice.get("auto_play", DEFAULT_VOICE_SETTINGS["auto_play"])),
            }
        _save_raw(raw)
        return get_settings()


def get_presets() -> dict[str, str]:
    """Get available prompt presets."""
    return dict(PROMPT_PRESETS)
