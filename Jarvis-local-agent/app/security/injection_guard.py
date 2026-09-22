from __future__ import annotations

import re

_SUSPICIOUS_PATTERNS = (
    re.compile(r"(?i)ignore\s+(?:all\s+)?previous\s+instructions"),
    re.compile(r"(?i)(send|envi[ae])\s+(?:these\s+)?(?:secrets|credentials|data|dados)"),
    re.compile(r"(?i)(reveal|reveal\s+the|revele)\s+(?:the\s+)?(?:secret|password|token|senha|segredo)"),
    re.compile(r"(?i)(disable|desative)\s+(?:security|seguran[çc]a)"),
    re.compile(r"(?i)(log\s*in|login|fa[çc]a\s+login)"),
)


def contains_prompt_injection(content: str) -> bool:
    return any(pattern.search(content) for pattern in _SUSPICIOUS_PATTERNS)


def assert_untrusted_content(content: str) -> None:
    if contains_prompt_injection(content):
        raise ValueError("untrusted_content_requires_confirmation")
