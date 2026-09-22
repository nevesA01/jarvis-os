from __future__ import annotations

from app.config import AgentConfig


def build_phase_a_notice(config: AgentConfig | None = None) -> dict[str, str | bool]:
    active_config = config or AgentConfig()
    return {
        "agent_name": active_config.agent_name,
        "version": active_config.agent_version,
        "phase": "A",
        "automation_enabled": False,
        "inbound_listener_enabled": False,
        "shell_execution_enabled": False,
    }


if __name__ == "__main__":
    print(build_phase_a_notice())
