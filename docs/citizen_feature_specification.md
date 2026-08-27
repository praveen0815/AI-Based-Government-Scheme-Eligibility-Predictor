# Citizen feature specification

Phase 2.1. These attributes are the **minimum** set required to label the six **CORE** schemes. They are not a full socio-economic wallet.

Phase 3 generated these fields in `dataset/raw/citizens.csv`. No extra wallet fields were added.

Features that appear only on ADVANCED or HOLD schemes (for example KMUT electricity use, CMCHIS special enrollment, girl-child sterilisation, inter-caste community pairing, disability percentage) are **excluded** here.

## Feature list

### age

- **type:** integer
- **range:** 0–120 (completed years)
- **why required:** TN-REV-001 membership is ages 18–65. TN-REV-002 requires age 50 or above. CORE marriage-assistance labels will also apply age 18 or above using the Social Welfare Department statement that marriage assistance is designed for girls who have completed 18 years (`https://www.tnsocialwelfare.tn.gov.in/en/social-legislations/prohibition-of-child-marriage-act`). That convention is not written into `age_min` on the scheme rows.
- **used_by:** TN-REV-001, TN-REV-002, TN-SW-004, TN-SW-006
- **required:** yes

### gender

- **type:** categorical
- **allowed values:** `female`, `male`, `transgender`
- **why required:** Pudhumai Penn is for girls. Tamil Pudhalvan is for boys. The two CORE marriage schemes and the unmarried-women pension are for women.
- **used_by:** TN-SW-001, TN-SW-002, TN-SW-004, TN-SW-006, TN-REV-002
- **required:** yes

### is_student

- **type:** boolean
- **allowed values:** `true`, `false`
- **why required:** Both higher-education assurance schemes require the beneficiary to be a student.
- **used_by:** TN-SW-001, TN-SW-002
- **required:** yes

### first_higher_education_course

- **type:** boolean
- **allowed values:** `true`, `false`
- **why required:** Official pages for TN-SW-001 and TN-SW-002 state that only the first undergraduate degree, diploma or ITI course is eligible.
- **used_by:** TN-SW-001, TN-SW-002
- **required:** yes

### school_background

- **type:** categorical
- **allowed values:** `government_6_to_12`, `government_or_aided_tamil_medium_6_to_12`, `other`
- **why required:** Pudhumai Penn requires Classes 6–12 in Government schools. Tamil Pudhalvan requires Classes 6–12 in Government schools and Government-aided schools in Tamil medium. A person who satisfies the Tamil Pudhalvan school rule does not automatically satisfy the Pudhumai Penn Government-only rule.
- **used_by:** TN-SW-001, TN-SW-002
- **required:** yes

### marital_status

- **type:** categorical
- **allowed values:** `never_married`, `married`, `widow`, `widow_remarrying`
- **why required:** TN-REV-002 requires an unmarried woman. TN-SW-004 requires a widow who is remarrying. TN-SW-006 is a marriage-assistance scheme for an orphan girl.
- **used_by:** TN-SW-004, TN-SW-006, TN-REV-002
- **required:** yes

### is_orphan

- **type:** boolean
- **allowed values:** `true`, `false`
- **why required:** TN-SW-006 is only for orphan girls.
- **used_by:** TN-SW-006
- **required:** yes

### is_destitute

- **type:** boolean
- **allowed values:** `true`, `false`
- **why required:** TN-REV-002 requires the applicant to be destitute and poor. The official source does not give a rupee figure, so this remains a boolean copy of that official phrase. It is not a substitute BPL flag.
- **used_by:** TN-REV-002
- **required:** yes

### occupation_category

- **type:** categorical
- **allowed values:** `small_marginal_farmer`, `agricultural_labourer`, `inland_fishing`, `plantation_labourer`, `other`
- **why required:** TN-REV-001 lists who may enroll as a main member. Values follow the official occupation groups. Allied farm activities named on the official page (horticulture, sericulture, dairy, poultry, livestock, inland fishing) are treated as `small_marginal_farmer` or `inland_fishing` as appropriate when synthetic rows are designed later. `other` is not eligible for TN-REV-001.
- **used_by:** TN-REV-001
- **required:** yes

### wet_land_acres

- **type:** numeric
- **range:** >= 0
- **why required:** TN-REV-001 allows wet land not exceeding 2.50 acres (or the dry-land alternative). Agricultural labourers may have 0.
- **used_by:** TN-REV-001
- **required:** yes

### dry_land_acres

- **type:** numeric
- **range:** >= 0
- **why required:** TN-REV-001 allows dry land not exceeding 5.00 acres (or the wet-land alternative).
- **used_by:** TN-REV-001
- **required:** yes

## Features deliberately omitted

| Omitted field | Reason |
| --- | --- |
| `annual_income` | No CORE scheme has a single verified income ceiling. Including it now would only serve ADVANCED/HOLD schemes. |
| `bpl` | Not stated as a separate official test on any CORE scheme. |
| `disability_status` / `disability_percentage` | The only disability scheme is HOLD. |
| `is_daughter_of_widow` | That factor belongs to TN-SW-005, which is HOLD. |
| `community` / `caste_category` | Needed only for the unresolved inter-caste scheme. |
| KMUT asset and employment exclusions | TN-KMUT-001 is ADVANCED. |
| Girl-child count and sterilisation | TN-SW-003 is ADVANCED. |
| District | No CORE scheme is district-restricted. |

## How a later citizen row will be used

Each synthetic citizen (Phase 3, after approval) will be paired with each CORE `scheme_id`. The label is computed only from this feature set and the verified CORE rules. Unresolved fields are not used to force a label.
