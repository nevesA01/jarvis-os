from __future__ import annotations

import base64
import ctypes
import json
import os
from ctypes import POINTER, Structure, byref, c_char, c_char_p, c_void_p, cast, memmove, sizeof
from ctypes.wintypes import DWORD, HLOCAL
from pathlib import Path

from app.security.signatures import generate_keypair


class _Blob(Structure):
    _fields_ = [("cbData", DWORD), ("pbData", POINTER(c_char))]


class DeviceIdentity:
    def __init__(self, device_id: str, private_key: str, public_key: str) -> None:
        self.device_id = device_id
        self.private_key = private_key
        self.public_key = public_key

    @classmethod
    def load_or_create(cls, path: Path) -> "DeviceIdentity":
        if os.name != "nt":
            raise RuntimeError("device_identity_requires_windows_dpapi")
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
            private_key = _dpapi_unprotect(base64.b64decode(payload["private_key"]))
            return cls(payload["device_id"], private_key.decode("ascii"), payload["public_key"])
        private_key, public_key = generate_keypair()
        identity = cls(f"win-{os.urandom(16).hex()}", private_key, public_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        protected = _dpapi_protect(private_key.encode("ascii"))
        path.write_text(
            json.dumps({"device_id": identity.device_id, "public_key": public_key, "private_key": base64.b64encode(protected).decode("ascii")}, separators=(",", ":")),
            encoding="utf-8",
        )
        return identity


def _crypt(data: bytes, protect: bool) -> bytes:
    if os.name != "nt":
        raise RuntimeError("dpapi_requires_windows")
    crypt32 = ctypes.windll.crypt32
    kernel32 = ctypes.windll.kernel32
    source = (c_char * len(data)).from_buffer_copy(data)
    source_blob = _Blob(len(data), cast(source, POINTER(c_char)))
    output_blob = _Blob()
    function = crypt32.CryptProtectData if protect else crypt32.CryptUnprotectData
    function.argtypes = [POINTER(_Blob), c_void_p, c_void_p, c_void_p, c_void_p, DWORD, POINTER(_Blob)]
    function.restype = ctypes.c_bool
    if not function(byref(source_blob), None, None, None, None, 0, byref(output_blob)):
        raise OSError(f"dpapi_failed:{ctypes.GetLastError()}")
    try:
        result = bytes(cast(output_blob.pbData, POINTER(c_char * output_blob.cbData)).contents)
    finally:
        kernel32.LocalFree(HLOCAL(output_blob.pbData))
    return result


def _dpapi_protect(data: bytes) -> bytes:
    return _crypt(data, True)


def _dpapi_unprotect(data: bytes) -> bytes:
    return _crypt(data, False)
