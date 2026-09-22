from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def action_hash(action_payload: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json(action_payload)).hexdigest()


def generate_keypair() -> tuple[str, str]:
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return (
        base64.b64encode(private_key.private_bytes_raw()).decode("ascii"),
        base64.b64encode(public_key.public_bytes_raw()).decode("ascii"),
    )


def sign_payload(private_key_b64: str, payload: Any) -> str:
    private_key = Ed25519PrivateKey.from_private_bytes(base64.b64decode(private_key_b64))
    return base64.b64encode(private_key.sign(canonical_json(payload))).decode("ascii")


def verify_payload(public_key_b64: str, payload: Any, signature_b64: str) -> bool:
    try:
        public_key = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
        public_key.verify(base64.b64decode(signature_b64), canonical_json(payload))
        return True
    except (ValueError, TypeError, InvalidSignature):
        return False
