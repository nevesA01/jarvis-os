from __future__ import annotations

import asyncio
import json
import logging
import random
import ssl
from collections.abc import Awaitable, Callable
from typing import Any

import websockets
from websockets.asyncio.client import ClientConnection

from app.security.redaction import redact

logger = logging.getLogger(__name__)


class OutboundWssClient:
    """Cliente WSS de saída; não expõe listener local."""

    def __init__(self, url: str, device_id: str, access_token: str, on_message: Callable[[dict[str, Any], "OutboundWssClient"], Awaitable[None]]) -> None:
        parsed_scheme = url.split(":", 1)[0].lower()
        if parsed_scheme != "wss":
            raise ValueError("only_wss_is_allowed")
        self.url = url
        self.device_id = device_id
        self.access_token = access_token
        self.on_message = on_message
        self._stop = asyncio.Event()
        self._socket: ClientConnection | None = None
        self._send_lock = asyncio.Lock()

    async def run(self) -> None:
        delay = 1.0
        ssl_context = ssl.create_default_context()
        while not self._stop.is_set():
            try:
                async with websockets.connect(
                    self.url,
                    ssl=ssl_context,
                    additional_headers={"Authorization": f"Bearer {self.access_token}", "X-Jarvis-Device": self.device_id},
                    ping_interval=20,
                    ping_timeout=20,
                    close_timeout=5,
                    max_size=256 * 1024,
                ) as socket:
                    self._socket = socket
                    delay = 1.0
                    await self.send({"type": "agent_hello", "device_id": self.device_id})
                    async for raw_message in socket:
                        if self._stop.is_set():
                            break
                        if isinstance(raw_message, bytes):
                            raw_message = raw_message.decode("utf-8", errors="strict")
                        payload = json.loads(raw_message)
                        if not isinstance(payload, dict):
                            continue
                        await self.on_message(payload, self)
            except (OSError, asyncio.TimeoutError, json.JSONDecodeError, websockets.WebSocketException) as error:
                logger.warning("outbound_wss_disconnected: %s", redact(str(error)))
                await asyncio.sleep(delay + random.uniform(0, min(delay, 0.5)))
                delay = min(delay * 2, 60.0)
            finally:
                self._socket = None

    async def send(self, payload: dict[str, Any]) -> None:
        socket = self._socket
        if socket is None:
            raise RuntimeError("wss_not_connected")
        async with self._send_lock:
            await socket.send(json.dumps(redact(payload), ensure_ascii=False, separators=(",", ":")))

    async def stop(self) -> None:
        self._stop.set()
        if self._socket is not None:
            await self._socket.close(code=1000, reason="agent_stopped")
