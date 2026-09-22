from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock

from app.models import Approval, Job


class ApprovalGate:
    """Aprovação local curta, vinculada ao hash e nunca por voz."""

    def __init__(self) -> None:
        self._approved: dict[str, Approval] = {}
        self._lock = Lock()

    def register(self, approval: Approval, now: datetime | None = None) -> None:
        current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        if approval.expires_at <= current or not approval.reauthenticated:
            raise ValueError("approval_not_valid")
        with self._lock:
            self._approved[approval.action_hash] = approval

    def consume_for(self, job: Job, now: datetime | None = None) -> Approval:
        current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        with self._lock:
            approval = self._approved.pop(job.action_hash, None)
        if approval is None:
            raise ValueError("approval_not_found")
        if approval.approval_id != job.approval_id or approval.action_hash != job.action_hash:
            raise ValueError("approval_hash_mismatch")
        if approval.expires_at <= current or not approval.reauthenticated:
            raise ValueError("approval_expired_or_invalid")
        return approval

    @staticmethod
    def validate(job: Job, approval: Approval, now: datetime | None = None) -> None:
        current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        if approval.approval_id != job.approval_id:
            raise ValueError("approval_id_mismatch")
        if approval.action_hash != job.action_hash:
            raise ValueError("action_hash_mismatch")
        if approval.expires_at <= current:
            raise ValueError("approval_expired")
        if not approval.reauthenticated:
            raise ValueError("local_reauthentication_required")
