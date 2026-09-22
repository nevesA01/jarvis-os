from __future__ import annotations

from datetime import datetime, timezone
from enum import IntEnum, StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PermissionLevel(IntEnum):
    L0 = 0
    L1 = 1
    L2 = 2
    L3 = 3
    L4 = 4


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Job(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    job_id: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")
    user_id: str = Field(min_length=1, max_length=128)
    device_id: str = Field(min_length=1, max_length=128)
    task_id: str = Field(min_length=1, max_length=128)
    action_type: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z][A-Za-z0-9_.-]+$")
    tool_id: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z][A-Za-z0-9_.-]+$")
    validated_arguments: dict[str, Any] = Field(default_factory=dict)
    action_hash: str = Field(min_length=64, max_length=64, pattern=r"^[a-f0-9]{64}$")
    permission_level: PermissionLevel
    risk_level: RiskLevel
    approval_id: str | None = Field(default=None, max_length=128)
    issued_at: datetime
    expires_at: datetime
    nonce: str = Field(min_length=16, max_length=256)
    signature: str = Field(min_length=16, max_length=4096)

    @field_validator("issued_at", "expires_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include timezone")
        return value.astimezone(timezone.utc)

    @field_validator("expires_at")
    @classmethod
    def require_expiry_after_issue(cls, value: datetime, info: Any) -> datetime:
        issued_at = info.data.get("issued_at")
        if issued_at is not None and value <= issued_at:
            raise ValueError("expires_at must be after issued_at")
        return value

    def action_payload(self) -> dict[str, Any]:
        return {
            "action_type": self.action_type,
            "tool_id": self.tool_id,
            "validated_arguments": self.validated_arguments,
            "permission_level": int(self.permission_level),
            "risk_level": self.risk_level.value,
        }


class Approval(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    approval_id: str = Field(min_length=1, max_length=128)
    action_hash: str = Field(min_length=64, max_length=64, pattern=r"^[a-f0-9]{64}$")
    approved_by: str = Field(min_length=1, max_length=128)
    approved_at: datetime
    expires_at: datetime
    reauthenticated: bool = False


class AuditEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime
    job_id: str
    task_id: str
    user_id: str
    device_id: str
    tool_id: str
    action_hash: str
    domain: str | None = None
    urls_visited: list[str] = Field(default_factory=list)
    decision: str
    duration_ms: int = Field(default=0, ge=0)
    result: str
    error: str | None = None
    steps: int = Field(default=0, ge=0)
    downloads: int = Field(default=0, ge=0)
    files_created: list[str] = Field(default_factory=list)
    agent_version: str
    policy_version: str


class PairingRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    device_id: str
    public_key: str
    code_hash: str
    expires_at: datetime
    used: bool = False


class ExecutionResult(BaseModel):
    ok: bool
    status: str
    result: dict[str, Any] = Field(default_factory=dict)


class ValidationContext(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    now: datetime
    local_device_id: str
    kill_switch_enabled: bool = False
