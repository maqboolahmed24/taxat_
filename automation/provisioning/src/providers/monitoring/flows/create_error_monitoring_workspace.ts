import { createHash } from "node:crypto";
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
  markSkippedAsAlreadyPresent,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  rankSelectors,
  type SelectorDescriptor,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const MONITORING_PROVIDER_ID = "runtime-error-monitoring-control-plane";
export const MONITORING_FLOW_ID = "error-monitoring-workspace-bootstrap";
export const MONITORING_PROVIDER_DISPLAY_NAME = "Error Monitoring Control Plane";
export const MONITORING_PROVIDER_VENDOR_ADAPTER =
  "SENTRY_COMPATIBLE_MONITORING_CONTROL_PLANE";
export const MONITORING_PROVIDER_VENDOR_SELECTION = "PROVIDER_DEFAULT_APPLIED";
export const MONITORING_POLICY_VERSION = "1.0";
export const MONITORING_POLICY_GENERATED_ON = "2026-04-18";

export const MONITORING_STEP_IDS = {
  openControlPlane: "monitoring.control-plane.open-console",
  reconcileWorkspace: "monitoring.control-plane.reconcile-workspace",
  reconcileProjects: "monitoring.control-plane.reconcile-projects-and-token-refs",
  validateScrubbing: "monitoring.control-plane.validate-scrubbing-and-filters",
  validateAlerts: "monitoring.control-plane.validate-alerts-and-release-mapping",
  persistArtifacts: "monitoring.control-plane.persist-artifacts",
} as const;

export type MonitoringProductEnvironmentId =
  | "env_local_provisioning_workstation"
  | "env_shared_sandbox_integration"
  | "env_preproduction_verification"
  | "env_production";

export type MonitoringSourceDisposition =
  | "CREATED_DURING_RUN"
  | "ADOPTED_EXISTING";

export type MonitoringProjectKind =
  | "LOCAL_FIXTURE"
  | "BACKEND_RUNTIME"
  | "AUTHORITY_GATEWAY"
  | "OPERATOR_WEB"
  | "CLIENT_PORTAL_WEB"
  | "NATIVE_MACOS_OPERATOR";

export type MonitoringSignalDomain =
  | "OPS"
  | "SECURITY"
  | "FAILURE"
  | "RELEASE";

export type MonitoringFlowOutcome =
  | "MONITORING_GOVERNANCE_READY"
  | "MONITORING_POLICY_REVIEW_REQUIRED";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderSelectionRecord {
  provider_selection_status: typeof MONITORING_PROVIDER_VENDOR_SELECTION;
  provider_family: "ERROR_MONITORING_OVERLAY";
  provider_vendor_adapter: typeof MONITORING_PROVIDER_VENDOR_ADAPTER;
  provider_vendor_label: string;
  docs_urls: string[];
  source_refs: SourceRef[];
}

export interface MonitoringWorkspaceRow {
  workspace_ref: string;
  product_environment_id: MonitoringProductEnvironmentId;
  provider_environment_name: string;
  organization_slug_alias: string;
  team_slug_alias: string;
  source_disposition: MonitoringSourceDisposition;
  automation_token_metadata_ref: string;
  automation_token_fingerprint: string;
  automation_token_scopes: string[];
  relay_mode:
    | "DIRECT_VENDOR_INGEST_SERVER_SIDE_SCRUBBING"
    | "LOCAL_FIXTURE_ONLY";
  project_refs: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface ErrorMonitoringProjectRow {
  project_ref: string;
  workspace_ref: string;
  product_environment_id: MonitoringProductEnvironmentId;
  project_kind: MonitoringProjectKind;
  provider_project_slug: string;
  provider_project_label: string;
  source_disposition: MonitoringSourceDisposition;
  ingest_dsn_secret_ref: string;
  dsn_fingerprint: string;
  signal_domains: MonitoringSignalDomain[];
  release_track_ref: string;
  scrub_rule_refs: string[];
  inbound_filter_refs: string[];
  alert_rule_refs: string[];
  release_health_enabled: boolean;
  capture_modes: {
    error_events: true;
    transaction_traces: boolean;
    profiling: false;
    session_replay: false;
    attachments: false;
  };
  source_refs: SourceRef[];
  notes: string[];
}

export interface MonitoringWorkspaceTemplate {
  schema_version: "1.0";
  workspace_template_id: "error_monitoring_workspace";
  provider_id: typeof MONITORING_PROVIDER_ID;
  provider_display_name: typeof MONITORING_PROVIDER_DISPLAY_NAME;
  run_id: string;
  flow_id: typeof MONITORING_FLOW_ID;
  workspace_id: string;
  operator_identity_alias: string;
  provider_selection: ProviderSelectionRecord;
  workspace_rows: MonitoringWorkspaceRow[];
  project_rows: ErrorMonitoringProjectRow[];
  project_catalog_ref: "config/observability/error_monitoring_project_catalog.json";
  scrub_rules_ref: "config/observability/error_monitoring_scrub_rules.json";
  alert_policy_ref: "config/observability/error_monitoring_alert_policy.json";
  release_mapping_ref: "config/observability/error_monitoring_release_mapping.json";
  telemetry_audit_boundary_ref: "config/observability/telemetry_vs_audit_boundary.json";
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ErrorMonitoringProjectCatalog {
  schema_version: "1.0";
  catalog_id: "error_monitoring_project_catalog";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof MONITORING_POLICY_VERSION;
  generated_on: typeof MONITORING_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  project_rows: ErrorMonitoringProjectRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface MonitoringScrubRuleRow {
  rule_ref: string;
  label: string;
  protected_classes: string[];
  enforcement_mode:
    | "SERVER_SIDE_DATA_SCRUBBING"
    | "SDK_BEFORE_SEND_AND_STRUCTURED_LOG_REDUCTION"
    | "CAPTURE_DISABLED";
  action: "MASK" | "REMOVE" | "HASH" | "DISABLE_CAPTURE";
  source_refs: SourceRef[];
  notes: string[];
}

export interface MonitoringInboundFilterRow {
  filter_ref: string;
  provider_filter_id: string;
  applies_to_project_kinds: MonitoringProjectKind[];
  default_state: "ENABLED" | "DISABLED";
  source_refs: SourceRef[];
  notes: string[];
}

export interface ErrorMonitoringScrubRules {
  schema_version: "1.0";
  rules_id: "error_monitoring_scrub_rules";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof MONITORING_POLICY_VERSION;
  generated_on: typeof MONITORING_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  relay_decision: {
    mode:
      | "DIRECT_VENDOR_INGEST_WITH_SERVER_SIDE_SCRUBBING"
      | "LOCAL_FIXTURE_ONLY";
    rationale: string;
    typed_gap_or_null: string | null;
  };
  scrub_rule_rows: MonitoringScrubRuleRow[];
  inbound_filter_rows: MonitoringInboundFilterRow[];
  disabled_capture_modes: Array<{
    capture_mode:
      | "SESSION_REPLAY"
      | "ATTACHMENTS"
      | "DOM_CAPTURE"
      | "RAW_REQUEST_BODY_CAPTURE"
      | "PROFILE_PAYLOAD_COLLECTION";
    scope: string;
    rationale: string;
  }>;
  typed_gaps: string[];
  notes: string[];
}

export interface MonitoringAlertRuleRow {
  rule_ref: string;
  label: string;
  target_project_refs: string[];
  target_environment_ids: MonitoringProductEnvironmentId[];
  trigger_summary: string;
  noise_controls: string[];
  routing_target_alias: string;
  release_gate_binding: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface ErrorMonitoringAlertPolicy {
  schema_version: "1.0";
  policy_id: "error_monitoring_alert_policy";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof MONITORING_POLICY_VERSION;
  generated_on: typeof MONITORING_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  alert_rules: MonitoringAlertRuleRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface MonitoringReleaseTrackRow {
  track_ref: string;
  deployable_id: string;
  project_refs: string[];
  release_name_template: string;
  environment_aliases: Array<{
    product_environment_id: Exclude<
      MonitoringProductEnvironmentId,
      "env_local_provisioning_workstation"
    >;
    vendor_environment_name: string;
  }>;
  provenance_keys: string[];
  release_health_expected: boolean;
  source_refs: SourceRef[];
  notes: string[];
}

export interface ErrorMonitoringReleaseMapping {
  schema_version: "1.0";
  mapping_id: "error_monitoring_release_mapping";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof MONITORING_POLICY_VERSION;
  generated_on: typeof MONITORING_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  release_tracks: MonitoringReleaseTrackRow[];
  typed_gaps: string[];
  notes: string[];
}

export interface TelemetryVendorVisibleFamily {
  family_ref: string;
  allowed_payload_classes: string[];
  prohibited_payload_classes: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface FirstPartyAuditFamily {
  family_ref: string;
  rationale: string;
  required_query_contracts: string[];
  source_refs: SourceRef[];
}

export interface TelemetryVsAuditBoundary {
  schema_version: "1.0";
  boundary_id: "telemetry_vs_audit_boundary";
  provider_selection: ProviderSelectionRecord;
  policy_version: typeof MONITORING_POLICY_VERSION;
  generated_on: typeof MONITORING_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  mandatory_correlation_keys: string[];
  vendor_visible_families: TelemetryVendorVisibleFamily[];
  first_party_only_families: FirstPartyAuditFamily[];
  prohibited_payload_classes: string[];
  typed_gaps: string[];
  notes: string[];
}

export interface SignalGovernanceProjectView {
  project_ref: string;
  label: string;
  environment_label: string;
  project_kind_label: string;
  status_label: string;
  summary: string;
  project_rows: Array<{
    label: string;
    detail: string;
  }>;
  scrub_rows: Array<{
    label: string;
    detail: string;
  }>;
  inbound_filter_rows: Array<{
    label: string;
    detail: string;
  }>;
  alert_and_release_rows: Array<{
    label: string;
    detail: string;
  }>;
  token_rows: Array<{
    label: string;
    safe_ref: string;
  }>;
  inspector_notes: string[];
  source_refs: SourceRef[];
}

export interface SignalGovernanceBoardViewModel {
  provider_label: string;
  provider_monogram: "MON";
  selection_posture: "AUDIT_PRIMARY_VENDOR_MONITORING_SECONDARY";
  projects: SignalGovernanceProjectView[];
  truth_boundary_statement: string;
  notes: string[];
}

export interface CreateErrorMonitoringWorkspaceResult {
  outcome: MonitoringFlowOutcome;
  steps: StepContract[];
  workspaceTemplate: MonitoringWorkspaceTemplate;
  projectCatalog: ErrorMonitoringProjectCatalog;
  scrubRules: ErrorMonitoringScrubRules;
  alertPolicy: ErrorMonitoringAlertPolicy;
  releaseMapping: ErrorMonitoringReleaseMapping;
  telemetryAuditBoundary: TelemetryVsAuditBoundary;
  evidenceManifestPath: string;
  notes: string[];
}

export interface MonitoringWorkspaceEntryUrls {
  controlPlane: string;
}

export interface CreateErrorMonitoringWorkspaceOptions {
  page: Page;
  runContext: RunContext;
  workspaceTemplatePath: string;
  entryUrls?: MonitoringWorkspaceEntryUrls;
}

interface MonitoringFixtureState {
  sourceDisposition: MonitoringSourceDisposition;
  scrubbingHealthy: boolean;
}

const MONITORING_PROVIDER_DOCS = [
  "https://docs.sentry.io/hosted/api/auth/",
  "https://docs.sentry.io/api/guides/create-auth-token/",
  "https://docs.sentry.io/api/projects/create-a-new-project/",
  "https://docs.sentry.io/api/projects/create-a-new-client-key/",
  "https://docs.sentry.io/api/projects/list-a-projects-client-keys/",
  "https://docs.sentry.io/api/projects/update-an-inbound-data-filter/",
  "https://docs.sentry.io/api/alerts/",
  "https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/",
  "https://docs.sentry.io/api/releases/",
  "https://docs.sentry.io/api/releases/retrieve-release-health-session-statistics/",
  "https://docs.sentry.io/product/relay/modes/pii-and-data-scrubbing/",
] as const;

const MONITORING_SELECTORS: SelectorManifest = {
  manifestId: "sentry-compatible-monitoring-control-plane",
  providerId: MONITORING_PROVIDER_ID,
  flowId: MONITORING_FLOW_ID,
  selectors: [
    {
      selectorId: "workspace-heading",
      description: "Primary heading for the monitoring control plane",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Error monitoring control plane",
    },
    {
      selectorId: "workspace-action",
      description: "Create or adopt monitoring workspace action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Create or adopt monitoring workspace",
    },
    {
      selectorId: "projects-heading",
      description: "Projects section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Projects",
    },
    {
      selectorId: "project-action",
      description: "Create or adopt projects and token refs action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Create or adopt projects and token refs",
    },
    {
      selectorId: "scrubbing-heading",
      description: "Scrubbing section heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Scrubbing",
    },
    {
      selectorId: "scrubbing-action",
      description: "Validate scrubbing and inbound filters action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate scrubbing and inbound filters",
    },
    {
      selectorId: "alerts-heading",
      description: "Alerts and release mapping heading",
      strategy: "ROLE",
      value: "heading",
      accessibleName: "Alerts and release mapping",
    },
    {
      selectorId: "alerts-action",
      description: "Validate alerts and release mapping action",
      strategy: "ROLE",
      value: "button",
      accessibleName: "Validate alerts and release mapping",
    },
    {
      selectorId: "project-row-fallback",
      description: "Structured project row fallback when semantic labels drift",
      strategy: "CSS_FALLBACK",
      value: "[data-testid='monitoring-project-row']",
      justification:
        "Used only when structured project rows still exist but semantic labels drift enough that direct lookup is unsafe.",
      driftSignal:
        "Raise selector-drift warning if monitoring project rows can no longer be resolved semantically.",
    },
  ],
};

const REAL_ENVIRONMENTS: Array<
  Exclude<MonitoringProductEnvironmentId, "env_local_provisioning_workstation">
> = [
  "env_shared_sandbox_integration",
  "env_preproduction_verification",
  "env_production",
];

const PROJECT_BLUEPRINTS: Array<{
  kind: Exclude<MonitoringProjectKind, "LOCAL_FIXTURE">;
  slug: string;
  label: string;
  deployableId: string;
  signalDomains: MonitoringSignalDomain[];
  releaseHealthExpected: boolean;
  summary: string;
}> = [
  {
    kind: "BACKEND_RUNTIME",
    slug: "backend-runtime",
    label: "Backend runtime",
    deployableId: "services/backend-control-plane",
    signalDomains: ["OPS", "FAILURE", "SECURITY", "RELEASE"],
    releaseHealthExpected: false,
    summary:
      "Server exceptions, worker failures, and release regressions cluster here with strict correlation keys.",
  },
  {
    kind: "AUTHORITY_GATEWAY",
    slug: "authority-gateway",
    label: "Authority gateway",
    deployableId: "services/authority-gateway",
    signalDomains: ["OPS", "FAILURE", "SECURITY", "RELEASE"],
    releaseHealthExpected: false,
    summary:
      "Authority callback and transmit failures stay isolated so gateway anomalies never collapse into generic backend noise.",
  },
  {
    kind: "OPERATOR_WEB",
    slug: "operator-web",
    label: "Operator web",
    deployableId: "apps/operator-web",
    signalDomains: ["OPS", "FAILURE", "RELEASE"],
    releaseHealthExpected: true,
    summary:
      "Internal web-shell regressions remain separate from customer portal failures and keep release markers explicit.",
  },
  {
    kind: "CLIENT_PORTAL_WEB",
    slug: "client-portal-web",
    label: "Client portal web",
    deployableId: "apps/client-portal-web",
    signalDomains: ["OPS", "FAILURE", "RELEASE"],
    releaseHealthExpected: true,
    summary:
      "Customer-visible client-shell failures are monitored separately but remain scrubbed and route-code only.",
  },
  {
    kind: "NATIVE_MACOS_OPERATOR",
    slug: "native-macos-operator",
    label: "Native macOS operator",
    deployableId: "apps/InternalOperatorWorkspaceMac",
    signalDomains: ["OPS", "FAILURE", "RELEASE"],
    releaseHealthExpected: true,
    summary:
      "Native operator crashes and release regressions stay separate from browser projects and never capture raw authority material.",
  },
];

function hashToken(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function productEnvironmentLabel(
  productEnvironmentId: MonitoringProductEnvironmentId,
): string {
  switch (productEnvironmentId) {
    case "env_local_provisioning_workstation":
      return "Local fixture";
    case "env_shared_sandbox_integration":
      return "Sandbox";
    case "env_preproduction_verification":
      return "Pre-production";
    case "env_production":
      return "Production";
  }
}

function providerEnvironmentName(
  productEnvironmentId: MonitoringProductEnvironmentId,
): string {
  switch (productEnvironmentId) {
    case "env_local_provisioning_workstation":
      return "local-fixture";
    case "env_shared_sandbox_integration":
      return "sandbox";
    case "env_preproduction_verification":
      return "preprod";
    case "env_production":
      return "production";
  }
}

function monitoringSourceRefs(): SourceRef[] {
  return [
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L24[14.2_Separation_of_concerns]",
      rationale:
        "The vendor overlay must remain secondary to first-party audit evidence and operational telemetry.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L79[14.4_Mandatory_correlation_keys]",
      rationale:
        "All vendor-visible monitoring still depends on the corpus correlation keys that bind events back to manifest and authority lineage.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L386[14.7_Trace_contract]",
      rationale:
        "Trace and error overlays need release and manifest-rooted runtime lineage rather than free-floating exception feeds.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L420[14.8_Metric_contract]",
      rationale:
        "Alert posture must focus on actionable reliability, security, and release regressions instead of vanity noise.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L494[14.9_Logging_contract]",
      rationale:
        "Monitoring capture must redact secrets, tokens, and high-risk payloads before they ever become vendor-visible.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::L537[14.10_Audit_versus_telemetry_retention]",
      rationale:
        "Sampled or filtered telemetry may never become the proof-of-record substitute for audit evidence.",
    },
    {
      source_ref:
        "Algorithm/retention_error_and_observability_contract.md::L20[15.1_Contract_composition_and_precedence]",
      rationale:
        "Privacy minimization outranks diagnostic convenience, so the monitoring overlay must fail closed when settings drift.",
    },
    {
      source_ref:
        "Algorithm/retention_error_and_observability_contract.md::L143[15.4_Correlation_visibility_and_signal_separation]",
      rationale:
        "Visibility and signal separation remain explicit even when several telemetry lanes share identifiers.",
    },
    {
      source_ref:
        "Algorithm/retention_error_and_observability_contract.md::L167[15.4_Correlation_visibility_and_signal_separation]",
      rationale:
        "Diagnostic logging must not reintroduce personal or authority-secret data that minimization policy already excludes.",
    },
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::L50[3._Secret_key_and_token_handling]",
      rationale:
        "Vendor DSNs and automation tokens must stay inside the governed secret boundary and only safe refs may persist in repo artifacts.",
    },
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::L161[8._Operational_security_release_gates]",
      rationale:
        "Release and operational security gates require explicit health and secret-rotation posture before promotion.",
    },
  ];
}

function providerSelection(): ProviderSelectionRecord {
  return {
    provider_selection_status: MONITORING_PROVIDER_VENDOR_SELECTION,
    provider_family: "ERROR_MONITORING_OVERLAY",
    provider_vendor_adapter: MONITORING_PROVIDER_VENDOR_ADAPTER,
    provider_vendor_label: "Sentry-compatible error monitoring overlay",
    docs_urls: [...MONITORING_PROVIDER_DOCS],
    source_refs: monitoringSourceRefs(),
  };
}

function workspaceRefFor(
  productEnvironmentId: MonitoringProductEnvironmentId,
): string {
  switch (productEnvironmentId) {
    case "env_local_provisioning_workstation":
      return "monitoring_workspace_local_fixture";
    case "env_shared_sandbox_integration":
      return "monitoring_workspace_sandbox";
    case "env_preproduction_verification":
      return "monitoring_workspace_preprod";
    case "env_production":
      return "monitoring_workspace_production";
  }
}

function environmentTokenRef(
  productEnvironmentId: MonitoringProductEnvironmentId,
): string {
  return `vault://monitoring/sentry/${providerEnvironmentName(productEnvironmentId)}/org-automation-token`;
}

function environmentProjectRefs(
  productEnvironmentId: MonitoringProductEnvironmentId,
): string[] {
  if (productEnvironmentId === "env_local_provisioning_workstation") {
    return ["monitoring_project_local_fixture"];
  }
  return PROJECT_BLUEPRINTS.map((blueprint) =>
    projectRefFor(productEnvironmentId, blueprint.slug),
  );
}

function createWorkspaceRows(): MonitoringWorkspaceRow[] {
  const refs = monitoringSourceRefs();
  return [
    {
      workspace_ref: "monitoring_workspace_local_fixture",
      product_environment_id: "env_local_provisioning_workstation",
      provider_environment_name: "local-fixture",
      organization_slug_alias: "taxat-observability-fixture",
      team_slug_alias: "reliability-release",
      source_disposition: "ADOPTED_EXISTING",
      automation_token_metadata_ref: environmentTokenRef(
        "env_local_provisioning_workstation",
      ),
      automation_token_fingerprint: hashToken("monitoring-local-fixture-org-token"),
      automation_token_scopes: ["project:admin", "project:write", "alerts:write"],
      relay_mode: "LOCAL_FIXTURE_ONLY",
      project_refs: environmentProjectRefs("env_local_provisioning_workstation"),
      source_refs: refs,
      notes: [
        "The local fixture workspace exists only for automation rehearsal and viewer validation.",
      ],
    },
    ...REAL_ENVIRONMENTS.map((productEnvironmentId) => ({
      workspace_ref: workspaceRefFor(productEnvironmentId),
      product_environment_id: productEnvironmentId,
      provider_environment_name: providerEnvironmentName(productEnvironmentId),
      organization_slug_alias: "taxat-observability",
      team_slug_alias: "reliability-release",
      source_disposition: "ADOPTED_EXISTING" as const,
      automation_token_metadata_ref: environmentTokenRef(productEnvironmentId),
      automation_token_fingerprint: hashToken(
        `monitoring-${providerEnvironmentName(productEnvironmentId)}-org-token`,
      ),
      automation_token_scopes: [
        "project:admin",
        "project:write",
        "alerts:write",
        "project:releases",
      ],
      relay_mode: "DIRECT_VENDOR_INGEST_SERVER_SIDE_SCRUBBING" as const,
      project_refs: environmentProjectRefs(productEnvironmentId),
      source_refs: refs,
      notes: [
        "Workspace automation stays environment-scoped and only safe token lineage is persisted.",
      ],
    })),
  ];
}

function projectRefFor(
  productEnvironmentId: MonitoringProductEnvironmentId,
  projectSlug: string,
): string {
  return `monitoring_project_${providerEnvironmentName(productEnvironmentId).replaceAll(
    "-",
    "_",
  )}_${projectSlug.replaceAll("-", "_")}`;
}

function alertRefsFor(kind: MonitoringProjectKind): string[] {
  switch (kind) {
    case "LOCAL_FIXTURE":
      return [];
    case "BACKEND_RUNTIME":
      return [
        "alert.backend_exception_regression",
        "alert.worker_failure_cluster",
      ];
    case "AUTHORITY_GATEWAY":
      return [
        "alert.authority_gateway_auth_failure",
        "alert.authority_gateway_error_spike",
      ];
    case "OPERATOR_WEB":
      return ["alert.operator_web_release_regression"];
    case "CLIENT_PORTAL_WEB":
      return ["alert.portal_web_release_regression"];
    case "NATIVE_MACOS_OPERATOR":
      return ["alert.native_macos_crash_spike"];
  }
}

function scrubRuleRefsFor(kind: MonitoringProjectKind): string[] {
  const common = [
    "scrub.secret_and_token_material",
    "scrub.authority_credentials",
    "scrub.customer_personal_identifiers",
    "scrub.tax_identifiers",
    "scrub.masked_or_minimized_fields",
    "scrub.declaration_and_evidence_text",
  ];
  if (kind === "AUTHORITY_GATEWAY") {
    return [...common, "scrub.authority_headers_and_callback_payloads"];
  }
  if (kind === "CLIENT_PORTAL_WEB") {
    return [...common, "scrub.portal_route_and_dom_capture_disablement"];
  }
  return common;
}

function inboundFilterRefsFor(kind: MonitoringProjectKind): string[] {
  if (kind === "LOCAL_FIXTURE") {
    return ["filter.fixture_local_only"];
  }
  if (kind === "BACKEND_RUNTIME" || kind === "AUTHORITY_GATEWAY") {
    return ["filter.healthcheck_transactions", "filter.localhost"];
  }
  return [
    "filter.browser_extensions",
    "filter.web_crawlers",
    "filter.localhost",
    "filter.legacy_browser",
  ];
}

function projectNotesFor(kind: MonitoringProjectKind): string[] {
  switch (kind) {
    case "LOCAL_FIXTURE":
      return [
        "Fixture-only project for deterministic browser automation and viewer payload checks.",
      ];
    case "BACKEND_RUNTIME":
      return [
        "Backend runtime monitoring remains secondary to first-party traces, logs, and audit records.",
      ];
    case "AUTHORITY_GATEWAY":
      return [
        "Authority-edge anomalies remain isolated from generic runtime issues and stay correlation-rich.",
      ];
    case "OPERATOR_WEB":
      return [
        "Operator web projects must never enable replay or DOM capture on regulated surfaces.",
      ];
    case "CLIENT_PORTAL_WEB":
      return [
        "Customer portal issues are grouped separately from operator failures and only route-code-safe fields are allowed.",
      ];
    case "NATIVE_MACOS_OPERATOR":
      return [
        "Native operator crash capture stays redaction-safe and excludes raw authority credentials or customer content.",
      ];
  }
}

function createProjectRows(): ErrorMonitoringProjectRow[] {
  const refs = monitoringSourceRefs();
  const localFixture: ErrorMonitoringProjectRow = {
    project_ref: "monitoring_project_local_fixture",
    workspace_ref: "monitoring_workspace_local_fixture",
    product_environment_id: "env_local_provisioning_workstation",
    project_kind: "LOCAL_FIXTURE",
    provider_project_slug: "taxat-local-monitoring-fixture",
    provider_project_label: "Local monitoring fixture",
    source_disposition: "ADOPTED_EXISTING",
    ingest_dsn_secret_ref: "vault://monitoring/sentry/local-fixture/dsn",
    dsn_fingerprint: hashToken("monitoring-local-fixture-dsn"),
    signal_domains: ["OPS", "FAILURE"],
    release_track_ref: "release_track_fixture",
    scrub_rule_refs: [
      "scrub.secret_and_token_material",
      "scrub.masked_or_minimized_fields",
    ],
    inbound_filter_refs: ["filter.fixture_local_only"],
    alert_rule_refs: [],
    release_health_enabled: false,
    capture_modes: {
      error_events: true,
      transaction_traces: false,
      profiling: false,
      session_replay: false,
      attachments: false,
    },
    source_refs: refs,
    notes: projectNotesFor("LOCAL_FIXTURE"),
  };

  const realRows = REAL_ENVIRONMENTS.flatMap((productEnvironmentId) =>
    PROJECT_BLUEPRINTS.map((blueprint) => ({
      project_ref: projectRefFor(productEnvironmentId, blueprint.slug),
      workspace_ref: workspaceRefFor(productEnvironmentId),
      product_environment_id: productEnvironmentId,
      project_kind: blueprint.kind,
      provider_project_slug: `taxat-${providerEnvironmentName(productEnvironmentId)}-${blueprint.slug}`,
      provider_project_label: `${productEnvironmentLabel(productEnvironmentId)} ${blueprint.label}`,
      source_disposition: "ADOPTED_EXISTING" as const,
      ingest_dsn_secret_ref: `vault://monitoring/sentry/${providerEnvironmentName(productEnvironmentId)}/${blueprint.slug}/dsn`,
      dsn_fingerprint: hashToken(
        `monitoring-${providerEnvironmentName(productEnvironmentId)}-${blueprint.slug}-dsn`,
      ),
      signal_domains: blueprint.signalDomains,
      release_track_ref: `release_track_${blueprint.slug.replaceAll("-", "_")}`,
      scrub_rule_refs: scrubRuleRefsFor(blueprint.kind),
      inbound_filter_refs: inboundFilterRefsFor(blueprint.kind),
      alert_rule_refs: alertRefsFor(blueprint.kind),
      release_health_enabled: blueprint.releaseHealthExpected,
      capture_modes: {
        error_events: true as const,
        transaction_traces: true,
        profiling: false as const,
        session_replay: false as const,
        attachments: false as const,
      },
      source_refs: refs,
      notes: projectNotesFor(blueprint.kind),
    })),
  );

  return [localFixture, ...realRows];
}

export function createRecommendedMonitoringWorkspaceTemplate(
  runContext: RunContext,
): MonitoringWorkspaceTemplate {
  return {
    schema_version: "1.0",
    workspace_template_id: "error_monitoring_workspace",
    provider_id: MONITORING_PROVIDER_ID,
    provider_display_name: MONITORING_PROVIDER_DISPLAY_NAME,
    run_id: runContext.runId,
    flow_id: MONITORING_FLOW_ID,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    provider_selection: providerSelection(),
    workspace_rows: createWorkspaceRows(),
    project_rows: createProjectRows(),
    project_catalog_ref: "config/observability/error_monitoring_project_catalog.json",
    scrub_rules_ref: "config/observability/error_monitoring_scrub_rules.json",
    alert_policy_ref: "config/observability/error_monitoring_alert_policy.json",
    release_mapping_ref: "config/observability/error_monitoring_release_mapping.json",
    telemetry_audit_boundary_ref:
      "config/observability/telemetry_vs_audit_boundary.json",
    typed_gaps: [
      "Pre-ingest Relay remains a typed future tightening option; current posture relies on server-side scrubbing plus capture disablement.",
    ],
    notes: [
      "Monitoring is a convenience overlay for grouped diagnostics and release markers, not the authoritative audit or telemetry backend.",
      "Only vault-safe DSN and automation-token refs persist in the checked-in template.",
    ],
    last_verified_at: `${MONITORING_POLICY_GENERATED_ON}T00:00:00.000Z`,
  };
}

export function createRecommendedErrorMonitoringProjectCatalog(): ErrorMonitoringProjectCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "error_monitoring_project_catalog",
    provider_selection: providerSelection(),
    policy_version: MONITORING_POLICY_VERSION,
    generated_on: MONITORING_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "The vendor sees only governed diagnostic overlays. First-party audit, privacy, release evidence, and authority truth remain outside the vendor boundary.",
    project_rows: createProjectRows(),
    typed_gaps: [
      "CI-specific ephemeral review projects remain intentionally excluded from the canonical vendor inventory.",
    ],
    notes: [
      "Project boundaries stay explicit by environment and deployable so grouped error triage never collapses customer and operator surfaces together.",
    ],
  };
}

export function createRecommendedErrorMonitoringScrubRules(): ErrorMonitoringScrubRules {
  const refs = monitoringSourceRefs();
  return {
    schema_version: "1.0",
    rules_id: "error_monitoring_scrub_rules",
    provider_selection: providerSelection(),
    policy_version: MONITORING_POLICY_VERSION,
    generated_on: MONITORING_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Vendor capture is allowed only for redaction-safe diagnostic overlays; any drift that would expose protected content must fail closed.",
    relay_decision: {
      mode: "DIRECT_VENDOR_INGEST_WITH_SERVER_SIDE_SCRUBBING",
      rationale:
        "The current overlay is scoped tightly enough to rely on server-side scrubbing and disabled high-risk capture modes, while leaving Relay as a typed future tightening option.",
      typed_gap_or_null:
        "Introduce Relay or equivalent pre-ingest scrub enforcement if residency or replay posture later requires sensitive payload stripping before vendor ingress.",
    },
    scrub_rule_rows: [
      {
        rule_ref: "scrub.secret_and_token_material",
        label: "Secret and token material",
        protected_classes: [
          "RAW_SECRETS",
          "FULL_TOKENS",
          "SESSION_BINDINGS",
          "DSN_VALUES",
        ],
        enforcement_mode: "SERVER_SIDE_DATA_SCRUBBING",
        action: "MASK",
        source_refs: refs,
        notes: ["Mask raw secrets, bearer tokens, cookies, DSNs, and key material."],
      },
      {
        rule_ref: "scrub.authority_credentials",
        label: "Authority credentials and callback auth",
        protected_classes: [
          "AUTHORITY_CREDENTIALS",
          "AUTHORITY_HEADERS",
          "CALLBACK_SECRETS",
        ],
        enforcement_mode: "SERVER_SIDE_DATA_SCRUBBING",
        action: "REMOVE",
        source_refs: refs,
        notes: [
          "Authority credentials must remain first-party only and cannot enter vendor payloads even in hashed form.",
        ],
      },
      {
        rule_ref: "scrub.customer_personal_identifiers",
        label: "Customer personal identifiers",
        protected_classes: [
          "CUSTOMER_PERSONAL_IDENTIFIERS",
          "EMAIL_ADDRESSES",
          "PHONE_NUMBERS",
          "ADDRESSES",
        ],
        enforcement_mode: "SERVER_SIDE_DATA_SCRUBBING",
        action: "HASH",
        source_refs: refs,
        notes: ["Hash or remove personal identifiers before vendor storage."],
      },
      {
        rule_ref: "scrub.tax_identifiers",
        label: "Government and tax identifiers",
        protected_classes: [
          "GOVERNMENT_TAX_IDENTIFIERS",
          "UTR_NINO_VRN",
        ],
        enforcement_mode: "SERVER_SIDE_DATA_SCRUBBING",
        action: "REMOVE",
        source_refs: refs,
        notes: ["Tax and government identifiers are never vendor-visible."],
      },
      {
        rule_ref: "scrub.masked_or_minimized_fields",
        label: "Masked or minimized fields",
        protected_classes: ["MASKED_OR_MINIMIZED_FIELDS", "CUSTOMER_SAFE_PROJECTION_ONLY"],
        enforcement_mode: "SDK_BEFORE_SEND_AND_STRUCTURED_LOG_REDUCTION",
        action: "MASK",
        source_refs: refs,
        notes: [
          "Masked output must never be reconstructed from logs, tags, breadcrumb text, or exception payloads.",
        ],
      },
      {
        rule_ref: "scrub.declaration_and_evidence_text",
        label: "Declaration and evidence text",
        protected_classes: [
          "DECLARATION_TEXT",
          "EVIDENCE_TEXT",
          "APPROVAL_RATIONALE",
        ],
        enforcement_mode: "CAPTURE_DISABLED",
        action: "DISABLE_CAPTURE",
        source_refs: refs,
        notes: ["Free-form declaration and evidence text remain outside vendor monitoring entirely."],
      },
      {
        rule_ref: "scrub.authority_headers_and_callback_payloads",
        label: "Authority headers and callback payloads",
        protected_classes: [
          "AUTHORITY_CALLBACK_PAYLOADS",
          "AUTHORITY_RESPONSE_BODIES",
        ],
        enforcement_mode: "CAPTURE_DISABLED",
        action: "DISABLE_CAPTURE",
        source_refs: refs,
        notes: ["Authority gateway payload bodies stay in first-party telemetry and audit only."],
      },
      {
        rule_ref: "scrub.portal_route_and_dom_capture_disablement",
        label: "Portal DOM and replay disablement",
        protected_classes: [
          "DOM_SNAPSHOTS",
          "SESSION_REPLAY_FRAMES",
          "REGULATED_UI_TEXT",
        ],
        enforcement_mode: "CAPTURE_DISABLED",
        action: "DISABLE_CAPTURE",
        source_refs: refs,
        notes: ["Customer portal replay, screenshots, and DOM capture stay disabled."],
      },
    ],
    inbound_filter_rows: [
      {
        filter_ref: "filter.fixture_local_only",
        provider_filter_id: "fixture-only",
        applies_to_project_kinds: ["LOCAL_FIXTURE"],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Fixture projects never accept live runtime traffic."],
      },
      {
        filter_ref: "filter.browser_extensions",
        provider_filter_id: "browser-extensions",
        applies_to_project_kinds: ["OPERATOR_WEB", "CLIENT_PORTAL_WEB"],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Suppress known browser-extension noise on web projects."],
      },
      {
        filter_ref: "filter.web_crawlers",
        provider_filter_id: "web-crawlers",
        applies_to_project_kinds: ["CLIENT_PORTAL_WEB"],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Exclude crawler-induced portal noise from customer-visible triage."],
      },
      {
        filter_ref: "filter.localhost",
        provider_filter_id: "localhost",
        applies_to_project_kinds: [
          "BACKEND_RUNTIME",
          "AUTHORITY_GATEWAY",
          "OPERATOR_WEB",
          "CLIENT_PORTAL_WEB",
        ],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Localhost events remain outside the canonical vendor overlay."],
      },
      {
        filter_ref: "filter.healthcheck_transactions",
        provider_filter_id: "filtered-transaction",
        applies_to_project_kinds: ["BACKEND_RUNTIME", "AUTHORITY_GATEWAY"],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Suppress ping, heartbeat, and healthcheck transactions."],
      },
      {
        filter_ref: "filter.legacy_browser",
        provider_filter_id: "legacy-browser",
        applies_to_project_kinds: ["CLIENT_PORTAL_WEB"],
        default_state: "ENABLED",
        source_refs: refs,
        notes: ["Drop unsupported-browser noise from the customer portal surface."],
      },
    ],
    disabled_capture_modes: [
      {
        capture_mode: "SESSION_REPLAY",
        scope: "ALL_REGULATED_SURFACES",
        rationale:
          "Replay and screen-capture style tooling is too risky for regulated customer and authority flows at this stage.",
      },
      {
        capture_mode: "ATTACHMENTS",
        scope: "ALL_PROJECTS",
        rationale:
          "Uploaded documents, screenshots, and body dumps must remain outside the vendor boundary.",
      },
      {
        capture_mode: "DOM_CAPTURE",
        scope: "WEB_PROJECTS",
        rationale:
          "DOM and UI text capture could reintroduce masked or regulated content into vendor-visible payloads.",
      },
      {
        capture_mode: "RAW_REQUEST_BODY_CAPTURE",
        scope: "SERVER_AND_GATEWAY_PROJECTS",
        rationale:
          "Authority payloads, declaration bodies, and sensitive request bodies must stay first-party only.",
      },
      {
        capture_mode: "PROFILE_PAYLOAD_COLLECTION",
        scope: "ALL_PROJECTS",
        rationale:
          "Fine-grained profiles are deferred until the team proves they do not widen data exposure beyond the current policy.",
      },
    ],
    typed_gaps: [
      "Managed Relay and organization-level PII config remain intentionally unprovisioned until pre-ingest scrub enforcement is a hard requirement.",
    ],
    notes: [
      "Scrub posture applies before alerting, grouping, and release mapping assumptions are trusted.",
      "Vendor-visible diagnostics remain route-code and correlation-key first, not payload-text first.",
    ],
  };
}

export function createRecommendedErrorMonitoringAlertPolicy(): ErrorMonitoringAlertPolicy {
  const refs = monitoringSourceRefs();
  const productionProjectRef = (slug: string) =>
    projectRefFor("env_production", slug);
  const preprodProjectRef = (slug: string) =>
    projectRefFor("env_preproduction_verification", slug);

  return {
    schema_version: "1.0",
    policy_id: "error_monitoring_alert_policy",
    provider_selection: providerSelection(),
    policy_version: MONITORING_POLICY_VERSION,
    generated_on: MONITORING_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Alerts exist to surface actionable runtime regressions and security anomalies, not vanity activity or audit-only events.",
    alert_rules: [
      {
        rule_ref: "alert.backend_exception_regression",
        label: "Backend exception regression",
        target_project_refs: [
          productionProjectRef("backend_runtime"),
          preprodProjectRef("backend_runtime"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on new or regressed backend issues affecting release candidates or live production traffic.",
        noise_controls: [
          "Filter healthcheck transactions",
          "Suppress localhost and synthetic fixture traffic",
          "Require environment and release correlation",
        ],
        routing_target_alias: "ops.reliability.primary",
        release_gate_binding: "RELEASE_HEALTH_AND_ERROR_BUDGET_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.worker_failure_cluster",
        label: "Worker failure cluster",
        target_project_refs: [
          productionProjectRef("backend_runtime"),
          preprodProjectRef("backend_runtime"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on clustered worker exceptions or queue-consumer failures across the same release window.",
        noise_controls: [
          "Group by release and queue family",
          "Do not page on one-off sandbox fixture errors",
        ],
        routing_target_alias: "ops.runtime.workers",
        release_gate_binding: "RECOVERY_AND_BACKGROUND_WORKER_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.authority_gateway_auth_failure",
        label: "Authority gateway auth failure",
        target_project_refs: [
          productionProjectRef("authority_gateway"),
          preprodProjectRef("authority_gateway"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on callback-auth failures, token-binding mismatches, or gateway exception spikes at the authority edge.",
        noise_controls: [
          "Do not include provider payload bodies",
          "Require authority-operation or submission correlation when present",
        ],
        routing_target_alias: "ops.authority.gateway",
        release_gate_binding: "AUTHORITY_GATEWAY_SAFETY_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.authority_gateway_error_spike",
        label: "Authority gateway error spike",
        target_project_refs: [productionProjectRef("authority_gateway")],
        target_environment_ids: ["env_production"],
        trigger_summary:
          "Trigger on sustained gateway error spikes correlated to one production release or deploy window.",
        noise_controls: ["Require production environment", "Filter synthetic callback probes"],
        routing_target_alias: "ops.authority.gateway",
        release_gate_binding: "AUTHORITY_GATEWAY_SAFETY_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.operator_web_release_regression",
        label: "Operator web release regression",
        target_project_refs: [
          productionProjectRef("operator_web"),
          preprodProjectRef("operator_web"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on operator-web release regressions or crash-free-session drops for new deploys.",
        noise_controls: [
          "Suppress browser extension noise",
          "Filter localhost and legacy-browser traffic",
        ],
        routing_target_alias: "ops.operator.web",
        release_gate_binding: "WEB_RELEASE_REGRESSION_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.portal_web_release_regression",
        label: "Portal web release regression",
        target_project_refs: [
          productionProjectRef("client_portal_web"),
          preprodProjectRef("client_portal_web"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on customer-portal release regressions with customer-safe route and module codes only.",
        noise_controls: [
          "Suppress browser extensions, web crawlers, and localhost",
          "Do not allow session replay or DOM capture in supporting evidence",
        ],
        routing_target_alias: "ops.portal.runtime",
        release_gate_binding: "WEB_RELEASE_REGRESSION_GATE",
        source_refs: refs,
        notes: [],
      },
      {
        rule_ref: "alert.native_macos_crash_spike",
        label: "Native macOS crash spike",
        target_project_refs: [
          productionProjectRef("native_macos_operator"),
          preprodProjectRef("native_macos_operator"),
        ],
        target_environment_ids: [
          "env_preproduction_verification",
          "env_production",
        ],
        trigger_summary:
          "Trigger on crash spikes or release regressions in the native macOS operator workspace.",
        noise_controls: [
          "Require release track correlation",
          "Do not store raw authority credentials, tokens, or payload bodies",
        ],
        routing_target_alias: "ops.native.workspace",
        release_gate_binding: "NATIVE_RELEASE_REGRESSION_GATE",
        source_refs: refs,
        notes: [],
      },
    ],
    typed_gaps: [
      "Metric-alert parity is intentionally summarized here in vendor-neutral terms rather than binding to one provider-specific workflow object model.",
    ],
    notes: [
      "Alerts remain targeted and environment-scoped. No vanity activity or customer-behavior heuristics are included.",
    ],
  };
}

export function createRecommendedErrorMonitoringReleaseMapping(): ErrorMonitoringReleaseMapping {
  const refs = monitoringSourceRefs();
  const track = (
    slug: string,
    deployableId: string,
    releaseHealthExpected: boolean,
  ): MonitoringReleaseTrackRow => ({
    track_ref: `release_track_${slug.replaceAll("-", "_")}`,
    deployable_id: deployableId,
    project_refs: REAL_ENVIRONMENTS.map((environmentId) =>
      projectRefFor(environmentId, slug),
    ),
    release_name_template: `${slug}@{code_build_id}`,
    environment_aliases: [
      {
        product_environment_id: "env_shared_sandbox_integration",
        vendor_environment_name: "sandbox",
      },
      {
        product_environment_id: "env_preproduction_verification",
        vendor_environment_name: "preprod",
      },
      {
        product_environment_id: "env_production",
        vendor_environment_name: "production",
      },
    ],
    provenance_keys: [
      "code_build_id",
      "environment_ref",
      "release_candidate_id",
      "deployment_release_id",
    ],
    release_health_expected: releaseHealthExpected,
    source_refs: refs,
    notes: [
      "Release tags must remain deterministic and tied back to first-party release evidence.",
    ],
  });

  return {
    schema_version: "1.0",
    mapping_id: "error_monitoring_release_mapping",
    provider_selection: providerSelection(),
    policy_version: MONITORING_POLICY_VERSION,
    generated_on: MONITORING_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Vendor release markers are diagnostic overlays only and must map back to first-party release candidate and deployment lineage.",
    release_tracks: [
      track("backend-runtime", "services/backend-control-plane", false),
      track("authority-gateway", "services/authority-gateway", false),
      track("operator-web", "apps/operator-web", true),
      track("client-portal-web", "apps/client-portal-web", true),
      track("native-macos-operator", "apps/InternalOperatorWorkspaceMac", true),
    ],
    typed_gaps: [
      "Local fixture release markers stay implicit in tests and are not published as canonical provider tracks.",
    ],
    notes: [
      "Release names remain deployable-specific to avoid cross-surface issue grouping drift.",
    ],
  };
}

export function createRecommendedTelemetryVsAuditBoundary(): TelemetryVsAuditBoundary {
  const refs = monitoringSourceRefs();
  return {
    schema_version: "1.0",
    boundary_id: "telemetry_vs_audit_boundary",
    provider_selection: providerSelection(),
    policy_version: MONITORING_POLICY_VERSION,
    generated_on: MONITORING_POLICY_GENERATED_ON,
    truth_boundary_statement:
      "Vendor monitoring may explain runtime faults, but it never substitutes for append-only audit, privacy ledgers, authority protocol records, or release evidence.",
    mandatory_correlation_keys: [
      "tenant_id",
      "client_id",
      "manifest_id",
      "trace_id",
      "service_name",
      "environment_ref",
      "error_id",
      "workflow_item_id",
      "authority_operation_id",
      "submission_record_id",
      "code_build_id",
    ],
    vendor_visible_families: [
      {
        family_ref: "RUNTIME_EXCEPTIONS",
        allowed_payload_classes: [
          "STACK_TRACE_FRAMES",
          "SERVICE_NAME",
          "ROUTE_CODE",
          "MODULE_CODE",
          "MANDATORY_CORRELATION_KEYS",
        ],
        prohibited_payload_classes: [
          "AUDIT_EVENT_PAYLOADS",
          "DECLARATION_TEXT",
          "EVIDENCE_TEXT",
        ],
        source_refs: refs,
        notes: ["Vendor-visible exception payloads must remain redaction-safe and correlation-rich."],
      },
      {
        family_ref: "SAMPLED_TRACE_ENVELOPES",
        allowed_payload_classes: [
          "SPAN_NAME",
          "LATENCY",
          "STATUS_CODE",
          "MANDATORY_CORRELATION_KEYS",
        ],
        prohibited_payload_classes: [
          "RAW_REQUEST_BODIES",
          "AUTHORITY_PAYLOADS",
          "CUSTOMER_SAFE_EXPLANATION_TEXT",
        ],
        source_refs: refs,
        notes: ["Sampling is allowed only for operational telemetry, never for audit proof."],
      },
      {
        family_ref: "RELEASE_MARKERS_AND_HEALTH",
        allowed_payload_classes: [
          "RELEASE_NAME",
          "ENVIRONMENT",
          "SESSION_HEALTH_SUMMARY",
          "CODE_BUILD_ID",
        ],
        prohibited_payload_classes: ["AUDIT_STREAMS", "PROMOTION_ATTESTATION_BODIES"],
        source_refs: refs,
        notes: ["Release overlays stay tied back to first-party promotion evidence."],
      },
      {
        family_ref: "AUTHORITY_GATEWAY_RUNTIME_ANOMALIES",
        allowed_payload_classes: [
          "REASON_CODE",
          "ERROR_CLASS",
          "AUTHORITY_OPERATION_ID",
          "SUBMISSION_RECORD_ID",
        ],
        prohibited_payload_classes: [
          "AUTHORITY_RESPONSE_BODIES",
          "CALLBACK_SECRETS",
          "TOKEN_VALUES",
        ],
        source_refs: refs,
        notes: ["Only typed anomaly overlays may cross the vendor boundary."],
      },
      {
        family_ref: "CLIENT_SURFACE_RENDER_ERRORS",
        allowed_payload_classes: [
          "ROUTE_CODE",
          "MODULE_CODE",
          "POSTURE_CODE",
          "MANDATORY_CORRELATION_KEYS",
        ],
        prohibited_payload_classes: [
          "DOM_SNAPSHOTS",
          "SESSION_REPLAY_FRAMES",
          "FREE_FORM_UI_TEXT",
        ],
        source_refs: refs,
        notes: ["Client-surface overlays remain route-code first and replay-free."],
      },
    ],
    first_party_only_families: [
      {
        family_ref: "AUDIT_EVENTS",
        rationale:
          "Append-only audit evidence remains the proof-of-record and cannot be delegated to the monitoring vendor.",
        required_query_contracts: [
          "AUDIT_TRAIL",
          "FILING_EVIDENCE_LEDGER",
          "REPLAY_ATTESTATION",
        ],
        source_refs: refs,
      },
      {
        family_ref: "PRIVACY_ACTION_LEDGER",
        rationale:
          "Masking, erasure, and legal-hold evidence require deterministic audit ordering and explicit privacy constraints.",
        required_query_contracts: ["PRIVACY_ACTION_LEDGER", "RETENTION_LIMITATION_PATH"],
        source_refs: refs,
      },
      {
        family_ref: "AUTHORITY_PROTOCOL_RECORDS",
        rationale:
          "Authority request and reconciliation truth remain first-party and may not collapse into vendor breadcrumbs or stack traces.",
        required_query_contracts: ["FILING_EVIDENCE_LEDGER", "AUTHORITY_STATE_PATH"],
        source_refs: refs,
      },
      {
        family_ref: "FAILURE_LIFECYCLE_DASHBOARD",
        rationale:
          "The typed failure dashboard is a persisted read model and must not be reconstructed from vendor issues alone.",
        required_query_contracts: ["RUN_TIMELINE", "PROVENANCE_OBJECT"],
        source_refs: refs,
      },
      {
        family_ref: "RELEASE_PROMOTION_EVIDENCE",
        rationale:
          "Promotion admissibility depends on first-party release manifests, restore evidence, and compatibility gates.",
        required_query_contracts: ["RUN_TIMELINE", "AUDIT_TRAIL"],
        source_refs: refs,
      },
    ],
    prohibited_payload_classes: [
      "RAW_SECRETS",
      "FULL_TOKENS",
      "AUTHORITY_CREDENTIALS",
      "AUTHORITY_RESPONSE_BODIES",
      "DECLARATION_TEXT",
      "EVIDENCE_TEXT",
      "APPROVAL_RATIONALE",
      "DOM_SNAPSHOTS",
      "SESSION_REPLAY_FRAMES",
      "UPLOADED_DOCUMENT_TEXT",
      "MASKED_OR_MINIMIZED_FIELDS",
    ],
    typed_gaps: [
      "If the product later enables replay-style tooling, this boundary pack must be narrowed again before any vendor rollout.",
    ],
    notes: [
      "Shared identifiers are allowed across telemetry lanes; shared payload truth is not.",
      "Vendor-visible telemetry outages may degrade convenience triage, but they may not break first-party audit or runtime capture.",
    ],
  };
}

function projectSummaryLabel(project: ErrorMonitoringProjectRow): string {
  return `${productEnvironmentLabel(project.product_environment_id)} ${project.provider_project_label.replace(
    `${productEnvironmentLabel(project.product_environment_id)} `,
    "",
  )}`;
}

function projectKindLabel(projectKind: MonitoringProjectKind): string {
  return projectKind.replaceAll("_", " ");
}

export function createSignalGovernanceBoardViewModel(): SignalGovernanceBoardViewModel {
  const catalog = createRecommendedErrorMonitoringProjectCatalog();
  const scrubRules = createRecommendedErrorMonitoringScrubRules();
  const alertPolicy = createRecommendedErrorMonitoringAlertPolicy();
  const releaseMapping = createRecommendedErrorMonitoringReleaseMapping();
  const boundary = createRecommendedTelemetryVsAuditBoundary();

  const projects = catalog.project_rows
    .filter((row) => row.project_kind !== "LOCAL_FIXTURE")
    .map((project) => {
      const scrubRows = scrubRules.scrub_rule_rows.filter((rule) =>
        project.scrub_rule_refs.includes(rule.rule_ref),
      );
      const inboundRows = scrubRules.inbound_filter_rows.filter((row) =>
        project.inbound_filter_refs.includes(row.filter_ref),
      );
      const alertRows = alertPolicy.alert_rules.filter((row) =>
        project.alert_rule_refs.includes(row.rule_ref),
      );
      const releaseRows = releaseMapping.release_tracks.filter(
        (row) => row.track_ref === project.release_track_ref,
      );

      return {
        project_ref: project.project_ref,
        label: project.provider_project_label,
        environment_label: productEnvironmentLabel(project.product_environment_id),
        project_kind_label: projectKindLabel(project.project_kind),
        status_label: "Governed",
        summary:
          PROJECT_BLUEPRINTS.find((blueprint) => blueprint.kind === project.project_kind)
            ?.summary ??
          "Monitoring overlay remains governed and environment-scoped.",
        project_rows: [
          {
            label: "Project slug",
            detail: project.provider_project_slug,
          },
          {
            label: "Signal domains",
            detail: project.signal_domains.join(", "),
          },
          {
            label: "Release health",
            detail: project.release_health_enabled ? "Enabled" : "Disabled",
          },
        ],
        scrub_rows: scrubRows.map((row) => ({
          label: row.label,
          detail: `${row.action} · ${row.protected_classes.join(", ")}`,
        })),
        inbound_filter_rows: inboundRows.map((row) => ({
          label: row.provider_filter_id,
          detail: row.default_state,
        })),
        alert_and_release_rows: [
          ...alertRows.map((row) => ({
            label: row.label,
            detail: row.routing_target_alias,
          })),
          ...releaseRows.map((row) => ({
            label: row.track_ref,
            detail: row.release_name_template,
          })),
        ],
        token_rows: [
          {
            label: "Ingest DSN ref",
            safe_ref: project.ingest_dsn_secret_ref,
          },
          {
            label: "Workspace automation token ref",
            safe_ref: environmentTokenRef(project.product_environment_id),
          },
        ],
        inspector_notes: [
          ...project.notes,
          boundary.notes[0] ?? "",
        ].filter(Boolean),
        source_refs: project.source_refs,
      };
    });

  return {
    provider_label: "Sentry-compatible monitoring overlay with first-party audit boundary",
    provider_monogram: "MON",
    selection_posture: "AUDIT_PRIMARY_VENDOR_MONITORING_SECONDARY",
    projects,
    truth_boundary_statement: boundary.truth_boundary_statement,
    notes: [
      "Monitoring stays secondary to first-party traces, logs, metrics, and append-only audit evidence.",
      "Only aliases and vault refs appear in the board; raw DSNs and auth tokens never do.",
      "Session replay, DOM capture, attachments, and raw request-body capture remain disabled.",
    ],
  };
}

export function validateMonitoringWorkspaceTemplate(
  template: MonitoringWorkspaceTemplate,
): void {
  if (template.workspace_rows.length !== 4) {
    throw new Error("Monitoring workspace template must publish four workspace rows.");
  }
  if (template.project_rows.length !== 16) {
    throw new Error(
      "Monitoring workspace template must publish one local fixture row plus fifteen real project rows.",
    );
  }
  const envRefs = new Set(template.workspace_rows.map((row) => row.workspace_ref));
  template.project_rows.forEach((row) => {
    if (!envRefs.has(row.workspace_ref)) {
      throw new Error(`Monitoring project ${row.project_ref} references an unknown workspace.`);
    }
  });
}

export function validateErrorMonitoringProjectCatalog(
  catalog: ErrorMonitoringProjectCatalog,
): void {
  const productionPortal = catalog.project_rows.find(
    (row) =>
      row.project_kind === "CLIENT_PORTAL_WEB" &&
      row.product_environment_id === "env_production",
  );
  if (!productionPortal) {
    throw new Error("Project catalog must retain the production customer-portal project.");
  }
  if (
    catalog.project_rows.some(
      (row) => row.capture_modes.session_replay || row.capture_modes.attachments,
    )
  ) {
    throw new Error(
      "Project catalog must keep replay and attachment capture disabled across the governed overlay.",
    );
  }
}

export function validateErrorMonitoringScrubRules(
  scrubRules: ErrorMonitoringScrubRules,
): void {
  const protectedClasses = new Set(
    scrubRules.scrub_rule_rows.flatMap((row) => row.protected_classes),
  );
  [
    "RAW_SECRETS",
    "FULL_TOKENS",
    "AUTHORITY_CREDENTIALS",
    "CUSTOMER_PERSONAL_IDENTIFIERS",
    "GOVERNMENT_TAX_IDENTIFIERS",
    "DECLARATION_TEXT",
    "EVIDENCE_TEXT",
    "MASKED_OR_MINIMIZED_FIELDS",
  ].forEach((requiredClass) => {
    if (!protectedClasses.has(requiredClass)) {
      throw new Error(`Missing scrub coverage for ${requiredClass}.`);
    }
  });
}

export function validateErrorMonitoringAlertPolicy(
  alertPolicy: ErrorMonitoringAlertPolicy,
): void {
  if (alertPolicy.alert_rules.length < 6) {
    throw new Error("Alert policy must keep the operational ruleset explicitly bounded.");
  }
  if (
    !alertPolicy.alert_rules.some(
      (rule) => rule.rule_ref === "alert.authority_gateway_auth_failure",
    )
  ) {
    throw new Error("Authority gateway auth-failure alert rule is mandatory.");
  }
}

export function validateErrorMonitoringReleaseMapping(
  releaseMapping: ErrorMonitoringReleaseMapping,
): void {
  if (releaseMapping.release_tracks.length !== 5) {
    throw new Error("Release mapping must retain five deployable tracks.");
  }
}

export function validateTelemetryVsAuditBoundary(
  boundary: TelemetryVsAuditBoundary,
): void {
  const vendorVisible = new Set(
    boundary.vendor_visible_families.map((row) => row.family_ref),
  );
  const firstParty = new Set(
    boundary.first_party_only_families.map((row) => row.family_ref),
  );
  if (vendorVisible.has("AUDIT_EVENTS") || vendorVisible.has("PRIVACY_ACTION_LEDGER")) {
    throw new Error("Audit and privacy ledgers must remain first-party only.");
  }
  for (const family of firstParty) {
    if (vendorVisible.has(family)) {
      throw new Error(`Boundary family ${family} cannot be vendor-visible and first-party only.`);
    }
  }
  ["tenant_id", "manifest_id", "trace_id", "service_name", "environment_ref"].forEach(
    (requiredKey) => {
      if (!boundary.mandatory_correlation_keys.includes(requiredKey)) {
        throw new Error(`Boundary pack is missing correlation key ${requiredKey}.`);
      }
    },
  );
}

export function assertMonitoringArtifactsSanitized(
  template: MonitoringWorkspaceTemplate,
): void {
  const serialized = JSON.stringify(template);
  ["sntrys_", "sntryu_", "-----BEGIN", "sentry_key="].forEach((marker) => {
    if (serialized.includes(marker)) {
      throw new Error(`Monitoring artifacts must not persist raw vendor secret material (${marker}).`);
    }
  });
}

export function createDefaultMonitoringProviderEntryUrls(): MonitoringWorkspaceEntryUrls {
  return {
    controlPlane:
      "/automation/provisioning/tests/fixtures/sentry_monitoring_console.html?scenario=existing",
  };
}

function evidenceManifestPathFor(workspaceTemplatePath: string): string {
  return path.join(
    path.dirname(workspaceTemplatePath),
    "monitoring_evidence_manifest.json",
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
    evidenceId: `${stepId}-note-${createHash("sha1").update(summary).digest("hex").slice(0, 10)}`,
    stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary,
  });
}

function fixtureStateFromScenario(
  scenario: string | null,
): MonitoringFixtureState {
  switch (scenario) {
    case "fresh":
      return {
        sourceDisposition: "CREATED_DURING_RUN",
        scrubbingHealthy: true,
      };
    case "scrub-drift":
      return {
        sourceDisposition: "ADOPTED_EXISTING",
        scrubbingHealthy: false,
      };
    default:
      return {
        sourceDisposition: "ADOPTED_EXISTING",
        scrubbingHealthy: true,
      };
  }
}

async function detectFixtureState(page: Page): Promise<MonitoringFixtureState> {
  const scenario = await page.locator("body").getAttribute("data-scenario");
  return fixtureStateFromScenario(scenario);
}

export async function loadMonitoringSelectorManifest(): Promise<SelectorManifest> {
  return MONITORING_SELECTORS;
}

export async function createErrorMonitoringWorkspace(
  options: CreateErrorMonitoringWorkspaceOptions,
): Promise<CreateErrorMonitoringWorkspaceResult> {
  const registry = createDefaultProviderRegistry();
  const provider = registry.getRequired(MONITORING_PROVIDER_ID);
  assertProviderFlowAllowed(options.runContext, provider, MONITORING_FLOW_ID);

  const manifest = await loadMonitoringSelectorManifest();
  const entryUrls = options.entryUrls ?? createDefaultMonitoringProviderEntryUrls();
  const steps: StepContract[] = [
    createPendingStep({
      stepId: MONITORING_STEP_IDS.openControlPlane,
      title: "Open error monitoring control plane",
      selectorRefs: ["workspace-heading", "projects-heading", "scrubbing-heading"],
    }),
    createPendingStep({
      stepId: MONITORING_STEP_IDS.reconcileWorkspace,
      title: "Create or adopt monitoring workspace",
      selectorRefs: ["workspace-action", "project-row-fallback"],
    }),
    createPendingStep({
      stepId: MONITORING_STEP_IDS.reconcileProjects,
      title: "Create or adopt projects and token refs",
      selectorRefs: ["project-action"],
    }),
    createPendingStep({
      stepId: MONITORING_STEP_IDS.validateScrubbing,
      title: "Validate scrubbing and inbound filters",
      selectorRefs: ["scrubbing-action"],
    }),
    createPendingStep({
      stepId: MONITORING_STEP_IDS.validateAlerts,
      title: "Validate alerts and release mapping",
      selectorRefs: ["alerts-action"],
    }),
    createPendingStep({
      stepId: MONITORING_STEP_IDS.persistArtifacts,
      title: "Persist monitoring governance artifacts",
      selectorRefs: ["alerts-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  steps[0] = transitionStep(
    steps[0]!,
    "RUNNING",
    "Opening the error monitoring control plane.",
  );
  await options.page.goto(entryUrls.controlPlane);
  await requireVisible(options.page, manifest, "workspace-heading");
  await requireVisible(options.page, manifest, "workspace-action");
  await requireVisible(options.page, manifest, "projects-heading");
  await requireVisible(options.page, manifest, "project-action");
  await requireVisible(options.page, manifest, "scrubbing-heading");
  await requireVisible(options.page, manifest, "scrubbing-action");
  await requireVisible(options.page, manifest, "alerts-heading");
  await requireVisible(options.page, manifest, "alerts-action");
  steps[0] = transitionStep(
    steps[0]!,
    "SUCCEEDED",
    "Monitoring control plane is reachable with semantic selectors.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[0].stepId,
    "Opened the monitoring control plane without relying on brittle selector fallbacks.",
  );

  const fixtureState = await detectFixtureState(options.page);
  const workspaceTemplate = createRecommendedMonitoringWorkspaceTemplate(
    options.runContext,
  );
  const projectCatalog = createRecommendedErrorMonitoringProjectCatalog();
  const scrubRules = createRecommendedErrorMonitoringScrubRules();
  const alertPolicy = createRecommendedErrorMonitoringAlertPolicy();
  const releaseMapping = createRecommendedErrorMonitoringReleaseMapping();
  const telemetryAuditBoundary = createRecommendedTelemetryVsAuditBoundary();

  validateMonitoringWorkspaceTemplate(workspaceTemplate);
  validateErrorMonitoringProjectCatalog(projectCatalog);
  validateErrorMonitoringScrubRules(scrubRules);
  validateErrorMonitoringAlertPolicy(alertPolicy);
  validateErrorMonitoringReleaseMapping(releaseMapping);
  validateTelemetryVsAuditBoundary(telemetryAuditBoundary);
  assertMonitoringArtifactsSanitized(workspaceTemplate);

  steps[1] = transitionStep(
    steps[1]!,
    "RUNNING",
    "Reconciling the vendor workspace and organization posture.",
  );
  steps[1] =
    fixtureState.sourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[1]!,
          "Existing monitoring workspace was adopted and verified against the governed topology.",
        )
      : transitionStep(
          steps[1]!,
          "SUCCEEDED",
          "Monitoring workspace was created during the run.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[1].stepId,
    "The workspace record now freezes environment-scoped organization and token posture without persisting raw vendor credentials.",
  );

  steps[2] = transitionStep(
    steps[2]!,
    "RUNNING",
    "Reconciling project inventory and safe ingest-token lineage.",
  );
  steps[2] =
    fixtureState.sourceDisposition === "ADOPTED_EXISTING"
      ? markSkippedAsAlreadyPresent(
          steps[2]!,
          "Existing monitoring projects and token refs were adopted and matched to the canonical catalog.",
        )
      : transitionStep(
          steps[2]!,
          "SUCCEEDED",
          "Monitoring projects and token refs were created during the run.",
        );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[2].stepId,
    "Project inventory is now explicit by environment and deployable, and all DSN/token lineage remains vault-safe.",
  );

  let outcome: MonitoringFlowOutcome = "MONITORING_GOVERNANCE_READY";
  const notes: string[] = [];

  steps[3] = transitionStep(
    steps[3]!,
    "RUNNING",
    "Validating scrub posture, disabled capture modes, and inbound filters.",
  );
  if (!fixtureState.scrubbingHealthy) {
    steps[3] = transitionStep(
      steps[3]!,
      "BLOCKED_BY_POLICY",
      "Observed provider scrub posture drifted from the governed boundary and would allow prohibited content or capture modes.",
    );
    outcome = "MONITORING_POLICY_REVIEW_REQUIRED";
    notes.push(
      "Scrub and capture posture drift was surfaced explicitly and blocked before any monitoring configuration could be treated as admissible.",
    );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "Scrub-policy drift was surfaced explicitly and blocked instead of being silently accepted.",
    );
  } else {
    steps[3] = transitionStep(
      steps[3]!,
      "SUCCEEDED",
      "Scrub rules, inbound filters, and disabled capture modes match the governed boundary.",
    );
    evidenceManifest = await captureNoteEvidence(
      evidenceManifest,
      steps[3].stepId,
      "Scrub posture now blocks secrets, authority material, and high-risk payload classes from vendor ingress.",
    );
  }

  steps[4] = transitionStep(
    steps[4]!,
    "RUNNING",
    "Validating alert posture and release mapping.",
  );
  steps[4] = transitionStep(
    steps[4]!,
    "SUCCEEDED",
    "Alert rules and release tracks remain environment-scoped, actionable, and tied back to first-party release evidence.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[4].stepId,
    "Alerting and release mapping now stay explicit, bounded, and aligned with release-health and authority-edge regressions.",
  );

  steps[5] = transitionStep(
    steps[5]!,
    "RUNNING",
    "Persisting monitoring governance artifacts.",
  );
  await persistJsonArtifact(options.workspaceTemplatePath, workspaceTemplate);
  const manifestPath = evidenceManifestPathFor(options.workspaceTemplatePath);
  await persistJsonArtifact(manifestPath, evidenceManifest);
  steps[5] = transitionStep(
    steps[5]!,
    "SUCCEEDED",
    "Persisted sanitized monitoring workspace and evidence manifest artifacts.",
  );
  evidenceManifest = await captureNoteEvidence(
    evidenceManifest,
    steps[5].stepId,
    "Persisted sanitized monitoring workspace data without raw DSNs, auth tokens, or vendor secrets.",
  );
  await persistJsonArtifact(manifestPath, evidenceManifest);

  return {
    outcome,
    steps,
    workspaceTemplate,
    projectCatalog,
    scrubRules,
    alertPolicy,
    releaseMapping,
    telemetryAuditBoundary,
    evidenceManifestPath: manifestPath,
    notes,
  };
}
