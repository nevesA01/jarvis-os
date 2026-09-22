from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.config import AgentConfig
from app.models import PairingRecord


class PairingService:
    """Pareamento local simulado; não abre servidor nem porta de entrada."""

    def __init__(self, config: AgentConfig, device_id: str, public_key: str) -> None:
        self.config = config
        self.device_id = device_id
        self.public_key = public_key
        self._record: PairingRecord | None = None

    def create_one_time_code(self) -> str:
        code = f"{secrets.randbelow(1_000_000):06d}"
        self._record = PairingRecord(
            device_id=self.device_id,
            public_key=self.public_key,
            code_hash=self._hash(code),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=self.config.pairing_ttl_seconds),
        )
        return code

    def consume(self, code: str) -> PairingRecord:
        record = self._record
        if record is None or record.used or record.expires_at <= datetime.now(timezone.utc):
            raise ValueError("pairing_code_expired_or_unavailable")
        if not secrets.compare_digest(record.code_hash, self._hash(code.strip())):
            raise ValueError("invalid_pairing_code")
        self._record = record.model_copy(update={"used": True})
        return self._record

    @staticmethod
    def _hash(code: str) -> str:
        return hashlib.sha256(code.encode("utf-8")).hexdigest()
