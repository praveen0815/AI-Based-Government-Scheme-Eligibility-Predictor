"""Local OCR provider interface. Does not log document text or identity numbers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from io import BytesIO
from typing import Protocol

LOW_OCR_CONFIDENCE = 45.0


class OcrUnavailableError(Exception):
    """Raised when the local OCR engine is not installed or cannot start."""


class OcrUnreadableError(Exception):
    """Raised when a supported file has no readable text."""


@dataclass(frozen=True)
class OcrTextResult:
    text: str
    engine: str
    mean_confidence: float | None = None


class OcrProvider(Protocol):
    def extract_text(self, payload: bytes, content_type: str) -> OcrTextResult:
        """Return extracted text. Implementations must not log the payload or text."""


_provider: OcrProvider | None = None


def get_ocr_provider() -> OcrProvider:
    global _provider
    if _provider is None:
        _provider = LocalOcrProvider()
    return _provider


def set_ocr_provider(provider: OcrProvider | None) -> None:
    """Test hook. Pass None to restore the default local provider."""
    global _provider
    _provider = provider


def tesseract_cmd() -> str | None:
    value = (os.environ.get("TESSERACT_CMD") or "").strip()
    return value or None


class LocalOcrProvider:
    """Prefer embedded PDF text, then local Tesseract. Never calls an external API."""

    def extract_text(self, payload: bytes, content_type: str) -> OcrTextResult:
        if not payload:
            raise OcrUnreadableError("The document could not be read. Try a clearer PDF or image.")
        if content_type == "application/pdf":
            embedded = _pdf_embedded_text(payload)
            if embedded.strip():
                return OcrTextResult(text=embedded, engine="pypdf", mean_confidence=None)
            image = _render_pdf_page(payload)
            if image is None:
                raise OcrUnreadableError("The document could not be read. Try a clearer PDF or image.")
            return _tesseract_image(image)
        if content_type in {"image/jpeg", "image/png"}:
            return _tesseract_image(_open_image(payload))
        raise OcrUnreadableError("The document could not be read. Try a clearer PDF or image.")


def _pdf_embedded_text(payload: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        reader = PdfReader(BytesIO(payload))
        pages: list[str] = []
        for page in reader.pages[:3]:
            pages.append(page.extract_text() or "")
        return "\n".join(pages)
    except Exception:
        return ""


def _render_pdf_page(payload: bytes):
    try:
        import pypdfium2 as pdfium
    except ImportError:
        return None
    try:
        document = pdfium.PdfDocument(payload)
        if len(document) < 1:
            return None
        bitmap = document[0].render(scale=2)
        return bitmap.to_pil()
    except Exception:
        return None


def _open_image(payload: bytes):
    try:
        from PIL import Image
    except ImportError as exc:
        raise OcrUnavailableError(
            "Local OCR is not available. Install Pillow and Tesseract, then retry."
        ) from exc
    try:
        image = Image.open(BytesIO(payload))
        image.load()
        return image
    except Exception as exc:
        raise OcrUnreadableError("The document could not be read. Try a clearer PDF or image.") from exc


def _tesseract_image(image) -> OcrTextResult:
    try:
        import pytesseract
    except ImportError as exc:
        raise OcrUnavailableError(
            "Local OCR is not available. Install Tesseract and optionally set TESSERACT_CMD."
        ) from exc
    command = tesseract_cmd()
    if command:
        pytesseract.pytesseract.tesseract_cmd = command
    try:
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    except Exception as exc:
        raise OcrUnavailableError(
            "Local OCR is not available. Install Tesseract and optionally set TESSERACT_CMD."
        ) from exc
    words: list[str] = []
    confidences: list[float] = []
    for text, conf in zip(data.get("text", []), data.get("conf", []), strict=False):
        cleaned = str(text or "").strip()
        if not cleaned:
            continue
        words.append(cleaned)
        try:
            score = float(conf)
        except (TypeError, ValueError):
            continue
        if score >= 0:
            confidences.append(score)
    if not words:
        raise OcrUnreadableError("The document could not be read. Try a clearer PDF or image.")
    mean = sum(confidences) / len(confidences) if confidences else None
    return OcrTextResult(text=" ".join(words), engine="tesseract", mean_confidence=mean)
