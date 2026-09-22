from __future__ import annotations

from datetime import datetime, timezone

from app.models import Approval, Job


class ApprovalGate:
    """Validação de aprovação; a janela nativa será adicionada em fase posterior."""

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
