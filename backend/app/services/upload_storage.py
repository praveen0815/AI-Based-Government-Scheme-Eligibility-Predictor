"""Write supporting files under a server-controlled directory. Never trust client paths."""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

from app.paths import project_root

DEFAULT_RELATIVE_DIR = "var/supporting_uploads"


def supporting_upload_dir() -> Path:
    raw = (os.environ.get("SUPPORTING_UPLOAD_DIR") or "").strip()
    if raw:
        return Path(raw).resolve()
    return (project_root() / DEFAULT_RELATIVE_DIR).resolve()


def user_upload_dir(user_id: str) -> Path:
    return supporting_upload_dir() / user_id


def allocate_stored_filename(extension: str) -> str:
    suffix = extension if extension.startswith(".") else f".{extension}"
    return f"{uuid4().hex}{suffix}"


def save_user_file(user_id: str, stored_filename: str, payload: bytes) -> Path:
    directory = user_upload_dir(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    target = (directory / stored_filename).resolve()
    if target.parent != directory.resolve():
        raise ValueError("The stored filename is not allowed.")
    target.write_bytes(payload)
    return target


def user_file_path(user_id: str, stored_filename: str) -> Path:
    directory = user_upload_dir(user_id).resolve()
    target = (directory / stored_filename).resolve()
    if target.parent != directory:
        raise ValueError("The stored filename is not allowed.")
    return target


def delete_user_file(user_id: str, stored_filename: str) -> None:
    try:
        path = user_file_path(user_id, stored_filename)
    except ValueError:
        return
    if path.is_file():
        path.unlink()


def delete_all_user_files(user_id: str) -> None:
    directory = user_upload_dir(user_id)
    if directory.is_dir():
        shutil.rmtree(directory, ignore_errors=True)
