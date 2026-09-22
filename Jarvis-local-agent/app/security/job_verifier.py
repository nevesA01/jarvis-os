from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from app.models import Approval, Job, ValidationContext
from app.policies.engine import LocalPolicy
from app.security.nonce_store import NonceStore
from app.security.signatures import action_hash, verify_payload


class JobRejected(ValueError):
    pass


class JobVerifier:
    def __init__(
        self,
        *,
        public_key: str,
        nonce_store: NonceStore,
        policy: LocalPolicy,
        signature_payload: Callable[[Job], dict] | None = None,
    ) -> None:
        self.public_key = public_key
        self.nonce_store = nonce_store
        self.policy = policy
        self.signature_payload = signature_payload or (lambda job: job.model_dump(mode="json", exclude={"signature"}))

    def verify(self, job: Job, context: ValidationContext, approval: Approval | None = None) -> None:
        now = context.now.astimezone(timezone.utc)
        if context.kill_switch_enabled:
            raise JobRejected("kill_switch_enabled")
        if job.device_id != context.local_device_id:
            raise JobRejected("device_mismatch")
        if job.issued_at.timestamp() > now.timestamp() + 30:
            raise JobRejected("issued_at_in_future")
        if job.expires_at <= now:
            raise JobRejected("job_expired")
        if job.action_hash != action_hash(job.action_payload()):
            raise JobRejected("action_hash_mismatch")
        if not verify_payload(self.public_key, self.signature_payload(job), job.signature):
            raise JobRejected("invalid_signature")
        if not self.nonce_store.claim(job.nonce, job.expires_at):
            raise JobRejected("replayed_nonce")
        allowed, reason = self.policy.allows(job)
        if not allowed:
            raise JobRejected(reason)
        if job.permission_level.value >= 2:
            if approval is None:
                raise JobRejected("approval_required")
            if approval.approval_id != job.approval_id or approval.action_hash != job.action_hash:
                raise JobRejected("approval_does_not_match_action")
            if approval.expires_at <= now or approval.approved_at > now:
                raise JobRejected("approval_expired_or_invalid")
            if not approval.reauthenticated:
                raise JobRejected("local_reauthentication_required")
