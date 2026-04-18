import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const OBJECT_STORAGE_PROVIDER_ID = "object-storage-topology";
export const OBJECT_STORAGE_FLOW_ID =
  "provision-buckets-for-evidence-artifacts-exports-and-quarantine";
export const OBJECT_STORAGE_POLICY_VERSION = "1.0";
export const OBJECT_STORAGE_LAST_VERIFIED_AT = "2026-04-18T15:20:00Z";

export type ObjectStorageProviderFamily =
  | "AWS_S3"
  | "GCP_CLOUD_STORAGE"
  | "AZURE_BLOB_STORAGE"
  | "SELF_HOSTED_S3_COMPATIBLE";

export type ObjectStorageSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_SELECTED";

export type ObjectStorageManagedDefaultStatus =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "READY_TO_ADOPT_PLATFORM_OBJECT_STORAGE";

export type ObjectStorageNamespaceStrategy =
  "ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE";

export type BucketZoneRef =
  | "UPLOAD_INTAKE"
  | "RETAINED_EVIDENCE"
  | "DERIVED_EXPORT"
  | "QUARANTINE";

export type VersioningState = "ENABLED_REQUIRED";

export type PublicAccessState = "PUBLIC_ACCESS_BLOCKED";

export type DirectDownloadPosture =
  | "NONE"
  | "SIGNED_GATEWAY_ONLY_CURRENT_GOVERNED"
  | "SIGNED_GATEWAY_ONLY_MASKED_EXPORT"
  | "SIGNED_GATEWAY_ONLY_OPERATOR_STEP_UP";

export type PreviewPosture =
  | "NOT_AVAILABLE"
  | "GATEWAY_PREVIEW_CURRENT_ONLY"
  | "GATEWAY_PREVIEW_DERIVED_ONLY";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  provider_family: ObjectStorageProviderFamily;
  selection_state:
    | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    | "SELF_HOST_DECISION_REQUIRED";
  provider_label: string;
  docs_urls: string[];
  versioning_summary: string;
  lifecycle_summary: string;
  event_notification_summary: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentNamespaceRow {
  environment_ref: string;
  label: string;
  bucket_prefix: string;
  residency_class:
    | "LOCAL_ONLY_NON_AUTHORITATIVE"
    | "UK_NON_PRODUCTION_PRIMARY"
    | "UK_PREPRODUCTION_PRIMARY"
    | "UK_PRODUCTION_PRIMARY"
    | "UK_RESTORE_DRILL_ISOLATED";
  namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT";
  event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE";
  source_refs: SourceRef[];
  notes: string[];
}

export interface BucketPurposeRow {
  purpose_ref: string;
  label: string;
  zone_ref: BucketZoneRef;
  bucket_suffix: string;
  versioning_state: VersioningState;
  direct_download_posture: DirectDownloadPosture;
  preview_posture: PreviewPosture;
  retention_profile_ref: string;
  event_profile_ref: string;
  encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT";
  public_access_state: PublicAccessState;
  object_ref_posture:
    "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED";
  source_refs: SourceRef[];
  notes: string[];
}

export interface BucketInstanceRow {
  bucket_ref: string;
  environment_ref: string;
  purpose_ref: string;
  zone_ref: BucketZoneRef;
  bucket_name: string;
  versioning_state: VersioningState;
  encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT";
  public_access_state: PublicAccessState;
  direct_download_posture: DirectDownloadPosture;
  preview_posture: PreviewPosture;
  retention_profile_ref: string;
  event_profile_ref: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface BucketPurposeMatrix {
  schema_version: "1.0";
  matrix_id: "object_storage_bucket_purpose_matrix";
  selection_status: ObjectStorageSelectionStatus;
  managed_default_status: ObjectStorageManagedDefaultStatus;
  namespace_strategy: ObjectStorageNamespaceStrategy;
  purpose_rows: BucketPurposeRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
}

export interface ObjectKeyNamingRow {
  key_family_ref: string;
  purpose_ref: string;
  artifact_family_label: string;
  key_template: string;
  required_dimensions: string[];
  version_identity_dimensions: string[];
  forbidden_shortcuts: string[];
  preview_or_masking_dimension_or_null: string | null;
  source_refs: SourceRef[];
  notes: string[];
}

export interface ObjectKeyNamingContract {
  schema_version: "1.0";
  contract_id: "object_key_naming_contract";
  selection_status: ObjectStorageSelectionStatus;
  namespace_strategy: ObjectStorageNamespaceStrategy;
  key_family_rows: ObjectKeyNamingRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface LifecycleRetentionRow {
  lifecycle_ref: string;
  purpose_ref: string;
  label: string;
  retention_class:
    | "regulated_record"
    | "derived_artifact"
    | "operational_log"
    | "analytics_projection"
    | "policy_governed_other";
  retention_tags: string[];
  duration_resolution_state:
    "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS";
  current_version_posture: string;
  prior_version_posture: string;
  hold_or_legal_block_posture: string;
  transition_posture: string;
  source_expiry_effect_on_derivatives: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface LifecycleRetentionPolicy {
  schema_version: "1.0";
  policy_id: "object_storage_lifecycle_retention_policy";
  selection_status: ObjectStorageSelectionStatus;
  namespace_strategy: ObjectStorageNamespaceStrategy;
  lifecycle_rows: LifecycleRetentionRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface EventNotificationRoute {
  route_ref: string;
  purpose_ref: string;
  label: string;
  event_types: string[];
  destination_channel_ref: string;
  delivery_posture: "AT_LEAST_ONCE";
  ordering_posture: "OUT_OF_ORDER_POSSIBLE";
  dedupe_fields: string[];
  downstream_precondition: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface EventNotificationContract {
  schema_version: "1.0";
  contract_id: "object_storage_event_notification_contract";
  selection_status: ObjectStorageSelectionStatus;
  route_rows: EventNotificationRoute[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface QuarantineIsolationRule {
  rule_ref: string;
  subject_class:
    | "CUSTOMER_PORTAL"
    | "DEFAULT_OPERATOR_WORKSPACE"
    | "SECURITY_OPERATIONS_REVIEW"
    | "EXTRACTION_WORKER"
    | "EXPORT_WORKER"
    | "QUARANTINE_RELEASE_WORKFLOW";
  preview_allowed: false;
  download_allowed: false;
  direct_url_allowed: false;
  visible_metadata_fields: string[];
  release_mode:
    | "NOT_APPLICABLE"
    | "COPY_PROMOTE_WITH_NEW_CLEAN_OBJECT_VERSION_AND_HISTORY_RETAINED";
  lineage_requirements: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface QuarantineIsolationPolicy {
  schema_version: "1.0";
  policy_id: "object_storage_quarantine_isolation_policy";
  selection_status: ObjectStorageSelectionStatus;
  quarantine_purpose_ref: "purpose.quarantine";
  truth_boundary_statement: string;
  rule_rows: QuarantineIsolationRule[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface ObjectStorageInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "object_storage_inventory";
  provider_id: typeof OBJECT_STORAGE_PROVIDER_ID;
  flow_id: typeof OBJECT_STORAGE_FLOW_ID;
  policy_version: typeof OBJECT_STORAGE_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: ObjectStorageSelectionStatus;
  managed_default_status: ObjectStorageManagedDefaultStatus;
  selected_provider_family_or_null: ObjectStorageProviderFamily | null;
  namespace_strategy: ObjectStorageNamespaceStrategy;
  provider_option_rows: ProviderOptionRow[];
  environment_rows: EnvironmentNamespaceRow[];
  bucket_rows: BucketInstanceRow[];
  bucket_purpose_matrix_ref:
    "config/object_storage/bucket_purpose_matrix.json";
  object_key_naming_contract_ref:
    "config/object_storage/object_key_naming_contract.json";
  lifecycle_retention_policy_ref:
    "config/object_storage/lifecycle_retention_policy.json";
  event_notification_contract_ref:
    "config/object_storage/event_notification_contract.json";
  quarantine_isolation_policy_ref:
    "config/object_storage/quarantine_isolation_policy.json";
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface StorageBucketTopologyBoardViewModel {
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: string;
  isolationPostureLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    bucket_prefix: string;
    residency_class: string;
  }>;
  buckets: Array<{
    bucket_ref: string;
    environment_ref: string;
    purpose_ref: string;
    zone_ref: BucketZoneRef;
    label: string;
    bucket_name: string;
    versioning_state: string;
    direct_download_posture: string;
    preview_posture: string;
    lifecycle_ref: string;
    event_profile_ref: string;
    notes: string[];
  }>;
  keyFamilies: Array<{
    key_family_ref: string;
    purpose_ref: string;
    artifact_family_label: string;
    key_template: string;
    required_dimensions: string[];
    notes: string[];
  }>;
  lifecycleRules: Array<{
    lifecycle_ref: string;
    purpose_ref: string;
    label: string;
    retention_class: string;
    retention_tags: string[];
    note: string;
  }>;
  eventRoutes: Array<{
    route_ref: string;
    purpose_ref: string;
    label: string;
    event_types: string[];
    destination_channel_ref: string;
    dedupe_fields: string[];
    note: string;
  }>;
  selectedEnvironmentRef: string;
  selectedBucketRef: string;
  selectedLifecycleRef: string;
  selectedEventRef: string;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionObjectStorageStep {
  step_id: string;
  title: string;
  status:
    | "SUCCEEDED"
    | "BLOCKED_BY_POLICY"
    | "SKIPPED_AS_ALREADY_PRESENT"
    | "BLOCKED_BY_DRIFT";
  reason: string;
}

export interface ProvisionObjectStorageResult {
  outcome:
    | "OBJECT_STORAGE_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "OBJECT_STORAGE_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
    | "OBJECT_STORAGE_TOPOLOGY_DRIFT_REVIEW_REQUIRED";
  selection_status: ObjectStorageSelectionStatus;
  inventory: ObjectStorageInventoryTemplate;
  bucketPurposeMatrix: BucketPurposeMatrix;
  objectKeyNamingContract: ObjectKeyNamingContract;
  lifecycleRetentionPolicy: LifecycleRetentionPolicy;
  eventNotificationContract: EventNotificationContract;
  quarantineIsolationPolicy: QuarantineIsolationPolicy;
  boardViewModel: StorageBucketTopologyBoardViewModel;
  steps: ProvisionObjectStorageStep[];
  notes: string[];
}

const docsUrls = {
  awsVersioning: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html",
  awsLifecycle: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html",
  awsEvents:
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html",
  gcpVersioning: "https://docs.cloud.google.com/storage/docs/object-versioning",
  gcpLifecycle: "https://docs.cloud.google.com/storage/docs/lifecycle",
  gcpEvents: "https://docs.cloud.google.com/storage/docs/pubsub-notifications",
  azureVersioning:
    "https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview",
  azureLifecycle:
    "https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview",
  azureEvents:
    "https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage",
  minioVersioning:
    "https://docs.min.io/enterprise/aistor-object-store/administration/objects-and-versioning/versioning/enable-versioning/",
  minioLifecycle:
    "https://docs.min.io/enterprise/aistor-object-store/administration/",
  minioEvents:
    "https://docs.min.io/docs/minio/linux/administration/monitoring/bucket-notifications.html",
} as const;

const sourceRefs: SourceRef[] = [
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "1. Reference runtime topology",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L25[1._Reference_runtime_topology]",
    rationale:
      "The runtime topology explicitly requires an immutable object store for uploaded bytes, quarantined binaries, proof bundles, and export bodies.",
  },
  {
    source_file: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md",
    source_heading_or_logical_block: "Decision",
    source_ref:
      "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md::Decision",
    rationale:
      "ADR-002 already fixed the object-store role as immutable-body storage distinct from control truth, broker transport, and disposable projections.",
  },
  {
    source_file: "data/analysis/dependency_register.json",
    source_heading_or_logical_block:
      "OBJECT_STORAGE_AND_QUARANTINE_BUCKETS dependency row",
    source_ref:
      "data/analysis/dependency_register.json::OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
    rationale:
      "The dependency register marks the object-store substrate as mandatory while leaving the platform as a procurement or platform choice.",
  },
  {
    source_file: "Algorithm/canonical_source_and_evidence_taxonomy.md",
    source_heading_or_logical_block:
      "EvidenceItem and DOCUMENTARY_EVIDENCE candidate-boundary law",
    source_ref:
      "Algorithm/canonical_source_and_evidence_taxonomy.md::L32[EvidenceItem] / Algorithm/canonical_source_and_evidence_taxonomy.md::L354[DOCUMENTARY_EVIDENCE]",
    rationale:
      "Object storage carries retained evidence bodies but must not turn raw bytes or extracted output into canonical truth by itself.",
  },
  {
    source_file: "Algorithm/customer_client_portal_experience_contract.md",
    source_heading_or_logical_block:
      "Secure document-upload flow and preview posture",
    source_ref:
      "Algorithm/customer_client_portal_experience_contract.md::L307[upload-session_state] / Algorithm/customer_client_portal_experience_contract.md::L321[same-shell_file_preview]",
    rationale:
      "Transfer, scan, validation, attachment confirmation, preview, and current-vs-history remain separate facts and the storage topology must preserve that separation.",
  },
  {
    source_file: "Algorithm/northbound_api_and_session_contract.md",
    source_heading_or_logical_block: "2.2 Customer/Client portal and upload-session surfaces",
    source_ref:
      "Algorithm/northbound_api_and_session_contract.md::L204[2.2_Customer/Client_portal_and_upload-session_surfaces]",
    rationale:
      "Upload-session allocation freezes tenant, client, request, and request-version identity, which object keys and refs must preserve.",
  },
  {
    source_file: "Algorithm/upload_session_request_binding_and_rebase_contract.md",
    source_heading_or_logical_block: "Upload-session identity and stale-rebase law",
    source_ref:
      "Algorithm/upload_session_request_binding_and_rebase_contract.md::L4[contract_boundary] / Algorithm/upload_session_request_binding_and_rebase_contract.md::L67[prohibited_inference]",
    rationale:
      "Storage keys and refs must continue to bind immutable upload-session identity through rebase and replacement instead of collapsing onto friendly names.",
  },
  {
    source_file: "Algorithm/upload_session_recovery_harness_contract.md",
    source_heading_or_logical_block:
      "Frozen upload-session continuity and scanner-delay cases",
    source_ref:
      "Algorithm/upload_session_recovery_harness_contract.md::L19[continuity_boundary] / Algorithm/upload_session_recovery_harness_contract.md::L61[scanner_delay_prohibition]",
    rationale:
      "Multipart or resumable transfer success does not imply accepted, previewable, or attachable posture, and storage event routes must preserve that law.",
  },
  {
    source_file: "Algorithm/retention_and_privacy.md",
    source_heading_or_logical_block:
      "Artifact retention contract and limitation behavior",
    source_ref:
      "Algorithm/retention_and_privacy.md::L58[Artifact_retention_contract]",
    rationale:
      "Lifecycle rules must bind storage purposes to retention classes and explicit limitation behavior rather than inventing ad hoc expiry semantics.",
  },
  {
    source_file: "data/analysis/artifact_retention_matrix.json",
    source_heading_or_logical_block:
      "Artifact retention matrix explicit gaps and retention classes",
    source_ref:
      "data/analysis/artifact_retention_matrix.json::retention_class_enum",
    rationale:
      "The corpus publishes retention classes but still lacks one canonical per-artifact duration matrix, so lifecycle rules must encode the gap explicitly.",
  },
  {
    source_file: "config/uploads/malware_scan_outcome_mapping.json",
    source_heading_or_logical_block: "Truth boundary statement and quarantine posture",
    source_ref:
      "config/uploads/malware_scan_outcome_mapping.json::truth_boundary_statement",
    rationale:
      "The object-store topology has to preserve the already-fixed quarantine, preview, and extraction boundary from upload intake safety work.",
  },
  {
    source_file: "config/uploads/quarantine_release_policy.json",
    source_heading_or_logical_block: "Release rows and history-preserving copy/promote semantics",
    source_ref:
      "config/uploads/quarantine_release_policy.json::release_rows",
    rationale:
      "Quarantine release is evidence-bound and must preserve history rather than mutating a quarantined object into clean state in place.",
  },
];

const environmentRows: EnvironmentNamespaceRow[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    label: "Local provisioning workstation",
    bucket_prefix: "taxat-local",
    residency_class: "LOCAL_ONLY_NON_AUTHORITATIVE",
    namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE",
    source_refs: sourceRefs,
    notes: [
      "Local fixture buckets are non-authoritative and exist for dry runs, viewer payloads, and deterministic tests only.",
    ],
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Shared sandbox integration",
    bucket_prefix: "taxat-sbx",
    residency_class: "UK_NON_PRODUCTION_PRIMARY",
    namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE",
    source_refs: sourceRefs,
    notes: [
      "Sandbox buckets remain fully isolated from production and still preserve quarantine and retention semantics because OCR, malware, and authority sandboxes depend on them.",
    ],
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Preproduction verification",
    bucket_prefix: "taxat-pre",
    residency_class: "UK_PREPRODUCTION_PRIMARY",
    namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE",
    source_refs: sourceRefs,
    notes: [
      "Preproduction mirrors production purpose segmentation closely enough to prove retention, preview, export, and quarantine posture before promotion.",
    ],
  },
  {
    environment_ref: "env_production",
    label: "Production",
    bucket_prefix: "taxat-prod",
    residency_class: "UK_PRODUCTION_PRIMARY",
    namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE",
    source_refs: sourceRefs,
    notes: [
      "Production buckets remain private, versioned, and gateway-mediated. Bucket listings and direct object URLs never define legal currentness.",
    ],
  },
  {
    environment_ref: "env_disaster_recovery_drill",
    label: "Disaster recovery drill",
    bucket_prefix: "taxat-drill",
    residency_class: "UK_RESTORE_DRILL_ISOLATED",
    namespace_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    event_delivery_posture: "AT_LEAST_ONCE_OUT_OF_ORDER_POSSIBLE",
    source_refs: sourceRefs,
    notes: [
      "Restore buckets keep archive and retained-object lineage available for drill verification but remain isolated from production publication paths until reopen gates pass.",
    ],
  },
];

const purposeRows: BucketPurposeRow[] = [
  {
    purpose_ref: "purpose.upload_staging",
    label: "Upload staging",
    zone_ref: "UPLOAD_INTAKE",
    bucket_suffix: "upload-staging",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "NONE",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.upload_staging",
    event_profile_ref: "event.upload_staging",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Transfer and checksum material land here first; scan and validation still gate publication and attachment confirmation.",
    ],
  },
  {
    purpose_ref: "purpose.retained_evidence",
    label: "Retained evidence",
    zone_ref: "RETAINED_EVIDENCE",
    bucket_suffix: "retained-evidence",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "SIGNED_GATEWAY_ONLY_CURRENT_GOVERNED",
    preview_posture: "GATEWAY_PREVIEW_CURRENT_ONLY",
    retention_profile_ref: "lifecycle.retained_evidence",
    event_profile_ref: "event.retained_evidence",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Retained documentary evidence remains addressable by immutable refs while customer-safe preview and download stay gateway-bound.",
    ],
  },
  {
    purpose_ref: "purpose.authority_payload_bodies",
    label: "Authority payload bodies",
    zone_ref: "RETAINED_EVIDENCE",
    bucket_suffix: "authority-payloads",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "NONE",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.authority_payload_bodies",
    event_profile_ref: "event.authority_payload_bodies",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Authority payload bodies are immutable evidence anchors, not preview assets or mutable workflow truth.",
    ],
  },
  {
    purpose_ref: "purpose.derived_previews",
    label: "Derived previews",
    zone_ref: "DERIVED_EXPORT",
    bucket_suffix: "derived-previews",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "NONE",
    preview_posture: "GATEWAY_PREVIEW_DERIVED_ONLY",
    retention_profile_ref: "lifecycle.derived_previews",
    event_profile_ref: "event.derived_previews",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Preview derivatives stay distinct from the retained evidence body so preview expiry and limitation notes cannot rewrite the evidence anchor.",
    ],
  },
  {
    purpose_ref: "purpose.export_masked",
    label: "Masked exports",
    zone_ref: "DERIVED_EXPORT",
    bucket_suffix: "export-masked",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "SIGNED_GATEWAY_ONLY_MASKED_EXPORT",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.export_masked",
    event_profile_ref: "event.export_masked",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Masked exports remain explicitly distinct from restricted exports so customer-safe externalization cannot drift into broader disclosure.",
    ],
  },
  {
    purpose_ref: "purpose.export_restricted",
    label: "Restricted exports",
    zone_ref: "DERIVED_EXPORT",
    bucket_suffix: "export-restricted",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "SIGNED_GATEWAY_ONLY_OPERATOR_STEP_UP",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.export_restricted",
    event_profile_ref: "event.export_restricted",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Restricted exports preserve a separate masking and step-up boundary even when they derive from the same manifest or evidence lineage as customer-safe exports.",
    ],
  },
  {
    purpose_ref: "purpose.quarantine",
    label: "Quarantine",
    zone_ref: "QUARANTINE",
    bucket_suffix: "quarantine",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "NONE",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.quarantine",
    event_profile_ref: "event.quarantine",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Quarantine is a separate namespace boundary. Release uses copy/promote semantics with history retained, not in-place mutation.",
    ],
  },
  {
    purpose_ref: "purpose.restore_archive",
    label: "Restore archive",
    zone_ref: "RETAINED_EVIDENCE",
    bucket_suffix: "restore-archive",
    versioning_state: "ENABLED_REQUIRED",
    direct_download_posture: "NONE",
    preview_posture: "NOT_AVAILABLE",
    retention_profile_ref: "lifecycle.restore_archive",
    event_profile_ref: "event.restore_archive",
    encryption_posture: "SERVER_SIDE_ENCRYPTION_REQUIRED_WITH_KMS_OR_EQUIVALENT",
    public_access_state: "PUBLIC_ACCESS_BLOCKED",
    object_ref_posture: "IMMUTABLE_DATABASE_REF_NEW_OBJECT_VERSION_REQUIRED",
    source_refs: sourceRefs,
    notes: [
      "Restore bundles and proof-pack bodies stay separate from live evidence delivery paths and remain drill-only until reopen law permits wider use.",
    ],
  },
];

const providerOptionRows: ProviderOptionRow[] = [
  {
    provider_family: "AWS_S3",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Amazon S3",
    docs_urls: [docsUrls.awsVersioning, docsUrls.awsLifecycle, docsUrls.awsEvents],
    versioning_summary:
      "S3 Versioning preserves prior object variants and inserts delete markers instead of removing current objects permanently.",
    lifecycle_summary:
      "S3 Lifecycle transitions or deletes objects by rule and can emit lifecycle event notifications.",
    event_notification_summary:
      "Object and lifecycle events are routed through notification destinations and require downstream dedupe on repeated or unordered delivery.",
    notes: [
      "Fits the immutable ref plus versioned recovery posture cleanly, but platform choice is still unresolved.",
    ],
    source_refs: sourceRefs,
  },
  {
    provider_family: "GCP_CLOUD_STORAGE",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Google Cloud Storage",
    docs_urls: [docsUrls.gcpVersioning, docsUrls.gcpLifecycle, docsUrls.gcpEvents],
    versioning_summary:
      "Cloud Storage retains noncurrent versions by generation number when object versioning is enabled.",
    lifecycle_summary:
      "Object Lifecycle Management acts asynchronously and can delete or transition live and noncurrent versions.",
    event_notification_summary:
      "Pub/Sub notifications publish object events with at-least-once delivery and explicit generation metadata for dedupe and overwrite tracking.",
    notes: [
      "Cloud Storage offers generation-based lineage that maps well to immutable object refs and event-driven processing.",
    ],
    source_refs: sourceRefs,
  },
  {
    provider_family: "AZURE_BLOB_STORAGE",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Azure Blob Storage",
    docs_urls: [docsUrls.azureVersioning, docsUrls.azureLifecycle, docsUrls.azureEvents],
    versioning_summary:
      "Blob versioning creates immutable previous versions on writes and deletes for supported blob operations.",
    lifecycle_summary:
      "Lifecycle management policies process objects periodically, stop or continue asynchronously, and interact with soft delete and immutable containers.",
    event_notification_summary:
      "Event Grid emits blob events with a sequencer that downstream handlers can use as part of dedupe and ordering protection.",
    notes: [
      "Blob container naming and account/container separation remain provider-specific details deferred until platform selection.",
    ],
    source_refs: sourceRefs,
  },
  {
    provider_family: "SELF_HOSTED_S3_COMPATIBLE",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    provider_label: "Self-hosted S3-compatible object storage",
    docs_urls: [docsUrls.minioVersioning, docsUrls.minioLifecycle, docsUrls.minioEvents],
    versioning_summary:
      "S3-compatible deployments such as MinIO support bucket versioning and object-lock-compatible recovery posture.",
    lifecycle_summary:
      "Lifecycle management remains policy-driven and provider-run, but patching, immutability posture, and replication guarantees stay self-host responsibilities.",
    event_notification_summary:
      "Bucket notifications can target downstream brokers or webhooks, but the eventing semantics must still be treated as at-least-once and dedupe-safe.",
    notes: [
      "Self-host remains a lawful fallback only with explicit operational ownership for patching, replication, and event-target durability.",
    ],
    source_refs: sourceRefs,
  },
];

const lifecycleRows: LifecycleRetentionRow[] = [
  {
    lifecycle_ref: "lifecycle.upload_staging",
    purpose_ref: "purpose.upload_staging",
    label: "Upload staging",
    retention_class: "policy_governed_other",
    retention_tags: ["UPLOAD_STAGING_PENDING", "UPLOAD_SCAN_PENDING", "UPLOAD_CLEAN_PENDING_VALIDATION"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Keep current versions only until scan, validation, request binding, and attachment confirmation settle or replacement supersedes the session.",
    prior_version_posture:
      "Preserve prior versions and upload-part lineage until the upload session is superseded or recovery law closes the window.",
    hold_or_legal_block_posture:
      "No public hold path; operational holds remain gateway-controlled and audit-bound.",
    transition_posture:
      "No cold-tier transition. Staging remains hot-access until it is promoted, quarantined, or retired.",
    source_expiry_effect_on_derivatives:
      "Derived assets must not outlive their upload-session and evidence binding without explicit limitation notes.",
    source_refs: sourceRefs,
    notes: [
      "Staging bytes are mutable only through new object-version refs; direct overwrite does not redefine the authoritative upload ref.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.retained_evidence",
    purpose_ref: "purpose.retained_evidence",
    label: "Retained evidence",
    retention_class: "regulated_record",
    retention_tags: ["DOCUMENTARY_EVIDENCE_RETAINED", "PROOF_BUNDLE_RETAINED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Current retained evidence versions remain available for gateway-governed preview or download while the evidence window is lawful.",
    prior_version_posture:
      "Prior versions remain recoverable and queryable for lineage, replay, and accidental overwrite recovery.",
    hold_or_legal_block_posture:
      "Legal hold or statutory block prevents lifecycle delete and requires durable limitation or hold notes.",
    transition_posture:
      "Cold or archive transitions are provider-allowed only when retrieval remains compatible with replay, enquiry, and restore requirements.",
    source_expiry_effect_on_derivatives:
      "If source evidence expires, surviving previews or exports must degrade into explicit limitation or placeholder posture rather than appearing fully evidentiary.",
    source_refs: sourceRefs,
    notes: [
      "The corpus does not publish one canonical duration matrix, so this rule binds the class and limitation behavior explicitly while surfacing the duration gap.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.authority_payload_bodies",
    purpose_ref: "purpose.authority_payload_bodies",
    label: "Authority payload bodies",
    retention_class: "regulated_record",
    retention_tags: ["AUTHORITY_PAYLOAD_RETAINED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Authority payload bodies persist as immutable evidence and ingress lineage anchors.",
    prior_version_posture:
      "Superseded or retried payload versions remain queryable by immutable ref and never collapse onto one mutable blob.",
    hold_or_legal_block_posture:
      "Legal hold and investigation posture override automatic deletion.",
    transition_posture:
      "Archive transitions are allowed only when restore and authority investigation windows remain satisfied.",
    source_expiry_effect_on_derivatives:
      "Any surviving normalized or projected views must point back to limitation or omission notes once payload bodies expire.",
    source_refs: sourceRefs,
    notes: [
      "Authority payload bodies remain evidence, not mutable settlement truth.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.derived_previews",
    purpose_ref: "purpose.derived_previews",
    label: "Derived previews",
    retention_class: "derived_artifact",
    retention_tags: ["DERIVED_PREVIEW_ACTIVE", "DERIVED_PREVIEW_LIMITED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Preview derivatives remain cache-like but still versioned so the gateway can preserve current-versus-history posture explicitly.",
    prior_version_posture:
      "Older preview versions may be trimmed earlier than retained evidence so long as current-versus-history labels and omission notes remain accurate.",
    hold_or_legal_block_posture:
      "Investigative holds preserve preview lineage only when a separate evidence anchor still exists.",
    transition_posture:
      "No archive tier by default; previews are expected to remain fast-access or be deleted once limited or superseded.",
    source_expiry_effect_on_derivatives:
      "When the underlying evidence expires, previews survive only with limitation notes or placeholder posture.",
    source_refs: sourceRefs,
    notes: [
      "Derived previews remain explicitly secondary to retained evidence bodies.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.export_masked",
    purpose_ref: "purpose.export_masked",
    label: "Masked exports",
    retention_class: "derived_artifact",
    retention_tags: ["EXPORT_MASKED_ACTIVE", "EXPORT_MASKED_LIMITED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Masked exports remain current only for the request, route, masking, and delivery-binding window that created them.",
    prior_version_posture:
      "Superseded masked exports remain independently addressable until the export evidence window closes.",
    hold_or_legal_block_posture:
      "Hold prevents deletion but does not widen the allowed audience for the export.",
    transition_posture:
      "Cold transition allowed only after delivery and replay needs are closed.",
    source_expiry_effect_on_derivatives:
      "Masked exports that outlive source evidence must surface retention-limited posture explicitly.",
    source_refs: sourceRefs,
    notes: [
      "Masked and restricted exports never share one object namespace or one lifecycle row.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.export_restricted",
    purpose_ref: "purpose.export_restricted",
    label: "Restricted exports",
    retention_class: "policy_governed_other",
    retention_tags: ["EXPORT_RESTRICTED_ACTIVE", "EXPORT_RESTRICTED_LIMITED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Restricted exports remain step-up-bound, operator-governed artifacts rather than customer-safe downloads.",
    prior_version_posture:
      "Prior restricted exports remain versioned for audit and investigation but never become default delivery targets.",
    hold_or_legal_block_posture:
      "Hold preserves the artifact while keeping access narrow and auditable.",
    transition_posture:
      "Archive allowed only when operator-access expectations and replay windows still remain satisfiable.",
    source_expiry_effect_on_derivatives:
      "Restricted exports must preserve limitation notes if the underlying evidence expires first.",
    source_refs: sourceRefs,
    notes: [
      "The masking variant is a first-class lifecycle dimension, not an annotation on one shared export blob.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.quarantine",
    purpose_ref: "purpose.quarantine",
    label: "Quarantine",
    retention_class: "policy_governed_other",
    retention_tags: ["UPLOAD_QUARANTINED_MALICIOUS", "UPLOAD_POLICY_REJECTED", "UPLOAD_SUSPICIOUS_REVIEW_REQUIRED"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Quarantined current versions remain blocked from preview and download and are retained with typed reason codes.",
    prior_version_posture:
      "Prior quarantined versions remain addressable by immutable ref so false-positive review or manual release never erases history.",
    hold_or_legal_block_posture:
      "Security review or legal hold freezes delete and copy-promote actions.",
    transition_posture:
      "No automatic cold transition before review or release posture is settled.",
    source_expiry_effect_on_derivatives:
      "Quarantine never yields customer-facing derivatives. Release creates a new clean object boundary instead.",
    source_refs: sourceRefs,
    notes: [
      "Release from quarantine is evidence-bound and history-preserving.",
    ],
  },
  {
    lifecycle_ref: "lifecycle.restore_archive",
    purpose_ref: "purpose.restore_archive",
    label: "Restore archive",
    retention_class: "regulated_record",
    retention_tags: ["RESTORE_ARCHIVE_BUNDLE", "RESTORE_DRILL_EVIDENCE"],
    duration_resolution_state: "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    current_version_posture:
      "Restore bundles remain durable evidence for checkpoint and reopen verification.",
    prior_version_posture:
      "Earlier restore bundles remain independently addressable by checkpoint and candidate identity.",
    hold_or_legal_block_posture:
      "Restore evidence remains protected while release or incident review depends on it.",
    transition_posture:
      "Archive-tier storage is allowed when restore timing and evidence retrieval remain within the declared verification window.",
    source_expiry_effect_on_derivatives:
      "Derived restore reports may survive only with limitation notes if the underlying bundle or body ages out.",
    source_refs: sourceRefs,
    notes: [
      "Restore archive purpose exists because the corpus treats restore evidence as admissibility-critical, not operational trivia.",
    ],
  },
];

const eventRouteRows: EventNotificationRoute[] = [
  {
    route_ref: "route.upload_staging.object_finalize_to_scan_request",
    purpose_ref: "purpose.upload_staging",
    label: "Upload finalized -> scan request",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.upload.scan.request",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "event_type", "event_id_or_sequencer"],
    downstream_precondition:
      "Only stable object versions with checksum basis may advance to malware scanning and later validation.",
    source_refs: sourceRefs,
    notes: [
      "Queue or broker resolution stays logical until pc_0052, but dedupe and replay posture are already fixed here.",
    ],
  },
  {
    route_ref: "route.upload_staging.metadata_change_to_validation_recheck",
    purpose_ref: "purpose.upload_staging",
    label: "Upload metadata change -> validation recheck",
    event_types: ["OBJECT_METADATA_UPDATE", "BlobPropertiesUpdated", "s3:ObjectTagging:*"],
    destination_channel_ref: "channel.upload.validation.recheck",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "event_type", "metageneration_or_etag"],
    downstream_precondition:
      "Validation refresh stays version-bound and cannot reuse stale scan or request-binding posture silently.",
    source_refs: sourceRefs,
    notes: [
      "Metadata changes must not silently widen preview or attachment posture.",
    ],
  },
  {
    route_ref: "route.retained_evidence.object_finalize_to_manifest_binding",
    purpose_ref: "purpose.retained_evidence",
    label: "Retained evidence finalized -> manifest binding",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.evidence.manifest.binding",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "event_type", "event_id_or_sequencer"],
    downstream_precondition:
      "Metadata binding updates durable control records; bucket listings themselves never become source of truth.",
    source_refs: sourceRefs,
    notes: [
      "Evidence bodies become addressable via immutable refs only after durable metadata binding lands.",
    ],
  },
  {
    route_ref: "route.authority_payload.object_finalize_to_ingress_normalization",
    purpose_ref: "purpose.authority_payload_bodies",
    label: "Authority payload finalized -> ingress normalization",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.authority.payload.normalization",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "event_type", "event_id_or_sequencer"],
    downstream_precondition:
      "Authority payloads must still checkpoint through governed ingress before any legal-state mutation.",
    source_refs: sourceRefs,
    notes: [
      "Payload body storage and authority truth remain distinct.",
    ],
  },
  {
    route_ref: "route.derived_preview.object_finalize_to_preview_registration",
    purpose_ref: "purpose.derived_previews",
    label: "Derived preview finalized -> preview registration",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.preview.registration",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "artifact_version_ref", "event_type", "event_id_or_sequencer"],
    downstream_precondition:
      "Preview registration must retain current-versus-history and limitation posture from durable truth.",
    source_refs: sourceRefs,
    notes: [
      "Preview derivatives are never lawful direct-download targets by themselves.",
    ],
  },
  {
    route_ref: "route.export_masked.object_finalize_to_delivery_attestation",
    purpose_ref: "purpose.export_masked",
    label: "Masked export finalized -> delivery attestation",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.export.delivery.attestation",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "export_version_ref", "delivery_binding_hash", "event_id_or_sequencer"],
    downstream_precondition:
      "Delivery records must stay bound to the active masking posture and route-specific externalization contract.",
    source_refs: sourceRefs,
    notes: [
      "Masked exports and restricted exports are attested separately.",
    ],
  },
  {
    route_ref: "route.export_restricted.object_finalize_to_operator_delivery_attestation",
    purpose_ref: "purpose.export_restricted",
    label: "Restricted export finalized -> operator delivery attestation",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.export.delivery.attestation.restricted",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "export_version_ref", "delivery_binding_hash", "event_id_or_sequencer"],
    downstream_precondition:
      "Restricted export delivery remains operator-step-up-bound and cannot reuse masked-export receipts.",
    source_refs: sourceRefs,
    notes: [
      "Restricted export delivery remains distinct from customer-safe externalization.",
    ],
  },
  {
    route_ref: "route.quarantine.object_finalize_to_quarantine_audit",
    purpose_ref: "purpose.quarantine",
    label: "Quarantine object finalized -> quarantine audit",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.quarantine.audit",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "quarantine_event_ref", "event_id_or_sequencer"],
    downstream_precondition:
      "Quarantine state must remain durable and history-preserving before any release or replacement workflow continues.",
    source_refs: sourceRefs,
    notes: [
      "Quarantine copy/promote workflows keep the original quarantined version immutable.",
    ],
  },
  {
    route_ref: "route.restore_archive.object_finalize_to_restore_index",
    purpose_ref: "purpose.restore_archive",
    label: "Restore archive finalized -> restore index",
    event_types: ["OBJECT_FINALIZE", "BlobCreated", "s3:ObjectCreated:*"],
    destination_channel_ref: "channel.restore.archive.index",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: [
      "bucket_name",
      "object_key",
      "artifact_version_ref",
      "checkpoint_ref",
      "candidate_identity_hash",
      "event_id_or_sequencer",
    ],
    downstream_precondition:
      "Restore bundles must bind to restore checkpoints and candidate identity before they count as admissible evidence.",
    source_refs: sourceRefs,
    notes: [
      "Restore archive indexing is evidence-supporting and remains non-authoritative for reopen by itself.",
    ],
  },
  {
    route_ref: "route.all_purposes.lifecycle_or_delete_to_retention_law",
    purpose_ref: "purpose.retained_evidence",
    label: "Lifecycle or delete -> retention law audit",
    event_types: ["OBJECT_DELETE", "OBJECT_ARCHIVE", "BlobDeleted", "s3:LifecycleExpiration:*"],
    destination_channel_ref: "channel.retention.limitation.audit",
    delivery_posture: "AT_LEAST_ONCE",
    ordering_posture: "OUT_OF_ORDER_POSSIBLE",
    dedupe_fields: ["bucket_name", "object_key", "object_version_ref", "event_type", "event_id_or_sequencer"],
    downstream_precondition:
      "Lifecycle and deletion events must update limitation or omission posture rather than silently making surviving derivatives look authoritative.",
    source_refs: sourceRefs,
    notes: [
      "This route is logical and cross-purpose even though it is anchored here for the topology board.",
    ],
  },
];

const quarantineRuleRows: QuarantineIsolationRule[] = [
  {
    rule_ref: "quarantine.customer_portal_no_preview_or_download",
    subject_class: "CUSTOMER_PORTAL",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: [
      "upload_session_id",
      "customer_safe_status",
      "customer_safe_reason_code",
      "replacement_guidance",
    ],
    release_mode: "NOT_APPLICABLE",
    lineage_requirements: ["upload_session_id", "object_version_ref", "quarantine_event_ref"],
    source_refs: sourceRefs,
    notes: [
      "Customers see safe status and next action only; the object body never becomes previewable or directly downloadable from quarantine.",
    ],
  },
  {
    rule_ref: "quarantine.default_operator_workspace_metadata_only",
    subject_class: "DEFAULT_OPERATOR_WORKSPACE",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: [
      "tenant_id",
      "client_id",
      "upload_session_id",
      "scan_state",
      "hazard_code",
      "retention_tag",
    ],
    release_mode: "NOT_APPLICABLE",
    lineage_requirements: ["object_version_ref", "scan_result_receipt_ref"],
    source_refs: sourceRefs,
    notes: [
      "Default operator views remain metadata-first and do not bypass dedicated security review posture.",
    ],
  },
  {
    rule_ref: "quarantine.security_ops_controlled_review",
    subject_class: "SECURITY_OPERATIONS_REVIEW",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: [
      "tenant_id",
      "client_id",
      "upload_session_id",
      "quarantine_reason_codes",
      "signature_epoch_ref",
      "evidence_bundle_ref",
    ],
    release_mode: "NOT_APPLICABLE",
    lineage_requirements: ["object_version_ref", "quarantine_event_ref", "signature_epoch_ref"],
    source_refs: sourceRefs,
    notes: [
      "Security review uses controlled tooling and evidence packs; it is not a generic file-open path.",
    ],
  },
  {
    rule_ref: "quarantine.extraction_blocked",
    subject_class: "EXTRACTION_WORKER",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: ["object_version_ref", "scan_state", "quarantine_state"],
    release_mode: "NOT_APPLICABLE",
    lineage_requirements: ["object_version_ref", "scan_state"],
    source_refs: sourceRefs,
    notes: [
      "OCR or downstream extraction may not start from quarantine or pending scan posture.",
    ],
  },
  {
    rule_ref: "quarantine.export_blocked",
    subject_class: "EXPORT_WORKER",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: ["object_version_ref", "quarantine_state", "release_required"],
    release_mode: "NOT_APPLICABLE",
    lineage_requirements: ["object_version_ref", "quarantine_event_ref"],
    source_refs: sourceRefs,
    notes: [
      "Exports cannot be produced directly from quarantined bodies.",
    ],
  },
  {
    rule_ref: "quarantine.release_copy_promote_only",
    subject_class: "QUARANTINE_RELEASE_WORKFLOW",
    preview_allowed: false,
    download_allowed: false,
    direct_url_allowed: false,
    visible_metadata_fields: [
      "quarantine_event_ref",
      "release_decision_attestation_ref",
      "new_clean_object_ref_or_null",
    ],
    release_mode:
      "COPY_PROMOTE_WITH_NEW_CLEAN_OBJECT_VERSION_AND_HISTORY_RETAINED",
    lineage_requirements: [
      "quarantine_event_ref",
      "object_version_ref",
      "release_decision_attestation_ref",
      "new_clean_object_version_ref",
    ],
    source_refs: sourceRefs,
    notes: [
      "Release creates a new clean object boundary and preserves the quarantined source intact for audit and false-positive review.",
    ],
  },
];

const keyFamilyRows: ObjectKeyNamingRow[] = [
  {
    key_family_ref: "key_family.upload_staging_body",
    purpose_ref: "purpose.upload_staging",
    artifact_family_label: "Upload staging body",
    key_template:
      "tenant/{tenant_id}/client/{client_id}/request/{request_id}/request-version/{request_version_ref}/upload-session/{upload_session_id}/object-version/{object_version_ref}/sha256/{content_sha256}/source-body",
    required_dimensions: [
      "tenant_id",
      "client_id",
      "request_id",
      "request_version_ref",
      "upload_session_id",
      "object_version_ref",
      "content_sha256",
    ],
    version_identity_dimensions: ["upload_session_id", "object_version_ref", "content_sha256"],
    forbidden_shortcuts: ["friendly_filename_only", "request_label_only", "latest/"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Multipart or resumable uploads must still converge on one immutable object-version ref rather than overwriting a generic staging key in place.",
    ],
  },
  {
    key_family_ref: "key_family.upload_part_manifest",
    purpose_ref: "purpose.upload_staging",
    artifact_family_label: "Upload part manifest",
    key_template:
      "tenant/{tenant_id}/client/{client_id}/request/{request_id}/upload-session/{upload_session_id}/transfer-attempt/{transfer_attempt_ref}/part-manifest-version/{part_manifest_version_ref}.json",
    required_dimensions: [
      "tenant_id",
      "client_id",
      "request_id",
      "upload_session_id",
      "transfer_attempt_ref",
      "part_manifest_version_ref",
    ],
    version_identity_dimensions: [
      "transfer_attempt_ref",
      "part_manifest_version_ref",
    ],
    forbidden_shortcuts: ["friendly_filename_only", "chunk_{n}_without_session"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Transfer-part lineage remains separate from the final stable object version.",
    ],
  },
  {
    key_family_ref: "key_family.retained_evidence_body",
    purpose_ref: "purpose.retained_evidence",
    artifact_family_label: "Retained evidence body",
    key_template:
      "tenant/{tenant_id}/manifest/{manifest_id}/evidence-item/{evidence_item_id}/artifact-version/{artifact_version_ref}/sha256/{content_sha256}/body",
    required_dimensions: [
      "tenant_id",
      "manifest_id",
      "evidence_item_id",
      "artifact_version_ref",
      "content_sha256",
    ],
    version_identity_dimensions: ["evidence_item_id", "artifact_version_ref", "content_sha256"],
    forbidden_shortcuts: ["document-name-only", "current/"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Evidence refs stay immutable and later database records point to these exact bodies by versioned ref.",
    ],
  },
  {
    key_family_ref: "key_family.authority_payload_body",
    purpose_ref: "purpose.authority_payload_bodies",
    artifact_family_label: "Authority payload body",
    key_template:
      "tenant/{tenant_id}/manifest/{manifest_id}/authority-interaction/{authority_interaction_id}/payload-kind/{payload_kind}/payload-version/{payload_version_ref}/sha256/{content_sha256}",
    required_dimensions: [
      "tenant_id",
      "manifest_id",
      "authority_interaction_id",
      "payload_kind",
      "payload_version_ref",
      "content_sha256",
    ],
    version_identity_dimensions: ["authority_interaction_id", "payload_version_ref", "content_sha256"],
    forbidden_shortcuts: ["provider-message-id-only", "latest/"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Authority payload bodies remain immutable ingress evidence anchors.",
    ],
  },
  {
    key_family_ref: "key_family.derived_preview",
    purpose_ref: "purpose.derived_previews",
    artifact_family_label: "Derived preview artifact",
    key_template:
      "tenant/{tenant_id}/evidence-item/{evidence_item_id}/source-version/{source_artifact_version_ref}/preview-family/{preview_family}/derivation-run/{derivation_run_ref}/artifact-version/{artifact_version_ref}",
    required_dimensions: [
      "tenant_id",
      "evidence_item_id",
      "source_artifact_version_ref",
      "preview_family",
      "derivation_run_ref",
      "artifact_version_ref",
    ],
    version_identity_dimensions: [
      "source_artifact_version_ref",
      "derivation_run_ref",
      "artifact_version_ref",
    ],
    forbidden_shortcuts: ["preview/{document_name}", "latest/"],
    preview_or_masking_dimension_or_null: "preview_family",
    source_refs: sourceRefs,
    notes: [
      "Preview families stay explicit so same-shell preview and history posture never drift silently.",
    ],
  },
  {
    key_family_ref: "key_family.export_masked_bundle",
    purpose_ref: "purpose.export_masked",
    artifact_family_label: "Masked export bundle",
    key_template:
      "tenant/{tenant_id}/manifest/{manifest_id}/export-request/{export_request_id}/masking/{masking_posture}/delivery-binding/{delivery_binding_hash}/export-version/{artifact_version_ref}",
    required_dimensions: [
      "tenant_id",
      "manifest_id",
      "export_request_id",
      "masking_posture",
      "delivery_binding_hash",
      "artifact_version_ref",
    ],
    version_identity_dimensions: [
      "export_request_id",
      "delivery_binding_hash",
      "artifact_version_ref",
    ],
    forbidden_shortcuts: ["export/{manifest_id}", "masked-or-unmasked-implicit"],
    preview_or_masking_dimension_or_null: "masking_posture",
    source_refs: sourceRefs,
    notes: [
      "Masked and restricted exports stay distinct by both purpose and key template.",
    ],
  },
  {
    key_family_ref: "key_family.export_restricted_bundle",
    purpose_ref: "purpose.export_restricted",
    artifact_family_label: "Restricted export bundle",
    key_template:
      "tenant/{tenant_id}/manifest/{manifest_id}/export-request/{export_request_id}/masking/{masking_posture}/step-up/{step_up_binding_ref}/export-version/{artifact_version_ref}",
    required_dimensions: [
      "tenant_id",
      "manifest_id",
      "export_request_id",
      "masking_posture",
      "step_up_binding_ref",
      "artifact_version_ref",
    ],
    version_identity_dimensions: [
      "export_request_id",
      "step_up_binding_ref",
      "artifact_version_ref",
    ],
    forbidden_shortcuts: ["export/{manifest_id}", "masked-or-unmasked-implicit"],
    preview_or_masking_dimension_or_null: "masking_posture",
    source_refs: sourceRefs,
    notes: [
      "Restricted exports remain step-up-bound and cannot reuse the masked-export path.",
    ],
  },
  {
    key_family_ref: "key_family.quarantine_body",
    purpose_ref: "purpose.quarantine",
    artifact_family_label: "Quarantine body",
    key_template:
      "tenant/{tenant_id}/upload-session/{upload_session_id}/source-version/{source_object_version_ref}/quarantine-event/{quarantine_event_ref}/hazard/{hazard_code}/artifact-version/{artifact_version_ref}",
    required_dimensions: [
      "tenant_id",
      "upload_session_id",
      "source_object_version_ref",
      "quarantine_event_ref",
      "hazard_code",
      "artifact_version_ref",
    ],
    version_identity_dimensions: [
      "source_object_version_ref",
      "quarantine_event_ref",
      "artifact_version_ref",
    ],
    forbidden_shortcuts: ["quarantine/{filename}", "clean-or-quarantine-shared-path"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Quarantine uses a new immutable path and release creates a separate clean path later.",
    ],
  },
  {
    key_family_ref: "key_family.restore_archive_bundle",
    purpose_ref: "purpose.restore_archive",
    artifact_family_label: "Restore archive bundle",
    key_template:
      "environment/{environment_ref}/checkpoint/{recovery_checkpoint_id}/candidate/{candidate_identity_hash}/bundle/{bundle_kind}/bundle-version/{artifact_version_ref}",
    required_dimensions: [
      "environment_ref",
      "recovery_checkpoint_id",
      "candidate_identity_hash",
      "bundle_kind",
      "artifact_version_ref",
    ],
    version_identity_dimensions: [
      "recovery_checkpoint_id",
      "candidate_identity_hash",
      "artifact_version_ref",
    ],
    forbidden_shortcuts: ["restore/latest", "bundle_kind_only"],
    preview_or_masking_dimension_or_null: null,
    source_refs: sourceRefs,
    notes: [
      "Restore evidence must stay candidate-bound and checkpoint-bound for admissibility.",
    ],
  },
];

const bucketInstances: BucketInstanceRow[] = environmentRows.flatMap((environmentRow) =>
  purposeRows.map((purposeRow) => ({
    bucket_ref: `bucket.${environmentRow.environment_ref}.${purposeRow.purpose_ref.split(".")[1]}`,
    environment_ref: environmentRow.environment_ref,
    purpose_ref: purposeRow.purpose_ref,
    zone_ref: purposeRow.zone_ref,
    bucket_name: `${environmentRow.bucket_prefix}-${purposeRow.bucket_suffix}`,
    versioning_state: purposeRow.versioning_state,
    encryption_posture: purposeRow.encryption_posture,
    public_access_state: purposeRow.public_access_state,
    direct_download_posture: purposeRow.direct_download_posture,
    preview_posture: purposeRow.preview_posture,
    retention_profile_ref: purposeRow.retention_profile_ref,
    event_profile_ref: purposeRow.event_profile_ref,
    source_refs: sourceRefs,
    notes: [
      `Canonical namespace for ${purposeRow.label.toLowerCase()} in ${environmentRow.label.toLowerCase()}.`,
      ...purposeRow.notes,
    ],
  })),
);

export function createBucketPurposeMatrix(
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): BucketPurposeMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "object_storage_bucket_purpose_matrix",
    selection_status: selectionStatus,
    managed_default_status: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    namespace_strategy: "ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE",
    purpose_rows: purposeRows,
    source_refs: sourceRefs,
    typed_gaps: [
      "CLOUD_PROVIDER_ACCOUNT_AND_REGION_IDS_REMAIN_UNRESOLVED_UNTIL_PLATFORM_SELECTION",
      "PER_ARTIFACT_DURATION_MATRIX_REMAINS_SOURCE_GAP_AND_IS_NOT_INVENTED_HERE",
    ],
  };
}

export function createObjectKeyNamingContract(
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): ObjectKeyNamingContract {
  return {
    schema_version: "1.0",
    contract_id: "object_key_naming_contract",
    selection_status: selectionStatus,
    namespace_strategy: "ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE",
    key_family_rows: keyFamilyRows,
    source_refs: sourceRefs,
    typed_gaps: [
      "PROVIDER_SPECIFIC_VERSION_ID_FIELDS_DEFERRED_UNTIL_PLATFORM_SELECTION",
    ],
    notes: [
      "Immutable database refs point to purpose bucket plus object key plus provider version or generation metadata; bucket listings never become source of truth.",
      "Masked and restricted exports use distinct key families so delivery posture cannot drift silently.",
    ],
  };
}

export function createLifecycleRetentionPolicy(
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): LifecycleRetentionPolicy {
  return {
    schema_version: "1.0",
    policy_id: "object_storage_lifecycle_retention_policy",
    selection_status: selectionStatus,
    namespace_strategy: "ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE",
    lifecycle_rows: lifecycleRows,
    source_refs: sourceRefs,
    typed_gaps: [
      "CANONICAL_DURATION_WINDOWS_NOT_PUBLISHED_BY_CORPUS",
      "PROVIDER_SPECIFIC_COLD_ARCHIVE_CLASS_NAMES_DEFERRED_UNTIL_PLATFORM_SELECTION",
    ],
    notes: [
      "Retention classes and limitation behavior are fixed now even though exact age-based durations remain a published source gap.",
      "Lifecycle transitions remain subordinate to legal hold, privacy reconciliation, and restore admissibility.",
    ],
  };
}

export function createEventNotificationContract(
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): EventNotificationContract {
  return {
    schema_version: "1.0",
    contract_id: "object_storage_event_notification_contract",
    selection_status: selectionStatus,
    route_rows: eventRouteRows,
    source_refs: sourceRefs,
    typed_gaps: [
      "DESTINATION_CHANNELS_REMAIN_LOGICAL_UNTIL_QUEUE_AND_BROKER_PROVISIONING",
    ],
    notes: [
      "Event routes assume at-least-once and out-of-order delivery regardless of provider. Downstream workers must dedupe on object identity plus event identity.",
    ],
  };
}

export function createQuarantineIsolationPolicy(
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): QuarantineIsolationPolicy {
  return {
    schema_version: "1.0",
    policy_id: "object_storage_quarantine_isolation_policy",
    selection_status: selectionStatus,
    quarantine_purpose_ref: "purpose.quarantine",
    truth_boundary_statement:
      "Quarantined objects never become previewable, downloadable, exportable, or extraction-eligible merely because bytes exist in object storage. Release creates a new clean object boundary and preserves the quarantined lineage in place.",
    rule_rows: quarantineRuleRows,
    source_refs: sourceRefs,
    typed_gaps: [
      "SECURITY_REVIEW_TOOLING_AND_STEP_UP_PROVIDER_BINDINGS_DEFERRED_UNTIL_LATER_RUNTIME_WORK",
    ],
    notes: [
      "Quarantine release uses copy/promote semantics with explicit attestation and a new clean object version.",
      "Customer-safe status may remain visible while content access remains blocked.",
    ],
  };
}

export function createObjectStorageInventoryTemplate(
  runContext: MinimalRunContext = {
    runId: "run-template-object-storage-001",
    workspaceId: "wk-template-object-storage",
    operatorIdentityAlias: "ops.storage.template",
  },
  selectionStatus: ObjectStorageSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  selectedProviderFamily: ObjectStorageProviderFamily | null = null,
): ObjectStorageInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "object_storage_inventory",
    provider_id: OBJECT_STORAGE_PROVIDER_ID,
    flow_id: OBJECT_STORAGE_FLOW_ID,
    policy_version: OBJECT_STORAGE_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: selectionStatus,
    managed_default_status: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    selected_provider_family_or_null: selectedProviderFamily,
    namespace_strategy: "ENVIRONMENT_SCOPED_BUCKET_SET_PER_PURPOSE",
    provider_option_rows: providerOptionRows,
    environment_rows: environmentRows,
    bucket_rows: bucketInstances,
    bucket_purpose_matrix_ref: "config/object_storage/bucket_purpose_matrix.json",
    object_key_naming_contract_ref:
      "config/object_storage/object_key_naming_contract.json",
    lifecycle_retention_policy_ref:
      "config/object_storage/lifecycle_retention_policy.json",
    event_notification_contract_ref:
      "config/object_storage/event_notification_contract.json",
    quarantine_isolation_policy_ref:
      "config/object_storage/quarantine_isolation_policy.json",
    source_refs: sourceRefs,
    typed_gaps: [
      "OBJECT_STORE_PROVIDER_ACCOUNT_PROJECT_AND_REGION_IDS_REMAIN_UNRESOLVED",
      "QUEUE_DESTINATION_BINDINGS_FOR_EVENT_ROUTES_WAIT_ON_PC_0052",
    ],
    notes: [
      "Object storage remains an immutable-body substrate. Durable object refs stay in the control store; bucket contents and direct URLs are never legal currentness.",
      "Environment prefixes are fixed now to stop later code from inventing bucket names ad hoc.",
    ],
    last_verified_at: OBJECT_STORAGE_LAST_VERIFIED_AT,
  };
}

export function createStorageBucketTopologyBoardViewModel(): StorageBucketTopologyBoardViewModel {
  const lifecyclePolicy = createLifecycleRetentionPolicy();
  const eventContract = createEventNotificationContract();
  const inventory = createObjectStorageInventoryTemplate();

  return {
    providerDisplayName: "Object storage topology",
    providerMonogram: "OBJ",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    isolationPostureLabel: "Environment-scoped buckets / immutable refs / quarantine hard boundary",
    policyVersion: OBJECT_STORAGE_POLICY_VERSION,
    summary:
      "Taxat's object-storage substrate is fixed as environment-separated purpose buckets with immutable refs, versioned recovery posture, quarantine isolation, masked-vs-restricted export separation, and logical event routes that remain broker-agnostic until the queue layer is provisioned.",
    notes: [
      "Bucket listings and direct object URLs never define truth, currentness, or admissibility.",
      "Quarantine release uses copy/promote semantics with history retained.",
      "Lifecycle classes are fixed now even though exact day-count durations remain a source gap.",
    ],
    environments: environmentRows.map((row) => ({
      environment_ref: row.environment_ref,
      label: row.label,
      bucket_prefix: row.bucket_prefix,
      residency_class: row.residency_class,
    })),
    buckets: inventory.bucket_rows.map((row) => {
      const purpose = purposeRows.find((candidate) => candidate.purpose_ref === row.purpose_ref);
      return {
        bucket_ref: row.bucket_ref,
        environment_ref: row.environment_ref,
        purpose_ref: row.purpose_ref,
        zone_ref: row.zone_ref,
        label: purpose?.label ?? row.purpose_ref,
        bucket_name: row.bucket_name,
        versioning_state: row.versioning_state,
        direct_download_posture: row.direct_download_posture,
        preview_posture: row.preview_posture,
        lifecycle_ref: row.retention_profile_ref,
        event_profile_ref: row.event_profile_ref,
        notes: row.notes,
      };
    }),
    keyFamilies: keyFamilyRows.map((row) => ({
      key_family_ref: row.key_family_ref,
      purpose_ref: row.purpose_ref,
      artifact_family_label: row.artifact_family_label,
      key_template: row.key_template,
      required_dimensions: row.required_dimensions,
      notes: row.notes,
    })),
    lifecycleRules: lifecyclePolicy.lifecycle_rows.map((row) => ({
      lifecycle_ref: row.lifecycle_ref,
      purpose_ref: row.purpose_ref,
      label: row.label,
      retention_class: row.retention_class,
      retention_tags: row.retention_tags,
      note: row.notes[0] ?? row.current_version_posture,
    })),
    eventRoutes: eventContract.route_rows.map((row) => ({
      route_ref: row.route_ref,
      purpose_ref: row.purpose_ref,
      label: row.label,
      event_types: row.event_types,
      destination_channel_ref: row.destination_channel_ref,
      dedupe_fields: row.dedupe_fields,
      note: row.notes[0] ?? row.downstream_precondition,
    })),
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedBucketRef: "bucket.env_preproduction_verification.upload_staging",
    selectedLifecycleRef: "lifecycle.retained_evidence",
    selectedEventRef: "route.upload_staging.object_finalize_to_scan_request",
  };
}

export function validateBucketPurposeMatrix(
  matrix = createBucketPurposeMatrix(),
): void {
  const purposeRefs = new Set<string>();
  for (const row of matrix.purpose_rows) {
    if (purposeRefs.has(row.purpose_ref)) {
      throw new Error(`Duplicate purpose ref detected: ${row.purpose_ref}`);
    }
    purposeRefs.add(row.purpose_ref);
    if (!lifecycleRows.some((candidate) => candidate.lifecycle_ref === row.retention_profile_ref)) {
      throw new Error(
        `Purpose row ${row.purpose_ref} references missing lifecycle ${row.retention_profile_ref}.`,
      );
    }
    if (!eventRouteRows.some((candidate) => candidate.purpose_ref === row.purpose_ref)) {
      throw new Error(
        `Purpose row ${row.purpose_ref} is missing an event route binding.`,
      );
    }
  }
  if (!matrix.purpose_rows.some((row) => row.purpose_ref === "purpose.quarantine")) {
    throw new Error("Quarantine purpose row is missing.");
  }
}

export function validateObjectKeyNamingContract(
  contract = createObjectKeyNamingContract(),
): void {
  const familyRefs = new Set<string>();
  for (const row of contract.key_family_rows) {
    if (familyRefs.has(row.key_family_ref)) {
      throw new Error(`Duplicate key family ref detected: ${row.key_family_ref}`);
    }
    familyRefs.add(row.key_family_ref);
    if (!row.key_template.includes("/{") || !row.key_template.includes("}/")) {
      throw new Error(`Key template is not parameterized: ${row.key_family_ref}`);
    }
    if (!row.required_dimensions.some((dimension) => dimension.includes("version"))) {
      throw new Error(`Key family lacks explicit version dimension: ${row.key_family_ref}`);
    }
  }
  const coveredPurposeRefs = new Set(
    contract.key_family_rows.map((row) => row.purpose_ref),
  );
  for (const purposeRef of purposeRows.map((row) => row.purpose_ref)) {
    if (!coveredPurposeRefs.has(purposeRef)) {
      throw new Error(`Key naming contract does not cover purpose ${purposeRef}.`);
    }
  }

  const masked = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.export_masked_bundle",
  );
  const restricted = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.export_restricted_bundle",
  );
  if (!masked || !restricted || masked.key_template === restricted.key_template) {
    throw new Error("Masked and restricted export key templates must stay distinct.");
  }
}

export function validateLifecycleRetentionPolicy(
  policy = createLifecycleRetentionPolicy(),
): void {
  const coveredPurposeRefs = new Set(policy.lifecycle_rows.map((row) => row.purpose_ref));
  for (const purposeRef of purposeRows.map((row) => row.purpose_ref)) {
    if (!coveredPurposeRefs.has(purposeRef)) {
      throw new Error(`Lifecycle policy does not cover purpose ${purposeRef}.`);
    }
  }
  if (
    !policy.lifecycle_rows.every(
      (row) => row.duration_resolution_state === "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    )
  ) {
    throw new Error("Lifecycle rows must preserve the canonical-duration source gap.");
  }
}

export function validateEventNotificationContract(
  contract = createEventNotificationContract(),
): void {
  if (
    !contract.route_rows.every(
      (row) =>
        row.delivery_posture === "AT_LEAST_ONCE" &&
        row.ordering_posture === "OUT_OF_ORDER_POSSIBLE",
    )
  ) {
    throw new Error("Event routes must remain at-least-once and out-of-order safe.");
  }
  if (
    !contract.route_rows.every((row) =>
      row.dedupe_fields.some((field) => field.includes("version")),
    )
  ) {
    throw new Error("Every route must dedupe using an object-version-like field.");
  }
  const coveredPurposeRefs = new Set(
    contract.route_rows.map((row) => row.purpose_ref),
  );
  for (const purposeRef of purposeRows.map((row) => row.purpose_ref)) {
    if (!coveredPurposeRefs.has(purposeRef)) {
      throw new Error(`Event notification contract does not cover purpose ${purposeRef}.`);
    }
  }
}

export function validateQuarantineIsolationPolicy(
  policy = createQuarantineIsolationPolicy(),
): void {
  if (
    !policy.rule_rows.every(
      (row) =>
        row.preview_allowed === false &&
        row.download_allowed === false &&
        row.direct_url_allowed === false,
    )
  ) {
    throw new Error("Quarantine policy must keep preview/download/direct URL blocked.");
  }
  if (
    !policy.rule_rows.some(
      (row) =>
        row.release_mode ===
        "COPY_PROMOTE_WITH_NEW_CLEAN_OBJECT_VERSION_AND_HISTORY_RETAINED",
    )
  ) {
    throw new Error("Quarantine release must use copy/promote semantics.");
  }
}

function stableInventoryComparable(
  inventory: ObjectStorageInventoryTemplate,
): Omit<
  ObjectStorageInventoryTemplate,
  "run_id" | "workspace_id" | "operator_identity_alias"
> {
  const {
    run_id: _runId,
    workspace_id: _workspaceId,
    operator_identity_alias: _operatorIdentityAlias,
    ...rest
  } = inventory;
  return rest;
}

export async function provisionBucketsForEvidenceArtifactsExportsAndQuarantine(
  options: {
    runContext: MinimalRunContext;
    inventoryPath: string;
    existingInventoryPath?: string;
    providerFamilySelection?: ObjectStorageProviderFamily | null;
  },
): Promise<ProvisionObjectStorageResult> {
  const selectionStatus: ObjectStorageSelectionStatus =
    options.providerFamilySelection ? "PROVIDER_SELECTED" : "PROVIDER_SELECTION_REQUIRED";

  const bucketPurposeMatrix = createBucketPurposeMatrix(selectionStatus);
  const objectKeyNamingContract = createObjectKeyNamingContract(selectionStatus);
  const lifecycleRetentionPolicy = createLifecycleRetentionPolicy(selectionStatus);
  const eventNotificationContract = createEventNotificationContract(selectionStatus);
  const quarantineIsolationPolicy = createQuarantineIsolationPolicy(selectionStatus);

  validateBucketPurposeMatrix(bucketPurposeMatrix);
  validateObjectKeyNamingContract(objectKeyNamingContract);
  validateLifecycleRetentionPolicy(lifecycleRetentionPolicy);
  validateEventNotificationContract(eventNotificationContract);
  validateQuarantineIsolationPolicy(quarantineIsolationPolicy);

  const inventory = createObjectStorageInventoryTemplate(
    options.runContext,
    selectionStatus,
    options.providerFamilySelection ?? null,
  );

  let adoptionStep: ProvisionObjectStorageStep = {
    step_id: "object-storage.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized topology record will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as ObjectStorageInventoryTemplate;
      const currentComparable = stableInventoryComparable(inventory);
      const existingComparable = stableInventoryComparable({
        ...inventory,
        ...existingInventory,
      });
      if (JSON.stringify(currentComparable) !== JSON.stringify(existingComparable)) {
        return {
          outcome: "OBJECT_STORAGE_TOPOLOGY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          inventory,
          bucketPurposeMatrix,
          objectKeyNamingContract,
          lifecycleRetentionPolicy,
          eventNotificationContract,
          quarantineIsolationPolicy,
          boardViewModel: createStorageBucketTopologyBoardViewModel(),
          steps: [
            {
              step_id: "object-storage.resolve-provider-selection",
              title: "Resolve object-storage provider family",
              status: options.providerFamilySelection
                ? "SUCCEEDED"
                : "BLOCKED_BY_POLICY",
              reason: options.providerFamilySelection
                ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
                : "Provider family remains unresolved and the flow stays in portable blocked-contract mode.",
            },
            {
              step_id: "object-storage.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing inventory differs from the frozen object-storage topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "object-storage.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "object-storage.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized topology record will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  const steps: ProvisionObjectStorageStep[] = [
    {
      step_id: "object-storage.resolve-provider-selection",
      title: "Resolve object-storage provider family",
      status: options.providerFamilySelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.providerFamilySelection
        ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
        : "The dependency register still marks object storage as a procurement or platform choice, so provider-specific mechanics remain blocked.",
    },
    {
      step_id: "object-storage.freeze-purpose-bucket-topology",
      title: "Freeze purpose bucket topology",
      status: "SUCCEEDED",
      reason:
        "Environment-separated purpose buckets for upload staging, retained evidence, derived previews, exports, quarantine, authority payloads, and restore archive were materialized.",
    },
    {
      step_id: "object-storage.freeze-key-naming-contract",
      title: "Freeze object key naming contract",
      status: "SUCCEEDED",
      reason:
        "Immutable key families now encode upload-session, evidence, masking, export, and restore lineage directly in the path contract.",
    },
    {
      step_id: "object-storage.freeze-lifecycle-and-retention-policy",
      title: "Freeze lifecycle and retention policy",
      status: "SUCCEEDED",
      reason:
        "Retention classes, limitation behavior, legal-hold posture, and lifecycle gap markers are machine-readable for every purpose bucket.",
    },
    {
      step_id: "object-storage.freeze-event-and-quarantine-policy",
      title: "Freeze event and quarantine policy",
      status: "SUCCEEDED",
      reason:
        "Event routes, dedupe posture, quarantine isolation, and copy-promote release semantics are fixed before broker implementation.",
    },
    adoptionStep,
    {
      step_id: "object-storage.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason:
        "Sanitized inventory persisted with bucket names, purpose refs, lifecycle bindings, and logical channel refs only.",
    },
  ];

  return {
    outcome: options.providerFamilySelection
      ? "OBJECT_STORAGE_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "OBJECT_STORAGE_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    inventory,
    bucketPurposeMatrix,
    objectKeyNamingContract,
    lifecycleRetentionPolicy,
    eventNotificationContract,
    quarantineIsolationPolicy,
    boardViewModel: createStorageBucketTopologyBoardViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const bucketPurposeMatrix = createBucketPurposeMatrix();
  const objectKeyNamingContract = createObjectKeyNamingContract();
  const lifecycleRetentionPolicy = createLifecycleRetentionPolicy();
  const eventNotificationContract = createEventNotificationContract();
  const quarantineIsolationPolicy = createQuarantineIsolationPolicy();
  const inventory = createObjectStorageInventoryTemplate();
  const boardViewModel = createStorageBucketTopologyBoardViewModel();

  const writes: Array<[string, unknown]> = [
    ["config/object_storage/bucket_purpose_matrix.json", bucketPurposeMatrix],
    ["config/object_storage/object_key_naming_contract.json", objectKeyNamingContract],
    ["config/object_storage/lifecycle_retention_policy.json", lifecycleRetentionPolicy],
    ["config/object_storage/event_notification_contract.json", eventNotificationContract],
    ["config/object_storage/quarantine_isolation_policy.json", quarantineIsolationPolicy],
    ["data/provisioning/object_storage_inventory.template.json", inventory],
  ];

  for (const [relativePath, payload] of writes) {
    const target = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  const sampleRunPath = path.join(
    repoRoot,
    "automation/provisioning/report_viewer/data/sample_run.json",
  );
  const sampleRun = JSON.parse(await readFile(sampleRunPath, "utf8")) as Record<
    string,
    unknown
  >;
  sampleRun.storageBucketTopologyBoard = boardViewModel;
  await writeFile(sampleRunPath, `${JSON.stringify(sampleRun, null, 2)}\n`, "utf8");
}

async function main() {
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const selfPath = fileURLToPath(import.meta.url);
  if (invokedPath !== selfPath) {
    return;
  }

  if (process.argv.includes("--emit")) {
    const repoRoot = path.resolve(path.dirname(selfPath), "..", "..", "..");
    await emitCheckedInArtifacts(repoRoot);
  }
}

await main();
