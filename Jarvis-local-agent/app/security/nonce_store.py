from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock


class NonceStore:
    def __init__(self, path: Path, max_entries: int = 10_000) -> None:
        self.path = path
        self.max_entries = max_entries
        self._lock = Lock()

    def claim(self, nonce: str, expires_at: datetime) -> bool:
        expiry = expires_at.astimezone(timezone.utc).timestamp()
        now = datetime.now(timezone.utc).timestamp()
        with self._lock:
            values = self._read()
            values = {key: value for key, value in values.items() if value > now}
            if nonce in values:
                return False
            values[nonce] = expiry
            if len(values) > self.max_entries:
                values = dict(sorted(values.items(), key=lambda item: item[1], reverse=True)[: self.max_entries])
            self._write(values)
            return True

    def _read(self) -> dict[str, float]:
        try:
            return {str(key): float(value) for key, value in json.loads(self.path.read_text(encoding="utf-8")).items()}
        except (FileNotFoundError, OSError, ValueError, TypeError):
            return {}

    def _write(self, values: dict[str, float]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary_path = tempfile.mkstemp(prefix="nonces-", suffix=".json", dir=self.path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(values, handle, separators=(",", ":"))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, self.path)
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)
