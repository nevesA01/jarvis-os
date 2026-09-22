from __future__ import annotations

from app.models import Job


class UnknownToolError(ValueError):
    pass


class PhaseAJobRouter:
    """Roteador propositalmente vazio: a Fase A não executa ferramentas locais."""

    def route(self, job: Job) -> None:
        raise UnknownToolError(f"tool_not_implemented_in_phase_a:{job.tool_id}")
