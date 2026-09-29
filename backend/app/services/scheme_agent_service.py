"""Read-only scheme agent. Coordinates existing APIs and never scores eligibility itself."""

from __future__ import annotations

import re
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.schemas.scheme_agent import (
    AGENT_DISCLAIMER,
    ALLOWED_AGENT_TOOLS,
    AgentIntent,
    AgentRunRequest,
    AgentRunResponse,
    AgentStatusResponse,
    AgentToolStep,
)
from app.schemas.scheme_assistant import AssistantAction, AssistantLanguage, AssistantSource
from app.services.llm_service import LlmUnavailableError, get_llm_provider, llm_is_configured, llm_model_name
from app.services.scheme_agent_tools import AgentToolError, AgentToolRejectedError, run_tool
from app.services.scheme_knowledge_service import list_scheme_knowledge

_SCHEME_ID = re.compile(r"\bTN-[A-Z]{2,6}-\d{3}\b", re.IGNORECASE)
_UNSUPPORTED = re.compile(
    r"\b(submit (my )?(application|form) to (the )?government|approve (my )?(document|application)|"
    r"update my wallet|delete my (document|wallet|application)|verify my document|"
    r"change (the )?eligibility|edit (the )?scheme|another (citizen|user)|someone else'?s)\b|"
    r"அரசுக்கு\s*விண்ணப்பி|மற்ற\s*பயனர்",
    re.IGNORECASE,
)
_ELIGIBILITY = re.compile(
    r"\b(check my eligibility|am i eligible|eligibility check|find my eligible|"
    r"predicted eligible|recommend(ed)? schemes for me)\b|"
    r"நான்\s*தகுதியானவரா|தகுதியைச்?\s*சரிபார்|தகுதி\s*பார்",
    re.IGNORECASE,
)
_APPLICATIONS = re.compile(
    r"\b(application status|my applications|saved schemes|tracking)\b|"
    r"விண்ணப்ப\s*நிலை|என்\s*விண்ணப்ப",
    re.IGNORECASE,
)
_DOCUMENTS = re.compile(
    r"\b(documents? (are )?missing|document readiness|missing documents|what documents am i missing|"
    r"uploaded documents|review status)\b|"
    r"விடுபட்ட\s*ஆவண|ஆவண\s*தயாரிப்பு",
    re.IGNORECASE,
)
_PROFILE = re.compile(
    r"\b(profile completeness|missing from my profile|incomplete profile|what('s| is) missing)\b|"
    r"சுயவிவரம்.+(விடுபட்ட|முழுமை)|விடுபட்ட\s*(தகவல்|புலம்)",
    re.IGNORECASE,
)
_FIND = re.compile(
    r"\b(find schemes|discover schemes|schemes for me|browse schemes|list schemes)\b|"
    r"திட்டங்களை\s*(தேடு|காண்|பார்)",
    re.IGNORECASE,
)
_EXPLAIN = re.compile(
    r"\b(what is this scheme|about this scheme|required documents|documents are required|"
    r"what documents are required|application process|how to apply|benefit|department|official source)\b|"
    r"திட்டம்\s*என்ன|ஆவணங்கள்\s*தேவை|விண்ணப்ப\s*நடைமுறை",
    re.IGNORECASE,
)
_HELP = re.compile(r"\b(help|what can you do|how (do|does) this work)\b|உதவி", re.IGNORECASE)

_INTENT_TOOLS: dict[AgentIntent, tuple[str, ...]] = {
    "PROFILE_COMPLETENESS": ("get_profile_completeness",),
    "FIND_SCHEMES": ("search_schemes",),
    "CHECK_ELIGIBILITY": ("get_profile_completeness", "check_eligibility"),
    "DOCUMENT_READINESS": ("get_document_readiness",),
    "APPLICATION_STATUS": ("get_application_status",),
    "EXPLAIN_SCHEME": ("get_scheme_knowledge",),
    "GENERAL_HELP": (),
    "CLARIFY": (),
    "UNSUPPORTED": (),
}


def agent_status() -> AgentStatusResponse:
    return AgentStatusResponse(
        llm_configured=llm_is_configured(),
        llm_model=llm_model_name(),
        fallback="template",
        read_only=True,
        allowed_tools=list(ALLOWED_AGENT_TOOLS),
        disclaimer=AGENT_DISCLAIMER,
    )


def run_agent(session: Session | None, user_id: str, payload: AgentRunRequest) -> AgentRunResponse:
    language = payload.language
    intent = classify_intent(payload.message)
    scheme_id = _resolve_scheme_id(session, payload.message, payload.scheme_id, payload.history)
    if intent == "EXPLAIN_SCHEME" and not scheme_id:
        return _reply(language, "CLARIFY", _copy(language, "clarify_scheme"), actions=_browse_actions(language))
    if intent == "UNSUPPORTED":
        return _reply(language, intent, _copy(language, "unsupported"), actions=_help_actions(language))
    if intent == "GENERAL_HELP":
        return _reply(language, intent, _copy(language, "help"), actions=_help_actions(language))
    if intent == "CLARIFY":
        return _reply(language, intent, _copy(language, "clarify"), actions=_help_actions(language))

    results: dict[str, Any] = {}
    steps: list[AgentToolStep] = []
    tools_used: list[str] = []
    for name in _INTENT_TOOLS[intent]:
        try:
            results[name] = run_tool(
                name,
                session=session,
                user_id=user_id,
                scheme_id=scheme_id,
                query=_search_query(payload.message) if name == "search_schemes" else None,
            )
            tools_used.append(name)
            steps.append(AgentToolStep(tool=name, status="ok", summary=_step_summary(language, name)))
        except AgentToolRejectedError:
            steps.append(AgentToolStep(tool=name, status="error", summary=_copy(language, "tool_blocked")))
            return _reply(
                language,
                intent,
                _copy(language, "tool_blocked"),
                tools_used=tools_used,
                steps=steps,
                agent_ran=True,
            )
        except AgentToolError as exc:
            steps.append(AgentToolStep(tool=name, status="error", summary=str(exc)))
            return _reply(
                language,
                intent,
                _copy(language, "tool_error").format(detail=str(exc)),
                tools_used=tools_used,
                steps=steps,
                actions=_help_actions(language),
                agent_ran=True,
            )

    knowledge = results.get("get_scheme_knowledge")
    sources = _sources_from_knowledge(knowledge) if knowledge else _sources_from_search(results.get("search_schemes"))
    reply = _template_reply(language, intent, results, scheme_id)
    notice = None
    llm_used = False
    provider: Literal["llm", "template"] = "template"
    if llm_is_configured():
        try:
            reply = get_llm_provider().generate(
                system=_system_prompt(language),
                user=_user_prompt(payload.message, intent, results),
            )
            llm_used = True
            provider = "llm"
        except LlmUnavailableError:
            notice = _copy(language, "llm_unavailable")
    else:
        notice = _copy(language, "llm_not_configured")

    scheme_name = None
    if knowledge:
        scheme_name = knowledge.get("scheme_name")
    elif results.get("search_schemes", {}).get("scheme_count") == 1:
        scheme_name = results["search_schemes"]["schemes"][0]["scheme_name"]
        scheme_id = results["search_schemes"]["schemes"][0]["scheme_id"]

    return _reply(
        language,
        intent,
        reply,
        llm_used=llm_used,
        provider=provider,
        agent_ran=True,
        tools_used=tools_used,
        steps=steps,
        scheme_id=scheme_id,
        scheme_name=scheme_name,
        sources=sources,
        actions=_actions_for(language, intent, results),
        notice=notice,
    )


def classify_intent(message: str) -> AgentIntent:
    if _UNSUPPORTED.search(message):
        return "UNSUPPORTED"
    if _ELIGIBILITY.search(message):
        return "CHECK_ELIGIBILITY"
    if _APPLICATIONS.search(message):
        return "APPLICATION_STATUS"
    if _DOCUMENTS.search(message):
        return "DOCUMENT_READINESS"
    if _PROFILE.search(message):
        return "PROFILE_COMPLETENESS"
    if _FIND.search(message):
        return "FIND_SCHEMES"
    if _EXPLAIN.search(message) or _SCHEME_ID.search(message):
        return "EXPLAIN_SCHEME"
    if _HELP.search(message):
        return "GENERAL_HELP"
    return "CLARIFY"


def _resolve_scheme_id(
    session: Session | None,
    message: str,
    scheme_id: str | None,
    history: list[Any],
) -> str | None:
    if scheme_id:
        return scheme_id
    listed = list_scheme_knowledge(None)
    found = _match_ids(listed.schemes, message)
    if len(found) == 1:
        return found[0]
    for turn in reversed(history or []):
        content = getattr(turn, "content", "")
        previous = _match_ids(listed.schemes, content)
        if len(previous) == 1:
            return previous[0]
    return None


def _match_ids(schemes: list[Any], text: str) -> list[str]:
    found: list[str] = []
    for match in _SCHEME_ID.findall(text):
        record = next((item for item in schemes if item.scheme_id.lower() == match.lower()), None)
        if record and record.scheme_id not in found:
            found.append(record.scheme_id)
    lowered = text.lower()
    for record in schemes:
        if record.scheme_id in found:
            continue
        name = record.scheme_name.lower()
        if name and name in lowered:
            found.append(record.scheme_id)
            continue
        tokens = [part for part in re.split(r"[^a-z0-9]+", name) if len(part) >= 6]
        if any(token in lowered for token in tokens if token not in {"scheme", "thittam", "ninaivu"}):
            found.append(record.scheme_id)
    return found


def _search_query(message: str) -> str:
    cleaned = _FIND.sub("", message)
    cleaned = re.sub(r"\b(please|for me|schemes?)\b", " ", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip()


def _template_reply(language: AssistantLanguage, intent: AgentIntent, results: dict[str, Any], scheme_id: str | None) -> str:
    if intent == "PROFILE_COMPLETENESS":
        return _profile_text(language, results.get("get_profile_completeness") or {})
    if intent == "FIND_SCHEMES":
        return _find_text(language, results.get("search_schemes") or {})
    if intent == "CHECK_ELIGIBILITY":
        return _eligibility_text(language, results)
    if intent == "DOCUMENT_READINESS":
        return _documents_text(language, results.get("get_document_readiness") or {})
    if intent == "APPLICATION_STATUS":
        return _applications_text(language, results.get("get_application_status") or {})
    if intent == "EXPLAIN_SCHEME":
        return _explain_text(language, results.get("get_scheme_knowledge") or {}, scheme_id)
    return _copy(language, "clarify")


def _profile_text(language: AssistantLanguage, data: dict[str, Any]) -> str:
    if not data.get("has_wallet"):
        return _copy(language, "no_wallet")
    if data.get("incomplete_fields"):
        return _copy(language, "profile_incomplete").format(
            percent=data["percentage"],
            fields=", ".join(data["incomplete_fields"]),
        )
    return _copy(language, "profile_complete").format(percent=data["percentage"])


def _find_text(language: AssistantLanguage, data: dict[str, Any]) -> str:
    schemes = data.get("schemes") or []
    if not schemes:
        return _copy(language, "no_schemes")
    lines = [_copy(language, "find_intro").format(count=data.get("scheme_count", len(schemes)))]
    for item in schemes:
        lines.append(f"- {item['scheme_name']} ({item['scheme_id']})")
    lines.append(_copy(language, "find_not_eligibility"))
    return "\n".join(lines)


def _eligibility_text(language: AssistantLanguage, results: dict[str, Any]) -> str:
    profile = results.get("get_profile_completeness") or {}
    data = results.get("check_eligibility") or {}
    if not profile.get("has_wallet") or not data.get("has_wallet"):
        return _copy(language, "no_wallet")
    lines = [
        _copy(language, "eligibility_intro").format(
            eligible=data.get("eligible_scheme_count", 0),
            total=data.get("total_schemes_evaluated", 0),
        )
    ]
    if profile.get("incomplete_fields"):
        lines.append(
            _copy(language, "eligibility_missing").format(fields=", ".join(profile["incomplete_fields"]))
        )
    for item in data.get("recommendations") or []:
        lines.append(
            _copy(language, "eligibility_hit").format(
                name=item["scheme_name"],
                reason=item["reason"],
            )
        )
    if not data.get("recommendations"):
        lines.append(_copy(language, "eligibility_none"))
    incomplete = [
        item for item in data.get("evaluated_schemes") or [] if "cannot" in str(item.get("reason", "")).lower()
    ]
    for item in incomplete[:3]:
        lines.append(f"- {item['scheme_name']}: {item['reason']}")
    lines.append(_copy(language, "eligibility_disclaimer"))
    return "\n".join(lines)


def _documents_text(language: AssistantLanguage, data: dict[str, Any]) -> str:
    lines = [_copy(language, "docs_intro")]
    checklists = data.get("checklists") or []
    if not checklists:
        lines.append(_copy(language, "docs_no_history"))
    for item in checklists:
        lines.append(
            _copy(language, "docs_scheme").format(
                name=item["scheme_name"],
                percent=item["progress_percent"],
                ready=item["ready_count"],
                total=item["item_count"],
            )
        )
        if item.get("documents_need_verification"):
            lines.append(_copy(language, "docs_unverified_catalog"))
    detail = data.get("checklist")
    if detail:
        for item in detail.get("items") or []:
            lines.append(f"- {item['label']}: {item['status']}")
    uploads = data.get("uploads") or []
    if uploads:
        lines.append(_copy(language, "docs_uploads"))
        for item in uploads:
            lines.append(f"- {item['category']}: {item['review_status']}")
    else:
        lines.append(_copy(language, "docs_no_uploads"))
    for item in data.get("readiness") or []:
        lines.append(
            _copy(language, "docs_readiness").format(name=item["scheme_name"], stage=item["stage"])
        )
    lines.append(_copy(language, "docs_ocr_note"))
    return "\n".join(lines)


def _applications_text(language: AssistantLanguage, data: dict[str, Any]) -> str:
    rows = data.get("applications") or []
    if not rows:
        return _copy(language, "apps_empty")
    lines = [_copy(language, "apps_intro").format(count=data.get("count", len(rows)))]
    for item in rows:
        submitted = item["status"] in {"applied", "under_review", "approved", "rejected"}
        note = _copy(language, "apps_tracked_submitted") if submitted else _copy(language, "apps_tracked_only")
        lines.append(f"- {item['scheme_name']}: {item['status']}. {note}")
    lines.append(_copy(language, "apps_disclaimer"))
    return "\n".join(lines)


def _explain_text(language: AssistantLanguage, data: dict[str, Any], scheme_id: str | None) -> str:
    if not data:
        return _copy(language, "clarify_scheme")
    lines = [_copy(language, "explain_intro").format(name=data.get("scheme_name"), scheme_id=data.get("scheme_id") or scheme_id)]
    for item in data.get("items") or []:
        if item.get("content_state") == "missing" or not item.get("value"):
            lines.append(_copy(language, "item_missing").format(label=item["label"]))
            continue
        if item.get("content_state") == "unverified_placeholder" or item.get("verification_status") != "verified":
            lines.append(
                _copy(language, "item_unverified").format(
                    label=item["label"],
                    value=item.get("value"),
                    status=item.get("verification_status"),
                    source=item.get("source_url") or _copy(language, "no_source"),
                )
            )
            continue
        lines.append(
            _copy(language, "item_verified").format(
                label=item["label"],
                value=item.get("value"),
                verified_on=item.get("last_verified_at") or _copy(language, "no_verified_date"),
                source=item.get("source_url") or _copy(language, "no_source"),
            )
        )
    lines.append(_copy(language, "explain_not_eligibility"))
    return "\n".join(lines)


def _sources_from_knowledge(data: dict[str, Any] | None) -> list[AssistantSource]:
    if not data:
        return []
    return [
        AssistantSource(
            scheme_id=data["scheme_id"],
            scheme_name=data["scheme_name"],
            field_key=item["field_key"],
            label=item["label"],
            source_url=item.get("source_url") or data.get("official_source_url"),
            verification_status=item["verification_status"],
            last_verified_at=item.get("last_verified_at"),
            content_state=item["content_state"],
        )
        for item in data.get("items") or []
    ]


def _sources_from_search(data: dict[str, Any] | None) -> list[AssistantSource]:
    if not data:
        return []
    sources: list[AssistantSource] = []
    for scheme in data.get("schemes") or []:
        for item in scheme.get("verification") or []:
            sources.append(
                AssistantSource(
                    scheme_id=scheme["scheme_id"],
                    scheme_name=scheme["scheme_name"],
                    field_key=item["field_key"],
                    label=item["field_key"],
                    source_url=item.get("source_url") or scheme.get("official_source_url"),
                    verification_status=item.get("verification_status") or "unverified",
                    last_verified_at=None,
                    content_state="present",
                )
            )
    return sources


def _actions_for(language: AssistantLanguage, intent: AgentIntent, results: dict[str, Any]) -> list[AssistantAction]:
    if intent == "PROFILE_COMPLETENESS":
        return [AssistantAction(label=_copy(language, "open_wallet"), path="/wallet")]
    if intent == "FIND_SCHEMES":
        return [AssistantAction(label=_copy(language, "browse_schemes"), path="/schemes")]
    if intent == "CHECK_ELIGIBILITY":
        actions = [
            AssistantAction(label=_copy(language, "open_check"), path="/check"),
            AssistantAction(label=_copy(language, "open_results"), path="/results"),
        ]
        if not (results.get("check_eligibility") or {}).get("has_wallet"):
            return [AssistantAction(label=_copy(language, "open_wallet"), path="/wallet")]
        return actions
    if intent == "DOCUMENT_READINESS":
        return [
            AssistantAction(label=_copy(language, "open_documents"), path="/documents"),
            AssistantAction(label=_copy(language, "open_uploads"), path="/uploads"),
            AssistantAction(label=_copy(language, "open_readiness"), path="/readiness"),
        ]
    if intent == "APPLICATION_STATUS":
        return [AssistantAction(label=_copy(language, "open_applications"), path="/applications")]
    if intent == "EXPLAIN_SCHEME":
        return [AssistantAction(label=_copy(language, "browse_schemes"), path="/schemes")]
    return _help_actions(language)


def _help_actions(language: AssistantLanguage) -> list[AssistantAction]:
    return [
        AssistantAction(label=_copy(language, "open_wallet"), path="/wallet"),
        AssistantAction(label=_copy(language, "open_check"), path="/check"),
        AssistantAction(label=_copy(language, "browse_schemes"), path="/schemes"),
    ]


def _browse_actions(language: AssistantLanguage) -> list[AssistantAction]:
    return [AssistantAction(label=_copy(language, "browse_schemes"), path="/schemes")]


def _system_prompt(language: AssistantLanguage) -> str:
    lang = "Tamil" if language == "ta" else "English"
    return (
        "You are a research-prototype scheme agent. "
        f"Answer in simple {lang}. "
        "Use only the tool results. "
        "Do not invent eligibility, documents, portals, or approvals. "
        "If a tool says information is missing or unverified, say it is not confirmed. "
        "Never say a government application was submitted unless application status is applied, under_review, approved, or rejected. "
        "Never say the citizen is officially approved. "
        "Eligibility results are predictions from the existing Hybrid Rule + ML checker."
    )


def _user_prompt(message: str, intent: AgentIntent, results: dict[str, Any]) -> str:
    return f"Citizen request: {message}\nIntent: {intent}\nTool results: {results}"


def _step_summary(language: AssistantLanguage, tool: str) -> str:
    return _copy(language, f"step_{tool}")


def _reply(
    language: AssistantLanguage,
    intent: AgentIntent,
    reply: str,
    *,
    llm_used: bool = False,
    provider: Literal["llm", "template"] = "template",
    agent_ran: bool = True,
    tools_used: list[str] | None = None,
    steps: list[AgentToolStep] | None = None,
    scheme_id: str | None = None,
    scheme_name: str | None = None,
    sources: list[AssistantSource] | None = None,
    actions: list[AssistantAction] | None = None,
    notice: str | None = None,
) -> AgentRunResponse:
    return AgentRunResponse(
        reply=reply,
        language=language,
        intent=intent,
        llm_used=llm_used,
        provider=provider,
        agent_ran=agent_ran,
        tools_used=tools_used or [],
        steps=steps or [],
        scheme_id=scheme_id,
        scheme_name=scheme_name,
        sources=sources or [],
        actions=actions or [],
        notice=notice,
        disclaimer=AGENT_DISCLAIMER,
    )


def _copy(language: AssistantLanguage, key: str) -> str:
    table = _TA if language == "ta" else _EN
    return table[key]


_EN = {
    "clarify": "Tell me what you need: profile completeness, find schemes, check eligibility, missing documents, or application status.",
    "clarify_scheme": "Which scheme should I explain? Choose a scheme name or ID such as TN-SW-001.",
    "unsupported": "I cannot change your wallet, documents, applications, or eligibility rules, and I cannot submit a government application. I can only read your records and the official catalog.",
    "help": "I can check profile completeness, list catalog schemes, request an eligibility check from the existing Hybrid Rule + ML checker, report document readiness, or show your application-tracking status.",
    "no_wallet": "No data wallet is saved on this account yet. Create your wallet before I can read completeness or request an eligibility check.",
    "profile_complete": "Your saved wallet looks complete ({percent}%). Completeness is not an eligibility decision.",
    "profile_incomplete": "Your saved wallet is {percent}% complete. Missing fields: {fields}. Completeness is not an eligibility decision.",
    "find_intro": "I found {count} catalog scheme(s). This is not an eligibility result:",
    "find_not_eligibility": "Use Check eligibility if you want the Hybrid Rule + ML prediction.",
    "no_schemes": "No catalog schemes matched that request. Browse the schemes page or try another keyword.",
    "eligibility_intro": "The existing checker evaluated {total} CORE schemes and predicted {eligible} as eligible.",
    "eligibility_missing": "Some profile fields are still missing, so a few schemes may be incomplete: {fields}.",
    "eligibility_hit": "- {name}: predicted eligible. {reason}",
    "eligibility_none": "No CORE scheme was predicted eligible from the saved wallet.",
    "eligibility_disclaimer": "These are research-prototype predictions, not government approval or a guaranteed benefit.",
    "docs_intro": "Document and application readiness from your saved records:",
    "docs_no_history": "No recommended CORE schemes are in your eligibility history yet, so the checklist is empty. Check eligibility first.",
    "docs_scheme": "- {name}: checklist {percent}% ({ready}/{total} marked ready).",
    "docs_unverified_catalog": "  Catalog documents for this scheme still need official verification.",
    "docs_uploads": "Uploaded supporting files and review status:",
    "docs_no_uploads": "No supporting files are uploaded yet. Uploaded is not the same as verified.",
    "docs_readiness": "- {name} readiness stage: {stage}. Completed preparation is not a government submission.",
    "docs_ocr_note": "OCR extraction is not document verification. I cannot approve or reject a file.",
    "apps_empty": "You have no personal application-tracking rows yet. Nothing has been submitted to a government portal.",
    "apps_intro": "Your personal application-tracking rows ({count}):",
    "apps_tracked_only": "This is personal tracking only, not a government submission.",
    "apps_tracked_submitted": "The tracker marks this as applied or later. That is still not a government-portal confirmation.",
    "apps_disclaimer": "This agent does not submit applications to government portals.",
    "explain_intro": "{name} ({scheme_id}) — source-backed catalog information:",
    "item_missing": "- {label}: not available in the verified knowledge base. I will not guess.",
    "item_unverified": "- {label}: {value} Status: {status} (not confirmed). Source: {source}.",
    "item_verified": "- {label}: {value} Verified on {verified_on}. Source: {source}.",
    "explain_not_eligibility": "This is catalog information only. It is not an eligibility decision.",
    "no_source": "no official source recorded",
    "no_verified_date": "no last-verified date recorded",
    "open_wallet": "Open my wallet",
    "open_check": "Check eligibility",
    "open_results": "View results",
    "browse_schemes": "Browse schemes",
    "open_documents": "Open documents",
    "open_uploads": "Open uploads",
    "open_readiness": "Open readiness",
    "open_applications": "Open applications",
    "tool_blocked": "That action is not allowed. This agent is read-only.",
    "tool_error": "I could not finish that lookup: {detail}",
    "llm_not_configured": "A live language model is not configured. This summary uses the tool results directly.",
    "llm_unavailable": "The language model is unavailable. This summary uses the tool results directly.",
    "step_get_profile_completeness": "Read profile completeness",
    "step_search_schemes": "Searched the scheme catalog and knowledge base",
    "step_check_eligibility": "Requested eligibility from the existing Hybrid Rule + ML checker",
    "step_get_scheme_knowledge": "Retrieved source-backed scheme knowledge",
    "step_get_document_readiness": "Read document checklist, uploads, and readiness",
    "step_get_application_status": "Read owner-scoped application tracking",
}

_TA = {
    "clarify": "என்ன வேண்டும் எனச் சொல்லுங்கள்: சுயவிவர முழுமை, திட்டங்களைக் காணுதல், தகுதிச் சரிபார்ப்பு, விடுபட்ட ஆவணங்கள் அல்லது விண்ணப்ப நிலை.",
    "clarify_scheme": "எந்தத் திட்டத்தை விளக்க வேண்டும்? திட்டப் பெயர் அல்லது அடையாளத்தைத் தேர்ந்தெடுங்கள், உதாரணம் TN-SW-001.",
    "unsupported": "நான் உங்கள் பணப்பை, ஆவணங்கள், விண்ணப்பங்கள் அல்லது தகுதி விதிகளை மாற்றமாட்டேன்; அரசு விண்ணப்பத்தையும் சமர்ப்பிக்கமாட்டேன். உங்கள் பதிவுகளையும் அதிகாரப்பூர்வ பட்டியலையும் மட்டுமே படிக்கிறேன்.",
    "help": "சுயவிவர முழுமையைப் பார்க்கலாம், பட்டியல் திட்டங்களைக் காட்டலாம், இருக்கும் இணை விதி + இயந்திரக் கற்றல் சரிபார்ப்பிலிருந்து தகுதியைக் கேட்கலாம், ஆவணத் தயாரிப்பைச் சொல்லலாம் அல்லது உங்கள் விண்ணப்பக் கண்காணிப்பைக் காட்டலாம்.",
    "no_wallet": "இந்தக் கணக்கில் தரவுப் பணப்பை இல்லை. முழுமை அல்லது தகுதிச் சரிபார்ப்பைக் கேட்க முன் பணப்பையை உருவாக்குங்கள்.",
    "profile_complete": "உங்கள் சேமித்த பணப்பை முழுமையாகத் தெரிகிறது ({percent}%). முழுமை தகுதி முடிவு அல்ல.",
    "profile_incomplete": "உங்கள் சேமித்த பணப்பை {percent}% முழுமை. விடுபட்ட புலங்கள்: {fields}. முழுமை தகுதி முடிவு அல்ல.",
    "find_intro": "{count} பட்டியல் திட்டங்கள் கிடைத்தன. இது தகுதி முடிவு அல்ல:",
    "find_not_eligibility": "இணை விதி + இயந்திரக் கற்றல் முன்னறிவிப்புக்கு தகுதியைச் சரிபார்க்கவும்.",
    "no_schemes": "அந்தக் கோரிக்கைக்குப் பட்டியல் திட்டங்கள் இல்லை. திட்டப் பக்கத்தைப் பாருங்கள் அல்லது வேறு சொல்லை முயற்சிக்கவும்.",
    "eligibility_intro": "இருக்கும் சரிபார்ப்பான் {total} CORE திட்டங்களை மதிப்பிட்டு {eligible} தகுதிபெற வாய்ப்புள்ளதாக முன்னறிவித்தது.",
    "eligibility_missing": "சில சுயவிவரப் புலங்கள் இன்னும் விடுபட்டுள்ளன, எனவே சில திட்டங்கள் முழுமையற்றதாக இருக்கலாம்: {fields}.",
    "eligibility_hit": "- {name}: தகுதிபெற வாய்ப்பு. {reason}",
    "eligibility_none": "சேமித்த பணப்பையிலிருந்து எந்த CORE திட்டமும் தகுதிபெற வாய்ப்புள்ளதாக முன்னறிவிக்கப்படவில்லை.",
    "eligibility_disclaimer": "இவை ஆராய்ச்சி முன்மாதிரி முன்னறிவிப்புகள்; அரசு ஒப்புதல் அல்லது உத்தரவாத நன்மை அல்ல.",
    "docs_intro": "உங்கள் சேமித்த பதிவுகளிலிருந்து ஆவண மற்றும் விண்ணப்பத் தயாரிப்பு:",
    "docs_no_history": "உங்கள் தகுதி வரலாற்றில் பரிந்துரைக்கப்பட்ட CORE திட்டங்கள் இல்லை, எனவே பட்டியல் காலியாக உள்ளது. முதலில் தகுதியைச் சரிபாருங்கள்.",
    "docs_scheme": "- {name}: பட்டியல் {percent}% ({ready}/{total} தயார்).",
    "docs_unverified_catalog": "  இந்தத் திட்டத்தின் பட்டியல் ஆவணங்கள் இன்னும் அதிகாரப்பூர்வ உறுதி தேவை.",
    "docs_uploads": "பதிவேற்றிய ஆதாரக் கோப்புகள் மற்றும் மதிப்பாய்வு நிலை:",
    "docs_no_uploads": "ஆதாரக் கோப்புகள் பதிவேற்றப்படவில்லை. பதிவேற்றம் சரிபார்ப்பு அல்ல.",
    "docs_readiness": "- {name} தயாரிப்பு நிலை: {stage}. முடிந்த தயாரிப்பு அரசு சமர்ப்பிப்பு அல்ல.",
    "docs_ocr_note": "OCR பிரித்தெடுப்பு ஆவணச் சரிபார்ப்பு அல்ல. நான் ஒரு கோப்பை அங்கீகரிக்கவோ நிராகரிக்கவோ மாட்டேன்.",
    "apps_empty": "தனிப்பட்ட விண்ணப்பக் கண்காணிப்பு வரிசைகள் இல்லை. எந்த அரசு வாயிலுக்கும் எதுவும் சமர்ப்பிக்கப்படவில்லை.",
    "apps_intro": "உங்கள் தனிப்பட்ட விண்ணப்பக் கண்காணிப்பு வரிசைகள் ({count}):",
    "apps_tracked_only": "இது தனிப்பட்ட கண்காணிப்பு மட்டுமே; அரசு சமர்ப்பிப்பு அல்ல.",
    "apps_tracked_submitted": "கண்காணிப்பு இதை விண்ணப்பிக்கப்பட்டது அல்லது அதற்குப் பின் எனக் குறிக்கிறது. இது அரசு வாயில் உறுதி அல்ல.",
    "apps_disclaimer": "இந்த முகவர் அரசு வாயில்களுக்கு விண்ணப்பங்களைச் சமர்ப்பிக்காது.",
    "explain_intro": "{name} ({scheme_id}) — மூல ஆதரவு பட்டியல் தகவல்:",
    "item_missing": "- {label}: உறுதி செய்யப்பட்ட அறிவுத் தளத்தில் இல்லை. நான் ஊகிக்கமாட்டேன்.",
    "item_unverified": "- {label}: {value} நிலை: {status} (உறுதி செய்யப்படவில்லை). மூலம்: {source}.",
    "item_verified": "- {label}: {value} {verified_on} அன்று உறுதி செய்யப்பட்டது. மூலம்: {source}.",
    "explain_not_eligibility": "இது பட்டியல் தகவல் மட்டுமே. தகுதி முடிவு அல்ல.",
    "no_source": "அதிகாரப்பூர்வ மூலம் பதிவு செய்யப்படவில்லை",
    "no_verified_date": "கடைசி உறுதி தேதி இல்லை",
    "open_wallet": "என் பணப்பையைத் திற",
    "open_check": "தகுதியைச் சரிபார்",
    "open_results": "முடிவுகளைப் பார்",
    "browse_schemes": "திட்டங்களைப் பார்",
    "open_documents": "ஆவணங்களைத் திற",
    "open_uploads": "பதிவேற்றங்களைத் திற",
    "open_readiness": "தயாரிப்பைத் திற",
    "open_applications": "விண்ணப்பங்களைத் திற",
    "tool_blocked": "அந்தச் செயல் அனுமதிக்கப்படவில்லை. இந்த முகவர் படிக்க-மட்டும்.",
    "tool_error": "அந்தத் தேடலை முடிக்க முடியவில்லை: {detail}",
    "llm_not_configured": "நேரடி மொழி மாதிரி அமைக்கப்படவில்லை. இந்தச் சுருக்கம் கருவி முடிவுகளை நேரடியாகப் பயன்படுத்துகிறது.",
    "llm_unavailable": "மொழி மாதிரி கிடைக்கவில்லை. இந்தச் சுருக்கம் கருவி முடிவுகளை நேரடியாகப் பயன்படுத்துகிறது.",
    "step_get_profile_completeness": "சுயவிவர முழுமை படிக்கப்பட்டது",
    "step_search_schemes": "திட்டப் பட்டியலும் அறிவுத் தளமும் தேடப்பட்டன",
    "step_check_eligibility": "இருக்கும் இணை விதி + இயந்திரக் கற்றல் சரிபார்ப்பிலிருந்து தகுதி கேட்கப்பட்டது",
    "step_get_scheme_knowledge": "மூல ஆதரவு திட்ட அறிவு பெறப்பட்டது",
    "step_get_document_readiness": "ஆவணப் பட்டியல், பதிவேற்றங்கள் மற்றும் தயாரிப்பு படிக்கப்பட்டன",
    "step_get_application_status": "உரிமையாளர் விண்ணப்பக் கண்காணிப்பு படிக்கப்பட்டது",
}
