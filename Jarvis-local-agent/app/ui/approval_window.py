from __future__ import annotations

import hashlib
import json
import secrets
import tkinter as tk
from datetime import datetime, timedelta, timezone
from tkinter import messagebox
from typing import Any

from app.models import Approval, Job


class NativeApprovalWindow:
    """Janela local Windows/Tk; não aceita aprovação por voz ou por página web."""

    def request(self, job: Job, *, preview: dict[str, Any], ttl_seconds: int = 60) -> Approval:
        if job.permission_level.value < 3:
            raise ValueError("native_window_only_for_l3")
        action_digest = hashlib.sha256(json.dumps(job.action_payload(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        root = tk.Tk()
        root.title("Jarvis — Aprovação local")
        root.geometry("620x520")
        root.attributes("-topmost", True)
        decision: dict[str, bool] = {"approved": False}
        tk.Label(root, text="Ação externa aguardando aprovação", font=("Segoe UI", 16, "bold")).pack(pady=(20, 8))
        tk.Label(root, text=f"Ferramenta: {job.tool_id}\nRisco: {job.risk_level.value}\nExpira em: {ttl_seconds}s", justify="left").pack(anchor="w", padx=24)
        text = tk.Text(root, height=15, width=74, state="normal")
        text.insert("1.0", json.dumps({"preview": preview, "action_hash": action_digest}, ensure_ascii=False, indent=2))
        text.configure(state="disabled")
        text.pack(padx=24, pady=12)
        buttons = tk.Frame(root)
        buttons.pack(pady=8)
        tk.Button(buttons, text="Rejeitar", width=14, command=lambda: (decision.update(approved=False), root.destroy())).pack(side="left", padx=8)
        tk.Button(buttons, text="Aprovar", width=14, command=lambda: (decision.update(approved=True), root.destroy())).pack(side="left", padx=8)
        root.after(ttl_seconds * 1000, root.destroy)
        root.mainloop()
        if not decision["approved"]:
            raise PermissionError("approval_rejected_or_expired")
        now = datetime.now(timezone.utc)
        return Approval(
            approval_id=job.approval_id or secrets.token_urlsafe(18),
            action_hash=job.action_hash,
            approved_by="local-user",
            approved_at=now,
            expires_at=now + timedelta(seconds=ttl_seconds),
            reauthenticated=True,
        )
