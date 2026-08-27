"""Redact secrets from log records. Never log passwords, JWTs, or tokens."""

from __future__ import annotations

import logging
import re

_REDACT_PATTERNS = (
    re.compile(r"(?i)(\bauthorization\s*[:=]\s*)(bearer\s+\S+|\S+)"),
    re.compile(r"(?i)(\bbearer\s+)(\S+)"),
    re.compile(r"(?i)((?:password|password_hash|current_password|new_password)\s*[:=]\s*)(\S+)"),
    re.compile(r"(?i)((?:access_token|id_token|credential|jwt_secret_key|google_sub)\s*[:=]\s*)(\S+)"),
    re.compile(r"(?i)(postgresql(?:\+\w+)?://)([^/\s]+)"),
)


def redact_text(value: str) -> str:
    redacted = value
    for pattern in _REDACT_PATTERNS:
        redacted = pattern.sub(lambda match: f"{match.group(1)}[REDACTED]", redacted)
    return redacted


class SecretRedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_text(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(redact_text(arg) if isinstance(arg, str) else arg for arg in record.args)
            elif isinstance(record.args, dict):
                record.args = {
                    key: redact_text(item) if isinstance(item, str) else item
                    for key, item in record.args.items()
                }
        return True


def install_secret_redacting_filter() -> None:
    root = logging.getLogger()
    if any(isinstance(existing, SecretRedactingFilter) for existing in root.filters):
        return
    root.addFilter(SecretRedactingFilter())
