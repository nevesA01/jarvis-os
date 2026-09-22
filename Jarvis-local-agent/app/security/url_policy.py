from __future__ import annotations

from urllib.parse import urlparse

from app.policies.engine import LocalPolicy


def validate_redirect(policy: LocalPolicy, url: str) -> None:
    allowed, reason = policy.allows_url(url)
    if not allowed:
        raise ValueError(f"redirect_blocked:{reason}")
    parsed = urlparse(url)
    if parsed.fragment and len(parsed.fragment) > 4096:
        raise ValueError("url_fragment_too_large")
