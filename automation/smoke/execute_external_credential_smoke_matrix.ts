import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CREDENTIAL_SMOKE_PROVIDER_ID = "external-credential-smoke-matrix";
export const CREDENTIAL_SMOKE_FLOW_ID = "execute-external-credential-smoke-matrix";
export const CREDENTIAL_SMOKE_POLICY_VERSION = "1.0";
export const CREDENTIAL_SMOKE_LAST_VERIFIED_AT = "2026-04-22T22:45:00Z";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, "..", "..");

export const ENVIRONMENT_REFS = [
  "env_local_provisioning_workstation",
  "env_ci_ephemeral_validation",
  "env_ephemeral_review_preview",
  "env_shared_sandbox_integration",
  "env_preproduction_verification",
  "env_production",
] as const;

export type EnvironmentRef = (typeof ENVIRONMENT_REFS)[number];

const ENVIRONMENT_SCOPE_KEYS = [
  "local-dev",
  "ci",
  "ephemeral-review",
  "sandbox",
  "staging",
  "production",
] as const;

type EnvironmentScopeKey = (typeof ENVIRONMENT_SCOPE_KEYS)[number];

export const CREDENTIAL_KEYS = [
  "authority-oauth-token-bundle",
  "hmrc-sandbox-client-credentials",
  "hmrc-production-client-credentials",
  "idp-federation-signing-and-admin-material",
  "idp-application-client-secrets",
  "email-provider-api-key-and-domain-proof",
  "email-webhook-signing-secret",
  "device-messaging-server-key",
  "error-monitoring-ingest-token",
  "helpdesk-api-token",
  "ocr-service-credential",
  "scanner-service-credential",
  "vault-admin-and-app-auth-boundary",
  "kms-root-key-admin-role",
  "primary-db-app-and-migration-roles",
  "audit-store-write-role",
  "object-storage-service-role",
  "broker-client-auth-credential",
  "cache-auth-token-or-mtls-identity",
  "otel-ingest-identity",
  "registry-and-signing-material",
  "dns-api-and-cert-automation-identity",
  "ci-runner-and-preview-deploy-token",
  "apple-signing-certificate-and-notary-key",
  "desktop-update-publishing-identity",
] as const;

export type CredentialKey = (typeof CREDENTIAL_KEYS)[number];

export const SMOKE_OUTCOME_CODES = [
  "SUCCESS",
  "SOFT_FAIL_AUTH_MISMATCH",
  "SOFT_FAIL_PRINCIPAL_MISMATCH",
  "SOFT_FAIL_SCOPE_MISMATCH",
  "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE",
  "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH",
  "BLOCKED_PROVIDER_SELECTION",
  "BLOCKED_NOT_SELECTED",
  "MANUAL_CHECKPOINT_REQUIRED",
  "ENVIRONMENT_DISABLED",
] as const;

export type SmokeOutcomeCode = (typeof SMOKE_OUTCOME_CODES)[number];

export type SmokeOutcomeClass =
  | "SUCCESS"
  | "SOFT_FAIL"
  | "BLOCKED"
  | "MANUAL_CHECKPOINT"
  | "ENVIRONMENT_DISABLED";

export type SmokeValidationMode =
  | "API_SMOKE"
  | "BROWSER_AUTOMATION_SMOKE"
  | "CALLBACK_SECRET_VERIFICATION"
  | "WORKLOAD_IDENTITY_ASSERTION"
  | "MANUAL_CHECKPOINT_GATED"
  | "NON_DESTRUCTIVE_METADATA_ASSERTION";

export type SmokeExecutionPosture =
  | "IN_SCOPE_DEFAULT"
  | "MANUAL_CHECKPOINT_GATED"
  | "BLOCKED_PROVIDER_SELECTION"
  | "BLOCKED_NOT_SELECTED"
  | "ENVIRONMENT_DISABLED";

export type EvidenceArtifactKind =
  | "SAFE_CREDENTIAL_REF"
  | "PRINCIPAL_ASSERTION"
  | "SCOPE_ASSERTION"
  | "HTTP_METADATA"
  | "MASKED_HTTP_EXCERPT"
  | "MASKED_SCREENSHOT"
  | "DOM_SIGNATURE"
  | "CHECKPOINT_RECORD"
  | "POLICY_NOTE";

export type EvidenceCaptureMode =
  | "REFERENCE_ONLY"
  | "MASKED"
  | "HASH_ONLY"
  | "SUPPRESSED";

export type ProvisionStepStatus =
  | "SUCCEEDED"
  | "SKIPPED_AS_ALREADY_PRESENT"
  | "BLOCKED_BY_POLICY";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface EnvironmentDescriptor {
  environment_ref: EnvironmentRef;
  scope_key: EnvironmentScopeKey;
  label: string;
  topology_summary: string;
  smoke_posture: string;
}

export interface CredentialInventoryRecord {
  credential_key: CredentialKey;
  environment_scope: EnvironmentScopeKey[];
  owning_subsystem: string;
  usage_constraints: string[];
  source_refs: Array<{
    source_ref: string;
    rationale: string;
  }>;
}

export interface CredentialFamilyRegistryRow {
  credential_key: CredentialKey;
  label: string;
  provider_label: string;
  provider_family_ref: string;
  validation_mode: SmokeValidationMode;
  source_card_ref: string;
  environment_refs: EnvironmentRef[];
  safe_ref_samples: string[];
  docs_urls: string[];
  summary: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface CredentialSmokeMatrixRow {
  smoke_row_ref: string;
  credential_key: CredentialKey;
  family_label: string;
  provider_label: string;
  provider_family_ref: string;
  environment_ref: EnvironmentRef;
  environment_label: string;
  in_scope_for_environment: boolean;
  validation_mode: SmokeValidationMode;
  source_card_ref: string;
  safe_credential_refs: string[];
  secret_namespace_refs: string[];
  expected_principal: string;
  expected_scope_or_role_refs: string[];
  expected_endpoint_label: string;
  expected_endpoint_url_or_template: string;
  non_destructive_action: string;
  timeout_ms: number;
  max_retries: number;
  execution_posture: SmokeExecutionPosture;
  default_result_code: SmokeOutcomeCode;
  allowed_outcome_codes: SmokeOutcomeCode[];
  policy_refs: string[];
  docs_urls: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CredentialSmokeMatrix {
  schema_version: "1.0";
  matrix_id: "credential_smoke_matrix";
  provider_id: typeof CREDENTIAL_SMOKE_PROVIDER_ID;
  flow_id: typeof CREDENTIAL_SMOKE_FLOW_ID;
  policy_version: typeof CREDENTIAL_SMOKE_POLICY_VERSION;
  environments: EnvironmentDescriptor[];
  family_rows: CredentialFamilyRegistryRow[];
  smoke_rows: CredentialSmokeMatrixRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface PrincipalScopeAndEndpointAssertionRow {
  assertion_ref: string;
  smoke_row_ref: string;
  credential_key: CredentialKey;
  environment_ref: EnvironmentRef;
  principal_expectation: string;
  scope_expectation_refs: string[];
  endpoint_expectation: string;
  success_evidence_requirements: string[];
  auth_mismatch_outcome_code: "SOFT_FAIL_AUTH_MISMATCH";
  principal_mismatch_outcome_code: "SOFT_FAIL_PRINCIPAL_MISMATCH";
  scope_mismatch_outcome_code: "SOFT_FAIL_SCOPE_MISMATCH";
  endpoint_mismatch_outcome_code: "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH";
  transient_failure_outcome_code: "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE";
  notes: string[];
  source_refs: SourceRef[];
}

export interface PrincipalScopeAndEndpointAssertions {
  schema_version: "1.0";
  pack_id: "principal_scope_and_endpoint_assertions";
  assertion_rows: PrincipalScopeAndEndpointAssertionRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface ManualCheckpointReasonRow {
  reason_code:
    | "CAPTCHA"
    | "MFA_REQUIRED"
    | "STEP_UP_REQUIRED"
    | "EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED"
    | "SUSPICIOUS_LOGIN_REVIEW"
    | "OPERATOR_APPROVAL_REQUIRED";
  reason_family:
    | "ANTI_BOT"
    | "IDENTITY_STEP_UP"
    | "VERIFICATION"
    | "HUMAN_APPROVAL";
  default_summary: string;
  detection_cues: string[];
  required_capture_modes: EvidenceCaptureMode[];
  outcome_code: "MANUAL_CHECKPOINT_REQUIRED";
  resume_rule: string;
  forbidden_actions: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface ManualCheckpointPolicy {
  schema_version: "1.0";
  policy_id: "manual_checkpoint_policy";
  truth_boundary_statement: string;
  reason_rows: ManualCheckpointReasonRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface MaskedEvidenceCaptureRule {
  rule_ref: string;
  artifact_kind: EvidenceArtifactKind;
  capture_mode: EvidenceCaptureMode;
  allowed_fields: string[];
  forbidden_fields: string[];
  redaction_strategy: string;
  retention_location: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface MaskedEvidenceCapturePolicy {
  schema_version: "1.0";
  policy_id: "masked_evidence_capture_policy";
  evidence_root: string;
  retained_safe_fields: string[];
  forbidden_persisted_fields: string[];
  rule_rows: MaskedEvidenceCaptureRule[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface SmokeEvidenceArtifact {
  artifact_ref: string;
  artifact_kind: EvidenceArtifactKind;
  capture_mode: EvidenceCaptureMode;
  summary: string;
  relative_path_or_null: string | null;
  copy_safe_value_or_null: string | null;
}

export interface ExternalCredentialSmokeResultRow {
  smoke_row_ref: string;
  credential_key: CredentialKey;
  environment_ref: EnvironmentRef;
  outcome_code: SmokeOutcomeCode;
  outcome_class: SmokeOutcomeClass;
  outcome_summary: string;
  next_action: string;
  executed_at: string;
  adapter_mode: "SIMULATED_SAFE_NOOP";
  http_status_or_null: number | null;
  observed_principal_or_null: string | null;
  observed_scope_or_role_refs: string[];
  observed_endpoint_or_null: string | null;
  safe_credential_refs: string[];
  source_card_ref: string;
  evidence_artifacts: SmokeEvidenceArtifact[];
  evidence_ref_lineage: string[];
  manual_checkpoint_reason_code_or_null: ManualCheckpointReasonRow["reason_code"] | null;
  checkpoint_record_ref_or_null: string | null;
  notes: string[];
}

export interface OutcomeCounts {
  success: number;
  soft_fail: number;
  blocked: number;
  manual_checkpoint: number;
  environment_disabled: number;
  total: number;
}

export interface CredentialEvidenceLedgerRow {
  row_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_lines: string[];
  evidence_refs: string[];
  policy_refs: string[];
}

export interface CredentialEvidenceLineageNode {
  node_ref: string;
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  summary: string;
}

export interface CredentialEvidenceLedgerSlice {
  environment_ref: EnvironmentRef;
  outcome_code: SmokeOutcomeCode;
  outcome_label: string;
  summary: string;
  next_action: string;
  result_ref: string;
  safe_credential_refs: string[];
  source_card_ref: string;
  provider_label: string;
  validation_mode: SmokeValidationMode;
  credential_rows: CredentialEvidenceLedgerRow[];
  assertion_rows: CredentialEvidenceLedgerRow[];
  evidence_rows: CredentialEvidenceLedgerRow[];
  outcome_rows: CredentialEvidenceLedgerRow[];
  evidence_lineage: CredentialEvidenceLineageNode[];
  inspector_notes: string[];
}

export interface CredentialEvidenceLedgerFamily {
  family_ref: CredentialKey;
  label: string;
  provider_label: string;
  source_card_ref: string;
  summary: string;
  family_note: string;
  slices: CredentialEvidenceLedgerSlice[];
}

export interface CredentialEvidenceLedgerViewModel {
  routeId: "credential-evidence-ledger";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: string;
  smokeRunBadge: string;
  postureChipLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: EnvironmentRef;
    label: string;
    topology_summary: string;
    smoke_posture: string;
  }>;
  environmentRollups: Array<{
    environment_ref: EnvironmentRef;
    outcome_counts: OutcomeCounts;
    outcome_summary_label: string;
  }>;
  families: CredentialEvidenceLedgerFamily[];
  selectedEnvironmentRef: EnvironmentRef;
  selectedFamilyRef: CredentialKey;
  selectedFocusRef: string | null;
}

export interface ExternalCredentialSmokeInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "external_credential_smoke_inventory";
  provider_id: typeof CREDENTIAL_SMOKE_PROVIDER_ID;
  flow_id: typeof CREDENTIAL_SMOKE_FLOW_ID;
  policy_version: typeof CREDENTIAL_SMOKE_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  execution_mode: "SIMULATED_SAFE_NOOP";
  matrix_ref: string;
  assertion_ref: string;
  manual_checkpoint_policy_ref: string;
  masked_evidence_policy_ref: string;
  result_rows: ExternalCredentialSmokeResultRow[];
  outcome_counts: OutcomeCounts;
  notes: string[];
  last_verified_at: string;
  atlasViewModel: CredentialEvidenceLedgerViewModel;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionSmokeStep {
  step_id: string;
  title: string;
  status: ProvisionStepStatus;
  reason: string;
}

export interface ExecuteExternalCredentialSmokeMatrixResult {
  outcome: "SMOKE_MATRIX_EXECUTED";
  overall_status: "PASSED" | "MIXED" | "BLOCKED_ONLY";
  matrix: CredentialSmokeMatrix;
  assertions: PrincipalScopeAndEndpointAssertions;
  manualCheckpointPolicy: ManualCheckpointPolicy;
  maskedEvidenceCapturePolicy: MaskedEvidenceCapturePolicy;
  inventory: ExternalCredentialSmokeInventoryTemplate;
  steps: ProvisionSmokeStep[];
  notes: string[];
}

export interface SimulatedOutcomeOverride {
  outcome_code: SmokeOutcomeCode;
  observed_principal_or_null?: string | null;
  observed_scope_or_role_refs?: string[];
  observed_endpoint_or_null?: string | null;
  http_status_or_null?: number | null;
  masked_response_excerpt_or_null?: string | null;
  manual_checkpoint_reason_code_or_null?: ManualCheckpointReasonRow["reason_code"] | null;
  next_action?: string;
}

interface AliasCatalogEntry {
  alias_ref: string;
  alias_name: string;
}

interface ProjectData {
  credentialInventory: {
    credential_records: CredentialInventoryRecord[];
  };
  aliasCatalog: {
    aliases: AliasCatalogEntry[];
  };
  hmrcInventory: any;
  idpTenantRecord: any;
  emailSenderDomain: any;
  emailWebhookContract: any;
  pushProjectInventory: any;
  errorMonitoringWorkspace: any;
  helpdeskSelection: any;
  documentExtractionSelection: any;
  malwareScanningSelection: any;
  secretRootInventory: any;
  postgresInventory: any;
  objectStorageInventory: any;
  messagingInventory: any;
  cacheInventory: any;
  observabilityInventory: any;
  ciWorkloadIdentityPolicy: any;
  supplychainBuildTargetCatalog: any;
  edgeDnsMatrix: any;
}

interface FamilyDefinition {
  label: string;
  provider_label: string;
  provider_family_ref: string;
  validation_mode: SmokeValidationMode;
  source_card_ref: string;
  summary: string;
  docs_urls: (data: ProjectData, environmentRef: EnvironmentRef) => string[];
  safe_refs: (data: ProjectData, environmentRef: EnvironmentRef) => string[];
  secret_namespaces: (data: ProjectData, environmentRef: EnvironmentRef) => string[];
  expected_principal: (data: ProjectData, environmentRef: EnvironmentRef) => string;
  expected_scopes: (data: ProjectData, environmentRef: EnvironmentRef) => string[];
  endpoint: (
    data: ProjectData,
    environmentRef: EnvironmentRef,
  ) => { label: string; url: string };
  non_destructive_action: (data: ProjectData, environmentRef: EnvironmentRef) => string;
  allowed_in_scope_outcomes?: SmokeOutcomeCode[];
  posture_for_in_scope?: (
    data: ProjectData,
    environmentRef: EnvironmentRef,
  ) => SmokeExecutionPosture;
  default_outcome_for_in_scope?: (
    data: ProjectData,
    environmentRef: EnvironmentRef,
  ) => SmokeOutcomeCode;
  notes?: (data: ProjectData, environmentRef: EnvironmentRef) => string[];
  extra_source_refs?: (
    data: ProjectData,
    environmentRef: EnvironmentRef,
  ) => SourceRef[];
}

const DEFAULT_RUN_CONTEXT: MinimalRunContext = {
  runId: "run-fixture-external-credential-smoke-001",
  workspaceId: "wk-fixture-external-credential-smoke",
  operatorIdentityAlias: "ops.external.credential.smoke",
};

const ENVIRONMENT_OPTIONS: EnvironmentDescriptor[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    scope_key: "local-dev",
    label: "Local dev",
    topology_summary:
      "Operator-attended provisioning workspace with masked evidence capture and no lawful direct production mutation.",
    smoke_posture: "HEADFUL_MASKED_REHEARSAL_ONLY",
  },
  {
    environment_ref: "env_ci_ephemeral_validation",
    scope_key: "ci",
    label: "CI",
    topology_summary:
      "Short-lived validation lane where identity assertions stay brokered, candidate-bound, and redaction-safe.",
    smoke_posture: "BROKERED_NON_INTERACTIVE_ASSERTIONS",
  },
  {
    environment_ref: "env_ephemeral_review_preview",
    scope_key: "ephemeral-review",
    label: "Preview",
    topology_summary:
      "Synthetic review-zone environment with narrowly scoped preview identities and no stable provider trust.",
    smoke_posture: "REVIEW_ZONE_SYNTHETIC_ONLY",
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    scope_key: "sandbox",
    label: "Sandbox",
    topology_summary:
      "First stable provider-enabled rehearsal lane for non-destructive API and callback validation.",
    smoke_posture: "SANDBOX_SAFE_NON_DESTRUCTIVE",
  },
  {
    environment_ref: "env_preproduction_verification",
    scope_key: "staging",
    label: "Staging",
    topology_summary:
      "Production-shaped verification environment where checkpoint, scope, and environment mismatches must stay explicit.",
    smoke_posture: "PREPROD_CANDIDATE_READINESS",
  },
  {
    environment_ref: "env_production",
    scope_key: "production",
    label: "Production",
    topology_summary:
      "Release-only surface where read-only smoke assertions remain narrow and any grant-bearing flow fails closed.",
    smoke_posture: "RELEASE_WINDOW_OR_DISABLED",
  },
] as const;

const API_OUTCOMES: SmokeOutcomeCode[] = [
  "SUCCESS",
  "SOFT_FAIL_AUTH_MISMATCH",
  "SOFT_FAIL_PRINCIPAL_MISMATCH",
  "SOFT_FAIL_SCOPE_MISMATCH",
  "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE",
  "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH",
];

const MANUAL_GATED_OUTCOMES: SmokeOutcomeCode[] = [
  ...API_OUTCOMES,
  "MANUAL_CHECKPOINT_REQUIRED",
];

const OFFICIAL_DOC_URLS = {
  hmrcAuthorisation:
    "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation",
  hmrcTwoStep:
    "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/two-step-verification",
  auth0Applications: "https://auth0.com/docs/get-started/applications",
  auth0Credentials: "https://auth0.com/docs/get-started/applications/application-credentials",
  postmarkDomains: "https://postmarkapp.com/developer/api/domains-api",
  postmarkWebhooks: "https://postmarkapp.com/developer/webhooks/webhooks-overview",
  firebaseMessaging: "https://firebase.google.com/docs/cloud-messaging",
  firebaseSendAuth:
    "https://firebase.google.com/docs/cloud-messaging/send/v1-api#authorize-http-v1-send-requests",
  appleApnsTokens:
    "https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns",
  githubOidc:
    "https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect",
  githubEnvironments: "https://docs.github.com/en/actions/reference/environments",
  githubReviewDeployments:
    "https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments",
  githubContainerRegistry:
    "https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry",
  githubArtifactAttestations:
    "https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations",
  cloudflareApiTokens:
    "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/",
  cloudflarePreviewDeployments:
    "https://developers.cloudflare.com/pages/configuration/preview-deployments/",
  vaultAppRole: "https://developer.hashicorp.com/vault/docs/auth/approle",
  vaultJwtAuth: "https://developer.hashicorp.com/vault/docs/auth/jwt",
  vaultTransit: "https://developer.hashicorp.com/vault/docs/secrets/transit",
  postgresGrant: "https://www.postgresql.org/docs/18/sql-grant.html",
  otelGateway: "https://opentelemetry.io/docs/collector/deploy/gateway/",
  otelResiliency: "https://opentelemetry.io/docs/collector/resiliency/",
} as const;

const projectDataCache = new Map<string, ProjectData>();

function readRepoJson<T = any>(repoRoot: string, relativePath: string): T {
  return JSON.parse(
    readFileSync(path.join(repoRoot, relativePath), "utf8"),
  ) as T;
}

function loadProjectData(repoRoot = DEFAULT_REPO_ROOT): ProjectData {
  if (projectDataCache.has(repoRoot)) {
    return projectDataCache.get(repoRoot)!;
  }

  const data: ProjectData = {
    credentialInventory: readRepoJson(repoRoot, "data/analysis/credential_secret_inventory.json"),
    aliasCatalog: readRepoJson(repoRoot, "config/secrets/secret_alias_catalog.json"),
    hmrcInventory: readRepoJson(
      repoRoot,
      "data/provisioning/hmrc_client_application_inventory.template.json",
    ),
    idpTenantRecord: readRepoJson(repoRoot, "data/provisioning/idp_tenant_record.template.json"),
    emailSenderDomain: readRepoJson(
      repoRoot,
      "data/provisioning/email_sender_domain.template.json",
    ),
    emailWebhookContract: readRepoJson(
      repoRoot,
      "config/notifications/email_webhook_endpoint_contract.json",
    ),
    pushProjectInventory: readRepoJson(
      repoRoot,
      "data/provisioning/push_project_inventory.template.json",
    ),
    errorMonitoringWorkspace: readRepoJson(
      repoRoot,
      "data/provisioning/error_monitoring_workspace.template.json",
    ),
    helpdeskSelection: readRepoJson(
      repoRoot,
      "data/provisioning/support_workspace_selection_record.template.json",
    ),
    documentExtractionSelection: readRepoJson(
      repoRoot,
      "data/provisioning/document_extraction_selection_record.template.json",
    ),
    malwareScanningSelection: readRepoJson(
      repoRoot,
      "data/provisioning/malware_scanning_selection_record.template.json",
    ),
    secretRootInventory: readRepoJson(
      repoRoot,
      "data/provisioning/secret_root_inventory.template.json",
    ),
    postgresInventory: readRepoJson(
      repoRoot,
      "data/provisioning/postgres_store_inventory.template.json",
    ),
    objectStorageInventory: readRepoJson(
      repoRoot,
      "data/provisioning/object_storage_inventory.template.json",
    ),
    messagingInventory: readRepoJson(
      repoRoot,
      "data/provisioning/messaging_inventory.template.json",
    ),
    cacheInventory: readRepoJson(repoRoot, "data/provisioning/cache_inventory.template.json"),
    observabilityInventory: readRepoJson(
      repoRoot,
      "data/provisioning/observability_inventory.template.json",
    ),
    ciWorkloadIdentityPolicy: readRepoJson(
      repoRoot,
      "config/ci/workload_identity_federation_policy.json",
    ),
    supplychainBuildTargetCatalog: readRepoJson(
      repoRoot,
      "config/supplychain/build_target_catalog.json",
    ),
    edgeDnsMatrix: readRepoJson(repoRoot, "config/edge/dns_and_origin_matrix.json"),
  };

  projectDataCache.set(repoRoot, data);
  return data;
}

function formatLabel(value: string): string {
  return String(value).replaceAll("_", " ");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function toSourceRefs(rows: Array<{ source_ref: string; rationale: string }> = []): SourceRef[] {
  return rows.map((row) => ({
    source_ref: row.source_ref,
    rationale: row.rationale,
  }));
}

function environmentDescriptor(environmentRef: EnvironmentRef): EnvironmentDescriptor {
  const entry = ENVIRONMENT_OPTIONS.find(
    (environment) => environment.environment_ref === environmentRef,
  );
  if (!entry) {
    throw new Error(`Unknown environment ref: ${environmentRef}`);
  }
  return entry;
}

function environmentScopeRef(environmentRef: EnvironmentRef): EnvironmentScopeKey {
  return environmentDescriptor(environmentRef).scope_key;
}

function smokeRowRef(credentialKey: CredentialKey, environmentRef: EnvironmentRef): string {
  return `${credentialKey}.${environmentRef}.smoke`;
}

export function credentialEnvironmentRowRef(
  credentialKey: CredentialKey,
  environmentRef: EnvironmentRef,
): string {
  return smokeRowRef(credentialKey, environmentRef);
}

function assertionRef(smokeRowRefValue: string): string {
  return `${smokeRowRefValue}.assertion`;
}

function evidenceRef(runId: string, smokeRowRefValue: string, artifactKey: string): string {
  return `evidence://${runId}/${smokeRowRefValue}/${artifactKey}`;
}

function outcomeClassFor(code: SmokeOutcomeCode): SmokeOutcomeClass {
  if (code === "SUCCESS") {
    return "SUCCESS";
  }
  if (code.startsWith("SOFT_FAIL")) {
    return "SOFT_FAIL";
  }
  if (code === "MANUAL_CHECKPOINT_REQUIRED") {
    return "MANUAL_CHECKPOINT";
  }
  if (code === "ENVIRONMENT_DISABLED") {
    return "ENVIRONMENT_DISABLED";
  }
  return "BLOCKED";
}

function defaultOutcomeForPosture(posture: SmokeExecutionPosture): SmokeOutcomeCode {
  if (posture === "MANUAL_CHECKPOINT_GATED") {
    return "MANUAL_CHECKPOINT_REQUIRED";
  }
  if (posture === "BLOCKED_PROVIDER_SELECTION") {
    return "BLOCKED_PROVIDER_SELECTION";
  }
  if (posture === "BLOCKED_NOT_SELECTED") {
    return "BLOCKED_NOT_SELECTED";
  }
  if (posture === "ENVIRONMENT_DISABLED") {
    return "ENVIRONMENT_DISABLED";
  }
  return "SUCCESS";
}

function allowedOutcomesForPosture(posture: SmokeExecutionPosture): SmokeOutcomeCode[] {
  if (posture === "MANUAL_CHECKPOINT_GATED") {
    return [...MANUAL_GATED_OUTCOMES];
  }
  if (posture === "BLOCKED_PROVIDER_SELECTION") {
    return ["BLOCKED_PROVIDER_SELECTION"];
  }
  if (posture === "BLOCKED_NOT_SELECTED") {
    return ["BLOCKED_NOT_SELECTED"];
  }
  if (posture === "ENVIRONMENT_DISABLED") {
    return ["ENVIRONMENT_DISABLED"];
  }
  return [...API_OUTCOMES];
}

function authorityNamespaceForEnvironment(environmentRef: EnvironmentRef): string {
  switch (environmentRef) {
    case "env_preproduction_verification":
      return "sec_preprod_web_authority";
    case "env_production":
      return "sec_production_web_authority";
    default:
      return "sec_sandbox_web_authority";
  }
}

function runtimeNamespaceForEnvironment(environmentRef: EnvironmentRef): string {
  switch (environmentRef) {
    case "env_local_provisioning_workstation":
      return "sec_local_provisioning_sandbox";
    case "env_ci_ephemeral_validation":
      return "sec_ci_ephemeral";
    case "env_ephemeral_review_preview":
      return "sec_ephemeral_review";
    case "env_shared_sandbox_integration":
      return "sec_sandbox_runtime";
    case "env_preproduction_verification":
      return "sec_preprod_runtime";
    case "env_production":
      return "sec_production_runtime";
  }
}

function findAlias(data: ProjectData, aliasRef: string): AliasCatalogEntry | null {
  return (
    data.aliasCatalog.aliases.find((alias) => alias.alias_ref === aliasRef) ?? null
  );
}

function aliasIfPresent(data: ProjectData, aliasRef: string): string | null {
  return findAlias(data, aliasRef)?.alias_ref ?? null;
}

function tenantForEnvironment(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  const records = data.idpTenantRecord.tenant_records ?? [];
  if (
    environmentRef === "env_local_provisioning_workstation" ||
    environmentRef === "env_ci_ephemeral_validation"
  ) {
    return (
      records.find((tenant: any) => tenant.tenant_ref === "idp_tenant_dev_shared") ??
      records[0] ??
      null
    );
  }
  if (
    environmentRef === "env_ephemeral_review_preview" ||
    environmentRef === "env_shared_sandbox_integration" ||
    environmentRef === "env_preproduction_verification"
  ) {
    return (
      records.find((tenant: any) => tenant.tenant_ref === "idp_tenant_staging_runtime") ??
      records[0] ??
      null
    );
  }
  return (
    records.find((tenant: any) => tenant.tenant_ref === "idp_tenant_production_runtime") ??
    records[0] ??
    null
  );
}

function emailDomainForEnvironment(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  return (
    (data.emailSenderDomain.sender_domains ?? []).find(
      (domain: any) => domain.product_environment_id === environmentRef,
    ) ?? null
  );
}

function emailWebhookForEnvironment(
  data: ProjectData,
  environmentRef: EnvironmentRef,
): any | null {
  return (
    (data.emailWebhookContract.callback_records ?? []).find(
      (record: any) => record.product_environment_id === environmentRef,
    ) ?? null
  );
}

function pushWorkspaceForEnvironment(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  const rows = data.pushProjectInventory.workspace_rows ?? [];
  if (environmentRef === "env_preproduction_verification") {
    return (
      rows.find((row: any) => row.product_environment_id === environmentRef) ??
      rows.find((row: any) => row.product_environment_id === "env_shared_sandbox_integration") ??
      null
    );
  }
  if (environmentRef === "env_production") {
    return (
      rows.find((row: any) => row.product_environment_id === environmentRef) ?? null
    );
  }
  return rows.find((row: any) => row.product_environment_id === environmentRef) ?? null;
}

function monitoringWorkspaceForEnvironment(
  data: ProjectData,
  environmentRef: EnvironmentRef,
): any | null {
  const rows = data.errorMonitoringWorkspace.workspace_rows ?? [];
  if (environmentRef === "env_ci_ephemeral_validation") {
    return (
      rows.find(
        (row: any) => row.product_environment_id === "env_local_provisioning_workstation",
      ) ?? null
    );
  }
  if (environmentRef === "env_preproduction_verification") {
    return rows.find((row: any) => row.product_environment_id === environmentRef) ?? null;
  }
  return rows.find((row: any) => row.product_environment_id === environmentRef) ?? null;
}

function postgresEnvironmentRow(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  return (
    (data.postgresInventory.environment_rows ?? []).find(
      (row: any) => row.environment_ref === environmentRef,
    ) ?? null
  );
}

function ciBindingForEnvironment(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  return (
    (data.ciWorkloadIdentityPolicy.binding_rows ?? []).find((row: any) =>
      (row.environment_refs ?? []).includes(environmentRef),
    ) ?? null
  );
}

function edgeProviderOption(data: ProjectData): any | null {
  return (
    (data.edgeDnsMatrix.provider_option_rows ?? []).find(
      (row: any) => row.selection_state === "PROVIDER_DEFAULT_APPLIED",
    ) ??
    data.edgeDnsMatrix.provider_option_rows?.[0] ??
    null
  );
}

function supplyChainRecommendedStack(data: ProjectData): any | null {
  return (
    (data.supplychainBuildTargetCatalog.provider_stack_options ?? []).find(
      (row: any) =>
        row.stack_id === data.supplychainBuildTargetCatalog.recommended_provider_stack_id,
    ) ??
    data.supplychainBuildTargetCatalog.provider_stack_options?.[0] ??
    null
  );
}

function hmrcBindingForEnvironment(data: ProjectData, environmentRef: EnvironmentRef): any | null {
  return (
    (data.hmrcInventory.binding_summary ?? []).find(
      (binding: any) => binding.environment_ref === environmentRef,
    ) ?? null
  );
}

function genericBlockedProviderRefs(
  familyKey: string,
  environmentRef: EnvironmentRef,
): string[] {
  return [
    `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/${familyKey}/current`,
  ];
}

const FAMILY_DEFINITIONS: Record<CredentialKey, FamilyDefinition> = {
  "authority-oauth-token-bundle": {
    label: "HMRC OAuth token bundle",
    provider_label: "HMRC authorisation server",
    provider_family_ref: "HMRC_AUTHORITY",
    validation_mode: "MANUAL_CHECKPOINT_GATED",
    source_card_ref: "pc_0033",
    summary:
      "User-granted HMRC access and refresh tokens remain vault-bound and may only be proved through masked lineage, never ad hoc taxpayer grant playback.",
    docs_urls: () => [OFFICIAL_DOC_URLS.hmrcAuthorisation, OFFICIAL_DOC_URLS.hmrcTwoStep],
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${authorityNamespaceForEnvironment(environmentRef)}/hmrc/oauth/token-bundle/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [authorityNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "authority-gateway.user-consented-oauth-session",
    expected_scopes: () => ["read:self-assessment", "write:self-assessment"],
    endpoint: (_data, environmentRef) => ({
      label: "HMRC OAuth token endpoint",
      url:
        environmentRef === "env_production"
          ? "https://api.service.hmrc.gov.uk/oauth/token"
          : "https://test-api.service.hmrc.gov.uk/oauth/token",
    }),
    non_destructive_action: () =>
      "Validate token-lineage refs, client binding, and grant-environment metadata only; do not mint or replay a taxpayer grant in automation.",
    posture_for_in_scope: () => "ENVIRONMENT_DISABLED",
    default_outcome_for_in_scope: () => "ENVIRONMENT_DISABLED",
    notes: () => [
      "HMRC taxpayer grant flows are intentionally outside this smoke matrix and remain release-window or operator-attended only.",
    ],
  },
  "hmrc-sandbox-client-credentials": {
    label: "HMRC sandbox client credentials",
    provider_label: "HMRC Developer Hub sandbox app",
    provider_family_ref: "HMRC_AUTHORITY",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0038",
    summary:
      "Sandbox client identity and secret lineage stay attested, environment-bound, and safe for non-destructive token endpoint rehearsal only.",
    docs_urls: () => [OFFICIAL_DOC_URLS.hmrcAuthorisation],
    safe_refs: (data) =>
      uniqueStrings([
        data.hmrcInventory.client_id_binding?.client_id_metadata_store_ref,
        aliasIfPresent(data, "alias.authority.hmrc.web.client-secret"),
        aliasIfPresent(data, "alias.authority.hmrc.desktop.client-secret"),
      ]),
    secret_namespaces: (_data, environmentRef) => [authorityNamespaceForEnvironment(environmentRef)],
    expected_principal: (data) =>
      data.hmrcInventory.client_id_binding?.client_id_alias ??
      "hmrc-client-id-taxat-sandbox-income-tax",
    expected_scopes: (data, environmentRef) =>
      uniqueStrings(hmrcBindingForEnvironment(data, environmentRef)?.scopes ?? []),
    endpoint: (_data) => ({
      label: "HMRC sandbox token endpoint",
      url: "https://test-api.service.hmrc.gov.uk/oauth/token",
    }),
    non_destructive_action: () =>
      "Perform a sandbox-safe client-credentials exchange rehearsal or metadata-only token-endpoint assertion without requesting taxpayer data.",
    notes: (data, environmentRef) => {
      const binding = hmrcBindingForEnvironment(data, environmentRef);
      return binding
        ? [
            `Connection method ${binding.connection_method} stays bound to ${binding.callback_profile_ref}.`,
          ]
        : ["No HMRC binding summary exists for this environment slice."];
    },
  },
  "hmrc-production-client-credentials": {
    label: "HMRC production client credentials",
    provider_label: "HMRC Developer Hub production app",
    provider_family_ref: "HMRC_AUTHORITY",
    validation_mode: "MANUAL_CHECKPOINT_GATED",
    source_card_ref: "pc_0038",
    summary:
      "Production HMRC client material remains export-attested but disabled for unattended grant-bearing smoke execution.",
    docs_urls: () => [OFFICIAL_DOC_URLS.hmrcAuthorisation],
    safe_refs: (data) =>
      uniqueStrings([
        data.hmrcInventory.client_id_binding?.client_id_metadata_store_ref,
        aliasIfPresent(data, "alias.authority.hmrc.web.client-secret"),
        aliasIfPresent(data, "alias.authority.hmrc.desktop.client-secret"),
      ]),
    secret_namespaces: () => ["sec_production_web_authority"],
    expected_principal: () => "hmrc-production-client-id.taxat",
    expected_scopes: () => ["read:self-assessment", "write:self-assessment"],
    endpoint: () => ({
      label: "HMRC production token endpoint",
      url: "https://api.service.hmrc.gov.uk/oauth/token",
    }),
    non_destructive_action: () =>
      "Keep production client identity, alias, and rotation evidence aligned without automating a live taxpayer or production grant exchange.",
    posture_for_in_scope: () => "ENVIRONMENT_DISABLED",
    default_outcome_for_in_scope: () => "ENVIRONMENT_DISABLED",
    notes: () => [
      "Production grant flows require a separate operator-approved release window and never run from the default smoke matrix.",
    ],
  },
  "idp-federation-signing-and-admin-material": {
    label: "IdP federation signing and admin material",
    provider_label: "Auth0-compatible tenant administration",
    provider_family_ref: "IDENTITY_CONTROL_PLANE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0039",
    summary:
      "Tenant-admin and signing-key material must prove the intended control-plane tenant without widening runtime client credentials.",
    docs_urls: () => [OFFICIAL_DOC_URLS.auth0Applications, OFFICIAL_DOC_URLS.auth0Credentials],
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/idp/admin-boundary/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) => {
      const tenant = tenantForEnvironment(data, environmentRef);
      return tenant
        ? `${tenant.tenant_ref} (${tenant.tenant_domain_alias})`
        : "idp-tenant-admin-boundary";
    },
    expected_scopes: () => ["read:tenant_settings", "read:clients", "read:keys"],
    endpoint: (data, environmentRef) => {
      const tenant = tenantForEnvironment(data, environmentRef);
      const domain = tenant?.tenant_domain_alias ?? "taxat-dev.eu.auth0.test";
      return {
        label: "Tenant settings endpoint",
        url: `https://${domain}/api/v2/tenants/settings`,
      };
    },
    non_destructive_action: () =>
      "Read tenant settings and signing-key metadata only; do not mutate branding, clients, or tenant policy during smoke validation.",
  },
  "idp-application-client-secrets": {
    label: "IdP application client secrets",
    provider_label: "Auth0-compatible application clients",
    provider_family_ref: "IDENTITY_CONTROL_PLANE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0039",
    summary:
      "Application-client secrets must prove the intended browser and machine client boundaries without exposing raw client material.",
    docs_urls: () => [OFFICIAL_DOC_URLS.auth0Applications, OFFICIAL_DOC_URLS.auth0Credentials],
    safe_refs: (data) =>
      uniqueStrings([
        aliasIfPresent(data, "alias.identity.idp.browser.client-secret"),
        aliasIfPresent(data, "alias.identity.idp.machine.client-secret"),
      ]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) => {
      const tenant = tenantForEnvironment(data, environmentRef);
      return tenant?.custom_domain ?? tenant?.tenant_domain_alias ?? "auth.taxat.example";
    },
    expected_scopes: () => ["read:clients"],
    endpoint: (data, environmentRef) => {
      const tenant = tenantForEnvironment(data, environmentRef);
      const domain = tenant?.tenant_domain_alias ?? "taxat-dev.eu.auth0.test";
      return {
        label: "Client catalog endpoint",
        url: `https://${domain}/api/v2/clients`,
      };
    },
    non_destructive_action: () =>
      "List client metadata and compare redirect-uri / application-type posture without exporting or reissuing secrets.",
  },
  "email-provider-api-key-and-domain-proof": {
    label: "Email provider API key and sender domain",
    provider_label: "Postmark-compatible sender-domain control plane",
    provider_family_ref: "NOTIFICATION_DELIVERY",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0041",
    summary:
      "Server-token and sender-domain proof stay environment-scoped, DNS-aware, and lawful for read-only verification only.",
    docs_urls: () => [OFFICIAL_DOC_URLS.postmarkDomains],
    safe_refs: (data, environmentRef) =>
      uniqueStrings([
        aliasIfPresent(data, "alias.notifications.email.server-token"),
        emailDomainForEnvironment(data, environmentRef)?.sender_domain,
      ]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) =>
      emailDomainForEnvironment(data, environmentRef)?.sender_domain ??
      "notify.taxat.example",
    expected_scopes: () => ["domains:read", "server:read"],
    endpoint: () => ({
      label: "Sender-domain readiness endpoint",
      url: "https://api.postmarkapp.com/domains",
    }),
    non_destructive_action: () =>
      "Read sender-domain verification state and server metadata only; never send live email from smoke validation.",
    posture_for_in_scope: (data, environmentRef) =>
      emailDomainForEnvironment(data, environmentRef)?.manual_checkpoint_open
        ? "MANUAL_CHECKPOINT_GATED"
        : "IN_SCOPE_DEFAULT",
    default_outcome_for_in_scope: (data, environmentRef) =>
      emailDomainForEnvironment(data, environmentRef)?.manual_checkpoint_open
        ? "MANUAL_CHECKPOINT_REQUIRED"
        : "SUCCESS",
    notes: (data, environmentRef) => {
      const domain = emailDomainForEnvironment(data, environmentRef);
      return domain
        ? [
            `Verification state ${domain.verification_state}; readiness ${domain.readiness_state}.`,
          ]
        : ["No sender-domain record exists for this environment."];
    },
  },
  "email-webhook-signing-secret": {
    label: "Email webhook signing secret",
    provider_label: "Postmark-compatible delivery webhooks",
    provider_family_ref: "NOTIFICATION_DELIVERY",
    validation_mode: "CALLBACK_SECRET_VERIFICATION",
    source_card_ref: "pc_0042",
    summary:
      "Webhook authentication remains explicit, replay-aware, and bound to the expected ingress host instead of provider memory.",
    docs_urls: () => [OFFICIAL_DOC_URLS.postmarkWebhooks],
    safe_refs: (data) =>
      uniqueStrings([
        aliasIfPresent(data, "alias.notifications.email.webhook-signing-secret"),
      ]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (_data, environmentRef) =>
      `notification-ingress.${environmentRef === "env_production" ? "production" : environmentRef === "env_preproduction_verification" ? "preprod" : "sandbox"}.taxat.example`,
    expected_scopes: () => ["basic-auth", "custom-header-secret", "replay-ledger"],
    endpoint: (data, environmentRef) => ({
      label: "Email webhook ingress",
      url:
        emailWebhookForEnvironment(data, environmentRef)?.callback_url ??
        "https://notification-ingress.taxat.example/webhooks/email/postmark/customer-transactional",
    }),
    non_destructive_action: () =>
      "Verify callback host, header-secret posture, and replay-ledger refs without replaying a provider delivery event.",
    posture_for_in_scope: (data, environmentRef) =>
      emailDomainForEnvironment(data, environmentRef)?.manual_checkpoint_open
        ? "MANUAL_CHECKPOINT_GATED"
        : "IN_SCOPE_DEFAULT",
    default_outcome_for_in_scope: (data, environmentRef) =>
      emailDomainForEnvironment(data, environmentRef)?.manual_checkpoint_open
        ? "MANUAL_CHECKPOINT_REQUIRED"
        : "SUCCESS",
  },
  "device-messaging-server-key": {
    label: "Device-messaging server key",
    provider_label: "Firebase Cloud Messaging with APNs bridge",
    provider_family_ref: "DEVICE_MESSAGING",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0043",
    summary:
      "Push control-plane material must prove the intended project, APNs bridge state, and internal-only delivery scope without sending a live device push.",
    docs_urls: (data) => data.pushProjectInventory.provider_selection?.docs_urls ?? [],
    safe_refs: (data, environmentRef) =>
      uniqueStrings([
        aliasIfPresent(data, "alias.push.native.key-bundle"),
        pushWorkspaceForEnvironment(data, environmentRef)?.service_account_metadata_ref_or_null,
      ]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) => {
      const workspace = pushWorkspaceForEnvironment(data, environmentRef);
      return workspace
        ? `project:${workspace.project_id_alias}`
        : "project:device-messaging";
    },
    expected_scopes: () => ["firebase.messaging.messages.create", "apns.bound"],
    endpoint: (data, environmentRef) => {
      const workspace = pushWorkspaceForEnvironment(data, environmentRef);
      const projectId = workspace?.project_id_alias ?? "taxat-device-messaging";
      return {
        label: "FCM HTTP v1 send endpoint",
        url: `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      };
    },
    non_destructive_action: () =>
      "Read project metadata and APNs binding state only; do not emit a live push notification during smoke validation.",
  },
  "error-monitoring-ingest-token": {
    label: "Error-monitoring ingest token",
    provider_label: "Sentry-compatible monitoring overlay",
    provider_family_ref: "ERROR_MONITORING",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0044",
    summary:
      "Monitoring overlay credentials stay secondary to first-party telemetry law and may only prove org, project, and ingest posture with masked evidence.",
    docs_urls: (data) => data.errorMonitoringWorkspace.provider_selection?.docs_urls ?? [],
    safe_refs: (data, environmentRef) =>
      uniqueStrings([
        aliasIfPresent(data, "alias.monitoring.sentry.ingest-dsn"),
        aliasIfPresent(data, "alias.monitoring.sentry.org-automation-token"),
        monitoringWorkspaceForEnvironment(data, environmentRef)?.automation_token_metadata_ref,
      ]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) => {
      const workspace = monitoringWorkspaceForEnvironment(data, environmentRef);
      return workspace?.organization_slug_alias ?? "taxat-observability";
    },
    expected_scopes: (data, environmentRef) =>
      uniqueStrings(monitoringWorkspaceForEnvironment(data, environmentRef)?.automation_token_scopes ?? []),
    endpoint: () => ({
      label: "Sentry project ingest envelope endpoint",
      url: "https://o0.ingest.sentry.io/api/<project>/envelope",
    }),
    non_destructive_action: () =>
      "Read org / project token posture and DSN lineage only; never emit synthetic failure events into a live project from the smoke matrix.",
  },
  "helpdesk-api-token": {
    label: "Helpdesk API token",
    provider_label: "Support workspace integration",
    provider_family_ref: "SUPPORT_OPERATIONS",
    validation_mode: "BROWSER_AUTOMATION_SMOKE",
    source_card_ref: "pc_0045",
    summary:
      "Support-provider credentials remain absent until a workspace is explicitly selected; the smoke matrix must preserve that gap instead of inventing a token.",
    docs_urls: () => [],
    safe_refs: (data) =>
      uniqueStrings([aliasIfPresent(data, "alias.support.adapter.shared-secret")]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "provider-not-selected",
    expected_scopes: () => [],
    endpoint: () => ({
      label: "Support control-plane workspace",
      url: "provider-unresolved://support-workspace",
    }),
    non_destructive_action: () =>
      "Stop at selection posture and preserve the not-selected gap; do not automate against an absent support workspace.",
    posture_for_in_scope: () => "BLOCKED_NOT_SELECTED",
    default_outcome_for_in_scope: () => "BLOCKED_NOT_SELECTED",
    notes: (data) => [
      `Support selection status ${data.helpdeskSelection.selection_status}.`,
    ],
  },
  "ocr-service-credential": {
    label: "OCR service credential",
    provider_label: "Document extraction provider",
    provider_family_ref: "DOCUMENT_EXTRACTION",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0046",
    summary:
      "Document-extraction credentials remain blocked until provider choice is explicit and safe metadata-only assertions can be tied to that choice.",
    docs_urls: () => [],
    safe_refs: (data) =>
      uniqueStrings([aliasIfPresent(data, "alias.provider.document-extraction.api-key")]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "provider-selection-required",
    expected_scopes: () => ["read-processor-profile"],
    endpoint: () => ({
      label: "Document extraction account endpoint",
      url: "provider-unresolved://document-extraction",
    }),
    non_destructive_action: () =>
      "Stop at provider-selection evidence and preserve the unresolved OCR credential boundary.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "scanner-service-credential": {
    label: "Malware scanner credential",
    provider_label: "Malware scanning provider",
    provider_family_ref: "UPLOAD_SAFETY",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0047",
    summary:
      "Scanning credentials remain blocked until the platform or provider decision resolves and a harmless identity assertion can be made.",
    docs_urls: () => [],
    safe_refs: (data) =>
      uniqueStrings([aliasIfPresent(data, "alias.provider.malware-scanning.api-key")]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "provider-selection-required",
    expected_scopes: () => ["read-scanner-profile"],
    endpoint: () => ({
      label: "Malware scanning account endpoint",
      url: "provider-unresolved://malware-scanning",
    }),
    non_destructive_action: () =>
      "Stop at provider-selection evidence and preserve the unresolved scanning credential boundary.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "vault-admin-and-app-auth-boundary": {
    label: "Vault admin and app auth boundary",
    provider_label: "Secret boundary control plane",
    provider_family_ref: "SECRETS_CONTROL_PLANE",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0049",
    summary:
      "The secrets-manager admin and app auth boundary is frozen, but live provider choice remains unresolved and must fail closed in the smoke matrix.",
    docs_urls: () => [OFFICIAL_DOC_URLS.vaultAppRole, OFFICIAL_DOC_URLS.vaultJwtAuth],
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("vault/admin-and-app-auth-boundary", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "vault-auth-boundary",
    expected_scopes: () => ["approle-or-jwt-auth"],
    endpoint: () => ({
      label: "Vault auth mount",
      url: "provider-unresolved://vault-auth-boundary",
    }),
    non_destructive_action: () =>
      "Preserve the auth-boundary topology and namespace law without inventing a live secret manager provider.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    notes: (data) => [
      `Secret-root selection ${data.secretRootInventory.selection_status}; root posture ${data.secretRootInventory.root_posture}.`,
    ],
  },
  "kms-root-key-admin-role": {
    label: "KMS root-key admin role",
    provider_label: "KMS / HSM root of trust",
    provider_family_ref: "SECRETS_CONTROL_PLANE",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0049",
    summary:
      "Root-key admin posture is serialized, but no live KMS provider is selected yet, so smoke validation must stop at the governed gap marker.",
    docs_urls: () => [OFFICIAL_DOC_URLS.vaultTransit],
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("kms/root-key-admin-role", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "kms-root-admin-role",
    expected_scopes: () => ["key-admin", "rotation-approve"],
    endpoint: () => ({
      label: "KMS admin endpoint",
      url: "provider-unresolved://kms-root-admin",
    }),
    non_destructive_action: () =>
      "Stop at the unresolved KMS provider boundary and preserve typed root-of-trust evidence only.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "primary-db-app-and-migration-roles": {
    label: "Primary DB app and migration roles",
    provider_label: "PostgreSQL control store",
    provider_family_ref: "RELATIONAL_CONTROL_STORE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0050",
    summary:
      "Database role law exists, but the platform provider is still unresolved, so smoke runs may only preserve alias and role expectations.",
    docs_urls: (data) =>
      data.postgresInventory.provider_service_options?.[0]?.docs_urls ?? [
        OFFICIAL_DOC_URLS.postgresGrant,
      ],
    safe_refs: (data, environmentRef) =>
      uniqueStrings([postgresEnvironmentRow(data, environmentRef)?.control_secret_alias_ref]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (_data, environmentRef) =>
      `pg-control-store.${environmentDescriptor(environmentRef).label.toLowerCase()}`,
    expected_scopes: () => ["app-role", "migration-role"],
    endpoint: (_data, environmentRef) => ({
      label: "Control-store connection target",
      url: `postgresql://pg-${environmentScopeRef(environmentRef)}-control-audit.internal:5432/control`,
    }),
    non_destructive_action: () =>
      "Preserve role matrix and secret aliases without attempting a live connection before provider selection resolves.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "audit-store-write-role": {
    label: "Audit-store write role",
    provider_label: "Append-only audit store",
    provider_family_ref: "RELATIONAL_AUDIT_STORE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0050",
    summary:
      "Append-only audit writer credentials remain explicit, but live datastore provider choice is still unresolved and must stay blocked.",
    docs_urls: (data) =>
      data.postgresInventory.provider_service_options?.[0]?.docs_urls ?? [
        OFFICIAL_DOC_URLS.postgresGrant,
      ],
    safe_refs: (data, environmentRef) =>
      uniqueStrings([postgresEnvironmentRow(data, environmentRef)?.audit_secret_alias_ref]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "append-only-audit-writer",
    expected_scopes: () => ["append-only-write"],
    endpoint: (_data, environmentRef) => ({
      label: "Audit-store connection target",
      url: `postgresql://pg-${environmentScopeRef(environmentRef)}-control-audit.internal:5432/audit`,
    }),
    non_destructive_action: () =>
      "Preserve append-only role expectations and alias lineage without opening a live datastore session.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "object-storage-service-role": {
    label: "Object-storage service role",
    provider_label: "Artifact and evidence object storage",
    provider_family_ref: "OBJECT_STORAGE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0051",
    summary:
      "Object-store role boundaries and bucket topology are frozen, but provider choice is unresolved and remains blocked in smoke execution.",
    docs_urls: () => [],
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("object-storage/service-role", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "object-storage-service-role",
    expected_scopes: () => ["bucket:read-metadata", "bucket:write-evidence"],
    endpoint: () => ({
      label: "Object storage bucket catalog",
      url: "provider-unresolved://object-storage",
    }),
    non_destructive_action: () =>
      "Stop at provider-selection evidence and preserve bucket-role expectations only.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "broker-client-auth-credential": {
    label: "Broker client auth credential",
    provider_label: "Queue or broker coordination fabric",
    provider_family_ref: "MESSAGE_COORDINATION",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0052",
    summary:
      "Broker identity remains transport-only and provider-unresolved, so smoke validation must preserve the explicit gap instead of inventing connectivity.",
    docs_urls: (data) => data.messagingInventory.provider_option_rows?.[0]?.docs_urls ?? [],
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("messaging/broker-client-auth", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "authenticated-broker-client",
    expected_scopes: () => ["publish", "consume", "dedupe-ledger"],
    endpoint: () => ({
      label: "Broker transport endpoint",
      url: "provider-unresolved://message-broker",
    }),
    non_destructive_action: () =>
      "Stop at provider-selection evidence and preserve transport-only auth posture.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "cache-auth-token-or-mtls-identity": {
    label: "Cache auth token or mTLS identity",
    provider_label: "Cache and stream-resume store",
    provider_family_ref: "CACHE_RESUME",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0053",
    summary:
      "Cache identity stays strictly non-authoritative and provider-unresolved, so smoke results must keep the block typed and environment-bound.",
    docs_urls: (data) => data.cacheInventory.provider_option_rows?.[0]?.docs_urls ?? [],
    safe_refs: (data) =>
      uniqueStrings([aliasIfPresent(data, "alias.runtime.cache.resume-token")]),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "resume-and-continuity-cache",
    expected_scopes: () => ["cache:read", "cache:write", "resume:partition-bound"],
    endpoint: () => ({
      label: "Cache topology endpoint",
      url: "provider-unresolved://cache-resume",
    }),
    non_destructive_action: () =>
      "Stop at provider-selection evidence and preserve route-bound cache identity expectations.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "otel-ingest-identity": {
    label: "OTel ingest identity",
    provider_label: "OpenTelemetry gateway and backends",
    provider_family_ref: "OBSERVABILITY_BACKBONE",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0054",
    summary:
      "Collector and backend identity law is machine-readable, but live platform selection remains open and must fail closed.",
    docs_urls: (data) =>
      uniqueStrings([
        ...(data.observabilityInventory.provider_option_rows?.[0]?.docs_urls ?? []),
        OFFICIAL_DOC_URLS.otelGateway,
        OFFICIAL_DOC_URLS.otelResiliency,
      ]),
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("observability/otel-ingest-identity", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "otlp-gateway-or-exporter",
    expected_scopes: () => ["otlp:traces", "otlp:metrics", "otlp:logs"],
    endpoint: () => ({
      label: "OTLP gateway endpoint",
      url: "provider-unresolved://otel-gateway",
    }),
    non_destructive_action: () =>
      "Preserve OTLP gateway and exporter identity posture without sending live telemetry from the smoke matrix.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "registry-and-signing-material": {
    label: "Registry and signing material",
    provider_label: "Supply-chain registry and signing stack",
    provider_family_ref: "SUPPLY_CHAIN",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0055",
    summary:
      "The recommended registry and signing stack is encoded, but live provider selection remains pending and the smoke matrix must preserve that governance boundary.",
    docs_urls: (data) => supplyChainRecommendedStack(data)?.docs_urls ?? [],
    safe_refs: (_data, environmentRef) =>
      genericBlockedProviderRefs("supplychain/registry-signing-material", environmentRef),
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data) =>
      supplyChainRecommendedStack(data)?.provider_label ?? "supply-chain-provider-selection",
    expected_scopes: () => ["registry:push-by-digest", "sign:artifact", "attest:provenance"],
    endpoint: () => ({
      label: "Registry namespace and signing surface",
      url: "provider-unresolved://registry-signing",
    }),
    non_destructive_action: () =>
      "Stop at recommended-stack evidence and preserve the pending provider-decision marker.",
    posture_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
    default_outcome_for_in_scope: () => "BLOCKED_PROVIDER_SELECTION",
  },
  "dns-api-and-cert-automation-identity": {
    label: "DNS API and cert automation identity",
    provider_label: "Cloudflare-compatible edge control plane",
    provider_family_ref: "EDGE_CONTROL_PLANE",
    validation_mode: "API_SMOKE",
    source_card_ref: "pc_0056",
    summary:
      "Edge control-plane identity is selected and may prove zone, certificate, and preview-domain posture through non-destructive metadata reads only.",
    docs_urls: (data) =>
      uniqueStrings([
        ...(edgeProviderOption(data)?.docs_urls ?? []),
        OFFICIAL_DOC_URLS.cloudflareApiTokens,
        OFFICIAL_DOC_URLS.cloudflarePreviewDeployments,
      ]),
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/edge/cloudflare/api-token/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data) =>
      edgeProviderOption(data)?.provider_label ?? "cloudflare-edge-control-plane",
    expected_scopes: () => ["zone:read", "dns:edit", "ssl:read", "pages:preview:read"],
    endpoint: () => ({
      label: "Zone catalog endpoint",
      url: "https://api.cloudflare.com/client/v4/zones",
    }),
    non_destructive_action: () =>
      "Read zone, cert, and preview-domain metadata only; do not mutate DNS, TLS, or WAF settings from smoke validation.",
  },
  "ci-runner-and-preview-deploy-token": {
    label: "CI runner and preview deploy identity",
    provider_label: "GitHub Actions OIDC broker",
    provider_family_ref: "DELIVERY_IDENTITY",
    validation_mode: "WORKLOAD_IDENTITY_ASSERTION",
    source_card_ref: "pc_0057",
    summary:
      "CI and preview identities prove subject, audience, broker role, and environment scope without minting broad long-lived delivery secrets.",
    docs_urls: () => [
      OFFICIAL_DOC_URLS.githubOidc,
      OFFICIAL_DOC_URLS.githubEnvironments,
      OFFICIAL_DOC_URLS.githubReviewDeployments,
    ],
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/ci/runner-and-preview-deploy/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: (data, environmentRef) => {
      const binding = ciBindingForEnvironment(data, environmentRef);
      return binding?.oidc_subject_template ?? "repo:maqboolahmed24/taxat_:environment:*";
    },
    expected_scopes: (data, environmentRef) =>
      uniqueStrings(ciBindingForEnvironment(data, environmentRef)?.allowed_secret_refs ?? []),
    endpoint: () => ({
      label: "GitHub Actions OIDC issuer",
      url: "https://token.actions.githubusercontent.com/.well-known/openid-configuration",
    }),
    non_destructive_action: () =>
      "Validate OIDC subject, audience, and broker-role expectations only; do not create a preview deploy or release mutation from smoke execution.",
  },
  "apple-signing-certificate-and-notary-key": {
    label: "Apple signing certificate and notary key",
    provider_label: "Apple Developer ID and notarization",
    provider_family_ref: "NATIVE_DELIVERY",
    validation_mode: "MANUAL_CHECKPOINT_GATED",
    source_card_ref: "pc_0055",
    summary:
      "Apple signing and notarization credentials remain tightly controlled and disabled for unattended smoke execution outside a native release window.",
    docs_urls: () => [OFFICIAL_DOC_URLS.appleApnsTokens],
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/apple/signing-and-notary/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "apple-developer-id-notary-boundary",
    expected_scopes: () => ["codesign", "notary-submit", "notary-status"],
    endpoint: () => ({
      label: "Apple notarization service",
      url: "https://appstoreconnect.apple.com/notary/v2/submissions",
    }),
    non_destructive_action: () =>
      "Keep certificate and notary identity lineage aligned without submitting a live notarization request from the default smoke matrix.",
    posture_for_in_scope: () => "ENVIRONMENT_DISABLED",
    default_outcome_for_in_scope: () => "ENVIRONMENT_DISABLED",
  },
  "desktop-update-publishing-identity": {
    label: "Desktop update publishing identity",
    provider_label: "Native update channel publisher",
    provider_family_ref: "NATIVE_DELIVERY",
    validation_mode: "NON_DESTRUCTIVE_METADATA_ASSERTION",
    source_card_ref: "pc_0055",
    summary:
      "Native update-publishing identity remains candidate-bound and disabled outside explicit release windows.",
    docs_urls: () => [OFFICIAL_DOC_URLS.githubContainerRegistry],
    safe_refs: (_data, environmentRef) => [
      `vault://metadata/${runtimeNamespaceForEnvironment(environmentRef)}/native/update-publishing/current`,
    ],
    secret_namespaces: (_data, environmentRef) => [runtimeNamespaceForEnvironment(environmentRef)],
    expected_principal: () => "signed-native-update-channel-publisher",
    expected_scopes: () => ["manifest:write", "package:publish"],
    endpoint: (_data, environmentRef) => ({
      label: "Signed update manifest endpoint",
      url:
        environmentRef === "env_production"
          ? "https://updates.production.taxat.example/macos/channel/manifest.json"
          : "https://updates.preprod.taxat.example/macos/channel/manifest.json",
    }),
    non_destructive_action: () =>
      "Read signed update-channel metadata only; do not publish or rotate a live update feed from smoke validation.",
    posture_for_in_scope: () => "ENVIRONMENT_DISABLED",
    default_outcome_for_in_scope: () => "ENVIRONMENT_DISABLED",
  },
};

function createCredentialFamilyRegistryRow(
  record: CredentialInventoryRecord,
  data: ProjectData,
): CredentialFamilyRegistryRow {
  const definition = FAMILY_DEFINITIONS[record.credential_key];
  const inScopeEnvironmentRefs = ENVIRONMENT_OPTIONS.filter((environment) =>
    record.environment_scope.includes(environment.scope_key),
  ).map((environment) => environment.environment_ref);

  const sampleEnvironment = inScopeEnvironmentRefs[0] ?? "env_preproduction_verification";

  return {
    credential_key: record.credential_key,
    label: definition.label,
    provider_label: definition.provider_label,
    provider_family_ref: definition.provider_family_ref,
    validation_mode: definition.validation_mode,
    source_card_ref: definition.source_card_ref,
    environment_refs: inScopeEnvironmentRefs,
    safe_ref_samples: definition.safe_refs(data, sampleEnvironment),
    docs_urls: uniqueStrings(definition.docs_urls(data, sampleEnvironment)),
    summary: definition.summary,
    source_refs: [
      ...toSourceRefs(record.source_refs),
      ...(definition.extra_source_refs?.(data, sampleEnvironment) ?? []),
    ],
    notes: [
      ...(definition.notes?.(data, sampleEnvironment) ?? []),
      ...record.usage_constraints,
    ],
  };
}

export function createCredentialSmokeMatrix(repoRoot = DEFAULT_REPO_ROOT): CredentialSmokeMatrix {
  const data = loadProjectData(repoRoot);
  const familyRows = data.credentialInventory.credential_records.map((record) =>
    createCredentialFamilyRegistryRow(record, data),
  );

  const smokeRows: CredentialSmokeMatrixRow[] = [];

  for (const record of data.credentialInventory.credential_records) {
    const definition = FAMILY_DEFINITIONS[record.credential_key];

    for (const environment of ENVIRONMENT_OPTIONS) {
      const inScope = record.environment_scope.includes(environment.scope_key);
      const executionPosture = inScope
        ? definition.posture_for_in_scope?.(data, environment.environment_ref) ??
          "IN_SCOPE_DEFAULT"
        : "ENVIRONMENT_DISABLED";
      const defaultResultCode = inScope
        ? definition.default_outcome_for_in_scope?.(data, environment.environment_ref) ??
          defaultOutcomeForPosture(executionPosture)
        : "ENVIRONMENT_DISABLED";
      const allowedOutcomeCodes: SmokeOutcomeCode[] = inScope
        ? definition.allowed_in_scope_outcomes ??
          allowedOutcomesForPosture(executionPosture)
        : ["ENVIRONMENT_DISABLED"];
      const endpoint = definition.endpoint(data, environment.environment_ref);

      smokeRows.push({
        smoke_row_ref: smokeRowRef(record.credential_key, environment.environment_ref),
        credential_key: record.credential_key,
        family_label: definition.label,
        provider_label: definition.provider_label,
        provider_family_ref: definition.provider_family_ref,
        environment_ref: environment.environment_ref,
        environment_label: environment.label,
        in_scope_for_environment: inScope,
        validation_mode: definition.validation_mode,
        source_card_ref: definition.source_card_ref,
        safe_credential_refs: definition.safe_refs(data, environment.environment_ref),
        secret_namespace_refs: definition.secret_namespaces(data, environment.environment_ref),
        expected_principal: inScope
          ? definition.expected_principal(data, environment.environment_ref)
          : "NOT_APPLICABLE_FOR_ENVIRONMENT",
        expected_scope_or_role_refs: inScope
          ? definition.expected_scopes(data, environment.environment_ref)
          : [],
        expected_endpoint_label: endpoint.label,
        expected_endpoint_url_or_template: endpoint.url,
        non_destructive_action: inScope
          ? definition.non_destructive_action(data, environment.environment_ref)
          : "Do not execute in this environment; keep the credential family hidden behind the environment boundary.",
        timeout_ms: 4_000,
        max_retries: 2,
        execution_posture: executionPosture,
        default_result_code: defaultResultCode,
        allowed_outcome_codes: allowedOutcomeCodes,
        policy_refs: [
          "config/smoke/principal_scope_and_endpoint_assertions.json",
          "config/smoke/manual_checkpoint_policy.json",
          "config/smoke/masked_evidence_capture_policy.json",
        ],
        docs_urls: uniqueStrings(definition.docs_urls(data, environment.environment_ref)),
        source_refs: [
          ...toSourceRefs(record.source_refs),
          ...(definition.extra_source_refs?.(data, environment.environment_ref) ?? []),
        ],
        notes: [
          ...(definition.notes?.(data, environment.environment_ref) ?? []),
          ...(inScope
            ? []
            : [
                `Credential family ${record.credential_key} is not expected in ${environment.label} and therefore remains environment-disabled.`,
              ]),
        ],
      });
    }
  }

  return {
    schema_version: "1.0",
    matrix_id: "credential_smoke_matrix",
    provider_id: CREDENTIAL_SMOKE_PROVIDER_ID,
    flow_id: CREDENTIAL_SMOKE_FLOW_ID,
    policy_version: CREDENTIAL_SMOKE_POLICY_VERSION,
    environments: [...ENVIRONMENT_OPTIONS],
    family_rows: familyRows,
    smoke_rows: smokeRows,
    typed_gaps: [
      "Supply-chain registry/signing material remains blocked pending live provider-stack approval.",
      "Several infrastructure credential families remain blocked until platform provider selection is frozen.",
      "HMRC production and native release credentials remain environment-disabled outside explicit release windows.",
    ],
    notes: [
      "The matrix expands every canonical credential family across every canonical environment so out-of-scope execution stays typed instead of implicit.",
      "No raw credentials, cookies, bearer tokens, or secret values appear anywhere in the matrix.",
    ],
    last_verified_at: CREDENTIAL_SMOKE_LAST_VERIFIED_AT,
  };
}

export function createPrincipalScopeAndEndpointAssertions(
  repoRoot = DEFAULT_REPO_ROOT,
): PrincipalScopeAndEndpointAssertions {
  const matrix = createCredentialSmokeMatrix(repoRoot);

  return {
    schema_version: "1.0",
    pack_id: "principal_scope_and_endpoint_assertions",
    assertion_rows: matrix.smoke_rows.map((row) => ({
      assertion_ref: assertionRef(row.smoke_row_ref),
      smoke_row_ref: row.smoke_row_ref,
      credential_key: row.credential_key,
      environment_ref: row.environment_ref,
      principal_expectation: row.expected_principal,
      scope_expectation_refs: row.expected_scope_or_role_refs,
      endpoint_expectation: row.expected_endpoint_url_or_template,
      success_evidence_requirements: [
        "safe_credential_ref",
        "principal_identity",
        "scope_or_role_identity",
        "endpoint_reachability",
        "masked_response_metadata",
      ],
      auth_mismatch_outcome_code: "SOFT_FAIL_AUTH_MISMATCH",
      principal_mismatch_outcome_code: "SOFT_FAIL_PRINCIPAL_MISMATCH",
      scope_mismatch_outcome_code: "SOFT_FAIL_SCOPE_MISMATCH",
      endpoint_mismatch_outcome_code: "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH",
      transient_failure_outcome_code: "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE",
      notes: [
        row.in_scope_for_environment
          ? "Principal, scope, endpoint, and environment mismatches remain distinct so later operators do not compress them into a generic auth failure."
          : "Out-of-scope rows preserve environment-disabled posture and do not become ad hoc smoke targets.",
      ],
      source_refs: row.source_refs,
    })),
    notes: [
      "Assertions are row-aligned with the canonical smoke matrix.",
      "Endpoint mismatches and provider-environment mismatches remain distinct from generic auth or scope failures.",
    ],
    source_refs: [
      {
        source_ref:
          "Algorithm/security_and_runtime_hardening_contract.md::least-privilege-and-secret-boundaries",
        rationale:
          "Principal and scope mismatches must fail closed without widening secret or provider access.",
      },
      {
        source_ref:
          "Algorithm/verification_and_release_gates.md::security-suite-expectations",
        rationale:
          "Verification evidence must preserve typed failure classes instead of flattening them into pass/fail.",
      },
    ],
  };
}

export function createManualCheckpointPolicy(): ManualCheckpointPolicy {
  const sourceRefs: SourceRef[] = [
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::manual-step-up-and-secret-handling",
      rationale:
        "Manual checkpoints must pause lawfully, capture masked evidence only, and never bypass a provider challenge.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::durable-operational-evidence",
      rationale:
        "Manual checkpoints require durable, typed evidence rather than ephemeral chat memory or free-form notes.",
    },
  ];

  return {
    schema_version: "1.0",
    policy_id: "manual_checkpoint_policy",
    truth_boundary_statement:
      "Manual checkpoints are lawful pauses, not bypass candidates. The smoke matrix captures masked evidence, emits a typed outcome, and waits for explicit human verification before any future continuation.",
    reason_rows: [
      {
        reason_code: "CAPTCHA",
        reason_family: "ANTI_BOT",
        default_summary: "Anti-bot or CAPTCHA challenge detected.",
        detection_cues: ["captcha", "verify you are human", "security challenge"],
        required_capture_modes: ["MASKED", "HASH_ONLY", "REFERENCE_ONLY"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Require operator completion, re-read the page identity, and confirm session continuity before any later action.",
        forbidden_actions: [
          "BYPASS_PROVIDER_CHALLENGE",
          "PERSIST_RAW_CHALLENGE_RESPONSE",
          "REPLAY_STALE_PRE_CHALLENGE_MUTATION",
        ],
        notes: [
          "CAPTCHA is provider-controlled and remains strictly non-delegable.",
        ],
        source_refs: sourceRefs,
      },
      {
        reason_code: "MFA_REQUIRED",
        reason_family: "IDENTITY_STEP_UP",
        default_summary: "A provider MFA or one-time-code challenge is active.",
        detection_cues: ["two-step verification", "authenticator app", "one-time code"],
        required_capture_modes: ["MASKED", "HASH_ONLY", "REFERENCE_ONLY"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Pause, capture the masked checkpoint state, and resume only after a fresh route and session revalidation.",
        forbidden_actions: [
          "STORE_ONE_TIME_CODE",
          "STORE_PROVIDER_SESSION_COOKIE",
          "REUSE_STALE_SESSION",
        ],
        notes: ["MFA completion does not authorize stale pre-checkpoint actions."],
        source_refs: sourceRefs,
      },
      {
        reason_code: "STEP_UP_REQUIRED",
        reason_family: "IDENTITY_STEP_UP",
        default_summary: "The provider requires higher-assurance identity for this path.",
        detection_cues: ["step-up", "verify your identity", "security key"],
        required_capture_modes: ["MASKED", "HASH_ONLY", "REFERENCE_ONLY"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Resume only after re-reading the exact post-step-up route and proving the same smoke target remains selected.",
        forbidden_actions: [
          "ASSUME_STEP_UP_COMPLETED",
          "SKIP_ROUTE_REVALIDATION",
          "REPLAY_MUTATION_FROM_PRE_STEP_UP_STATE",
        ],
        notes: ["Higher-assurance flows remain explicit in the smoke matrix."],
        source_refs: sourceRefs,
      },
      {
        reason_code: "EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED",
        reason_family: "VERIFICATION",
        default_summary: "Email or domain verification is pending before the control plane can proceed.",
        detection_cues: ["verify domain", "check your email", "pending dns"],
        required_capture_modes: ["MASKED", "HASH_ONLY", "REFERENCE_ONLY"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Wait for provider-side verification to settle, then re-run the same non-destructive smoke assertion.",
        forbidden_actions: [
          "FAKE_PROVIDER_VERIFICATION",
          "MARK_READY_WITHOUT_PROVIDER_EVIDENCE",
          "PERSIST_RAW_PROVIDER_MAILBOX_COPY",
        ],
        notes: ["This reason covers DNS or mailbox verification pauses."],
        source_refs: sourceRefs,
      },
      {
        reason_code: "SUSPICIOUS_LOGIN_REVIEW",
        reason_family: "VERIFICATION",
        default_summary: "The provider flagged the session for suspicious-login review.",
        detection_cues: ["suspicious login", "confirm this was you", "review activity"],
        required_capture_modes: ["MASKED", "HASH_ONLY", "REFERENCE_ONLY"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Require operator review and a new session before any later smoke action resumes.",
        forbidden_actions: [
          "PERSIST_RAW_DEVICE_LIST",
          "REUSE_REJECTED_SESSION",
          "ASSUME_REVIEW_RESOLVED",
        ],
        notes: ["Suspicious-login screens remain explicit, never silently skipped."],
        source_refs: sourceRefs,
      },
      {
        reason_code: "OPERATOR_APPROVAL_REQUIRED",
        reason_family: "HUMAN_APPROVAL",
        default_summary: "A provider or release boundary requires explicit operator approval.",
        detection_cues: ["approval required", "confirm publish", "release approval"],
        required_capture_modes: ["REFERENCE_ONLY", "MASKED"],
        outcome_code: "MANUAL_CHECKPOINT_REQUIRED",
        resume_rule:
          "Keep the smoke row open, capture the safe approval reference, and resume only during an approved window.",
        forbidden_actions: [
          "SELF_APPROVE",
          "PERSIST_RAW_APPROVAL_SESSION",
          "EXECUTE_OUTSIDE_RELEASE_WINDOW",
        ],
        notes: ["Approval-gated release paths remain disabled unless explicitly opened."],
        source_refs: sourceRefs,
      },
    ],
    notes: [
      "Every manual checkpoint emits the same typed outcome code but preserves its reason family and resume rule.",
      "The smoke matrix never stores raw challenge answers, cookies, mailbox contents, or live browser storage.",
    ],
    source_refs: sourceRefs,
  };
}

export function createMaskedEvidenceCapturePolicy(): MaskedEvidenceCapturePolicy {
  const sourceRefs: SourceRef[] = [
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::no-secret-leakage-to-logs-traces-or-caches",
      rationale:
        "Evidence capture must never persist raw credentials, session cookies, or bearer tokens outside the governed boundary.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::durable-evidence-versus-telemetry",
      rationale:
        "Smoke evidence belongs in a durable, typed ledger instead of noisy telemetry or free-form screenshots.",
    },
  ];

  return {
    schema_version: "1.0",
    policy_id: "masked_evidence_capture_policy",
    evidence_root: "artifacts/smoke/external-credential-evidence",
    retained_safe_fields: [
      "safe_credential_ref",
      "vault_metadata_ref",
      "credential_fingerprint_or_alias",
      "principal_identity",
      "scope_or_role_identity",
      "endpoint_identifier",
      "masked_http_status",
      "masked_http_body_excerpt",
      "checkpoint_reason_code",
      "evidence_ref",
    ],
    forbidden_persisted_fields: [
      "raw_secret",
      "raw_bearer_token",
      "raw_refresh_token",
      "raw_session_cookie",
      "raw_authorization_header",
      "raw_provider_page_html",
      "raw_browser_storage",
      "unredacted_screenshot",
    ],
    rule_rows: [
      {
        rule_ref: "safe-credential-ref.reference-only",
        artifact_kind: "SAFE_CREDENTIAL_REF",
        capture_mode: "REFERENCE_ONLY",
        allowed_fields: ["safe_credential_ref", "vault_metadata_ref"],
        forbidden_fields: ["raw_secret", "vault://secret/*"],
        redaction_strategy: "Reference metadata and aliases only.",
        retention_location: "typed-json-ledger",
        notes: ["Credential refs must point to safe aliases or metadata only."],
        source_refs: sourceRefs,
      },
      {
        rule_ref: "principal-scope.masked",
        artifact_kind: "PRINCIPAL_ASSERTION",
        capture_mode: "MASKED",
        allowed_fields: ["principal_identity", "scope_or_role_identity"],
        forbidden_fields: ["raw_access_token", "raw_private_key"],
        redaction_strategy:
          "Normalize to exact principal or scope identifiers without embedding any credential material.",
        retention_location: "typed-json-ledger",
        notes: ["Principal and scope evidence remains copy-safe."],
        source_refs: sourceRefs,
      },
      {
        rule_ref: "http-metadata.masked",
        artifact_kind: "HTTP_METADATA",
        capture_mode: "MASKED",
        allowed_fields: ["masked_http_status", "masked_http_body_excerpt", "endpoint_identifier"],
        forbidden_fields: ["raw_authorization_header", "set-cookie", "raw_response_body"],
        redaction_strategy:
          "Capture status and short body fragments only after explicit masking and truncation.",
        retention_location: "typed-json-ledger",
        notes: ["HTTP evidence stays metadata-only and short-form."],
        source_refs: sourceRefs,
      },
      {
        rule_ref: "checkpoint-screenshot.masked",
        artifact_kind: "MASKED_SCREENSHOT",
        capture_mode: "MASKED",
        allowed_fields: ["masked_screenshot_path", "checkpoint_reason_code"],
        forbidden_fields: ["unredacted_screenshot", "visible_secret_field", "mailbox_or_otp"],
        redaction_strategy: "Mask inputs, mailbox hints, one-time codes, and challenge prompts.",
        retention_location: "masked-artifact-store",
        notes: ["Screenshots are allowed only for manual checkpoints and only after masking."],
        source_refs: sourceRefs,
      },
      {
        rule_ref: "dom-signature.hash-only",
        artifact_kind: "DOM_SIGNATURE",
        capture_mode: "HASH_ONLY",
        allowed_fields: ["title_hash", "url_hash", "dom_hash"],
        forbidden_fields: ["raw_provider_page_html", "raw_form_values"],
        redaction_strategy: "Store page signatures only, never a raw DOM dump.",
        retention_location: "typed-json-ledger",
        notes: ["DOM capture is hash-only by default."],
        source_refs: sourceRefs,
      },
      {
        rule_ref: "browser-storage.suppressed",
        artifact_kind: "CHECKPOINT_RECORD",
        capture_mode: "REFERENCE_ONLY",
        allowed_fields: ["checkpoint_record_ref"],
        forbidden_fields: ["raw_browser_storage", "raw_session_cookie"],
        redaction_strategy: "Persist a checkpoint ref only; browser state never leaves the boundary.",
        retention_location: "typed-json-ledger",
        notes: ["Browser storage is never exported into repo-tracked evidence."],
        source_refs: sourceRefs,
      },
    ],
    notes: [
      "Raw credential material, raw cookies, and raw provider pages are always forbidden.",
      "Screenshots and DOM evidence are limited to masked or hash-only checkpoint capture.",
    ],
    source_refs: sourceRefs,
  };
}

function sourceCardRefForRow(row: CredentialSmokeMatrixRow): string {
  return row.source_card_ref;
}

function defaultObservedPrincipal(
  row: CredentialSmokeMatrixRow,
  outcomeCode: SmokeOutcomeCode,
): string | null {
  if (outcomeCode === "SUCCESS" || outcomeCode === "SOFT_FAIL_SCOPE_MISMATCH") {
    return row.expected_principal;
  }
  if (outcomeCode === "SOFT_FAIL_PRINCIPAL_MISMATCH") {
    return `${row.expected_principal}::unexpected`;
  }
  if (outcomeCode === "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH") {
    return `${row.provider_label}::wrong-environment`;
  }
  if (outcomeCode === "SOFT_FAIL_AUTH_MISMATCH") {
    return "provider-rejected-principal";
  }
  return null;
}

function defaultObservedScopes(
  row: CredentialSmokeMatrixRow,
  outcomeCode: SmokeOutcomeCode,
): string[] {
  if (outcomeCode === "SUCCESS" || outcomeCode === "SOFT_FAIL_PRINCIPAL_MISMATCH") {
    return [...row.expected_scope_or_role_refs];
  }
  if (outcomeCode === "SOFT_FAIL_SCOPE_MISMATCH") {
    return row.expected_scope_or_role_refs.slice(0, 1);
  }
  return [];
}

function defaultObservedEndpoint(
  row: CredentialSmokeMatrixRow,
  outcomeCode: SmokeOutcomeCode,
): string | null {
  if (outcomeCode === "SUCCESS" || outcomeCode === "SOFT_FAIL_SCOPE_MISMATCH") {
    return row.expected_endpoint_url_or_template;
  }
  if (outcomeCode === "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH") {
    return `${row.expected_endpoint_url_or_template}#environment-mismatch`;
  }
  return null;
}

function defaultHttpStatus(outcomeCode: SmokeOutcomeCode): number | null {
  switch (outcomeCode) {
    case "SUCCESS":
      return 200;
    case "SOFT_FAIL_AUTH_MISMATCH":
      return 401;
    case "SOFT_FAIL_PRINCIPAL_MISMATCH":
    case "SOFT_FAIL_SCOPE_MISMATCH":
      return 403;
    case "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH":
      return 409;
    case "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE":
      return 503;
    case "MANUAL_CHECKPOINT_REQUIRED":
      return 202;
    default:
      return null;
  }
}

function defaultMaskedExcerpt(
  row: CredentialSmokeMatrixRow,
  outcomeCode: SmokeOutcomeCode,
): string | null {
  switch (outcomeCode) {
    case "SUCCESS":
      return `Masked provider response confirmed ${row.provider_label} principal and endpoint posture.`;
    case "SOFT_FAIL_AUTH_MISMATCH":
      return "Masked provider response reported authentication rejected for the bound alias.";
    case "SOFT_FAIL_PRINCIPAL_MISMATCH":
      return "Masked provider response resolved a principal identity that does not match the expected environment binding.";
    case "SOFT_FAIL_SCOPE_MISMATCH":
      return "Masked provider response authenticated successfully but omitted one or more expected scopes or roles.";
    case "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE":
      return "Masked provider response indicated a transient availability or rate-limit condition.";
    case "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH":
      return "Masked provider response routed to the wrong provider environment or endpoint family.";
    case "MANUAL_CHECKPOINT_REQUIRED":
      return "Masked checkpoint capture retained only route identity, challenge reason, and sanitized evidence refs.";
    default:
      return null;
  }
}

function defaultManualCheckpointReason(
  row: CredentialSmokeMatrixRow,
  outcomeCode: SmokeOutcomeCode,
): ManualCheckpointReasonRow["reason_code"] | null {
  if (outcomeCode !== "MANUAL_CHECKPOINT_REQUIRED") {
    return null;
  }
  if (row.credential_key === "email-provider-api-key-and-domain-proof") {
    return "EMAIL_OR_DOMAIN_VERIFICATION_REQUIRED";
  }
  if (row.validation_mode === "MANUAL_CHECKPOINT_GATED") {
    return "OPERATOR_APPROVAL_REQUIRED";
  }
  return "MFA_REQUIRED";
}

function resultSummary(row: CredentialSmokeMatrixRow, outcomeCode: SmokeOutcomeCode): string {
  switch (outcomeCode) {
    case "SUCCESS":
      return `${row.family_label} proved the expected principal, scope, and endpoint with masked evidence only.`;
    case "SOFT_FAIL_AUTH_MISMATCH":
      return `${row.family_label} reached the expected control plane but the provider rejected the bound credential alias.`;
    case "SOFT_FAIL_PRINCIPAL_MISMATCH":
      return `${row.family_label} authenticated, but the observed principal did not match the expected environment-specific identity.`;
    case "SOFT_FAIL_SCOPE_MISMATCH":
      return `${row.family_label} authenticated with a narrowed or unexpected role set.`;
    case "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE":
      return `${row.family_label} hit a transient provider failure or rate-limit condition and requires a bounded retry.`;
    case "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH":
      return `${row.family_label} reached the wrong provider environment or endpoint family for the selected environment.`;
    case "BLOCKED_PROVIDER_SELECTION":
      return `${row.family_label} is blocked until the unresolved provider choice is made explicit.`;
    case "BLOCKED_NOT_SELECTED":
      return `${row.family_label} remains absent because the integration has not been selected.`;
    case "MANUAL_CHECKPOINT_REQUIRED":
      return `${row.family_label} stopped at a lawful provider checkpoint and retained masked evidence only.`;
    case "ENVIRONMENT_DISABLED":
      return `${row.family_label} is disabled in this environment and must not be exercised here.`;
  }
}

function nextAction(row: CredentialSmokeMatrixRow, outcomeCode: SmokeOutcomeCode): string {
  switch (outcomeCode) {
    case "SUCCESS":
      return "Reuse this row's alias, principal, scope, and endpoint assertions as the canonical non-destructive readiness proof.";
    case "SOFT_FAIL_AUTH_MISMATCH":
      return "Rotate or rebind the credential alias, then re-run the same non-destructive assertion.";
    case "SOFT_FAIL_PRINCIPAL_MISMATCH":
      return "Confirm tenant, project, or broker binding for the selected environment before another smoke run.";
    case "SOFT_FAIL_SCOPE_MISMATCH":
      return "Update the provider grant or narrow the expected scope set so the mismatch remains explicit.";
    case "SOFT_FAIL_TRANSIENT_PROVIDER_FAILURE":
      return "Retry after the provider recovers; preserve the same row ref and masked evidence lineage.";
    case "SOFT_FAIL_PROVIDER_ENVIRONMENT_MISMATCH":
      return "Move the credential or endpoint binding to the correct environment and retry with the same smoke matrix row.";
    case "BLOCKED_PROVIDER_SELECTION":
      return "Complete provider selection first; do not invent a live smoke target while the control plane is unresolved.";
    case "BLOCKED_NOT_SELECTED":
      return "Decide whether this integration is required before any credential is acquired or exercised.";
    case "MANUAL_CHECKPOINT_REQUIRED":
      return "Pause, capture masked checkpoint evidence, and wait for explicit human verification before retrying.";
    case "ENVIRONMENT_DISABLED":
      return "Do not execute this credential in the selected environment; use the sanctioned environment or release window instead.";
  }
}

function buildEvidenceArtifacts(
  row: CredentialSmokeMatrixRow,
  runContext: MinimalRunContext,
  outcomeCode: SmokeOutcomeCode,
  maskedExcerpt: string | null,
  checkpointReason: ManualCheckpointReasonRow["reason_code"] | null,
): SmokeEvidenceArtifact[] {
  const artifacts: SmokeEvidenceArtifact[] = [
    {
      artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "safe-credential-ref"),
      artifact_kind: "SAFE_CREDENTIAL_REF",
      capture_mode: "REFERENCE_ONLY",
      summary: "Safe credential refs captured by alias or metadata path only.",
      relative_path_or_null: null,
      copy_safe_value_or_null: row.safe_credential_refs[0] ?? null,
    },
  ];

  if (
    outcomeCode === "SUCCESS" ||
    outcomeCode.startsWith("SOFT_FAIL") ||
    outcomeCode === "MANUAL_CHECKPOINT_REQUIRED"
  ) {
    artifacts.push(
      {
        artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "principal"),
        artifact_kind: "PRINCIPAL_ASSERTION",
        capture_mode: "MASKED",
        summary: "Principal identity captured without persisting the underlying credential.",
        relative_path_or_null: null,
        copy_safe_value_or_null: row.expected_principal,
      },
      {
        artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "scope"),
        artifact_kind: "SCOPE_ASSERTION",
        capture_mode: "MASKED",
        summary: "Scope or role identity captured as copy-safe text only.",
        relative_path_or_null: null,
        copy_safe_value_or_null: row.expected_scope_or_role_refs.join(", ") || null,
      },
    );
  }

  if (maskedExcerpt) {
    artifacts.push({
      artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "http-metadata"),
      artifact_kind: "HTTP_METADATA",
      capture_mode: "MASKED",
      summary: maskedExcerpt,
      relative_path_or_null: null,
      copy_safe_value_or_null: row.expected_endpoint_label,
    });
  }

  if (outcomeCode === "MANUAL_CHECKPOINT_REQUIRED") {
    artifacts.push(
      {
        artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "checkpoint-screenshot"),
        artifact_kind: "MASKED_SCREENSHOT",
        capture_mode: "MASKED",
        summary: `Masked screenshot retained for ${checkpointReason ?? "manual checkpoint"}.`,
        relative_path_or_null: `${row.smoke_row_ref}.masked.png`,
        copy_safe_value_or_null: null,
      },
      {
        artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "checkpoint-dom"),
        artifact_kind: "DOM_SIGNATURE",
        capture_mode: "HASH_ONLY",
        summary: "Checkpoint route retained as a page signature only.",
        relative_path_or_null: null,
        copy_safe_value_or_null: `${row.smoke_row_ref}.dom-hash`,
      },
      {
        artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "checkpoint-record"),
        artifact_kind: "CHECKPOINT_RECORD",
        capture_mode: "REFERENCE_ONLY",
        summary: "Checkpoint record ref retained for lawful resume only.",
        relative_path_or_null: null,
        copy_safe_value_or_null: `checkpoint://${runContext.runId}/${row.smoke_row_ref}`,
      },
    );
  }

  if (
    outcomeCode === "BLOCKED_PROVIDER_SELECTION" ||
    outcomeCode === "BLOCKED_NOT_SELECTED" ||
    outcomeCode === "ENVIRONMENT_DISABLED"
  ) {
    artifacts.push({
      artifact_ref: evidenceRef(runContext.runId, row.smoke_row_ref, "policy-note"),
      artifact_kind: "POLICY_NOTE",
      capture_mode: "REFERENCE_ONLY",
      summary: "Typed policy posture retained instead of live provider interaction.",
      relative_path_or_null: null,
      copy_safe_value_or_null: row.execution_posture,
    });
  }

  return artifacts;
}

function buildResultRow(
  row: CredentialSmokeMatrixRow,
  runContext: MinimalRunContext,
  override: SimulatedOutcomeOverride | undefined,
): ExternalCredentialSmokeResultRow {
  const outcomeCode = override?.outcome_code ?? row.default_result_code;
  const manualCheckpointReason =
    override?.manual_checkpoint_reason_code_or_null ??
    defaultManualCheckpointReason(row, outcomeCode);
  const maskedExcerpt =
    override?.masked_response_excerpt_or_null ??
    defaultMaskedExcerpt(row, outcomeCode);
  const evidenceArtifacts = buildEvidenceArtifacts(
    row,
    runContext,
    outcomeCode,
    maskedExcerpt,
    manualCheckpointReason,
  );

  return {
    smoke_row_ref: row.smoke_row_ref,
    credential_key: row.credential_key,
    environment_ref: row.environment_ref,
    outcome_code: outcomeCode,
    outcome_class: outcomeClassFor(outcomeCode),
    outcome_summary: resultSummary(row, outcomeCode),
    next_action: override?.next_action ?? nextAction(row, outcomeCode),
    executed_at: CREDENTIAL_SMOKE_LAST_VERIFIED_AT,
    adapter_mode: "SIMULATED_SAFE_NOOP",
    http_status_or_null: override?.http_status_or_null ?? defaultHttpStatus(outcomeCode),
    observed_principal_or_null:
      override?.observed_principal_or_null ??
      defaultObservedPrincipal(row, outcomeCode),
    observed_scope_or_role_refs:
      override?.observed_scope_or_role_refs ?? defaultObservedScopes(row, outcomeCode),
    observed_endpoint_or_null:
      override?.observed_endpoint_or_null ??
      defaultObservedEndpoint(row, outcomeCode),
    safe_credential_refs: row.safe_credential_refs,
    source_card_ref: sourceCardRefForRow(row),
    evidence_artifacts: evidenceArtifacts,
    evidence_ref_lineage: evidenceArtifacts.map((artifact) => artifact.artifact_ref),
    manual_checkpoint_reason_code_or_null: manualCheckpointReason,
    checkpoint_record_ref_or_null:
      outcomeCode === "MANUAL_CHECKPOINT_REQUIRED"
        ? `checkpoint://${runContext.runId}/${row.smoke_row_ref}`
        : null,
    notes: [
      ...row.notes,
      "Result derived from the safe no-op smoke adapter; no live provider mutation occurred.",
    ],
  };
}

function buildDefaultResultRows(
  matrix: CredentialSmokeMatrix,
  runContext: MinimalRunContext,
  overrides: Record<string, SimulatedOutcomeOverride> = {},
): ExternalCredentialSmokeResultRow[] {
  return matrix.smoke_rows.map((row) =>
    buildResultRow(row, runContext, overrides[row.smoke_row_ref]),
  );
}

function calculateOutcomeCounts(rows: ExternalCredentialSmokeResultRow[]): OutcomeCounts {
  const counts: OutcomeCounts = {
    success: 0,
    soft_fail: 0,
    blocked: 0,
    manual_checkpoint: 0,
    environment_disabled: 0,
    total: rows.length,
  };

  for (const row of rows) {
    switch (row.outcome_class) {
      case "SUCCESS":
        counts.success += 1;
        break;
      case "SOFT_FAIL":
        counts.soft_fail += 1;
        break;
      case "BLOCKED":
        counts.blocked += 1;
        break;
      case "MANUAL_CHECKPOINT":
        counts.manual_checkpoint += 1;
        break;
      case "ENVIRONMENT_DISABLED":
        counts.environment_disabled += 1;
        break;
    }
  }

  return counts;
}

function formatOutcomeSummary(counts: OutcomeCounts): string {
  return `${counts.success} ready · ${counts.manual_checkpoint} manual · ${counts.blocked} blocked · ${counts.soft_fail} soft fail`;
}

function createLedgerSlice(
  matrixRow: CredentialSmokeMatrixRow,
  resultRow: ExternalCredentialSmokeResultRow,
): CredentialEvidenceLedgerSlice {
  const outcomeLabel = formatLabel(resultRow.outcome_code);
  const captureModes = uniqueStrings(
    resultRow.evidence_artifacts.map((artifact) => formatLabel(artifact.capture_mode)),
  );
  const evidenceRefs = resultRow.evidence_artifacts.map((artifact) => artifact.artifact_ref);

  return {
    environment_ref: matrixRow.environment_ref,
    outcome_code: resultRow.outcome_code,
    outcome_label: outcomeLabel,
    summary: resultRow.outcome_summary,
    next_action: resultRow.next_action,
    result_ref: resultRow.smoke_row_ref,
    safe_credential_refs: resultRow.safe_credential_refs,
    source_card_ref: resultRow.source_card_ref,
    provider_label: matrixRow.provider_label,
    validation_mode: matrixRow.validation_mode,
    credential_rows: [
      {
        row_ref: `${matrixRow.smoke_row_ref}.credential`,
        label: matrixRow.family_label,
        detail: `${matrixRow.provider_label} · ${formatLabel(matrixRow.validation_mode)}`,
        badges: [
          formatLabel(matrixRow.validation_mode),
          matrixRow.safe_credential_refs.length
            ? `${matrixRow.safe_credential_refs.length} safe ref${matrixRow.safe_credential_refs.length === 1 ? "" : "s"}`
            : "No live refs",
        ],
        inspector_lines: [
          `Provider: ${matrixRow.provider_label}`,
          `Source card: ${matrixRow.source_card_ref}`,
          `Safe refs: ${matrixRow.safe_credential_refs.join(", ") || "n/a"}`,
          `Namespaces: ${matrixRow.secret_namespace_refs.join(", ") || "n/a"}`,
        ],
        evidence_refs: evidenceRefs,
        policy_refs: matrixRow.policy_refs,
      },
    ],
    assertion_rows: [
      {
        row_ref: `${matrixRow.smoke_row_ref}.assertion`,
        label: matrixRow.expected_principal,
        detail:
          matrixRow.expected_scope_or_role_refs.length > 0
            ? `${matrixRow.expected_scope_or_role_refs.join(", ")} · ${matrixRow.expected_endpoint_label}`
            : `${matrixRow.expected_endpoint_label} · environment disabled`,
        badges: [
          matrixRow.expected_scope_or_role_refs.length
            ? `${matrixRow.expected_scope_or_role_refs.length} scope${matrixRow.expected_scope_or_role_refs.length === 1 ? "" : "s"}`
            : "No scope set",
          matrixRow.expected_endpoint_label,
        ],
        inspector_lines: [
          `Expected principal: ${matrixRow.expected_principal}`,
          `Expected scopes / roles: ${matrixRow.expected_scope_or_role_refs.join(", ") || "n/a"}`,
          `Expected endpoint: ${matrixRow.expected_endpoint_url_or_template}`,
          `Non-destructive action: ${matrixRow.non_destructive_action}`,
        ],
        evidence_refs: evidenceRefs,
        policy_refs: matrixRow.policy_refs,
      },
    ],
    evidence_rows: [
      {
        row_ref: `${matrixRow.smoke_row_ref}.evidence`,
        label:
          resultRow.evidence_artifacts[0]?.summary ??
          "No evidence artifacts retained for this row",
        detail: `${resultRow.evidence_artifacts.length} masked artifact${resultRow.evidence_artifacts.length === 1 ? "" : "s"} · ${captureModes.join(", ")}`,
        badges: captureModes.length ? captureModes : ["Reference only"],
        inspector_lines: resultRow.evidence_artifacts.map(
          (artifact) =>
            `${artifact.artifact_kind}: ${artifact.summary} (${artifact.capture_mode})`,
        ),
        evidence_refs: evidenceRefs,
        policy_refs: matrixRow.policy_refs,
      },
    ],
    outcome_rows: [
      {
        row_ref: `${matrixRow.smoke_row_ref}.outcome`,
        label: outcomeLabel,
        detail: resultRow.next_action,
        badges: [
          formatLabel(resultRow.outcome_class),
          resultRow.manual_checkpoint_reason_code_or_null
            ? formatLabel(resultRow.manual_checkpoint_reason_code_or_null)
            : matrixRow.environment_label,
        ],
        inspector_lines: [
          `Outcome: ${outcomeLabel}`,
          `Summary: ${resultRow.outcome_summary}`,
          `Next action: ${resultRow.next_action}`,
          `HTTP status: ${resultRow.http_status_or_null ?? "n/a"}`,
        ],
        evidence_refs: evidenceRefs,
        policy_refs: matrixRow.policy_refs,
      },
    ],
    evidence_lineage: resultRow.evidence_artifacts.map((artifact) => ({
      node_ref: artifact.artifact_ref,
      label:
        artifact.artifact_kind === "MASKED_SCREENSHOT"
          ? "MCP"
          : artifact.artifact_kind === "HTTP_METADATA"
            ? "HTTP"
            : artifact.artifact_kind === "SAFE_CREDENTIAL_REF"
              ? "REF"
              : artifact.artifact_kind === "PRINCIPAL_ASSERTION"
                ? "PRN"
                : artifact.artifact_kind === "SCOPE_ASSERTION"
                  ? "SCP"
                  : artifact.artifact_kind === "POLICY_NOTE"
                    ? "POL"
                    : "EVD",
      tone:
        resultRow.outcome_class === "SUCCESS"
          ? "success"
          : resultRow.outcome_class === "MANUAL_CHECKPOINT"
            ? "warning"
            : resultRow.outcome_class === "SOFT_FAIL"
              ? "danger"
              : "neutral",
      summary: artifact.summary,
    })),
    inspector_notes: [
      `Provider family: ${matrixRow.provider_family_ref}`,
      `Default posture: ${formatLabel(matrixRow.execution_posture)}`,
      `Evidence refs: ${resultRow.evidence_ref_lineage.length}`,
    ],
  };
}

function rollupsForEnvironment(
  families: CredentialEvidenceLedgerFamily[],
): CredentialEvidenceLedgerViewModel["environmentRollups"] {
  return ENVIRONMENT_OPTIONS.map((environment) => {
    const rows = families
      .map((family) =>
        family.slices.find((slice) => slice.environment_ref === environment.environment_ref),
      )
      .filter((slice): slice is CredentialEvidenceLedgerSlice => Boolean(slice))
      .map((slice) => ({
        outcome_class: outcomeClassFor(slice.outcome_code),
      }));

    const counts: OutcomeCounts = {
      success: rows.filter((row) => row.outcome_class === "SUCCESS").length,
      soft_fail: rows.filter((row) => row.outcome_class === "SOFT_FAIL").length,
      blocked: rows.filter((row) => row.outcome_class === "BLOCKED").length,
      manual_checkpoint: rows.filter((row) => row.outcome_class === "MANUAL_CHECKPOINT").length,
      environment_disabled: rows.filter(
        (row) => row.outcome_class === "ENVIRONMENT_DISABLED",
      ).length,
      total: rows.length,
    };

    return {
      environment_ref: environment.environment_ref,
      outcome_counts: counts,
      outcome_summary_label: formatOutcomeSummary(counts),
    };
  });
}

function createCredentialEvidenceLedgerViewModelFromResults(
  matrix: CredentialSmokeMatrix,
  resultRows: ExternalCredentialSmokeResultRow[],
): CredentialEvidenceLedgerViewModel {
  const resultsByRef = new Map(resultRows.map((row) => [row.smoke_row_ref, row]));

  const families: CredentialEvidenceLedgerFamily[] = matrix.family_rows.map((familyRow) => {
    const slices = matrix.smoke_rows
      .filter((row) => row.credential_key === familyRow.credential_key)
      .map((row) => {
        const result = resultsByRef.get(row.smoke_row_ref);
        if (!result) {
          throw new Error(`Missing smoke result for ${row.smoke_row_ref}`);
        }
        return createLedgerSlice(row, result);
      });

    return {
      family_ref: familyRow.credential_key,
      label: familyRow.label,
      provider_label: familyRow.provider_label,
      source_card_ref: familyRow.source_card_ref,
      summary: familyRow.summary,
      family_note:
        familyRow.notes[0] ??
        "This family is read-only inside the ledger and cannot mutate provider state.",
      slices,
    };
  });

  return {
    routeId: "credential-evidence-ledger",
    providerDisplayName: "Credential smoke evidence ledger",
    providerMonogram: "SMK",
    selectionPosture: "SAFE_NON_DESTRUCTIVE_MATRIX",
    smokeRunBadge: "Safe no-op smoke run",
    postureChipLabel: "Masked evidence only",
    policyVersion: CREDENTIAL_SMOKE_POLICY_VERSION,
    summary:
      "Every canonical external credential family is expanded across every environment so readiness, manual checkpoints, blocked providers, and disabled lanes stay explicit instead of living in engineer memory.",
    notes: [
      "The ledger is read-only and never reveals a raw token, cookie, or secret value.",
      "Outcome, evidence, and next-action rows stay keyboard-addressable and stable under reduced motion.",
    ],
    environments: ENVIRONMENT_OPTIONS.map((environment) => ({
      environment_ref: environment.environment_ref,
      label: environment.label,
      topology_summary: environment.topology_summary,
      smoke_posture: environment.smoke_posture,
    })),
    environmentRollups: rollupsForEnvironment(families),
    families,
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedFamilyRef: "email-provider-api-key-and-domain-proof",
    selectedFocusRef: null,
  };
}

export function createCredentialEvidenceLedgerViewModel(
  repoRoot = DEFAULT_REPO_ROOT,
): CredentialEvidenceLedgerViewModel {
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const resultRows = buildDefaultResultRows(matrix, DEFAULT_RUN_CONTEXT);
  return createCredentialEvidenceLedgerViewModelFromResults(matrix, resultRows);
}

export function createExternalCredentialSmokeInventoryTemplate(options: {
  repoRoot?: string;
  runContext?: MinimalRunContext;
  resultRows?: ExternalCredentialSmokeResultRow[];
  simulatedOutcomeOverrides?: Record<string, SimulatedOutcomeOverride>;
} = {}): ExternalCredentialSmokeInventoryTemplate {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const runContext = options.runContext ?? DEFAULT_RUN_CONTEXT;
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const resultRows =
    options.resultRows ??
    buildDefaultResultRows(matrix, runContext, options.simulatedOutcomeOverrides ?? {});

  return {
    schema_version: "1.0",
    inventory_id: "external_credential_smoke_inventory",
    provider_id: CREDENTIAL_SMOKE_PROVIDER_ID,
    flow_id: CREDENTIAL_SMOKE_FLOW_ID,
    policy_version: CREDENTIAL_SMOKE_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    execution_mode: "SIMULATED_SAFE_NOOP",
    matrix_ref: "config/smoke/credential_smoke_matrix.json",
    assertion_ref: "config/smoke/principal_scope_and_endpoint_assertions.json",
    manual_checkpoint_policy_ref: "config/smoke/manual_checkpoint_policy.json",
    masked_evidence_policy_ref: "config/smoke/masked_evidence_capture_policy.json",
    result_rows: resultRows,
    outcome_counts: calculateOutcomeCounts(resultRows),
    notes: [
      "Template inventory is deterministic and safe to regenerate because it records only typed, masked result data.",
      "No live provider mutations or business operations occur when building this inventory template.",
    ],
    last_verified_at: CREDENTIAL_SMOKE_LAST_VERIFIED_AT,
    atlasViewModel: createCredentialEvidenceLedgerViewModelFromResults(matrix, resultRows),
  };
}

export function createExternalCredentialSmokeResultSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "urn:taxat:external_credential_smoke_result",
    title: "ExternalCredentialSmokeInventory",
    type: "object",
    required: [
      "schema_version",
      "inventory_id",
      "provider_id",
      "flow_id",
      "policy_version",
      "run_id",
      "workspace_id",
      "operator_identity_alias",
      "execution_mode",
      "result_rows",
      "outcome_counts",
      "atlasViewModel",
    ],
    properties: {
      schema_version: { const: "1.0" },
      inventory_id: { const: "external_credential_smoke_inventory" },
      provider_id: { const: CREDENTIAL_SMOKE_PROVIDER_ID },
      flow_id: { const: CREDENTIAL_SMOKE_FLOW_ID },
      policy_version: { const: CREDENTIAL_SMOKE_POLICY_VERSION },
      run_id: { type: "string", minLength: 1 },
      workspace_id: { type: "string", minLength: 1 },
      operator_identity_alias: { type: "string", minLength: 1 },
      execution_mode: { const: "SIMULATED_SAFE_NOOP" },
      result_rows: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "smoke_row_ref",
            "credential_key",
            "environment_ref",
            "outcome_code",
            "outcome_class",
            "outcome_summary",
            "next_action",
            "adapter_mode",
            "evidence_artifacts",
          ],
          properties: {
            smoke_row_ref: { type: "string" },
            credential_key: { enum: [...CREDENTIAL_KEYS] },
            environment_ref: { enum: [...ENVIRONMENT_REFS] },
            outcome_code: { enum: [...SMOKE_OUTCOME_CODES] },
            outcome_class: {
              enum: [
                "SUCCESS",
                "SOFT_FAIL",
                "BLOCKED",
                "MANUAL_CHECKPOINT",
                "ENVIRONMENT_DISABLED",
              ],
            },
            outcome_summary: { type: "string" },
            next_action: { type: "string" },
            adapter_mode: { const: "SIMULATED_SAFE_NOOP" },
            evidence_artifacts: {
              type: "array",
              items: {
                type: "object",
                required: ["artifact_ref", "artifact_kind", "capture_mode", "summary"],
                properties: {
                  artifact_ref: { type: "string" },
                  artifact_kind: { type: "string" },
                  capture_mode: { type: "string" },
                  summary: { type: "string" },
                },
              },
            },
          },
        },
      },
      outcome_counts: {
        type: "object",
        required: [
          "success",
          "soft_fail",
          "blocked",
          "manual_checkpoint",
          "environment_disabled",
          "total",
        ],
        properties: {
          success: { type: "integer", minimum: 0 },
          soft_fail: { type: "integer", minimum: 0 },
          blocked: { type: "integer", minimum: 0 },
          manual_checkpoint: { type: "integer", minimum: 0 },
          environment_disabled: { type: "integer", minimum: 0 },
          total: { type: "integer", minimum: 1 },
        },
      },
      atlasViewModel: {
        type: "object",
        required: ["routeId", "families", "environments", "environmentRollups"],
        properties: {
          routeId: { const: "credential-evidence-ledger" },
          families: { type: "array", minItems: 1 },
          environments: { type: "array", minItems: 1 },
          environmentRollups: { type: "array", minItems: 1 },
        },
      },
    },
  };
}

export function validateCredentialSmokeMatrix(matrix: CredentialSmokeMatrix): void {
  if (matrix.family_rows.length !== CREDENTIAL_KEYS.length) {
    throw new Error("Credential family registry does not cover every canonical credential key.");
  }

  for (const credentialKey of CREDENTIAL_KEYS) {
    const rows = matrix.smoke_rows.filter((row) => row.credential_key === credentialKey);
    if (rows.length !== ENVIRONMENT_OPTIONS.length) {
      throw new Error(
        `Credential ${credentialKey} must have one smoke row for every canonical environment.`,
      );
    }
    for (const row of rows) {
      if (!row.allowed_outcome_codes.includes(row.default_result_code)) {
        throw new Error(
          `Default outcome ${row.default_result_code} is not allowed for ${row.smoke_row_ref}.`,
        );
      }
      if (!row.source_card_ref) {
        throw new Error(`Smoke row ${row.smoke_row_ref} is missing a source card ref.`);
      }
    }
  }
}

export function validatePrincipalScopeAndEndpointAssertions(
  assertions: PrincipalScopeAndEndpointAssertions,
  matrix: CredentialSmokeMatrix,
): void {
  if (assertions.assertion_rows.length !== matrix.smoke_rows.length) {
    throw new Error("Assertion pack must contain one assertion row per smoke row.");
  }

  for (const row of matrix.smoke_rows) {
    const assertion = assertions.assertion_rows.find(
      (candidate) => candidate.smoke_row_ref === row.smoke_row_ref,
    );
    if (!assertion) {
      throw new Error(`Missing assertion row for ${row.smoke_row_ref}.`);
    }
    if (assertion.principal_expectation !== row.expected_principal) {
      throw new Error(`Principal expectation drift detected for ${row.smoke_row_ref}.`);
    }
  }
}

export function validateMaskedEvidenceCapturePolicy(
  policy: MaskedEvidenceCapturePolicy,
): void {
  const forbidden = new Set(policy.forbidden_persisted_fields);
  for (const field of [
    "raw_secret",
    "raw_bearer_token",
    "raw_session_cookie",
    "raw_authorization_header",
    "raw_browser_storage",
  ]) {
    if (!forbidden.has(field)) {
      throw new Error(`Masked evidence policy must forbid ${field}.`);
    }
  }

  for (const row of policy.rule_rows) {
    if (row.capture_mode === "MASKED" && row.artifact_kind === "SAFE_CREDENTIAL_REF") {
      throw new Error("Safe credential refs must be reference-only, not masked values.");
    }
    if (
      row.artifact_kind === "MASKED_SCREENSHOT" &&
      row.capture_mode !== "MASKED"
    ) {
      throw new Error("Screenshots must stay masked.");
    }
  }
}

function validateInventoryTemplate(
  inventory: ExternalCredentialSmokeInventoryTemplate,
  matrix: CredentialSmokeMatrix,
): void {
  if (inventory.result_rows.length !== matrix.smoke_rows.length) {
    throw new Error("Inventory result rows do not align with the smoke matrix.");
  }
  const serialized = JSON.stringify(inventory);
  if (serialized.includes("vault://secret/")) {
    throw new Error("Inventory leaked a raw vault secret path.");
  }
  if (serialized.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Inventory leaked private key material.");
  }
}

function overallStatusFromCounts(counts: OutcomeCounts): "PASSED" | "MIXED" | "BLOCKED_ONLY" {
  if (counts.success === counts.total) {
    return "PASSED";
  }
  if (counts.success === 0 && counts.soft_fail === 0 && counts.manual_checkpoint === 0) {
    return "BLOCKED_ONLY";
  }
  return "MIXED";
}

function createRunbookMarkdown(repoRoot = DEFAULT_REPO_ROOT): string {
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const manualPolicy = createManualCheckpointPolicy();
  const maskedPolicy = createMaskedEvidenceCapturePolicy();

  const inScopeFamilies = matrix.family_rows
    .map((family) => `- \`${family.credential_key}\`: ${family.summary}`)
    .join("\n");

  const blockedFamilies = matrix.smoke_rows
    .filter((row) => row.default_result_code === "BLOCKED_PROVIDER_SELECTION")
    .map((row) => row.credential_key)
    .filter((value, index, array) => array.indexOf(value) === index)
    .map((value) => `- \`${value}\``)
    .join("\n");

  return `# External Credential Smoke Runbook

## Purpose

This runbook freezes Taxat's governed smoke-validation matrix for every canonical external credential family.
The matrix proves principal, scope, endpoint, and environment posture with masked evidence only.
It never performs destructive business operations and it never persists raw credential material.

## Execution Posture

- Default execution mode: \`SIMULATED_SAFE_NOOP\`
- Policy version: \`${CREDENTIAL_SMOKE_POLICY_VERSION}\`
- Last verified at: \`${CREDENTIAL_SMOKE_LAST_VERIFIED_AT}\`
- Environments covered: ${ENVIRONMENT_OPTIONS.map((environment) => `\`${environment.label}\``).join(", ")}

## Canonical Credential Families

${inScopeFamilies}

## Blocked Provider Families

${blockedFamilies || "- none"}

## Manual Checkpoints

${manualPolicy.reason_rows
  .map(
    (row) =>
      `- \`${row.reason_code}\`: ${row.default_summary} Resume rule: ${row.resume_rule}`,
  )
  .join("\n")}

## Evidence Posture

- Retained safe fields: ${maskedPolicy.retained_safe_fields.join(", ")}
- Forbidden persisted fields: ${maskedPolicy.forbidden_persisted_fields.join(", ")}
- Evidence root: \`${maskedPolicy.evidence_root}\`

## Operating Rules

- Never persist raw tokens, cookies, private keys, or provider page HTML.
- Keep production HMRC and native-release identities disabled unless an explicit release window opens.
- Treat provider-selection gaps as typed blocked outcomes, not silent omissions.
- Treat principal mismatch, scope mismatch, transient failure, and provider-environment mismatch as distinct outcomes.
- When a checkpoint appears, capture masked evidence, emit \`MANUAL_CHECKPOINT_REQUIRED\`, and stop.
`;
}

export async function executeExternalCredentialSmokeMatrix(options: {
  inventoryPath: string;
  runContext?: MinimalRunContext;
  simulatedOutcomeOverrides?: Record<string, SimulatedOutcomeOverride>;
  repoRoot?: string;
}): Promise<ExecuteExternalCredentialSmokeMatrixResult> {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const runContext = options.runContext ?? DEFAULT_RUN_CONTEXT;
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const assertions = createPrincipalScopeAndEndpointAssertions(repoRoot);
  const manualCheckpointPolicy = createManualCheckpointPolicy();
  const maskedEvidenceCapturePolicy = createMaskedEvidenceCapturePolicy();

  validateCredentialSmokeMatrix(matrix);
  validatePrincipalScopeAndEndpointAssertions(assertions, matrix);
  validateMaskedEvidenceCapturePolicy(maskedEvidenceCapturePolicy);

  const inventory = createExternalCredentialSmokeInventoryTemplate({
    repoRoot,
    runContext,
    simulatedOutcomeOverrides: options.simulatedOutcomeOverrides,
  });
  validateInventoryTemplate(inventory, matrix);

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  return {
    outcome: "SMOKE_MATRIX_EXECUTED",
    overall_status: overallStatusFromCounts(inventory.outcome_counts),
    matrix,
    assertions,
    manualCheckpointPolicy,
    maskedEvidenceCapturePolicy,
    inventory,
    steps: [
      {
        step_id: "smoke.freeze-canonical-matrix",
        title: "Freeze canonical smoke matrix",
        status: "SUCCEEDED",
        reason:
          "Every canonical credential family and every canonical environment now has an explicit smoke row with typed posture and allowed outcomes.",
      },
      {
        step_id: "smoke.execute-safe-noop-adapter",
        title: "Execute safe no-op smoke adapter",
        status: "SUCCEEDED",
        reason:
          "The safe adapter synthesized typed results, evidence refs, and next actions without mutating any provider or business surface.",
      },
      {
        step_id: "smoke.persist-sanitized-inventory",
        title: "Persist sanitized smoke inventory",
        status: "SUCCEEDED",
        reason:
          "Sanitized result rows were written with aliases, metadata refs, and masked evidence only.",
      },
    ],
    notes: [
      "No live provider mutations or business operations occurred.",
      "The smoke matrix is safe to re-run because it writes only deterministic, sanitized result data.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const schema = createExternalCredentialSmokeResultSchema();
  const matrix = createCredentialSmokeMatrix(repoRoot);
  const assertions = createPrincipalScopeAndEndpointAssertions(repoRoot);
  const manualCheckpointPolicy = createManualCheckpointPolicy();
  const maskedEvidenceCapturePolicy = createMaskedEvidenceCapturePolicy();
  const inventory = createExternalCredentialSmokeInventoryTemplate({ repoRoot });
  const runbook = createRunbookMarkdown(repoRoot);

  const writes: Array<[string, string]> = [
    [
      "automation/smoke/contracts/external_credential_smoke_result.schema.json",
      `${JSON.stringify(schema, null, 2)}\n`,
    ],
    [
      "config/smoke/credential_smoke_matrix.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    ],
    [
      "config/smoke/principal_scope_and_endpoint_assertions.json",
      `${JSON.stringify(assertions, null, 2)}\n`,
    ],
    [
      "config/smoke/manual_checkpoint_policy.json",
      `${JSON.stringify(manualCheckpointPolicy, null, 2)}\n`,
    ],
    [
      "config/smoke/masked_evidence_capture_policy.json",
      `${JSON.stringify(maskedEvidenceCapturePolicy, null, 2)}\n`,
    ],
    [
      "data/smoke/external_credential_smoke_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/verification/external_credential_smoke_runbook.md", runbook],
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
  sampleRun.credentialEvidenceLedger = inventory.atlasViewModel;
  await writeFile(sampleRunPath, `${JSON.stringify(sampleRun, null, 2)}\n`, "utf8");
}

async function main() {
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const selfPath = fileURLToPath(import.meta.url);
  if (invokedPath !== selfPath) {
    return;
  }

  if (process.argv.includes("--emit")) {
    await emitCheckedInArtifacts(DEFAULT_REPO_ROOT);
    return;
  }

  const inventoryPath = path.join(
    DEFAULT_REPO_ROOT,
    "artifacts",
    "smoke",
    "external_credential_smoke_inventory.json",
  );

  const result = await executeExternalCredentialSmokeMatrix({
    inventoryPath,
    runContext: DEFAULT_RUN_CONTEXT,
  });

  process.stdout.write(`${JSON.stringify(result.inventory, null, 2)}\n`);
}

await main();
