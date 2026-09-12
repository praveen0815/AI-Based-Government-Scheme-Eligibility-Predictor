/** Types match the FastAPI Pydantic schemas in backend/app/schemas/. */

export type Gender = "female" | "male" | "transgender";
export type SchoolBackground =
  | "government_6_to_12"
  | "government_or_aided_tamil_medium_6_to_12"
  | "other";
export type MaritalStatus = "never_married" | "married" | "widow" | "widow_remarrying";
export type OccupationCategory =
  | "small_marginal_farmer"
  | "agricultural_labourer"
  | "inland_fishing"
  | "plantation_labourer"
  | "other";
export type PredictionLabel = "eligible" | "not_eligible";

export interface CitizenProfile {
  age: number;
  gender: Gender;
  is_student: boolean;
  first_higher_education_course: boolean;
  school_background: SchoolBackground;
  marital_status: MaritalStatus;
  is_orphan: boolean;
  is_destitute: boolean;
  occupation_category: OccupationCategory;
  wet_land_acres: number;
  dry_land_acres: number;
}

export interface RuleResult {
  eligible: boolean;
  reasons: string[];
  rule_status?: string | null;
  verification_notes?: string | null;
}

export interface RecommendedScheme {
  scheme_id: string;
  scheme_name: string;
  department: string | null;
  scheme_category: string | null;
  description: string | null;
  prediction: "eligible";
  status_label: "Predicted eligible";
  eligible_probability: number;
  not_eligible_probability: number;
  reason: string;
  benefit: string | null;
  required_documents: string | null;
  application_method: string | null;
  official_source_url: string | null;
  rule_result?: RuleResult;
  rule_reasons?: string[];
  ml_prediction?: PredictionLabel;
  agreement?: boolean;
}

export interface EvaluatedScheme {
  scheme_id: string;
  scheme_name: string;
  prediction: PredictionLabel;
  eligible_probability: number;
  not_eligible_probability: number;
  reason: string;
  rule_eligible?: boolean;
  ml_prediction?: PredictionLabel;
  agreement?: boolean;
}

export interface RecommendResponse {
  total_schemes_evaluated: number;
  eligible_scheme_count: number;
  ranking_rule: string;
  recommendations: RecommendedScheme[];
  evaluated_schemes: EvaluatedScheme[];
  disclaimer: string;
}

export interface SchemeCatalogItem {
  scheme_id: string;
  scheme_name: string;
  department: string | null;
  scheme_category: string | null;
  description: string | null;
  benefit_description: string | null;
  required_documents: string | null;
  application_method: string | null;
  official_source_url: string | null;
  eligibility_notes: string | null;
  ml_scope: string;
  eligibility_rule_status: string | null;
}

export interface SchemeCatalogResponse {
  scheme_count: number;
  schemes: SchemeCatalogItem[];
}

export interface CatalogSearchItem extends SchemeCatalogItem {
  gender_requirement: string | null;
  student_status_requirement: string | null;
}

export interface CatalogFilterOptions {
  ml_scopes: string[];
  departments: string[];
  genders: string[];
  student_statuses: string[];
  categories: string[];
}

export interface CatalogSearchResponse {
  scheme_count: number;
  total_catalog_count: number;
  schemes: CatalogSearchItem[];
  filters: CatalogFilterOptions;
  disclaimer: string;
}

export interface AuthUser {
  user_id: string;
  full_name: string;
  email: string;
  has_password?: boolean;
  has_google?: boolean;
  is_admin?: boolean;
  created_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
}

export interface EvaluationOverview {
  official_scheme_count: number;
  core_scheme_count: number;
  dataset_citizen_count: number;
  eligibility_record_count: number;
  eligible_count: number;
  not_eligible_count: number;
  eligible_percentage: number;
  not_eligible_percentage: number;
  train_citizen_count: number;
  test_citizen_count: number;
  selected_model: string;
  model_type: string;
  synthetic_data: boolean;
  rule_derived_labels: boolean;
}

export interface ModelMetrics {
  model_key: string;
  model: string;
  selected: boolean;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  balanced_accuracy: number;
  roc_auc: number;
  pr_auc: number;
}

export interface ModelComparisonResponse {
  models: ModelMetrics[];
  note: string;
}

export interface SchemeDistribution {
  scheme_id: string;
  scheme_name: string;
  eligible_count: number;
  not_eligible_count: number;
  eligible_percentage: number;
  official_source_url: string | null;
}

export interface SchemeEvaluationResponse {
  schemes: SchemeDistribution[];
  note: string;
}

export interface FeatureRow {
  feature: string;
  value: number;
}

export interface FeatureAnalysisResponse {
  decision_tree_importance: FeatureRow[];
  logistic_regression_coefficients: FeatureRow[];
  random_forest_importance: FeatureRow[];
  note: string;
}

export interface ConfusionMatrixRow {
  model: string;
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}

export interface ConfusionMatrixResponse {
  matrices: ConfusionMatrixRow[];
  note: string;
}

export interface LimitationItem {
  id: string;
  title: string;
  detail: string;
}

export interface OfficialSource {
  scheme_id: string;
  scheme_name: string;
  official_source_url: string | null;
}

export interface LimitationsResponse {
  prototype_notice: string;
  limitations: LimitationItem[];
  official_sources: OfficialSource[];
}

export interface HybridEvaluationResponse {
  model: string;
  test_citizen_count: number;
  test_row_count: number;
  agreement_count: number;
  disagreement_count: number;
  agreement_percentage: number;
  note: string;
  source: string;
}

export interface EvaluationBundle {
  overview: EvaluationOverview;
  models: ModelComparisonResponse;
  schemes: SchemeEvaluationResponse;
  features: FeatureAnalysisResponse;
  confusion: ConfusionMatrixResponse;
  limitations: LimitationsResponse;
  hybrid: HybridEvaluationResponse;
}

export interface CitizenWallet {
  citizen_id: string;
  age: number;
  gender: Gender;
  is_student: boolean;
  first_higher_education_course: boolean;
  school_background: SchoolBackground;
  marital_status: MaritalStatus;
  is_orphan: boolean;
  is_destitute: boolean;
  occupation_category: OccupationCategory;
  wet_land_acres: number;
  dry_land_acres: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileCompleteness {
  percentage: number;
  completed_fields: number;
  total_fields: number;
  incomplete_fields: string[];
}

export type InsightReviewCode =
  | "verify_profile"
  | "complete_profile"
  | "review_official_source"
  | "review_disagreement";

export interface InsightScheme {
  scheme_id: string;
  scheme_name: string;
  official_source_url: string | null;
  status_label: "Predicted eligible" | "Not recommended by this prototype";
  predicted_eligible: boolean;
  reason: string;
  rule_reasons: string[];
  rule_eligible: boolean;
  ml_prediction: PredictionLabel;
  eligible_probability: number;
  not_eligible_probability: number;
  agreement: boolean;
}

export interface InsightReviewItem {
  code: InsightReviewCode;
  text: string;
}

export type ReadinessStage =
  | "not_started"
  | "profile_ready"
  | "documents_in_progress"
  | "ready_to_apply"
  | "official_source_visited"
  | "completed_preparation";

export interface SchemeReadiness {
  scheme_id: string;
  scheme_name: string;
  official_source_url: string | null;
  stage: ReadinessStage;
  stage_index: number;
  stage_count: number;
  progress_percent: number;
  has_saved_progress: boolean;
  updated_at: string | null;
  disclaimer: string;
}

export interface ReadinessProgressResponse {
  schemes: SchemeReadiness[];
  schemes_being_prepared: number;
  overall_progress_percent: number;
  disclaimer: string;
}

export type DashboardJourneyKey =
  | "profile_created"
  | "profile_completed"
  | "eligibility_checked"
  | "schemes_recommended"
  | "documents_prepared"
  | "application_readiness";

export type DashboardJourneyStatus = "completed" | "current" | "pending";

export type DashboardActivityKind = "recommendation" | "document" | "readiness";

export interface DashboardProgress {
  profile_completeness_percent: number;
  eligibility_checked: boolean;
  latest_recommendation_count: number;
  document_progress_percent: number;
  readiness_progress_percent: number;
}

export interface DashboardJourneyStep {
  key: DashboardJourneyKey;
  status: DashboardJourneyStatus;
}

export interface DashboardSummary {
  total_recommended_schemes: number;
  schemes_being_prepared: number;
  schemes_with_document_progress: number;
  overall_preparation_progress: number;
}

export interface DashboardActivityItem {
  kind: DashboardActivityKind;
  occurred_at: string;
  scheme_id?: string | null;
  scheme_name?: string | null;
  recommendation_count?: number | null;
  history_id?: string | null;
  document_progress_percent?: number | null;
  readiness_stage?: string | null;
}

export interface DashboardOverviewResponse {
  has_wallet: boolean;
  progress: DashboardProgress;
  journey: DashboardJourneyStep[];
  summary: DashboardSummary;
  activity: DashboardActivityItem[];
  disclaimer: string;
}

export type SupportingUploadCategory =
  | "identity_proof_demo"
  | "address_proof"
  | "education_certificate"
  | "income_certificate"
  | "community_certificate"
  | "other_supporting";

export interface SupportingUpload {
  id: string;
  category: SupportingUploadCategory;
  display_name: string;
  stored_filename: string;
  content_type: string;
  size_bytes: number;
  scheme_id: string | null;
  scheme_name: string | null;
  review_status?: DocumentReviewStatus;
  created_at: string;
  disclaimer: string;
}

export interface SupportingUploadListResponse {
  uploads: SupportingUpload[];
  count: number;
  disclaimer: string;
}

export interface InsightsResponse {
  total_schemes_evaluated: number;
  predicted_eligible_count: number;
  not_recommended_count: number;
  recommended_schemes: InsightScheme[];
  other_schemes: InsightScheme[];
  completeness: ProfileCompleteness;
  review_items: InsightReviewItem[];
  disclaimer: string;
}

export interface HistorySchemeRef {
  scheme_id: string;
  scheme_name: string;
}

export interface RecommendationHistoryItem {
  id: string;
  checked_at: string;
  profile_snapshot: CitizenProfile;
  recommended_scheme_ids: string[];
  recommendation_count: number;
  recommended_schemes: HistorySchemeRef[];
}

export interface RecommendationHistoryListResponse {
  count: number;
  history: RecommendationHistoryItem[];
}

export interface ComparedScheme {
  scheme_id: string;
  scheme_name: string;
  department: string | null;
  scheme_category: string | null;
  description: string | null;
  eligibility_notes: string | null;
  benefit: string | null;
  required_documents: string | null;
  application_method: string | null;
  official_source_url: string | null;
  recommended: boolean;
  status_label: string;
  prediction: PredictionLabel;
  eligible_probability: number;
  not_eligible_probability: number;
  reason: string;
  rule_result?: RuleResult;
  rule_reasons?: string[];
  ml_prediction?: PredictionLabel;
  agreement?: boolean;
}

export interface CompareResponse {
  scheme_count: number;
  schemes: ComparedScheme[];
  disclaimer: string;
}

export type DocumentPrepStatus = "not_started" | "ready" | "needs_verification";
export type DocumentItemSource = "catalog" | "project_reminder";

export interface DocumentChecklistItem {
  item_key: string;
  label: string;
  source: DocumentItemSource;
  status: DocumentPrepStatus;
  updated_at: string | null;
}

export interface SchemeDocumentChecklist {
  scheme_id: string;
  scheme_name: string;
  official_source_url: string | null;
  documents_need_verification: boolean;
  required_documents_text: string | null;
  ready_count: number;
  item_count: number;
  progress_percent: number;
  has_saved_progress: boolean;
  items: DocumentChecklistItem[];
  disclaimer: string;
}

export interface SchemeDocumentSummary {
  scheme_id: string;
  scheme_name: string;
  official_source_url: string | null;
  documents_need_verification: boolean;
  ready_count: number;
  item_count: number;
  progress_percent: number;
  has_saved_progress: boolean;
}

export interface DocumentProgressResponse {
  schemes: SchemeDocumentSummary[];
  schemes_with_progress: number;
  overall_ready_count: number;
  overall_item_count: number;
  overall_progress_percent: number;
  disclaimer: string;
}

export type NotificationType =
  | "profile_incomplete"
  | "document_attention"
  | "readiness_in_progress"
  | "recommendation"
  | "eligibility_incomplete"
  | "application_status";

export type NotificationFeature = "wallet" | "documents" | "readiness" | "history" | "applications";

export type ApplicationStatus =
  | "not_applied"
  | "planning"
  | "documents_ready"
  | "applied"
  | "under_review"
  | "approved"
  | "rejected";

export interface ApplicationItem {
  application_id: string;
  scheme_id: string;
  scheme_name: string;
  department: string | null;
  required_documents: string | null;
  official_source_url: string | null;
  status: ApplicationStatus;
  application_date: string | null;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}

export interface ApplicationListResponse {
  applications: ApplicationItem[];
  count: number;
  disclaimer: string;
}

export interface NotificationItem {
  notification_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_feature: NotificationFeature;
  related_id: string | null;
  href: string;
  is_read: boolean;
  created_at: string;
  count: number | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
  disclaimer: string;
}

export interface EndpointPerformance {
  endpoint: string;
  request_count: number;
  error_count: number;
  average_ms: number | null;
  min_ms: number | null;
  max_ms: number | null;
}

export interface ApiPerformanceSummary {
  note: string;
  started_at: string;
  endpoints: EndpointPerformance[];
}

export interface SystemHealth {
  status: string;
  database: string;
  environment: string;
  model_loaded: boolean;
  evaluation_ready: boolean;
}

export interface SystemEvaluationResponse {
  prototype_notice: string;
  ml_metrics_note: string;
  api_metrics_note: string;
  dataset: EvaluationOverview;
  models: ModelMetrics[];
  hybrid: HybridEvaluationResponse;
  api_performance: ApiPerformanceSummary;
  health: SystemHealth;
}

export type DocumentReviewStatus = "pending" | "verified" | "rejected";
export type AdminEligibilityLabel = "eligible" | "not_eligible" | "cannot_fully_evaluate" | "not_evaluated";
export type AdminActivityType = "history" | "upload" | "application" | "wallet";

export interface AdminActivityItem {
  activity_type: AdminActivityType;
  occurred_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  summary: string;
}

export interface AdminOverviewResponse {
  total_users: number;
  active_users: number;
  total_document_uploads: number;
  pending_document_reviews: number;
  verified_documents: number;
  rejected_documents: number;
  eligible_scheme_results: number;
  not_eligible_scheme_results: number;
  cannot_fully_evaluate_users: number;
  recent_activity: AdminActivityItem[];
  disclaimer: string;
}

export interface AdminUserSummary {
  user_id: string;
  full_name: string;
  email: string;
  has_wallet: boolean;
  is_admin: boolean;
  created_at?: string | null;
  last_activity_at?: string | null;
}

export interface AdminUserListResponse {
  users: AdminUserSummary[];
  count: number;
  disclaimer: string;
}

export interface AdminWalletView {
  citizen_id: string;
  age: number;
  gender: string;
  is_student: boolean;
  first_higher_education_course: boolean;
  school_background: string;
  marital_status: string;
  is_orphan: boolean;
  is_destitute: boolean;
  occupation_category: string;
  wet_land_acres: number;
  dry_land_acres: number;
}

export interface AdminEligibilityView {
  has_wallet: boolean;
  prediction_label: AdminEligibilityLabel;
  eligible_scheme_count: number;
  evaluated_schemes: EvaluatedScheme[];
  incomplete_fields: string[];
  last_checked_at: string | null;
  disclaimer: string;
}

export interface AdminUserDetailResponse {
  user: AdminUserSummary;
  wallet: AdminWalletView | null;
  completeness: ProfileCompleteness | null;
  eligibility: AdminEligibilityView;
  applications: ApplicationItem[];
  history: RecommendationHistoryItem[];
  disclaimer: string;
}

export interface AdminDocumentItem {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
  category: string;
  display_name: string;
  content_type: string;
  size_bytes: number;
  scheme_id: string | null;
  scheme_name: string | null;
  review_status: DocumentReviewStatus;
  created_at: string;
}

export interface AdminDocumentListResponse {
  documents: AdminDocumentItem[];
  count: number;
  disclaimer: string;
}

export interface AdminEligibilityRow {
  user_id: string;
  full_name: string;
  email: string;
  has_wallet: boolean;
  prediction_label: AdminEligibilityLabel;
  eligible_scheme_count: number;
  evaluated_schemes: EvaluatedScheme[];
  incomplete_fields: string[];
  last_checked_at: string | null;
}

export interface AdminEligibilityListResponse {
  users: AdminEligibilityRow[];
  count: number;
  disclaimer: string;
}

export type AdminVoiceAuditOutcome = "ok" | "denied" | "ambiguous" | "error" | "cancelled" | "not_found";

export interface AdminVoiceAuditCreate {
  intent: string;
  outcome: AdminVoiceAuditOutcome;
  target_user_id?: string | null;
  transcript_hash: string;
}

export interface AdminVoiceAuditResponse {
  id: string;
  admin_user_id: string;
  intent: string;
  outcome: AdminVoiceAuditOutcome;
  target_user_id: string | null;
  transcript_hash: string;
  created_at: string;
  disclaimer: string;
}

export interface VoiceStatusResponse {
  stt_provider: "browser" | "cloud";
  tts_provider: "browser_neural";
  cloud_stt_available: boolean;
  https_required: boolean;
  audio_retained: boolean;
  disclaimer: string;
}

export interface VoiceTranscribeResponse {
  transcript: string;
  language: string;
  provider: string;
  audio_retained: boolean;
  disclaimer: string;
}
