from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path

from app.policies.engine import LocalPolicy


class WorkspaceViolation(ValueError):
    pass


class RestrictedWorkspace:
    ALLOWED_DIRS = ("Inbox", "Drafts", "Exports", "Downloads-quarantine", "Projects-approved")
    BLOCKED_NAMES = {".env", ".ssh", "cookies", "history", "login data", "credentials", "secrets"}

    def __init__(self, root: Path, policy: LocalPolicy) -> None:
        self.root = root.expanduser().resolve()
        self.policy = policy
        for directory in self.ALLOWED_DIRS:
            (self.root / directory).mkdir(parents=True, exist_ok=True)

    def resolve(self, relative_path: str, *, write: bool = False) -> Path:
        if not relative_path or "\x00" in relative_path:
            raise WorkspaceViolation("invalid_workspace_path")
        candidate = (self.root / relative_path).resolve(strict=False)
        if not self._inside(candidate):
            raise WorkspaceViolation("path_outside_workspace")
        if any(part.casefold() in self.BLOCKED_NAMES for part in candidate.parts):
            raise WorkspaceViolation("sensitive_path_blocked")
        if candidate.is_symlink() or self._has_symlink_parent(candidate):
            raise WorkspaceViolation("symlink_path_blocked")
        if write and candidate.exists() and candidate.is_file():
            raise WorkspaceViolation("overwrite_blocked")
        if candidate.suffix and not self.policy.allows_extension(candidate.suffix):
            raise WorkspaceViolation("file_extension_blocked")
        return candidate

    def list_files(self, relative_dir: str = "Inbox") -> list[str]:
        directory = self.resolve(relative_dir)
        if not directory.exists() or not directory.is_dir():
            raise WorkspaceViolation("directory_not_found")
        return [str(path.relative_to(self.root)) for path in sorted(directory.iterdir()) if not path.is_symlink()]

    def read_file(self, relative_path: str) -> bytes:
        path = self.resolve(relative_path)
        if not path.exists() or not path.is_file():
            raise WorkspaceViolation("file_not_found")
        if path.stat().st_size > self.policy.max_file_bytes:
            raise WorkspaceViolation("file_too_large")
        return path.read_bytes()

    def create_file(self, relative_path: str, content: bytes) -> str:
        path = self.resolve(relative_path, write=True)
        if not self._is_draft_or_export(path):
            raise WorkspaceViolation("writes_only_allowed_in_drafts_or_exports")
        if len(content) > self.policy.max_file_bytes:
            raise WorkspaceViolation("file_too_large")
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
        temporary.write_bytes(content)
        os.replace(temporary, path)
        return str(path.relative_to(self.root))

    def quarantine_download(self, filename: str, content: bytes) -> str:
        safe_name = Path(filename).name
        if safe_name != filename or safe_name in {".", ".."}:
            raise WorkspaceViolation("unsafe_download_name")
        destination = self.root / "Downloads-quarantine" / safe_name
        if destination.suffix.lower() not in {".txt", ".md", ".json", ".csv", ".pdf", ".png", ".jpg", ".jpeg"}:
            raise WorkspaceViolation("download_type_blocked")
        if len(content) > self.policy.max_file_bytes:
            raise WorkspaceViolation("download_too_large")
        return self.create_file(str(destination.relative_to(self.root)), content)

    def _inside(self, path: Path) -> bool:
        try:
            path.relative_to(self.root)
            return True
        except ValueError:
            return False

    def _has_symlink_parent(self, path: Path) -> bool:
        current = path.parent
        while current != self.root and self._inside(current):
            if current.is_symlink():
                return True
            current = current.parent
        return False

    def _is_draft_or_export(self, path: Path) -> bool:
        relative = path.relative_to(self.root)
        return relative.parts and relative.parts[0] in {"Drafts", "Exports"}
