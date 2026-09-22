from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import monotonic
from typing import Any

from app.approval_gate import ApprovalGate
from app.browser.session import IsolatedBrowser
from app.filesystem.workspace import RestrictedWorkspace
from app.models import Approval, Job
from app.executor.controls import ExecutionControls
from app.system_info import get_basic_system_info


@dataclass
class SafeRunner:
    browser: IsolatedBrowser
    workspace: RestrictedWorkspace
    controls: ExecutionControls
    approval_gate: ApprovalGate

    async def execute(self, job: Job, approval: Approval | None = None) -> dict[str, Any]:
        started = monotonic()
        self.controls.checkpoint()
        if job.permission_level.value >= 3:
            if approval is None:
                raise PermissionError("approval_required")
            self.approval_gate.validate(job, approval)
        result = await self._dispatch(job)
        result["duration_ms"] = int((monotonic() - started) * 1000)
        self.controls.checkpoint()
        return result

    async def _dispatch(self, job: Job) -> dict[str, Any]:
        args = job.validated_arguments
        tool = job.tool_id
        if tool == "System.get_info":
            return {"tool": tool, "result": get_basic_system_info()}
        if tool == "Files.list_workspace":
            return {"tool": tool, "result": self.workspace.list_files(str(args.get("path", "Inbox")))}
        if tool == "Files.read_allowed":
            return {"tool": tool, "result": self.workspace.read_file(str(args["path"])).decode("utf-8", errors="replace")}
        if tool in {"Files.create_draft", "Files.create_export"}:
            expected_dir = "Drafts" if tool.endswith("draft") else "Exports"
            path = str(args["path"])
            if not path.startswith(f"{expected_dir}/"):
                raise ValueError("write_target_mismatch")
            content = str(args.get("content", "")).encode("utf-8")
            return {"tool": tool, "result": self.workspace.create_file(path, content)}
        if tool == "Files.quarantine_download":
            return {"tool": tool, "result": self.workspace.quarantine_download(str(args["filename"]), bytes(args["content"]))}
        if tool == "Browser.open_url":
            await self.browser.start()
            return {"tool": tool, "result": await self.browser.open_url(str(args["url"]))}
        if tool == "Browser.read_page":
            return {"tool": tool, "result": await self.browser.read_page()}
        if tool == "Browser.list_links":
            return {"tool": tool, "result": await self.browser.list_links()}
        if tool == "Browser.search_page":
            return {"tool": tool, "result": await self.browser.search_page(str(args["query"]))}
        if tool == "Browser.take_screenshot":
            return {"tool": tool, "result": {"bytes": len(await self.browser.take_screenshot())}}
        if tool == "Browser.fill_field":
            await self.browser.fill_field(str(args["selector"]), str(args["value"]))
            return {"tool": tool, "result": "filled_without_submit"}
        if tool == "Browser.preview_form":
            return {"tool": tool, "result": await self.browser.preview_form()}
        if tool == "Browser.request_submit":
            return {"tool": tool, "result": await self.browser.request_submit(approval_hash=str(args["approval_hash"]), expected_hash=job.action_hash)}
        raise ValueError("unknown_tool")
