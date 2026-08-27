# Phase 2 — Government scheme dataset collection

This document records how the official Tamil Nadu welfare-scheme catalog is designed and collected. It does not describe citizen records, trained models, authentication, or the frontend.

Source access date for Phase 2 collection: **2026-08-14**.

## 1. Why government scheme data is required

The project predicts whether a citizen profile is eligible for Tamil Nadu welfare schemes and should explain that prediction using the scheme’s published rules.

That work needs a machine-readable catalog of schemes and eligibility factors. Without an official scheme table, later ML labels, explanations, and recommendations would be invented. Phase 2 therefore collects only scheme-level facts that can be traced to a government page or government PDF.

Citizen-level training rows are out of scope here. They will be designed later as synthetic profiles against this catalog.

## 2. Official data sources

Only Tamil Nadu or Government of India pages that are owned by a department, a state portal, or an official service platform were used.

| Source | URL | Role |
| --- | --- | --- |
| Government of Tamil Nadu schemes directory | https://www.tn.gov.in/schemes.php | Central scheme index |
| Social Welfare and Women Empowerment Department | https://www.tnsocialwelfare.tn.gov.in/en | Women, child, marriage, and education-assurance schemes |
| Kalaingar Magalir Urimai Thogai portal | https://kmut.tn.gov.in/ | Official KMUT scheme portal and FAQ |
| Revenue Administration social security pensions | https://oap.tn.gov.in/ | Confirms pension scheme list and some beneficiary groups |
| Chief Minister’s Uzhavar Pathukappu Thittam | https://www.landreforms.tn.gov.in/UPT.html | Farmer social-security eligibility and benefits |
| CMUPT back-office (Revenue Department) | https://oap.tn.gov.in/cmupt/ | Confirms CMUPT G.O. and land/age rules |
| Chief Minister’s Comprehensive Health Insurance Scheme | https://www.cmchistn.com/eligibility | Official CMCHIS income and family rules |
| Commissionerate for Welfare of the Differently Abled | https://www.scd.tn.gov.in/activities.php | Disability maintenance allowance and related schemes |
| TNeGA e-Sevai service list | https://www.tnesevai.tn.gov.in/Pages/ServiceList.aspx | Official application channel and document lists |
| Pudhumai Penn institution portal | https://pudhumaipenn.tn.gov.in/ | Confirms scheme name and monthly assistance |

Rejected as primary sources: blogs, news explainers, coaching sites, YouTube, Wikipedia, and unofficial aggregators.

## 3. Scheme selection criteria

Phase 2 starts with about 10 schemes, not a full state catalog.

A scheme was included only if all of the following were true:

1. It appears on an official Tamil Nadu government department or portal page.
2. The official name can be copied from that page.
3. At least one eligibility factor or benefit statement can be quoted from that page.
4. The set as a whole covers different later ML features: age, income, gender, occupation, education, student status, marital status, widow status, disability, destitute status, land/assets, and school type.

Schemes were excluded when the only available page was unofficial, or when the official page named the scheme but gave no usable eligibility or benefit text.

## 4. Data fields

The catalog file is `dataset/raw/schemes.csv`.

Empty cells mean the official source does not apply that factor, or the factor was not stated. They are not zeros and they are not “not eligible”.

`NEEDS VERIFICATION` is used only in text fields when a criterion is expected or partly mentioned but cannot be confirmed from the official page. Numeric columns are left empty in that case, and the gap is written in `eligibility_notes`. This keeps later numeric parsing valid.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `scheme_id` | text | yes | Stable project identifier (`TN-<AREA>-<NNN>`) |
| `scheme_name` | text | yes | Official name from the source page |
| `department` | text | yes | Implementing or owning department as stated, or `NEEDS VERIFICATION` |
| `scheme_category` | text | no | Broad purpose (education, social security, health, marriage, disability, farmer welfare) |
| `description` | text | no | Short official purpose text |
| `age_min` | number | no | Minimum age in completed years, if stated |
| `age_max` | number | no | Maximum age in completed years, if stated |
| `gender_requirement` | text | no | Gender condition, if stated |
| `annual_income_limit` | number | no | Annual income ceiling in INR, if a single number is stated |
| `occupation_requirement` | text | no | Occupation or employment condition |
| `education_requirement` | text | no | Education condition |
| `student_status_requirement` | text | no | Whether the beneficiary must be a student |
| `marital_status_requirement` | text | no | Marital-status condition |
| `widow_status_requirement` | text | no | Widow-related condition |
| `disability_requirement` | text | no | Disability-type condition |
| `disability_percentage_min` | number | no | Minimum disability percentage, if stated |
| `bpl_requirement` | text | no | Below-poverty-line condition, if stated |
| `destitute_requirement` | text | no | Destitute/poor condition, if stated |
| `land_requirement` | text | no | Land-holding condition |
| `asset_limit` | text | no | Other asset or consumption limits (may be text, not a single number) |
| `family_condition` | text | no | Family-composition or head-of-household rule |
| `school_type_requirement` | text | no | Government / aided / medium-of-instruction rule |
| `district_requirement` | text | no | District restriction, if any |
| `benefit_description` | text | no | Benefit as stated on the official page |
| `required_documents` | text | no | Documents listed on an official page or e-Sevai service list |
| `application_method` | text | no | Official application channel |
| `official_source_url` | text | yes | Primary official URL used for the row |
| `source_access_date` | date | yes | ISO date the URL was read (`YYYY-MM-DD`) |
| `eligibility_notes` | text | no | Extra official conditions, conflicts, and verification gaps |
| `ml_scope` | text | yes | Phase 2.1: `CORE`, `ADVANCED`, or `HOLD` |
| `eligibility_rule_status` | text | yes | Phase 2.1: `VERIFIED`, `PARTIALLY_VERIFIED`, or `UNRESOLVED` |

`scheme_id` is a project key. It is not an official government scheme code.

Phase 2.1 review of these fields is in `docs/scheme_quality_review.md`.

## 5. Data quality rules

1. Do not invent scheme names, departments, benefits, or eligibility numbers.
2. Copy criteria only from the official URL stored in the same row.
3. If two official pages disagree, keep both statements in `eligibility_notes` and mark the conflicting field `NEEDS VERIFICATION`. Do not pick a winner.
4. If a page gives a qualitative phrase (“economically weaker families”) but no number, leave the numeric field empty and quote the phrase in `eligibility_notes`.
5. “No income ceiling” is recorded in notes. `annual_income_limit` stays empty.
6. Do not treat Wikipedia, news, or memory as a fill-in source.
7. `scheme_id` must be unique. `scheme_name` must not be empty. `official_source_url` must be present.
8. Do not add citizen names, Aadhaar numbers, or other personal data to this file.
9. Re-check `source_access_date` when a later phase refreshes a URL.

Validate with:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src/validate_scheme_dataset.py
```

## 6. How source URLs are recorded

- `official_source_url` is the single primary page used to fill the row.
- Supporting official pages (e-Sevai document lists, related portals) are named in `eligibility_notes`.
- URLs must be official `*.tn.gov.in`, `*.tn.nic.in`, or a department portal such as `cmchistn.com` / `kmut.tn.gov.in` that is operated for the Government of Tamil Nadu.
- `source_access_date` is the date the page was read, not the date the scheme was launched.

## 7. How conflicting information is handled

Conflicts found in Phase 2:

1. **E.V.R. Maniammaiyar Ninaivu Marriage Assistance Scheme** income ceiling is stated as Rs. 72,000 on one official Social Welfare URL and Rs. 1,20,000 on another official Social Welfare URL. `annual_income_limit` is empty. Both figures are in `eligibility_notes`.
2. **Dr. Muthulakshmi Reddy Ninaivu Inter-Caste Marriage Assistance Scheme** says the bride should have studied 10th standard and also that no minimum educational qualification is stipulated. `education_requirement` is `NEEDS VERIFICATION`.

Until a later official clarification (for example a Government Order) is attached, those fields stay unverified. The project will not average, guess, or silently choose one value.

## 8. Why citizen-level real-world personal data will not be collected

This is an academic project. Collecting real socio-economic records of residents would create privacy, consent, and legal risk (Aadhaar, ration-card, income, disability, and widow status are sensitive).

The scheme catalog is public policy information. Citizen attributes are not. Phase 2 therefore stores only scheme rules. No survey of residents, no scrape of beneficiary lists, and no use of identifiable government microdata is planned.

## 9. Future plan for synthetic citizen profiles

A later phase may create **synthetic** citizen profiles that exercise the fields in this catalog (age, gender, income, occupation, education, student status, marital/widow status, disability, destitute status, land, school type).

Those rows will be labelled from the documented rules in `schemes.csv`, not from real applications. Profiles will contain no real names or identity numbers. That work must not start until this catalog is reviewed and Phase 3 is approved.

## Phase 2 scheme catalog

| scheme_id | Official name | Primary official URL |
| --- | --- | --- |
| TN-SW-001 | Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/pudhumai-penn |
| TN-SW-002 | Tamil Pudhalvan Scheme | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/tamil-pudhalvan |
| TN-SW-003 | Chief Minister’s Girl Child Protection Scheme | https://www.tnsocialwelfare.tn.gov.in/en/specilisationschild-welfare/chief-ministers-girl-child-protection-scheme |
| TN-KMUT-001 | Kalaingar Magalir Urimai Thogai | https://kmut.tn.gov.in/faq.html |
| TN-SW-004 | Dr. Dharmambal Ammaiyar Ninaivu Widow Remarriage Assistance Scheme | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes |
| TN-SW-005 | E.V.R. Maniammaiyar Ninaivu Marriage Assistance Scheme for Daughters of Poor Widows | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes |
| TN-SW-006 | Annai Therasa Ninaivu Marriage Assistance Scheme for Orphan Girls | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes |
| TN-SW-007 | Dr. Muthulakshmi Reddy Ninaivu Inter-Caste Marriage Assistance Scheme | https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes |
| TN-HFW-001 | Chief Minister’s Comprehensive Health Insurance Scheme (CMCHIS) | https://www.cmchistn.com/eligibility |
| TN-REV-001 | Chief Minister’s Uzhavar Pathukappu Thittam 2011 | https://www.landreforms.tn.gov.in/UPT.html |
| TN-REV-002 | Un-married Women Pension | https://oap.tn.gov.in/ |
| TN-REV-003 | Destitute Widow Pension Scheme | https://oap.tn.gov.in/ |
| TN-DAW-001 | Maintenance Allowance for specified disabilities | https://www.scd.tn.gov.in/activities.php |
