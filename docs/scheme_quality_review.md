# Phase 2.1 — Scheme quality review

Review date: **2026-08-14**.

This review classifies every eligibility field in `dataset/raw/schemes.csv` as **VERIFIED** (stated on the row’s official source), **NEEDS VERIFICATION** (expected or partly mentioned but not confirmed), or **NOT APPLICABLE** (official source does not use that factor). Missing values were not guessed. Conflicting official statements are kept, not averaged.

`ml_scope` and `eligibility_rule_status` were added to the catalog. No scheme row was deleted.

## Decision rules

| `ml_scope` | Meaning |
| --- | --- |
| `CORE` | Eligibility factors needed for a first binary label are clear enough to encode without inventing numbers. |
| `ADVANCED` | The scheme is official, but rules need extra features or special enrollment paths. Hold for a later dataset. |
| `HOLD` | A material eligibility factor is missing or two official statements conflict. Do not label yet. |

| `eligibility_rule_status` | Meaning |
| --- | --- |
| `VERIFIED` | The factors that would be used for labeling are stated on the official source. |
| `PARTIALLY_VERIFIED` | Core labeling factors are stated; documents, benefit amount, or a non-label field is still open. |
| `UNRESOLVED` | A material labeling factor is missing or officially contradictory. |

Documents and application-channel gaps do **not** by themselves send a scheme to `HOLD` if the eligibility rule for labeling is clear.

## Review table

| Scheme | Eligibility Factors | Verified | Needs Verification | ML Suitability | Decision |
| --- | --- | --- | --- | --- | --- |
| TN-SW-001 Pudhumai Penn | Gender; student; first UG/diploma/ITI; Government school Classes 6–12 | Female; must be a student in the first recognised higher-education course; Government schools 6–12; Rs. 1,000/month | Required documents; numeric income (page says “economically weaker families” only) | Clear binary rules on gender, student status and school type. Income is not used for labeling. | CORE / PARTIALLY_VERIFIED |
| TN-SW-002 Tamil Pudhalvan | Gender; student; first UG/diploma/ITI; Government or Government-aided Tamil-medium school 6–12 | Male; must be a student in the first recognised higher-education course; school-type rule above; Rs. 1,000/month | Required documents; exact portal name; numeric income | Same structure as Pudhumai Penn with a different gender and school-type rule. | CORE / PARTIALLY_VERIFIED |
| TN-SW-003 CM Girl Child Protection | Gender; income; one or two girl children only; parent sterilisation before age 40; 10th exam for maturity payment | Female; annual income Rs. 1,20,000; family of one or two girls only; sterilisation age 40; deposit terms | Application age; required documents; application channel. `age_max=18` is the maturity age, not an application ceiling. | Needs extra family-planning features and has no application-age rule. | ADVANCED / PARTIALLY_VERIFIED |
| TN-KMUT-001 Kalaingar Magalir Urimai Thogai | Age 21+; female / selected family head; income Rs. 2.5 lakh; land; electricity; four-wheeler; government-employee and pension exclusions | Age 21; economic tests; land; asset/exclusion list; one woman per family card; Rs. 1,000/month | English nodal department title | Rules are official but the exclusion list is too large for the first feature set. | ADVANCED / PARTIALLY_VERIFIED |
| TN-SW-004 Dharmambal widow remarriage | Female; widow remarrying; no income ceiling; no education bar | Female; widow remarriage; no income ceiling; no education qualification; benefit amounts | Scheme-specific age; documents; office procedure | Labeling can use gender and widow-remarriage. Department page on child marriage says marriage assistance is designed for girls who have completed 18; that statement is a documented labeling convention, not a new `age_min` invented in the CSV. | CORE / PARTIALLY_VERIFIED |
| TN-SW-005 EVR Maniammaiyar | Female; daughter of a poor widow; income ceiling | Female; daughter of a poor widow; benefit amounts | **Income ceiling unresolved** (Rs. 72,000 vs Rs. 1,20,000). Education for eligibility. Documents. Age. | Income is the operational meaning of “poor”. It cannot be labeled until one official figure is authoritative. | HOLD / UNRESOLVED |
| TN-SW-006 Annai Therasa orphan girls | Female; orphan girl; no income ceiling; no education bar | Female; orphan; no income ceiling; no education qualification; benefit amounts | Scheme-specific age; documents; office procedure | Labeling can use gender and orphan status, with the same department-level 18+ marriage-assistance convention as TN-SW-004. | CORE / PARTIALLY_VERIFIED |
| TN-SW-007 Muthulakshmi Reddy inter-caste | Female; inter-caste couple; education; no income ceiling; community Category I / II | Female; inter-caste marriage; no income ceiling; Category I (one spouse SC/ST) and Category II (FC/unreserved + BC/MBC); benefit amounts | **Education unresolved** (10th pass and “no minimum educational qualification” on the same official pages). Documents. Age. | Education cannot be labeled consistently. Community pairing would also add caste features. | HOLD / UNRESOLVED |
| TN-HFW-001 CMCHIS | Family income; family-card members | Annual family income below Rs. 1,20,000 (G.O. Ms. No. 560, H&FW, 16.12.2021); spouse, children, dependent parents on the family card | Sum insured / packages; special enrollment categories (orphans, Disabled Welfare Board, child-care institutions, press, and others) | Income rule is simple, but enrollment is a multi-category insurance product, not the same citizen–scheme rule frame as the CORE set. | ADVANCED / PARTIALLY_VERIFIED |
| TN-REV-001 CM Uzhavar Pathukappu Thittam | Age 18–65; farmer / agri-labour / allied occupation; wet ≤ 2.50 acres or dry ≤ 5.00 acres | Age 18–65; occupation list; land limits; dependant list; G.O. Ms. No. 265, Revenue, 10.09.2011 | None for membership eligibility. Individual benefit sub-rules (marriage, funeral, education rates) are out of the first label. | First ML label is “eligible to enroll as a main member”, which is clearly stated. | CORE / VERIFIED |
| TN-REV-002 Un-married Women Pension | Female; unmarried; age 50+; destitute and poor | Female; unmarried; age 50+; destitute and poor | Numeric income / BPL; monthly pension amount | Qualitative “destitute and poor” is encoded as a boolean. No invented income number. | CORE / PARTIALLY_VERIFIED |
| TN-REV-003 Destitute Widow Pension | Female; widow; destitute | Female; widow; destitute; e-Sevai document list | **Age, income, BPL, pension amount** still not stated on https://oap.tn.gov.in/ or a usable `tn.gov.in` scheme_details page | Labeling any-age destitute widow would invent an age rule by omission. | HOLD / UNRESOLVED |
| TN-DAW-001 Maintenance Allowance | Specified disability types | Monthly Rs. 1,000 for severe disability, muscular dystrophy, intellectual disability (page wording: mental retardation), or leprosy-cured persons | **Disability percentage for this allowance**; meaning of “severe”; income; age; documents | 40% on the same page is for the Disability Identity Card only and is not used as the allowance threshold. | HOLD / UNRESOLVED |

## Conflict re-checks

### 1. EVR Maniammaiyar income

| Official page | Income figure read |
| --- | --- |
| https://tnsocialwelfare.tn.gov.in/en/specilisationswomen-welfare/marriage-assistance-schemes | Rs. 72,000 (Phase 2.1) |
| https://www.tnsocialwelfare.tn.gov.in/en/specilisations/women-welfare | Rs. 72,000 (Phase 2.1) |
| https://www.tnsocialwelfare.tn.gov.in/ta/node/6521 | Rs. 72,000 (Phase 2.1) |
| https://www.tnsocialwelfare.tn.gov.in/en/specilisationswoman-welfare/marriage-assistance-schemes | Rs. 1,20,000 (Phase 2) |

No Government Order naming a current ceiling was found. `annual_income_limit` stays empty. Status: **UNRESOLVED**.

### 2. Muthulakshmi Reddy education

The official marriage-assistance pages still say both:

- “The bride should have studied 10th Std pass.”
- “There is no income ceiling and minimum educational qualification stipulated.”

No later clarification or Government Order was found. Both sentences stay in `eligibility_notes`. Status: **UNRESOLVED**.

### 3. Destitute Widow Pension

https://oap.tn.gov.in/ confirms the scheme and the destitute-widow group. It does not state age, income, BPL, or amount. `tn.gov.in` scheme_details pages did not return usable eligibility text in this review. Status: **UNRESOLVED**.

### 4. Maintenance Allowance percentage

https://scd.tn.gov.in/Mintantance_allowance.php lists four subtypes and does not state a percentage. The 40% figure on https://www.scd.tn.gov.in/activities.php is for the Disability Identity Card. It is **not** copied into `disability_percentage_min`. Status: **UNRESOLVED**.

### 5. CMCHIS and the first ML framework

The published income rule is usable, but official enrollment also uses special categories that the CORE citizen features do not cover. CMCHIS is **ADVANCED**, not CORE.

## Selected CORE set

Six schemes. The brief asked for about 8–12. Extra schemes were not moved into CORE just to reach that count.

| scheme_id | Why CORE |
| --- | --- |
| TN-SW-001 | Gender, student, school-type rules are official and labelable. |
| TN-SW-002 | Same, with male and aided Tamil-medium variation. |
| TN-SW-004 | Widow remarriage rule is official. |
| TN-SW-006 | Orphan-girl rule is official. |
| TN-REV-001 | Age, occupation and land limits are official. |
| TN-REV-002 | Age, gender, unmarried and destitute rules are official. |

ADVANCED: TN-SW-003, TN-KMUT-001, TN-HFW-001.

HOLD: TN-SW-005, TN-SW-007, TN-REV-003, TN-DAW-001.
