from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.approval_gate import ApprovalGate
from app.browser.session import IsolatedBrowser
from app.client.websocket_client import OutboundWssClient
from app.config import AgentConfig
from app.executor.audit import AuditLog
from app.executor.controls import ExecutionControls
from app.executor.safe_runner import SafeRunner
from app.filesystem.workspace import RestrictedWorkspace
from app.models import Approval, Job, PermissionLevel, ValidationContext
from app.policies.engine import LocalPolicy
from app.security.identity import DeviceIdentity
from app.ui.approval_window import NativeApprovalWindow
from app.security.job_verifier import JobRejected, JobVerifier
from app.security.nonce_store import NonceStore

logger = logging.getLogger("jarvis_local_agent")


def build_phase_a_notice(config: AgentConfig | None = None) -> dict[str, str | bool]:
    active_config = config or AgentConfig()
    return {
        "agent_name": active_config.agent_name,
        "version": active_config.agent_version,
        "phase": "A-E secure foundation",
        "automation_enabled": True,
        "inbound_listener_enabled": False,
        "shell_execution_enabled": False,
    }


class LocalAgentRuntime:
    def __init__(self, config: AgentConfig | None = None, policy_path: Path | None = None) -> None:
        self.config = config or AgentConfig()
        self.policy = LocalPolicy.from_yaml(policy_path or Path(__file__).parent / "policies" / "default_policy.yaml")
        self.identity = DeviceIdentity.load_or_create(self.config.identity_path)
        self.controls = ExecutionControls()
        self.audit = AuditLog(self.config.audit_path)
        self.workspace = RestrictedWorkspace(self.config.workspace_path, self.policy)
        self.browser = IsolatedBrowser(self.config, self.policy)
        self.approval_gate = ApprovalGate()
        self.runner = SafeRunner(self.browser, self.workspace, self.controls, self.approval_gate)
        self.verifier = JobVerifier(
            public_key=self.config.vps_signing_public_key or self.identity.public_key,
            nonce_store=NonceStore(self.config.nonce_path),
            policy=self.policy,
            clock_skew_seconds=self.config.job_clock_skew_seconds,
        )

    async def handle_message(self, payload: dict[str, Any], client: OutboundWssClient) -> None:
        if payload.get("type") != "job":
            return
        try:
            job = Job.model_validate(payload.get("job"))
            approval: Approval | None = None
            if job.permission_level == PermissionLevel.L3:
                approval = await asyncio.to_thread(
                    NativeApprovalWindow().request,
                    job,
                    preview={"tool": job.tool_id, "arguments": job.validated_arguments, "risk": job.risk_level.value},
                    ttl_seconds=60,
                )
            elif job.permission_level == PermissionLevel.L2 and payload.get("approval") is not None:
                approval = Approval.model_validate(payload["approval"])
            self.verifier.verify(
                job,
                ValidationContext(now=datetime.now(timezone.utc), local_device_id=self.identity.device_id, kill_switch_enabled=self.controls.kill_switch_enabled),
                approval,
            )
            result = await self.runner.execute(job, approval)
            await client.send({"type": "job_result", "job_id": job.job_id, "ok": True, "result": result.get("result"), "duration_ms": result.get("duration_ms")})
            logger.info("job_completed:%s", json.dumps({"job_id": job.job_id, "status": "success", "result": result.get("result")}, ensure_ascii=False))
        except (JobRejected, ValueError, PermissionError, RuntimeError, OSError) as error:
            await client.send({"type": "job_result", "job_id": payload.get("job", {}).get("job_id"), "ok": False, "error": str(error)})
            logger.warning("job_rejected_or_failed:%s", str(error))
        except Exception as error:
            await client.send({"type": "job_result", "job_id": payload.get("job", {}).get("job_id"), "ok": False, "error": "internal_agent_error"})
            logger.exception("job_internal_error:%s", type(error).__name__)

    async def connect(self) -> None:
        wss_url = self.config.vps_wss_url or os.getenv("JARVIS_VPS_WSS_URL")
        access_token = self.config.access_token or os.getenv("JARVIS_ACCESS_TOKEN")
        if not wss_url or not access_token:
            raise RuntimeError("vps_wss_url_and_access_token_are_required")
        client = OutboundWssClient(wss_url, self.identity.device_id, access_token, self.handle_message)
        await client.run()

    async def shutdown(self) -> None:
        self.controls.enable_kill_switch()
        await self.browser.close()


async def run() -> None:
    logging.basicConfig(level=os.getenv("JARVIS_LOG_LEVEL", "INFO"))
    runtime = LocalAgentRuntime()
    try:
        await runtime.connect()
    finally:
        await runtime.shutdown()


if __name__ == "__main__":
    asyncio.run(run())
