"""Build an on-demand recommendation PDF. The file is not stored."""

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.i18n.report_copy import field_labels, normalize_report_language, report_copy
from app.models.user import UserRecord
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.compare import CompareResponse
from app.schemas.recommendation import RecommendResponse
from app.schemas.report import PROJECT_TITLE
from app.schemas.wallet import CitizenWalletResponse

NAVY = colors.HexColor("#1e3a5f")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#4b5563")
LINE = colors.HexColor("#d1d5db")
SURFACE = colors.HexColor("#f8fafc")
AMBER = colors.HexColor("#92400e")

_FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
_TAMIL_REGULAR_NAME = "NotoSansTamil"
_TAMIL_BOLD_NAME = "NotoSansTamil-Bold"
_tamil_fonts_ready = False


def generate_recommendation_report_pdf(
    *,
    user: UserRecord,
    wallet: CitizenWalletResponse,
    completeness: ProfileCompletenessResponse,
    recommendation: RecommendResponse,
    comparison: CompareResponse | None,
    language: str = "en",
) -> bytes:
    lang = normalize_report_language(language)
    copy = report_copy(lang)
    labels = field_labels(lang)
    fonts = _font_set(lang)
    buffer = BytesIO()
    styles = _styles(fonts)
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=PROJECT_TITLE,
        author=copy["author"],
    )
    story: list = [
        Paragraph(copy["title"], styles["title"]),
        Spacer(1, 6),
        Paragraph(copy["badge"], styles["badge"]),
        Spacer(1, 8),
        Paragraph(
            copy["generated"].format(
                when=datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")
            ),
            styles["meta"],
        ),
        Paragraph(
            copy["profile_reference"].format(name=user.full_name, wallet_id=wallet.citizen_id),
            styles["meta"],
        ),
        Paragraph(copy["wallet_id_note"], styles["note"]),
        Spacer(1, 10),
        Paragraph(copy["completeness_heading"], styles["heading"]),
        Paragraph(
            copy["completeness_body"].format(
                percent=completeness.percentage,
                completed=completeness.completed_fields,
                total=completeness.total_fields,
            ),
            styles["body"],
        ),
    ]
    if completeness.incomplete_fields:
        story.append(
            Paragraph(
                copy["missing"].format(
                    fields=", ".join(labels.get(field, field) for field in completeness.incomplete_fields)
                ),
                styles["body"],
            )
        )

    story.extend(
        [
            Spacer(1, 8),
            Paragraph(copy["profile_heading"], styles["heading"]),
            _profile_table(wallet, styles, labels, copy),
            Spacer(1, 12),
            Paragraph(copy["recommended_heading"], styles["heading"]),
            Paragraph(
                copy["recommended_summary"].format(
                    count=recommendation.eligible_scheme_count,
                    total=recommendation.total_schemes_evaluated,
                ),
                styles["body"],
            ),
        ]
    )
    if recommendation.recommendations:
        for item in recommendation.recommendations:
            story.extend(_scheme_block(item, styles, copy, compared=False))
    else:
        story.append(Paragraph(copy["no_schemes"], styles["body"]))

    if comparison is not None:
        story.extend(
            [
                Spacer(1, 10),
                Paragraph(copy["comparison_heading"], styles["heading"]),
                Paragraph(copy["comparison_intro"], styles["body"]),
            ]
        )
        for item in comparison.schemes:
            story.extend(_scheme_block(item, styles, copy, compared=True))

    story.extend(
        [
            Spacer(1, 14),
            Paragraph(copy["disclaimer_heading"], styles["heading"]),
            Paragraph(copy["disclaimer"], styles["disclaimer"]),
        ]
    )
    document.build(story, onFirstPage=_make_footer(copy, fonts), onLaterPages=_make_footer(copy, fonts))
    return buffer.getvalue()


def _font_set(language: str) -> dict[str, str]:
    if language != "ta":
        return {"regular": "Times-Roman", "bold": "Times-Bold", "italic": "Times-Italic"}
    _register_tamil_fonts()
    return {
        "regular": _TAMIL_REGULAR_NAME,
        "bold": _TAMIL_BOLD_NAME,
        "italic": _TAMIL_REGULAR_NAME,
    }


def _register_tamil_fonts() -> None:
    global _tamil_fonts_ready
    if _tamil_fonts_ready:
        return
    bundled_regular = _FONTS_DIR / "NotoSansTamil-Regular.ttf"
    bundled_bold = _FONTS_DIR / "NotoSansTamil-Bold.ttf"
    nirmala = Path(r"C:\Windows\Fonts\Nirmala.ttc")
    if bundled_regular.exists():
        pdfmetrics.registerFont(TTFont(_TAMIL_REGULAR_NAME, str(bundled_regular)))
        pdfmetrics.registerFont(
            TTFont(_TAMIL_BOLD_NAME, str(bundled_bold if bundled_bold.exists() else bundled_regular))
        )
    elif nirmala.exists():
        pdfmetrics.registerFont(TTFont(_TAMIL_REGULAR_NAME, str(nirmala), subfontIndex=0))
        pdfmetrics.registerFont(TTFont(_TAMIL_BOLD_NAME, str(nirmala), subfontIndex=1))
    else:
        raise RuntimeError(
            "A Unicode Tamil font is required for Tamil PDF reports. "
            "Place NotoSansTamil-Regular.ttf in backend/app/assets/fonts/."
        )
    _tamil_fonts_ready = True


def _styles(fonts: dict[str, str]) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Title"],
            fontName=fonts["bold"],
            fontSize=16,
            leading=22,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=0,
        ),
        "badge": ParagraphStyle(
            "ReportBadge",
            parent=base["Normal"],
            fontName=fonts["bold"],
            fontSize=11,
            leading=15,
            textColor=NAVY,
            alignment=TA_CENTER,
        ),
        "heading": ParagraphStyle(
            "ReportHeading",
            parent=base["Heading2"],
            fontName=fonts["bold"],
            fontSize=13,
            leading=18,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=6,
        ),
        "subheading": ParagraphStyle(
            "ReportSubheading",
            parent=base["Heading3"],
            fontName=fonts["bold"],
            fontSize=11,
            leading=16,
            textColor=INK,
            spaceBefore=2,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=base["Normal"],
            fontName=fonts["regular"],
            fontSize=10,
            leading=14,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=4,
        ),
        "meta": ParagraphStyle(
            "ReportMeta",
            parent=base["Normal"],
            fontName=fonts["regular"],
            fontSize=9,
            leading=13,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "note": ParagraphStyle(
            "ReportNote",
            parent=base["Normal"],
            fontName=fonts["italic"],
            fontSize=8,
            leading=12,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "ReportLabel",
            parent=base["Normal"],
            fontName=fonts["bold"],
            fontSize=9,
            leading=13,
            textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "ReportValue",
            parent=base["Normal"],
            fontName=fonts["regular"],
            fontSize=9,
            leading=13,
            textColor=INK,
        ),
        "disclaimer": ParagraphStyle(
            "ReportDisclaimer",
            parent=base["Normal"],
            fontName=fonts["italic"],
            fontSize=9,
            leading=13,
            textColor=AMBER,
            alignment=TA_JUSTIFY,
        ),
        "footer": ParagraphStyle(
            "ReportFooter",
            parent=base["Normal"],
            fontName=fonts["italic"],
            fontSize=8,
            textColor=MUTED,
            alignment=TA_LEFT,
        ),
    }


def _profile_table(
    wallet: CitizenWalletResponse,
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    copy: dict[str, str],
) -> Table:
    rows = [
        [_cell(labels["age"], styles), _cell(str(wallet.age), styles, False)],
        [_cell(labels["gender"], styles), _cell(str(wallet.gender), styles, False)],
        [_cell(labels["is_student"], styles), _cell(_yes_no(wallet.is_student, copy), styles, False)],
        [
            _cell(labels["first_higher_education_course"], styles),
            _cell(_yes_no(wallet.first_higher_education_course, copy), styles, False),
        ],
        [_cell(labels["school_background"], styles), _cell(str(wallet.school_background), styles, False)],
        [_cell(labels["marital_status"], styles), _cell(str(wallet.marital_status), styles, False)],
        [_cell(labels["is_orphan"], styles), _cell(_yes_no(wallet.is_orphan, copy), styles, False)],
        [_cell(labels["is_destitute"], styles), _cell(_yes_no(wallet.is_destitute, copy), styles, False)],
        [_cell(labels["occupation_category"], styles), _cell(str(wallet.occupation_category), styles, False)],
        [_cell(labels["wet_land_acres"], styles), _cell(str(wallet.wet_land_acres), styles, False)],
        [_cell(labels["dry_land_acres"], styles), _cell(str(wallet.dry_land_acres), styles, False)],
    ]
    table = Table(rows, colWidths=[70 * mm, 92 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
                ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def _scheme_block(
    item: object,
    styles: dict[str, ParagraphStyle],
    copy: dict[str, str],
    *,
    compared: bool,
) -> list:
    scheme_id = getattr(item, "scheme_id")
    name = getattr(item, "scheme_name")
    raw_status = getattr(item, "status_label", "Predicted eligible")
    recommended = getattr(item, "recommended", True)
    status = _localized_status(raw_status, recommended, copy)
    probability = float(getattr(item, "eligible_probability"))
    reasons = list(getattr(item, "rule_reasons", []) or [])
    benefit = getattr(item, "benefit", None)
    documents = getattr(item, "required_documents", None)
    application = getattr(item, "application_method", None)
    source = getattr(item, "official_source_url", None)
    department = getattr(item, "department", None)
    category = getattr(item, "scheme_category", None)
    description = getattr(item, "description", None)
    eligibility_notes = getattr(item, "eligibility_notes", None) if compared else None

    blocks = [
        Paragraph(f"{_escape(name)} ({_escape(scheme_id)})", styles["subheading"]),
        Paragraph(copy["research_status"].format(status=_escape(status)), styles["body"]),
        Paragraph(
            copy["probability"].format(probability=f"{probability:.0%}"),
            styles["body"],
        ),
    ]
    if compared and not recommended:
        blocks.append(Paragraph(copy["not_recommended_note"], styles["body"]))
    if department:
        blocks.append(Paragraph(copy["department"].format(value=_escape(department)), styles["body"]))
    if category:
        blocks.append(Paragraph(copy["category"].format(value=_escape(category)), styles["body"]))
    if description:
        blocks.append(Paragraph(copy["details"].format(value=_escape(description)), styles["body"]))
    if eligibility_notes:
        blocks.append(Paragraph(copy["eligibility"].format(value=_escape(eligibility_notes)), styles["body"]))
    if reasons:
        blocks.append(Paragraph(copy["reasons"], styles["label"]))
        blocks.append(
            ListFlowable(
                [ListItem(Paragraph(_escape(reason), styles["value"])) for reason in reasons],
                bulletType="bullet",
                leftIndent=12,
            )
        )
    if benefit:
        blocks.append(Paragraph(copy["benefit"].format(value=_escape(benefit)), styles["body"]))
    if documents:
        blocks.append(Paragraph(copy["documents"].format(value=_escape(documents)), styles["body"]))
    if application:
        blocks.append(Paragraph(copy["application"].format(value=_escape(application)), styles["body"]))
    if source:
        blocks.append(
            Paragraph(
                copy["official_source"].format(
                    value=f'<link href="{_escape(source)}">{_escape(source)}</link>'
                ),
                styles["body"],
            )
        )
    blocks.append(Spacer(1, 8))
    return blocks


def _localized_status(raw_status: str, recommended: bool, copy: dict[str, str]) -> str:
    if copy.get("predicted_eligible") and (
        recommended or "predicted eligible" in str(raw_status).lower()
    ):
        return copy["predicted_eligible"]
    if not recommended:
        return copy["not_recommended"]
    return raw_status


def _cell(text: str, styles: dict[str, ParagraphStyle], label: bool = True) -> Paragraph:
    return Paragraph(_escape(text), styles["label"] if label else styles["value"])


def _yes_no(value: bool, copy: dict[str, str]) -> str:
    return copy["yes"] if value else copy["no"]


def _escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _make_footer(copy: dict[str, str], fonts: dict[str, str]):
    def _footer(canvas, document) -> None:
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(document.leftMargin, 12 * mm, A4[0] - document.rightMargin, 12 * mm)
        canvas.setFont(fonts["italic"], 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(document.leftMargin, 8 * mm, copy["footer"])
        canvas.drawRightString(
            A4[0] - document.rightMargin,
            8 * mm,
            copy["page"].format(page=document.page),
        )
        canvas.restoreState()

    return _footer
