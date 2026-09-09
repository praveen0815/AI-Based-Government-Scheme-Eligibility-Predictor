# Personalized scheme discovery and smart filtering

Phase 33 adds a discovery and filtering layer on `/schemes`. It helps users find, search, filter, sort, and compare catalog schemes. It does **not** decide eligibility.

The Hybrid Rule + Decision Tree recommendation remains the single source of truth. This page never computes a new eligibility score.

> This catalog search lists research-prototype scheme records only. It does not predict eligibility.

## Purpose

Signed-in and public visitors can:

- Browse the official research catalog
- Search by scheme name, description, or keyword
- Filter by category and department from existing catalog values
- Filter by eligibility status taken from an existing recommendation
- Sort the visible list
- See a live result count
- Clear filters
- Select schemes and open the existing Compare page
- See a lightweight “Recommended for You” block when a saved recommendation already exists

## Architecture

```text
/schemes  (public)
        ↓
GET /api/v1/catalog          (existing scheme rows)
        ↓
Client-side search, filters, sort
        ↓
Optional reuse of an existing recommendation
  RecommendationContext result
  or one-time:
    GET  /api/v1/wallets/me
    POST /api/v1/wallets/{id}/recommend
    GET  /api/v1/wallets/me/completeness
        ↓
Existing Hybrid Rule + ML + ranking
        ↓
Eligibility badges / Eligible filter / Recommended for You
        ↓
Existing Compare: navigate("/compare", { state: { schemeIds } })
```

No new search API, recommendation algorithm, or ranking rule is added.

## Search

Search is case-insensitive and matches partial text in:

- `scheme_name`
- `scheme_id`
- `description`
- `eligibility_notes`
- `benefit_description`
- `scheme_category`
- `department`

Results update as the query changes. No matching rows show **No schemes found**.

## Filters

Category and department options come from the loaded catalog. The page does not invent backend categories.

| Control | Source |
| --- | --- |
| Search | Catalog text fields above |
| Category | Existing `scheme_category` values |
| Department | Existing `department` values |
| Eligibility | Existing `RecommendResponse` only |
| CORE status / gender / student | Existing Phase 25 catalog fields |
| Sort | Name or existing eligibility status |

Eligibility options:

- All schemes
- Eligible — `recommendations` or evaluated `prediction: "eligible"`
- Not Eligible — evaluated `prediction: "not_eligible"`
- Cannot Be Fully Evaluated — catalog row not present in the recommendation evaluation

If no recommendation result is available, eligibility status is not shown and Eligible / Not Eligible / Cannot Be Fully Evaluated do not invent matches.

Incomplete language is **Cannot be fully evaluated**. The page does not say “Add this information to become eligible.”

All selected filters apply together (AND). Changing one control updates the list immediately.

## Sorting

- Relevance — catalog order, or name/ID/category match order when a query is present
- Scheme Name A–Z / Z–A
- Eligible First — uses the existing recommendation status only

No new eligibility score is created.

## Result count

The count updates with every search or filter change.

Examples: “Showing 8 schemes”, “Showing 3 eligible schemes”, “No schemes found”.

## Clear Filters

**Clear Filters** appears only when a search, filter, or non-default sort is active. It resets search, category, department, eligibility, sort, and the remaining Phase 25 filters, and restores the default catalog list. The same values are cleared from the URL.

## Compare integration

Cards include a compare checkbox. **Compare Selected** uses the existing `/compare` page and `POST /api/v1/compare`. There is no second comparison system.

- 0 selected: “Select at least one scheme to compare.”
- Compare Selected stays disabled until 2 schemes are selected
- Maximum remains 3 schemes
- Unauthenticated visitors are asked to sign in, matching the existing compare rule

## Recommended for You

Shown only when an existing recommendation response is available.

- Eligible schemes from `recommendations`
- Schemes that cannot be fully evaluated from catalog rows missing in that response
- Optional missing-wallet-field copy from completeness

The block says the list is based on the saved profile and is a research-prototype result, not government approval.

## Scheme details

`/schemes/:id` is unchanged. Official source links, Phase 26 explanation, rule reasons, ML explanation, and existing comparison remain on the detail page.

## URL state

Filter state is stored in the query string when it differs from the defaults:

`/schemes?q=education&category=Education&eligibility=eligible&sort=name_asc`

Refresh, share, and back/forward keep the same view. Existing routes are unchanged.

## Security

`/schemes` stays public. Wallet and recommend calls run only for an authenticated session and follow existing ownership rules. JWT tokens, passwords, Google tokens, and identity numbers are not displayed. No new authentication mechanism is added.

## Accessibility

Search and filter controls have visible labels. The result count uses `aria-live`. Compare checkboxes have scheme-specific names. Eligibility status is text, not color alone. Focus styles use the existing civic-tech field system. Filters remain keyboard accessible, including the mobile filter drawer.

## Performance

Catalog filtering and sorting run on already-loaded `/api/v1/catalog` data. Recommendation is loaded at most once per visit (reused from `RecommendationContext` when present). Filter changes do not call the recommendation API again.

## Known limitations

Eligibility badges appear only after a saved-profile recommendation exists. ADVANCED / HOLD catalog rows are typically “Cannot be fully evaluated” because the hybrid engine evaluates CORE schemes only. Browser URL length is enough for the current 13-row catalog. This remains an academic research prototype.
