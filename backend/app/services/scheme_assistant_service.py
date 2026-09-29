"""Knowledge-grounded scheme assistant. Does not score eligibility or call the ML model."""

from __future__ import annotations

import re
from typing import Literal

from sqlalchemy.orm import Session

from app.schemas.scheme_assistant import (
    ASSISTANT_DISCLAIMER,
    AssistantAction,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantHistoryTurn,
    AssistantLanguage,
    AssistantSource,
    AssistantStatusResponse,
)
from app.schemas.scheme_knowledge import SchemeKnowledgeItem, SchemeKnowledgeRecord
from app.services.llm_service import LlmUnavailableError, get_llm_provider, llm_is_configured, llm_model_name
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.scheme_knowledge_service import (
    SchemeKnowledgeNotFoundError,
    get_scheme_knowledge,
    list_scheme_knowledge,
)
from app.services.wallet_service import get_wallet_for_user

Intent = Literal["eligibility", "profile", "scheme", "clarify", "help"]

_SCHEME_ID = re.compile(r"\bTN-[A-Z]{2,6}-\d{3}\b", re.IGNORECASE)
_ELIGIBILITY = re.compile(
    r"\b(am i eligible|am i qualified|check (my )?eligibility|eligibility (check|result)|can i apply|"
    r"will i get|do i qualify)\b|நான்\s*தகுதியானவரா|தகுதி\s*உள்ளேனா|தகுதி\s*பார்|எனக்கு\s*கிடைக்குமா",
    re.IGNORECASE,
)
_PROFILE = re.compile(
    r"\b(missing from my profile|incomplete profile|profile (missing|incomplete)|what('s| is) missing)\b|"
    r"விடுபட்ட\s*(தகவல்|புலம்)|சுயவிவரம்.+(விடுபட்ட|முழுமை)|பணப்பை.+(விடுபட்ட|முழுமை)",
    re.IGNORECASE,
)
_SCHEME_FACT = re.compile(
    r"\b(document|documents|apply|application|benefit|about this scheme|what is this scheme|"
    r"department|required|procedure|how to apply|official source)\b|"
    r"ஆவண|விண்ணப்ப|நன்மை|திட்டம்\s*என்ன|எப்படி\s*விண்ணப்பி",
    re.IGNORECASE,
)


def assistant_status() -> AssistantStatusResponse:
    return AssistantStatusResponse(
        llm_configured=llm_is_configured(),
        llm_model=llm_model_name(),
        fallback="template",
        disclaimer=ASSISTANT_DISCLAIMER,
    )


def chat(session: Session | None, user_id: str, payload: AssistantChatRequest) -> AssistantChatResponse:
    language = payload.language
    intent = _detect_intent(payload.message)
    if intent == "eligibility":
        return _eligibility_reply(language, payload.message, session)
    if intent == "profile":
        return _profile_reply(session, user_id, language)

    matches = _resolve_schemes(session, payload.message, payload.scheme_id, payload.history)
    if len(matches) != 1:
        return _clarification_reply(language, matches)

    record = matches[0]
    sources = _sources_for(record)
    if llm_is_configured():
        try:
            reply = get_llm_provider().generate(
                system=_system_prompt(language),
                user=_user_prompt(language, payload.message, record),
            )
            return _response(
                reply,
                language,
                intent="scheme",
                llm_used=True,
                provider="llm",
                record=record,
                sources=sources,
            )
        except LlmUnavailableError:
            return _response(
                _template_scheme_reply(language, payload.message, record),
                language,
                intent="scheme",
                llm_used=False,
                provider="template",
                record=record,
                sources=sources,
                notice=_copy(language, "llm_unavailable"),
            )
    return _response(
        _template_scheme_reply(language, payload.message, record),
        language,
        intent="scheme",
        llm_used=False,
        provider="template",
        record=record,
        sources=sources,
        notice=_copy(language, "llm_not_configured"),
    )


def _detect_intent(message: str) -> Intent:
    if _ELIGIBILITY.search(message):
        return "eligibility"
    if _PROFILE.search(message):
        return "profile"
    if _SCHEME_FACT.search(message) or _SCHEME_ID.search(message):
        return "scheme"
    return "scheme"


def _resolve_schemes(
    session: Session | None,
    message: str,
    scheme_id: str | None,
    history: list[AssistantHistoryTurn] | None = None,
) -> list[SchemeKnowledgeRecord]:
    if scheme_id:
        try:
            return [get_scheme_knowledge(session, scheme_id)]
        except SchemeKnowledgeNotFoundError:
            return []
    listed = list_scheme_knowledge(session)
    found = _match_schemes(listed.schemes, message)
    if found:
        return found
    for turn in reversed(history or []):
        previous = _match_schemes(listed.schemes, turn.content)
        if len(previous) == 1:
            return previous
    return found


def _match_schemes(schemes: list[SchemeKnowledgeRecord], text: str) -> list[SchemeKnowledgeRecord]:
    found: list[SchemeKnowledgeRecord] = []
    seen: set[str] = set()
    for match in _SCHEME_ID.findall(text):
        record = next((item for item in schemes if item.scheme_id.lower() == match.lower()), None)
        if record and record.scheme_id not in seen:
            found.append(record)
            seen.add(record.scheme_id)
    lowered = text.lower()
    for record in schemes:
        if record.scheme_id in seen:
            continue
        name = record.scheme_name.lower()
        if name and name in lowered:
            found.append(record)
            seen.add(record.scheme_id)
            continue
        tokens = [part for part in re.split(r"[^a-z0-9]+", name) if len(part) >= 5]
        if any(token in lowered for token in tokens if token not in {"scheme", "thittam", "ninaivu"}):
            found.append(record)
            seen.add(record.scheme_id)
    return found


def _eligibility_reply(language: AssistantLanguage, message: str, session: Session | None) -> AssistantChatResponse:
    matches = _resolve_schemes(session, message, None)
    scheme_name = matches[0].scheme_name if len(matches) == 1 else None
    reply = _copy(language, "eligibility").format(scheme=scheme_name or _copy(language, "a_scheme"))
    return AssistantChatResponse(
        reply=reply,
        language=language,
        intent="eligibility",
        llm_used=False,
        provider="template",
        scheme_id=matches[0].scheme_id if len(matches) == 1 else None,
        scheme_name=scheme_name,
        sources=_sources_for(matches[0]) if len(matches) == 1 else [],
        actions=[
            AssistantAction(label=_copy(language, "check_eligibility"), path="/check"),
            AssistantAction(label=_copy(language, "open_wallet"), path="/wallet"),
        ],
        notice=None,
        disclaimer=ASSISTANT_DISCLAIMER,
    )


def _profile_reply(session: Session | None, user_id: str, language: AssistantLanguage) -> AssistantChatResponse:
    if session is None:
        return AssistantChatResponse(
            reply=_copy(language, "profile_no_wallet"),
            language=language,
            intent="profile",
            llm_used=False,
            provider="template",
            actions=[AssistantAction(label=_copy(language, "open_wallet"), path="/wallet")],
            disclaimer=ASSISTANT_DISCLAIMER,
        )
    wallet = get_wallet_for_user(session, user_id)
    if wallet is None:
        reply = _copy(language, "profile_no_wallet")
    else:
        completeness = calculate_profile_completeness(wallet)
        if not completeness.incomplete_fields:
            reply = _copy(language, "profile_complete").format(percent=completeness.percentage)
        else:
            reply = _copy(language, "profile_incomplete").format(
                percent=completeness.percentage,
                fields=", ".join(completeness.incomplete_fields),
            )
    return AssistantChatResponse(
        reply=reply,
        language=language,
        intent="profile",
        llm_used=False,
        provider="template",
        actions=[AssistantAction(label=_copy(language, "open_wallet"), path="/wallet")],
        disclaimer=ASSISTANT_DISCLAIMER,
    )


def _clarification_reply(language: AssistantLanguage, matches: list[SchemeKnowledgeRecord]) -> AssistantChatResponse:
    if not matches:
        reply = _copy(language, "clarify_none")
    else:
        names = "; ".join(f"{item.scheme_id} — {item.scheme_name}" for item in matches[:6])
        reply = _copy(language, "clarify_many").format(schemes=names)
    return AssistantChatResponse(
        reply=reply,
        language=language,
        intent="clarify",
        llm_used=False,
        provider="template",
        actions=[AssistantAction(label=_copy(language, "browse_schemes"), path="/schemes")],
        disclaimer=ASSISTANT_DISCLAIMER,
    )


def _template_scheme_reply(language: AssistantLanguage, message: str, record: SchemeKnowledgeRecord) -> str:
    wanted = _requested_fields(message)
    lines = [_copy(language, "scheme_intro").format(name=record.scheme_name, scheme_id=record.scheme_id)]
    for item in record.items:
        if wanted and item.field_key not in wanted:
            continue
        lines.append(_format_item(language, item))
    if record.official_source_url:
        lines.append(_copy(language, "official_source").format(url=record.official_source_url))
    lines.append(_copy(language, "not_eligibility"))
    return "\n".join(lines)


def _requested_fields(message: str) -> set[str]:
    lowered = message.lower()
    mapping = (
        (("document", "documents", "ஆவண"), "required_documents"),
        (("apply", "application", "procedure", "விண்ணப்ப", "எப்படி"), "application_method"),
        (("benefit", "நன்மை", "தொகை"), "benefit_description"),
        (("eligib", "condition", "தகுதி"), "eligibility_notes"),
        (("about", "description", "என்ன", "விளக்கம்"), "description"),
        (("department", "துறை"), "department"),
    )
    selected: set[str] = set()
    for needles, key in mapping:
        if any(needle in lowered for needle in needles):
            selected.add(key)
    return selected


def _format_item(language: AssistantLanguage, item: SchemeKnowledgeItem) -> str:
    label = item.label
    if item.content_state == "missing" or not item.value:
        return _copy(language, "item_missing").format(label=label)
    if item.content_state == "unverified_placeholder" or item.verification_status != "verified":
        return _copy(language, "item_unverified").format(
            label=label,
            value=item.value,
            status=item.verification_status,
            source=item.source_url or _copy(language, "no_source"),
        )
    verified_on = item.last_verified_at or _copy(language, "no_verified_date")
    return _copy(language, "item_verified").format(
        label=label,
        value=item.value,
        verified_on=verified_on,
        source=item.source_url or _copy(language, "no_source"),
    )


def _sources_for(record: SchemeKnowledgeRecord) -> list[AssistantSource]:
    return [
        AssistantSource(
            scheme_id=record.scheme_id,
            scheme_name=record.scheme_name,
            field_key=item.field_key,
            label=item.label,
            source_url=item.source_url or record.official_source_url,
            verification_status=item.verification_status,
            last_verified_at=item.last_verified_at,
            content_state=item.content_state,
        )
        for item in record.items
    ]


def _system_prompt(language: AssistantLanguage) -> str:
    lang = "Tamil" if language == "ta" else "English"
    return (
        "You are a research-prototype scheme information assistant. "
        f"Answer in simple {lang}. "
        "Use only the retrieved knowledge items. "
        "Do not invent documents, benefits, portals, deadlines, or eligibility decisions. "
        "If a field is missing, unverified, or contains NEEDS VERIFICATION, say it is not confirmed "
        "and tell the citizen to check the official source URL. "
        "Never treat catalog_access_date as a verification date. "
        "Never say an application was submitted or approved. "
        "Never say the citizen is eligible or not eligible."
    )


def _user_prompt(_language: AssistantLanguage, message: str, record: SchemeKnowledgeRecord) -> str:
    facts: list[str] = [
        f"scheme_id={record.scheme_id}",
        f"scheme_name={record.scheme_name}",
        f"official_source_url={record.official_source_url or ''}",
    ]
    for item in record.items:
        facts.append(
            f"{item.field_key}: value={item.value or ''}; "
            f"verification_status={item.verification_status}; "
            f"content_state={item.content_state}; "
            f"source_url={item.source_url or ''}; "
            f"last_verified_at={item.last_verified_at or ''}"
        )
    return f"Question: {message}\n\nRetrieved knowledge:\n" + "\n".join(facts)


def _response(
    reply: str,
    language: AssistantLanguage,
    *,
    intent: str,
    llm_used: bool,
    provider: Literal["llm", "template"],
    record: SchemeKnowledgeRecord | None = None,
    sources: list[AssistantSource] | None = None,
    notice: str | None = None,
    actions: list[AssistantAction] | None = None,
) -> AssistantChatResponse:
    return AssistantChatResponse(
        reply=reply,
        language=language,
        intent=intent,
        llm_used=llm_used,
        provider=provider,
        scheme_id=record.scheme_id if record else None,
        scheme_name=record.scheme_name if record else None,
        sources=sources or [],
        actions=actions or [],
        notice=notice,
        disclaimer=ASSISTANT_DISCLAIMER,
    )


def _copy(language: AssistantLanguage, key: str) -> str:
    table = _TA if language == "ta" else _EN
    return table[key]


_EN = {
    "eligibility": (
        "I cannot decide whether you are eligible for {scheme}. "
        "Eligibility is calculated only by the existing Hybrid Rule + ML checker. "
        "Use Check Eligibility or your wallet recommendation. I will not invent a result."
    ),
    "a_scheme": "a scheme",
    "check_eligibility": "Check eligibility",
    "open_wallet": "Open my wallet",
    "browse_schemes": "Browse schemes",
    "profile_no_wallet": "No data wallet is saved on this account yet. Create your wallet to see which profile fields are still missing.",
    "profile_complete": "Your saved wallet looks complete ({percent}%). This is not an eligibility decision.",
    "profile_incomplete": "Your saved wallet is {percent}% complete. Missing fields: {fields}. This is not an eligibility decision.",
    "clarify_none": "Which scheme are you asking about? Please give the scheme name or ID, such as TN-SW-001 Pudhumai Penn.",
    "clarify_many": "I found more than one matching scheme: {schemes}. Which one should I explain?",
    "scheme_intro": "{name} ({scheme_id}) — source-backed catalog information:",
    "item_missing": "- {label}: not available in the verified knowledge base. Check the official source. I will not guess.",
    "item_unverified": "- {label}: {value} Status: {status} (not confirmed). Source: {source}. Confirm this on the official page.",
    "item_verified": "- {label}: {value} Verified on {verified_on}. Source: {source}.",
    "official_source": "Official source: {url}",
    "not_eligibility": "This is information only. It is not an eligibility decision.",
    "no_source": "no official source recorded",
    "no_verified_date": "no last-verified date recorded",
    "llm_not_configured": "A live language model is not configured. This answer uses the source-backed knowledge template.",
    "llm_unavailable": "The language model is unavailable. This answer uses the source-backed knowledge template.",
}

_TA = {
    "eligibility": (
        "{scheme}க்கு நீங்கள் தகுதியானவரா என்பதை நான் முடிவு செய்யமாட்டேன். "
        "தகுதி இருக்கும் இணை விதி + இயந்திரக் கற்றல் சரிபார்ப்பாலேயே கணக்கிடப்படும். "
        "தகுதியைச் சரிபார்க்க அல்லது உங்கள் பணப்பையைப் பயன்படுத்துங்கள். நான் முடிவை உருவாக்கமாட்டேன்."
    ),
    "a_scheme": "ஒரு திட்டம்",
    "check_eligibility": "தகுதியைச் சரிபார்",
    "open_wallet": "என் பணப்பையைத் திற",
    "browse_schemes": "திட்டங்களைப் பார்",
    "profile_no_wallet": "இந்தக் கணக்கில் தரவுப் பணப்பை இல்லை. விடுபட்ட புலங்களைப் பார்க்க முதலில் பணப்பையை உருவாக்குங்கள்.",
    "profile_complete": "உங்கள் சேமித்த பணப்பை முழுமையாகத் தெரிகிறது ({percent}%). இது தகுதி முடிவு அல்ல.",
    "profile_incomplete": "உங்கள் சேமித்த பணப்பை {percent}% முழுமை. விடுபட்ட புலங்கள்: {fields}. இது தகுதி முடிவு அல்ல.",
    "clarify_none": "எந்தத் திட்டத்தைப் பற்றி கேட்கிறீர்கள்? திட்டப் பெயர் அல்லது அடையாளத்தைத் தரவும், உதாரணம் TN-SW-001 புதுமைப் பெண்.",
    "clarify_many": "ஒன்றுக்கு மேற்பட்ட திட்டங்கள் பொருந்தின: {schemes}. எதை விளக்க வேண்டும்?",
    "scheme_intro": "{name} ({scheme_id}) — மூல ஆதரவு பட்டியல் தகவல்:",
    "item_missing": "- {label}: உறுதி செய்யப்பட்ட அறிவுத் தளத்தில் இல்லை. அதிகாரப்பூர்வ மூலத்தைப் பாருங்கள். நான் ஊகிக்கமாட்டேன்.",
    "item_unverified": "- {label}: {value} நிலை: {status} (உறுதி செய்யப்படவில்லை). மூலம்: {source}. அதிகாரப்பூர்வ பக்கத்தில் உறுதி செய்யுங்கள்.",
    "item_verified": "- {label}: {value} {verified_on} அன்று உறுதி செய்யப்பட்டது. மூலம்: {source}.",
    "official_source": "அதிகாரப்பூர்வ மூலம்: {url}",
    "not_eligibility": "இது தகவல் மட்டுமே. தகுதி முடிவு அல்ல.",
    "no_source": "அதிகாரப்பூர்வ மூலம் பதிவு செய்யப்படவில்லை",
    "no_verified_date": "கடைசி உறுதி தேதி இல்லை",
    "llm_not_configured": "நேரடி மொழி மாதிரி அமைக்கப்படவில்லை. இந்தப் பதில் மூல ஆதரவு வார்ப்புருவைப் பயன்படுத்துகிறது.",
    "llm_unavailable": "மொழி மாதிரி கிடைக்கவில்லை. இந்தப் பதில் மூல ஆதரவு வார்ப்புருவைப் பயன்படுத்துகிறது.",
}
