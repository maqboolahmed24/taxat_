import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TELEMETRY_PROVIDER_ID = "opentelemetry-collection-and-backends";
export const TELEMETRY_FLOW_ID = "provision-otel-collection-and-backends";
export const TELEMETRY_POLICY_VERSION = "1.0";
export const TELEMETRY_LAST_VERIFIED_AT = "2026-04-18T22:45:00Z";

export type TelemetryProviderFamily =
  | "SELF_HOSTED_LGTM_COLLECTOR_STACK"
  | "PLATFORM_NATIVE_OTLP_BACKENDS"
  | "MANAGED_OTLP_SEARCH_AND_METRIC_STACK";

export type TelemetrySelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_SELECTED";

export type TelemetryManagedDefaultStatus =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "READY_TO_ADOPT_PLATFORM_TELEMETRY_BACKENDS";

export type TelemetryTopologyMode =
  "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS";

export type ProviderOptionSelectionState =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "SELF_HOST_DECISION_REQUIRED";

export type BackendBindingState =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "ADOPTED_EXISTING";

export type SignalFamilyRef =
  | "TRACES"
  | "METRICS"
  | "LOGS"
  | "SECURITY"
  | "PRIVACY"
  | "AUDIT_LINKS";

export type CollectorTierKind =
  | "SDK_DIRECT"
  | "WORKLOAD_AGENT"
  | "ENVIRONMENT_GATEWAY"
  | "EXPORT_BRIDGE";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  provider_family: TelemetryProviderFamily;
  selection_state: ProviderOptionSelectionState;
  provider_label: string;
  docs_urls: string[];
  topology_summary: string;
  backend_summary: string;
  privacy_summary: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentTelemetryRow {
  environment_ref: string;
  label: string;
  collector_namespace_prefix: string;
  environment_gateway_alias: string;
  provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  authority_lane_posture:
    | "NONE"
    | "SANDBOX_WEB_DESKTOP_BATCH"
    | "PREPROD_SANDBOX_WEB_DESKTOP_BATCH"
    | "LIVE_WEB_DESKTOP_BATCH"
    | "DRILL_DISABLED_BY_DEFAULT";
  release_debug_posture:
    | "LOCAL_AND_FIXTURE_ONLY"
    | "TIME_BOUND_ELEVATION_WITH_APPROVAL"
    | "NO_PERSISTENT_DEBUG_WIDENING";
  notes: string[];
  source_refs: SourceRef[];
}

export interface CollectorTierRow {
  tier_ref: string;
  label: string;
  tier_kind: CollectorTierKind;
  deployment_scope: string;
  signal_families: SignalFamilyRef[];
  ingress_mode: string;
  resilience_posture: string;
  processors: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface BackendRow {
  backend_ref: string;
  label: string;
  backend_kind:
    | "TRACE_BACKEND"
    | "METRIC_BACKEND"
    | "LOG_BACKEND"
    | "RESTRICTED_LOG_BACKEND"
    | "JOIN_INDEX"
    | "VENDOR_MONITORING_OVERLAY";
  binding_state: BackendBindingState;
  signal_families: SignalFamilyRef[];
  ownership_boundary:
    | "FIRST_PARTY_REQUIRED"
    | "FIRST_PARTY_RESTRICTED"
    | "FIRST_PARTY_DERIVED_FROM_CONTROL_AND_AUDIT"
    | "VENDOR_SECONDARY_OVERLAY";
  access_posture: string;
  storage_class: string;
  provider_secret_alias_ref_or_null: string | null;
  notes: string[];
  source_refs: SourceRef[];
}

export interface SignalBackendRow {
  signal_family_ref: SignalFamilyRef;
  label: string;
  collector_entrypoint_ref: string;
  primary_backend_ref: string;
  secondary_backend_refs: string[];
  retention_class_ref: string;
  sampling_policy_ref: string;
  correlation_policy_ref: string;
  scrub_policy_ref: string;
  vendor_exportability:
    | "FIRST_PARTY_ONLY"
    | "ALLOWED_TO_VENDOR_OVERLAY_WITH_ALLOWLIST";
  lineage_strip_label: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface SignalBackendCatalog {
  schema_version: "1.0";
  catalog_id: "signal_backend_catalog";
  selection_status: TelemetrySelectionStatus;
  managed_default_status: TelemetryManagedDefaultStatus;
  topology_mode: TelemetryTopologyMode;
  provider_option_rows: ProviderOptionRow[];
  collector_tier_rows: CollectorTierRow[];
  backend_rows: BackendRow[];
  signal_rows: SignalBackendRow[];
  truth_boundary_statement: string;
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface OtlpPipelineRow {
  pipeline_ref: string;
  label: string;
  signal_families: SignalFamilyRef[];
  collector_tier_ref: string;
  processors: string[];
  batching_posture: string;
  export_target_refs: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface OtlpServiceFamilyRow {
  service_family_ref: string;
  label: string;
  runtime_components: string[];
  pipeline_ref: string;
  required_resource_attributes: string[];
  cardinality_budget_ref: string;
  unsampled_fallback: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface OtlpExportMatrix {
  schema_version: "1.0";
  matrix_id: "otlp_export_matrix";
  selection_status: TelemetrySelectionStatus;
  topology_mode: TelemetryTopologyMode;
  pipeline_rows: OtlpPipelineRow[];
  service_family_rows: OtlpServiceFamilyRow[];
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface RetentionClassRow {
  retention_class_ref: string;
  label: string;
  hot_window: string;
  warm_window: string;
  access_posture: string;
  legal_boundary: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface SamplingVariantRow {
  posture_ref:
    | "default"
    | "elevated_debug"
    | "incident"
    | "privacy_constrained";
  collection_mode:
    | "ALWAYS_ON_AGGREGATE"
    | "TAIL_SAMPLE"
    | "LOG_SEVERITY_GATE"
    | "TIME_BOUND_FULL_CAPTURE"
    | "MINIMIZED_ALLOWLIST_ONLY"
    | "JOIN_INDEX_ONLY";
  baseline_rate_percent_or_null: number | null;
  max_window_minutes_or_null: number | null;
  approval_requirement: string;
  always_keep_conditions: string[];
  vendor_export_allowed: boolean;
}

export interface SignalSamplingPolicyRow {
  sampling_policy_ref: string;
  signal_family_ref: SignalFamilyRef;
  label: string;
  retention_class_ref: string;
  cardinality_budget_ref: string;
  unsampled_fallback_requirements: string[];
  posture_variants: SamplingVariantRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CardinalityBudgetRow {
  cardinality_budget_ref: string;
  label: string;
  allowed_high_cardinality_dimensions: string[];
  normalized_or_hashed_dimensions: string[];
  forbidden_dimensions: string[];
  enforcement_posture: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface SamplingAndRetentionPolicy {
  schema_version: "1.0";
  policy_id: "sampling_and_retention_policy";
  selection_status: TelemetrySelectionStatus;
  topology_mode: TelemetryTopologyMode;
  retention_class_rows: RetentionClassRow[];
  cardinality_budget_rows: CardinalityBudgetRow[];
  policy_rows: SignalSamplingPolicyRow[];
  truth_boundary_statement: string;
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface ResourceAttributePolicy {
  required_attributes: string[];
  optional_attributes: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CorrelationSignalRow {
  correlation_policy_ref: string;
  signal_family_ref: SignalFamilyRef;
  label: string;
  mandatory_keys: string[];
  required_resource_attributes: string[];
  audit_join_anchor_types: string[];
  fallback_join_keys: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CorrelationKeyPolicy {
  schema_version: "1.0";
  policy_id: "correlation_key_policy";
  selection_status: TelemetrySelectionStatus;
  topology_mode: TelemetryTopologyMode;
  resource_attribute_policy: ResourceAttributePolicy;
  signal_rows: CorrelationSignalRow[];
  truth_boundary_statement: string;
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface LogFamilyAllowlistRow {
  log_family_ref:
    | "OPERATIONAL_RUNTIME"
    | "SECURITY_RUNTIME"
    | "PRIVACY_RUNTIME"
    | "CLIENT_RUNTIME";
  label: string;
  allowed_top_level_fields: string[];
  allowed_attribute_keys: string[];
  hash_only_fields: string[];
  forbidden_field_classes: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface LogScrubAndFieldAllowlist {
  schema_version: "1.0";
  policy_id: "log_scrub_and_field_allowlist";
  selection_status: TelemetrySelectionStatus;
  topology_mode: TelemetryTopologyMode;
  collector_enforcement: {
    allow_all_keys: false;
    required_processors: string[];
    blocked_value_patterns: string[];
    drop_on_forbidden_class: true;
  };
  global_forbidden_field_classes: string[];
  global_hash_only_fields: string[];
  family_rows: LogFamilyAllowlistRow[];
  truth_boundary_statement: string;
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface ObservabilityInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "observability_inventory";
  provider_id: typeof TELEMETRY_PROVIDER_ID;
  flow_id: typeof TELEMETRY_FLOW_ID;
  policy_version: typeof TELEMETRY_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: TelemetrySelectionStatus;
  managed_default_status: TelemetryManagedDefaultStatus;
  selected_provider_family_or_null: TelemetryProviderFamily | null;
  topology_mode: TelemetryTopologyMode;
  truth_boundary_statement: string;
  provider_option_rows: ProviderOptionRow[];
  environment_rows: EnvironmentTelemetryRow[];
  collector_tier_rows: CollectorTierRow[];
  backend_rows: BackendRow[];
  signal_backend_catalog_ref: "config/observability/signal_backend_catalog.json";
  otlp_export_matrix_ref: "config/observability/otlp_export_matrix.json";
  sampling_and_retention_policy_ref:
    "config/observability/sampling_and_retention_policy.json";
  correlation_key_policy_ref:
    "config/observability/correlation_key_policy.json";
  log_scrub_and_field_allowlist_ref:
    "config/observability/log_scrub_and_field_allowlist.json";
  monitoring_overlay_refs: string[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface TelemetryAtlasFocusRow {
  row_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_title: string;
  inspector_lines: string[];
}

export interface TelemetryAtlasFamilyRow {
  family_ref: SignalFamilyRef;
  label: string;
  summary: string;
  exportability_label: string;
  primary_backend_label: string;
  retention_class_label: string;
  sampling_summary: string;
  scrub_summary: string;
  required_key_labels: string[];
  emission_rows: TelemetryAtlasFocusRow[];
  collector_rows: TelemetryAtlasFocusRow[];
  backend_rows: TelemetryAtlasFocusRow[];
  correlation_rows: TelemetryAtlasFocusRow[];
  lineage_strip: string;
  source_refs: SourceRef[];
  inspector_notes: string[];
}

export interface TelemetrySignalAtlasViewModel {
  routeId: "telemetry-signal-atlas";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: TelemetrySelectionStatus;
  managedDefaultStatus: TelemetryManagedDefaultStatus;
  topologyChipLabel: string;
  postureChipLabel: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    collector_namespace_prefix: string;
    environment_gateway_alias: string;
    authority_lane_posture: string;
  }>;
  families: TelemetryAtlasFamilyRow[];
}

export interface ProvisionTelemetryStep {
  step_id: string;
  title: string;
  status:
    | "SUCCEEDED"
    | "BLOCKED_BY_POLICY"
    | "BLOCKED_BY_DRIFT"
    | "SKIPPED_AS_ALREADY_PRESENT";
  reason: string;
}

export interface ProvisionTelemetryResult {
  outcome:
    | "OTEL_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "OTEL_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
    | "OTEL_TOPOLOGY_DRIFT_REVIEW_REQUIRED";
  selection_status: TelemetrySelectionStatus;
  inventory: ObservabilityInventoryTemplate;
  signalBackendCatalog: SignalBackendCatalog;
  otlpExportMatrix: OtlpExportMatrix;
  samplingAndRetentionPolicy: SamplingAndRetentionPolicy;
  correlationKeyPolicy: CorrelationKeyPolicy;
  logScrubAndFieldAllowlist: LogScrubAndFieldAllowlist;
  atlasViewModel: TelemetrySignalAtlasViewModel;
  steps: ProvisionTelemetryStep[];
  notes: string[];
}

interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function sourceRef(
  source_file: string,
  source_heading_or_logical_block: string,
  source_ref: string,
  rationale: string,
): SourceRef {
  return {
    source_file,
    source_heading_or_logical_block,
    source_ref,
    rationale,
  };
}

function cloneSourceRefs(rows: SourceRef[]): SourceRef[] {
  return rows.map((row) => ({ ...row }));
}

const commonTelemetrySourceRefs: SourceRef[] = [
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.2 Separation of concerns",
    "Algorithm/observability_and_audit_contract.md::L24[14.2_Separation_of_concerns]",
    "Operational, security, and privacy telemetry must remain distinct from append-only audit evidence.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.4 Mandatory correlation keys",
    "Algorithm/observability_and_audit_contract.md::L79[14.4_Mandatory_correlation_keys]",
    "Every signal family needs correlation keys that bind telemetry back to manifest, authority, workflow, and release lineage.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.7 Trace contract",
    "Algorithm/observability_and_audit_contract.md::L386[14.7_Trace_contract]",
    "Compliance-capable traces must preserve manifest-rooted structure and explicit sampling posture for critical flows.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.8 Metric contract",
    "Algorithm/observability_and_audit_contract.md::L420[14.8_Metric_contract]",
    "Reliability, security, privacy, and delivery metrics are mandatory even when backend product choice remains open.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.9 Logging contract",
    "Algorithm/observability_and_audit_contract.md::L494[14.9_Logging_contract]",
    "Structured logging must include correlation keys and message-template posture while excluding raw secrets and sensitive bodies.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.10 Audit versus telemetry retention",
    "Algorithm/observability_and_audit_contract.md::L537[14.10_Audit_versus_telemetry_retention]",
    "Sampling and retention decisions for telemetry may never erase required audit history or collapse restricted event families into generic logs.",
  ),
  sourceRef(
    "Algorithm/observability_and_audit_contract.md",
    "14.13 Invariants",
    "Algorithm/observability_and_audit_contract.md::L631[14.13_Invariants]",
    "Critical spans, authority mutations, and blocking gates require explicit trace and audit linkage rather than best-effort telemetry.",
  ),
  sourceRef(
    "Algorithm/retention_error_and_observability_contract.md",
    "15.4 Correlation, visibility, and signal separation",
    "Algorithm/retention_error_and_observability_contract.md::L143[15.4_Correlation_visibility_and_signal_separation]",
    "Visibility classes, masking posture, and retention state have to survive across the telemetry and audit split.",
  ),
  sourceRef(
    "Algorithm/security_and_runtime_hardening_contract.md",
    "3. Secret, key, and token handling",
    "Algorithm/security_and_runtime_hardening_contract.md::L52[3._Secret_key_and_token_handling]",
    "Telemetry secrets, headers, and downstream credentials must stay in governed secret boundaries and out of logs or repo-tracked payloads.",
  ),
  sourceRef(
    "Algorithm/deployment_and_resilience_contract.md",
    "1. Reference runtime topology",
    "Algorithm/deployment_and_resilience_contract.md::L9[1._Reference_runtime_topology]",
    "The runtime topology already separates operator access, orchestrator, workers, authority gateway, broker, control store, and audit store, so telemetry topology must match those boundaries.",
  ),
  sourceRef(
    "Algorithm/verification_and_release_gates.md",
    "Evidence required for promotion",
    "Algorithm/verification_and_release_gates.md::L273[4._Evidence_required_for_promotion]",
    "Release correlation requires build digest, candidate identity, schema bundle, and admissibility lineage inside telemetry resources and joins.",
  ),
  sourceRef(
    "PROMPT/CARDS/pc_0044.md",
    "Execution Summary",
    "PROMPT/CARDS/pc_0044.md::L177[pc_0044_execution_summary]",
    "The Sentry-compatible monitoring workspace already exists as a secondary vendor overlay and must not be mistaken for the primary telemetry substrate.",
  ),
  sourceRef(
    "data/analysis/dependency_register.json",
    "OPENTELEMETRY_COLLECTION_AND_BACKEND",
    "data/analysis/dependency_register.json::dependency_key=OPENTELEMETRY_COLLECTION_AND_BACKEND",
    "The dependency register keeps core OpenTelemetry backends in procurement or platform-choice posture, so this card must stay portable and fail closed.",
  ),
];

const providerOptionRowsBase: ProviderOptionRow[] = [
  {
    provider_family: "SELF_HOSTED_LGTM_COLLECTOR_STACK",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    provider_label: "Self-hosted OTLP collector + trace / metric / log stack",
    docs_urls: [
      "https://opentelemetry.io/docs/collector/deploy/gateway/",
      "https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/",
      "https://opentelemetry.io/docs/collector/resiliency/",
      "https://opentelemetry.io/docs/collector/configuration/",
    ],
    topology_summary:
      "Keep collector, traces, metrics, logs, security, and privacy stores inside the first-party platform boundary.",
    backend_summary:
      "Portable baseline that satisfies first-party retention and access-control law without delegating primary telemetry truth to a vendor.",
    privacy_summary:
      "Most direct fit for strict redaction, restricted access slices, and replay-safe joins to audit evidence.",
    notes: [
      "Strongest alignment with the corpus' first-party telemetry posture.",
      "Introduces operator burden for collector, storage, and scaling operations.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    provider_family: "PLATFORM_NATIVE_OTLP_BACKENDS",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Platform-native OTLP-compatible backends",
    docs_urls: [
      "https://opentelemetry.io/docs/collector/deploy/gateway/",
      "https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/",
      "https://opentelemetry.io/docs/collector/resiliency/",
    ],
    topology_summary:
      "Use the eventual platform provider's OTLP-capable tracing, metrics, and logging stores behind the same gateway pattern.",
    backend_summary:
      "Works only after the platform decision from the adjacent infrastructure cards is frozen.",
    privacy_summary:
      "Requires explicit restricted-dataset and vendor-export disablement posture for security and privacy signals.",
    notes: [
      "This row is blocked until the broader platform provider is chosen.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    provider_family: "MANAGED_OTLP_SEARCH_AND_METRIC_STACK",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    provider_label: "Managed OTLP search / metric stack with first-party gateway",
    docs_urls: [
      "https://opentelemetry.io/docs/collector/deploy/gateway/",
      "https://opentelemetry.io/docs/collector/resiliency/",
      "https://opentelemetry.io/docs/concepts/resources/",
    ],
    topology_summary:
      "Keep the gateway and redaction in first party, then export to a managed backend that accepts OTLP or compatible transformed signals.",
    backend_summary:
      "Viable only if the managed backend can preserve first-party restricted lanes and explicit retention classes.",
    privacy_summary:
      "Needs additional governance review before any security or privacy signal can leave the platform boundary.",
    notes: [
      "Permitted only for signal families explicitly marked vendor-exportable.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
];

const environmentRowsBase: EnvironmentTelemetryRow[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    label: "Local provisioning workstation",
    collector_namespace_prefix: "taxat-local-otel",
    environment_gateway_alias: "otel-local-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "NONE",
    release_debug_posture: "LOCAL_AND_FIXTURE_ONLY",
    notes: [
      "Local traces and logs are fixture-safe only and cannot become canonical provider truth.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    environment_ref: "env_ephemeral_review_preview",
    label: "Ephemeral review preview",
    collector_namespace_prefix: "taxat-preview-otel",
    environment_gateway_alias: "otel-preview-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "NONE",
    release_debug_posture: "LOCAL_AND_FIXTURE_ONLY",
    notes: [
      "Preview telemetry stays isolated and may not share provider credentials or callback trust with stable environments.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Shared sandbox integration",
    collector_namespace_prefix: "taxat-sbx-otel",
    environment_gateway_alias: "otel-sandbox-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "SANDBOX_WEB_DESKTOP_BATCH",
    release_debug_posture: "TIME_BOUND_ELEVATION_WITH_APPROVAL",
    notes: [
      "Sandbox is the first stable authority-enabled telemetry environment and must keep web, desktop, and batch authority lanes explicit.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Pre-production verification",
    collector_namespace_prefix: "taxat-pre-otel",
    environment_gateway_alias: "otel-preprod-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "PREPROD_SANDBOX_WEB_DESKTOP_BATCH",
    release_debug_posture: "TIME_BOUND_ELEVATION_WITH_APPROVAL",
    notes: [
      "Pre-production mirrors production topology while still using sandbox provider trust for exact candidate-bound coverage.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    environment_ref: "env_production",
    label: "Production",
    collector_namespace_prefix: "taxat-prod-otel",
    environment_gateway_alias: "otel-production-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "LIVE_WEB_DESKTOP_BATCH",
    release_debug_posture: "NO_PERSISTENT_DEBUG_WIDENING",
    notes: [
      "Production telemetry cannot co-mingle with sandbox or preview namespaces and cannot keep widened debug posture after the approved window closes.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    environment_ref: "env_disaster_recovery_drill",
    label: "Disaster-recovery and resilience drill",
    collector_namespace_prefix: "taxat-drill-otel",
    environment_gateway_alias: "otel-drill-gateway",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    authority_lane_posture: "DRILL_DISABLED_BY_DEFAULT",
    release_debug_posture: "TIME_BOUND_ELEVATION_WITH_APPROVAL",
    notes: [
      "Drill telemetry must never inherit live authority callback trust or continuous production debug posture.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
];

const collectorTierRowsBase: CollectorTierRow[] = [
  {
    tier_ref: "collector.sdk_direct",
    label: "Direct SDK OTLP clients",
    tier_kind: "SDK_DIRECT",
    deployment_scope:
      "Browser operator shell, customer portal shell, native macOS workspace, and lightweight services with safe direct export posture.",
    signal_families: ["TRACES", "METRICS", "LOGS"],
    ingress_mode: "OTLP over environment-scoped HTTPS / gRPC",
    resilience_posture:
      "Bounded batch and timeout at the SDK edge; local browser or native caches never become legal telemetry truth.",
    processors: [
      "resource_attributes",
      "sdk_batch",
      "sdk_timeout",
    ],
    notes: [
      "Direct SDK paths are appropriate where a workload-local agent is unavailable or unnecessary.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    tier_ref: "collector.workload_agent",
    label: "Workload-local agent collectors",
    tier_kind: "WORKLOAD_AGENT",
    deployment_scope:
      "Manifest orchestrator, stage workers, authority gateway, and projector workloads running on platform hosts or nodes.",
    signal_families: ["TRACES", "METRICS", "LOGS", "SECURITY", "PRIVACY"],
    ingress_mode: "Local OTLP receive with host or workload resource enrichment",
    resilience_posture:
      "Bounded local queue plus optional WAL before forwarding to the environment gateway; no durable truth written here.",
    processors: [
      "resourcedetection",
      "attributes/correlation_enrichment",
      "memory_limiter",
      "batch",
    ],
    notes: [
      "Agent tier absorbs local bursts and normalizes resource identity before cross-network export.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    tier_ref: "collector.environment_gateway",
    label: "Environment gateway collectors",
    tier_kind: "ENVIRONMENT_GATEWAY",
    deployment_scope:
      "One environment-scoped gateway tier per stable runtime namespace and one isolated gateway for ephemeral preview.",
    signal_families: ["TRACES", "METRICS", "LOGS", "SECURITY", "PRIVACY", "AUDIT_LINKS"],
    ingress_mode: "Single environment OTLP ingress for direct SDKs and workload agents",
    resilience_posture:
      "Bounded sending queues, retry with backoff, persistent WAL for remote exporters, and failure-aware degraded mode that protects runtime correctness.",
    processors: [
      "memory_limiter",
      "batch",
      "filter/high_cardinality_drop",
      "redaction/allowlist",
      "transform/hash_selected_fields",
      "tail_sampling",
      "routing/by_signal_family",
    ],
    notes: [
      "Tail sampling and cross-signal routing happen at the gateway so policy remains centralized and environment-scoped.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    tier_ref: "collector.vendor_overlay_bridge",
    label: "Vendor overlay bridge",
    tier_kind: "EXPORT_BRIDGE",
    deployment_scope:
      "Exporter lane inside the environment gateway that forwards only allowlisted trace envelopes, errors, and release markers to the adopted Sentry-compatible workspace.",
    signal_families: ["TRACES"],
    ingress_mode: "Collector exporter bridge only; never a primary ingest endpoint",
    resilience_posture:
      "Non-blocking exporter with independent queue and redaction gate; vendor outage cannot fail the product or suppress audit capture.",
    processors: [
      "filter/vendor_export_allowlist",
      "attributes/remove_high_risk_keys",
      "batch",
    ],
    notes: [
      "Secondary-only overlay from pc_0044 for grouped diagnostics and release markers.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
];

const backendRowsBase: BackendRow[] = [
  {
    backend_ref: "backend.first_party_traces",
    label: "First-party trace backend",
    backend_kind: "TRACE_BACKEND",
    binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    signal_families: ["TRACES"],
    ownership_boundary: "FIRST_PARTY_REQUIRED",
    access_posture: "restricted runtime and incident-response operators only",
    storage_class: "hot query window plus short warm retention",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "Primary trace store remains unresolved until the platform provider is chosen.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.first_party_metrics",
    label: "First-party metric backend",
    backend_kind: "METRIC_BACKEND",
    binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    signal_families: ["METRICS"],
    ownership_boundary: "FIRST_PARTY_REQUIRED",
    access_posture: "restricted runtime, release, and SRE operators",
    storage_class: "aggregate hot window plus rollup retention",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "Single-writer metric identity remains mandatory even after provider selection.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.first_party_logs",
    label: "First-party operational log backend",
    backend_kind: "LOG_BACKEND",
    binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    signal_families: ["LOGS"],
    ownership_boundary: "FIRST_PARTY_REQUIRED",
    access_posture: "restricted runtime and support operators with customer-safe filters",
    storage_class: "structured log search with short hot retention",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "General operational logs stay first-party because the log allowlist excludes sensitive raw payloads by construction.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.security_signal_store",
    label: "Restricted security telemetry store",
    backend_kind: "RESTRICTED_LOG_BACKEND",
    binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    signal_families: ["SECURITY"],
    ownership_boundary: "FIRST_PARTY_RESTRICTED",
    access_posture: "security and break-glass operators only",
    storage_class: "restricted security event index",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "Step-up, access-denial, egress, and authority-edge anomalies remain outside vendor overlays.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.privacy_signal_store",
    label: "Restricted privacy telemetry store",
    backend_kind: "RESTRICTED_LOG_BACKEND",
    binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    signal_families: ["PRIVACY"],
    ownership_boundary: "FIRST_PARTY_RESTRICTED",
    access_posture: "privacy and compliance operators only",
    storage_class: "restricted privacy event index",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "Masking, export, erasure, and legal-hold telemetry remain restricted and are never vendor-exportable.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.audit_join_index",
    label: "Telemetry-to-audit join index",
    backend_kind: "JOIN_INDEX",
    binding_state: "ADOPTED_EXISTING",
    signal_families: ["AUDIT_LINKS"],
    ownership_boundary: "FIRST_PARTY_DERIVED_FROM_CONTROL_AND_AUDIT",
    access_posture: "derived join layer over control store and append-only audit evidence",
    storage_class: "derived searchable join index",
    provider_secret_alias_ref_or_null: null,
    notes: [
      "Derived from the first-party control and audit substrates from pc_0050; never a replacement for those stores.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    backend_ref: "backend.vendor_monitoring_overlay",
    label: "Sentry-compatible monitoring overlay",
    backend_kind: "VENDOR_MONITORING_OVERLAY",
    binding_state: "ADOPTED_EXISTING",
    signal_families: ["TRACES"],
    ownership_boundary: "VENDOR_SECONDARY_OVERLAY",
    access_posture: "sanitized diagnostic overlay only",
    storage_class: "secondary issue and sampled-trace view",
    provider_secret_alias_ref_or_null: "vault://monitoring/sentry/{environment}/org-automation-token",
    notes: [
      "Imported from pc_0044 and treated as a secondary sink for allowlisted traces, exceptions, and release markers.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
];

const signalRowsBase: SignalBackendRow[] = [
  {
    signal_family_ref: "TRACES",
    label: "Traces",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.first_party_traces",
    secondary_backend_refs: ["backend.vendor_monitoring_overlay"],
    retention_class_ref: "retention.telemetry.trace_hot_14d",
    sampling_policy_ref: "sampling.traces",
    correlation_policy_ref: "correlation.traces",
    scrub_policy_ref: "logscrub.trace_attribute_redaction",
    vendor_exportability: "ALLOWED_TO_VENDOR_OVERLAY_WITH_ALLOWLIST",
    lineage_strip_label:
      "Runtime span -> environment gateway -> first-party trace backend -> audit join via trace_id and manifest anchors",
    notes: [
      "Authority, filing, amendment, retention, erasure, replay, and gate-block spans are always kept.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    signal_family_ref: "METRICS",
    label: "Metrics",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.first_party_metrics",
    secondary_backend_refs: [],
    retention_class_ref: "retention.telemetry.metric_rollup_30d",
    sampling_policy_ref: "sampling.metrics",
    correlation_policy_ref: "correlation.metrics",
    scrub_policy_ref: "logscrub.metric_attribute_allowlist",
    vendor_exportability: "FIRST_PARTY_ONLY",
    lineage_strip_label:
      "Runtime measurement -> environment gateway -> first-party metric backend -> audit join via manifest or release aggregates",
    notes: [
      "Metrics stay aggregate-first and single-writer-safe.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    signal_family_ref: "LOGS",
    label: "Logs",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.first_party_logs",
    secondary_backend_refs: [],
    retention_class_ref: "retention.telemetry.logs_hot_30d",
    sampling_policy_ref: "sampling.logs",
    correlation_policy_ref: "correlation.logs",
    scrub_policy_ref: "logscrub.structured_runtime_logs",
    vendor_exportability: "FIRST_PARTY_ONLY",
    lineage_strip_label:
      "Structured log -> redaction / allowlist -> first-party log backend -> audit join via error_id, trace_id, and object anchors",
    notes: [
      "General logs remain structured, correlation-rich, and scrubbed by allowlist rather than best-effort masking alone.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    signal_family_ref: "SECURITY",
    label: "Security telemetry",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.security_signal_store",
    secondary_backend_refs: [],
    retention_class_ref: "retention.telemetry.security_restricted_90d",
    sampling_policy_ref: "sampling.security",
    correlation_policy_ref: "correlation.security",
    scrub_policy_ref: "logscrub.security_runtime_logs",
    vendor_exportability: "FIRST_PARTY_ONLY",
    lineage_strip_label:
      "Security event -> restricted security lane -> restricted store -> audit join via access, authority, and approval anchors",
    notes: [
      "Security telemetry is separately restricted from general runtime logs and metrics.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    signal_family_ref: "PRIVACY",
    label: "Privacy telemetry",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.privacy_signal_store",
    secondary_backend_refs: [],
    retention_class_ref: "retention.telemetry.privacy_restricted_90d",
    sampling_policy_ref: "sampling.privacy",
    correlation_policy_ref: "correlation.privacy",
    scrub_policy_ref: "logscrub.privacy_runtime_logs",
    vendor_exportability: "FIRST_PARTY_ONLY",
    lineage_strip_label:
      "Privacy event -> restricted privacy lane -> restricted store -> audit join via erasure, hold, export, and retention anchors",
    notes: [
      "Privacy telemetry remains distinct from proof-of-record privacy audit events.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
  {
    signal_family_ref: "AUDIT_LINKS",
    label: "Audit links",
    collector_entrypoint_ref: "collector.environment_gateway",
    primary_backend_ref: "backend.audit_join_index",
    secondary_backend_refs: [],
    retention_class_ref: "retention.telemetry.audit_link_30d",
    sampling_policy_ref: "sampling.audit_links",
    correlation_policy_ref: "correlation.audit_links",
    scrub_policy_ref: "logscrub.audit_link_index",
    vendor_exportability: "FIRST_PARTY_ONLY",
    lineage_strip_label:
      "Join metadata -> first-party join index -> control and audit stores -> deterministic investigation frames",
    notes: [
      "Join indices improve investigation speed but remain rebuildable from durable truth.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  },
];

const pipelineRowsBase: OtlpPipelineRow[] = [
  {
    pipeline_ref: "pipeline.gateway.priority_traces",
    label: "Priority traces",
    signal_families: ["TRACES"],
    collector_tier_ref: "collector.environment_gateway",
    processors: [
      "memory_limiter",
      "batch",
      "tail_sampling",
      "attributes/correlation_enrichment",
      "filter/vendor_export_allowlist",
    ],
    batching_posture:
      "Bounded queue, gzip compression, and WAL-backed exporter queue on gateway nodes.",
    export_target_refs: [
      "backend.first_party_traces",
      "backend.vendor_monitoring_overlay",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Critical traces stay sampled-in even when generic traffic is reduced.",
    ],
  },
  {
    pipeline_ref: "pipeline.gateway.metrics",
    label: "Metrics",
    signal_families: ["METRICS"],
    collector_tier_ref: "collector.environment_gateway",
    processors: [
      "memory_limiter",
      "batch",
      "filter/high_cardinality_drop",
      "attributes/normalize_dimensions",
    ],
    batching_posture:
      "Short batch timeout with single-writer discipline for each metric identity.",
    export_target_refs: ["backend.first_party_metrics"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Metrics never share writers across gateway shards for the same series identity.",
    ],
  },
  {
    pipeline_ref: "pipeline.gateway.operational_logs",
    label: "Operational logs",
    signal_families: ["LOGS"],
    collector_tier_ref: "collector.environment_gateway",
    processors: [
      "redaction/allowlist",
      "transform/hash_selected_fields",
      "memory_limiter",
      "batch",
    ],
    batching_posture:
      "Allowlist first, then hash selected identifiers, then batch to first-party search.",
    export_target_refs: ["backend.first_party_logs"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Raw bodies, secrets, and regulated text never cross the allowlist boundary.",
    ],
  },
  {
    pipeline_ref: "pipeline.gateway.security_privacy",
    label: "Security and privacy telemetry",
    signal_families: ["SECURITY", "PRIVACY"],
    collector_tier_ref: "collector.environment_gateway",
    processors: [
      "redaction/allowlist",
      "routing/by_signal_family",
      "memory_limiter",
      "batch",
    ],
    batching_posture:
      "Restricted export path with separate datasets and no vendor forwarding.",
    export_target_refs: [
      "backend.security_signal_store",
      "backend.privacy_signal_store",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Separate routing preserves tighter access posture than general runtime logs.",
    ],
  },
  {
    pipeline_ref: "pipeline.gateway.audit_join_links",
    label: "Audit join links",
    signal_families: ["AUDIT_LINKS"],
    collector_tier_ref: "collector.environment_gateway",
    processors: [
      "transform/derive_join_rows",
      "batch",
    ],
    batching_posture:
      "Derived link rows only; no full audit bodies or mutable telemetry truth are written here.",
    export_target_refs: ["backend.audit_join_index"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Join rows stay rebuildable from control and audit truth.",
    ],
  },
];

const serviceFamilyRowsBase: OtlpServiceFamilyRow[] = [
  {
    service_family_ref: "service_family.northbound_api_and_session_gateway",
    label: "Northbound API and session gateway",
    runtime_components: [
      "northbound API / session gateway",
      "browser-facing operator shell gateway",
    ],
    pipeline_ref: "pipeline.gateway.priority_traces",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
    ],
    cardinality_budget_ref: "budget.http_gateway_dimensions",
    unsampled_fallback:
      "Audit gate, session, and approval events remain durable even when ordinary request traces are not kept.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Gateway spans capture request path and release correlation without logging request bodies.",
    ],
  },
  {
    service_family_ref: "service_family.manifest_orchestrator",
    label: "Manifest orchestrator",
    runtime_components: ["manifest orchestrator"],
    pipeline_ref: "pipeline.gateway.priority_traces",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.manifest.lineage_trace_ref",
      "taxat.release.candidate_hash",
      "taxat.schema.bundle_hash",
    ],
    cardinality_budget_ref: "budget.manifest_lineage_dimensions",
    unsampled_fallback:
      "Manifest allocation, continuation, replay, recovery, and gate-block facts still append to audit.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Top-level manifest traces are the canonical runtime structure for execution episodes.",
    ],
  },
  {
    service_family_ref: "service_family.stage_workers",
    label: "Stage workers",
    runtime_components: [
      "collection worker",
      "normalization worker",
      "graph worker",
      "projection worker",
    ],
    pipeline_ref: "pipeline.gateway.metrics",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
    ],
    cardinality_budget_ref: "budget.worker_dimensions",
    unsampled_fallback:
      "Worker backlog, retry, and failure facts still persist through audit and workflow records.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Workers emphasize metrics and aggregate throughput while still emitting compliance-critical traces when required.",
    ],
  },
  {
    service_family_ref: "service_family.authority_gateway",
    label: "Authority gateway",
    runtime_components: [
      "authority transmit",
      "authority reconcile",
      "authority ingress normalization",
    ],
    pipeline_ref: "pipeline.gateway.priority_traces",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.authority.binding_ref",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
    ],
    cardinality_budget_ref: "budget.authority_dimensions",
    unsampled_fallback:
      "Authority transmit and reconcile audit evidence, request hashes, and submission lineage remain durable even if a generic trace is not retained.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Authority mutation paths always keep traces and never vendor-export raw authority material.",
    ],
  },
  {
    service_family_ref: "service_family.read_side_projector",
    label: "Read-side projector and stream broker",
    runtime_components: ["decision bundle projector", "experience delta projector"],
    pipeline_ref: "pipeline.gateway.metrics",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.schema.bundle_hash",
    ],
    cardinality_budget_ref: "budget.projection_dimensions",
    unsampled_fallback:
      "Projection rebuildability is proven from durable truth, not from continuous trace capture.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Projector telemetry stays performance-focused because read models are disposable.",
    ],
  },
  {
    service_family_ref: "service_family.browser_operator_and_portal",
    label: "Browser operator and customer portal surfaces",
    runtime_components: [
      "browser operator shell",
      "customer portal shell",
    ],
    pipeline_ref: "pipeline.gateway.operational_logs",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
    ],
    cardinality_budget_ref: "budget.client_surface_dimensions",
    unsampled_fallback:
      "Client continuity, resume, and approval audit facts persist even if UI spans are reduced to sampled traces plus structured events.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Client telemetry uses shell, route, posture, and opaque object codes only.",
    ],
  },
  {
    service_family_ref: "service_family.native_operator_workspace",
    label: "Native operator workspace",
    runtime_components: ["SwiftUI operator workspace", "AppKit heavy-detail panes"],
    pipeline_ref: "pipeline.gateway.operational_logs",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
    ],
    cardinality_budget_ref: "budget.native_surface_dimensions",
    unsampled_fallback:
      "Scene-restore, cache-rebase, and detach-window facts remain durable via workflow and audit rather than local-only telemetry.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Native telemetry must respect the same preview, masking, and secure restore law as browser surfaces.",
    ],
  },
  {
    service_family_ref: "service_family.collector_internal",
    label: "Collector self-observability",
    runtime_components: ["gateway collector", "workload agents"],
    pipeline_ref: "pipeline.gateway.audit_join_links",
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "service.instance.id",
    ],
    cardinality_budget_ref: "budget.collector_internal_dimensions",
    unsampled_fallback:
      "Collector health remains visible through its own internal metrics and does not weaken runtime or audit correctness if a backend degrades.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "Collector queue saturation and send failures are first-class observability signals for degraded exporter posture.",
    ],
  },
];

const retentionClassRowsBase: RetentionClassRow[] = [
  {
    retention_class_ref: "retention.telemetry.trace_hot_14d",
    label: "Trace hot window",
    hot_window: "14d",
    warm_window: "30d",
    access_posture: "runtime and incident operators only",
    legal_boundary: "Operational explanation only; audit proof remains elsewhere.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Long enough for incident triage and release regression comparison."],
  },
  {
    retention_class_ref: "retention.telemetry.metric_rollup_30d",
    label: "Metric rollup window",
    hot_window: "30d",
    warm_window: "90d",
    access_posture: "runtime, release, and SRE operators",
    legal_boundary: "Aggregate operational telemetry only.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Rollups survive longer than raw traces because release and capacity comparisons need trend windows."],
  },
  {
    retention_class_ref: "retention.telemetry.logs_hot_30d",
    label: "Operational log window",
    hot_window: "30d",
    warm_window: "60d",
    access_posture: "runtime and restricted support operators with customer-safe filters",
    legal_boundary: "Structured operational explanation only; never raw evidence or declaration text.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Shorter than audit retention and bounded by log allowlist law."],
  },
  {
    retention_class_ref: "retention.telemetry.security_restricted_90d",
    label: "Restricted security telemetry",
    hot_window: "90d",
    warm_window: "180d",
    access_posture: "security and break-glass operators only",
    legal_boundary: "Security telemetry remains separate from security audit proof and is never vendor-exportable.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Supports investigation windows without collapsing into the audit store."],
  },
  {
    retention_class_ref: "retention.telemetry.privacy_restricted_90d",
    label: "Restricted privacy telemetry",
    hot_window: "90d",
    warm_window: "180d",
    access_posture: "privacy and compliance operators only",
    legal_boundary: "Privacy telemetry remains minimized and separately restricted from general operations views.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Allows investigation of masking, export, and erasure workflow health without keeping raw data."],
  },
  {
    retention_class_ref: "retention.telemetry.audit_link_30d",
    label: "Audit-link join window",
    hot_window: "30d",
    warm_window: "90d",
    access_posture: "investigation and incident operators",
    legal_boundary: "Derived join data only; canonical proof remains in control and audit stores.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Join indices are rebuildable and may expire independently of audit evidence."],
  },
];

const cardinalityBudgetRowsBase: CardinalityBudgetRow[] = [
  {
    cardinality_budget_ref: "budget.http_gateway_dimensions",
    label: "HTTP gateway dimensions",
    allowed_high_cardinality_dimensions: ["http.route", "status.code"],
    normalized_or_hashed_dimensions: [
      "tenant_id",
      "client_id",
      "access_binding_hash",
      "request_hash",
    ],
    forbidden_dimensions: [
      "user.email",
      "full_url",
      "raw_query_string",
      "authority_payload_id",
    ],
    enforcement_posture:
      "Normalize route templates and hash tenant/client lineage before gateway export.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Avoids cardinality blow-up from raw IDs or URLs."],
  },
  {
    cardinality_budget_ref: "budget.manifest_lineage_dimensions",
    label: "Manifest lineage dimensions",
    allowed_high_cardinality_dimensions: ["run_kind", "mode"],
    normalized_or_hashed_dimensions: [
      "manifest_id",
      "root_manifest_id",
      "parent_manifest_id",
      "continuation_of_manifest_id",
      "replay_of_manifest_id",
      "manifest_lineage_trace_ref",
    ],
    forbidden_dimensions: ["decision_bundle_body", "evidence_text", "declaration_text"],
    enforcement_posture:
      "Keep lineage refs opaque and never attach free-form decision or evidence bodies to spans or metrics.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Lineage richness belongs in opaque refs, not raw payload dimensions."],
  },
  {
    cardinality_budget_ref: "budget.worker_dimensions",
    label: "Worker execution dimensions",
    allowed_high_cardinality_dimensions: ["worker.role", "queue.result"],
    normalized_or_hashed_dimensions: [
      "manifest_id",
      "authority_operation_id",
      "workflow_item_id",
    ],
    forbidden_dimensions: ["document_filename", "object_storage_key", "upload_path"],
    enforcement_posture:
      "Worker metrics stay aggregate-first and attach only opaque IDs.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Object refs are allowed only in logs with approved opaque names."],
  },
  {
    cardinality_budget_ref: "budget.authority_dimensions",
    label: "Authority dimensions",
    allowed_high_cardinality_dimensions: ["authority.operation_family", "authority.response_class"],
    normalized_or_hashed_dimensions: [
      "authority_operation_id",
      "submission_record_id",
      "authority_binding_ref",
      "access_binding_hash",
    ],
    forbidden_dimensions: ["authority.request_body", "authority.response_body", "token_value"],
    enforcement_posture:
      "Keep authority lineage explicit while banning raw request or response material from telemetry attributes.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Critical for HMRC send, reconcile, and callback flows."],
  },
  {
    cardinality_budget_ref: "budget.projection_dimensions",
    label: "Projection dimensions",
    allowed_high_cardinality_dimensions: ["projection.family", "projection.result"],
    normalized_or_hashed_dimensions: ["manifest_id", "delivery_binding_hash"],
    forbidden_dimensions: ["portal_copy_text", "operator_comment_preview"],
    enforcement_posture:
      "Projection telemetry can describe freshness, lag, and rebuildability, but not customer-facing text.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Supports projector health without leaking read-model content."],
  },
  {
    cardinality_budget_ref: "budget.client_surface_dimensions",
    label: "Client surface dimensions",
    allowed_high_cardinality_dimensions: ["shell.family_code", "route.family_code", "resume.outcome"],
    normalized_or_hashed_dimensions: [
      "tenant_id",
      "client_id",
      "session_binding_hash",
      "access_binding_hash",
      "opaque_object_ref",
    ],
    forbidden_dimensions: ["dom_text", "screenshot", "clipboard", "keystrokes"],
    enforcement_posture:
      "Client telemetry uses coded routes and opaque refs only.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Applies to browser operator, customer portal, and native shells."],
  },
  {
    cardinality_budget_ref: "budget.native_surface_dimensions",
    label: "Native surface dimensions",
    allowed_high_cardinality_dimensions: ["scene.code", "restore.outcome"],
    normalized_or_hashed_dimensions: [
      "session_binding_hash",
      "projection_guard_ref",
      "opaque_object_ref",
    ],
    forbidden_dimensions: ["window_title_text", "preview_content", "local_file_path"],
    enforcement_posture:
      "Native telemetry codes scene and restore posture instead of serializing rendered text or file-system details.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Protects native scene restoration and preview safety."],
  },
  {
    cardinality_budget_ref: "budget.collector_internal_dimensions",
    label: "Collector internal dimensions",
    allowed_high_cardinality_dimensions: ["exporter.name", "pipeline.id"],
    normalized_or_hashed_dimensions: ["service.instance.id"],
    forbidden_dimensions: ["collector.raw_header", "collector.payload_sample"],
    enforcement_posture:
      "Self-observability stays about queue size, refused signals, and exporter failures only.",
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Collector internal metrics are needed to explain backpressure and drops."],
  },
];

const samplingPolicyRowsBase: SignalSamplingPolicyRow[] = [
  {
    sampling_policy_ref: "sampling.traces",
    signal_family_ref: "TRACES",
    label: "Trace sampling and retention",
    retention_class_ref: "retention.telemetry.trace_hot_14d",
    cardinality_budget_ref: "budget.manifest_lineage_dimensions",
    unsampled_fallback_requirements: [
      "Audit event still emitted for every compliance-significant action.",
      "Blocking gates, authority mutations, step-up events, manual checkpoints, filing, amendment, retention, erasure, and replay traces are always kept.",
      "Unsampled ordinary requests still preserve error_id, request_hash, and workflow or object anchors in logs and audit where operationally relevant.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "TAIL_SAMPLE",
        baseline_rate_percent_or_null: 10,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for baseline policy.",
        always_keep_conditions: [
          "status=ERROR",
          "authority transmit or reconcile",
          "filing packet build",
          "amendment evaluate",
          "retention apply",
          "erasure execute",
          "gate hard block",
          "manual checkpoint",
          "replay or recovery lineage",
          "latency > 5000ms on critical services",
        ],
        vendor_export_allowed: true,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: 100,
        max_window_minutes_or_null: 120,
        approval_requirement:
          "Named incident or debug approval plus recorded expiry required.",
        always_keep_conditions: ["explicit approved debug window only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: 100,
        max_window_minutes_or_null: 240,
        approval_requirement:
          "Incident commander approval and audit evidence required.",
        always_keep_conditions: ["affected service families only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: 5,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic when privacy or retention posture narrows scope.",
        always_keep_conditions: ["authority and filing critical traces stay kept but with minimized attributes"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: [
      "No compliance-significant span may rely on best-effort probabilistic sampling alone.",
    ],
  },
  {
    sampling_policy_ref: "sampling.metrics",
    signal_family_ref: "METRICS",
    label: "Metric aggregation and retention",
    retention_class_ref: "retention.telemetry.metric_rollup_30d",
    cardinality_budget_ref: "budget.worker_dimensions",
    unsampled_fallback_requirements: [
      "Critical counters remain emitted as aggregate metrics even if trace volume is reduced.",
      "Metric loss must not be mistaken for missing audit or workflow truth.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "ALWAYS_ON_AGGREGATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for aggregate metrics.",
        always_keep_conditions: ["all metric points subject to cardinality budget"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "ALWAYS_ON_AGGREGATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 120,
        approval_requirement: "Additional histograms or exemplars require time-bound approval.",
        always_keep_conditions: ["affected service families only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "ALWAYS_ON_AGGREGATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 240,
        approval_requirement: "Incident approval for temporary higher-resolution buckets.",
        always_keep_conditions: ["affected service families only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic when sensitive surface posture narrows dimensions.",
        always_keep_conditions: ["aggregate counts only"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Metrics remain aggregate-first and never carry raw payload fields."],
  },
  {
    sampling_policy_ref: "sampling.logs",
    signal_family_ref: "LOGS",
    label: "Structured operational logs",
    retention_class_ref: "retention.telemetry.logs_hot_30d",
    cardinality_budget_ref: "budget.http_gateway_dimensions",
    unsampled_fallback_requirements: [
      "Warning-or-higher logs always include structured correlation fields.",
      "General info logs remain code-and-template driven rather than text-dump driven.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "LOG_SEVERITY_GATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for structured warning/error logs.",
        always_keep_conditions: ["warning+", "error+", "explicit lifecycle event codes"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 120,
        approval_requirement: "Explicit debug approval required and still subject to allowlist.",
        always_keep_conditions: ["affected service families only", "still no raw bodies or secrets"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 240,
        approval_requirement: "Incident approval required and recorded in audit.",
        always_keep_conditions: ["affected service families only", "still no raw bodies or secrets"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic for privacy-sensitive routes and masked surfaces.",
        always_keep_conditions: ["code-only and hash-only fields"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Structured allowlist remains in force even during incidents."],
  },
  {
    sampling_policy_ref: "sampling.security",
    signal_family_ref: "SECURITY",
    label: "Restricted security telemetry",
    retention_class_ref: "retention.telemetry.security_restricted_90d",
    cardinality_budget_ref: "budget.authority_dimensions",
    unsampled_fallback_requirements: [
      "Step-up, access denial, revocation, and egress-policy events always emit restricted telemetry and matching audit evidence.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "ALWAYS_ON_AGGREGATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for restricted security telemetry.",
        always_keep_conditions: ["all security events"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 120,
        approval_requirement: "Security approval and expiry required.",
        always_keep_conditions: ["affected scopes only", "still no raw credentials or payloads"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 240,
        approval_requirement: "Security incident approval and audit evidence required.",
        always_keep_conditions: ["affected scopes only", "still no raw credentials or payloads"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic when privacy scope narrows.",
        always_keep_conditions: ["hash-only and code-only fields"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Restricted security telemetry never leaves the first-party boundary."],
  },
  {
    sampling_policy_ref: "sampling.privacy",
    signal_family_ref: "PRIVACY",
    label: "Restricted privacy telemetry",
    retention_class_ref: "retention.telemetry.privacy_restricted_90d",
    cardinality_budget_ref: "budget.client_surface_dimensions",
    unsampled_fallback_requirements: [
      "Masking, export, legal-hold, and erasure workflow telemetry always remains correlation-capable and restricted.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "ALWAYS_ON_AGGREGATE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for restricted privacy telemetry.",
        always_keep_conditions: ["all privacy events"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 120,
        approval_requirement: "Privacy approval and expiry required.",
        always_keep_conditions: ["affected scopes only", "still no raw personal data or bodies"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "TIME_BOUND_FULL_CAPTURE",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 240,
        approval_requirement: "Privacy or compliance incident approval required.",
        always_keep_conditions: ["affected scopes only", "still no raw personal data or bodies"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic on privacy-sensitive views and erasure flows.",
        always_keep_conditions: ["hash-only and code-only fields"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Privacy telemetry is restricted, minimized, and separately searchable."],
  },
  {
    sampling_policy_ref: "sampling.audit_links",
    signal_family_ref: "AUDIT_LINKS",
    label: "Audit-link join indices",
    retention_class_ref: "retention.telemetry.audit_link_30d",
    cardinality_budget_ref: "budget.collector_internal_dimensions",
    unsampled_fallback_requirements: [
      "If the join index degrades or expires, investigations still reconstruct from trace/log refs plus durable audit truth.",
    ],
    posture_variants: [
      {
        posture_ref: "default",
        collection_mode: "JOIN_INDEX_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "No approval required for derived join rows.",
        always_keep_conditions: ["derived join rows only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "elevated_debug",
        collection_mode: "JOIN_INDEX_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 120,
        approval_requirement: "No widening of payload; only additional join detail refs allowed.",
        always_keep_conditions: ["still derived join rows only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "incident",
        collection_mode: "JOIN_INDEX_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: 240,
        approval_requirement: "Investigation approval recorded in audit.",
        always_keep_conditions: ["still derived join rows only"],
        vendor_export_allowed: false,
      },
      {
        posture_ref: "privacy_constrained",
        collection_mode: "MINIMIZED_ALLOWLIST_ONLY",
        baseline_rate_percent_or_null: null,
        max_window_minutes_or_null: null,
        approval_requirement: "Automatic for privacy-limited investigations.",
        always_keep_conditions: ["derived join rows only"],
        vendor_export_allowed: false,
      },
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Audit-link rows accelerate queries but are not proof-of-record."],
  },
];

const resourceAttributePolicyBase: ResourceAttributePolicy = {
  required_attributes: [
    "service.name",
    "service.namespace",
    "deployment.environment.name",
    "service.instance.id",
    "taxat.release.candidate_hash",
    "taxat.build.artifact_digest",
    "taxat.schema.bundle_hash",
    "taxat.workspace.id",
  ],
  optional_attributes: [
    "taxat.manifest.lineage_trace_ref",
    "taxat.authority.binding_ref",
    "taxat.manual.checkpoint_ref",
    "telemetry.distro.name",
    "telemetry.distro.version",
  ],
  source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  notes: [
    "deployment.environment.name follows current OpenTelemetry resource guidance.",
    "Taxat-specific resource attributes carry release, schema, workspace, and lineage anchors that the corpus requires but standard semconv does not define.",
  ],
};

const correlationRowsBase: CorrelationSignalRow[] = [
  {
    correlation_policy_ref: "correlation.traces",
    signal_family_ref: "TRACES",
    label: "Trace joins",
    mandatory_keys: [
      "trace_id",
      "span_id",
      "tenant_id",
      "client_id",
      "manifest_id",
      "root_manifest_id",
      "workflow_item_id",
      "authority_operation_id",
      "submission_record_id",
      "request_hash",
      "access_binding_hash",
      "code_build_id",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
    ],
    audit_join_anchor_types: [
      "manifest_id",
      "submission_record_id",
      "authority_operation_id",
      "nightly_batch_run_ref + nightly_window_key",
    ],
    fallback_join_keys: [
      "error_id",
      "manifest_lineage_trace_ref",
      "workflow_item_id",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Authority traces also carry access-binding and authority-binding refs."],
  },
  {
    correlation_policy_ref: "correlation.metrics",
    signal_family_ref: "METRICS",
    label: "Metric joins",
    mandatory_keys: [
      "tenant_id",
      "client_id",
      "manifest_id",
      "authority_operation_id",
      "code_build_id",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
    ],
    audit_join_anchor_types: [
      "manifest_id",
      "authority_operation_id",
      "release candidate identity",
    ],
    fallback_join_keys: ["workflow_item_id", "request_hash"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Metrics stay aggregate-first and use opaque identifiers only."],
  },
  {
    correlation_policy_ref: "correlation.logs",
    signal_family_ref: "LOGS",
    label: "Log joins",
    mandatory_keys: [
      "trace_id",
      "error_id",
      "tenant_id",
      "client_id",
      "manifest_id",
      "workflow_item_id",
      "authority_operation_id",
      "submission_record_id",
      "retention_class",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
    ],
    audit_join_anchor_types: [
      "manifest_id",
      "submission_record_id",
      "workflow_item_id",
      "authority_operation_id",
    ],
    fallback_join_keys: ["request_hash", "access_binding_hash"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Error and fatal logs always carry error_id."],
  },
  {
    correlation_policy_ref: "correlation.security",
    signal_family_ref: "SECURITY",
    label: "Security joins",
    mandatory_keys: [
      "trace_id",
      "tenant_id",
      "client_id",
      "workflow_item_id",
      "authority_operation_id",
      "access_binding_hash",
      "authority_binding_ref",
      "accepted_risk_approval_id",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
    ],
    audit_join_anchor_types: [
      "StepUpRequired / StepUpSatisfied",
      "AuthorityBindingMismatchDetected",
      "approval audit evidence",
    ],
    fallback_join_keys: ["error_id", "manual_checkpoint_ref"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Security joins privilege access, authority edge, and approval evidence."],
  },
  {
    correlation_policy_ref: "correlation.privacy",
    signal_family_ref: "PRIVACY",
    label: "Privacy joins",
    mandatory_keys: [
      "trace_id",
      "tenant_id",
      "client_id",
      "manifest_id",
      "workflow_item_id",
      "retention_class",
      "request_hash",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
    ],
    audit_join_anchor_types: [
      "ErasureRequested / ErasureCompleted",
      "LegalHoldApplied / LegalHoldReleased",
      "RetentionLimited",
    ],
    fallback_join_keys: ["error_id", "authority_operation_id"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Privacy joins remain restricted and minimized."],
  },
  {
    correlation_policy_ref: "correlation.audit_links",
    signal_family_ref: "AUDIT_LINKS",
    label: "Audit-link joins",
    mandatory_keys: [
      "trace_id",
      "manifest_id",
      "submission_record_id",
      "authority_operation_id",
      "code_build_id",
      "taxat.release.candidate_hash",
      "taxat.schema.bundle_hash",
    ],
    required_resource_attributes: [
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
    ],
    audit_join_anchor_types: [
      "AuditInvestigationFrame",
      "ReleaseVerificationManifest",
      "RecoveryCheckpoint",
    ],
    fallback_join_keys: ["workflow_item_id", "error_id", "manifest_lineage_trace_ref"],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Join rows bridge telemetry investigation to durable audit, release, and recovery evidence."],
  },
];

const globalForbiddenFieldClasses = [
  "RAW_SECRETS",
  "FULL_TOKENS",
  "AUTHORITY_HEADERS",
  "AUTHORITY_PAYLOADS",
  "CALLBACK_SECRETS",
  "SESSION_COOKIES",
  "ONE_TIME_CODES",
  "DECLARATION_TEXT",
  "EVIDENCE_TEXT",
  "DOCUMENT_BODY_TEXT",
  "DOM_SNAPSHOT_PAYLOAD",
  "SCREENSHOT_BYTES",
  "CLIPBOARD_CONTENT",
  "KEYSTROKE_STREAM",
  "RAW_PERSONAL_IDENTIFIERS",
  "RAW_GOVERNMENT_IDENTIFIERS",
];

const globalHashOnlyFields = [
  "tenant_id",
  "client_id",
  "request_hash",
  "identity_namespace_hash",
  "duplicate_meaning_key",
  "access_binding_hash",
  "delivery_binding_hash",
];

const logFamilyRowsBase: LogFamilyAllowlistRow[] = [
  {
    log_family_ref: "OPERATIONAL_RUNTIME",
    label: "Operational runtime logs",
    allowed_top_level_fields: [
      "log_record_id",
      "timestamp",
      "observed_timestamp",
      "severity_text",
      "severity_number",
      "event_name",
      "log_family",
      "access_tier",
      "retention_class",
      "message_template",
      "structured_fields",
    ],
    allowed_attribute_keys: [
      "trace_id",
      "span_id",
      "tenant_id",
      "client_id",
      "manifest_id",
      "workflow_item_id",
      "authority_operation_id",
      "submission_record_id",
      "error_id",
      "service.name",
      "service.namespace",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
      "taxat.build.artifact_digest",
      "taxat.schema.bundle_hash",
      "request_hash",
      "access_binding_hash",
    ],
    hash_only_fields: globalHashOnlyFields,
    forbidden_field_classes: globalForbiddenFieldClasses,
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Operational logs stay message-template driven and code-first."],
  },
  {
    log_family_ref: "SECURITY_RUNTIME",
    label: "Security runtime logs",
    allowed_top_level_fields: [
      "log_record_id",
      "timestamp",
      "severity_text",
      "severity_number",
      "event_name",
      "log_family",
      "access_tier",
      "retention_class",
      "message_template",
      "structured_fields",
    ],
    allowed_attribute_keys: [
      "trace_id",
      "tenant_id",
      "client_id",
      "workflow_item_id",
      "authority_operation_id",
      "authority_binding_ref",
      "accepted_risk_approval_id",
      "access_binding_hash",
      "service.name",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
    ],
    hash_only_fields: globalHashOnlyFields,
    forbidden_field_classes: globalForbiddenFieldClasses,
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Security logs are more restricted than general runtime logs."],
  },
  {
    log_family_ref: "PRIVACY_RUNTIME",
    label: "Privacy runtime logs",
    allowed_top_level_fields: [
      "log_record_id",
      "timestamp",
      "severity_text",
      "severity_number",
      "event_name",
      "log_family",
      "access_tier",
      "retention_class",
      "message_template",
      "structured_fields",
    ],
    allowed_attribute_keys: [
      "trace_id",
      "tenant_id",
      "client_id",
      "manifest_id",
      "workflow_item_id",
      "request_hash",
      "service.name",
      "deployment.environment.name",
      "taxat.release.candidate_hash",
    ],
    hash_only_fields: globalHashOnlyFields,
    forbidden_field_classes: globalForbiddenFieldClasses,
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Privacy logs never serialize raw subject data or document contents."],
  },
  {
    log_family_ref: "CLIENT_RUNTIME",
    label: "Client runtime logs",
    allowed_top_level_fields: [
      "log_record_id",
      "timestamp",
      "severity_text",
      "severity_number",
      "event_name",
      "log_family",
      "access_tier",
      "retention_class",
      "message_template",
      "structured_fields",
    ],
    allowed_attribute_keys: [
      "trace_id",
      "shell.family_code",
      "route.family_code",
      "module.code",
      "resume.outcome",
      "opaque_object_ref",
      "delivery_binding_hash",
      "taxat.release.candidate_hash",
      "deployment.environment.name",
    ],
    hash_only_fields: globalHashOnlyFields,
    forbidden_field_classes: globalForbiddenFieldClasses,
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    notes: ["Client logs use coded route and posture fields only; no UI text or DOM content."],
  },
];

function createTelemetryManagedDefaultStatus(
  selectionStatus: TelemetrySelectionStatus,
): TelemetryManagedDefaultStatus {
  return selectionStatus === "PROVIDER_SELECTED"
    ? "READY_TO_ADOPT_PLATFORM_TELEMETRY_BACKENDS"
    : "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
}

function getSelectionStateForProvider(
  provider_family: TelemetryProviderFamily,
  selectionStatus: TelemetrySelectionStatus,
  selectedProvider: TelemetryProviderFamily | null,
): ProviderOptionSelectionState {
  if (selectionStatus === "PROVIDER_SELECTED" && selectedProvider === provider_family) {
    return "SELF_HOST_DECISION_REQUIRED";
  }
  return provider_family === "PLATFORM_NATIVE_OTLP_BACKENDS"
    ? "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    : "SELF_HOST_DECISION_REQUIRED";
}

function createProviderOptionRows(
  selectionStatus: TelemetrySelectionStatus,
  selectedProvider: TelemetryProviderFamily | null,
): ProviderOptionRow[] {
  return providerOptionRowsBase.map((row) => ({
    ...row,
    selection_state: getSelectionStateForProvider(
      row.provider_family,
      selectionStatus,
      selectedProvider,
    ),
    source_refs: cloneSourceRefs(row.source_refs),
    notes: [...row.notes],
  }));
}

function createEnvironmentRows(): EnvironmentTelemetryRow[] {
  return environmentRowsBase.map((row) => ({
    ...row,
    notes: [...row.notes],
    source_refs: cloneSourceRefs(row.source_refs),
  }));
}

function createCollectorTierRows(): CollectorTierRow[] {
  return collectorTierRowsBase.map((row) => ({
    ...row,
    signal_families: [...row.signal_families],
    processors: [...row.processors],
    notes: [...row.notes],
    source_refs: cloneSourceRefs(row.source_refs),
  }));
}

function createBackendRows(
  selectionStatus: TelemetrySelectionStatus,
  selectedProvider: TelemetryProviderFamily | null,
): BackendRow[] {
  return backendRowsBase.map((row) => {
    let bindingState = row.binding_state;
    if (
      selectionStatus === "PROVIDER_SELECTED" &&
      selectedProvider &&
      row.binding_state === "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    ) {
      bindingState = "ADOPTED_EXISTING";
    }

    return {
      ...row,
      binding_state: bindingState,
      signal_families: [...row.signal_families],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    };
  });
}

export function createSignalBackendCatalog(
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  selectedProvider: TelemetryProviderFamily | null = null,
): SignalBackendCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "signal_backend_catalog",
    selection_status: selectionStatus,
    managed_default_status: createTelemetryManagedDefaultStatus(selectionStatus),
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    provider_option_rows: createProviderOptionRows(selectionStatus, selectedProvider),
    collector_tier_rows: createCollectorTierRows(),
    backend_rows: createBackendRows(selectionStatus, selectedProvider),
    signal_rows: signalRowsBase.map((row) => ({
      ...row,
      secondary_backend_refs: [...row.secondary_backend_refs],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    truth_boundary_statement:
      "OpenTelemetry collection is the first-party observability substrate. The Sentry-compatible workspace from pc_0044 remains a secondary overlay and never replaces audit, release evidence, or restricted telemetry.",
    typed_gaps: [
      "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      "GAP_BACKEND_PRODUCT_UNRESOLVED_FOR_TRACES_METRICS_AND_LOGS",
      "GAP_RESTRICTED_SECURITY_AND_PRIVACY_STORE_PRODUCT_UNRESOLVED",
    ],
    notes: [
      "The catalog freezes signal routing, backend ownership boundaries, and vendor exportability before concrete backend products are chosen.",
      "Security, privacy, and audit-link lanes remain first-party only.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  };
}

export function createOtlpExportMatrix(
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): OtlpExportMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "otlp_export_matrix",
    selection_status: selectionStatus,
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    pipeline_rows: pipelineRowsBase.map((row) => ({
      ...row,
      signal_families: [...row.signal_families],
      processors: [...row.processors],
      export_target_refs: [...row.export_target_refs],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    service_family_rows: serviceFamilyRowsBase.map((row) => ({
      ...row,
      runtime_components: [...row.runtime_components],
      required_resource_attributes: [...row.required_resource_attributes],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    typed_gaps: [
      "GAP_CONCRETE_ENDPOINT_URLS_DEFERRED_UNTIL_PROVIDER_SELECTION",
      "GAP_AGENT_DAEMONSET_OR_SIDECAR_BINDING_DEFERRED_UNTIL_PLATFORM_RUNTIME_IS_FROZEN",
    ],
    notes: [
      "OTLP is the canonical ingest and interchange contract for traces, metrics, and logs.",
      "Priority traces, restricted security or privacy telemetry, and vendor overlay export stay separate at the gateway.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  };
}

export function createSamplingAndRetentionPolicy(
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): SamplingAndRetentionPolicy {
  return {
    schema_version: "1.0",
    policy_id: "sampling_and_retention_policy",
    selection_status: selectionStatus,
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    retention_class_rows: retentionClassRowsBase.map((row) => ({
      ...row,
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    cardinality_budget_rows: cardinalityBudgetRowsBase.map((row) => ({
      ...row,
      allowed_high_cardinality_dimensions: [...row.allowed_high_cardinality_dimensions],
      normalized_or_hashed_dimensions: [...row.normalized_or_hashed_dimensions],
      forbidden_dimensions: [...row.forbidden_dimensions],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    policy_rows: samplingPolicyRowsBase.map((row) => ({
      ...row,
      unsampled_fallback_requirements: [...row.unsampled_fallback_requirements],
      posture_variants: row.posture_variants.map((variant) => ({
        ...variant,
        always_keep_conditions: [...variant.always_keep_conditions],
      })),
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    truth_boundary_statement:
      "Sampling changes telemetry cost and queryability only. Audit evidence, authority proof, and release evidence stay durable and unsampled.",
    typed_gaps: [
      "GAP_BACKEND_STORAGE_CLASS_IMPLEMENTATION_DEFERRED_UNTIL_PROVIDER_SELECTION",
    ],
    notes: [
      "Debug and incident widening are time-bounded, auditable, and still bound by allowlist/redaction law.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  };
}

export function createCorrelationKeyPolicy(
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): CorrelationKeyPolicy {
  return {
    schema_version: "1.0",
    policy_id: "correlation_key_policy",
    selection_status: selectionStatus,
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    resource_attribute_policy: {
      ...resourceAttributePolicyBase,
      required_attributes: [...resourceAttributePolicyBase.required_attributes],
      optional_attributes: [...resourceAttributePolicyBase.optional_attributes],
      notes: [...resourceAttributePolicyBase.notes],
      source_refs: cloneSourceRefs(resourceAttributePolicyBase.source_refs),
    },
    signal_rows: correlationRowsBase.map((row) => ({
      ...row,
      mandatory_keys: [...row.mandatory_keys],
      required_resource_attributes: [...row.required_resource_attributes],
      audit_join_anchor_types: [...row.audit_join_anchor_types],
      fallback_join_keys: [...row.fallback_join_keys],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    truth_boundary_statement:
      "Correlation keys exist to join telemetry back to durable audit, workflow, authority, and release truth. They do not authorize telemetry to replace those stores.",
    typed_gaps: [
      "GAP_RUNTIME_INSTRUMENTATION_NOT_YET_ATTACHED_TO_THE_SHARED_RESOURCE_ATTRIBUTE_SET",
    ],
    notes: [
      "deployment.environment.name, service.name, service.namespace, release candidate hash, build digest, and schema bundle hash are the minimum shared resource identity for later runtime work.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  };
}

export function createLogScrubAndFieldAllowlist(
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): LogScrubAndFieldAllowlist {
  return {
    schema_version: "1.0",
    policy_id: "log_scrub_and_field_allowlist",
    selection_status: selectionStatus,
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    collector_enforcement: {
      allow_all_keys: false,
      required_processors: [
        "redaction",
        "filter",
        "attributes",
        "transform",
      ],
      blocked_value_patterns: [
        "bearer\\s+[A-Za-z0-9\\-._~+/]+=*",
        "password\\s*=",
        "BEGIN PRIVATE KEY",
        "authorization:",
        "set-cookie:",
      ],
      drop_on_forbidden_class: true,
    },
    global_forbidden_field_classes: [...globalForbiddenFieldClasses],
    global_hash_only_fields: [...globalHashOnlyFields],
    family_rows: logFamilyRowsBase.map((row) => ({
      ...row,
      allowed_top_level_fields: [...row.allowed_top_level_fields],
      allowed_attribute_keys: [...row.allowed_attribute_keys],
      hash_only_fields: [...row.hash_only_fields],
      forbidden_field_classes: [...row.forbidden_field_classes],
      notes: [...row.notes],
      source_refs: cloneSourceRefs(row.source_refs),
    })),
    truth_boundary_statement:
      "Collector redaction and allowlist processors are mandatory guardrails. If a field is not explicitly allowed, it is removed before storage or export.",
    typed_gaps: [
      "GAP_LANGUAGE_LEVEL_LOG_WRAPPERS_STILL_NEED_TO_CONSUME_THIS_ALLOWLIST",
    ],
    notes: [
      "The allowlist is stricter than generic operational logging because browser, native, authority, and privacy surfaces all carry regulated contexts.",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
  };
}

function atlasRow(
  row_ref: string,
  label: string,
  detail: string,
  badges: string[],
  inspector_title: string,
  inspector_lines: string[],
): TelemetryAtlasFocusRow {
  return {
    row_ref,
    label,
    detail,
    badges,
    inspector_title,
    inspector_lines,
  };
}

function getCorrelationSummary(
  row: CorrelationSignalRow,
): string[] {
  return [
    `Mandatory keys: ${row.mandatory_keys.join(", ")}`,
    `Audit join anchors: ${row.audit_join_anchor_types.join(", ")}`,
    `Fallback join keys: ${row.fallback_join_keys.join(", ")}`,
  ];
}

function getSamplingSummary(row: SignalSamplingPolicyRow): string {
  const defaultVariant = row.posture_variants.find(
    (variant) => variant.posture_ref === "default",
  );
  if (!defaultVariant) {
    return "Sampling posture unavailable";
  }
  if (defaultVariant.collection_mode === "TAIL_SAMPLE") {
    return `Tail sample ${defaultVariant.baseline_rate_percent_or_null}% generic traffic while always keeping error and compliance-critical traces`;
  }
  if (defaultVariant.collection_mode === "LOG_SEVERITY_GATE") {
    return "Warning+, error+, and typed lifecycle logs only";
  }
  if (defaultVariant.collection_mode === "JOIN_INDEX_ONLY") {
    return "Derived join rows only";
  }
  return "Always-on aggregate capture";
}

function getScrubSummary(
  family: SignalFamilyRef,
  logPolicy: LogScrubAndFieldAllowlist,
): string {
  if (family === "TRACES" || family === "METRICS" || family === "AUDIT_LINKS") {
    return "Gateway allowlist, redaction, and hash transforms apply before export.";
  }
  if (family === "SECURITY") {
    return "Restricted security allowlist with no vendor forwarding.";
  }
  if (family === "PRIVACY") {
    return "Restricted privacy allowlist with no raw subject data.";
  }
  const familyRow = logPolicy.family_rows.find(
    (row) => row.log_family_ref === "OPERATIONAL_RUNTIME",
  );
  return familyRow
    ? `Allowed keys: ${familyRow.allowed_attribute_keys.slice(0, 6).join(", ")}...`
    : "Structured allowlist enforced.";
}

export function createTelemetrySignalAtlasViewModel(): TelemetrySignalAtlasViewModel {
  const catalog = createSignalBackendCatalog();
  const exportMatrix = createOtlpExportMatrix();
  const sampling = createSamplingAndRetentionPolicy();
  const correlation = createCorrelationKeyPolicy();
  const logPolicy = createLogScrubAndFieldAllowlist();

  const families: TelemetryAtlasFamilyRow[] = catalog.signal_rows.map((signalRow) => {
    const correlationRow = correlation.signal_rows.find(
      (row) => row.signal_family_ref === signalRow.signal_family_ref,
    );
    const samplingRow = sampling.policy_rows.find(
      (row) => row.signal_family_ref === signalRow.signal_family_ref,
    );
    const primaryBackend = catalog.backend_rows.find(
      (row) => row.backend_ref === signalRow.primary_backend_ref,
    );
    const entryTier = catalog.collector_tier_rows.find(
      (row) => row.tier_ref === signalRow.collector_entrypoint_ref,
    );
    const pipelineRows = exportMatrix.pipeline_rows.filter((pipeline) =>
      pipeline.signal_families.includes(signalRow.signal_family_ref),
    );

    assert(correlationRow, `Missing correlation row for ${signalRow.signal_family_ref}`);
    assert(samplingRow, `Missing sampling row for ${signalRow.signal_family_ref}`);
    assert(primaryBackend, `Missing backend row ${signalRow.primary_backend_ref}`);
    assert(entryTier, `Missing collector tier ${signalRow.collector_entrypoint_ref}`);

    return {
      family_ref: signalRow.signal_family_ref,
      label: signalRow.label,
      summary: signalRow.notes[0] ?? signalRow.label,
      exportability_label:
        signalRow.vendor_exportability === "FIRST_PARTY_ONLY"
          ? "First-party only"
          : "Allowlisted vendor overlay",
      primary_backend_label: primaryBackend.label,
      retention_class_label:
        sampling.retention_class_rows.find(
          (row) => row.retention_class_ref === signalRow.retention_class_ref,
        )?.label ?? signalRow.retention_class_ref,
      sampling_summary: getSamplingSummary(samplingRow),
      scrub_summary: getScrubSummary(signalRow.signal_family_ref, logPolicy),
      required_key_labels: [...correlationRow.mandatory_keys.slice(0, 8)],
      emission_rows: [
        atlasRow(
          `emission.${signalRow.signal_family_ref.toLowerCase()}.services`,
          "Runtime emitters",
          exportMatrix.service_family_rows
            .filter((row) => {
              const pipeline = exportMatrix.pipeline_rows.find(
                (candidate) => candidate.pipeline_ref === row.pipeline_ref,
              );
              return pipeline?.signal_families.includes(signalRow.signal_family_ref);
            })
            .map((row) => row.label)
            .join(" · "),
          ["Runtime"],
          "Runtime emitters",
          exportMatrix.service_family_rows
            .filter((row) => {
              const pipeline = exportMatrix.pipeline_rows.find(
                (candidate) => candidate.pipeline_ref === row.pipeline_ref,
              );
              return pipeline?.signal_families.includes(signalRow.signal_family_ref);
            })
            .map((row) => `${row.label}: ${row.unsampled_fallback}`),
        ),
        atlasRow(
          `emission.${signalRow.signal_family_ref.toLowerCase()}.resource`,
          "Resource identity",
          correlation.resource_attribute_policy.required_attributes.join(" · "),
          ["Identity"],
          "Resource identity",
          [
            `Required resource attributes: ${correlation.resource_attribute_policy.required_attributes.join(", ")}`,
            `Optional resource attributes: ${correlation.resource_attribute_policy.optional_attributes.join(", ")}`,
          ],
        ),
      ],
      collector_rows: [
        atlasRow(
          `collector.${signalRow.signal_family_ref.toLowerCase()}.entry`,
          entryTier.label,
          entryTier.resilience_posture,
          ["Gateway"],
          entryTier.label,
          [
            `Deployment scope: ${entryTier.deployment_scope}`,
            `Processors: ${entryTier.processors.join(", ")}`,
            `Ingress mode: ${entryTier.ingress_mode}`,
          ],
        ),
        ...pipelineRows.map((pipeline) =>
          atlasRow(
            `collector.${signalRow.signal_family_ref.toLowerCase()}.${pipeline.pipeline_ref}`,
            pipeline.label,
            pipeline.batching_posture,
            ["Pipeline"],
            pipeline.label,
            [
              `Processors: ${pipeline.processors.join(", ")}`,
              `Export targets: ${pipeline.export_target_refs.join(", ")}`,
              ...pipeline.notes,
            ],
          ),
        ),
      ],
      backend_rows: [
        atlasRow(
          `backend.${signalRow.signal_family_ref.toLowerCase()}.primary`,
          primaryBackend.label,
          primaryBackend.access_posture,
          [
            primaryBackend.binding_state === "ADOPTED_EXISTING" ? "Adopted" : "Blocked",
          ],
          primaryBackend.label,
          [
            `Ownership boundary: ${primaryBackend.ownership_boundary}`,
            `Storage class: ${primaryBackend.storage_class}`,
            `Binding state: ${primaryBackend.binding_state}`,
            ...primaryBackend.notes,
          ],
        ),
        ...signalRow.secondary_backend_refs.map((backendRef) => {
          const backend = catalog.backend_rows.find((row) => row.backend_ref === backendRef);
          assert(backend, `Missing secondary backend ${backendRef}`);
          return atlasRow(
            `backend.${signalRow.signal_family_ref.toLowerCase()}.${backendRef}`,
            backend.label,
            backend.access_posture,
            ["Secondary"],
            backend.label,
            [
              `Ownership boundary: ${backend.ownership_boundary}`,
              `Storage class: ${backend.storage_class}`,
              ...backend.notes,
            ],
          );
        }),
      ],
      correlation_rows: [
        atlasRow(
          `correlation.${signalRow.signal_family_ref.toLowerCase()}.keys`,
          "Mandatory keys",
          correlationRow.mandatory_keys.join(" · "),
          ["Join"],
          "Mandatory keys",
          getCorrelationSummary(correlationRow),
        ),
        atlasRow(
          `correlation.${signalRow.signal_family_ref.toLowerCase()}.lineage`,
          "Lineage strip",
          signalRow.lineage_strip_label,
          ["Audit"],
          "Lineage strip",
          [
            signalRow.lineage_strip_label,
            "Telemetry remains queryable without replacing append-only audit evidence.",
          ],
        ),
      ],
      lineage_strip: signalRow.lineage_strip_label,
      source_refs: cloneSourceRefs(signalRow.source_refs),
      inspector_notes: [
        ...signalRow.notes,
        ...samplingRow.notes,
        ...correlationRow.notes,
      ],
    };
  });

  return {
    routeId: "telemetry-signal-atlas",
    providerDisplayName: "OpenTelemetry Signal Fabric",
    providerMonogram: "OTL",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    managedDefaultStatus: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    topologyChipLabel: "Hybrid agent + gateway OTLP",
    postureChipLabel: "Telemetry primary / audit separate",
    summary:
      "One environment-scoped OTLP gateway receives direct SDK and workload-agent traffic, applies redaction, sampling, routing, and backpressure policy, and then sends each signal family to its first-party backend or a strictly allowlisted secondary overlay.",
    notes: [
      "The atlas emphasizes signal law, correlation, and export boundaries rather than vendor console widgets.",
      "Exporter failure degrades telemetry only; runtime correctness and mandatory audit capture continue independently.",
      "Security, privacy, and audit-link lanes remain first-party only.",
    ],
    environments: environmentRowsBase.map((row) => ({
      environment_ref: row.environment_ref,
      label: row.label,
      collector_namespace_prefix: row.collector_namespace_prefix,
      environment_gateway_alias: row.environment_gateway_alias,
      authority_lane_posture: row.authority_lane_posture,
    })),
    families,
  };
}

export function createObservabilityInventoryTemplate(
  runContext: MinimalRunContext = {
    runId: "run-fixture-telemetry-topology-001",
    workspaceId: "wk-fixture-telemetry-topology",
    operatorIdentityAlias: "ops.telemetry.fixture",
  },
  selectionStatus: TelemetrySelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  selectedProvider: TelemetryProviderFamily | null = null,
): ObservabilityInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "observability_inventory",
    provider_id: TELEMETRY_PROVIDER_ID,
    flow_id: TELEMETRY_FLOW_ID,
    policy_version: TELEMETRY_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: selectionStatus,
    managed_default_status: createTelemetryManagedDefaultStatus(selectionStatus),
    selected_provider_family_or_null: selectedProvider,
    topology_mode:
      "HYBRID_DIRECT_SDK_AND_WORKLOAD_AGENT_TO_ENVIRONMENT_GATEWAY_WITH_SIGNAL_SPECIFIC_FIRST_PARTY_BACKENDS",
    truth_boundary_statement:
      "OpenTelemetry traces, metrics, and logs are first-party operational telemetry. Audit, release evidence, and authority truth remain in their dedicated stores.",
    provider_option_rows: createProviderOptionRows(selectionStatus, selectedProvider),
    environment_rows: createEnvironmentRows(),
    collector_tier_rows: createCollectorTierRows(),
    backend_rows: createBackendRows(selectionStatus, selectedProvider),
    signal_backend_catalog_ref: "config/observability/signal_backend_catalog.json",
    otlp_export_matrix_ref: "config/observability/otlp_export_matrix.json",
    sampling_and_retention_policy_ref:
      "config/observability/sampling_and_retention_policy.json",
    correlation_key_policy_ref:
      "config/observability/correlation_key_policy.json",
    log_scrub_and_field_allowlist_ref:
      "config/observability/log_scrub_and_field_allowlist.json",
    monitoring_overlay_refs: [
      "config/observability/error_monitoring_project_catalog.json",
      "config/observability/telemetry_vs_audit_boundary.json",
    ],
    source_refs: cloneSourceRefs(commonTelemetrySourceRefs),
    typed_gaps: [
      "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      "GAP_FIRST_PARTY_TRACE_METRIC_AND_LOG_PRODUCT_UNRESOLVED",
      "GAP_RUNTIME_SDK_DEFAULTS_STILL_NEED_TO_IMPORT_SHARED_RESOURCE_ATTRIBUTES",
    ],
    notes: [
      "No live provider mutation occurred.",
      "Inventory stores only sanitized logical refs, backend ownership posture, and gateway topology.",
    ],
    last_verified_at: TELEMETRY_LAST_VERIFIED_AT,
  };
}

function stableInventoryComparable(
  inventory: ObservabilityInventoryTemplate,
): Record<string, unknown> {
  return {
    ...inventory,
    run_id: "__RUN__",
    workspace_id: "__WORKSPACE__",
    operator_identity_alias: "__OPERATOR__",
    last_verified_at: "__VERIFIED_AT__",
  };
}

export function validateSignalBackendCatalog(catalog: SignalBackendCatalog): void {
  const tierRefs = new Set(catalog.collector_tier_rows.map((row) => row.tier_ref));
  const backendRefs = new Set(catalog.backend_rows.map((row) => row.backend_ref));
  const samplingPolicyRefs = new Set(
    createSamplingAndRetentionPolicy().policy_rows.map((row) => row.sampling_policy_ref),
  );
  const correlationPolicyRefs = new Set(
    createCorrelationKeyPolicy().signal_rows.map((row) => row.correlation_policy_ref),
  );
  const familyRefs = new Set<SignalFamilyRef>();

  catalog.signal_rows.forEach((row) => {
    assert(!familyRefs.has(row.signal_family_ref), `Duplicate signal family ${row.signal_family_ref}`);
    familyRefs.add(row.signal_family_ref);
    assert(
      tierRefs.has(row.collector_entrypoint_ref),
      `Unknown collector entrypoint ${row.collector_entrypoint_ref}`,
    );
    assert(
      backendRefs.has(row.primary_backend_ref),
      `Unknown backend ref ${row.primary_backend_ref}`,
    );
    row.secondary_backend_refs.forEach((backendRef) => {
      assert(backendRefs.has(backendRef), `Unknown secondary backend ${backendRef}`);
    });
    assert(
      samplingPolicyRefs.has(row.sampling_policy_ref),
      `Missing sampling policy ${row.sampling_policy_ref}`,
    );
    assert(
      correlationPolicyRefs.has(row.correlation_policy_ref),
      `Missing correlation policy ${row.correlation_policy_ref}`,
    );
    if (row.signal_family_ref !== "TRACES") {
      assert(
        row.vendor_exportability === "FIRST_PARTY_ONLY",
        `Only traces may export to the vendor overlay by default`,
      );
    }
  });

  assert(
    familyRefs.size === 6,
    `Expected 6 signal families, received ${familyRefs.size}`,
  );
}

export function validateOtlpExportMatrix(matrix: OtlpExportMatrix): void {
  const pipelineRefs = new Set(matrix.pipeline_rows.map((row) => row.pipeline_ref));
  const budgetRefs = new Set(
    createSamplingAndRetentionPolicy().cardinality_budget_rows.map(
      (row) => row.cardinality_budget_ref,
    ),
  );

  matrix.service_family_rows.forEach((row) => {
    assert(pipelineRefs.has(row.pipeline_ref), `Unknown pipeline ${row.pipeline_ref}`);
    assert(
      budgetRefs.has(row.cardinality_budget_ref),
      `Unknown budget ${row.cardinality_budget_ref}`,
    );
    assert(
      row.required_resource_attributes.includes("service.name"),
      `${row.service_family_ref} missing service.name`,
    );
    assert(
      row.required_resource_attributes.includes("deployment.environment.name"),
      `${row.service_family_ref} missing deployment.environment.name`,
    );
  });

  matrix.pipeline_rows.forEach((row) => {
    assert(
      row.processors.includes("batch"),
      `Pipeline ${row.pipeline_ref} must batch`,
    );
    if (row.pipeline_ref === "pipeline.gateway.priority_traces") {
      assert(
        row.processors.includes("tail_sampling"),
        `Priority trace pipeline must tail sample`,
      );
    }
  });
}

export function validateSamplingAndRetentionPolicy(
  policy: SamplingAndRetentionPolicy,
): void {
  const retentionRefs = new Set(policy.retention_class_rows.map((row) => row.retention_class_ref));
  const budgetRefs = new Set(policy.cardinality_budget_rows.map((row) => row.cardinality_budget_ref));

  policy.policy_rows.forEach((row) => {
    assert(
      retentionRefs.has(row.retention_class_ref),
      `Unknown retention ref ${row.retention_class_ref}`,
    );
    assert(
      budgetRefs.has(row.cardinality_budget_ref),
      `Unknown cardinality budget ${row.cardinality_budget_ref}`,
    );
    const defaultVariant = row.posture_variants.find(
      (variant) => variant.posture_ref === "default",
    );
    assert(defaultVariant, `Missing default posture for ${row.signal_family_ref}`);
    if (row.signal_family_ref === "TRACES") {
      assert(
        defaultVariant.collection_mode === "TAIL_SAMPLE",
        "Trace default posture must use tail sampling",
      );
      assert(
        defaultVariant.always_keep_conditions.some((condition) =>
          condition.includes("authority"),
        ),
        "Trace default posture must always keep authority-critical traces",
      );
    }
  });
}

export function validateCorrelationKeyPolicy(policy: CorrelationKeyPolicy): void {
  const seen = new Set<SignalFamilyRef>();
  policy.signal_rows.forEach((row) => {
    assert(!seen.has(row.signal_family_ref), `Duplicate correlation row ${row.signal_family_ref}`);
    seen.add(row.signal_family_ref);
    assert(
      row.required_resource_attributes.includes("service.name"),
      `${row.signal_family_ref} missing service.name resource attribute`,
    );
    assert(
      row.required_resource_attributes.includes("deployment.environment.name"),
      `${row.signal_family_ref} missing deployment.environment.name`,
    );
    if (row.signal_family_ref === "TRACES" || row.signal_family_ref === "LOGS") {
      assert(
        row.mandatory_keys.includes("trace_id"),
        `${row.signal_family_ref} must include trace_id`,
      );
    }
  });
}

export function validateLogScrubAndFieldAllowlist(
  policy: LogScrubAndFieldAllowlist,
): void {
  policy.family_rows.forEach((row) => {
    globalForbiddenFieldClasses.forEach((forbidden) => {
      assert(
        row.forbidden_field_classes.includes(forbidden),
        `${row.log_family_ref} missing forbidden field class ${forbidden}`,
      );
      assert(
        !row.allowed_attribute_keys.includes(forbidden),
        `${row.log_family_ref} illegally allows forbidden class ${forbidden}`,
      );
    });
    assert(
      row.allowed_top_level_fields.includes("message_template"),
      `${row.log_family_ref} missing message_template`,
    );
  });

  assert(
    policy.collector_enforcement.required_processors.includes("redaction"),
    "Collector enforcement must require redaction processor",
  );
}

function createObservabilityRunbookMarkdown(): string {
  const catalog = createSignalBackendCatalog();
  const sampling = createSamplingAndRetentionPolicy();

  const providerLines = catalog.provider_option_rows
    .map(
      (row) =>
        `- \`${row.provider_family}\` - ${row.topology_summary} (${row.selection_state})`,
    )
    .join("\n");

  const signalLines = catalog.signal_rows
    .map((row) => `- **${row.label}** -> \`${row.primary_backend_ref}\``)
    .join("\n");

  const retentionLines = sampling.retention_class_rows
    .map(
      (row) =>
        `- \`${row.retention_class_ref}\` - hot ${row.hot_window}, warm ${row.warm_window}, ${row.access_posture}`,
    )
    .join("\n");

  return `# OpenTelemetry Stack Runbook

This pack freezes Taxat's first-party OpenTelemetry collection posture for traces, metrics, logs, security telemetry, privacy telemetry, and telemetry-to-audit join indices.

## Scope

- hybrid direct-SDK plus workload-agent ingest
- environment-scoped OTLP gateway collectors
- first-party trace, metric, log, security, privacy, and join backends
- explicit vendor overlay bridge to the Sentry-compatible monitoring workspace from \`pc_0044\`
- shared resource-attribute, correlation-key, sampling, retention, and scrub policy

## Authoritative inputs

- \`Algorithm/observability_and_audit_contract.md\`
- \`Algorithm/retention_error_and_observability_contract.md\`
- \`Algorithm/security_and_runtime_hardening_contract.md\`
- \`Algorithm/deployment_and_resilience_contract.md\`
- \`Algorithm/verification_and_release_gates.md\`
- prior outputs from \`pc_0044\`, \`pc_0050\`, \`pc_0051\`, \`pc_0052\`, and \`pc_0053\`

## Deliverables

- [signal_backend_catalog.json](/Users/test/Code/taxat_/config/observability/signal_backend_catalog.json)
- [otlp_export_matrix.json](/Users/test/Code/taxat_/config/observability/otlp_export_matrix.json)
- [sampling_and_retention_policy.json](/Users/test/Code/taxat_/config/observability/sampling_and_retention_policy.json)
- [correlation_key_policy.json](/Users/test/Code/taxat_/config/observability/correlation_key_policy.json)
- [log_scrub_and_field_allowlist.json](/Users/test/Code/taxat_/config/observability/log_scrub_and_field_allowlist.json)
- [observability_inventory.template.json](/Users/test/Code/taxat_/data/provisioning/observability_inventory.template.json)

## Topology posture

- OTLP is the canonical ingest and interchange contract.
- Browser and native shells may emit directly to the environment gateway.
- Server workloads use workload-local agents where enrichment or local buffering is needed.
- Environment gateways own sampling, redaction, routing, batching, and exporter backpressure policy.
- Vendor monitoring is secondary-only and receives allowlisted traces or release overlays only.
- Audit, release evidence, and authority truth stay in first-party control, audit, object, and verification stores.

## Provider options reviewed

${providerLines}

## Signal family routing

${signalLines}

## Retention classes

${retentionLines}

## Exporter failure posture

1. Runtime correctness does not depend on telemetry backend availability.
2. Mandatory audit evidence and authority history continue through their first-party control paths even if telemetry exporters fail.
3. Gateway exporters use bounded queues, retry with backoff, and WAL-backed persistence on selected hops.
4. Vendor overlay exporters are non-blocking and may degrade independently of first-party telemetry backends.

## Debug and incident widening

- Elevated debug posture is time-bounded and requires explicit approval plus expiry.
- Incident posture may widen sampling or log capture only for affected service families.
- All widened posture still obeys the allowlist and redaction rules.
- No widened posture may add raw secrets, raw authority payloads, declaration text, evidence text, or DOM/screenshot capture.

## Typed gaps

- Concrete first-party trace, metric, log, security, and privacy backend products remain blocked by the broader platform-provider choice.
- Runtime SDK defaults still need to import the shared resource-attribute and log-allowlist contract.
- The inventory is therefore portable and adoption-safe, not a live control-plane mutation.
`;
}

export async function provisionOtelCollectionAndBackends(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  existingInventoryPath?: string;
  providerFamilySelection?: TelemetryProviderFamily | null;
}): Promise<ProvisionTelemetryResult> {
  const selectionStatus: TelemetrySelectionStatus = options.providerFamilySelection
    ? "PROVIDER_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";
  const selectedProvider = options.providerFamilySelection ?? null;

  const signalBackendCatalog = createSignalBackendCatalog(selectionStatus, selectedProvider);
  const otlpExportMatrix = createOtlpExportMatrix(selectionStatus);
  const samplingAndRetentionPolicy = createSamplingAndRetentionPolicy(selectionStatus);
  const correlationKeyPolicy = createCorrelationKeyPolicy(selectionStatus);
  const logScrubAndFieldAllowlist = createLogScrubAndFieldAllowlist(selectionStatus);

  validateSignalBackendCatalog(signalBackendCatalog);
  validateOtlpExportMatrix(otlpExportMatrix);
  validateSamplingAndRetentionPolicy(samplingAndRetentionPolicy);
  validateCorrelationKeyPolicy(correlationKeyPolicy);
  validateLogScrubAndFieldAllowlist(logScrubAndFieldAllowlist);

  const inventory = createObservabilityInventoryTemplate(
    options.runContext,
    selectionStatus,
    selectedProvider,
  );

  let adoptionStep: ProvisionTelemetryStep = {
    step_id: "telemetry.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized observability inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as ObservabilityInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "OTEL_TOPOLOGY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          inventory,
          signalBackendCatalog,
          otlpExportMatrix,
          samplingAndRetentionPolicy,
          correlationKeyPolicy,
          logScrubAndFieldAllowlist,
          atlasViewModel: createTelemetrySignalAtlasViewModel(),
          steps: [
            {
              step_id: "telemetry.resolve-provider-selection",
              title: "Resolve telemetry backend family",
              status: options.providerFamilySelection
                ? "SUCCEEDED"
                : "BLOCKED_BY_POLICY",
              reason: options.providerFamilySelection
                ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
                : "Provider family remains unresolved, so the flow stays in portable blocked-contract mode.",
            },
            {
              step_id: "telemetry.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing observability inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because observability topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "telemetry.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "telemetry.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized observability inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  const steps: ProvisionTelemetryStep[] = [
    {
      step_id: "telemetry.resolve-provider-selection",
      title: "Resolve telemetry backend family",
      status: options.providerFamilySelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.providerFamilySelection
        ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
        : "The dependency register still marks first-party trace, metric, and log backends as a procurement or platform choice, so live backend creation remains blocked.",
    },
    {
      step_id: "telemetry.freeze-signal-backend-catalog",
      title: "Freeze signal backend catalog",
      status: "SUCCEEDED",
      reason:
        "Signal families now have explicit first-party backends, restricted export posture, and secondary overlay rules.",
    },
    {
      step_id: "telemetry.freeze-otlp-export-matrix",
      title: "Freeze OTLP export matrix",
      status: "SUCCEEDED",
      reason:
        "Runtime component families now bind to gateway pipelines, processors, batching posture, and export targets.",
    },
    {
      step_id: "telemetry.freeze-sampling-retention-and-cardinality",
      title: "Freeze sampling, retention, and cardinality policy",
      status: "SUCCEEDED",
      reason:
        "Sampling, debug widening, retention windows, and high-cardinality controls are now machine-readable per signal family.",
    },
    {
      step_id: "telemetry.freeze-correlation-and-log-scrub",
      title: "Freeze correlation and log scrub policy",
      status: "SUCCEEDED",
      reason:
        "Mandatory keys, resource attributes, audit joins, allowlists, hash-only fields, and forbidden classes are now explicit.",
    },
    adoptionStep,
    {
      step_id: "telemetry.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason:
        "Sanitized inventory persisted with logical refs, environment partitions, and backend ownership posture only.",
    },
  ];

  return {
    outcome: options.providerFamilySelection
      ? "OTEL_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "OTEL_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    inventory,
    signalBackendCatalog,
    otlpExportMatrix,
    samplingAndRetentionPolicy,
    correlationKeyPolicy,
    logScrubAndFieldAllowlist,
    atlasViewModel: createTelemetrySignalAtlasViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const signalBackendCatalog = createSignalBackendCatalog();
  const otlpExportMatrix = createOtlpExportMatrix();
  const samplingAndRetentionPolicy = createSamplingAndRetentionPolicy();
  const correlationKeyPolicy = createCorrelationKeyPolicy();
  const logScrubAndFieldAllowlist = createLogScrubAndFieldAllowlist();
  const inventory = createObservabilityInventoryTemplate();
  const atlasViewModel = createTelemetrySignalAtlasViewModel();
  const runbookMarkdown = createObservabilityRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "config/observability/signal_backend_catalog.json",
      `${JSON.stringify(signalBackendCatalog, null, 2)}\n`,
    ],
    [
      "config/observability/otlp_export_matrix.json",
      `${JSON.stringify(otlpExportMatrix, null, 2)}\n`,
    ],
    [
      "config/observability/sampling_and_retention_policy.json",
      `${JSON.stringify(samplingAndRetentionPolicy, null, 2)}\n`,
    ],
    [
      "config/observability/correlation_key_policy.json",
      `${JSON.stringify(correlationKeyPolicy, null, 2)}\n`,
    ],
    [
      "config/observability/log_scrub_and_field_allowlist.json",
      `${JSON.stringify(logScrubAndFieldAllowlist, null, 2)}\n`,
    ],
    [
      "data/provisioning/observability_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/opentelemetry_stack_runbook.md", runbookMarkdown],
  ];

  for (const [relativePath, content] of writes) {
    const targetPath = path.join(repoRoot, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
  }

  const sampleRunPath = path.join(
    repoRoot,
    "automation/provisioning/report_viewer/data/sample_run.json",
  );
  const sampleRun = JSON.parse(await readFile(sampleRunPath, "utf8")) as Record<
    string,
    unknown
  >;
  sampleRun.telemetrySignalAtlas = atlasViewModel;
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
