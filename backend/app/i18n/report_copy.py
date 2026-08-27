"""English and Tamil copy for the on-demand recommendation PDF."""

from __future__ import annotations

from typing import Literal

from app.schemas.report import PROJECT_TITLE, REPORT_DISCLAIMER

ReportLanguage = Literal["en", "ta"]

FIELD_LABELS: dict[str, dict[str, str]] = {
    "en": {
        "age": "Age",
        "gender": "Gender",
        "is_student": "Student",
        "first_higher_education_course": "First higher-education course",
        "school_background": "School background",
        "marital_status": "Marital status",
        "is_orphan": "Orphan",
        "is_destitute": "Destitute",
        "occupation_category": "Occupation",
        "wet_land_acres": "Wet land (acres)",
        "dry_land_acres": "Dry land (acres)",
    },
    "ta": {
        "age": "வயது",
        "gender": "பாலினம்",
        "is_student": "மாணவர்",
        "first_higher_education_course": "முதல் உயர்கல்விப் பாடம்",
        "school_background": "பள்ளிப் பின்னணி",
        "marital_status": "திருமண நிலை",
        "is_orphan": "அனாதை",
        "is_destitute": "ஆதரவற்றவர்",
        "occupation_category": "தொழில்",
        "wet_land_acres": "நன்செய் நிலம் (ஏக்கர்)",
        "dry_land_acres": "புன்செய் நிலம் (ஏக்கர்)",
    },
}

_COPY: dict[str, dict[str, str]] = {
    "en": {
        "title": PROJECT_TITLE,
        "badge": "AI Research Prototype",
        "generated": "Generated {when}",
        "profile_reference": "Profile reference: {name} · Wallet ID {wallet_id}",
        "wallet_id_note": (
            "This wallet identifier is an internal research reference, "
            "not a government identity number."
        ),
        "completeness_heading": "Profile completeness",
        "completeness_body": (
            "Your saved socio-economic profile is {percent}% complete "
            "({completed} of {total} fields). Completeness describes how much "
            "profile information is present. It does not guarantee eligibility."
        ),
        "missing": "Missing information: {fields}.",
        "profile_heading": "Socio-economic profile used for this report",
        "recommended_heading": "Recommended schemes",
        "recommended_summary": (
            "{count} of {total} CORE schemes were recommended by the documented "
            "research rules. Status labels are research predictions, not government approval."
        ),
        "no_schemes": (
            "No CORE schemes were recommended for this saved profile in the current research prototype."
        ),
        "comparison_heading": "Selected scheme comparison",
        "comparison_intro": (
            "The following schemes were selected for side-by-side research comparison. "
            "A scheme that is not recommended is not an official government rejection."
        ),
        "disclaimer_heading": "Important disclaimer",
        "disclaimer": REPORT_DISCLAIMER,
        "yes": "Yes",
        "no": "No",
        "research_status": "Research status: {status}",
        "predicted_eligible": "Predicted eligible",
        "not_recommended": "Not recommended by this prototype",
        "probability": (
            "Model prediction probability: {probability}. This is a research model score, "
            "not government approval."
        ),
        "not_recommended_note": (
            "This scheme was not recommended for the saved profile. "
            "That is a research prototype result, not an official rejection."
        ),
        "department": "Department: {value}",
        "category": "Category: {value}",
        "details": "Details: {value}",
        "eligibility": "Eligibility information: {value}",
        "reasons": "Documented rule reasons",
        "benefit": "Benefit / details: {value}",
        "documents": "Required documents: {value}",
        "application": "Application / process: {value}",
        "official_source": "Official source: {value}",
        "footer": "Academic AI research prototype. Not government approval.",
        "page": "Page {page}",
        "author": "SchemeWise AI research prototype",
    },
    "ta": {
        "title": (
            "ஒருங்கிணைந்த சமூக-பொருளாதார தரவுப் பணப்பைகளைப் பயன்படுத்தும் "
            "மாநில அரசு நிதியுதவி திட்டத் தகுதி முன்னறிவிப்பு இயந்திரம்"
        ),
        "badge": "செயற்கை நுண்ணறிவு ஆராய்ச்சி முன்மாதிரி",
        "generated": "உருவாக்கப்பட்ட நேரம் {when}",
        "profile_reference": "விவரக் குறிப்பு: {name} · பணப்பை அடையாளம் {wallet_id}",
        "wallet_id_note": (
            "இந்தப் பணப்பை அடையாளம் உள் ஆராய்ச்சி குறிப்பு மட்டுமே. "
            "இது அரசு அடையாள எண் அல்ல."
        ),
        "completeness_heading": "விவர முழுமை",
        "completeness_body": (
            "சேமிக்கப்பட்ட சமூக-பொருளாதார விவரம் {percent}% முழுமையானது "
            "({completed} / {total} புலங்கள்). முழுமை என்பது எவ்வளவு விவரம் உள்ளது "
            "என்பதை மட்டுமே குறிக்கிறது. இது தகுதியை உறுதிப்படுத்தாது."
        ),
        "missing": "விடுபட்ட தகவல்: {fields}.",
        "profile_heading": "இந்த அறிக்கைக்குப் பயன்படுத்தப்பட்ட சமூக-பொருளாதார விவரம்",
        "recommended_heading": "பரிந்துரைக்கப்பட்ட திட்டங்கள்",
        "recommended_summary": (
            "ஆவணப்படுத்தப்பட்ட ஆராய்ச்சி விதிகளின்படி {total} CORE திட்டங்களில் "
            "{count} பரிந்துரைக்கப்பட்டன. நிலை அடையாளங்கள் ஆராய்ச்சி முன்னறிவிப்புகள்; "
            "அரசு ஒப்புதல் அல்ல."
        ),
        "no_schemes": (
            "தற்போதைய ஆராய்ச்சி முன்மாதிரியில் இந்தச் சேமித்த விவரத்திற்கு "
            "CORE திட்டங்கள் பரிந்துரைக்கப்படவில்லை."
        ),
        "comparison_heading": "தேர்ந்தெடுக்கப்பட்ட திட்ட ஒப்பீடு",
        "comparison_intro": (
            "பின்வரும் திட்டங்கள் ஆராய்ச்சி ஒப்பீட்டிற்குத் தேர்ந்தெடுக்கப்பட்டன. "
            "பரிந்துரைக்கப்படாத திட்டம் அதிகாரப்பூர்வ அரசு நிராகரிப்பு அல்ல."
        ),
        "disclaimer_heading": "முக்கிய அறிவிப்பு",
        "disclaimer": (
            "இந்த அறிக்கை செயற்கை/ஆராய்ச்சி தரவையும் ஆவணப்படுத்தப்பட்ட திட்ட விதிகளையும் "
            "பயன்படுத்தும் கல்வி செயற்கை நுண்ணறிவு ஆராய்ச்சி முன்மாதிரியால் உருவாக்கப்பட்டது. "
            "இது அரசு ஒப்புதல், சான்றிதழ் அல்லது இறுதித் தகுதி முடிவு அல்ல. "
            "பயனர்கள் தகுதியையும் விண்ணப்பத் தேவைகளையும் அதிகாரப்பூர்வ அரசு ஆதாரத்தில் "
            "சரிபார்க்க வேண்டும்."
        ),
        "yes": "ஆம்",
        "no": "இல்லை",
        "research_status": "ஆராய்ச்சி நிலை: {status}",
        "predicted_eligible": "தகுதிபெற வாய்ப்புள்ளது",
        "not_recommended": "இந்த முன்மாதிரியால் பரிந்துரைக்கப்படவில்லை",
        "probability": (
            "மாதிரி முன்னறிவிப்பு நிகழ்தகவு: {probability}. இது ஆராய்ச்சி மாதிரி மதிப்பெண்; "
            "அரசு ஒப்புதல் அல்ல."
        ),
        "not_recommended_note": (
            "சேமித்த விவரத்திற்கு இந்தத் திட்டம் பரிந்துரைக்கப்படவில்லை. "
            "இது ஆராய்ச்சி முன்மாதிரி முடிவு; அதிகாரப்பூர்வ நிராகரிப்பு அல்ல."
        ),
        "department": "துறை: {value}",
        "category": "வகை: {value}",
        "details": "விவரங்கள்: {value}",
        "eligibility": "தகுதித் தகவல்: {value}",
        "reasons": "ஆவணப்படுத்தப்பட்ட விதி காரணங்கள்",
        "benefit": "நன்மை / விவரங்கள்: {value}",
        "documents": "தேவையான ஆவணங்கள்: {value}",
        "application": "விண்ணப்பம் / செயல்முறை: {value}",
        "official_source": "அதிகாரப்பூர்வ ஆதாரம்: {value}",
        "footer": "கல்வி செயற்கை நுண்ணறிவு ஆராய்ச்சி முன்மாதிரி. அரசு ஒப்புதல் அல்ல.",
        "page": "பக்கம் {page}",
        "author": "SchemeWise AI research prototype",
    },
}


def normalize_report_language(language: str | None) -> ReportLanguage:
    return "ta" if language == "ta" else "en"


def report_copy(language: str | None) -> dict[str, str]:
    return dict(_COPY[normalize_report_language(language)])


def field_labels(language: str | None) -> dict[str, str]:
    return FIELD_LABELS[normalize_report_language(language)]
