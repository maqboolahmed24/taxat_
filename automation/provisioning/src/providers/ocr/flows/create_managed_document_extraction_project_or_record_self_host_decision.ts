import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  rankSelectors,
  type SelectorDescriptor,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const OCR_PROVIDER_ID = "document-extraction-control-plane";
export const DOCUMENT_EXTRACTION_FLOW_ID =
  "managed-document-extraction-project-selection";
export const OCR_PROVIDER_DISPLAY_NAME = "Document Extraction Control Plane";
export const OCR_POLICY_VERSION = "1.0";
export const OCR_POLICY_GENERATED_ON = "2026-04-18";

export const DOCUMENT_EXTRACTION_STEP_IDS = {
  openDecisionSurface: "ocr.control-plane.open-decision-surface",
  recordSelection: "ocr.control-plane.record-selection",
  validateProfiles: "ocr.control-plane.validate-document-profiles",
  validateThresholds: "ocr.control-plane.validate-review-thresholds",
  validateCandidateBoundary:
    "ocr.control-plane.validate-candidate-fact-boundary",
  persistArtifacts: "ocr.control-plane.persist-artifacts",
} as const;

export type DocumentExtractionSelectionStatus =
  | "SELF_HOST_DECISION_REQUIRED"
  | "MANAGED_PROVIDER_SELECTED"
  | "NOT_SELECTED";

export type ManagedDefaultStatus =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "READY_TO_ADOPT_MANAGED_PROVIDER"
  | "MANAGED_PROVIDER_ADOPTED";

export type ProviderOptionKind = "MANAGED_CLOUD_SERVICE" | "SELF_HOST_STACK";

export type ProviderOptionState =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "SELF_HOST_DECISION_REQUIRED"
  | "NOT_ENABLED_IN_INITIAL_SCOPE"
  | "READY_TO_ADOPT_WHEN_PLATFORM_SELECTED";

export type DocumentProfileActivationState =
  | "READY_ONCE_PROVIDER_SELECTED"
  | "NOT_ENABLED_IN_INITIAL_SCOPE";

export type DocumentExtractionFamily =
  | "RECEIPT_FIELDS_AND_LAYOUT"
  | "INVOICE_FIELDS_AND_LAYOUT"
  | "STATEMENT_LAYOUT_AND_TABLES"
  | "CORRESPONDENCE_LAYOUT_AND_REFERENCE_EXTRACTION"
  | "SCREENSHOT_LAYOUT_TEXT_ONLY"
  | "HANDWRITING_LAYOUT_TEXT_ONLY";

export type DocumentExtractionReviewAction =
  | "AUTO_ACCEPT_TO_CANDIDATE"
  | "REVIEW_REQUIRED"
  | "LAYOUT_ONLY_RETAIN"
  | "UNSUPPORTED_FORMAT"
  | "QUALITY_TOO_LOW"
  | "BLOCKED_BY_QUARANTINE";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface DocumentExtractionProviderOption {
  option_ref: string;
  option_kind: ProviderOptionKind;
  cloud_or_runtime_family:
    | "GCP_DOCUMENT_AI"
    | "AWS_TEXTRACT"
    | "AZURE_DOCUMENT_INTELLIGENCE"
    | "SELF_HOSTED_OCR_PIPELINE";
  provider_label: string;
  selection_state: ProviderOptionState;
  docs_urls: string[];
  supported_mime_types: string[];
  processor_version_pinning_posture: string;
  execution_mode_summary: string;
  page_limit_summary: string;
  security_posture_summary: string;
  source_refs: SourceRef[];
  fit_notes: string[];
}

export interface DocumentExtractionProviderInventory {
  schema_version: "1.0";
  inventory_id: "document_extraction_provider_inventory";
  provider_id: typeof OCR_PROVIDER_ID;
  provider_display_name: typeof OCR_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof DOCUMENT_EXTRACTION_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: DocumentExtractionSelectionStatus;
  managed_default_status: ManagedDefaultStatus;
  option_rows: DocumentExtractionProviderOption[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface DocumentExtractionSelectionRecord {
  schema_version: "1.0";
  selection_record_id: "document_extraction_selection_record";
  provider_id: typeof OCR_PROVIDER_ID;
  provider_display_name: typeof OCR_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof DOCUMENT_EXTRACTION_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: DocumentExtractionSelectionStatus;
  managed_default_status: ManagedDefaultStatus;
  selected_provider_adapter_or_null: string | null;
  selected_provider_label_or_null: string | null;
  self_host_runtime_family_or_null: string | null;
  selection_posture_label:
    | "Self-host decision required"
    | "Managed provider selected"
    | "Not selected";
  processing_posture: "ASYNC_QUEUE_REQUIRED";
  activation_gate_posture:
    "STABLE_OBJECT_VERSION_AND_SCAN_ADOPTION_REQUIRED";
  provider_inventory_ref:
    "data/provisioning/document_extraction_provider_inventory.template.json";
  profile_catalog_ref: "config/evidence/document_extraction_profile_catalog.json";
  review_thresholds_ref:
    "config/evidence/document_extraction_review_thresholds.json";
  candidate_fact_mapping_ref:
    "config/evidence/ocr_output_to_candidate_fact_mapping.json";
  raw_output_retention_posture:
    "PROVIDER_RAW_OUTPUT_SEPARATE_SHORT_LIVED_RESTRICTED";
  normalized_output_retention_posture:
    "NORMALIZED_EXTRACTION_JSON_RETAINED_WITH_EVIDENCE_LINEAGE";
  candidate_fact_boundary_statement: string;
  provider_docs_urls: string[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  selection_notes: string[];
  last_verified_at: string;
}

export interface DocumentExtractionProfileRow {
  profile_ref: string;
  document_class: string;
  activation_state: DocumentProfileActivationState;
  accepted_mime_types: string[];
  page_count_limit: number;
  file_size_limit_mb: number;
  language_posture: string;
  handwriting_posture: string;
  extraction_family: DocumentExtractionFamily;
  provider_feature_flags: string[];
  processor_version_pinning_posture: string;
  candidate_fact_families: string[];
  review_policy_ref: "document_extraction_review_thresholds";
  lineage_requirements: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface DocumentExtractionProfileCatalog {
  schema_version: "1.0";
  catalog_id: "document_extraction_profile_catalog";
  selection_status: DocumentExtractionSelectionStatus;
  truth_boundary_statement: string;
  profiles: DocumentExtractionProfileRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface ConfidenceBand {
  band_ref: string;
  min_inclusive: number;
  max_exclusive: number;
  action: Exclude<
    DocumentExtractionReviewAction,
    "UNSUPPORTED_FORMAT" | "BLOCKED_BY_QUARANTINE"
  >;
  summary: string;
}

export interface DocumentExtractionProfileThresholdRule {
  profile_ref: string;
  auto_accept_min_confidence_or_null: number | null;
  review_min_confidence: number;
  quality_floor_confidence: number;
  default_action_if_above_review_min: DocumentExtractionReviewAction;
  multi_page_statement_action: DocumentExtractionReviewAction;
  handwriting_detected_action: DocumentExtractionReviewAction;
  mixed_language_action: DocumentExtractionReviewAction;
  rotation_or_skew_action: DocumentExtractionReviewAction;
  table_density_action: DocumentExtractionReviewAction;
  quarantine_action: "BLOCKED_BY_QUARANTINE";
  duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE";
  provider_version_drift_action: "REVIEW_REQUIRED";
  stale_request_rebase_action: "REVIEW_REQUIRED";
  notes: string[];
}

export interface DocumentExtractionReviewThresholds {
  schema_version: "1.0";
  policy_id: "document_extraction_review_thresholds";
  selection_status: DocumentExtractionSelectionStatus;
  truth_boundary_statement: string;
  allowed_upload_gate_states: string[];
  blocked_upload_gate_states: string[];
  confidence_bands: ConfidenceBand[];
  typed_actions: DocumentExtractionReviewAction[];
  profile_rules: DocumentExtractionProfileThresholdRule[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface OcrOutputToCandidateFactMappingRow {
  mapping_ref: string;
  profile_ref: string;
  normalized_field_path: string;
  candidate_fact_family: string;
  candidate_value_kind:
    | "STRING"
    | "DATE"
    | "MONEY"
    | "TABLE_ROW_SET"
    | "TEXT_BLOCK";
  promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL";
  review_requirements: string[];
  prohibited_canonical_targets: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface OcrOutputToCandidateFactMapping {
  schema_version: "1.0";
  mapping_id: "ocr_output_to_candidate_fact_mapping";
  selection_status: DocumentExtractionSelectionStatus;
  truth_boundary_statement: string;
  mapping_rows: OcrOutputToCandidateFactMappingRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface GovernanceBoardRow {
  label: string;
  detail: string;
}

export interface DocumentExtractionBoardProfile {
  profile_ref: string;
  label: string;
  status_label: "Ready Once Selected" | "Not Enabled";
  summary: string;
  source_artifact_rows: GovernanceBoardRow[];
  normalized_extraction_rows: GovernanceBoardRow[];
  candidate_boundary_rows: GovernanceBoardRow[];
  threshold_rows: GovernanceBoardRow[];
  lineage_rows: GovernanceBoardRow[];
  inspector_notes: string[];
  source_refs: SourceRef[];
}

export interface DocumentExtractionEnvironmentOption {
  environment_ref:
    | "env_local_provisioning_workstation"
    | "env_shared_sandbox_integration"
    | "env_preproduction_verification"
    | "env_production";
  label: string;
  summary: string;
}

export interface DocumentExtractionGovernanceBoardViewModel {
  provider_label: string;
  provider_monogram: "OCR";
  selection_posture: "SELF_HOST_DECISION_REQUIRED";
  selection_posture_label: "Self-host decision required";
  active_environment_ref:
    | "env_local_provisioning_workstation"
    | "env_shared_sandbox_integration"
    | "env_preproduction_verification"
    | "env_production";
  environment_options: DocumentExtractionEnvironmentOption[];
  profiles: DocumentExtractionBoardProfile[];
  truth_boundary_statement: string;
  notes: string[];
}

export interface CreateManagedDocumentExtractionProjectResult {
  outcome: "DOCUMENT_EXTRACTION_SELF_HOST_DECISION_REQUIRED";
  steps: StepContract[];
  providerInventory: DocumentExtractionProviderInventory;
  selectionRecord: DocumentExtractionSelectionRecord;
  profileCatalog: DocumentExtractionProfileCatalog;
  reviewThresholds: DocumentExtractionReviewThresholds;
  candidateFactMapping: OcrOutputToCandidateFactMapping;
  boardViewModel: DocumentExtractionGovernanceBoardViewModel;
  evidenceManifestPath: string;
  notes: string[];
}

export interface DocumentExtractionProviderEntryUrls {
  controlPlane: string;
}

export interface CreateManagedDocumentExtractionProjectOptions {
  page: Page;
  runContext: RunContext;
  providerInventoryPath: string;
  selectionRecordPath: string;
  entryUrls?: DocumentExtractionProviderEntryUrls;
}

interface DocumentExtractionFixtureState {
  provider_state: "blocked-by-platform";
}

const GCP_DOCUMENT_AI_DOCS = [
  "https://docs.cloud.google.com/document-ai/docs/enterprise-document-ocr",
  "https://docs.cloud.google.com/document-ai/docs/file-types",
  "https://docs.cloud.google.com/document-ai/docs/create-processor",
] as const;

const AWS_TEXTRACT_DOCS = [
  "https://docs.aws.amazon.com/en_us/textract/latest/dg/limits-document.html",
  "https://docs.aws.amazon.com/textract/latest/dg/API_DetectDocumentText.html",
  "https://docs.aws.amazon.com/textract/latest/dg/api-async.html",
] as const;

const AZURE_DOCUMENT_INTELLIGENCE_DOCS = [
  "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/model-overview?view=doc-intel-4.0.0",
  "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/whats-new?view=doc-intel-4.0.0",
] as const;

const OCR_SELECTOR_MANIFEST: SelectorManifest = {
  manifestId: "document-extraction-selection-control-plane",
  providerId: OCR_PROVIDER_ID,
  flowId: DOCUMENT_EXTRACTION_FLOW_ID,
  selectors: [
    {
      selectorId: "decision-heading",
      description: "Primary heading for document extraction selection",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Document extraction decision",
    },
    {
      selectorId: "selection-action",
      description: "Selection recording action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Record self-host decision",
    },
    {
      selectorId: "profiles-heading",
      description: "Document profiles heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Supported document profiles",
    },
    {
      selectorId: "profiles-action",
      description: "Document profile validation action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate document profiles",
    },
    {
      selectorId: "thresholds-heading",
      description: "Threshold policy heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Review threshold policy",
    },
    {
      selectorId: "thresholds-action",
      description: "Threshold validation action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate review thresholds",
    },
    {
      selectorId: "boundary-heading",
      description: "Candidate-fact boundary heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Candidate-fact boundary",
    },
    {
      selectorId: "boundary-action",
      description: "Candidate-fact boundary validation action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate candidate-fact boundary",
    },
    {
      selectorId: "lineage-heading",
      description: "Lineage and retention heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Lineage and retention",
    },
  ],
};

const COMMON_LINEAGE_REQUIREMENTS = [
  "source_object_ref",
  "source_object_version_ref",
  "upload_session_ref",
  "extraction_run_ref",
  "processor_version_ref",
  "evidence_item_ref",
  "candidate_fact_ref",
  "review_outcome_ref",
] as const;

function selectionTruthBoundary(): string {
  return "Document extraction may produce provider raw output, normalized extraction output, and candidate facts only. Canonical facts still require later normalization, validation, scoping, and promotion grounded in Taxat evidence law.";
}

function sharedSourceRefs(): SourceRef[] {
  return [
    {
      source_ref:
        "PROMPT/shared_operating_contract_0046_to_0053.md::OCR / document extraction",
      rationale:
        "The shared operating contract requires either a lawful managed workspace or an explicit self-host/not-selected decision with typed rationale.",
    },
    {
      source_ref:
        "data/analysis/dependency_register.json::OCR_DOCUMENT_EXTRACTION_CAPABILITY",
      rationale:
        "The dependency register marks OCR/document extraction as optional vendor selection rather than a preselected runtime dependency.",
    },
    {
      source_ref:
        "docs/analysis/18_external_services_apis_and_control_plane_dependencies.md::OCR_DOCUMENT_EXTRACTION_CAPABILITY",
      rationale:
        "The external dependency pack keeps OCR outside the core engine while still inside broader product scope.",
    },
    {
      source_ref:
        "Algorithm/canonical_source_and_evidence_taxonomy.md::Class E - DOCUMENTARY_EVIDENCE",
      rationale:
        "Documentary evidence must retain source lineage and extraction metadata before any candidate facts can exist.",
    },
    {
      source_ref:
        "Algorithm/canonical_source_and_evidence_taxonomy.md::Prohibited promotion rules",
      rationale:
        "Raw OCR text or extracted key-values may not jump directly to canonical truth.",
    },
    {
      source_ref: "Algorithm/data_model.md::EvidenceItem",
      rationale:
        "EvidenceItem carries extraction method, confidence, lineage refs, retention tags, and erasure posture.",
    },
    {
      source_ref: "Algorithm/data_model.md::CandidateFact",
      rationale:
        "CandidateFact remains the lawful intermediate layer between documentary evidence and any later canonical promotion.",
    },
    {
      source_ref:
        "Algorithm/upload_session_request_binding_and_rebase_contract.md::Frozen request lineage",
      rationale:
        "Extraction lineage must stay bound to the frozen upload session even when stale-request posture is detected.",
    },
    {
      source_ref:
        "Algorithm/upload_session_recovery_harness_contract.md::Scanner and validation separation",
      rationale:
        "Transfer completion, scan, validation, and attachment confirmation remain distinct before extraction is admissible.",
    },
    {
      source_ref:
        "Algorithm/customer_client_portal_experience_contract.md::Secure upload flow",
      rationale:
        "Portal upload posture must surface scan, validation, and attachment state distinctly instead of collapsing them into a generic uploaded state.",
    },
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::Governed secret and worker boundary",
      rationale:
        "Provider credentials, raw outputs, and worker ingress remain scoped to the governed secret and egress boundary.",
    },
    {
      source_ref: "Algorithm/retention_and_privacy.md::Evidence retention",
      rationale:
        "Evidence-bearing artifacts, normalized extraction output, and derived previews must remain retention-classified and distinguishable.",
    },
  ];
}

function providerSelectionDocs(): string[] {
  return [
    ...GCP_DOCUMENT_AI_DOCS,
    ...AWS_TEXTRACT_DOCS,
    ...AZURE_DOCUMENT_INTELLIGENCE_DOCS,
  ];
}

function supportedMimeTypesPortableBaseline(): string[] {
  return [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
  ];
}

function profileRows(): DocumentExtractionProfileRow[] {
  const sourceRefs = sharedSourceRefs();
  return [
    {
      profile_ref: "doc_profile_receipt_capture",
      document_class: "EXPENSE_RECEIPT",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: [...supportedMimeTypesPortableBaseline()],
      page_count_limit: 4,
      file_size_limit_mb: 20,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ALLOWED_WITH_REVIEW",
      extraction_family: "RECEIPT_FIELDS_AND_LAYOUT",
      provider_feature_flags: [
        "text_ocr",
        "selection_marks",
        "line_item_candidates",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "RECEIPT_SUPPLIER_NAME_CANDIDATE",
        "RECEIPT_TRANSACTION_DATE_CANDIDATE",
        "RECEIPT_TOTAL_AMOUNT_CANDIDATE",
        "RECEIPT_LINE_ITEM_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Receipt extraction remains queue-isolated and may not publish trust-ready totals directly into tax workflows.",
        "Multi-photo stitching is out of scope for the initial profile set.",
      ],
    },
    {
      profile_ref: "doc_profile_invoice_pdf",
      document_class: "SUPPLIER_INVOICE",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: [...supportedMimeTypesPortableBaseline()],
      page_count_limit: 30,
      file_size_limit_mb: 40,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ESCALATES_REVIEW",
      extraction_family: "INVOICE_FIELDS_AND_LAYOUT",
      provider_feature_flags: [
        "text_ocr",
        "table_candidates",
        "key_value_candidates",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "INVOICE_SUPPLIER_NAME_CANDIDATE",
        "INVOICE_NUMBER_CANDIDATE",
        "INVOICE_DATE_CANDIDATE",
        "INVOICE_TOTAL_AMOUNT_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Invoice VAT/tax semantics remain candidate-only until later tax-specific normalization decides how to interpret them.",
      ],
    },
    {
      profile_ref: "doc_profile_bank_statement_pdf",
      document_class: "BANK_STATEMENT",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: [...supportedMimeTypesPortableBaseline()],
      page_count_limit: 200,
      file_size_limit_mb: 100,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ESCALATES_REVIEW",
      extraction_family: "STATEMENT_LAYOUT_AND_TABLES",
      provider_feature_flags: [
        "text_ocr",
        "table_row_candidates",
        "page_order_analysis",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "BANK_STATEMENT_PROVIDER_NAME_CANDIDATE",
        "BANK_STATEMENT_PERIOD_CANDIDATE",
        "BANK_STATEMENT_TRANSACTION_ROW_CANDIDATE",
        "BANK_STATEMENT_BALANCE_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Table-heavy statements remain review-heavy because silent transaction normalization would collapse evidence law and money-contract safeguards.",
      ],
    },
    {
      profile_ref: "doc_profile_authority_correspondence_pdf",
      document_class: "AUTHORITY_CORRESPONDENCE",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: [...supportedMimeTypesPortableBaseline()],
      page_count_limit: 40,
      file_size_limit_mb: 50,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ESCALATES_REVIEW",
      extraction_family: "CORRESPONDENCE_LAYOUT_AND_REFERENCE_EXTRACTION",
      provider_feature_flags: [
        "text_ocr",
        "reference_number_candidates",
        "date_candidates",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "CORRESPONDENCE_REFERENCE_CANDIDATE",
        "CORRESPONDENCE_DATE_CANDIDATE",
        "CORRESPONDENCE_TEXT_BLOCK_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Correspondence extraction is for triage and review acceleration only; legal meaning remains downstream and explicit.",
      ],
    },
    {
      profile_ref: "doc_profile_screenshot_capture",
      document_class: "SCREENSHOT_OR_UPLOADED_IMAGE",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: ["image/png", "image/jpeg"],
      page_count_limit: 1,
      file_size_limit_mb: 10,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ESCALATES_REVIEW",
      extraction_family: "SCREENSHOT_LAYOUT_TEXT_ONLY",
      provider_feature_flags: [
        "text_ocr",
        "layout_regions",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "SCREENSHOT_VISIBLE_TEXT_CANDIDATE",
        "SCREENSHOT_REFERENCE_NUMBER_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Screenshot extraction defaults to layout/text retention rather than automatic candidate promotion for decision-bearing content.",
      ],
    },
    {
      profile_ref: "doc_profile_handwritten_note",
      document_class: "HANDWRITTEN_NOTE",
      activation_state: "READY_ONCE_PROVIDER_SELECTED",
      accepted_mime_types: ["application/pdf", "image/jpeg", "image/png"],
      page_count_limit: 6,
      file_size_limit_mb: 20,
      language_posture: "EN_PRIMARY_WITH_MIXED_LANGUAGE_REVIEW",
      handwriting_posture: "HANDWRITING_ALLOWED_WITH_REVIEW",
      extraction_family: "HANDWRITING_LAYOUT_TEXT_ONLY",
      provider_feature_flags: [
        "text_ocr",
        "language_detection",
      ],
      processor_version_pinning_posture:
        "FROZEN_PROCESSOR_VERSION_REQUIRED",
      candidate_fact_families: [
        "HANDWRITTEN_NOTE_TEXT_CANDIDATE",
        "HANDWRITTEN_NOTE_DATE_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Handwritten notes always remain review-centric because legibility drift and contextual ambiguity are expected.",
      ],
    },
    {
      profile_ref: "doc_profile_mixed_language_bundle",
      document_class: "MIXED_LANGUAGE_MULTI_DOCUMENT_BUNDLE",
      activation_state: "NOT_ENABLED_IN_INITIAL_SCOPE",
      accepted_mime_types: ["application/pdf", "image/tiff"],
      page_count_limit: 300,
      file_size_limit_mb: 150,
      language_posture: "NOT_ENABLED_IN_INITIAL_SCOPE",
      handwriting_posture: "NOT_ENABLED_IN_INITIAL_SCOPE",
      extraction_family: "HANDWRITING_LAYOUT_TEXT_ONLY",
      provider_feature_flags: ["document_splitter", "language_detection"],
      processor_version_pinning_posture:
        "PROVIDER_AND_MODEL_POLICY_NOT_FROZEN",
      candidate_fact_families: [
        "MIXED_LANGUAGE_TEXT_BLOCK_CANDIDATE",
      ],
      review_policy_ref: "document_extraction_review_thresholds",
      lineage_requirements: [...COMMON_LINEAGE_REQUIREMENTS],
      source_refs: sourceRefs,
      notes: [
        "Mixed-language multi-document bundles remain intentionally blocked until a provider/runtime and splitter policy are selected explicitly.",
      ],
    },
  ];
}

function thresholdRules(): DocumentExtractionProfileThresholdRule[] {
  return [
    {
      profile_ref: "doc_profile_receipt_capture",
      auto_accept_min_confidence_or_null: 0.985,
      review_min_confidence: 0.92,
      quality_floor_confidence: 0.75,
      default_action_if_above_review_min: "AUTO_ACCEPT_TO_CANDIDATE",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "REVIEW_REQUIRED",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Receipts may auto-promote to candidate facts only for bounded supplier/date/total fields after the upload gate is satisfied.",
      ],
    },
    {
      profile_ref: "doc_profile_invoice_pdf",
      auto_accept_min_confidence_or_null: 0.99,
      review_min_confidence: 0.94,
      quality_floor_confidence: 0.8,
      default_action_if_above_review_min: "AUTO_ACCEPT_TO_CANDIDATE",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "REVIEW_REQUIRED",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Invoices can emit candidate invoice identifiers and amount candidates, but downstream validation must still choose any canonical tax or filing use.",
      ],
    },
    {
      profile_ref: "doc_profile_bank_statement_pdf",
      auto_accept_min_confidence_or_null: null,
      review_min_confidence: 0.9,
      quality_floor_confidence: 0.78,
      default_action_if_above_review_min: "REVIEW_REQUIRED",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "REVIEW_REQUIRED",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Bank statement table extraction is never auto-accepted into candidate facts without review because row segmentation drift can materially change meaning.",
      ],
    },
    {
      profile_ref: "doc_profile_authority_correspondence_pdf",
      auto_accept_min_confidence_or_null: 0.985,
      review_min_confidence: 0.93,
      quality_floor_confidence: 0.78,
      default_action_if_above_review_min: "AUTO_ACCEPT_TO_CANDIDATE",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "REVIEW_REQUIRED",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Reference numbers and dates may auto-promote into candidate facts, but correspondence meaning remains reviewable text.",
      ],
    },
    {
      profile_ref: "doc_profile_screenshot_capture",
      auto_accept_min_confidence_or_null: null,
      review_min_confidence: 0.95,
      quality_floor_confidence: 0.8,
      default_action_if_above_review_min: "LAYOUT_ONLY_RETAIN",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "LAYOUT_ONLY_RETAIN",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Screenshot content stays layout-first and usually retains text for human review rather than emitting many candidate facts automatically.",
      ],
    },
    {
      profile_ref: "doc_profile_handwritten_note",
      auto_accept_min_confidence_or_null: null,
      review_min_confidence: 0.9,
      quality_floor_confidence: 0.78,
      default_action_if_above_review_min: "REVIEW_REQUIRED",
      multi_page_statement_action: "REVIEW_REQUIRED",
      handwriting_detected_action: "REVIEW_REQUIRED",
      mixed_language_action: "REVIEW_REQUIRED",
      rotation_or_skew_action: "REVIEW_REQUIRED",
      table_density_action: "REVIEW_REQUIRED",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Handwriting is always review-gated regardless of confidence because language and semantics are too fragile for silent candidate promotion.",
      ],
    },
    {
      profile_ref: "doc_profile_mixed_language_bundle",
      auto_accept_min_confidence_or_null: null,
      review_min_confidence: 0.99,
      quality_floor_confidence: 0.9,
      default_action_if_above_review_min: "UNSUPPORTED_FORMAT",
      multi_page_statement_action: "UNSUPPORTED_FORMAT",
      handwriting_detected_action: "UNSUPPORTED_FORMAT",
      mixed_language_action: "UNSUPPORTED_FORMAT",
      rotation_or_skew_action: "UNSUPPORTED_FORMAT",
      table_density_action: "UNSUPPORTED_FORMAT",
      quarantine_action: "BLOCKED_BY_QUARANTINE",
      duplicate_submission_policy: "DEDUP_BY_STABLE_OBJECT_VERSION_AND_PROFILE",
      provider_version_drift_action: "REVIEW_REQUIRED",
      stale_request_rebase_action: "REVIEW_REQUIRED",
      notes: [
        "Mixed-language bundled documents remain intentionally unsupported in the initial profile pack.",
      ],
    },
  ];
}

function mappingRows(): OcrOutputToCandidateFactMappingRow[] {
  const sourceRefs = sharedSourceRefs();
  return [
    {
      mapping_ref: "ocr_map_receipt_supplier_name",
      profile_ref: "doc_profile_receipt_capture",
      normalized_field_path: "receipt.merchant.name",
      candidate_fact_family: "RECEIPT_SUPPLIER_NAME_CANDIDATE",
      candidate_value_kind: "STRING",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["mixed_language", "handwriting", "merchant-name-drift"],
      prohibited_canonical_targets: ["supplier_name", "expense_counterparty_name"],
      source_refs: sourceRefs,
      notes: ["Merchant or supplier naming remains candidate-only because alias normalization is downstream."],
    },
    {
      mapping_ref: "ocr_map_receipt_date",
      profile_ref: "doc_profile_receipt_capture",
      normalized_field_path: "receipt.transaction_date",
      candidate_fact_family: "RECEIPT_TRANSACTION_DATE_CANDIDATE",
      candidate_value_kind: "DATE",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["ambiguous-date-format", "timezone-context-required"],
      prohibited_canonical_targets: ["transaction_date", "tax_point_date"],
      source_refs: sourceRefs,
      notes: ["Date parsing remains provisional until locale and evidence context are resolved."],
    },
    {
      mapping_ref: "ocr_map_receipt_total",
      profile_ref: "doc_profile_receipt_capture",
      normalized_field_path: "receipt.total_amount",
      candidate_fact_family: "RECEIPT_TOTAL_AMOUNT_CANDIDATE",
      candidate_value_kind: "MONEY",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["currency-symbol-check", "multi-total-check"],
      prohibited_canonical_targets: ["money.total", "deductible_expense_total"],
      source_refs: sourceRefs,
      notes: ["Receipt totals do not become trusted money values without downstream money-contract validation."],
    },
    {
      mapping_ref: "ocr_map_invoice_number",
      profile_ref: "doc_profile_invoice_pdf",
      normalized_field_path: "invoice.identifiers.invoice_number",
      candidate_fact_family: "INVOICE_NUMBER_CANDIDATE",
      candidate_value_kind: "STRING",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["vendor-template-drift", "duplicate-invoice-check"],
      prohibited_canonical_targets: ["invoice_number", "authority_submission_reference"],
      source_refs: sourceRefs,
      notes: ["Invoice-number uniqueness and counterparty matching stay downstream."],
    },
    {
      mapping_ref: "ocr_map_invoice_total",
      profile_ref: "doc_profile_invoice_pdf",
      normalized_field_path: "invoice.amounts.total_due",
      candidate_fact_family: "INVOICE_TOTAL_AMOUNT_CANDIDATE",
      candidate_value_kind: "MONEY",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["currency-consistency", "tax-line-split-check"],
      prohibited_canonical_targets: ["invoice_total", "filing_amount"],
      source_refs: sourceRefs,
      notes: ["Totals remain candidates until later invoice-specific normalization and money validation."],
    },
    {
      mapping_ref: "ocr_map_statement_provider",
      profile_ref: "doc_profile_bank_statement_pdf",
      normalized_field_path: "statement.header.institution_name",
      candidate_fact_family: "BANK_STATEMENT_PROVIDER_NAME_CANDIDATE",
      candidate_value_kind: "STRING",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["institution-alias-normalization"],
      prohibited_canonical_targets: ["bank_provider_name", "account_provider_name"],
      source_refs: sourceRefs,
      notes: ["Provider naming remains subject to account-binding validation."],
    },
    {
      mapping_ref: "ocr_map_statement_rows",
      profile_ref: "doc_profile_bank_statement_pdf",
      normalized_field_path: "statement.tables.transactions.rows[]",
      candidate_fact_family: "BANK_STATEMENT_TRANSACTION_ROW_CANDIDATE",
      candidate_value_kind: "TABLE_ROW_SET",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["row-segmentation-check", "opening-closing-balance-check"],
      prohibited_canonical_targets: ["ledger_entry", "cashbook_line"],
      source_refs: sourceRefs,
      notes: ["Transaction rows are especially vulnerable to table-boundary drift and therefore remain candidate-only."],
    },
    {
      mapping_ref: "ocr_map_statement_balance",
      profile_ref: "doc_profile_bank_statement_pdf",
      normalized_field_path: "statement.header.closing_balance",
      candidate_fact_family: "BANK_STATEMENT_BALANCE_CANDIDATE",
      candidate_value_kind: "MONEY",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["balance-reconciliation-check", "currency-check"],
      prohibited_canonical_targets: ["closing_balance", "cash_position"],
      source_refs: sourceRefs,
      notes: ["Statement balance candidates require reconciliation with transaction rows before any downstream use."],
    },
    {
      mapping_ref: "ocr_map_correspondence_reference",
      profile_ref: "doc_profile_authority_correspondence_pdf",
      normalized_field_path: "correspondence.reference_numbers[]",
      candidate_fact_family: "CORRESPONDENCE_REFERENCE_CANDIDATE",
      candidate_value_kind: "STRING",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["multi-reference-check", "authority-surface-check"],
      prohibited_canonical_targets: ["authority_reference", "case_reference"],
      source_refs: sourceRefs,
      notes: ["Authority references remain candidate-only until case and authority-link context align."],
    },
    {
      mapping_ref: "ocr_map_correspondence_date",
      profile_ref: "doc_profile_authority_correspondence_pdf",
      normalized_field_path: "correspondence.letter_date",
      candidate_fact_family: "CORRESPONDENCE_DATE_CANDIDATE",
      candidate_value_kind: "DATE",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["date-format-check", "header-footer-noise-check"],
      prohibited_canonical_targets: ["authority_issue_date", "deadline_date"],
      source_refs: sourceRefs,
      notes: ["Letter dates require contextual downstream interpretation before they can drive deadlines or workflow."],
    },
    {
      mapping_ref: "ocr_map_correspondence_text",
      profile_ref: "doc_profile_authority_correspondence_pdf",
      normalized_field_path: "correspondence.body.text_blocks[]",
      candidate_fact_family: "CORRESPONDENCE_TEXT_BLOCK_CANDIDATE",
      candidate_value_kind: "TEXT_BLOCK",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["sensitive-phrase-review", "semantic-interpretation-required"],
      prohibited_canonical_targets: ["authority_decision", "legal_position"],
      source_refs: sourceRefs,
      notes: ["Free-text correspondence content is review material, not machine-trusted legal meaning."],
    },
    {
      mapping_ref: "ocr_map_screenshot_text",
      profile_ref: "doc_profile_screenshot_capture",
      normalized_field_path: "screenshot.layout.text_regions[]",
      candidate_fact_family: "SCREENSHOT_VISIBLE_TEXT_CANDIDATE",
      candidate_value_kind: "TEXT_BLOCK",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["layout-only-default", "ui-context-required"],
      prohibited_canonical_targets: ["workflow_status", "portal_truth"],
      source_refs: sourceRefs,
      notes: ["Screenshot-visible text is useful for review and debugging, not direct workflow truth."],
    },
    {
      mapping_ref: "ocr_map_screenshot_reference",
      profile_ref: "doc_profile_screenshot_capture",
      normalized_field_path: "screenshot.layout.reference_candidates[]",
      candidate_fact_family: "SCREENSHOT_REFERENCE_NUMBER_CANDIDATE",
      candidate_value_kind: "STRING",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["human-surface-confirmation"],
      prohibited_canonical_targets: ["authority_reference", "request_reference"],
      source_refs: sourceRefs,
      notes: ["References gleaned from screenshots must be confirmed against durable truth records."],
    },
    {
      mapping_ref: "ocr_map_handwritten_text",
      profile_ref: "doc_profile_handwritten_note",
      normalized_field_path: "handwriting.text_blocks[]",
      candidate_fact_family: "HANDWRITTEN_NOTE_TEXT_CANDIDATE",
      candidate_value_kind: "TEXT_BLOCK",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["always-review", "legibility-check"],
      prohibited_canonical_targets: ["operator_note_truth", "customer_statement_truth"],
      source_refs: sourceRefs,
      notes: ["Handwritten note text is review-only material and must never become workflow truth automatically."],
    },
    {
      mapping_ref: "ocr_map_handwritten_date",
      profile_ref: "doc_profile_handwritten_note",
      normalized_field_path: "handwriting.date_candidates[]",
      candidate_fact_family: "HANDWRITTEN_NOTE_DATE_CANDIDATE",
      candidate_value_kind: "DATE",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["always-review", "locale-check"],
      prohibited_canonical_targets: ["event_date", "workflow_date"],
      source_refs: sourceRefs,
      notes: ["Any handwritten date candidate requires explicit human review and context binding."],
    },
    {
      mapping_ref: "ocr_map_mixed_language_text",
      profile_ref: "doc_profile_mixed_language_bundle",
      normalized_field_path: "bundle.layout.text_blocks[]",
      candidate_fact_family: "MIXED_LANGUAGE_TEXT_BLOCK_CANDIDATE",
      candidate_value_kind: "TEXT_BLOCK",
      promotion_guard: "CANDIDATE_ONLY_NEVER_CANONICAL",
      review_requirements: ["unsupported-in-initial-scope"],
      prohibited_canonical_targets: ["canonical_text", "language-normalized-fact"],
      source_refs: sourceRefs,
      notes: ["This profile remains blocked until a future provider/runtime and multilingual review policy are frozen."],
    },
  ];
}

export function createRecommendedDocumentExtractionProviderInventory(
  runContext: RunContext,
): DocumentExtractionProviderInventory {
  const sourceRefs = sharedSourceRefs();
  return {
    schema_version: "1.0",
    inventory_id: "document_extraction_provider_inventory",
    provider_id: OCR_PROVIDER_ID,
    provider_display_name: OCR_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: DOCUMENT_EXTRACTION_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: "SELF_HOST_DECISION_REQUIRED",
    managed_default_status: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    option_rows: [
      {
        option_ref: "ocr_option_google_document_ai_ocr",
        option_kind: "MANAGED_CLOUD_SERVICE",
        cloud_or_runtime_family: "GCP_DOCUMENT_AI",
        provider_label: "Google Cloud Document AI Enterprise OCR",
        selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
        docs_urls: [...GCP_DOCUMENT_AI_DOCS],
        supported_mime_types: [
          "application/pdf",
          "image/gif",
          "image/tiff",
          "image/jpeg",
          "image/png",
          "image/bmp",
          "image/webp",
        ],
        processor_version_pinning_posture:
          "FROZEN_PROCESSOR_VERSION_AVAILABLE_UP_TO_18_MONTHS",
        execution_mode_summary:
          "Supports processor-based OCR with sync and long-running flows depending on document type and size.",
        page_limit_summary:
          "Enterprise OCR supports PDF, common image types, and private-preview DocX with explicit processor versioning.",
        security_posture_summary:
          "Would require service-account scoped access, region-specific processor placement, and signed object access.",
        source_refs: [
          ...sourceRefs,
          {
            source_ref:
              "https://docs.cloud.google.com/document-ai/docs/enterprise-document-ocr",
            rationale:
              "Current official Document AI OCR docs confirm supported formats and frozen processor-version pinning posture.",
          },
        ],
        fit_notes: [
          "Strong version-pinning story for deterministic OCR behavior.",
          "Broader format surface than the portable baseline, but still dependent on a GCP platform decision.",
        ],
      },
      {
        option_ref: "ocr_option_aws_textract",
        option_kind: "MANAGED_CLOUD_SERVICE",
        cloud_or_runtime_family: "AWS_TEXTRACT",
        provider_label: "Amazon Textract Document Text Detection",
        selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
        docs_urls: [...AWS_TEXTRACT_DOCS],
        supported_mime_types: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/tiff",
        ],
        processor_version_pinning_posture:
          "API_MODEL_VERSION_RETURNED_PER_RESPONSE_BUT_PLATFORM_NOT_SELECTED",
        execution_mode_summary:
          "Single-page sync and multi-page async flows are distinct API paths with S3-bound async processing.",
        page_limit_summary:
          "Sync PDF/TIFF is single page; async PDF/TIFF can reach 500 MB and 3,000 pages.",
        security_posture_summary:
          "Would require IAM-scoped S3 access, object-version pinning, and restricted async result retrieval.",
        source_refs: [
          ...sourceRefs,
          {
            source_ref:
              "https://docs.aws.amazon.com/en_us/textract/latest/dg/limits-document.html",
            rationale:
              "Current Textract quotas define supported formats, sync/async limits, language, and handwriting constraints.",
          },
        ],
        fit_notes: [
          "Portable formats align with Taxat's conservative initial profile baseline.",
          "Language and handwritten coverage are narrower, so review-heavy product policies would still be required.",
        ],
      },
      {
        option_ref: "ocr_option_azure_document_intelligence",
        option_kind: "MANAGED_CLOUD_SERVICE",
        cloud_or_runtime_family: "AZURE_DOCUMENT_INTELLIGENCE",
        provider_label: "Azure AI Document Intelligence",
        selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
        docs_urls: [...AZURE_DOCUMENT_INTELLIGENCE_DOCS],
        supported_mime_types: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/bmp",
          "image/tiff",
          "image/heif",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/html",
        ],
        processor_version_pinning_posture:
          "API_VERSION_AND_MODEL_FAMILY_MUST_BE_EXPLICITLY_FROZEN",
        execution_mode_summary:
          "Analyze and batch APIs are available under the current GA API version with broad model coverage.",
        page_limit_summary:
          "PDF/TIFF up to 2,000 pages and 500 MB on paid tier; office formats supported on the read/layout path.",
        security_posture_summary:
          "Would require resource-scoped auth, explicit API-version pinning, and region-bound endpoint selection.",
        source_refs: [
          ...sourceRefs,
          {
            source_ref:
              "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/model-overview?view=doc-intel-4.0.0",
            rationale:
              "Current Document Intelligence docs define supported inputs, limits, and model families.",
          },
        ],
        fit_notes: [
          "Broad file-format coverage, including Office inputs, but still blocked until a platform decision exists.",
          "Would need explicit API-version governance to avoid drift.",
        ],
      },
      {
        option_ref: "ocr_option_self_host_pipeline",
        option_kind: "SELF_HOST_STACK",
        cloud_or_runtime_family: "SELF_HOSTED_OCR_PIPELINE",
        provider_label: "Self-hosted OCR and document-normalization worker stack",
        selection_state: "SELF_HOST_DECISION_REQUIRED",
        docs_urls: [],
        supported_mime_types: [...supportedMimeTypesPortableBaseline()],
        processor_version_pinning_posture:
          "MODEL_HASH_AND_CONTAINER_DIGEST_REQUIRED",
        execution_mode_summary:
          "Async-only queue worker with explicit model provenance, object-version pinning, and separate raw-output storage.",
        page_limit_summary:
          "Taxat policy would set conservative document limits first; runtime throughput and memory budgets remain undecided.",
        security_posture_summary:
          "Would require isolated worker execution, explicit egress rules, patch ownership, and model supply-chain provenance.",
        source_refs: sourceRefs,
        fit_notes: [
          "This is the only lawful path that can move forward without silently choosing a cloud provider.",
          "The runtime, model family, patch cadence, and hardening boundary are not selected yet and must be recorded later.",
        ],
      },
    ],
    source_refs: sourceRefs,
    typed_gaps: [
      "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION: no cloud platform has been selected, so a lawful first-party managed OCR default cannot be provisioned automatically.",
      "SELF_HOST_DECISION_REQUIRED: the self-host runtime family, model stack, and patch/upgrade owner are still unresolved.",
      "NOT_ENABLED_IN_INITIAL_SCOPE: mixed-language multi-document bundles remain blocked until splitter and multilingual review policy are frozen.",
    ],
    notes: [
      "The option matrix is explicit so later runtime work does not need to infer OCR posture from scattered ADR prose.",
      "Managed candidates are recorded for evidence and comparison only; none are silently selected here.",
    ],
    last_verified_at: `${OCR_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

export function createRecommendedDocumentExtractionSelectionRecord(
  runContext: RunContext,
): DocumentExtractionSelectionRecord {
  const sourceRefs = sharedSourceRefs();
  return {
    schema_version: "1.0",
    selection_record_id: "document_extraction_selection_record",
    provider_id: OCR_PROVIDER_ID,
    provider_display_name: OCR_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: DOCUMENT_EXTRACTION_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: "SELF_HOST_DECISION_REQUIRED",
    managed_default_status: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    selected_provider_adapter_or_null: null,
    selected_provider_label_or_null: null,
    self_host_runtime_family_or_null: null,
    selection_posture_label: "Self-host decision required",
    processing_posture: "ASYNC_QUEUE_REQUIRED",
    activation_gate_posture:
      "STABLE_OBJECT_VERSION_AND_SCAN_ADOPTION_REQUIRED",
    provider_inventory_ref:
      "data/provisioning/document_extraction_provider_inventory.template.json",
    profile_catalog_ref: "config/evidence/document_extraction_profile_catalog.json",
    review_thresholds_ref:
      "config/evidence/document_extraction_review_thresholds.json",
    candidate_fact_mapping_ref:
      "config/evidence/ocr_output_to_candidate_fact_mapping.json",
    raw_output_retention_posture:
      "PROVIDER_RAW_OUTPUT_SEPARATE_SHORT_LIVED_RESTRICTED",
    normalized_output_retention_posture:
      "NORMALIZED_EXTRACTION_JSON_RETAINED_WITH_EVIDENCE_LINEAGE",
    candidate_fact_boundary_statement: selectionTruthBoundary(),
    provider_docs_urls: providerSelectionDocs(),
    source_refs: sourceRefs,
    typed_gaps: [
      "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      "SELF_HOST_DECISION_REQUIRED",
      "NOT_SELECTED_PROVIDER_WORKSPACE",
    ],
    selection_notes: [
      "A managed OCR workspace was not provisioned because the earlier ADRs and dependency register never selected a cloud platform or OCR vendor.",
      "The lawful next step is to choose either a self-host runtime stack or a cloud platform whose first-party OCR service can be adopted explicitly.",
    ],
    last_verified_at: `${OCR_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

export function createRecommendedDocumentExtractionProfileCatalog(): DocumentExtractionProfileCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "document_extraction_profile_catalog",
    selection_status: "SELF_HOST_DECISION_REQUIRED",
    truth_boundary_statement: selectionTruthBoundary(),
    profiles: profileRows(),
    source_refs: sharedSourceRefs(),
    typed_gaps: [
      "SELF_HOST_DECISION_REQUIRED: profiles are policy-complete but not yet executable because no provider/runtime is frozen.",
      "NOT_ENABLED_IN_INITIAL_SCOPE: mixed-language multi-document bundle handling remains intentionally blocked.",
    ],
    notes: [
      "Profiles freeze the product-side documentary-evidence contract independently from any later provider choice.",
      "Every profile is async-only and upload-gate-aware.",
    ],
  };
}

export function createRecommendedDocumentExtractionReviewThresholds(): DocumentExtractionReviewThresholds {
  return {
    schema_version: "1.0",
    policy_id: "document_extraction_review_thresholds",
    selection_status: "SELF_HOST_DECISION_REQUIRED",
    truth_boundary_statement: selectionTruthBoundary(),
    allowed_upload_gate_states: [
      "CHECKSUM_VERIFIED",
      "SCAN_CLEAR_OR_EQUIVALENT_ADOPTION",
      "REQUEST_BINDING_FROZEN",
      "ATTACHMENT_CONFIRMED",
    ],
    blocked_upload_gate_states: [
      "TRANSFER_PENDING",
      "CHECKSUM_PENDING",
      "SCAN_PENDING",
      "QUARANTINED",
      "VALIDATION_FAILED",
      "ATTACHMENT_UNCONFIRMED",
    ],
    confidence_bands: [
      {
        band_ref: "confidence_auto_candidate",
        min_inclusive: 0.985,
        max_exclusive: 1.001,
        action: "AUTO_ACCEPT_TO_CANDIDATE",
        summary: "Only bounded fields on low-ambiguity profiles may enter candidate facts automatically in this band.",
      },
      {
        band_ref: "confidence_review_required",
        min_inclusive: 0.9,
        max_exclusive: 0.985,
        action: "REVIEW_REQUIRED",
        summary: "Human review is required before candidate-fact use for the affected field or profile.",
      },
      {
        band_ref: "confidence_layout_only",
        min_inclusive: 0.75,
        max_exclusive: 0.9,
        action: "LAYOUT_ONLY_RETAIN",
        summary: "Retain normalized extraction for evidence and review, but do not emit active candidate facts.",
      },
      {
        band_ref: "confidence_quality_too_low",
        min_inclusive: 0,
        max_exclusive: 0.75,
        action: "QUALITY_TOO_LOW",
        summary: "Image quality or OCR reliability is too weak for candidate-fact emission.",
      },
    ],
    typed_actions: [
      "AUTO_ACCEPT_TO_CANDIDATE",
      "REVIEW_REQUIRED",
      "LAYOUT_ONLY_RETAIN",
      "UNSUPPORTED_FORMAT",
      "QUALITY_TOO_LOW",
      "BLOCKED_BY_QUARANTINE",
    ],
    profile_rules: thresholdRules(),
    source_refs: sharedSourceRefs(),
    typed_gaps: [
      "SELF_HOST_DECISION_REQUIRED: review thresholds are frozen, but no runtime is yet chosen to execute them.",
    ],
    notes: [
      "Thresholds intentionally fail closed: low confidence, quarantine, drift, stale rebase, or unsupported format never produce trust-ready facts.",
      "Duplicate extraction requests collapse onto a stable object-version plus profile identity before any new candidate set is emitted.",
    ],
  };
}

export function createRecommendedOcrOutputToCandidateFactMapping(): OcrOutputToCandidateFactMapping {
  return {
    schema_version: "1.0",
    mapping_id: "ocr_output_to_candidate_fact_mapping",
    selection_status: "SELF_HOST_DECISION_REQUIRED",
    truth_boundary_statement: selectionTruthBoundary(),
    mapping_rows: mappingRows(),
    source_refs: sharedSourceRefs(),
    typed_gaps: [
      "NOT_SELECTED_PROVIDER_WORKSPACE: the mapping is ready for runtime consumption, but no provider workspace has been adopted.",
    ],
    notes: [
      "Every mapping terminates in a candidate-fact family and explicitly lists prohibited canonical targets.",
      "Normalized extraction fields remain distinguishable from raw provider output and from candidate facts.",
    ],
  };
}

function statusLabelForProfile(
  profile: DocumentExtractionProfileRow,
): "Ready Once Selected" | "Not Enabled" {
  return profile.activation_state === "READY_ONCE_PROVIDER_SELECTED"
    ? "Ready Once Selected"
    : "Not Enabled";
}

function summaryForProfile(profile: DocumentExtractionProfileRow): string {
  switch (profile.profile_ref) {
    case "doc_profile_receipt_capture":
      return "Receipt capture stays narrow and candidate-only: merchant, date, totals, and line items remain reviewable evidence.";
    case "doc_profile_invoice_pdf":
      return "Invoice extraction is bounded to identifiers and amount candidates rather than direct filing facts.";
    case "doc_profile_bank_statement_pdf":
      return "Bank statements remain review-heavy because table segmentation and money meaning are sensitive to OCR drift.";
    case "doc_profile_authority_correspondence_pdf":
      return "Authority correspondence may expose references and dates, but legal meaning stays downstream.";
    case "doc_profile_screenshot_capture":
      return "Screenshots default to layout/text retention and do not become workflow truth.";
    case "doc_profile_handwritten_note":
      return "Handwritten notes are always human-reviewed regardless of confidence.";
    default:
      return "Mixed-language bundled documents remain blocked until splitter and multilingual review policy are selected.";
  }
}

export function createDocumentExtractionGovernanceBoardViewModel(): DocumentExtractionGovernanceBoardViewModel {
  const catalog = createRecommendedDocumentExtractionProfileCatalog();
  const thresholds = createRecommendedDocumentExtractionReviewThresholds();
  const candidateMapping = createRecommendedOcrOutputToCandidateFactMapping();

  return {
    provider_label: OCR_PROVIDER_DISPLAY_NAME,
    provider_monogram: "OCR",
    selection_posture: "SELF_HOST_DECISION_REQUIRED",
    selection_posture_label: "Self-host decision required",
    active_environment_ref: "env_shared_sandbox_integration",
    environment_options: [
      {
        environment_ref: "env_local_provisioning_workstation",
        label: "Local provisioning workstation",
        summary:
          "Local fixture and contract validation only; no live extraction provider is configured.",
      },
      {
        environment_ref: "env_shared_sandbox_integration",
        label: "Shared sandbox integration",
        summary:
          "Sandbox upload intake still blocks extraction until a runtime is selected and the scan/adoption gate is satisfied.",
      },
      {
        environment_ref: "env_preproduction_verification",
        label: "Preproduction verification",
        summary:
          "Preproduction would reuse the same policy pack, but no managed provider or self-host runtime is frozen yet.",
      },
      {
        environment_ref: "env_production",
        label: "Production",
        summary:
          "Production remains blocked until the self-host or managed-provider choice, residency posture, and processor pinning are explicitly approved.",
      },
    ],
    profiles: catalog.profiles.map((profile) => {
      const profileThreshold = thresholds.profile_rules.find(
        (row) => row.profile_ref === profile.profile_ref,
      );
      const rows = candidateMapping.mapping_rows.filter(
        (row) => row.profile_ref === profile.profile_ref,
      );

      return {
        profile_ref: profile.profile_ref,
        label: profile.document_class.replaceAll("_", " "),
        status_label: statusLabelForProfile(profile),
        summary: summaryForProfile(profile),
        source_artifact_rows: [
          {
            label: "Accepted MIME types",
            detail: profile.accepted_mime_types.join(", "),
          },
          {
            label: "Page and size limits",
            detail: `${profile.page_count_limit} pages, ${profile.file_size_limit_mb} MB`,
          },
          {
            label: "Upload gate",
            detail:
              "Stable object version plus scan/adoption, request binding, and attachment confirmation are required.",
          },
        ],
        normalized_extraction_rows: [
          {
            label: "Extraction family",
            detail: profile.extraction_family.replaceAll("_", " "),
          },
          {
            label: "Feature flags",
            detail: profile.provider_feature_flags.join(", "),
          },
          {
            label: "Processor pinning",
            detail: profile.processor_version_pinning_posture.replaceAll("_", " "),
          },
        ],
        candidate_boundary_rows: [
          {
            label: "Candidate families",
            detail: profile.candidate_fact_families.join(", "),
          },
          {
            label: "Promotion guard",
            detail: "OCR output may emit candidate facts only, never canonical facts.",
          },
          {
            label: "Prohibited canonical targets",
            detail:
              rows.length > 0
                ? rows[0]!.prohibited_canonical_targets.join(", ")
                : "No canonical targets permitted.",
          },
        ],
        threshold_rows: [
          {
            label: "Default action",
            detail:
              profileThreshold?.default_action_if_above_review_min.replaceAll("_", " ") ??
              "Unsupported format",
          },
          {
            label: "Review threshold",
            detail:
              profileThreshold?.auto_accept_min_confidence_or_null !== null
                ? `auto >= ${profileThreshold?.auto_accept_min_confidence_or_null}; review >= ${profileThreshold?.review_min_confidence}`
                : `review >= ${profileThreshold?.review_min_confidence ?? "n/a"}`,
          },
          {
            label: "Quarantine or drift",
            detail:
              "Quarantine blocks extraction entirely; stale rebase and provider-version drift both force review.",
          },
        ],
        lineage_rows: [
          {
            label: "Lineage strip",
            detail:
              "upload object version -> extraction run -> evidence item -> candidate facts",
          },
          {
            label: "Duplicate handling",
            detail:
              profileThreshold?.duplicate_submission_policy.replaceAll("_", " ") ??
              "DEDUP BY STABLE OBJECT VERSION AND PROFILE",
          },
          {
            label: "Required refs",
            detail: profile.lineage_requirements.join(", "),
          },
        ],
        inspector_notes: [
          ...profile.notes,
          ...(profileThreshold?.notes ?? []),
        ],
        source_refs: profile.source_refs,
      };
    }),
    truth_boundary_statement: selectionTruthBoundary(),
    notes: [
      "No managed OCR workspace is provisioned yet because the corpus never chose a cloud platform.",
      "The board is a premium evidence atelier: it explains boundaries, lineage, and thresholds instead of acting as a provider console.",
      "Processor version pinning is mandatory once a runtime is selected, whether managed or self-hosted.",
    ],
  };
}

export function validateDocumentExtractionSelectionRecord(
  record: DocumentExtractionSelectionRecord,
): void {
  if (record.selection_status !== "SELF_HOST_DECISION_REQUIRED") {
    throw new Error("The canonical OCR posture must remain SELF_HOST_DECISION_REQUIRED until a provider/runtime is explicitly selected.");
  }
  if (record.managed_default_status !== "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION") {
    throw new Error("The managed default must stay blocked until a cloud platform is selected.");
  }
  if (record.selected_provider_adapter_or_null !== null) {
    throw new Error("No managed OCR provider may be silently selected.");
  }
}

export function validateDocumentExtractionProviderInventory(
  inventory: DocumentExtractionProviderInventory,
): void {
  if (inventory.option_rows.length < 4) {
    throw new Error("The OCR option matrix must compare at least three managed options plus one self-host path.");
  }
  if (
    !inventory.option_rows.some(
      (row) => row.option_kind === "SELF_HOST_STACK" && row.selection_state === "SELF_HOST_DECISION_REQUIRED",
    )
  ) {
    throw new Error("The OCR option matrix must keep a self-host decision row explicit.");
  }
}

export function validateDocumentExtractionProfileCatalog(
  catalog: DocumentExtractionProfileCatalog,
): void {
  if (catalog.profiles.length < 6) {
    throw new Error("The OCR profile catalog must cover the minimum documentary evidence families.");
  }
  if (
    catalog.profiles.some((profile) =>
      profile.candidate_fact_families.some(
        (family) => !family.endsWith("_CANDIDATE"),
      ),
    )
  ) {
    throw new Error("Every OCR profile candidate family must remain candidate-only.");
  }
}

export function validateDocumentExtractionReviewThresholds(
  thresholds: DocumentExtractionReviewThresholds,
): void {
  [
    "AUTO_ACCEPT_TO_CANDIDATE",
    "REVIEW_REQUIRED",
    "LAYOUT_ONLY_RETAIN",
    "UNSUPPORTED_FORMAT",
    "QUALITY_TOO_LOW",
    "BLOCKED_BY_QUARANTINE",
  ].forEach((action) => {
    if (!thresholds.typed_actions.includes(action as DocumentExtractionReviewAction)) {
      throw new Error(`Missing typed OCR review action ${action}.`);
    }
  });
  ["SCAN_PENDING", "QUARANTINED", "ATTACHMENT_UNCONFIRMED"].forEach((state) => {
    if (!thresholds.blocked_upload_gate_states.includes(state)) {
      throw new Error(`Missing blocked OCR upload gate state ${state}.`);
    }
  });
}

export function validateOcrOutputToCandidateFactMapping(
  mapping: OcrOutputToCandidateFactMapping,
): void {
  if (mapping.mapping_rows.length < 10) {
    throw new Error("OCR candidate-fact mapping must cover the declared initial profiles.");
  }
  if (
    mapping.mapping_rows.some(
      (row) =>
        row.promotion_guard !== "CANDIDATE_ONLY_NEVER_CANONICAL" ||
        !row.candidate_fact_family.endsWith("_CANDIDATE"),
    )
  ) {
    throw new Error("OCR mapping rows must terminate in candidate-only families.");
  }
}

export function assertOcrCandidateBoundary(
  mapping: OcrOutputToCandidateFactMapping,
): void {
  const serialized = JSON.stringify(mapping).toLowerCase();
  [
    "\"canonical_fact\"",
    "\"filing_field\"",
    "\"trusted_total\"",
    "\"authority_truth\"",
  ].forEach((marker) => {
    if (serialized.includes(marker)) {
      throw new Error(`OCR mapping must not contain direct canonical promotion markers (${marker}).`);
    }
  });
}

export function assertDocumentExtractionArtifactsSanitized(
  inventory: DocumentExtractionProviderInventory,
  record: DocumentExtractionSelectionRecord,
): void {
  const serialized = JSON.stringify({ inventory, record }).toLowerCase();
  ["api_key", "client_secret", "bearer ", "authorization:", "access_token"].forEach(
    (marker) => {
      if (serialized.includes(marker)) {
        throw new Error(`OCR artifacts must not persist raw credential material (${marker}).`);
      }
    },
  );
}

export function createDefaultDocumentExtractionEntryUrls(): DocumentExtractionProviderEntryUrls {
  return {
    controlPlane:
      "/automation/provisioning/tests/fixtures/document_extraction_control_plane.html?scenario=blocked-by-platform",
  };
}

function evidenceManifestPathFor(selectionRecordPath: string): string {
  return path.join(
    path.dirname(selectionRecordPath),
    "document_extraction_evidence_manifest.json",
  );
}

async function persistJsonArtifact(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function locateSelector(page: Page, descriptor: SelectorDescriptor): Locator {
  switch (descriptor.strategy) {
    case "ROLE":
      return page.getByRole(
        descriptor.value as Parameters<Page["getByRole"]>[0],
        descriptor.accessibleName
          ? { name: descriptor.accessibleName, exact: true }
          : undefined,
      );
    case "LABEL":
      return page.getByLabel(descriptor.value, { exact: true });
    case "TEXT":
      return page.getByText(descriptor.value, { exact: true });
    case "CSS_FALLBACK":
      return page.locator(descriptor.value);
    default:
      throw new Error(`Unsupported selector strategy ${descriptor.strategy}`);
  }
}

async function requireVisible(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<Locator> {
  const descriptor = rankSelectors(
    manifest.selectors.filter((entry) => entry.selectorId === selectorId),
  )[0];
  if (!descriptor) {
    throw new Error(`Selector ${selectorId} is missing from ${manifest.manifestId}.`);
  }
  const locator = locateSelector(page, descriptor);
  await locator.first().waitFor({ state: "visible" });
  return locator.first();
}

async function captureNoteEvidence(
  manifest: EvidenceManifest,
  stepId: string,
  summary: string,
): Promise<EvidenceManifest> {
  return appendEvidenceRecord(manifest, {
    evidenceId: `${stepId}-${summary.replace(/\W+/g, "-").toLowerCase().slice(0, 40)}`,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary,
  });
}

async function detectFixtureState(
  page: Page,
): Promise<DocumentExtractionFixtureState> {
  const scenario =
    (await page.locator("body").getAttribute("data-scenario")) ??
    "blocked-by-platform";
  return {
    provider_state:
      scenario === "blocked-by-platform"
        ? "blocked-by-platform"
        : "blocked-by-platform",
  };
}

export async function loadDocumentExtractionSelectorManifest(): Promise<SelectorManifest> {
  return OCR_SELECTOR_MANIFEST;
}

export async function createManagedDocumentExtractionProjectOrRecordSelfHostDecision(
  options: CreateManagedDocumentExtractionProjectOptions,
): Promise<CreateManagedDocumentExtractionProjectResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(OCR_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, DOCUMENT_EXTRACTION_FLOW_ID);

  const manifest = await loadDocumentExtractionSelectorManifest();
  const entryUrls =
    options.entryUrls ?? createDefaultDocumentExtractionEntryUrls();
  const steps: StepContract[] = [
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.openDecisionSurface,
      title: "Open document extraction decision surface",
      selectorRefs: ["decision-heading", "selection-action"],
    }),
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.recordSelection,
      title: "Record self-host decision and managed-platform block",
      selectorRefs: ["selection-action"],
    }),
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.validateProfiles,
      title: "Validate document extraction profiles",
      selectorRefs: ["profiles-heading", "profiles-action"],
    }),
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.validateThresholds,
      title: "Validate deterministic review thresholds",
      selectorRefs: ["thresholds-heading", "thresholds-action"],
    }),
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.validateCandidateBoundary,
      title: "Validate provider-output to candidate-fact boundary",
      selectorRefs: ["boundary-heading", "boundary-action", "lineage-heading"],
    }),
    createPendingStep({
      stepId: DOCUMENT_EXTRACTION_STEP_IDS.persistArtifacts,
      title: "Persist OCR selection and provider option artifacts",
      selectorRefs: ["lineage-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the document extraction decision surface.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "decision-heading");
  await requireVisible(options.page, manifest, "selection-action");
  await requireVisible(options.page, manifest, "profiles-heading");
  await requireVisible(options.page, manifest, "profiles-action");
  await requireVisible(options.page, manifest, "thresholds-heading");
  await requireVisible(options.page, manifest, "thresholds-action");
  await requireVisible(options.page, manifest, "boundary-heading");
  await requireVisible(options.page, manifest, "boundary-action");
  await requireVisible(options.page, manifest, "lineage-heading");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Document extraction decision surface is reachable with semantic selectors only.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the OCR/document-extraction decision surface without relying on brittle selector fallbacks.",
  );

  const fixtureState = await detectFixtureState(options.page);
  const providerInventory =
    createRecommendedDocumentExtractionProviderInventory(options.runContext);
  const selectionRecord =
    createRecommendedDocumentExtractionSelectionRecord(options.runContext);
  const profileCatalog = createRecommendedDocumentExtractionProfileCatalog();
  const reviewThresholds =
    createRecommendedDocumentExtractionReviewThresholds();
  const candidateFactMapping =
    createRecommendedOcrOutputToCandidateFactMapping();
  const boardViewModel = createDocumentExtractionGovernanceBoardViewModel();

  validateDocumentExtractionProviderInventory(providerInventory);
  validateDocumentExtractionSelectionRecord(selectionRecord);
  validateDocumentExtractionProfileCatalog(profileCatalog);
  validateDocumentExtractionReviewThresholds(reviewThresholds);
  validateOcrOutputToCandidateFactMapping(candidateFactMapping);
  assertOcrCandidateBoundary(candidateFactMapping);
  assertDocumentExtractionArtifactsSanitized(providerInventory, selectionRecord);

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Recording the explicit OCR decision posture.",
  );
  steps[1] = transitionStep(
    steps[1]!,
    "SUCCEEDED",
    fixtureState.provider_state === "blocked-by-platform"
      ? "Recorded SELF_HOST_DECISION_REQUIRED with BLOCKED_BY_PLATFORM_PROVIDER_SELECTION for the managed path."
      : "Recorded the current OCR decision posture.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    "Managed OCR remains blocked because no cloud platform was chosen earlier, so the current lawful posture is SELF_HOST_DECISION_REQUIRED.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Validating document classes, MIME/type bounds, and processor pinning policy.",
  );
  steps[2] = transitionStep(
    steps[2]!,
    "SUCCEEDED",
    "Document profiles now freeze supported classes, conservative file bounds, candidate-fact families, and queue-only execution posture.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[2].stepId,
    "Profile catalog now covers receipts, invoices, bank statements, correspondence, screenshots, and handwritten notes without collapsing them into canonical truth.",
  );

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Validating deterministic threshold and upload-gate rules.",
  );
  steps[3] = transitionStep(
    steps[3]!,
    "SUCCEEDED",
    "Threshold policy now blocks quarantined or scan-pending uploads and makes review semantics explicit across all profiles.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[3].stepId,
    "Review thresholds now encode AUTO_ACCEPT_TO_CANDIDATE, REVIEW_REQUIRED, LAYOUT_ONLY_RETAIN, UNSUPPORTED_FORMAT, QUALITY_TOO_LOW, and BLOCKED_BY_QUARANTINE deterministically.",
  );

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Validating that OCR output terminates at candidate facts only.",
  );
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Normalized OCR output now maps to candidate-fact families only and preserves explicit prohibited canonical targets.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "OCR mappings now terminate at candidate-fact families only, with stable lineage from object version to extraction run to evidence item to candidate facts.",
  );

  steps[5] = transitionStep(
    steps[5]!,
    "RUNNING",
    "Persisting OCR provider inventory and selection artifacts.",
  );
  await persistJsonArtifact(options.providerInventoryPath, providerInventory);
  await persistJsonArtifact(options.selectionRecordPath, selectionRecord);
  const manifestPath = evidenceManifestPathFor(options.selectionRecordPath);
  await persistJsonArtifact(manifestPath, evidenceManifest);
  steps[5] = transitionStep(
    steps[5]!,
    "SUCCEEDED",
    "Persisted sanitized OCR option-matrix and selection artifacts.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[5].stepId,
    "Persisted OCR selection artifacts without provider credentials, API keys, or raw extraction payloads.",
  );
  await persistJsonArtifact(manifestPath, evidenceManifest);

  return {
    outcome: "DOCUMENT_EXTRACTION_SELF_HOST_DECISION_REQUIRED",
    steps,
    providerInventory,
    selectionRecord,
    profileCatalog,
    reviewThresholds,
    candidateFactMapping,
    boardViewModel,
    evidenceManifestPath: manifestPath,
    notes: selectionRecord.selection_notes,
  };
}
