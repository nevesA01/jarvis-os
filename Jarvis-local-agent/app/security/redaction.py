from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any

_SECRET_PATTERNS = (
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+"),
    re.compile(r"(?i)((?:password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*)[^\s,;]+"),
    re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
)


def redact_text(value: str) -> str:
    redacted = value
    for pattern in _SECRET_PATTERNS:
        redacted = pattern.sub(lambda match: f"{match.group(1)}[REDACTED]" if match.lastindex else "[REDACTED]", redacted)
    return redacted


def redact(value: Any) -> Any:
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, Mapping):
        return {str(key): "[REDACTED]" if _is_secret_key(str(key)) else redact(item) for key, item in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        return [redact(item) for item in value]
    return value


def _is_secret_key(key: str) -> bool:
    return bool(re.search(r"(?i)(password|passwd|secret|token|cookie|authorization|api[_-]?key|2fa|otp)", key))
