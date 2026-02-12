"""
Chat logic - Gemini LLM integration with safety guardrails.
Uses master prompt from settings (configurable via /api/settings).
"""
import os
import json
from urllib import request, error
from backend.safety import classify_question, QuestionType
from backend.settings import get_settings

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FALLBACK_MODELS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


def _normalize_model_name(model: str) -> str:
    cleaned = (model or "").strip()
    if cleaned.startswith("models/"):
        return cleaned.split("/", 1)[1]
    return cleaned


def _candidate_models(primary: str) -> list[str]:
    primary = _normalize_model_name(primary)
    candidates: list[str] = []
    if primary:
        candidates.append(primary)
        if not primary.endswith("-latest"):
            candidates.append(f"{primary}-latest")
    for m in FALLBACK_MODELS:
        if m not in candidates:
            candidates.append(m)
    return candidates


def get_chat_response(question: str, history: list[dict]) -> str:
    """
    Generate educational response with safety guardrails.
    Uses chat history and master prompt from settings.
    """
    settings = get_settings()
    system_prompt = settings["system_prompt"]
    model = settings["model"]
    temperature = settings["temperature"]
    max_tokens = settings["max_tokens"]

    if not GEMINI_API_KEY:
        return (
            "I'm sorry, I'm having trouble responding right now. "
            "Please set GEMINI_API_KEY in your .env and try again."
        )

    q_type = classify_question(question)

    if q_type == QuestionType.EMERGENCY:
        return (
            "If you're experiencing a medical emergency, please call 911 or go to your "
            "nearest emergency room immediately. This tool provides educational information "
            "and emotional support only. It does not provide medical advice."
        )

    if q_type == QuestionType.CLINICAL:
        return (
            "This is something your care team should address directly. "
            "I'm here to provide general education and emotional support about postoperative "
            "care and cancer-related topics. For personalized medical advice, please speak "
            "with your doctor."
        )

    # Build Gemini-compatible history: user/model roles
    messages = []
    for item in history:
        role = "model" if item.get("role") == "assistant" else "user"
        content = item.get("content", "")
        if content:
            messages.append({"role": role, "parts": [{"text": content}]})
    messages.append({"role": "user", "parts": [{"text": question}]})

    last_404_model = None
    for active_model in _candidate_models(model):
        try:
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent"
                f"?key={GEMINI_API_KEY}"
            )
            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": messages,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            }
            req = request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            candidates = data.get("candidates") or []
            parts = []
            for candidate in candidates:
                content = candidate.get("content", {})
                for part in content.get("parts", []):
                    part_text = part.get("text")
                    if part_text:
                        parts.append(part_text)
            if parts:
                return "\n".join(parts)
            return "I'm sorry, I couldn't generate a response."
        except error.HTTPError as http_err:
            details = ""
            try:
                body = http_err.read().decode("utf-8")
                parsed = json.loads(body)
                details = parsed.get("error", {}).get("message", "")
            except Exception:
                details = ""

            if http_err.code == 403:
                return (
                    "I'm sorry, I'm having trouble responding right now. "
                    "Gemini rejected the API key (403). Please verify GEMINI_API_KEY."
                )
            if http_err.code == 404:
                last_404_model = active_model
                continue
            if http_err.code == 400 and details:
                return (
                    "I'm sorry, I'm having trouble responding right now. "
                    f"Gemini request error: {details}"
                )
            return (
                "I'm sorry, I'm having trouble responding right now. "
                "Please verify your Gemini API key and model name, then try again."
            )
        except Exception:
            return (
                "I'm sorry, I'm having trouble responding right now. "
                "Please verify your Gemini API key and model name, then try again."
            )

    return (
        "I'm sorry, I'm having trouble responding right now. "
        f"Gemini model '{last_404_model or model}' was not found. "
        "Please set model to 'gemini-1.5-flash-latest' in Settings."
    )
