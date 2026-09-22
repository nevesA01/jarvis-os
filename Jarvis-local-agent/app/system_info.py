from __future__ import annotations

import platform


def get_basic_system_info() -> dict[str, str]:
    return {
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "python": platform.python_version(),
    }
