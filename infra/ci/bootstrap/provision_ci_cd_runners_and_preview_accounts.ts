import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DELIVERY_PIPELINE_PROVIDER_ID = "delivery-pipeline";
export const DELIVERY_PIPELINE_FLOW_ID =
  "provision-ci-cd-runners-and-preview-accounts";
export const DELIVERY_PIPELINE_POLICY_VERSION = "1.0";
export const DELIVERY_PIPELINE_LAST_VERIFIED_AT = "2026-04-22T21:15:00Z";
export const SELECTED_CI_PLATFORM_ID =
  "GITHUB_ACTIONS_HYBRID_OIDC_ENVIRONMENTS";

export type CiPlatformId =
  | "GITHUB_ACTIONS_HYBRID_OIDC_ENVIRONMENTS"
  | "GITLAB_CI_EPHEMERAL_RUNNERS"
  | "BUILDKITE_CONTROLLED_AGENT_STACK";

export type CiSelectionStatus = "PROVIDER_OVERRIDE_APPLIED";

export type ProviderSelectionState =
  | "PROVIDER_OVERRIDE_APPLIED"
  | "PROVIDER_DECISION_REQUIRED"
  | "SELF_HOST_DECISION_REQUIRED";

export const DELIVERY_LANE_REFS = [
  "BUILD",
  "PLAYWRIGHT",
  "NATIVE_MACOS",
  "SECURITY",
  "PREVIEW",
  "STAGING",
  "PRODUCTION",
] as const;

export type DeliveryLaneRef = (typeof DELIVERY_LANE_REFS)[number];

export const WORKFLOW_FAMILY_REFS = [
  "WF_BUILD_VERIFY",
  "WF_PLAYWRIGHT_VERIFY",
  "WF_SECURITY_VERIFY",
  "WF_PREVIEW_DEPLOY",
  "WF_SANDBOX_DEPLOY_VERIFY",
  "WF_PREPROD_CANDIDATE_VERIFY",
  "WF_NATIVE_NOTARIZE",
  "WF_PRODUCTION_PROMOTE",
] as const;

export type WorkflowFamilyRef = (typeof WORKFLOW_FAMILY_REFS)[number];

export type ProvisionStepStatus =
  | "SUCCEEDED"
  | "SKIPPED_AS_ALREADY_PRESENT"
  | "BLOCKED_BY_DRIFT";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  platform_id: CiPlatformId;
  provider_label: string;
  selection_state: ProviderSelectionState;
  runner_summary: string;
  identity_summary: string;
  preview_summary: string;
  docs_urls: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface RunnerPoolRow {
  pool_ref: string;
  label: string;
  pool_kind:
    | "GITHUB_HOSTED_STANDARD"
    | "GITHUB_HOSTED_LARGER"
    | "SELF_HOSTED_EPHEMERAL_GROUP";
  operating_system: "LINUX" | "MACOS";
  runner_labels: string[];
  capability_refs: string[];
  allowed_lane_refs: DeliveryLaneRef[];
  workflow_family_refs: WorkflowFamilyRef[];
  environment_refs: string[];
  network_posture: string;
  trust_posture: string;
  untrusted_prs_allowed: boolean;
  environment_write_refs: string[];
  artifact_retention_days: number;
  trace_retention_days: number;
  notes: string[];
  source_refs: SourceRef[];
}

export interface RunnerPoolCatalog {
  schema_version: "1.0";
  catalog_id: "runner_pool_catalog";
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  provider_option_rows: ProviderOptionRow[];
  runner_pool_rows: RunnerPoolRow[];
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface SecretResolutionRow {
  resolution_ref: string;
  workflow_family_ref: WorkflowFamilyRef;
  lane_ref: DeliveryLaneRef;
  environment_ref: string;
  required_runner_pool_refs: string[];
  identity_mode:
    | "NO_EXTERNAL_SECRET_RESOLUTION"
    | "GITHUB_OIDC_SECRET_BROKER"
    | "BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC";
  allowed_secret_refs: string[];
  denied_secret_refs: string[];
  log_redaction_posture: string;
  artifact_redaction_posture: string;
  allow_from_forks: boolean;
  notes: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentSecretResolution {
  schema_version: "1.0";
  policy_id: "environment_secret_resolution";
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  secret_resolution_rows: SecretResolutionRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface WorkloadIdentityBindingRow {
  binding_ref: string;
  label: string;
  workflow_family_refs: WorkflowFamilyRef[];
  lane_refs: DeliveryLaneRef[];
  environment_refs: string[];
  trusted_runner_pool_refs: string[];
  oidc_subject_template: string;
  oidc_audience: string;
  broker_role_ref: string;
  token_ttl_minutes: number;
  allowed_secret_refs: string[];
  denied_secret_refs: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface StaticSecretExceptionRow {
  exception_ref: string;
  label: string;
  workflow_family_refs: WorkflowFamilyRef[];
  lane_refs: DeliveryLaneRef[];
  environment_refs: string[];
  trusted_runner_pool_refs: string[];
  broker_posture: string;
  secret_refs: string[];
  release_condition: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface WorkloadIdentityFederationPolicy {
  schema_version: "1.0";
  policy_id: "workload_identity_federation_policy";
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  default_posture: string;
  binding_rows: WorkloadIdentityBindingRow[];
  static_secret_exception_rows: StaticSecretExceptionRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface PipelineGateRow {
  gate_ref: string;
  workflow_family_ref: WorkflowFamilyRef;
  lane_ref: DeliveryLaneRef;
  environment_ref: string;
  required_runner_pool_refs: string[];
  required_identity_binding_refs: string[];
  required_suites: string[];
  required_evidence_refs: string[];
  required_approvals: string[];
  candidate_scope: string;
  concurrency_group_template: string;
  cancel_in_progress: boolean;
  artifact_retention_days: number;
  trace_retention_days: number;
  write_target_refs: string[];
  manual_path_policy: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface PipelineGateMatrix {
  schema_version: "1.0";
  matrix_id: "pipeline_gate_matrix";
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  gate_rows: PipelineGateRow[];
  truth_statement: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface PreviewPolicyRow {
  preview_policy_ref: string;
  label: string;
  stage: "ALLOCATION" | "ACCESS" | "TEARDOWN";
  environment_ref: "env_ephemeral_review_preview";
  preview_id_template: string;
  preview_account_ref_template: string;
  domain_patterns: string[];
  edge_binding_refs: string[];
  ttl_hours: number;
  max_parallel_previews_per_pull_request: number;
  synthetic_data_only: boolean;
  provider_credentials_allowed: boolean;
  allowed_secret_refs: string[];
  denied_secret_refs: string[];
  access_posture: string;
  search_indexing_posture: string;
  teardown_triggers: string[];
  audit_event_refs: string[];
  telemetry_expectations: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface PreviewEnvironmentPolicy {
  schema_version: "1.0";
  policy_id: "preview_environment_policy";
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  preview_policy_rows: PreviewPolicyRow[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface CiInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "ci_inventory";
  provider_id: typeof DELIVERY_PIPELINE_PROVIDER_ID;
  flow_id: typeof DELIVERY_PIPELINE_FLOW_ID;
  policy_version: typeof DELIVERY_PIPELINE_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: CiSelectionStatus;
  selected_platform_id: CiPlatformId;
  runner_pool_refs: string[];
  workflow_family_refs: WorkflowFamilyRef[];
  identity_binding_refs: string[];
  gate_refs: string[];
  preview_policy_refs: string[];
  secret_ref_catalog: string[];
  notes: string[];
  last_verified_at: string;
}

export interface DeliveryPipelineAtlasRow {
  row_ref: string;
  environment_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_title: string;
  inspector_lines: string[];
  policy_refs: string[];
}

export interface DeliveryPipelineAtlasLane {
  lane_ref: DeliveryLaneRef;
  label: string;
  summary: string;
  runner_summary: string;
  identity_summary: string;
  gate_summary: string;
  preview_summary: string;
  inspector_notes: string[];
  runner_rows: DeliveryPipelineAtlasRow[];
  identity_rows: DeliveryPipelineAtlasRow[];
  gate_rows: DeliveryPipelineAtlasRow[];
  preview_rows: DeliveryPipelineAtlasRow[];
}

export interface DeliveryPipelineAtlasViewModel {
  routeId: "delivery-pipeline-atlas";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: CiSelectionStatus;
  postureChipLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    topology_summary: string;
    release_posture: string;
  }>;
  lanes: DeliveryPipelineAtlasLane[];
  selectedEnvironmentRef: string;
  selectedLaneRef: DeliveryLaneRef;
  selectedFocusRef: string | null;
}

export interface ProvisionCiCdStep {
  step_id: string;
  title: string;
  status: ProvisionStepStatus;
  reason: string;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionCiCdRunnersAndPreviewAccountsResult {
  outcome:
    | "CI_CD_PROVIDER_OVERRIDE_APPLIED"
    | "CI_CD_DRIFT_REVIEW_REQUIRED";
  selection_status: CiSelectionStatus;
  schema: ReturnType<typeof createDeliveryPipelineTopologySchema>;
  runnerPoolCatalog: RunnerPoolCatalog;
  environmentSecretResolution: EnvironmentSecretResolution;
  workloadIdentityFederationPolicy: WorkloadIdentityFederationPolicy;
  pipelineGateMatrix: PipelineGateMatrix;
  previewEnvironmentPolicy: PreviewEnvironmentPolicy;
  inventory: CiInventoryTemplate;
  atlasViewModel: DeliveryPipelineAtlasViewModel;
  steps: ProvisionCiCdStep[];
  notes: string[];
}

const DEFAULT_RUN_CONTEXT: MinimalRunContext = {
  runId: "run-fixture-delivery-pipeline-001",
  workspaceId: "wk-provisioning-01",
  operatorIdentityAlias: "ops.delivery.pipeline",
};

const OFFICIAL_DOC_URLS = {
  githubHostedRunners:
    "https://docs.github.com/en/actions/concepts/runners/github-hosted-runners",
  largerRunners:
    "https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners",
  oidcCloudProviders:
    "https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-cloud-providers",
  manageEnvironments:
    "https://docs.github.com/en/actions/reference/environments",
  reviewDeployments:
    "https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments",
  concurrency:
    "https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency",
  artifactRetention:
    "https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization",
  runnerGroups:
    "https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/manage-access",
  cloudflarePreviewDeployments:
    "https://developers.cloudflare.com/pages/configuration/preview-deployments/",
} as const;

const BASE_SOURCE_REFS: SourceRef[] = [
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "promotion pipeline",
    source_ref: "Algorithm/deployment_and_resilience_contract.md::promotion_pipeline",
    rationale:
      "Promotion, rollback, and staged environment progression must remain candidate-bound and environment scoped.",
  },
  {
    source_file: "Algorithm/verification_and_release_gates.md",
    source_heading_or_logical_block: "blocking suites and release verification manifest",
    source_ref:
      "Algorithm/verification_and_release_gates.md::blocking_suites_and_release_verification_manifest",
    rationale:
      "Release gates define required suites, evidence bundles, and candidate-binding expectations.",
  },
  {
    source_file: "Algorithm/security_and_runtime_hardening_contract.md",
    source_heading_or_logical_block: "secret handling and least privilege",
    source_ref:
      "Algorithm/security_and_runtime_hardening_contract.md::secret_handling_and_least_privilege",
    rationale:
      "CI and preview lanes must minimize secrets, prefer short-lived identity, and keep privileged paths explicit.",
  },
  {
    source_file:
      "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md",
    source_heading_or_logical_block: "candidate identity and admissibility",
    source_ref:
      "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md::candidate_identity_and_admissibility",
    rationale:
      "Gate results and promotions must bind to the exact tested candidate, not mutable branch state.",
  },
  {
    source_file: "data/analysis/environment_catalog.json",
    source_heading_or_logical_block: "environment rows",
    source_ref: "data/analysis/environment_catalog.json::rows",
    rationale:
      "Environment posture for CI, preview, sandbox, preproduction, and production was already frozen earlier.",
  },
  {
    source_file: "data/analysis/environment_secret_namespace_plan.json",
    source_heading_or_logical_block: "secret namespace rows",
    source_ref: "data/analysis/environment_secret_namespace_plan.json::secret_namespace_rows",
    rationale:
      "Secret namespaces and mixing rules must carry through to delivery automation without widening environment trust.",
  },
  {
    source_file: "data/analysis/credential_secret_inventory.json",
    source_heading_or_logical_block: "credential rows",
    source_ref: "data/analysis/credential_secret_inventory.json::rows",
    rationale:
      "Runner registration, preview deploy tokens, and Apple-signing material are already identified as separate credential boundaries.",
  },
  {
    source_file: "config/supplychain/release_admission_input_pack.json",
    source_heading_or_logical_block: "target profiles and evidence truth statement",
    source_ref: "config/supplychain/release_admission_input_pack.json::target_profiles",
    rationale:
      "Production promotion gates must reuse the machine-readable release admission contract authored in pc_0055.",
  },
  {
    source_file: "config/edge/dns_and_origin_matrix.json",
    source_heading_or_logical_block: "preview host rows",
    source_ref: "config/edge/dns_and_origin_matrix.json::host_origin_rows",
    rationale:
      "Preview domain patterns and fail-closed edge bindings were already frozen in pc_0056 and must not drift here.",
  },
];

const DELIVERY_ENVIRONMENTS = [
  {
    environment_ref: "env_ci_ephemeral_validation",
    label: "CI",
    topology_summary:
      "Short-lived candidate validation with no stable provider trust and no lawful access to production namespaces.",
    release_posture: "NON_PROMOTABLE_CANDIDATE_VALIDATION",
  },
  {
    environment_ref: "env_ephemeral_review_preview",
    label: "Preview",
    topology_summary:
      "Synthetic review-only deployables with review-zone domains, minimal secrets, and teardown-first lifecycle rules.",
    release_posture: "REVIEW_ONLY_SYNTHETIC",
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Sandbox",
    topology_summary:
      "First stable provider-enabled verification lane; exact sandbox credential scopes are allowed but still non-production.",
    release_posture: "SANDBOX_PROVIDER_VERIFICATION",
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Staging",
    topology_summary:
      "Production-like candidate verification with separate preproduction secrets, environment approvals, and no mutable release shortcuts.",
    release_posture: "PREPROD_CANDIDATE_ADMISSION",
  },
  {
    environment_ref: "env_production",
    label: "Production",
    topology_summary:
      "Release-only environment guarded by required approvals, candidate-bound evidence, and tightly scoped secret broker access.",
    release_posture: "RELEASE_ADMISSION_REQUIRED",
  },
] as const;

const PREVIEW_DOMAIN_PATTERNS = [
  "operator-preview-{preview_id}.review.taxat.example",
  "portal-preview-{preview_id}.review.taxat.example",
  "assets-preview-{preview_id}.review.taxat.example",
];

const SECRET_REF = {
  ciEphemeral: "sec_ci_ephemeral",
  ephemeralReview: "sec_ephemeral_review",
  sandboxRuntime: "sec_sandbox_runtime",
  sandboxWebAuthority: "sec_sandbox_web_authority",
  sandboxDesktopAuthority: "sec_sandbox_desktop_authority",
  sandboxBatchAuthority: "sec_sandbox_batch_authority",
  preprodRuntime: "sec_preprod_runtime",
  preprodWebAuthority: "sec_preprod_web_authority",
  preprodDesktopAuthority: "sec_preprod_desktop_authority",
  preprodBatchAuthority: "sec_preprod_batch_authority",
  productionRuntime: "sec_production_runtime",
  productionWebAuthority: "sec_production_web_authority",
  productionDesktopAuthority: "sec_production_desktop_authority",
  productionBatchAuthority: "sec_production_batch_authority",
  previewDeployCredential: "cred.ci-runner-and-preview-deploy-token",
  appleSigningCredential: "cred.apple-signing-certificate-and-notary-key",
  desktopPublishingCredential: "cred.desktop-update-publishing-identity",
} as const;

const RUNNER_POOL_ROWS: RunnerPoolRow[] = [
  {
    pool_ref: "runner.build-linux.standard",
    label: "Linux build and contract validation",
    pool_kind: "GITHUB_HOSTED_STANDARD",
    operating_system: "LINUX",
    runner_labels: ["ubuntu-latest"],
    capability_refs: [
      "pnpm-workspace-build",
      "schema-validation",
      "container-image-assembly",
      "artifact-attestation-preflight",
    ],
    allowed_lane_refs: ["BUILD"],
    workflow_family_refs: ["WF_BUILD_VERIFY"],
    environment_refs: ["env_ci_ephemeral_validation"],
    network_posture: "PUBLIC_EGRESS_ONLY_NO_PRIVATE_RUNTIME_NETWORK",
    trust_posture:
      "Fresh GitHub-hosted VM per job, repository-scoped token, no production environment secrets.",
    untrusted_prs_allowed: true,
    environment_write_refs: [],
    artifact_retention_days: 14,
    trace_retention_days: 7,
    notes: [
      "Build lanes may produce preview or verification artifacts but cannot write shared runtime environments directly.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    pool_ref: "runner.playwright-linux.browser",
    label: "Linux browser and Playwright verification",
    pool_kind: "GITHUB_HOSTED_STANDARD",
    operating_system: "LINUX",
    runner_labels: ["ubuntu-latest", "playwright"],
    capability_refs: [
      "browser-installation",
      "reduced-motion-regression",
      "screenshot-capture",
      "redaction-safe-trace-bundles",
    ],
    allowed_lane_refs: ["PLAYWRIGHT"],
    workflow_family_refs: ["WF_PLAYWRIGHT_VERIFY"],
    environment_refs: ["env_ci_ephemeral_validation"],
    network_posture: "PUBLIC_EGRESS_ONLY_NO_PRIVATE_RUNTIME_NETWORK",
    trust_posture:
      "GitHub-hosted browser lane with diagnostics retention bounded tighter than general build artifacts.",
    untrusted_prs_allowed: false,
    environment_write_refs: [],
    artifact_retention_days: 7,
    trace_retention_days: 7,
    notes: [
      "Browser diagnostics are retained only long enough to support triage and must remain redaction-safe.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    pool_ref: "runner.security-linux.hardened",
    label: "Linux security and policy verification",
    pool_kind: "GITHUB_HOSTED_STANDARD",
    operating_system: "LINUX",
    runner_labels: ["ubuntu-latest", "security"],
    capability_refs: [
      "sbom-generation",
      "dependency-audit",
      "policy-as-code",
      "secret-scan",
    ],
    allowed_lane_refs: ["SECURITY"],
    workflow_family_refs: ["WF_SECURITY_VERIFY"],
    environment_refs: ["env_ci_ephemeral_validation"],
    network_posture: "PUBLIC_EGRESS_ONLY_READ_ONLY_EXTERNAL_SERVICES",
    trust_posture:
      "Read-only verification lane with no deployment environments and no authority credentials.",
    untrusted_prs_allowed: true,
    environment_write_refs: [],
    artifact_retention_days: 30,
    trace_retention_days: 7,
    notes: [
      "Security lanes publish evidence but cannot write preview, staging, or production runtime targets.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    pool_ref: "runner.preview-linux.deploy",
    label: "Preview deploy and cleanup lane",
    pool_kind: "GITHUB_HOSTED_STANDARD",
    operating_system: "LINUX",
    runner_labels: ["ubuntu-latest", "preview"],
    capability_refs: [
      "preview-build",
      "review-zone-domain-bind",
      "teardown-automation",
      "synthetic-fixture-seeding",
    ],
    allowed_lane_refs: ["PREVIEW"],
    workflow_family_refs: ["WF_PREVIEW_DEPLOY"],
    environment_refs: [
      "env_ci_ephemeral_validation",
      "env_ephemeral_review_preview",
    ],
    network_posture: "PUBLIC_EGRESS_WITH_SECRET_BROKER_ONLY",
    trust_posture:
      "Preview lane gets short-lived brokered preview credentials only and cannot reach stable authority namespaces.",
    untrusted_prs_allowed: false,
    environment_write_refs: ["env_ephemeral_review_preview"],
    artifact_retention_days: 7,
    trace_retention_days: 7,
    notes: [
      "Preview writes stay synthetic-only and are canceled or cleaned up aggressively on branch churn.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    pool_ref: "runner.macos.native.larger",
    label: "macOS native build and notarization lane",
    pool_kind: "GITHUB_HOSTED_LARGER",
    operating_system: "MACOS",
    runner_labels: ["macos-15", "xlarge", "native-signing"],
    capability_refs: [
      "xcode-build",
      "codesign-verification",
      "notary-submit-and-poll",
      "signed-update-feed-staging",
    ],
    allowed_lane_refs: ["NATIVE_MACOS"],
    workflow_family_refs: ["WF_NATIVE_NOTARIZE"],
    environment_refs: [
      "env_preproduction_verification",
      "env_production",
    ],
    network_posture: "PUBLIC_EGRESS_WITH_RELEASE_SECRET_BROKER",
    trust_posture:
      "Dedicated macOS lane separated from general Linux pools; signing material stays brokered and approval-gated.",
    untrusted_prs_allowed: false,
    environment_write_refs: [
      "env_preproduction_verification",
      "env_production",
    ],
    artifact_retention_days: 30,
    trace_retention_days: 14,
    notes: [
      "macOS signing and notarization never run on broad general-purpose Linux pools.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    pool_ref: "runner.release-linux.controlled",
    label: "Controlled release orchestration lane",
    pool_kind: "SELF_HOSTED_EPHEMERAL_GROUP",
    operating_system: "LINUX",
    runner_labels: ["self-hosted", "linux", "release-control", "ephemeral"],
    capability_refs: [
      "private-runtime-connectivity",
      "environment-gated-deploy",
      "release-admission-broker",
      "drift-aware-rollback-hooks",
    ],
    allowed_lane_refs: ["STAGING", "PRODUCTION"],
    workflow_family_refs: [
      "WF_SANDBOX_DEPLOY_VERIFY",
      "WF_PREPROD_CANDIDATE_VERIFY",
      "WF_PRODUCTION_PROMOTE",
    ],
    environment_refs: [
      "env_shared_sandbox_integration",
      "env_preproduction_verification",
      "env_production",
    ],
    network_posture: "PRIVATE_RUNTIME_CONNECTIVITY_REQUIRED",
    trust_posture:
      "Ephemeral self-hosted runner group for protected environments only, with repository allowlists and no public-fork execution.",
    untrusted_prs_allowed: false,
    environment_write_refs: [
      "env_shared_sandbox_integration",
      "env_preproduction_verification",
      "env_production",
    ],
    artifact_retention_days: 90,
    trace_retention_days: 14,
    notes: [
      "Release orchestration requires environment approvals and must not execute on public-fork or untrusted PR code paths.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

const SECRET_RESOLUTION_ROWS: SecretResolutionRow[] = [
  {
    resolution_ref: "secret.build.verify",
    workflow_family_ref: "WF_BUILD_VERIFY",
    lane_ref: "BUILD",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.build-linux.standard"],
    identity_mode: "NO_EXTERNAL_SECRET_RESOLUTION",
    allowed_secret_refs: [SECRET_REF.ciEphemeral],
    denied_secret_refs: [
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Mask all configured secrets and redact registry coordinates to digest-bound forms only.",
    artifact_redaction_posture:
      "Build artifacts may persist, but logs and metadata must not expose secret values or mutable tags as release truth.",
    allow_from_forks: true,
    notes: [
      "Build verification gets only ephemeral CI configuration and no deploy-capable credentials.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.playwright.verify",
    workflow_family_ref: "WF_PLAYWRIGHT_VERIFY",
    lane_ref: "PLAYWRIGHT",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.playwright-linux.browser"],
    identity_mode: "NO_EXTERNAL_SECRET_RESOLUTION",
    allowed_secret_refs: [SECRET_REF.ciEphemeral],
    denied_secret_refs: [
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Screenshots, traces, and videos retain only redaction-safe synthetic or masked content.",
    artifact_redaction_posture:
      "Retain browser diagnostics only on failure and with bounded trace retention windows.",
    allow_from_forks: false,
    notes: [
      "Playwright runs remain candidate-bound and do not gain preview deploy or production secret access.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.security.verify",
    workflow_family_ref: "WF_SECURITY_VERIFY",
    lane_ref: "SECURITY",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.security-linux.hardened"],
    identity_mode: "NO_EXTERNAL_SECRET_RESOLUTION",
    allowed_secret_refs: [],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Security findings may persist, but secret scan evidence must not include raw tokens or keys.",
    artifact_redaction_posture:
      "SBOM and vulnerability artifacts persist as evidence, not as secrets or mutable release shortcuts.",
    allow_from_forks: true,
    notes: [
      "Security verification stays read-only and can operate without any environment secret resolution.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.preview.deploy",
    workflow_family_ref: "WF_PREVIEW_DEPLOY",
    lane_ref: "PREVIEW",
    environment_ref: "env_ephemeral_review_preview",
    required_runner_pool_refs: ["runner.preview-linux.deploy"],
    identity_mode: "GITHUB_OIDC_SECRET_BROKER",
    allowed_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.previewDeployCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.sandboxRuntime,
      SECRET_REF.sandboxWebAuthority,
      SECRET_REF.preprodRuntime,
      SECRET_REF.preprodWebAuthority,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Preview deploy logs mask broker tokens, preview session secrets, and any generated review URLs that embed internal identifiers.",
    artifact_redaction_posture:
      "Preview artifacts remain synthetic, short-lived, and never substitute for release evidence.",
    allow_from_forks: false,
    notes: [
      "Preview jobs may resolve only preview-scoped secrets and preview deploy credentials.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.sandbox.deploy.verify",
    workflow_family_ref: "WF_SANDBOX_DEPLOY_VERIFY",
    lane_ref: "STAGING",
    environment_ref: "env_shared_sandbox_integration",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    identity_mode: "GITHUB_OIDC_SECRET_BROKER",
    allowed_secret_refs: [
      SECRET_REF.sandboxRuntime,
      SECRET_REF.sandboxWebAuthority,
      SECRET_REF.sandboxDesktopAuthority,
      SECRET_REF.sandboxBatchAuthority,
    ],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.preprodRuntime,
      SECRET_REF.preprodWebAuthority,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Sandbox provider credentials are masked and only source profile identifiers may appear in audit-safe logs.",
    artifact_redaction_posture:
      "Sandbox receipts may persist as candidate-bound evidence without exposing bearer tokens or callback secrets.",
    allow_from_forks: false,
    notes: [
      "Sandbox lanes are the first provider-enabled verification path, but still remain separate from preproduction and production secret domains.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.preprod.candidate.verify",
    workflow_family_ref: "WF_PREPROD_CANDIDATE_VERIFY",
    lane_ref: "STAGING",
    environment_ref: "env_preproduction_verification",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    identity_mode: "GITHUB_OIDC_SECRET_BROKER",
    allowed_secret_refs: [
      SECRET_REF.preprodRuntime,
      SECRET_REF.preprodWebAuthority,
      SECRET_REF.preprodDesktopAuthority,
      SECRET_REF.preprodBatchAuthority,
    ],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.sandboxWebAuthority,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    log_redaction_posture:
      "Preproduction logs mask runtime and authority secrets while preserving candidate hash, schema bundle hash, and gate identifiers.",
    artifact_redaction_posture:
      "Preproduction diagnostics remain retention-bounded and candidate-bound, not reusable across new digests.",
    allow_from_forks: false,
    notes: [
      "Preproduction remains production-like, but its secret namespaces stay distinct and non-promotable by reuse.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.native.notarize",
    workflow_family_ref: "WF_NATIVE_NOTARIZE",
    lane_ref: "NATIVE_MACOS",
    environment_ref: "env_preproduction_verification",
    required_runner_pool_refs: ["runner.macos.native.larger"],
    identity_mode: "BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC",
    allowed_secret_refs: [
      SECRET_REF.preprodRuntime,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.productionDesktopAuthority,
      SECRET_REF.productionBatchAuthority,
    ],
    log_redaction_posture:
      "macOS lane masks notarization credentials, signing identity subjects, and update-feed broker tokens from raw logs.",
    artifact_redaction_posture:
      "Signed native artifacts, notarization receipts, and update manifests persist as candidate-bound evidence only.",
    allow_from_forks: false,
    notes: [
      "Apple signing and notarization material remain outside general CI runner storage and are brokered only after lane-specific approvals.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    resolution_ref: "secret.production.promote",
    workflow_family_ref: "WF_PRODUCTION_PROMOTE",
    lane_ref: "PRODUCTION",
    environment_ref: "env_production",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    identity_mode: "BROKERED_STATIC_EXCEPTION_ON_TOP_OF_OIDC",
    allowed_secret_refs: [
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.productionDesktopAuthority,
      SECRET_REF.productionBatchAuthority,
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
    ],
    log_redaction_posture:
      "Production deploy logs preserve evidence IDs and review comments, but never raw secrets or mutable deploy credentials.",
    artifact_redaction_posture:
      "Production traces and logs are retention-bounded and cannot substitute for append-only audit or release evidence.",
    allow_from_forks: false,
    notes: [
      "Production promote is the only lane allowed to resolve production secret classes, and only after protection rules pass.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

const WORKLOAD_IDENTITY_BINDING_ROWS: WorkloadIdentityBindingRow[] = [
  {
    binding_ref: "oidc.preview.broker",
    label: "Preview deploy broker identity",
    workflow_family_refs: ["WF_PREVIEW_DEPLOY"],
    lane_refs: ["PREVIEW"],
    environment_refs: ["env_ephemeral_review_preview"],
    trusted_runner_pool_refs: ["runner.preview-linux.deploy"],
    oidc_subject_template:
      "repo:maqboolahmed24/taxat_:environment:preview:workflow:preview-deploy",
    oidc_audience: "vault://taxat/review-deploy",
    broker_role_ref: "role.preview.review-zone.deploy",
    token_ttl_minutes: 15,
    allowed_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.previewDeployCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.appleSigningCredential,
    ],
    notes: [
      "Preview broker identity can write review-zone deployables but cannot mint stable provider or production credentials.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    binding_ref: "oidc.sandbox.release-broker",
    label: "Sandbox release broker identity",
    workflow_family_refs: ["WF_SANDBOX_DEPLOY_VERIFY"],
    lane_refs: ["STAGING"],
    environment_refs: ["env_shared_sandbox_integration"],
    trusted_runner_pool_refs: ["runner.release-linux.controlled"],
    oidc_subject_template:
      "repo:maqboolahmed24/taxat_:environment:sandbox:workflow:release-verify",
    oidc_audience: "vault://taxat/sandbox-release",
    broker_role_ref: "role.release.sandbox.runtime",
    token_ttl_minutes: 15,
    allowed_secret_refs: [
      SECRET_REF.sandboxRuntime,
      SECRET_REF.sandboxWebAuthority,
      SECRET_REF.sandboxDesktopAuthority,
      SECRET_REF.sandboxBatchAuthority,
    ],
    denied_secret_refs: [
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.appleSigningCredential,
    ],
    notes: [
      "Sandbox broker identity stays provider-enabled but cannot bridge into preproduction or production namespaces.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    binding_ref: "oidc.preprod.release-broker",
    label: "Preproduction release broker identity",
    workflow_family_refs: ["WF_PREPROD_CANDIDATE_VERIFY", "WF_NATIVE_NOTARIZE"],
    lane_refs: ["STAGING", "NATIVE_MACOS"],
    environment_refs: ["env_preproduction_verification"],
    trusted_runner_pool_refs: [
      "runner.release-linux.controlled",
      "runner.macos.native.larger",
    ],
    oidc_subject_template:
      "repo:maqboolahmed24/taxat_:environment:staging:workflow:release-candidate",
    oidc_audience: "vault://taxat/preprod-release",
    broker_role_ref: "role.release.preprod.runtime",
    token_ttl_minutes: 15,
    allowed_secret_refs: [
      SECRET_REF.preprodRuntime,
      SECRET_REF.preprodWebAuthority,
      SECRET_REF.preprodDesktopAuthority,
      SECRET_REF.preprodBatchAuthority,
    ],
    denied_secret_refs: [
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.productionDesktopAuthority,
    ],
    notes: [
      "Preproduction release identity is separate from production and remains candidate-bound.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    binding_ref: "oidc.production.release-broker",
    label: "Production runtime and authority broker",
    workflow_family_refs: ["WF_PRODUCTION_PROMOTE", "WF_NATIVE_NOTARIZE"],
    lane_refs: ["PRODUCTION", "NATIVE_MACOS"],
    environment_refs: ["env_production"],
    trusted_runner_pool_refs: [
      "runner.release-linux.controlled",
      "runner.macos.native.larger",
    ],
    oidc_subject_template:
      "repo:maqboolahmed24/taxat_:environment:production:workflow:release-promote",
    oidc_audience: "vault://taxat/production-release",
    broker_role_ref: "role.release.production.runtime",
    token_ttl_minutes: 10,
    allowed_secret_refs: [
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.productionDesktopAuthority,
      SECRET_REF.productionBatchAuthority,
    ],
    denied_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
    ],
    notes: [
      "Production broker identity is short-lived, approval-gated, and limited to protected release lanes.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

const STATIC_SECRET_EXCEPTION_ROWS: StaticSecretExceptionRow[] = [
  {
    exception_ref: "exception.apple.notary.release-broker",
    label: "Apple notarization release broker exception",
    workflow_family_refs: ["WF_NATIVE_NOTARIZE", "WF_PRODUCTION_PROMOTE"],
    lane_refs: ["NATIVE_MACOS", "PRODUCTION"],
    environment_refs: [
      "env_preproduction_verification",
      "env_production",
    ],
    trusted_runner_pool_refs: [
      "runner.macos.native.larger",
      "runner.release-linux.controlled",
    ],
    broker_posture:
      "Static Apple credentials stay in the secret broker and are released only to protected macOS or release jobs after environment approvals.",
    secret_refs: [
      SECRET_REF.appleSigningCredential,
      SECRET_REF.desktopPublishingCredential,
    ],
    release_condition:
      "Candidate hash, schema bundle hash, and notarization-required gate must already be satisfied.",
    notes: [
      "Apple signing material is an explicit exception because Apple notarization does not use GitHub OIDC directly.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

const PIPELINE_GATE_ROWS: PipelineGateRow[] = [
  {
    gate_ref: "gate.build.verify",
    workflow_family_ref: "WF_BUILD_VERIFY",
    lane_ref: "BUILD",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.build-linux.standard"],
    required_identity_binding_refs: [],
    required_suites: [
      "install-and-lockfile-integrity",
      "typecheck",
      "unit-and-contract-tests",
      "deterministic-schema-self-test",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "schema_bundle_hash",
      "artifact_digest_set",
    ],
    required_approvals: [],
    candidate_scope: "HEAD_COMMIT_AND_SCHEMA_BUNDLE",
    concurrency_group_template:
      "${{ github.workflow }}-${{ github.ref }}-build",
    cancel_in_progress: true,
    artifact_retention_days: 14,
    trace_retention_days: 7,
    write_target_refs: [],
    manual_path_policy:
      "No manual bypass; rerun with the same candidate only.",
    notes: [
      "Build gates verify deterministic candidate assembly before browser, security, preview, or release lanes proceed.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.playwright.verify",
    workflow_family_ref: "WF_PLAYWRIGHT_VERIFY",
    lane_ref: "PLAYWRIGHT",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.playwright-linux.browser"],
    required_identity_binding_refs: [],
    required_suites: [
      "browser-smoke",
      "reduced-motion-parity",
      "semantic-locator-stability",
      "artifact-redaction-safe-diagnostics",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "playwright_report_hash",
      "trace_bundle_hash_on_failure",
    ],
    required_approvals: [],
    candidate_scope: "HEAD_COMMIT_AND_BUILT_BROWSER_ARTIFACTS",
    concurrency_group_template:
      "${{ github.workflow }}-${{ github.ref }}-playwright",
    cancel_in_progress: true,
    artifact_retention_days: 7,
    trace_retention_days: 7,
    write_target_refs: [],
    manual_path_policy:
      "No manual bypass; diagnostics may be inspected but not waived in-line.",
    notes: [
      "Playwright evidence remains candidate-bound and cannot be reused across new browser artifact digests.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.security.verify",
    workflow_family_ref: "WF_SECURITY_VERIFY",
    lane_ref: "SECURITY",
    environment_ref: "env_ci_ephemeral_validation",
    required_runner_pool_refs: ["runner.security-linux.hardened"],
    required_identity_binding_refs: [],
    required_suites: [
      "sbom-generation",
      "vulnerability-scan",
      "dependency-review",
      "secret-scan",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "sbom_ref",
      "vulnerability_report_ref",
      "artifact_attestation_ref",
    ],
    required_approvals: [],
    candidate_scope: "HEAD_COMMIT_AND_CANDIDATE_DIGEST",
    concurrency_group_template:
      "${{ github.workflow }}-${{ github.ref }}-security",
    cancel_in_progress: true,
    artifact_retention_days: 30,
    trace_retention_days: 7,
    write_target_refs: [],
    manual_path_policy:
      "Exceptions must be typed and attached to the candidate evidence bundle.",
    notes: [
      "Security gates stay candidate-bound and cannot silently reuse old scan results after digest drift.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.preview.deploy",
    workflow_family_ref: "WF_PREVIEW_DEPLOY",
    lane_ref: "PREVIEW",
    environment_ref: "env_ephemeral_review_preview",
    required_runner_pool_refs: ["runner.preview-linux.deploy"],
    required_identity_binding_refs: ["oidc.preview.broker"],
    required_suites: [
      "build-verified",
      "playwright-preview-smoke",
      "review-domain-bind",
      "synthetic-fixture-seed",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "preview_deploy_receipt",
      "preview_domain_binding_ref",
      "preview_audit_receipt",
    ],
    required_approvals: [],
    candidate_scope: "HEAD_COMMIT_AND_PREVIEW_ID",
    concurrency_group_template:
      "preview-${{ github.event.pull_request.number || github.ref_name }}",
    cancel_in_progress: true,
    artifact_retention_days: 7,
    trace_retention_days: 7,
    write_target_refs: ["env_ephemeral_review_preview"],
    manual_path_policy:
      "Manual preview redeploys are allowed only through auditable workflow_dispatch with the same candidate hash.",
    notes: [
      "Preview deploys are synthetic-only, non-promotable, and canceled aggressively on pull-request churn.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.sandbox.verify",
    workflow_family_ref: "WF_SANDBOX_DEPLOY_VERIFY",
    lane_ref: "STAGING",
    environment_ref: "env_shared_sandbox_integration",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    required_identity_binding_refs: ["oidc.sandbox.release-broker"],
    required_suites: [
      "candidate-build-complete",
      "sandbox-deploy",
      "sandbox-authority-smoke",
      "release-manifest-candidate-binding",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "schema_bundle_hash",
      "sandbox_profile_set_ref",
      "artifact_attestation_ref",
    ],
    required_approvals: [],
    candidate_scope: "CANDIDATE_DIGEST_AND_SANDBOX_PROVIDER_PROFILE_SET",
    concurrency_group_template: "sandbox-${{ github.sha }}",
    cancel_in_progress: false,
    artifact_retention_days: 30,
    trace_retention_days: 7,
    write_target_refs: ["env_shared_sandbox_integration"],
    manual_path_policy:
      "Emergency retries remain typed and auditable; no hidden human deploy path exists.",
    notes: [
      "Sandbox is the first provider-enabled lane and must prove exact profile binding before preproduction.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.preprod.verify",
    workflow_family_ref: "WF_PREPROD_CANDIDATE_VERIFY",
    lane_ref: "STAGING",
    environment_ref: "env_preproduction_verification",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    required_identity_binding_refs: ["oidc.preprod.release-broker"],
    required_suites: [
      "sandbox-passed",
      "preprod-deploy",
      "migration-readiness-check",
      "release-admission-preflight",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "schema_bundle_hash",
      "release_admission_input_pack",
      "edge_boundary_ref",
    ],
    required_approvals: ["release-engineering-review"],
    candidate_scope: "CANDIDATE_DIGEST_AND_SCHEMA_BUNDLE",
    concurrency_group_template: "preprod-${{ github.sha }}",
    cancel_in_progress: false,
    artifact_retention_days: 90,
    trace_retention_days: 14,
    write_target_refs: ["env_preproduction_verification"],
    manual_path_policy:
      "Approvals are explicit and tied to the candidate; bypass requires a review comment and leaves an audit receipt.",
    notes: [
      "Preproduction verifies release candidate readiness without sharing production secrets or mutable gate results.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.native.notarize",
    workflow_family_ref: "WF_NATIVE_NOTARIZE",
    lane_ref: "NATIVE_MACOS",
    environment_ref: "env_preproduction_verification",
    required_runner_pool_refs: ["runner.macos.native.larger"],
    required_identity_binding_refs: [
      "oidc.preprod.release-broker",
      "oidc.production.release-broker",
      "exception.apple.notary.release-broker",
    ],
    required_suites: [
      "xcode-build",
      "codesign-verify",
      "notary-submit-and-poll",
      "update-feed-manifest-verify",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "notarization_ref",
      "artifact_attestation_ref",
      "signed_update_manifest_ref",
    ],
    required_approvals: ["desktop-platform-review"],
    candidate_scope: "NATIVE_DIGEST_AND_NOTARIZATION_RECEIPT",
    concurrency_group_template: "native-macos-${{ github.sha }}",
    cancel_in_progress: false,
    artifact_retention_days: 30,
    trace_retention_days: 14,
    write_target_refs: ["env_preproduction_verification", "env_production"],
    manual_path_policy:
      "No unsigned or unnotarized native candidate can bypass this lane.",
    notes: [
      "Native macOS delivery remains separately controlled and candidate-bound all the way to notarization evidence.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    gate_ref: "gate.production.promote",
    workflow_family_ref: "WF_PRODUCTION_PROMOTE",
    lane_ref: "PRODUCTION",
    environment_ref: "env_production",
    required_runner_pool_refs: ["runner.release-linux.controlled"],
    required_identity_binding_refs: [
      "oidc.production.release-broker",
      "exception.apple.notary.release-broker",
    ],
    required_suites: [
      "preprod-passed",
      "release-admission-pack-verified",
      "artifact-attestations-enforced",
      "post-deploy-canary",
    ],
    required_evidence_refs: [
      "candidate_hash",
      "schema_bundle_hash",
      "release_admission_input_pack",
      "promotion_receipt",
      "artifact_attestation_ref",
    ],
    required_approvals: [
      "release-engineering-review",
      "operations-review",
      "approve-and-deploy",
    ],
    candidate_scope: "PROMOTION_CANDIDATE_DIGEST_ONLY",
    concurrency_group_template: "production-release",
    cancel_in_progress: false,
    artifact_retention_days: 400,
    trace_retention_days: 14,
    write_target_refs: ["env_production"],
    manual_path_policy:
      "Any manual override must use environment review plus custom protection rules and leaves an explicit operator attestation.",
    notes: [
      "Production promote is candidate-bound, approval-gated, and never reuses mutable branch or tag-only truth.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

const PREVIEW_POLICY_ROWS: PreviewPolicyRow[] = [
  {
    preview_policy_ref: "preview.allocation.naming",
    label: "Preview allocation and naming",
    stage: "ALLOCATION",
    environment_ref: "env_ephemeral_review_preview",
    preview_id_template: "pr-${pull_request_number}-${short_sha}",
    preview_account_ref_template: "preview-${pull_request_number}-${short_sha}",
    domain_patterns: PREVIEW_DOMAIN_PATTERNS,
    edge_binding_refs: ["tls.preview.wildcard", "waf.preview", "cache.preview-bypass"],
    ttl_hours: 72,
    max_parallel_previews_per_pull_request: 1,
    synthetic_data_only: true,
    provider_credentials_allowed: false,
    allowed_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.previewDeployCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.appleSigningCredential,
    ],
    access_posture:
      "Preview IDs map to review-zone hosts only and never to stable callback or provider namespaces.",
    search_indexing_posture:
      "Preview hosts must remain noindex and excluded from long-lived public discovery.",
    teardown_triggers: [
      "pull_request.closed",
      "ttl_expired",
      "workflow_run.cancelled",
      "force_push_replaced_candidate",
    ],
    audit_event_refs: [
      "audit.preview.created",
      "audit.preview.rebound",
    ],
    telemetry_expectations: [
      "trace.preview.deploy",
      "metric.preview.active_count",
    ],
    notes: [
      "Preview IDs are deterministic enough to correlate with PRs but short-lived enough to avoid becoming stable product coordinates.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
  {
    preview_policy_ref: "preview.access.boundary",
    label: "Preview access and domain boundary",
    stage: "ACCESS",
    environment_ref: "env_ephemeral_review_preview",
    preview_id_template: "pr-${pull_request_number}-${short_sha}",
    preview_account_ref_template: "preview-${pull_request_number}-${short_sha}",
    domain_patterns: PREVIEW_DOMAIN_PATTERNS,
    edge_binding_refs: [
      "operator-preview-{preview_id}.review.taxat.example",
      "portal-preview-{preview_id}.review.taxat.example",
      "assets-preview-{preview_id}.review.taxat.example",
    ],
    ttl_hours: 72,
    max_parallel_previews_per_pull_request: 1,
    synthetic_data_only: true,
    provider_credentials_allowed: false,
    allowed_secret_refs: [SECRET_REF.ephemeralReview],
    denied_secret_refs: [
      SECRET_REF.sandboxWebAuthority,
      SECRET_REF.preprodWebAuthority,
      SECRET_REF.productionWebAuthority,
      SECRET_REF.productionDesktopAuthority,
    ],
    access_posture:
      "Review hosts require controlled preview access and may never carry authority credentials or provider callback trust.",
    search_indexing_posture:
      "Preview hosts must emit noindex and remain outside stable custom-domain promotion paths.",
    teardown_triggers: ["pull_request.closed", "workflow_run.cancelled"],
    audit_event_refs: [
      "audit.preview.access-policy-bound",
      "audit.preview.domain-bound",
    ],
    telemetry_expectations: [
      "trace.preview.domain.bind",
      "metric.preview.domain.active",
    ],
    notes: [
      "Preview domains inherit the fail-closed edge rules from pc_0056 and remain synthetic-data-safe.",
    ],
    source_refs: [
      ...BASE_SOURCE_REFS,
      {
        source_file: OFFICIAL_DOC_URLS.cloudflarePreviewDeployments,
        source_heading_or_logical_block: "preview deployments, access, aliases, and noindex",
        source_ref: OFFICIAL_DOC_URLS.cloudflarePreviewDeployments,
        rationale:
          "Current Cloudflare preview deployment guidance reinforces unique preview URLs, optional access control, cleanup hooks, and noindex posture.",
      },
    ],
  },
  {
    preview_policy_ref: "preview.teardown.cleanup",
    label: "Preview teardown and orphan cleanup",
    stage: "TEARDOWN",
    environment_ref: "env_ephemeral_review_preview",
    preview_id_template: "pr-${pull_request_number}-${short_sha}",
    preview_account_ref_template: "preview-${pull_request_number}-${short_sha}",
    domain_patterns: PREVIEW_DOMAIN_PATTERNS,
    edge_binding_refs: ["review-zone-cleanup", "preview-artifact-retention"],
    ttl_hours: 72,
    max_parallel_previews_per_pull_request: 1,
    synthetic_data_only: true,
    provider_credentials_allowed: false,
    allowed_secret_refs: [
      SECRET_REF.ciEphemeral,
      SECRET_REF.ephemeralReview,
      SECRET_REF.previewDeployCredential,
    ],
    denied_secret_refs: [
      SECRET_REF.sandboxRuntime,
      SECRET_REF.preprodRuntime,
      SECRET_REF.productionRuntime,
      SECRET_REF.appleSigningCredential,
    ],
    access_posture:
      "Cancellation, retry, or PR closure must leave no orphaned preview accounts, aliases, or deploy receipts.",
    search_indexing_posture:
      "Deleted previews should not remain discoverable through branch aliases or lingering indexable URLs.",
    teardown_triggers: [
      "pull_request.closed",
      "workflow_run.cancelled",
      "superseded_concurrency_group",
      "ttl_expired",
    ],
    audit_event_refs: [
      "audit.preview.cleaned_up",
      "audit.preview.ttl_expired",
    ],
    telemetry_expectations: [
      "trace.preview.cleanup",
      "metric.preview.orphan_count",
    ],
    notes: [
      "Preview cleanup is mandatory on cancellation and supersession so stale domains or synthetic fixtures do not accumulate.",
    ],
    source_refs: BASE_SOURCE_REFS,
  },
];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

function laneSummary(lane: DeliveryLaneRef): {
  summary: string;
  runner: string;
  identity: string;
  gate: string;
  preview: string;
} {
  switch (lane) {
    case "BUILD":
      return {
        summary:
          "Deterministic assembly and contract validation happen before any browser, preview, or release writes.",
        runner:
          "Fresh Linux hosted runners for reproducible workspace builds and contract self-tests.",
        identity:
          "No external secret broker access; only ephemeral CI configuration is available.",
        gate:
          "Candidate hash, schema bundle hash, and artifact digest set are required before later lanes proceed.",
        preview:
          "No preview lifecycle actions occur in the build lane.",
      };
    case "PLAYWRIGHT":
      return {
        summary:
          "Browser verification stays candidate-bound and redaction-safe.",
        runner:
          "Hosted Linux browser pool with bounded trace retention and semantic-locator expectations.",
        identity:
          "No deployment secret resolution; diagnostics remain synthetic or masked.",
        gate:
          "Reduced motion, locator stability, and browser smoke remain explicit gate surfaces.",
        preview:
          "Preview deployment occurs elsewhere; this lane only proves browser readiness.",
      };
    case "NATIVE_MACOS":
      return {
        summary:
          "Native macOS signing and notarization remain isolated from general-purpose runner pools.",
        runner:
          "Larger macOS runners hold Xcode and signing workflows separate from Linux lanes.",
        identity:
          "OIDC-first broker access with a typed Apple credential exception.",
        gate:
          "Codesign, notarization, and update-feed evidence remain candidate-bound.",
        preview:
          "Preview lifecycle is not applicable to native promotion work.",
      };
    case "SECURITY":
      return {
        summary:
          "Security verification publishes evidence but cannot deploy or widen environment privileges.",
        runner:
          "Hosted Linux security pool with no runtime or authority secret access.",
        identity:
          "Read-only posture; no external secret resolution is permitted.",
        gate:
          "SBOM, vulnerability, and secret-scan results must bind to the current candidate.",
        preview:
          "Preview resources are not created from the security lane.",
      };
    case "PREVIEW":
      return {
        summary:
          "Synthetic review deploys stay short-lived, review-zone bound, and non-promotable.",
        runner:
          "Hosted preview pool creates and tears down review environments through a short-lived broker role.",
        identity:
          "Preview broker can resolve only CI and preview-scoped refs, never stable provider secrets.",
        gate:
          "Build and browser checks plus preview bind receipts must complete before a review URL is published.",
        preview:
          "Allocation, access, and teardown remain explicit and keyboard-inspectable.",
      };
    case "STAGING":
      return {
        summary:
          "Sandbox and preproduction verification remain release-oriented but still separate from production truth.",
        runner:
          "Controlled release pool handles sandbox and preproduction writes with private connectivity and approvals.",
        identity:
          "Short-lived broker roles resolve only sandbox or preproduction namespaces.",
        gate:
          "Candidate-bound deploy, provider smoke, and release-admission preflight govern staging movement.",
        preview:
          "Preview lifecycle remains isolated from staging candidate verification.",
      };
    case "PRODUCTION":
      return {
        summary:
          "Production promotion is approval-gated, candidate-bound, and digested through release admission truth.",
        runner:
          "Controlled release pool is the only Linux lane allowed to mutate production runtime state.",
        identity:
          "OIDC broker plus typed Apple exception resolve production-only secret classes after protection rules pass.",
        gate:
          "Preproduction pass, release-admission pack, artifact attestations, and deploy approvals are mandatory.",
        preview:
          "Preview lifecycle is not applicable to production promotion.",
      };
  }
}

function displayEnvironmentRef(rowEnvironmentRefs: string[]): string {
  return rowEnvironmentRefs.length === 1 ? rowEnvironmentRefs[0] : "shared";
}

function workflowLane(workflowFamilyRef: WorkflowFamilyRef): DeliveryLaneRef {
  switch (workflowFamilyRef) {
    case "WF_BUILD_VERIFY":
      return "BUILD";
    case "WF_PLAYWRIGHT_VERIFY":
      return "PLAYWRIGHT";
    case "WF_SECURITY_VERIFY":
      return "SECURITY";
    case "WF_PREVIEW_DEPLOY":
      return "PREVIEW";
    case "WF_SANDBOX_DEPLOY_VERIFY":
    case "WF_PREPROD_CANDIDATE_VERIFY":
      return "STAGING";
    case "WF_NATIVE_NOTARIZE":
      return "NATIVE_MACOS";
    case "WF_PRODUCTION_PROMOTE":
      return "PRODUCTION";
  }
}

export function createProviderOptionRows(): ProviderOptionRow[] {
  return [
    {
      platform_id: "GITHUB_ACTIONS_HYBRID_OIDC_ENVIRONMENTS",
      provider_label:
        "GitHub Actions hosted Linux + larger macOS + controlled release runner group",
      selection_state: "PROVIDER_OVERRIDE_APPLIED",
      runner_summary:
        "GitHub-hosted Linux lanes cover build, browser, security, and preview work; larger macOS isolates native signing; protected self-hosted release runners hold private-network release writes.",
      identity_summary:
        "GitHub Actions OIDC plus environment protection rules broker short-lived access to secret namespaces instead of duplicating long-lived cloud keys in repo secrets.",
      preview_summary:
        "Preview deploys remain review-zone scoped, synthetic-only, concurrency-cancelable, and detached from production secret scopes.",
      docs_urls: [
        OFFICIAL_DOC_URLS.githubHostedRunners,
        OFFICIAL_DOC_URLS.largerRunners,
        OFFICIAL_DOC_URLS.manageEnvironments,
        OFFICIAL_DOC_URLS.oidcCloudProviders,
        OFFICIAL_DOC_URLS.concurrency,
        OFFICIAL_DOC_URLS.runnerGroups,
        OFFICIAL_DOC_URLS.artifactRetention,
      ],
      notes: [
        "Selected because the current repository remote is GitHub and pc_0055 already anchored the supply-chain lane on GitHub Actions OIDC and attestations.",
        "The hybrid posture keeps public-PR-safe work on GitHub-hosted runners while restricting protected deploys to tightly scoped runner groups and environments.",
      ],
      source_refs: [
        ...BASE_SOURCE_REFS,
        {
          source_file: OFFICIAL_DOC_URLS.githubHostedRunners,
          source_heading_or_logical_block: "GitHub-hosted runners",
          source_ref: OFFICIAL_DOC_URLS.githubHostedRunners,
          rationale:
            "Current GitHub docs confirm standard hosted runners are fresh VMs for most sizes and cover Linux and macOS execution surfaces.",
        },
        {
          source_file: OFFICIAL_DOC_URLS.oidcCloudProviders,
          source_heading_or_logical_block:
            "Configuring OpenID Connect in cloud providers",
          source_ref: OFFICIAL_DOC_URLS.oidcCloudProviders,
          rationale:
            "Current GitHub docs confirm OIDC-based short-lived access and environment protection guidance for deployment jobs.",
        },
      ],
    },
    {
      platform_id: "GITLAB_CI_EPHEMERAL_RUNNERS",
      provider_label: "GitLab CI with ephemeral runners and protected environments",
      selection_state: "PROVIDER_DECISION_REQUIRED",
      runner_summary:
        "Viable for ephemeral runners and protected variables, but would diverge from the repository's current GitHub-hosted control plane.",
      identity_summary:
        "Could support workload identity and protected variables, but would require repo-host and attestations migration.",
      preview_summary:
        "Preview lifecycle remains possible, but this card preserves current GitHub-native repo posture instead of switching control planes.",
      docs_urls: [],
      notes: [
        "Retained as an alternative only if repository hosting and delivery ownership move away from GitHub.",
      ],
      source_refs: BASE_SOURCE_REFS,
    },
    {
      platform_id: "BUILDKITE_CONTROLLED_AGENT_STACK",
      provider_label: "Buildkite with controlled agents and external secret broker",
      selection_state: "SELF_HOST_DECISION_REQUIRED",
      runner_summary:
        "Strong for controlled agents and private networking, but adds a separate delivery control plane on top of a GitHub-hosted repo and supply-chain stack.",
      identity_summary:
        "Would still require an external broker and explicit protection layers; GitHub-native OIDC already satisfies the current need.",
      preview_summary:
        "Preview orchestration would work, but the repository would inherit extra control-plane drift without current justification.",
      docs_urls: [],
      notes: [
        "Retained only as a future self-host escalation path if GitHub-hosted and larger runner controls prove insufficient.",
      ],
      source_refs: BASE_SOURCE_REFS,
    },
  ];
}

export function createRunnerPoolCatalog(): RunnerPoolCatalog {
  return {
    schema_version: "1.0",
    catalog_id: "runner_pool_catalog",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    provider_option_rows: createProviderOptionRows(),
    runner_pool_rows: RUNNER_POOL_ROWS,
    typed_gaps: [
      "ASSUMPTION_RELEASE_RUNNER_GROUP_NEEDS_PRIVATE_NETWORK_CONNECTIVITY",
      "ASSUMPTION_NATIVE_SIGNING_REMAINS_ON_GITHUB_LARGER_MACOS_RUNNERS_UNTIL_A_SEPARATE_SIGNING_HOST_IS_REQUIRED",
    ],
    notes: [
      "Runner pools are lane-scoped and environment-bounded instead of sharing one broad CI trust domain.",
      "Production and preproduction writes remain outside general hosted Linux verification lanes.",
    ],
    source_refs: BASE_SOURCE_REFS,
  };
}

export function createEnvironmentSecretResolution(): EnvironmentSecretResolution {
  return {
    schema_version: "1.0",
    policy_id: "environment_secret_resolution",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    secret_resolution_rows: SECRET_RESOLUTION_ROWS,
    notes: [
      "Preview and CI lanes can never resolve production-only secret classes.",
      "Authority and runtime secrets remain environment-scoped and are brokered only in protected lanes.",
    ],
    source_refs: BASE_SOURCE_REFS,
  };
}

export function createWorkloadIdentityFederationPolicy(): WorkloadIdentityFederationPolicy {
  return {
    schema_version: "1.0",
    policy_id: "workload_identity_federation_policy",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    default_posture:
      "Prefer GitHub Actions OIDC with environment protection rules and short-lived secret-broker tokens. Treat long-lived static credentials as exceptions only when the provider lacks OIDC support.",
    binding_rows: WORKLOAD_IDENTITY_BINDING_ROWS,
    static_secret_exception_rows: STATIC_SECRET_EXCEPTION_ROWS,
    notes: [
      "OIDC trust conditions must bind repository, workflow, and environment attributes so untrusted jobs cannot mint broker access tokens.",
      "Static credential release is limited to the Apple-signing exception and remains brokered, not copied into repo secrets.",
    ],
    source_refs: [
      ...BASE_SOURCE_REFS,
      {
        source_file: OFFICIAL_DOC_URLS.oidcCloudProviders,
        source_heading_or_logical_block:
          "Configuring OpenID Connect in cloud providers",
        source_ref: OFFICIAL_DOC_URLS.oidcCloudProviders,
        rationale:
          "Current GitHub docs confirm OIDC-based short-lived access and recommend combining environments with protection rules for deployment jobs.",
      },
      {
        source_file: OFFICIAL_DOC_URLS.manageEnvironments,
        source_heading_or_logical_block: "Managing environments for deployment",
        source_ref: OFFICIAL_DOC_URLS.manageEnvironments,
        rationale:
          "Current GitHub docs confirm jobs referencing environments must pass protection rules before accessing environment secrets.",
      },
    ],
  };
}

export function createPipelineGateMatrix(): PipelineGateMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "pipeline_gate_matrix",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    gate_rows: PIPELINE_GATE_ROWS,
    truth_statement:
      "Gate results are candidate-bound and cannot be reused across changed digests, schema bundles, or provider-profile sets.",
    notes: [
      "Protected environments combine approvals, concurrency, and environment-scoped secret access.",
      "Preview deploys remain non-promotable and aggressively cancellable on superseded runs.",
    ],
    source_refs: [
      ...BASE_SOURCE_REFS,
      {
        source_file: OFFICIAL_DOC_URLS.concurrency,
        source_heading_or_logical_block: "Control workflow concurrency",
        source_ref: OFFICIAL_DOC_URLS.concurrency,
        rationale:
          "Current GitHub docs confirm concurrency groups can cancel superseded preview work and enforce one active deployment per group.",
      },
      {
        source_file: OFFICIAL_DOC_URLS.reviewDeployments,
        source_heading_or_logical_block: "Reviewing deployments",
        source_ref: OFFICIAL_DOC_URLS.reviewDeployments,
        rationale:
          "Current GitHub docs confirm environment approvals are the point where protected jobs gain access to environment secrets.",
      },
    ],
  };
}

export function createPreviewEnvironmentPolicy(): PreviewEnvironmentPolicy {
  return {
    schema_version: "1.0",
    policy_id: "preview_environment_policy",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    preview_policy_rows: PREVIEW_POLICY_ROWS,
    notes: [
      "Preview environments are synthetic-only, noindex, and blocked from stable provider credentials.",
      "PR closure, cancellation, and superseded concurrency groups all trigger teardown behavior.",
    ],
    source_refs: BASE_SOURCE_REFS,
  };
}

export function createDeliveryPipelineTopologySchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://taxat.dev/schemas/delivery_pipeline_topology.schema.json",
    title: "Taxat delivery pipeline topology",
    type: "object",
    required: [
      "schema_version",
      "catalog_id",
      "selection_status",
      "selected_platform_id",
      "runner_pool_rows",
    ],
    properties: {
      schema_version: { const: "1.0" },
      catalog_id: { const: "runner_pool_catalog" },
      selection_status: { const: "PROVIDER_OVERRIDE_APPLIED" },
      selected_platform_id: {
        const: "GITHUB_ACTIONS_HYBRID_OIDC_ENVIRONMENTS",
      },
      runner_pool_rows: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "pool_ref",
            "label",
            "pool_kind",
            "operating_system",
            "allowed_lane_refs",
            "workflow_family_refs",
          ],
        },
      },
    },
  };
}

export function validateRunnerPoolCatalog(
  catalog: RunnerPoolCatalog = createRunnerPoolCatalog(),
): void {
  const seenPools = new Set<string>();
  const coveredWorkflows = new Set<WorkflowFamilyRef>();
  for (const row of catalog.runner_pool_rows) {
    if (seenPools.has(row.pool_ref)) {
      throw new Error(`Duplicate runner pool ref ${row.pool_ref}.`);
    }
    seenPools.add(row.pool_ref);
    row.workflow_family_refs.forEach((workflowFamilyRef) =>
      coveredWorkflows.add(workflowFamilyRef),
    );
    if (row.allowed_lane_refs.includes("NATIVE_MACOS") && row.operating_system !== "MACOS") {
      throw new Error("Native macOS lane must use a macOS runner pool.");
    }
    if (
      (row.allowed_lane_refs.includes("STAGING") ||
        row.allowed_lane_refs.includes("PRODUCTION")) &&
      row.untrusted_prs_allowed
    ) {
      throw new Error("Protected release lanes must never allow untrusted PR execution.");
    }
  }
  for (const workflowFamilyRef of WORKFLOW_FAMILY_REFS) {
    if (!coveredWorkflows.has(workflowFamilyRef)) {
      throw new Error(
        `Workflow family ${workflowFamilyRef} is missing an explicit runner pool.`,
      );
    }
  }
}

export function validateEnvironmentSecretResolution(
  resolution: EnvironmentSecretResolution = createEnvironmentSecretResolution(),
  catalog: RunnerPoolCatalog = createRunnerPoolCatalog(),
  gateMatrix: PipelineGateMatrix = createPipelineGateMatrix(),
): void {
  const runnerPoolRefs = new Set(
    catalog.runner_pool_rows.map((row) => row.pool_ref),
  );
  const gateWorkflowRefs = new Set(
    gateMatrix.gate_rows.map((row) => row.workflow_family_ref),
  );
  const seenWorkflows = new Set<WorkflowFamilyRef>();
  for (const row of resolution.secret_resolution_rows) {
    seenWorkflows.add(row.workflow_family_ref);
    row.required_runner_pool_refs.forEach((poolRef) => {
      if (!runnerPoolRefs.has(poolRef)) {
        throw new Error(`${row.resolution_ref} references unknown runner pool ${poolRef}.`);
      }
    });
    if (!gateWorkflowRefs.has(row.workflow_family_ref)) {
      throw new Error(
        `${row.resolution_ref} is missing a matching gate row for ${row.workflow_family_ref}.`,
      );
    }
    if (
      (row.environment_ref === "env_ci_ephemeral_validation" ||
        row.environment_ref === "env_ephemeral_review_preview") &&
      row.allowed_secret_refs.some(
        (secretRef) =>
          secretRef.startsWith("sec_preprod_") ||
          secretRef.startsWith("sec_production_"),
      )
    ) {
      throw new Error(
        `${row.resolution_ref} may not resolve preproduction or production secret refs.`,
      );
    }
    if (
      row.environment_ref === "env_ephemeral_review_preview" &&
      row.allowed_secret_refs.some((secretRef) => secretRef.includes("authority"))
    ) {
      throw new Error(
        `${row.resolution_ref} may not resolve authority secret refs for preview.`,
      );
    }
  }
  for (const workflowFamilyRef of WORKFLOW_FAMILY_REFS) {
    if (!seenWorkflows.has(workflowFamilyRef)) {
      throw new Error(
        `Workflow family ${workflowFamilyRef} is missing an explicit secret resolution policy.`,
      );
    }
  }
}

export function validateWorkloadIdentityFederationPolicy(
  policy: WorkloadIdentityFederationPolicy = createWorkloadIdentityFederationPolicy(),
  resolution: EnvironmentSecretResolution = createEnvironmentSecretResolution(),
): void {
  const resolutionByWorkflow = new Map(
    resolution.secret_resolution_rows.map((row) => [row.workflow_family_ref, row]),
  );
  for (const binding of policy.binding_rows) {
    if (binding.token_ttl_minutes > 30) {
      throw new Error(`${binding.binding_ref} exceeds the short-lived token window.`);
    }
    for (const workflowFamilyRef of binding.workflow_family_refs) {
      const resolutionRow = resolutionByWorkflow.get(workflowFamilyRef);
      if (!resolutionRow) {
        throw new Error(`${binding.binding_ref} has no matching secret resolution row.`);
      }
      if (resolutionRow.identity_mode === "NO_EXTERNAL_SECRET_RESOLUTION") {
        throw new Error(
          `${binding.binding_ref} should not exist for ${workflowFamilyRef} because that workflow resolves no external secrets.`,
        );
      }
    }
  }
  for (const exception of policy.static_secret_exception_rows) {
    if (!exception.lane_refs.includes("NATIVE_MACOS")) {
      throw new Error(
        `${exception.exception_ref} must remain tied to the macOS signing lane.`,
      );
    }
    if (!exception.secret_refs.includes(SECRET_REF.appleSigningCredential)) {
      throw new Error(
        `${exception.exception_ref} must carry the Apple signing credential ref.`,
      );
    }
  }
}

export function validatePipelineGateMatrix(
  gateMatrix: PipelineGateMatrix = createPipelineGateMatrix(),
  catalog: RunnerPoolCatalog = createRunnerPoolCatalog(),
  identityPolicy: WorkloadIdentityFederationPolicy = createWorkloadIdentityFederationPolicy(),
): void {
  const poolRefs = new Set(catalog.runner_pool_rows.map((row) => row.pool_ref));
  const identityRefs = new Set([
    ...identityPolicy.binding_rows.map((row) => row.binding_ref),
    ...identityPolicy.static_secret_exception_rows.map((row) => row.exception_ref),
  ]);
  for (const row of gateMatrix.gate_rows) {
    row.required_runner_pool_refs.forEach((poolRef) => {
      if (!poolRefs.has(poolRef)) {
        throw new Error(`${row.gate_ref} references unknown runner pool ${poolRef}.`);
      }
    });
    row.required_identity_binding_refs.forEach((identityRef) => {
      if (!identityRefs.has(identityRef)) {
        throw new Error(`${row.gate_ref} references unknown identity ref ${identityRef}.`);
      }
    });
    if (!row.required_evidence_refs.includes("candidate_hash")) {
      throw new Error(`${row.gate_ref} must remain candidate-bound.`);
    }
    if (row.lane_ref === "PREVIEW" && !row.cancel_in_progress) {
      throw new Error("Preview gate must cancel superseded runs in progress.");
    }
    if (
      row.lane_ref === "PRODUCTION" &&
      (!row.required_evidence_refs.includes("release_admission_input_pack") ||
        row.required_approvals.length === 0)
    ) {
      throw new Error(
        "Production promotion must require release admission evidence and approvals.",
      );
    }
  }
}

export function validatePreviewEnvironmentPolicy(
  policy: PreviewEnvironmentPolicy = createPreviewEnvironmentPolicy(),
): void {
  for (const row of policy.preview_policy_rows) {
    if (row.environment_ref !== "env_ephemeral_review_preview") {
      throw new Error(`${row.preview_policy_ref} must bind to the preview environment.`);
    }
    if (!row.synthetic_data_only) {
      throw new Error(`${row.preview_policy_ref} must remain synthetic-data-only.`);
    }
    if (row.provider_credentials_allowed) {
      throw new Error(`${row.preview_policy_ref} may not allow provider credentials.`);
    }
    if (
      row.allowed_secret_refs.some(
        (secretRef) =>
          secretRef.startsWith("sec_preprod_") ||
          secretRef.startsWith("sec_production_") ||
          secretRef.includes("authority"),
      )
    ) {
      throw new Error(
        `${row.preview_policy_ref} may not resolve authority, preproduction, or production secrets.`,
      );
    }
    if (!row.domain_patterns.every((pattern) => pattern.includes("review.taxat.example"))) {
      throw new Error(`${row.preview_policy_ref} must use the review zone.`);
    }
    if (
      !row.teardown_triggers.includes("pull_request.closed") ||
      !row.teardown_triggers.includes("workflow_run.cancelled")
    ) {
      throw new Error(
        `${row.preview_policy_ref} must clean up on PR close and workflow cancellation.`,
      );
    }
  }
}

export function createCiInventoryTemplate({
  runContext = DEFAULT_RUN_CONTEXT,
}: {
  runContext?: MinimalRunContext;
} = {}): CiInventoryTemplate {
  const runnerPoolCatalog = createRunnerPoolCatalog();
  const environmentSecretResolution = createEnvironmentSecretResolution();
  const workloadIdentityPolicy = createWorkloadIdentityFederationPolicy();
  const pipelineGateMatrix = createPipelineGateMatrix();
  const previewPolicy = createPreviewEnvironmentPolicy();

  return {
    schema_version: "1.0",
    inventory_id: "ci_inventory",
    provider_id: DELIVERY_PIPELINE_PROVIDER_ID,
    flow_id: DELIVERY_PIPELINE_FLOW_ID,
    policy_version: DELIVERY_PIPELINE_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    selected_platform_id: SELECTED_CI_PLATFORM_ID,
    runner_pool_refs: uniqueSorted(
      runnerPoolCatalog.runner_pool_rows.map((row) => row.pool_ref),
    ),
    workflow_family_refs: [...WORKFLOW_FAMILY_REFS],
    identity_binding_refs: uniqueSorted([
      ...workloadIdentityPolicy.binding_rows.map((row) => row.binding_ref),
      ...workloadIdentityPolicy.static_secret_exception_rows.map(
        (row) => row.exception_ref,
      ),
    ]),
    gate_refs: uniqueSorted(pipelineGateMatrix.gate_rows.map((row) => row.gate_ref)),
    preview_policy_refs: uniqueSorted(
      previewPolicy.preview_policy_rows.map((row) => row.preview_policy_ref),
    ),
    secret_ref_catalog: uniqueSorted(
      environmentSecretResolution.secret_resolution_rows.flatMap(
        (row) => row.allowed_secret_refs,
      ),
    ),
    notes: [
      "Inventory is sanitized and contains only runner, workflow, secret-ref, gate, and preview policy identifiers.",
      "Live runner registration, environment approval setup, or secret broker mutation remains out of scope for this fixture-backed flow.",
    ],
    last_verified_at: DELIVERY_PIPELINE_LAST_VERIFIED_AT,
  };
}

function stableInventoryComparable(inventory: CiInventoryTemplate) {
  return {
    selection_status: inventory.selection_status,
    selected_platform_id: inventory.selected_platform_id,
    runner_pool_refs: inventory.runner_pool_refs,
    workflow_family_refs: inventory.workflow_family_refs,
    identity_binding_refs: inventory.identity_binding_refs,
    gate_refs: inventory.gate_refs,
    preview_policy_refs: inventory.preview_policy_refs,
    secret_ref_catalog: inventory.secret_ref_catalog,
    notes: inventory.notes,
    last_verified_at: inventory.last_verified_at,
  };
}

function deliveryRowFromRunnerPool(row: RunnerPoolRow): DeliveryPipelineAtlasRow {
  return {
    row_ref: `${row.pool_ref}.runner`,
    environment_ref: displayEnvironmentRef(row.environment_refs),
    label: row.label,
    detail: `${row.runner_labels.join(", ")} -> ${row.capability_refs.join(", ")}`,
    badges: [
      row.pool_kind.replaceAll("_", " "),
      row.untrusted_prs_allowed ? "Untrusted PRs allowed" : "Protected only",
    ],
    inspector_title: row.label,
    inspector_lines: [
      `Pool ref: ${row.pool_ref}`,
      `OS: ${row.operating_system}`,
      `Runner labels: ${row.runner_labels.join(", ")}`,
      `Capabilities: ${row.capability_refs.join(", ")}`,
      `Network posture: ${row.network_posture}`,
      `Trust posture: ${row.trust_posture}`,
      `Artifact retention: ${row.artifact_retention_days} days`,
      `Trace retention: ${row.trace_retention_days} days`,
    ],
    policy_refs: [row.pool_ref],
  };
}

function identityRowsForWorkflow(
  resolutionRow: SecretResolutionRow,
  identityPolicy: WorkloadIdentityFederationPolicy,
): DeliveryPipelineAtlasRow {
  const bindings = identityPolicy.binding_rows.filter((binding) =>
    binding.workflow_family_refs.includes(resolutionRow.workflow_family_ref),
  );
  const exceptions = identityPolicy.static_secret_exception_rows.filter((exception) =>
    exception.workflow_family_refs.includes(resolutionRow.workflow_family_ref),
  );

  const inspectorLines = [
    `Workflow family: ${resolutionRow.workflow_family_ref}`,
    `Identity mode: ${resolutionRow.identity_mode}`,
    `Allowed secret refs: ${resolutionRow.allowed_secret_refs.join(", ") || "none"}`,
    `Denied secret refs: ${resolutionRow.denied_secret_refs.join(", ")}`,
    `Runner pools: ${resolutionRow.required_runner_pool_refs.join(", ")}`,
    `Log redaction: ${resolutionRow.log_redaction_posture}`,
    `Artifact redaction: ${resolutionRow.artifact_redaction_posture}`,
  ];

  bindings.forEach((binding) => {
    inspectorLines.push(
      `OIDC subject: ${binding.oidc_subject_template}`,
      `OIDC audience: ${binding.oidc_audience}`,
      `Broker role: ${binding.broker_role_ref}`,
      `Token TTL: ${binding.token_ttl_minutes} minutes`,
    );
  });
  exceptions.forEach((exception) => {
    inspectorLines.push(
      `Static exception: ${exception.label}`,
      `Exception refs: ${exception.secret_refs.join(", ")}`,
      `Release condition: ${exception.release_condition}`,
    );
  });

  return {
    row_ref: `${resolutionRow.resolution_ref}.identity`,
    environment_ref: resolutionRow.environment_ref,
    label:
      bindings[0]?.label ??
      `${resolutionRow.workflow_family_ref.replaceAll("_", " ")} secret resolution`,
    detail: resolutionRow.notes[0] ?? resolutionRow.identity_mode.replaceAll("_", " "),
    badges: [
      resolutionRow.identity_mode.replaceAll("_", " "),
      `${resolutionRow.allowed_secret_refs.length} secret ref${resolutionRow.allowed_secret_refs.length === 1 ? "" : "s"}`,
    ],
    inspector_title:
      bindings[0]?.label ??
      `${resolutionRow.workflow_family_ref} secret resolution`,
    inspector_lines: inspectorLines,
    policy_refs: [
      resolutionRow.resolution_ref,
      ...bindings.map((binding) => binding.binding_ref),
      ...exceptions.map((exception) => exception.exception_ref),
    ],
  };
}

function gateRowToAtlas(row: PipelineGateRow): DeliveryPipelineAtlasRow {
  return {
    row_ref: `${row.gate_ref}.gate`,
    environment_ref: row.environment_ref,
    label:
      row.lane_ref === "PRODUCTION"
        ? "Production promotion gate"
        : row.lane_ref === "PREVIEW"
          ? "Preview publication gate"
          : row.lane_ref === "NATIVE_MACOS"
            ? "Native notarization gate"
            : row.gate_ref.replaceAll("gate.", "").replaceAll(".", " "),
    detail: `${row.required_suites.length} suite(s), ${row.required_evidence_refs.length} evidence ref(s)`,
    badges: [
      row.cancel_in_progress ? "Cancel in progress" : "Serialized lane",
      row.required_approvals.length
        ? `${row.required_approvals.length} approval`
        : "Auto gate",
    ],
    inspector_title:
      row.lane_ref === "PRODUCTION"
        ? "Production promotion gate"
        : row.lane_ref === "PREVIEW"
          ? "Preview publication gate"
          : row.lane_ref === "NATIVE_MACOS"
            ? "Native notarization gate"
            : row.gate_ref,
    inspector_lines: [
      `Workflow family: ${row.workflow_family_ref}`,
      `Candidate scope: ${row.candidate_scope}`,
      `Suites: ${row.required_suites.join(", ")}`,
      `Evidence refs: ${row.required_evidence_refs.join(", ")}`,
      `Approvals: ${row.required_approvals.join(", ") || "none"}`,
      `Concurrency: ${row.concurrency_group_template}`,
      `Write targets: ${row.write_target_refs.join(", ") || "none"}`,
      `Manual path policy: ${row.manual_path_policy}`,
    ],
    policy_refs: [row.gate_ref, ...row.required_identity_binding_refs],
  };
}

function previewRowToAtlas(row: PreviewPolicyRow): DeliveryPipelineAtlasRow {
  return {
    row_ref: `${row.preview_policy_ref}.preview`,
    environment_ref: row.environment_ref,
    label: row.label,
    detail: `${row.stage} -> TTL ${row.ttl_hours}h -> ${row.access_posture}`,
    badges: [
      row.stage,
      row.synthetic_data_only ? "Synthetic only" : "Live data",
    ],
    inspector_title: row.label,
    inspector_lines: [
      `Preview ID template: ${row.preview_id_template}`,
      `Preview account template: ${row.preview_account_ref_template}`,
      `Domains: ${row.domain_patterns.join(", ")}`,
      `Edge bindings: ${row.edge_binding_refs.join(", ")}`,
      `Allowed secret refs: ${row.allowed_secret_refs.join(", ")}`,
      `Denied secret refs: ${row.denied_secret_refs.join(", ")}`,
      `Teardown triggers: ${row.teardown_triggers.join(", ")}`,
      `Indexing posture: ${row.search_indexing_posture}`,
    ],
    policy_refs: [row.preview_policy_ref, ...row.edge_binding_refs],
  };
}

export function createDeliveryPipelineAtlasViewModel(): DeliveryPipelineAtlasViewModel {
  const runnerPoolCatalog = createRunnerPoolCatalog();
  const environmentSecretResolution = createEnvironmentSecretResolution();
  const identityPolicy = createWorkloadIdentityFederationPolicy();
  const gateMatrix = createPipelineGateMatrix();
  const previewPolicy = createPreviewEnvironmentPolicy();

  return {
    routeId: "delivery-pipeline-atlas",
    providerDisplayName: "Delivery pipeline",
    providerMonogram: "GH",
    selectionPosture: "PROVIDER_OVERRIDE_APPLIED",
    postureChipLabel: "Candidate-bound release law",
    policyVersion: DELIVERY_PIPELINE_POLICY_VERSION,
    summary:
      "Runner classes, secret resolution, workload identity, gates, and preview teardown rules are frozen so later automation cannot guess CI law.",
    notes: [
      "The atlas is read-only and cannot mutate runners, environments, or secret broker state.",
      "Protected release lanes stay visually calm and explicit instead of mirroring a CI vendor dashboard.",
    ],
    environments: DELIVERY_ENVIRONMENTS.map((environment) => ({
      environment_ref: environment.environment_ref,
      label: environment.label,
      topology_summary: environment.topology_summary,
      release_posture: environment.release_posture,
    })),
    lanes: DELIVERY_LANE_REFS.map((laneRef) => {
      const summaries = laneSummary(laneRef);
      const runnerRows = runnerPoolCatalog.runner_pool_rows
        .filter((row) => row.allowed_lane_refs.includes(laneRef))
        .map(deliveryRowFromRunnerPool);
      const identityRows = environmentSecretResolution.secret_resolution_rows
        .filter((row) => row.lane_ref === laneRef)
        .map((row) => identityRowsForWorkflow(row, identityPolicy));
      const gateRows = gateMatrix.gate_rows
        .filter((row) => row.lane_ref === laneRef)
        .map(gateRowToAtlas);
      const previewRows =
        laneRef === "PREVIEW"
          ? previewPolicy.preview_policy_rows.map(previewRowToAtlas)
          : [];

      return {
        lane_ref: laneRef,
        label: laneRef,
        summary: summaries.summary,
        runner_summary: summaries.runner,
        identity_summary: summaries.identity,
        gate_summary: summaries.gate,
        preview_summary: summaries.preview,
        inspector_notes: [
          `Runner rows: ${runnerRows.length}`,
          `Identity rows: ${identityRows.length}`,
          `Gate rows: ${gateRows.length}`,
          `Preview rows: ${previewRows.length}`,
        ],
        runner_rows: runnerRows,
        identity_rows: identityRows,
        gate_rows: gateRows,
        preview_rows: previewRows,
      };
    }),
    selectedEnvironmentRef: "env_ci_ephemeral_validation",
    selectedLaneRef: "BUILD",
    selectedFocusRef: null,
  };
}

function createCiCdAndPreviewRunbookMarkdown(): string {
  const catalog = createRunnerPoolCatalog();
  const secretResolution = createEnvironmentSecretResolution();
  const gateMatrix = createPipelineGateMatrix();
  const previewPolicy = createPreviewEnvironmentPolicy();

  return `# CI/CD And Preview Runbook

## Purpose

This runbook freezes Taxat's delivery-control topology for runner pools, secret resolution, workload identity, pipeline gates, and preview lifecycle policy.
It exists so later automation can build, test, preview, and promote candidates without widening environment trust or reusing mutable release truth.

## Selected Delivery Platform

- Selected platform: \`${catalog.selected_platform_id}\`
- Selection posture: \`${catalog.selection_status}\`
- Official references:
  - [GitHub-hosted runners](${OFFICIAL_DOC_URLS.githubHostedRunners})
  - [Larger runners](${OFFICIAL_DOC_URLS.largerRunners})
  - [Managing environments](${OFFICIAL_DOC_URLS.manageEnvironments})
  - [OIDC in cloud providers](${OFFICIAL_DOC_URLS.oidcCloudProviders})
  - [Workflow concurrency](${OFFICIAL_DOC_URLS.concurrency})
  - [Artifact retention](${OFFICIAL_DOC_URLS.artifactRetention})
  - [Runner groups](${OFFICIAL_DOC_URLS.runnerGroups})
  - [Cloudflare preview deployments](${OFFICIAL_DOC_URLS.cloudflarePreviewDeployments})

## Runner Pools

${catalog.runner_pool_rows
  .map(
    (row) =>
      `- \`${row.pool_ref}\`: ${row.runner_labels.join(", ")} -> ${row.allowed_lane_refs.join(", ")} (${row.pool_kind}, untrusted PRs = ${row.untrusted_prs_allowed ? "yes" : "no"})`,
  )
  .join("\n")}

## Secret Resolution

${secretResolution.secret_resolution_rows
  .map(
    (row) =>
      `- \`${row.resolution_ref}\`: ${row.workflow_family_ref} -> ${row.allowed_secret_refs.join(", ") || "none"} (${row.identity_mode})`,
  )
  .join("\n")}

## Gates

${gateMatrix.gate_rows
  .map(
    (row) =>
      `- \`${row.gate_ref}\`: suites = ${row.required_suites.join(", ")}; evidence = ${row.required_evidence_refs.join(", ")}; approvals = ${row.required_approvals.join(", ") || "none"}`,
  )
  .join("\n")}

## Preview Lifecycle

${previewPolicy.preview_policy_rows
  .map(
    (row) =>
      `- \`${row.preview_policy_ref}\`: stage = ${row.stage}; TTL = ${row.ttl_hours}h; triggers = ${row.teardown_triggers.join(", ")}`,
  )
  .join("\n")}

## Operating Rules

- Preview and CI lanes never resolve preproduction or production secret namespaces.
- Production and native notarization lanes require protected environments and explicit approvals before environment secrets become accessible.
- Candidate hash and schema bundle hash remain required evidence anchors throughout release-oriented lanes.
- Preview hosts stay review-zone scoped, noindex, synthetic-only, and mandatory-teardown on PR closure or cancellation.
- Apple signing material remains brokered as an explicit exception, never copied into broad CI runner storage.
`;
}

export async function provisionCiCdRunnersAndPreviewAccounts(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  existingInventoryPath?: string;
}): Promise<ProvisionCiCdRunnersAndPreviewAccountsResult> {
  const schema = createDeliveryPipelineTopologySchema();
  const runnerPoolCatalog = createRunnerPoolCatalog();
  const environmentSecretResolution = createEnvironmentSecretResolution();
  const workloadIdentityFederationPolicy =
    createWorkloadIdentityFederationPolicy();
  const pipelineGateMatrix = createPipelineGateMatrix();
  const previewEnvironmentPolicy = createPreviewEnvironmentPolicy();

  validateRunnerPoolCatalog(runnerPoolCatalog);
  validateEnvironmentSecretResolution(
    environmentSecretResolution,
    runnerPoolCatalog,
    pipelineGateMatrix,
  );
  validateWorkloadIdentityFederationPolicy(
    workloadIdentityFederationPolicy,
    environmentSecretResolution,
  );
  validatePipelineGateMatrix(
    pipelineGateMatrix,
    runnerPoolCatalog,
    workloadIdentityFederationPolicy,
  );
  validatePreviewEnvironmentPolicy(previewEnvironmentPolicy);

  const inventory = createCiInventoryTemplate({
    runContext: options.runContext,
  });

  let adoptionStep: ProvisionCiCdStep = {
    step_id: "ci.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing delivery topology",
    status: "SUCCEEDED",
    reason:
      "No prior CI inventory was supplied; a sanitized delivery-control inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as CiInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "CI_CD_DRIFT_REVIEW_REQUIRED",
          selection_status: "PROVIDER_OVERRIDE_APPLIED",
          schema,
          runnerPoolCatalog,
          environmentSecretResolution,
          workloadIdentityFederationPolicy,
          pipelineGateMatrix,
          previewEnvironmentPolicy,
          inventory,
          atlasViewModel: createDeliveryPipelineAtlasViewModel(),
          steps: [
            {
              step_id: "ci.resolve-provider-platform",
              title: "Resolve delivery platform",
              status: "SUCCEEDED",
              reason:
                "Repository origin and existing supply-chain posture fix the delivery platform to GitHub Actions with protected environments and OIDC-first secret brokerage.",
            },
            {
              step_id: "ci.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing delivery topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing CI inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing CI inventory file was overwritten because topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "ci.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing delivery topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing CI inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "ci.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing delivery topology",
        status: "SUCCEEDED",
        reason:
          "No prior CI inventory could be read; a sanitized delivery-control inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  return {
    outcome: "CI_CD_PROVIDER_OVERRIDE_APPLIED",
    selection_status: "PROVIDER_OVERRIDE_APPLIED",
    schema,
    runnerPoolCatalog,
    environmentSecretResolution,
    workloadIdentityFederationPolicy,
    pipelineGateMatrix,
    previewEnvironmentPolicy,
    inventory,
    atlasViewModel: createDeliveryPipelineAtlasViewModel(),
    steps: [
      {
        step_id: "ci.resolve-provider-platform",
        title: "Resolve delivery platform",
        status: "SUCCEEDED",
        reason:
          "Repository origin and existing supply-chain posture fix the delivery platform to GitHub Actions with protected environments and OIDC-first secret brokerage.",
      },
      {
        step_id: "ci.freeze-runner-pools",
        title: "Freeze runner pool catalog",
        status: "SUCCEEDED",
        reason:
          "Hosted, larger, and controlled release runner pools are now explicit by lane, capability, environment reach, and untrusted-PR posture.",
      },
      {
        step_id: "ci.freeze-secret-resolution",
        title: "Freeze environment secret resolution",
        status: "SUCCEEDED",
        reason:
          "Every workflow family now has explicit secret resolution, denial rules, masking posture, and runner requirements.",
      },
      {
        step_id: "ci.freeze-workload-identity",
        title: "Freeze workload identity federation policy",
        status: "SUCCEEDED",
        reason:
          "OIDC broker bindings and the Apple-signing exception are now explicit and auditable.",
      },
      {
        step_id: "ci.freeze-gates",
        title: "Freeze pipeline gate matrix",
        status: "SUCCEEDED",
        reason:
          "Preview, sandbox, staging, native, and production lanes now declare suites, approvals, evidence, concurrency, and write targets.",
      },
      {
        step_id: "ci.freeze-preview-policy",
        title: "Freeze preview environment policy",
        status: "SUCCEEDED",
        reason:
          "Preview naming, TTL, teardown, domain rules, noindex posture, and synthetic-data restrictions are now machine-readable.",
      },
      adoptionStep,
      {
        step_id: "ci.persist-sanitized-inventory",
        title: "Persist sanitized inventory",
        status: "SUCCEEDED",
        reason:
          "Sanitized delivery-control inventory persisted with refs only and no raw secret material.",
      },
    ],
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because it only writes sanitized inventory and compares topology drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const schema = createDeliveryPipelineTopologySchema();
  const runnerPoolCatalog = createRunnerPoolCatalog();
  const environmentSecretResolution = createEnvironmentSecretResolution();
  const workloadIdentityFederationPolicy =
    createWorkloadIdentityFederationPolicy();
  const pipelineGateMatrix = createPipelineGateMatrix();
  const previewEnvironmentPolicy = createPreviewEnvironmentPolicy();
  const inventory = createCiInventoryTemplate();
  const atlasViewModel = createDeliveryPipelineAtlasViewModel();
  const runbookMarkdown = createCiCdAndPreviewRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "infra/ci/contracts/delivery_pipeline_topology.schema.json",
      `${JSON.stringify(schema, null, 2)}\n`,
    ],
    [
      "config/ci/runner_pool_catalog.json",
      `${JSON.stringify(runnerPoolCatalog, null, 2)}\n`,
    ],
    [
      "config/ci/environment_secret_resolution.json",
      `${JSON.stringify(environmentSecretResolution, null, 2)}\n`,
    ],
    [
      "config/ci/workload_identity_federation_policy.json",
      `${JSON.stringify(workloadIdentityFederationPolicy, null, 2)}\n`,
    ],
    [
      "config/ci/pipeline_gate_matrix.json",
      `${JSON.stringify(pipelineGateMatrix, null, 2)}\n`,
    ],
    [
      "config/ci/preview_environment_policy.json",
      `${JSON.stringify(previewEnvironmentPolicy, null, 2)}\n`,
    ],
    [
      "data/provisioning/ci_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/ci_cd_and_preview_runbook.md", runbookMarkdown],
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
  sampleRun.deliveryPipelineAtlas = atlasViewModel;
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
    return;
  }

  const result = await provisionCiCdRunnersAndPreviewAccounts({
    runContext: DEFAULT_RUN_CONTEXT,
    inventoryPath: path.resolve(
      path.dirname(selfPath),
      "..",
      "..",
      "..",
      "data/provisioning/ci_inventory.template.json",
    ),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

void main();
