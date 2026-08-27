# Internationalization design — English and Tamil

This is an academic AI research prototype. Language support changes presentation only. It does not change eligibility rules, hybrid ranking, authentication, wallet ownership, or recommendation history.

## Supported languages

| Code | Language | Default |
| --- | --- | --- |
| `en` | English | Yes |
| `ta` | Tamil | No |

The header switcher is `English | தமிழ்`. It is keyboard accessible, uses semantic buttons, `aria-pressed`, and a `Language` group label.

## Frontend structure

Translations live in one place:

```
frontend/src/i18n/
  types.ts    # shared message keys
  en.ts       # English copy
  ta.ts       # Tamil copy
  index.ts    # lookup, storage key, language guard
```

Pages and components call `useI18n()` and read `t.*`. Page logic is not duplicated per language.

## Persistence

- Storage key: `schemewise.language`
- Values: `en` or `ta`
- Invalid stored values fall back to English
- The selected language survives refresh
- `document.documentElement.lang` is updated so Tamil typography can use a more comfortable line height without shrinking the existing type scale

## Dynamic text

Counts, completeness percentages, missing-field labels, dates, validation messages, and API connection errors are formatted from the active dictionary. The backend still returns the same technical payload.

## Scheme data

The catalog remains the source of truth. The following stay in their original form:

- Scheme IDs
- Official scheme names and descriptions from the catalog
- Official URLs
- API field names and stored wallet values (`female`, `government_6_to_12`, and similar)
- Model names (`Decision Tree`, `FastAPI`, metric names)
- `CORE` / `ADVANCED` / `HOLD`
- Backend rule-reason strings
- Evaluation notes and limitation titles supplied by the API

If an official Tamil scheme name is not already in the catalog, the official English name is kept and only the surrounding UI is translated.

## PDF language

`POST /api/v1/reports/recommendations` accepts an optional `language` field:

```json
{
  "compare_scheme_ids": [],
  "language": "en"
}
```

`language` may be `"en"` or `"ta"`. Omitting it keeps the existing English report. Eligibility is recomputed with the same recommendation service in both cases.

Tamil PDFs use a Unicode Tamil TrueType font registered with ReportLab:

1. Bundled `NotoSansTamil-Regular.ttf` / `NotoSansTamil-Bold.ttf` in `backend/app/assets/fonts/` when present (SIL Open Font License)
2. Otherwise **Nirmala UI** from `C:\Windows\Fonts\Nirmala.ttc` (Regular and Bold subfonts)

This workspace currently uses Nirmala UI because a Noto Sans Tamil TTF could not be downloaded into the repository. Both fonts are Unicode Tamil faces that ReportLab can embed.

Scheme IDs, official URLs, model names, stored profile codes, and rule-reason text remain untranslated in the PDF.

## Known translation limitations

- Catalog scheme names and official descriptions are not invented in Tamil
- Rule explanations stay in the language produced by the backend rule engine
- Evaluation dashboard research notes and limitation bodies stay in the API English text
- Metric names such as Accuracy, ROC-AUC, and F1 stay in English so their technical meaning does not change
- Tamil labels are longer than English; buttons wrap instead of shrinking type
