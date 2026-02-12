"""
Safety classification - detect educational vs clinical questions.
"""
import re
from enum import Enum


class QuestionType(str, Enum):
    EDUCATIONAL = "educational"
    CLINICAL = "clinical"
    EMERGENCY = "emergency"


# Patterns that suggest clinical/out-of-scope questions
CLINICAL_PATTERNS = [
    r"\b(diagnos(e|is|ing)|diagnostic)\b",
    r"\b(prescrib(e|ing)|prescription|medication|drug)\b",
    r"\b(emergency|911|urgent|bleeding heavily|can't breathe)\b",
    r"\b(lab result|blood test|imaging|scan result|biopsy result)\b",
    r"\b(should i take|can i take|dosage|mg|milligram)\b",
    r"\b(treat my|treating my|fix my)\b",
    r"\b(is this normal for me|my specific|my case)\b",
]

EMERGENCY_PATTERNS = [
    r"\b(emergency|911|bleeding|can't breathe|chest pain|stroke)\b",
]


def classify_question(text: str) -> QuestionType:
    """
    Quick pre-filter to flag likely out-of-scope questions.
    LLM still has final say via system prompt.
    """
    lower = text.lower().strip()
    if not lower:
        return QuestionType.EDUCATIONAL

    for pattern in EMERGENCY_PATTERNS:
        if re.search(pattern, lower, re.I):
            return QuestionType.EMERGENCY

    for pattern in CLINICAL_PATTERNS:
        if re.search(pattern, lower, re.I):
            return QuestionType.CLINICAL

    return QuestionType.EDUCATIONAL
