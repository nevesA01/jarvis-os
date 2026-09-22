from __future__ import annotations

from threading import Event, Lock


class ExecutionControls:
    def __init__(self) -> None:
        self._paused = Event()
        self._cancelled = Event()
        self._kill_switch = Event()
        self._lock = Lock()

    @property
    def kill_switch_enabled(self) -> bool:
        return self._kill_switch.is_set()

    @property
    def cancelled(self) -> bool:
        return self._cancelled.is_set()

    def pause(self) -> None:
        self._paused.set()

    def resume(self) -> None:
        self._paused.clear()

    def cancel(self) -> None:
        self._cancelled.set()

    def enable_kill_switch(self) -> None:
        with self._lock:
            self._kill_switch.set()
            self._cancelled.set()

    def disable_kill_switch(self) -> None:
        with self._lock:
            self._kill_switch.clear()
            self._cancelled.clear()

    def checkpoint(self) -> None:
        if self.kill_switch_enabled:
            raise RuntimeError("kill_switch_enabled")
        if self.cancelled:
            raise RuntimeError("execution_cancelled")
