from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from app.models import Job, PermissionLevel


@dataclass(frozen=True)
class LocalPolicy:
    version: str
    allowed_tools: frozenset[str]
    allowed_domains: frozenset[str]
    blocked_actions: frozenset[str]
    max_job_ttl_seconds: int
    max_payload_bytes: int
    max_steps: int
    max_tabs: int
    max_downloads: int

    @classmethod
    def from_yaml(cls, path: Path) -> "LocalPolicy":
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        limits = data.get("limits", {})
        return cls(
            version=str(data["version"]),
            allowed_tools=frozenset(str(value) for value in data.get("allowed_tools", [])),
            allowed_domains=frozenset(str(value).lower() for value in data.get("allowed_domains", [])),
            blocked_actions=frozenset(str(value) for value in data.get("blocked_actions", [])),
            max_job_ttl_seconds=int(limits.get("max_job_ttl_seconds", 300)),
            max_payload_bytes=int(limits.get("max_payload_bytes", 65536)),
            max_steps=int(limits.get("max_steps", 0)),
            max_tabs=int(limits.get("max_tabs", 0)),
            max_downloads=int(limits.get("max_downloads", 0)),
        )

    def allows(self, job: Job) -> tuple[bool, str]:
        if job.permission_level == PermissionLevel.L4:
            return False, "permission_level_l4_disabled"
        if job.action_type in self.blocked_actions or job.tool_id in self.blocked_actions:
            return False, "action_blocked_by_local_policy"
        if job.tool_id not in self.allowed_tools:
            return False, "tool_not_allowlisted_locally"
        ttl = (job.expires_at - job.issued_at).total_seconds()
        if ttl > self.max_job_ttl_seconds:
            return False, "job_ttl_exceeds_local_limit"
        return True, "allowed"
