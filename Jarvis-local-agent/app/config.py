from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    agent_name: str = "Jarvis Local Agent - Windows"
    agent_version: str = "0.2.0-secure-phases"
    policy_version: str = "phase-a-e-2025-01"
    pairing_ttl_seconds: int = Field(default=300, ge=30, le=900)
    job_clock_skew_seconds: int = Field(default=30, ge=0, le=300)
    audit_retention_days: int = Field(default=30, ge=1, le=3650)
    max_job_ttl_seconds: int = Field(default=300, ge=1, le=900)
    max_file_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=50 * 1024 * 1024)
    max_page_text_bytes: int = Field(default=200_000, ge=1_000, le=2_000_000)
    max_steps: int = Field(default=20, ge=1, le=100)
    max_tabs: int = Field(default=3, ge=1, le=10)
    max_downloads: int = Field(default=3, ge=0, le=20)
    browser_timeout_ms: int = Field(default=15_000, ge=1_000, le=120_000)
    allowed_domains: tuple[str, ...] = ()
    vps_wss_url: str | None = None
    vps_signing_public_key: str | None = None
    access_token: str | None = None

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
    def identity_path(self) -> Path:
        return self.data_dir / "device_identity.json"

    @property
    def browser_profile_path(self) -> Path:
        return self.data_dir / "browser" / "Jarvis-Automation"

    @property
    def downloads_path(self) -> Path:
        return self.workspace_path / "Downloads-quarantine"

    @property
    def workspace_path(self) -> Path:
        configured = os.getenv("JARVIS_WORKSPACE_DIR")
        if configured:
            return Path(configured).expanduser()
        return Path.home() / "JarvisWorkspace"
