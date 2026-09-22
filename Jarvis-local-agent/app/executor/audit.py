from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from app.models import AuditEntry
from app.security.redaction import redact


class AuditLog:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = Lock()

    def append(self, entry: AuditEntry) -> None:
        payload = redact(entry.model_dump(mode="json"))
        line = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")
                handle.flush()

    def clear(self) -> None:
        self.path.unlink(missing_ok=True)
