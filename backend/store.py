"""
In-memory session store for chat history.
Session-based only - no PHI, no persistence.
"""
import uuid
from typing import TypedDict
from threading import Lock

Message = TypedDict("Message", {"role": str, "content": str})

_sessions: dict[str, list[Message]] = {}
_lock = Lock()


def create_session() -> str:
    """Create new session, return session_id."""
    sid = str(uuid.uuid4())
    with _lock:
        _sessions[sid] = []
    return sid


def get_history(session_id: str) -> list[Message]:
    """Get chat history for session."""
    with _lock:
        return list(_sessions.get(session_id, []))


def append_message(session_id: str, role: str, content: str) -> None:
    """Append message to session history."""
    with _lock:
        if session_id not in _sessions:
            _sessions[session_id] = []
        _sessions[session_id].append({"role": role, "content": content})


def get_or_create_session(session_id: str | None) -> str:
    """Get existing session or create new one."""
    if session_id and session_id in _sessions:
        return session_id
    return create_session()
