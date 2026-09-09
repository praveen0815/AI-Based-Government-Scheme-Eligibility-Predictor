# Documentation

Project notes, data-source records, and later design documents.

| Document | Phase | Contents |
| --- | --- | --- |
| `dataset_collection.md` | 2 | Scheme schema, official sources, quality rules, and why real citizen data is not collected |
| `scheme_quality_review.md` | 2.1 | Per-scheme verification, CORE / ADVANCED / HOLD decisions |
| `citizen_feature_specification.md` | 2.1 | Minimum citizen attributes for CORE schemes |
| `ml_problem_definition.md` | 2.1 / 3 | Binary eligibility task, labeling rules, evaluation plan |
| `synthetic_data_generation.md` | 3 | Seed, generation strategy, and confirmation that no real personal data is used |
| `dataset_statistics.md` | 3 | Counts, per-scheme eligibility, and class imbalance |
| `dataset_inspection.md` | 4 | Read-only inspection of the labelled ML table |
| `ml_feature_engineering.md` | 4 | Feature vs leakage columns; why `scheme_id` is used |
| `ml_evaluation_strategy.md` | 4 | Citizen-grouped split and metrics |
| `model_baseline_results.md` | 4 | Overall and per-scheme baseline scores |
| `model_feature_analysis.md` | 4 / 5 | Coefficients, importances, and Phase 5 feature review |
| `rule_vs_ml_comparison.md` | 5 | Agreement of each model with the rule engine |
| `threshold_analysis.md` | 5 | Precision/recall at several probability cutoffs |
| `model_selection.md` | 5 | Why the Decision Tree is the prototype model |
| `ml_limitations.md` | 5 | Synthetic data and rule-reproduction limits |
| `phase5_results.md` | 5 | Phase 5 summary and next-phase recommendation |
| `api_design.md` | 6–11 | Prediction, recommendation, health, auth, wallet, and evaluation APIs |
| `recommendation_engine.md` | 7 | Eligibility-based recommendation design |
| `phase7_results.md` | 7 | Recommendation API results |
| `phase8_results.md` | 8 | React citizen portal |
| `data_wallet_design.md` | 9 | Unified socio-economic data wallet and PostgreSQL schema |
| `phase9_results.md` | 9 | PostgreSQL wallet implementation results |
| `authentication_design.md` | 10 | JWT auth, password hashing, and wallet ownership |
| `phase10_results.md` | 10 | Authentication implementation results |
| `evaluation_dashboard_design.md` | 11 | Research dashboard architecture and metric sources |
| `phase11_results.md` | 11 | Evaluation dashboard implementation results |
| `phase12_results.md` | 12 | Final UI/UX polish and demo readiness |
| `demo_walkthrough.md` | 12 | College-review demonstration script |
| `final_system_architecture.md` | 12 | End-to-end architecture summary |
| `phase13_ui_redesign.md` | 13 | SchemeWise AI frontend redesign |
| `hybrid_rule_ml_design.md` | 13 | Hybrid documented-rule + Decision Tree design |
| `phase13_results.md` | 13 | Hybrid engine implementation results |
| `scheme_comparison_design.md` | 15 | CORE scheme comparison using the saved wallet |
| `pdf_report_design.md` | 15 | On-demand recommendation PDF |
| `phase15_results.md` | 15 | Comparison and PDF implementation results |
| `i18n_design.md` | 16 | English / Tamil translation structure and PDF language |
| `phase16_results.md` | 16 | Multilingual implementation results |
| `document_checklist_design.md` | 19 | Smart document checklist and application preparation progress |
| `phase19_results.md` | 19 | Document checklist implementation results |
| `eligibility_insights_design.md` | 20 | Personalized eligibility insights from the saved wallet |
| `phase20_results.md` | 20 | Eligibility insights implementation results |
| `security_hardening.md` | 21 | Authentication, CORS, headers, logging, and remaining production risks |
| `phase21_results.md` | 21 | Security hardening implementation results |
| `application_readiness_design.md` | 21+ | Manual application-readiness stages for recommended CORE schemes |
| `application_readiness_results.md` | 21+ | Application readiness tracker implementation results |
| `dashboard_progress_design.md` | 22 | Personalized progress, journey, and activity dashboard |
| `phase22_results.md` | 22 | Personalized dashboard implementation results |
| `document_upload_design.md` | 23 | Optional non-sensitive supporting document uploads |
| `phase23_results.md` | 23 | Supporting document upload implementation results |
| `notifications_design.md` | 24 | Owner-only in-app reminders from existing prototype activity |
| `phase24_results.md` | 24 | Notifications and reminders implementation results |
| `catalog_search_design.md` | 25 | Catalog search and filters over the official 13 scheme rows |
| `phase25_results.md` | 25 | Advanced scheme search implementation results |
| `explainability_design.md` | 26 | Plain-language Why this scheme? view of hybrid results |
| `phase26_results.md` | 26 | Explainable recommendation view implementation results |
| `account_settings_design.md` | 27 | Account settings, password, wallet links, and owner-only deletion |
| `phase27_results.md` | 27 | Account and profile management implementation results |
| `performance_evaluation_design.md` | 29 | In-process API timings and research evaluation summary |
| `phase29_results.md` | 29 | Performance and system evaluation implementation results |
| `final_system_flow.md` | 30 | End-to-end architecture, demo flow, modules, and limits |
| `phase30_results.md` | 30 | Final integration and demo-readiness results |
| `voice_assistant_design.md` | 31–32 | Voice interaction layer over the existing eligibility APIs |
| `phase31_results.md` | 31 | Voice assistant implementation results |
| `phase32_results.md` | 32 | Voice assistant UX, reliability, and accessibility results |
| `scheme_discovery_design.md` | 33 | Personalized catalog search, filters, sort, and compare discovery |
| `phase33_results.md` | 33 | Scheme discovery and smart filtering implementation results |
| `explainable_eligibility_design.md` | 35 | Why this result? using existing hybrid fields only |
| `eligibility_simulator_design.md` | 36 | Temporary profile copy and public `/recommend` simulation |
| `application_tracking_design.md` | 36 | Owner-only application tracking, no government submit |
| `personalized_dashboard_design.md` | 37 | Dashboard snapshot and quick actions over existing APIs |
| `research_dashboard_design.md` | 37 | Protected research summary of Phase 29 metrics |
| `advanced_voice_assistant_design.md` | 38 | Conversational intents over existing capabilities |
| `smart_notifications_design.md` | 38 | Incomplete-evaluation and application-tracking reminders |
| `phase35_38_results.md` | 35–38 | Coordinated citizen-assistance enhancement results |
| `phase43_results.md` | 43 | Final integration, QA, security, and demo-readiness results |

Aadhaar, LLMs, and deployment remain out of scope.
