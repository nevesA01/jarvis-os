from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    agent_name: str = "Jarvis Local Agent - Windows"
    agent_version: str = "0.1.0-phase-a"
    policy_version: str = "phase-a-2025-01"
    pairing_ttl_seconds: int = Field(default=300, ge=30, le=900)
    job_clock_skew_seconds: int = Field(default=30, ge=0, le=300)
    audit_retention_days: int = Field(default=30, ge=1, le=3650)
    max_job_ttl_seconds: int = Field(default=300, ge=1, le=900)

    @property
    def data_dir(self) -> Path:
        configured = os.getenv("JARVIS_AGENT_DATA_DIR")
        if configured:
            return Path(configured).expanduser()
        local_app_data = os.getenv("LOCALAPPDATA")
        if local_app_data:
            return Path(local_app_data) / "Jarvis" / "LocalAgent"
        return Path.home() / "Jarvis" / "LocalAgent"

    @property
    def audit_path(self) -> Path:
        return self.data_dir / "audit.jsonl"

    @property
    def nonce_path(self) -> Path:
        return self.data_dir / "nonces.json"

    @property
    def workspace_path(self) -> Path:
        return Path.home() / "JarvisWorkspace"
