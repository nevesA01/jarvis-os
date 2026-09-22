from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import yaml

from app.models import Job, PermissionLevel


@dataclass(frozen=True)
class LocalPolicy:
    version: str
    allowed_tools: frozenset[str]
    allowed_domains: frozenset[str]
    blocked_actions: frozenset[str]
    allowed_schemes: frozenset[str]
    max_job_ttl_seconds: int
    max_payload_bytes: int
    max_steps: int
    max_tabs: int
    max_downloads: int
    max_file_bytes: int
    max_page_text_bytes: int
    allowed_extensions: frozenset[str]

    @classmethod
    def from_yaml(cls, path: Path) -> "LocalPolicy":
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        limits = data.get("limits", {})
        browser = data.get("browser", {})
        return cls(
            version=str(data["version"]),
            allowed_tools=frozenset(str(value) for value in data.get("allowed_tools", [])),
            allowed_domains=frozenset(str(value).lower().lstrip(".") for value in data.get("allowed_domains", [])),
            blocked_actions=frozenset(str(value) for value in data.get("blocked_actions", [])),
            allowed_schemes=frozenset(str(value).lower() for value in browser.get("allowed_schemes", ["http", "https"])),
            max_job_ttl_seconds=int(limits.get("max_job_ttl_seconds", 300)),
            max_payload_bytes=int(limits.get("max_payload_bytes", 65536)),
            max_steps=int(limits.get("max_steps", 20)),
            max_tabs=int(limits.get("max_tabs", 3)),
            max_downloads=int(limits.get("max_downloads", 3)),
            max_file_bytes=int(limits.get("max_file_bytes", 10 * 1024 * 1024)),
            max_page_text_bytes=int(limits.get("max_page_text_bytes", 200_000)),
            allowed_extensions=frozenset({".txt", ".md", ".json", ".csv", ".pdf", ".png", ".jpg", ".jpeg"}),
        )

    def allows(self, job: Job) -> tuple[bool, str]:
        if job.permission_level == PermissionLevel.L4:
            return False, "permission_level_l4_disabled"
        if job.action_type in self.blocked_actions or job.tool_id in self.blocked_actions:
            return False, "action_blocked_by_local_policy"
        if job.tool_id not in self.allowed_tools:
            return False, "tool_not_allowlisted_locally"
        if len(job.model_dump_json()) > self.max_payload_bytes:
            return False, "job_payload_too_large"
        ttl = (job.expires_at - job.issued_at).total_seconds()
        if ttl > self.max_job_ttl_seconds:
            return False, "job_ttl_exceeds_local_limit"
        return True, "allowed"

    def allows_url(self, url: str) -> tuple[bool, str]:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in self.allowed_schemes:
            return False, "url_scheme_blocked"
        if parsed.username or parsed.password or not parsed.hostname:
            return False, "url_credentials_or_host_invalid"
        host = parsed.hostname.lower().rstrip(".")
        if not any(host == domain or host.endswith(f".{domain}") for domain in self.allowed_domains):
            return False, "domain_not_allowlisted"
        return True, "allowed"

    def allows_extension(self, suffix: str) -> bool:
        return suffix.lower() in self.allowed_extensions
