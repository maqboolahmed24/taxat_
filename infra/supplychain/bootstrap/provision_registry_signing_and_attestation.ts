import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUPPLY_CHAIN_PROVIDER_ID = "release-supply-chain";
export const SUPPLY_CHAIN_FLOW_ID =
  "provision-registry-signing-and-artifact-attestation-services";
export const SUPPLY_CHAIN_POLICY_VERSION = "1.0";
export const SUPPLY_CHAIN_LAST_VERIFIED_AT = "2026-04-22T12:00:00Z";
export const RECOMMENDED_PROVIDER_STACK_ID =
  "GITHUB_ACTIONS_GHCR_SIGSTORE_KEYLESS_GITHUB_ATTESTATIONS";

export type ProviderStackId =
  | "GITHUB_ACTIONS_GHCR_SIGSTORE_KEYLESS_GITHUB_ATTESTATIONS"
  | "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER"
  | "SELF_HOSTED_OCI_SIGSTORE_STACK";

export type SupplyChainSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_STACK_SELECTED";

export type ProviderSelectionState =
  | "RECOMMENDED_PORTABLE_DEFAULT_PENDING_APPROVAL"
  | "PROVIDER_DECISION_REQUIRED"
  | "SELF_HOST_DECISION_REQUIRED"
  | "SELECTED_FOR_ADOPTION";

export type ArtifactFamilyId =
  | "API"
  | "WORKER"
  | "WEB_BUNDLE"
  | "NATIVE_DESKTOP"
  | "SBOM"
  | "PROVENANCE"
  | "MANIFEST_INPUTS";

export type DistributionTarget =
  | "CONTAINER_IMAGE"
  | "WEB_BUNDLE"
  | "MACOS_DESKTOP"
  | "SUPPLY_CHAIN_EVIDENCE";

export type RetentionClassRef =
  | "PREVIEW_SHORT_LIVED"
  | "VERIFICATION_WINDOW"
  | "RELEASE_LONG_TAIL"
  | "EVIDENCE_APPEND_ONLY";

export type ProvisionStepStatus =
  | "SUCCEEDED"
  | "BLOCKED_BY_POLICY"
  | "SKIPPED_AS_ALREADY_PRESENT"
  | "BLOCKED_BY_DRIFT";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderStackOption {
  stack_id: ProviderStackId;
  provider_label: string;
  selection_state: ProviderSelectionState;
  registry_summary: string;
  signing_summary: string;
  attestation_summary: string;
  notarization_summary: string;
  docs_urls: string[];
  fit_notes: string[];
  source_refs: SourceRef[];
}

export interface RegistryNamespace {
  namespace_ref: string;
  package_coordinate_template: string;
  environment_refs: string[];
  artifact_family_refs: ArtifactFamilyId[];
  mutability_posture:
    | "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY"
    | "APPEND_ONLY_EVIDENCE_COORDINATES";
  promotion_mode:
    | "NO_PROMOTION_FROM_PREVIEW"
    | "COPY_BY_DIGEST_ONLY"
    | "APPEND_ONLY_EVIDENCE";
  retention_class_ref: RetentionClassRef;
  notes: string[];
}

export interface TrustRoot {
  trust_root_ref: string;
  label: string;
  root_kind:
    | "OIDC_IDENTITY"
    | "ATTESTATION_SERVICE"
    | "APPLE_DEVELOPER_ID"
    | "KMS_SIGNING_KEY";
  verification_summary: string;
  rotation_posture: string;
  applies_to_families: ArtifactFamilyId[];
  notes: string[];
}

export interface BuildTargetRow {
  target_ref: string;
  label: string;
  runtime_kind: string;
  distribution_target: DistributionTarget;
  environment_refs: string[];
  artifact_family_refs: ArtifactFamilyId[];
  registry_namespace_refs: string[];
  signature_requirement_ref: string;
  provenance_requirement_ref: string;
  sbom_requirement_ref: string;
  notarization_requirement_ref_or_null: string | null;
  retention_class_ref: RetentionClassRef;
  admission_profile_ref: string;
  candidate_binding_required: boolean;
  preview_only: boolean;
  notes: string[];
}

export interface BuildTargetCatalog {
  schema_version: "1.0";
  catalog_id: "build_target_catalog";
  selection_status: SupplyChainSelectionStatus;
  selected_provider_stack_id_or_null: ProviderStackId | null;
  recommended_provider_stack_id: typeof RECOMMENDED_PROVIDER_STACK_ID;
  provider_stack_options: ProviderStackOption[];
  registry_namespaces: RegistryNamespace[];
  trust_roots: TrustRoot[];
  target_rows: BuildTargetRow[];
  typed_gaps: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface SigningAndNotarizationFamilyPolicy {
  artifact_family_ref: ArtifactFamilyId;
  label: string;
  signature_required: boolean;
  signature_mode:
    | "KEYLESS_OIDC_IDENTITY"
    | "KMS_BACKED_SIGNING"
    | "SELF_HOSTED_SIGSTORE_FULCIO_REKOR";
  signing_identity_summary: string;
  trust_root_refs: string[];
  verification_required: boolean;
  notarization_required_for_distribution_targets: DistributionTarget[];
  notarization_profile_ref_or_null: string | null;
  allowed_verifier_actions: string[];
  notes: string[];
}

export interface SigningAndNotarizationTargetBinding {
  target_ref: string;
  signature_required: boolean;
  trust_root_refs: string[];
  verification_checks: string[];
  notarization_required: boolean;
}

export interface SigningAndNotarizationPolicy {
  schema_version: "1.0";
  policy_id: "signing_and_notarization_policy";
  selection_status: SupplyChainSelectionStatus;
  selected_provider_stack_id_or_null: ProviderStackId | null;
  family_rows: SigningAndNotarizationFamilyPolicy[];
  target_bindings: SigningAndNotarizationTargetBinding[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface AttestationAndSbomFamilyPolicy {
  artifact_family_ref: ArtifactFamilyId;
  sbom_required: boolean;
  provenance_required: boolean;
  vulnerability_gate_posture: "PASS_REQUIRED" | "PASS_OR_JUSTIFIED_EXCEPTION";
  required_attested_fields: string[];
  storage_namespace_refs: string[];
  notes: string[];
}

export interface AttestationAndSbomPolicy {
  schema_version: "1.0";
  policy_id: "attestation_and_sbom_policy";
  sbom_format: "CycloneDX_1_7_JSON";
  provenance_format: "IN_TOTO_STATEMENT_SLSA_V1";
  vulnerability_scan_signal: string;
  artifact_family_rows: AttestationAndSbomFamilyPolicy[];
  evidence_bundle_namespace_refs: string[];
  notes: string[];
  source_refs: SourceRef[];
}

export interface RetentionClassPolicyRow {
  retention_class_ref: RetentionClassRef;
  label: string;
  retention_window: string;
  durable_identity_posture: string;
  rollback_reference_posture: string;
}

export interface PromotionLaneRule {
  lane_ref: string;
  source_environment_ref: string;
  destination_environment_ref: string;
  promotion_mode: "COPY_BY_DIGEST_ONLY" | "NOT_ALLOWED";
  alias_behavior:
    | "TAGS_ARE_DISCOVERY_POINTERS_ONLY"
    | "NO_TAG_ALIAS_FOR_THIS_LANE";
  notes: string[];
}

export interface RegistryRetentionAndPromotionPolicy {
  schema_version: "1.0";
  policy_id: "registry_retention_and_promotion_policy";
  retention_classes: RetentionClassPolicyRow[];
  promotion_lanes: PromotionLaneRule[];
  truth_statement: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface ReleaseAdmissionTargetProfile {
  profile_ref: string;
  label: string;
  target_refs: string[];
  distribution_targets: DistributionTarget[];
  required_fields: string[];
  required_evidence: string[];
  notarization_required: boolean;
  mixed_candidate_rejection: boolean;
  tag_only_reference_rejected: boolean;
  gate_posture: string;
  notes: string[];
}

export interface ReleaseAdmissionInputDefinition {
  field_ref: string;
  description: string;
}

export interface ReleaseAdmissionInputPack {
  schema_version: "1.0";
  pack_id: "release_admission_input_pack";
  candidate_identity_hash_inputs: ReleaseAdmissionInputDefinition[];
  target_profiles: ReleaseAdmissionTargetProfile[];
  evidence_truth_statement: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface SupplyChainInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "supply_chain_inventory";
  provider_id: typeof SUPPLY_CHAIN_PROVIDER_ID;
  flow_id: typeof SUPPLY_CHAIN_FLOW_ID;
  policy_version: typeof SUPPLY_CHAIN_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: SupplyChainSelectionStatus;
  selected_provider_stack_id_or_null: ProviderStackId | null;
  recommended_provider_stack_id: typeof RECOMMENDED_PROVIDER_STACK_ID;
  provider_stack_options: ProviderStackOption[];
  adopted_namespace_refs: string[];
  trust_root_refs: string[];
  build_target_refs: string[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SupplyChainAtlasRow {
  row_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_title: string;
  inspector_lines: string[];
  trust_root_refs: string[];
  retention_summary: string;
  package_coordinate_preview_or_null: string | null;
}

export interface SupplyChainRibbonSegment {
  segment_ref: string;
  label: string;
  detail: string;
  badges: string[];
  inspector_title: string;
  inspector_lines: string[];
}

export interface ReleaseSupplyChainAtlasFamily {
  family_ref: ArtifactFamilyId;
  label: string;
  distribution_targets: DistributionTarget[];
  target_refs: string[];
  target_count: number;
  registry_summary: string;
  signature_summary: string;
  provenance_summary: string;
  retention_class_label: string;
  summary: string;
  inspector_notes: string[];
  source_build_rows: SupplyChainAtlasRow[];
  registry_rows: SupplyChainAtlasRow[];
  sign_notarize_rows: SupplyChainAtlasRow[];
  attest_sbom_rows: SupplyChainAtlasRow[];
  promotion_input_rows: SupplyChainAtlasRow[];
  chain_segments: SupplyChainRibbonSegment[];
}

export interface ReleaseSupplyChainAtlasViewModel {
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: SupplyChainSelectionStatus;
  postureChipLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    topology_summary: string;
    admission_lane_posture: string;
  }>;
  families: ReleaseSupplyChainAtlasFamily[];
  selectedEnvironmentRef: string;
  selectedFamilyRef: ArtifactFamilyId;
  selectedFocusKind: "row" | "segment" | null;
  selectedFocusRef: string | null;
}

export interface ProvisionRegistrySigningAndAttestationStep {
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

export interface AdmissionEvidenceEnvelope {
  target_ref: string;
  candidate_hash: string;
  subject_reference: string;
  signature_verified: boolean;
  signature_trust_root_ref_or_null: string | null;
  provenance_ref_or_null: string | null;
  sbom_ref_or_null: string | null;
  notarization_ref_or_null: string | null;
  vulnerability_gate: "PASS" | "FAIL" | "JUSTIFIED_EXCEPTION";
  source_revision: string;
  dependency_lock_ref: string;
  schema_bundle_hash_or_null: string | null;
  workflow_run_ref: string;
  builder_identity: string;
  builder_identity_verified: boolean;
  signature_subject_digest_or_null: string | null;
  provenance_subject_digest_or_null: string | null;
  sbom_subject_digest_or_null: string | null;
  notarization_subject_digest_or_null: string | null;
  attested_candidate_hashes: string[];
}

export interface ReleaseAdmissionEvaluation {
  target_ref: string;
  admissible: boolean;
  decision: "ADMISSIBLE" | "REJECTED";
  reasons: string[];
  required_evidence: string[];
  verified_bindings: string[];
}

export interface ProvisionRegistrySigningAndAttestationResult {
  outcome:
    | "SUPPLY_CHAIN_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "SUPPLY_CHAIN_READY_FOR_PROVIDER_ADOPTION"
    | "SUPPLY_CHAIN_DRIFT_REVIEW_REQUIRED";
  selection_status: SupplyChainSelectionStatus;
  schema: ReturnType<typeof createBuildArtifactSupplyChainSchema>;
  buildTargetCatalog: BuildTargetCatalog;
  signingAndNotarizationPolicy: SigningAndNotarizationPolicy;
  attestationAndSbomPolicy: AttestationAndSbomPolicy;
  registryRetentionAndPromotionPolicy: RegistryRetentionAndPromotionPolicy;
  releaseAdmissionInputPack: ReleaseAdmissionInputPack;
  inventory: SupplyChainInventoryTemplate;
  atlasViewModel: ReleaseSupplyChainAtlasViewModel;
  steps: ProvisionRegistrySigningAndAttestationStep[];
  notes: string[];
}

const DEFAULT_RUN_CONTEXT: MinimalRunContext = {
  runId: "run-fixture-supply-chain-001",
  workspaceId: "wk-provisioning-01",
  operatorIdentityAlias: "ops.release.supplychain",
};

const ENVIRONMENTS = [
  {
    environment_ref: "env_preview",
    label: "Preview",
    topology_summary:
      "Ephemeral rehearsal lane. Digest namespaces exist, but preview packages never become production truth by alias movement.",
    admission_lane_posture: "NO_PRODUCTION_PROMOTION_FROM_PREVIEW",
  },
  {
    environment_ref: "env_sandbox",
    label: "Sandbox",
    topology_summary:
      "Integration rehearsal lane. Evidence is complete, but admission remains non-production and time-bounded.",
    admission_lane_posture: "NON_PRODUCTION_VERIFICATION_ONLY",
  },
  {
    environment_ref: "env_preproduction",
    label: "Preproduction",
    topology_summary:
      "Candidate verification lane. Promotion evidence binds exact digests, schema bundles, and provider profiles before release review.",
    admission_lane_posture: "COPY_BY_DIGEST_ONLY",
  },
  {
    environment_ref: "env_production",
    label: "Production",
    topology_summary:
      "Release lane. Only admitted digests, signed evidence bundles, and notarized native artifacts may land here.",
    admission_lane_posture: "DIGEST_TRUTH_AND_APPEND_ONLY_EVIDENCE",
  },
] as const;

const ARTIFACT_FAMILY_ORDER: ArtifactFamilyId[] = [
  "API",
  "WORKER",
  "WEB_BUNDLE",
  "NATIVE_DESKTOP",
  "SBOM",
  "PROVENANCE",
  "MANIFEST_INPUTS",
];

const ARTIFACT_FAMILY_LABELS: Record<ArtifactFamilyId, string> = {
  API: "API",
  WORKER: "WORKER",
  WEB_BUNDLE: "WEB_BUNDLE",
  NATIVE_DESKTOP: "NATIVE_DESKTOP",
  SBOM: "SBOM",
  PROVENANCE: "PROVENANCE",
  MANIFEST_INPUTS: "MANIFEST_INPUTS",
};

const SOURCE_REFS: SourceRef[] = [
  {
    source_ref: "security_and_runtime_hardening_contract.md#release-integrity",
    rationale:
      "Release integrity requires digest, signature, provenance, and runtime verification instead of mutable CI dashboards.",
  },
  {
    source_ref: "deployment_and_resilience_contract.md#promotion-pipeline",
    rationale:
      "Promotion copies exact tested digests forward and never redefines truth by mutable tag movement.",
  },
  {
    source_ref: "verification_and_release_gates.md#supply-chain-evidence",
    rationale:
      "Release candidates require signature verification, provenance, SBOM, vulnerability posture, and notarization where applicable.",
  },
  {
    source_ref:
      "release_candidate_identity_and_promotion_evidence_contract.md#candidate-tuple",
    rationale:
      "Mixed-candidate evidence must be rejected and candidate identity remains hash-based.",
  },
];

const OFFICIAL_DOC_URLS = {
  githubOidc:
    "https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect",
  ghcr:
    "https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry",
  githubAttestations:
    "https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations",
  sigstoreSigning: "https://docs.sigstore.dev/cosign/signing/overview/",
  sigstoreRegistry:
    "https://docs.sigstore.dev/cosign/system_config/registry_support/",
  appleDeveloperId: "https://developer.apple.com/developer-id/",
  cyclonedx: "https://cyclonedx.org/specification/overview/",
} as const;

interface TargetSeed {
  target_ref: string;
  label: string;
  runtime_kind: string;
  distribution_target: DistributionTarget;
  artifact_family_refs: ArtifactFamilyId[];
  server_kind: "SERVER" | "WORKER" | "WEB" | "NATIVE" | "MANIFEST";
  signature_requirement_ref: string;
  provenance_requirement_ref: string;
  sbom_requirement_ref: string;
  notarization_requirement_ref_or_null: string | null;
  retention_class_ref: RetentionClassRef;
  admission_profile_ref: string;
  preview_only: boolean;
  notes: string[];
}

const TARGET_SEEDS: TargetSeed[] = [
  {
    target_ref: "target.operator-web-app",
    label: "Operator web app",
    runtime_kind: "WEB_CLIENT",
    distribution_target: "WEB_BUNDLE",
    artifact_family_refs: ["WEB_BUNDLE", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "WEB",
    signature_requirement_ref: "signature.web-bundle",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "RELEASE_LONG_TAIL",
    admission_profile_ref: "admission.web-bundle",
    preview_only: false,
    notes: [
      "Static web bundle is retained as a signed, digest-addressed build output for replay-safe rollback.",
    ],
  },
  {
    target_ref: "target.client-portal-web-app",
    label: "Client portal web app",
    runtime_kind: "WEB_CLIENT",
    distribution_target: "WEB_BUNDLE",
    artifact_family_refs: ["WEB_BUNDLE", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "WEB",
    signature_requirement_ref: "signature.web-bundle",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "RELEASE_LONG_TAIL",
    admission_profile_ref: "admission.web-bundle",
    preview_only: false,
    notes: [
      "Client portal bundles keep the same digest-first posture as operator surfaces.",
    ],
  },
  {
    target_ref: "target.northbound-api-session-gateway",
    label: "Northbound API session gateway",
    runtime_kind: "SERVER_PROCESS",
    distribution_target: "CONTAINER_IMAGE",
    artifact_family_refs: ["API", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "SERVER",
    signature_requirement_ref: "signature.api",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "RELEASE_LONG_TAIL",
    admission_profile_ref: "admission.container-service",
    preview_only: false,
    notes: [
      "Server OCI coordinates remain immutable by digest and promotion copies never reuse a mutable source tag as truth.",
    ],
  },
  {
    target_ref: "target.manifest-orchestrator",
    label: "Manifest orchestrator",
    runtime_kind: "SERVER_PROCESS",
    distribution_target: "CONTAINER_IMAGE",
    artifact_family_refs: ["API", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "SERVER",
    signature_requirement_ref: "signature.api",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "RELEASE_LONG_TAIL",
    admission_profile_ref: "admission.container-service",
    preview_only: false,
    notes: [
      "Manifest orchestration artifacts feed later release binding and must never drift from the candidate tuple.",
    ],
  },
  {
    target_ref: "target.stage-workers",
    label: "Stage workers",
    runtime_kind: "WORKER_PROCESS",
    distribution_target: "CONTAINER_IMAGE",
    artifact_family_refs: ["WORKER", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "WORKER",
    signature_requirement_ref: "signature.worker",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "VERIFICATION_WINDOW",
    admission_profile_ref: "admission.container-service",
    preview_only: false,
    notes: [
      "Worker images follow the same digest and provenance requirements as API images, with shorter rollback retention.",
    ],
  },
  {
    target_ref: "target.read-projector-stream-broker",
    label: "Read projector stream broker",
    runtime_kind: "WORKER_PROCESS",
    distribution_target: "CONTAINER_IMAGE",
    artifact_family_refs: ["WORKER", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "WORKER",
    signature_requirement_ref: "signature.worker",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "VERIFICATION_WINDOW",
    admission_profile_ref: "admission.container-service",
    preview_only: false,
    notes: [
      "The stream broker shares worker-image posture and does not permit unsigned backfill or alias-only promotion.",
    ],
  },
  {
    target_ref: "target.desktop-release-channel",
    label: "Desktop release channel",
    runtime_kind: "RELEASE_CHANNEL_MANIFEST",
    distribution_target: "SUPPLY_CHAIN_EVIDENCE",
    artifact_family_refs: ["MANIFEST_INPUTS", "SBOM", "PROVENANCE"],
    server_kind: "MANIFEST",
    signature_requirement_ref: "signature.release-manifest",
    provenance_requirement_ref: "provenance.release-input-bundle",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: null,
    retention_class_ref: "EVIDENCE_APPEND_ONLY",
    admission_profile_ref: "admission.release-manifest",
    preview_only: false,
    notes: [
      "The release channel package binds candidate hash, compatible provider profile set, and admitted digest set.",
    ],
  },
  {
    target_ref: "target.native-macos-operator-client",
    label: "Native macOS operator client",
    runtime_kind: "MACOS_DESKTOP_APP",
    distribution_target: "MACOS_DESKTOP",
    artifact_family_refs: ["NATIVE_DESKTOP", "SBOM", "PROVENANCE", "MANIFEST_INPUTS"],
    server_kind: "NATIVE",
    signature_requirement_ref: "signature.native-desktop",
    provenance_requirement_ref: "provenance.slsa-build-v1",
    sbom_requirement_ref: "sbom.cyclonedx-1.7-json",
    notarization_requirement_ref_or_null: "notarization.apple-developer-id",
    retention_class_ref: "RELEASE_LONG_TAIL",
    admission_profile_ref: "admission.macos-desktop",
    preview_only: false,
    notes: [
      "macOS delivery fails closed without Developer ID signing and a current notarization ticket bound to the exact package digest.",
    ],
  },
];

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function familyLabel(family: ArtifactFamilyId): string {
  return ARTIFACT_FAMILY_LABELS[family];
}

function selectionStatusFromProvider(
  selectedProviderStackIdOrNull: ProviderStackId | null,
): SupplyChainSelectionStatus {
  return selectedProviderStackIdOrNull
    ? "PROVIDER_STACK_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";
}

export function createProviderStackOptions(
  selectedProviderStackIdOrNull: ProviderStackId | null = null,
): ProviderStackOption[] {
  return [
    {
      stack_id: "GITHUB_ACTIONS_GHCR_SIGSTORE_KEYLESS_GITHUB_ATTESTATIONS",
      provider_label:
        "GitHub Actions OIDC + GHCR + Sigstore keyless + GitHub artifact attestations",
      selection_state:
        selectedProviderStackIdOrNull ===
        "GITHUB_ACTIONS_GHCR_SIGSTORE_KEYLESS_GITHUB_ATTESTATIONS"
          ? "SELECTED_FOR_ADOPTION"
          : "RECOMMENDED_PORTABLE_DEFAULT_PENDING_APPROVAL",
      registry_summary:
        "OCI images, web bundles, native packages, and evidence bundles land in GHCR namespaces that treat tags as discovery only and digests as durable identity.",
      signing_summary:
        "Cosign keyless signing binds GitHub OIDC workload identity to every promotable artifact and evidence bundle.",
      attestation_summary:
        "GitHub artifact attestations and cosign-compatible OCI evidence storage carry provenance and SBOM references.",
      notarization_summary:
        "macOS artifacts use Apple Developer ID signing and notarization outside general CI secret storage.",
      docs_urls: [
        OFFICIAL_DOC_URLS.githubOidc,
        OFFICIAL_DOC_URLS.ghcr,
        OFFICIAL_DOC_URLS.sigstoreSigning,
        OFFICIAL_DOC_URLS.githubAttestations,
        OFFICIAL_DOC_URLS.appleDeveloperId,
        OFFICIAL_DOC_URLS.cyclonedx,
      ],
      fit_notes: [
        "Matches current repo GitHub posture and keeps long-lived signing secrets out of repo variables.",
        "Provides the cleanest portable default while provider selection remains an explicit governance decision.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      stack_id: "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER",
      provider_label: "Cloud-managed OCI registry + cloud KMS signer",
      selection_state:
        selectedProviderStackIdOrNull === "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER"
          ? "SELECTED_FOR_ADOPTION"
          : "PROVIDER_DECISION_REQUIRED",
      registry_summary:
        "Managed regional OCI registry with per-environment repositories and digest-copy promotion.",
      signing_summary:
        "Cloud KMS or HSM-backed signing keys issue signatures from workload identity without exporting private key material.",
      attestation_summary:
        "In-toto provenance and CycloneDX bundles publish into append-only evidence namespaces.",
      notarization_summary:
        "macOS notarization still depends on Apple Developer ID credentials and a dedicated notarization path.",
      docs_urls: [OFFICIAL_DOC_URLS.sigstoreRegistry, OFFICIAL_DOC_URLS.appleDeveloperId],
      fit_notes: [
        "Valid when procurement requires cloud-native registry and KMS ownership outside GitHub Packages.",
      ],
      source_refs: SOURCE_REFS,
    },
    {
      stack_id: "SELF_HOSTED_OCI_SIGSTORE_STACK",
      provider_label: "Self-hosted OCI registry + self-hosted Sigstore stack",
      selection_state:
        selectedProviderStackIdOrNull === "SELF_HOSTED_OCI_SIGSTORE_STACK"
          ? "SELECTED_FOR_ADOPTION"
          : "SELF_HOST_DECISION_REQUIRED",
      registry_summary:
        "Dedicated OCI registry and append-only transparency stack operated inside Taxat-controlled infrastructure.",
      signing_summary:
        "Private Fulcio/Rekor deployment or equivalent workload-identity signer with internally governed trust roots.",
      attestation_summary:
        "Evidence bundles remain first-party, but operational burden and transparency guarantees must be accepted explicitly.",
      notarization_summary:
        "Native macOS release still requires Apple Developer ID and notarization service interaction.",
      docs_urls: [OFFICIAL_DOC_URLS.sigstoreSigning, OFFICIAL_DOC_URLS.sigstoreRegistry],
      fit_notes: [
        "Only acceptable if platform ownership wants full supply-chain hosting responsibility and audit overhead.",
      ],
      source_refs: SOURCE_REFS,
    },
  ];
}

function createRegistryNamespaces(): RegistryNamespace[] {
  const environments = ENVIRONMENTS.map((entry) => entry.environment_ref);
  return [
    {
      namespace_ref: "registry.preview.server",
      package_coordinate_template: "ghcr.io/taxat/preview/server/<artifact>",
      environment_refs: ["env_preview"],
      artifact_family_refs: ["API", "WORKER"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "NO_PROMOTION_FROM_PREVIEW",
      retention_class_ref: "PREVIEW_SHORT_LIVED",
      notes: ["Preview server coordinates are disposable and never promoted into production by tag reuse."],
    },
    {
      namespace_ref: "registry.sandbox.server",
      package_coordinate_template: "ghcr.io/taxat/sandbox/server/<artifact>",
      environment_refs: ["env_sandbox"],
      artifact_family_refs: ["API", "WORKER"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "VERIFICATION_WINDOW",
      notes: ["Sandbox server images rehearse admission evidence without becoming production truth."],
    },
    {
      namespace_ref: "registry.preproduction.server",
      package_coordinate_template: "ghcr.io/taxat/preprod/server/<artifact>",
      environment_refs: ["env_preproduction"],
      artifact_family_refs: ["API", "WORKER"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Preproduction server images are the source candidates for production promotion by digest copy only."],
    },
    {
      namespace_ref: "registry.production.server",
      package_coordinate_template: "ghcr.io/taxat/prod/server/<artifact>",
      environment_refs: ["env_production"],
      artifact_family_refs: ["API", "WORKER"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Production server coordinates receive only admitted digests."],
    },
    {
      namespace_ref: "registry.preview.web",
      package_coordinate_template: "ghcr.io/taxat/preview/web/<artifact>",
      environment_refs: ["env_preview"],
      artifact_family_refs: ["WEB_BUNDLE"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "NO_PROMOTION_FROM_PREVIEW",
      retention_class_ref: "PREVIEW_SHORT_LIVED",
      notes: ["Preview web bundles stay isolated from candidate promotion lanes."],
    },
    {
      namespace_ref: "registry.sandbox.web",
      package_coordinate_template: "ghcr.io/taxat/sandbox/web/<artifact>",
      environment_refs: ["env_sandbox"],
      artifact_family_refs: ["WEB_BUNDLE"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "VERIFICATION_WINDOW",
      notes: ["Sandbox bundles exercise the same digest-first verification path as server artifacts."],
    },
    {
      namespace_ref: "registry.preproduction.web",
      package_coordinate_template: "ghcr.io/taxat/preprod/web/<artifact>",
      environment_refs: ["env_preproduction"],
      artifact_family_refs: ["WEB_BUNDLE"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Preproduction bundles are candidate material for production web release."],
    },
    {
      namespace_ref: "registry.production.web",
      package_coordinate_template: "ghcr.io/taxat/prod/web/<artifact>",
      environment_refs: ["env_production"],
      artifact_family_refs: ["WEB_BUNDLE"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Production web bundles must already be signed, provenance-linked, and vulnerability-cleared."],
    },
    {
      namespace_ref: "registry.preview.native",
      package_coordinate_template: "ghcr.io/taxat/preview/native/<artifact>",
      environment_refs: ["env_preview"],
      artifact_family_refs: ["NATIVE_DESKTOP"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "NO_PROMOTION_FROM_PREVIEW",
      retention_class_ref: "PREVIEW_SHORT_LIVED",
      notes: ["Preview native artifacts never satisfy production admission."],
    },
    {
      namespace_ref: "registry.sandbox.native",
      package_coordinate_template: "ghcr.io/taxat/sandbox/native/<artifact>",
      environment_refs: ["env_sandbox"],
      artifact_family_refs: ["NATIVE_DESKTOP"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "VERIFICATION_WINDOW",
      notes: ["Sandbox native packages verify signing and notarization pathways without production release rights."],
    },
    {
      namespace_ref: "registry.preproduction.native",
      package_coordinate_template: "ghcr.io/taxat/preprod/native/<artifact>",
      environment_refs: ["env_preproduction"],
      artifact_family_refs: ["NATIVE_DESKTOP"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Preproduction native packages carry the exact notarized candidate digest that may later be promoted."],
    },
    {
      namespace_ref: "registry.production.native",
      package_coordinate_template: "ghcr.io/taxat/prod/native/<artifact>",
      environment_refs: ["env_production"],
      artifact_family_refs: ["NATIVE_DESKTOP"],
      mutability_posture: "IMMUTABLE_DIGEST_DISCOVERY_TAGS_ONLY",
      promotion_mode: "COPY_BY_DIGEST_ONLY",
      retention_class_ref: "RELEASE_LONG_TAIL",
      notes: ["Production native packages require signature, notarization, provenance, and release-admission evidence."],
    },
    {
      namespace_ref: "registry.evidence.sbom",
      package_coordinate_template: "ghcr.io/taxat/evidence/sbom/<artifact>",
      environment_refs: environments.slice(),
      artifact_family_refs: ["SBOM"],
      mutability_posture: "APPEND_ONLY_EVIDENCE_COORDINATES",
      promotion_mode: "APPEND_ONLY_EVIDENCE",
      retention_class_ref: "EVIDENCE_APPEND_ONLY",
      notes: ["CycloneDX bundles are stored separately from the build outputs they describe."],
    },
    {
      namespace_ref: "registry.evidence.provenance",
      package_coordinate_template: "ghcr.io/taxat/evidence/provenance/<artifact>",
      environment_refs: environments.slice(),
      artifact_family_refs: ["PROVENANCE"],
      mutability_posture: "APPEND_ONLY_EVIDENCE_COORDINATES",
      promotion_mode: "APPEND_ONLY_EVIDENCE",
      retention_class_ref: "EVIDENCE_APPEND_ONLY",
      notes: ["In-toto and SLSA provenance bundles remain append-only and independently addressable."],
    },
    {
      namespace_ref: "registry.evidence.release-admission",
      package_coordinate_template: "ghcr.io/taxat/evidence/release-admission/<artifact>",
      environment_refs: environments.slice(),
      artifact_family_refs: ["MANIFEST_INPUTS"],
      mutability_posture: "APPEND_ONLY_EVIDENCE_COORDINATES",
      promotion_mode: "APPEND_ONLY_EVIDENCE",
      retention_class_ref: "EVIDENCE_APPEND_ONLY",
      notes: ["Release-admission manifests persist the candidate tuple and promotion decision inputs."],
    },
  ];
}

function createTrustRoots(
  selectedProviderStackIdOrNull: ProviderStackId | null = null,
): TrustRoot[] {
  const kmsNotes =
    selectedProviderStackIdOrNull === "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER"
      ? ["Selected provider path uses a cloud KMS-backed signing root."]
      : ["KMS-backed signing remains an alternative provider posture, not the default current recommendation."];

  return [
    {
      trust_root_ref: "trust_root.sigstore.fulcio.github-oidc",
      label: "Sigstore Fulcio via GitHub OIDC",
      root_kind: "OIDC_IDENTITY",
      verification_summary:
        "Verifier accepts workload-identity leaf certificates chained to Fulcio and binds subject digest to the signature payload.",
      rotation_posture:
        "Leaf identities are short-lived and minted per workflow execution; no long-lived private key is stored in repo scope.",
      applies_to_families: [
        "API",
        "WORKER",
        "WEB_BUNDLE",
        "NATIVE_DESKTOP",
        "SBOM",
        "PROVENANCE",
        "MANIFEST_INPUTS",
      ],
      notes: ["Preferred signing trust root for the recommended GitHub-hosted stack."],
    },
    {
      trust_root_ref: "trust_root.github.artifact-attestations",
      label: "GitHub artifact attestations",
      root_kind: "ATTESTATION_SERVICE",
      verification_summary:
        "Artifact attestations are verified against the build workflow identity and digest-bound subject.",
      rotation_posture:
        "Service-managed root and workload identity posture are governed by GitHub; only attestation references persist locally.",
      applies_to_families: [
        "API",
        "WORKER",
        "WEB_BUNDLE",
        "NATIVE_DESKTOP",
        "SBOM",
        "PROVENANCE",
        "MANIFEST_INPUTS",
      ],
      notes: ["Provides first-party provenance verification when GitHub Actions is the builder."],
    },
    {
      trust_root_ref: "trust_root.apple.developer-id",
      label: "Apple Developer ID + notarization",
      root_kind: "APPLE_DEVELOPER_ID",
      verification_summary:
        "Native macOS packages must verify a Developer ID signature and a notarization ticket bound to the same package digest.",
      rotation_posture:
        "Certificate rotation stays inside the governed Apple Developer account boundary; notarization proof is stored as evidence ref only.",
      applies_to_families: ["NATIVE_DESKTOP"],
      notes: ["Mandatory for macOS release artifacts."],
    },
    {
      trust_root_ref: "trust_root.cloud.kms.signing",
      label: "Cloud KMS-backed signing root",
      root_kind: "KMS_SIGNING_KEY",
      verification_summary:
        "Alternative managed-key posture for environments that cannot use keyless OIDC signing.",
      rotation_posture:
        "Key versions rotate inside the governed KMS boundary and never export raw private material.",
      applies_to_families: [
        "API",
        "WORKER",
        "WEB_BUNDLE",
        "NATIVE_DESKTOP",
        "SBOM",
        "PROVENANCE",
        "MANIFEST_INPUTS",
      ],
      notes: kmsNotes,
    },
  ];
}

function registryNamespaceRefsForSeed(seed: TargetSeed): string[] {
  switch (seed.server_kind) {
    case "SERVER":
    case "WORKER":
      return [
        "registry.preview.server",
        "registry.sandbox.server",
        "registry.preproduction.server",
        "registry.production.server",
        "registry.evidence.sbom",
        "registry.evidence.provenance",
        "registry.evidence.release-admission",
      ];
    case "WEB":
      return [
        "registry.preview.web",
        "registry.sandbox.web",
        "registry.preproduction.web",
        "registry.production.web",
        "registry.evidence.sbom",
        "registry.evidence.provenance",
        "registry.evidence.release-admission",
      ];
    case "NATIVE":
      return [
        "registry.preview.native",
        "registry.sandbox.native",
        "registry.preproduction.native",
        "registry.production.native",
        "registry.evidence.sbom",
        "registry.evidence.provenance",
        "registry.evidence.release-admission",
      ];
    case "MANIFEST":
      return [
        "registry.evidence.sbom",
        "registry.evidence.provenance",
        "registry.evidence.release-admission",
      ];
  }
}

function buildTargetRows(): BuildTargetRow[] {
  return TARGET_SEEDS.map((seed) => ({
    target_ref: seed.target_ref,
    label: seed.label,
    runtime_kind: seed.runtime_kind,
    distribution_target: seed.distribution_target,
    environment_refs: ENVIRONMENTS.map((entry) => entry.environment_ref),
    artifact_family_refs: seed.artifact_family_refs,
    registry_namespace_refs: registryNamespaceRefsForSeed(seed),
    signature_requirement_ref: seed.signature_requirement_ref,
    provenance_requirement_ref: seed.provenance_requirement_ref,
    sbom_requirement_ref: seed.sbom_requirement_ref,
    notarization_requirement_ref_or_null: seed.notarization_requirement_ref_or_null,
    retention_class_ref: seed.retention_class_ref,
    admission_profile_ref: seed.admission_profile_ref,
    candidate_binding_required: true,
    preview_only: seed.preview_only,
    notes: seed.notes,
  }));
}

export function createBuildArtifactSupplyChainSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://taxat.dev/schemas/build_artifact_supply_chain.schema.json",
    title: "Taxat build artifact supply chain catalog",
    type: "object",
    required: [
      "schema_version",
      "catalog_id",
      "selection_status",
      "target_rows",
      "registry_namespaces",
      "trust_roots",
    ],
    properties: {
      schema_version: { const: "1.0" },
      catalog_id: { const: "build_target_catalog" },
      selection_status: {
        enum: ["PROVIDER_SELECTION_REQUIRED", "PROVIDER_STACK_SELECTED"],
      },
      selected_provider_stack_id_or_null: {
        type: ["string", "null"],
      },
      recommended_provider_stack_id: {
        const: RECOMMENDED_PROVIDER_STACK_ID,
      },
      target_rows: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "target_ref",
            "label",
            "distribution_target",
            "artifact_family_refs",
            "registry_namespace_refs",
            "signature_requirement_ref",
            "provenance_requirement_ref",
            "sbom_requirement_ref",
            "retention_class_ref",
            "admission_profile_ref",
            "candidate_binding_required",
          ],
          properties: {
            target_ref: { type: "string" },
            label: { type: "string" },
            distribution_target: {
              enum: [
                "CONTAINER_IMAGE",
                "WEB_BUNDLE",
                "MACOS_DESKTOP",
                "SUPPLY_CHAIN_EVIDENCE",
              ],
            },
            artifact_family_refs: {
              type: "array",
              minItems: 1,
              items: {
                enum: ARTIFACT_FAMILY_ORDER,
              },
            },
            registry_namespace_refs: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
            },
            signature_requirement_ref: { type: "string" },
            provenance_requirement_ref: { type: "string" },
            sbom_requirement_ref: { type: "string" },
            notarization_requirement_ref_or_null: {
              type: ["string", "null"],
            },
            retention_class_ref: {
              enum: [
                "PREVIEW_SHORT_LIVED",
                "VERIFICATION_WINDOW",
                "RELEASE_LONG_TAIL",
                "EVIDENCE_APPEND_ONLY",
              ],
            },
            admission_profile_ref: { type: "string" },
            candidate_binding_required: { type: "boolean" },
            preview_only: { type: "boolean" },
          },
        },
      },
      registry_namespaces: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "namespace_ref",
            "package_coordinate_template",
            "environment_refs",
            "artifact_family_refs",
            "mutability_posture",
            "promotion_mode",
            "retention_class_ref",
          ],
        },
      },
      trust_roots: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: [
            "trust_root_ref",
            "label",
            "root_kind",
            "verification_summary",
            "rotation_posture",
            "applies_to_families",
          ],
        },
      },
    },
  };
}

export function createBuildTargetCatalog(
  selectedProviderStackIdOrNull: ProviderStackId | null = null,
): BuildTargetCatalog {
  const selectionStatus = selectionStatusFromProvider(selectedProviderStackIdOrNull);
  return {
    schema_version: "1.0",
    catalog_id: "build_target_catalog",
    selection_status: selectionStatus,
    selected_provider_stack_id_or_null: selectedProviderStackIdOrNull,
    recommended_provider_stack_id: RECOMMENDED_PROVIDER_STACK_ID,
    provider_stack_options: createProviderStackOptions(selectedProviderStackIdOrNull),
    registry_namespaces: createRegistryNamespaces(),
    trust_roots: createTrustRoots(selectedProviderStackIdOrNull),
    target_rows: buildTargetRows(),
    typed_gaps: selectedProviderStackIdOrNull
      ? []
      : [
          "PROVIDER_SELECTION_REQUIRED_FOR_LIVE_REGISTRY_AND_SIGNING_RESOURCE_ADOPTION",
        ],
    notes: [
      "Artifact truth is the immutable digest plus its independently stored signature, provenance, and SBOM references.",
      "Tags remain convenience pointers only and never decide release admissibility.",
      "Preview namespaces remain clearly separated from production-admissible lanes.",
    ],
    source_refs: SOURCE_REFS,
  };
}

export function validateBuildTargetCatalog(
  catalog: BuildTargetCatalog = createBuildTargetCatalog(),
): void {
  if (!catalog.target_rows.length) {
    throw new Error("Build target catalog must define at least one target.");
  }

  const namespaceRefs = new Set(catalog.registry_namespaces.map((row) => row.namespace_ref));
  if (namespaceRefs.size !== catalog.registry_namespaces.length) {
    throw new Error("Registry namespace refs must be unique.");
  }

  for (const target of catalog.target_rows) {
    if (!target.signature_requirement_ref) {
      throw new Error(`${target.target_ref} is missing signature requirements.`);
    }
    if (!target.provenance_requirement_ref) {
      throw new Error(`${target.target_ref} is missing provenance requirements.`);
    }
    if (!target.sbom_requirement_ref) {
      throw new Error(`${target.target_ref} is missing SBOM requirements.`);
    }
    if (!target.admission_profile_ref) {
      throw new Error(`${target.target_ref} is missing release admission profile ref.`);
    }
    if (!target.registry_namespace_refs.length) {
      throw new Error(`${target.target_ref} must reference at least one registry namespace.`);
    }
    for (const namespaceRef of target.registry_namespace_refs) {
      if (!namespaceRefs.has(namespaceRef)) {
        throw new Error(
          `${target.target_ref} references unknown registry namespace ${namespaceRef}.`,
        );
      }
    }
    if (
      target.distribution_target === "MACOS_DESKTOP" &&
      !target.notarization_requirement_ref_or_null
    ) {
      throw new Error(`${target.target_ref} must require notarization.`);
    }
  }
}

function signatureModeForProvider(
  selectedProviderStackIdOrNull: ProviderStackId | null,
): SigningAndNotarizationFamilyPolicy["signature_mode"] {
  if (selectedProviderStackIdOrNull === "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER") {
    return "KMS_BACKED_SIGNING";
  }
  if (selectedProviderStackIdOrNull === "SELF_HOSTED_OCI_SIGSTORE_STACK") {
    return "SELF_HOSTED_SIGSTORE_FULCIO_REKOR";
  }
  return "KEYLESS_OIDC_IDENTITY";
}

function trustRootRefsForFamily(
  family: ArtifactFamilyId,
  selectedProviderStackIdOrNull: ProviderStackId | null,
): string[] {
  if (selectedProviderStackIdOrNull === "CLOUD_MANAGED_OCI_REGISTRY_WITH_KMS_SIGNER") {
    return family === "NATIVE_DESKTOP"
      ? ["trust_root.cloud.kms.signing", "trust_root.apple.developer-id"]
      : ["trust_root.cloud.kms.signing"];
  }

  const base = [
    "trust_root.sigstore.fulcio.github-oidc",
    "trust_root.github.artifact-attestations",
  ];
  if (family === "NATIVE_DESKTOP") {
    return [...base, "trust_root.apple.developer-id"];
  }
  return base;
}

export function createSigningAndNotarizationPolicy(
  selectedProviderStackIdOrNull: ProviderStackId | null = null,
): SigningAndNotarizationPolicy {
  const catalog = createBuildTargetCatalog(selectedProviderStackIdOrNull);
  const signatureMode = signatureModeForProvider(selectedProviderStackIdOrNull);

  const familyRows: SigningAndNotarizationFamilyPolicy[] = ARTIFACT_FAMILY_ORDER.map(
    (family) => ({
      artifact_family_ref: family,
      label: familyLabel(family),
      signature_required: true,
      signature_mode: signatureMode,
      signing_identity_summary:
        signatureMode === "KEYLESS_OIDC_IDENTITY"
          ? "Workload identity signs without storing a long-lived private key in repository scope."
          : signatureMode === "KMS_BACKED_SIGNING"
            ? "Workload identity requests signing inside a governed KMS or HSM boundary."
            : "Self-hosted Sigstore trust roots must remain workload-bound and transparency-audited.",
      trust_root_refs: trustRootRefsForFamily(family, selectedProviderStackIdOrNull),
      verification_required: true,
      notarization_required_for_distribution_targets:
        family === "NATIVE_DESKTOP" ? ["MACOS_DESKTOP"] : [],
      notarization_profile_ref_or_null:
        family === "NATIVE_DESKTOP" ? "notarization.apple-developer-id" : null,
      allowed_verifier_actions: [
        "VERIFY_SUBJECT_DIGEST_MATCH",
        "VERIFY_TRUST_ROOT",
        "VERIFY_CANDIDATE_HASH_BINDING",
      ],
      notes:
        family === "NATIVE_DESKTOP"
          ? [
              "Native packages require both signature verification and notarization evidence.",
            ]
          : ["Every durable build output and evidence bundle is independently signed."],
    }),
  );

  const targetBindings: SigningAndNotarizationTargetBinding[] = catalog.target_rows.map(
    (target) => ({
      target_ref: target.target_ref,
      signature_required: true,
      trust_root_refs: uniqueStrings(
        target.artifact_family_refs.flatMap((family) =>
          trustRootRefsForFamily(family, selectedProviderStackIdOrNull),
        ),
      ),
      verification_checks: [
        "DIGEST_PINNED_SUBJECT_REQUIRED",
        "SIGNATURE_VERIFICATION_REQUIRED",
        "ATTESTED_BUILDER_IDENTITY_REQUIRED",
      ],
      notarization_required: target.distribution_target === "MACOS_DESKTOP",
    }),
  );

  return {
    schema_version: "1.0",
    policy_id: "signing_and_notarization_policy",
    selection_status: selectionStatusFromProvider(selectedProviderStackIdOrNull),
    selected_provider_stack_id_or_null: selectedProviderStackIdOrNull,
    family_rows: familyRows,
    target_bindings: targetBindings,
    notes: [
      "Private signing material must stay inside workload identity or managed key boundaries.",
      "Unsigned or unverifiable artifacts remain unpromotable.",
    ],
    source_refs: SOURCE_REFS,
  };
}

export function validateSigningAndNotarizationPolicy(
  policy: SigningAndNotarizationPolicy = createSigningAndNotarizationPolicy(),
  catalog: BuildTargetCatalog = createBuildTargetCatalog(
    policy.selected_provider_stack_id_or_null,
  ),
): void {
  const familyMap = new Map(
    policy.family_rows.map((row) => [row.artifact_family_ref, row]),
  );
  const targetMap = new Map(policy.target_bindings.map((row) => [row.target_ref, row]));

  for (const target of catalog.target_rows) {
    const targetBinding = targetMap.get(target.target_ref);
    if (!targetBinding) {
      throw new Error(`No signing binding exists for ${target.target_ref}.`);
    }
    if (!targetBinding.signature_required) {
      throw new Error(`${target.target_ref} must require signatures.`);
    }
    if (!targetBinding.trust_root_refs.length) {
      throw new Error(`${target.target_ref} must declare trust roots.`);
    }
    if (target.distribution_target === "MACOS_DESKTOP" && !targetBinding.notarization_required) {
      throw new Error(`${target.target_ref} must require notarization.`);
    }
    for (const family of target.artifact_family_refs) {
      const familyPolicy = familyMap.get(family);
      if (!familyPolicy) {
        throw new Error(`No family signing policy exists for ${family}.`);
      }
      if (!familyPolicy.signature_required) {
        throw new Error(`${family} must require signatures.`);
      }
      if (
        target.distribution_target === "MACOS_DESKTOP" &&
        family === "NATIVE_DESKTOP" &&
        !familyPolicy.trust_root_refs.includes("trust_root.apple.developer-id")
      ) {
        throw new Error("macOS native desktop policy must include Apple trust root.");
      }
    }
  }

  const serialized = JSON.stringify(policy);
  if (/BEGIN PRIVATE KEY|password/i.test(serialized)) {
    throw new Error("Signing policy must not persist private keys or passwords.");
  }
}

export function createAttestationAndSbomPolicy(): AttestationAndSbomPolicy {
  const requiredFacts = [
    "build_artifact_digest",
    "source_revision",
    "workflow_run_ref",
    "builder_identity",
    "dependency_lock_ref",
    "schema_bundle_hash",
    "candidate_identity_hash_when_available",
  ];

  return {
    schema_version: "1.0",
    policy_id: "attestation_and_sbom_policy",
    sbom_format: "CycloneDX_1_7_JSON",
    provenance_format: "IN_TOTO_STATEMENT_SLSA_V1",
    vulnerability_scan_signal:
      "Vulnerability posture remains a release-admission input and cannot be implied from registry presence alone.",
    artifact_family_rows: ARTIFACT_FAMILY_ORDER.map((family) => ({
      artifact_family_ref: family,
      sbom_required: family !== "MANIFEST_INPUTS",
      provenance_required: true,
      vulnerability_gate_posture:
        family === "MANIFEST_INPUTS"
          ? "PASS_OR_JUSTIFIED_EXCEPTION"
          : "PASS_REQUIRED",
      required_attested_fields: requiredFacts,
      storage_namespace_refs:
        family === "MANIFEST_INPUTS"
          ? ["registry.evidence.release-admission", "registry.evidence.provenance"]
          : ["registry.evidence.sbom", "registry.evidence.provenance"],
      notes:
        family === "MANIFEST_INPUTS"
          ? [
              "Release manifest inputs still carry provenance, even if the manifest itself may not have a traditional dependency SBOM.",
            ]
          : ["Evidence stays separately addressable from the build output it describes."],
    })),
    evidence_bundle_namespace_refs: [
      "registry.evidence.sbom",
      "registry.evidence.provenance",
      "registry.evidence.release-admission",
    ],
    notes: [
      "An SBOM may exist without promotion being allowed; completeness of the evidence set still matters.",
      "Provider outage during upload must fail closed and leave the artifact inadmissible.",
    ],
    source_refs: [
      ...SOURCE_REFS,
      {
        source_ref: OFFICIAL_DOC_URLS.cyclonedx,
        rationale: "CycloneDX 1.7 JSON is the declared SBOM interchange format.",
      },
      {
        source_ref: OFFICIAL_DOC_URLS.githubAttestations,
        rationale: "GitHub artifact attestations provide an official attestations path for the recommended stack.",
      },
    ],
  };
}

export function createRegistryRetentionAndPromotionPolicy(): RegistryRetentionAndPromotionPolicy {
  return {
    schema_version: "1.0",
    policy_id: "registry_retention_and_promotion_policy",
    retention_classes: [
      {
        retention_class_ref: "PREVIEW_SHORT_LIVED",
        label: "Preview short-lived",
        retention_window: "14 days",
        durable_identity_posture: "Digest still identifies the artifact, but preview artifacts are disposable and never production truth.",
        rollback_reference_posture: "No production rollback eligibility.",
      },
      {
        retention_class_ref: "VERIFICATION_WINDOW",
        label: "Verification window",
        retention_window: "45 days",
        durable_identity_posture: "Retained long enough for integration replay, audit, and drift analysis.",
        rollback_reference_posture: "Rollback allowed only inside non-production lanes.",
      },
      {
        retention_class_ref: "RELEASE_LONG_TAIL",
        label: "Release long tail",
        retention_window: "365 days",
        durable_identity_posture: "Promotable packages and release rollback digests remain addressable for a full release horizon.",
        rollback_reference_posture: "Rollback points always reference prior admitted digests, never floating tags.",
      },
      {
        retention_class_ref: "EVIDENCE_APPEND_ONLY",
        label: "Evidence append-only",
        retention_window: "2555 days",
        durable_identity_posture: "SBOM, provenance, and release-admission records are append-only audit material.",
        rollback_reference_posture: "Evidence is never overwritten or garbage-collected on a normal release cadence.",
      },
    ],
    promotion_lanes: [
      {
        lane_ref: "lane.preview-to-sandbox",
        source_environment_ref: "env_preview",
        destination_environment_ref: "env_sandbox",
        promotion_mode: "NOT_ALLOWED",
        alias_behavior: "NO_TAG_ALIAS_FOR_THIS_LANE",
        notes: ["Preview lanes cannot directly promote artifacts."],
      },
      {
        lane_ref: "lane.sandbox-to-preproduction",
        source_environment_ref: "env_sandbox",
        destination_environment_ref: "env_preproduction",
        promotion_mode: "COPY_BY_DIGEST_ONLY",
        alias_behavior: "TAGS_ARE_DISCOVERY_POINTERS_ONLY",
        notes: ["Digest copy is allowed once verification evidence is complete."],
      },
      {
        lane_ref: "lane.preproduction-to-production",
        source_environment_ref: "env_preproduction",
        destination_environment_ref: "env_production",
        promotion_mode: "COPY_BY_DIGEST_ONLY",
        alias_behavior: "TAGS_ARE_DISCOVERY_POINTERS_ONLY",
        notes: ["Production promotion binds to the exact preproduction-tested digest and candidate tuple."],
      },
    ],
    truth_statement:
      "Registry promotion moves digests, not mutable tags; evidence namespaces remain append-only and independently addressable.",
    notes: [
      "Retagging never changes durable identity.",
      "Rollback references remain previously admitted digests plus the release-admission manifest that named them.",
    ],
    source_refs: SOURCE_REFS,
  };
}

export function createReleaseAdmissionInputPack(): ReleaseAdmissionInputPack {
  return {
    schema_version: "1.0",
    pack_id: "release_admission_input_pack",
    candidate_identity_hash_inputs: [
      {
        field_ref: "candidate_hash",
        description: "Stable candidate tuple hash used to reject mixed-candidate evidence.",
      },
      {
        field_ref: "build_artifact_digest",
        description: "Digest-pinned build artifact subject that all evidence must bind to.",
      },
      {
        field_ref: "source_revision",
        description: "Source revision that produced the artifact and evidence bundle.",
      },
      {
        field_ref: "dependency_lock_ref",
        description: "Dependency lock digest or equivalent immutable lock reference.",
      },
      {
        field_ref: "schema_bundle_hash",
        description: "Schema bundle hash when a release candidate depends on compatibility bundle state.",
      },
      {
        field_ref: "provider_profile_set_hash",
        description: "Provider profile or release compatibility set hash assembled later in the promotion flow.",
      },
      {
        field_ref: "workflow_run_ref",
        description: "Builder workflow reference used for attestation verification.",
      },
      {
        field_ref: "builder_identity",
        description: "Verified builder identity issuing provenance and signature evidence.",
      },
      {
        field_ref: "sbom_ref",
        description: "CycloneDX bundle reference.",
      },
      {
        field_ref: "provenance_ref",
        description: "In-toto/SLSA provenance statement reference.",
      },
      {
        field_ref: "signature_verification_result",
        description: "Verifier result proving trust root, leaf identity, and subject digest agreement.",
      },
      {
        field_ref: "notarization_ref",
        description: "Required only for macOS desktop distribution targets.",
      },
    ],
    target_profiles: [
      {
        profile_ref: "admission.container-service",
        label: "Container service admission",
        target_refs: [
          "target.northbound-api-session-gateway",
          "target.manifest-orchestrator",
          "target.stage-workers",
          "target.read-projector-stream-broker",
        ],
        distribution_targets: ["CONTAINER_IMAGE"],
        required_fields: [
          "candidate_hash",
          "build_artifact_digest",
          "source_revision",
          "dependency_lock_ref",
          "schema_bundle_hash",
          "workflow_run_ref",
          "builder_identity",
        ],
        required_evidence: [
          "digest_pinned_subject",
          "signature_verification",
          "provenance_ref",
          "sbom_ref",
          "vulnerability_gate_pass",
        ],
        notarization_required: false,
        mixed_candidate_rejection: true,
        tag_only_reference_rejected: true,
        gate_posture: "REJECT_UNTIL_ALL_EVIDENCE_IS_PRESENT",
        notes: ["Container release never uses tags as durable identity."],
      },
      {
        profile_ref: "admission.web-bundle",
        label: "Web bundle admission",
        target_refs: ["target.operator-web-app", "target.client-portal-web-app"],
        distribution_targets: ["WEB_BUNDLE"],
        required_fields: [
          "candidate_hash",
          "build_artifact_digest",
          "source_revision",
          "dependency_lock_ref",
          "schema_bundle_hash",
          "workflow_run_ref",
          "builder_identity",
        ],
        required_evidence: [
          "digest_pinned_subject",
          "signature_verification",
          "provenance_ref",
          "sbom_ref",
          "vulnerability_gate_pass",
        ],
        notarization_required: false,
        mixed_candidate_rejection: true,
        tag_only_reference_rejected: true,
        gate_posture: "REJECT_UNTIL_ALL_EVIDENCE_IS_PRESENT",
        notes: ["Retained browser bundles remain signed build artifacts, not loose deployment folders."],
      },
      {
        profile_ref: "admission.release-manifest",
        label: "Release manifest admission",
        target_refs: ["target.desktop-release-channel"],
        distribution_targets: ["SUPPLY_CHAIN_EVIDENCE"],
        required_fields: [
          "candidate_hash",
          "build_artifact_digest",
          "source_revision",
          "dependency_lock_ref",
          "schema_bundle_hash",
          "workflow_run_ref",
          "builder_identity",
        ],
        required_evidence: [
          "digest_pinned_subject",
          "signature_verification",
          "provenance_ref",
        ],
        notarization_required: false,
        mixed_candidate_rejection: true,
        tag_only_reference_rejected: true,
        gate_posture: "REJECT_IF_CANDIDATE_TUPLE_IS_INCOMPLETE",
        notes: ["Release manifest inputs capture the authoritative candidate tuple and promotion decision inputs."],
      },
      {
        profile_ref: "admission.macos-desktop",
        label: "macOS desktop admission",
        target_refs: ["target.native-macos-operator-client"],
        distribution_targets: ["MACOS_DESKTOP"],
        required_fields: [
          "candidate_hash",
          "build_artifact_digest",
          "source_revision",
          "dependency_lock_ref",
          "schema_bundle_hash",
          "workflow_run_ref",
          "builder_identity",
          "notarization_ref",
        ],
        required_evidence: [
          "digest_pinned_subject",
          "signature_verification",
          "provenance_ref",
          "sbom_ref",
          "vulnerability_gate_pass",
          "notarization_ref",
        ],
        notarization_required: true,
        mixed_candidate_rejection: true,
        tag_only_reference_rejected: true,
        gate_posture: "FAIL_CLOSED_WITHOUT_CURRENT_NOTARIZATION",
        notes: [
          "Native macOS promotion requires Developer ID signature verification and current notarization evidence.",
        ],
      },
    ],
    evidence_truth_statement:
      "Release admission depends on digest, signature, provenance, SBOM, and notarization evidence refs rather than CI dashboard state.",
    notes: [
      "Mixed-candidate evidence is always rejected.",
      "Unsigned or unverifiable artifacts remain unpromotable.",
    ],
    source_refs: SOURCE_REFS,
  };
}

export function validateReleaseAdmissionInputPack(
  pack: ReleaseAdmissionInputPack = createReleaseAdmissionInputPack(),
  catalog: BuildTargetCatalog = createBuildTargetCatalog(),
): void {
  const profileByRef = new Map(pack.target_profiles.map((profile) => [profile.profile_ref, profile]));

  for (const target of catalog.target_rows) {
    const profile = profileByRef.get(target.admission_profile_ref);
    if (!profile) {
      throw new Error(`Missing release admission profile ${target.admission_profile_ref}.`);
    }
    if (!profile.required_evidence.includes("signature_verification")) {
      throw new Error(`${profile.profile_ref} must require signature verification.`);
    }
    if (!profile.required_evidence.includes("provenance_ref")) {
      throw new Error(`${profile.profile_ref} must require provenance.`);
    }
    if (
      target.distribution_target !== "SUPPLY_CHAIN_EVIDENCE" &&
      !profile.required_evidence.includes("sbom_ref")
    ) {
      throw new Error(`${profile.profile_ref} must require SBOM evidence.`);
    }
    if (target.distribution_target === "MACOS_DESKTOP" && !profile.notarization_required) {
      throw new Error(`${profile.profile_ref} must require notarization.`);
    }
    if (!profile.mixed_candidate_rejection || !profile.tag_only_reference_rejected) {
      throw new Error(`${profile.profile_ref} must reject mixed-candidate and tag-only evidence.`);
    }
  }
}

function extractDigest(reference: string): string | null {
  const match = reference.match(/@(?<digest>sha256:[a-f0-9]{64})\b/i);
  return match?.groups?.digest?.toLowerCase() ?? null;
}

export function isDigestPinnedReference(reference: string): boolean {
  return extractDigest(reference) !== null;
}

function releaseAdmissionProfileForTarget(
  pack: ReleaseAdmissionInputPack,
  targetRef: string,
): ReleaseAdmissionTargetProfile | undefined {
  return pack.target_profiles.find((profile) => profile.target_refs.includes(targetRef));
}

export function evaluateReleaseAdmissionEvidence(
  pack: ReleaseAdmissionInputPack,
  catalog: BuildTargetCatalog,
  envelope: AdmissionEvidenceEnvelope,
): ReleaseAdmissionEvaluation {
  const target = catalog.target_rows.find((row) => row.target_ref === envelope.target_ref);
  const targetProfile = releaseAdmissionProfileForTarget(pack, envelope.target_ref);
  const reasons: string[] = [];
  const verifiedBindings: string[] = [];

  if (!target || !targetProfile) {
    return {
      target_ref: envelope.target_ref,
      admissible: false,
      decision: "REJECTED",
      reasons: ["UNKNOWN_TARGET_PROFILE"],
      required_evidence: targetProfile?.required_evidence ?? [],
      verified_bindings: [],
    };
  }

  const digest = extractDigest(envelope.subject_reference);
  if (!digest) {
    reasons.push("TAG_ONLY_REFERENCE_NOT_ADMISSIBLE");
  } else {
    verifiedBindings.push(`subject_digest=${digest}`);
  }

  const mismatchedCandidateHashes = envelope.attested_candidate_hashes.filter(
    (value) => value !== envelope.candidate_hash,
  );
  if (mismatchedCandidateHashes.length > 0) {
    reasons.push("MIXED_CANDIDATE_EVIDENCE");
  } else if (envelope.attested_candidate_hashes.includes(envelope.candidate_hash)) {
    verifiedBindings.push(`candidate_hash=${envelope.candidate_hash}`);
  }

  const digestClaims = [
    envelope.signature_subject_digest_or_null,
    envelope.provenance_subject_digest_or_null,
    envelope.sbom_subject_digest_or_null,
    envelope.notarization_subject_digest_or_null,
  ].filter((value): value is string => Boolean(value));
  if (digest && digestClaims.some((value) => value.toLowerCase() !== digest)) {
    reasons.push("DIGEST_BINDING_MISMATCH");
  }

  if (!envelope.signature_verified || !envelope.signature_trust_root_ref_or_null) {
    reasons.push("SIGNATURE_VERIFICATION_REQUIRED");
  } else {
    verifiedBindings.push(
      `signature_root=${envelope.signature_trust_root_ref_or_null}`,
    );
  }

  if (!envelope.provenance_ref_or_null) {
    reasons.push("PROVENANCE_REQUIRED");
  } else {
    verifiedBindings.push(`provenance_ref=${envelope.provenance_ref_or_null}`);
  }

  if (
    target.distribution_target !== "SUPPLY_CHAIN_EVIDENCE" &&
    !envelope.sbom_ref_or_null
  ) {
    reasons.push("SBOM_REQUIRED");
  } else if (envelope.sbom_ref_or_null) {
    verifiedBindings.push(`sbom_ref=${envelope.sbom_ref_or_null}`);
  }

  if (envelope.vulnerability_gate !== "PASS") {
    reasons.push("VULNERABILITY_GATE_NOT_PASSED");
  }

  if (targetProfile.notarization_required && !envelope.notarization_ref_or_null) {
    reasons.push("NOTARIZATION_REQUIRED");
  } else if (envelope.notarization_ref_or_null) {
    verifiedBindings.push(`notarization_ref=${envelope.notarization_ref_or_null}`);
  }

  if (!envelope.builder_identity_verified) {
    reasons.push("BUILDER_IDENTITY_NOT_VERIFIED");
  }

  if (!envelope.source_revision) {
    reasons.push("SOURCE_REVISION_REQUIRED");
  }
  if (!envelope.dependency_lock_ref) {
    reasons.push("DEPENDENCY_LOCK_REF_REQUIRED");
  }
  if (!envelope.workflow_run_ref) {
    reasons.push("WORKFLOW_RUN_REF_REQUIRED");
  }
  if (!envelope.schema_bundle_hash_or_null) {
    reasons.push("SCHEMA_BUNDLE_HASH_REQUIRED");
  }
  if (!envelope.candidate_hash) {
    reasons.push("CANDIDATE_HASH_REQUIRED");
  }

  const uniqueReasons = uniqueStrings(reasons);
  return {
    target_ref: target.target_ref,
    admissible: uniqueReasons.length === 0,
    decision: uniqueReasons.length === 0 ? "ADMISSIBLE" : "REJECTED",
    reasons: uniqueReasons,
    required_evidence: targetProfile.required_evidence,
    verified_bindings: verifiedBindings,
  };
}

export function createSupplyChainInventoryTemplate({
  runContext = DEFAULT_RUN_CONTEXT,
  selectedProviderStackIdOrNull = null,
}: {
  runContext?: MinimalRunContext;
  selectedProviderStackIdOrNull?: ProviderStackId | null;
} = {}): SupplyChainInventoryTemplate {
  const catalog = createBuildTargetCatalog(selectedProviderStackIdOrNull);
  return {
    schema_version: "1.0",
    inventory_id: "supply_chain_inventory",
    provider_id: SUPPLY_CHAIN_PROVIDER_ID,
    flow_id: SUPPLY_CHAIN_FLOW_ID,
    policy_version: SUPPLY_CHAIN_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: catalog.selection_status,
    selected_provider_stack_id_or_null: selectedProviderStackIdOrNull,
    recommended_provider_stack_id: RECOMMENDED_PROVIDER_STACK_ID,
    provider_stack_options: catalog.provider_stack_options,
    adopted_namespace_refs: catalog.registry_namespaces.map((row) => row.namespace_ref),
    trust_root_refs: catalog.trust_roots.map((row) => row.trust_root_ref),
    build_target_refs: catalog.target_rows.map((row) => row.target_ref),
    typed_gaps: catalog.typed_gaps,
    notes: [
      "Inventory is sanitized and contains topology refs only.",
      "Live provider mutation remains blocked until provider selection is explicitly approved.",
    ],
    last_verified_at: SUPPLY_CHAIN_LAST_VERIFIED_AT,
  };
}

function stableInventoryComparable(inventory: SupplyChainInventoryTemplate) {
  return {
    selection_status: inventory.selection_status,
    selected_provider_stack_id_or_null: inventory.selected_provider_stack_id_or_null,
    recommended_provider_stack_id: inventory.recommended_provider_stack_id,
    provider_stack_options: inventory.provider_stack_options,
    adopted_namespace_refs: inventory.adopted_namespace_refs,
    trust_root_refs: inventory.trust_root_refs,
    build_target_refs: inventory.build_target_refs,
    typed_gaps: inventory.typed_gaps,
    notes: inventory.notes,
    last_verified_at: inventory.last_verified_at,
  };
}

function retentionClassLabel(retentionClassRef: RetentionClassRef): string {
  switch (retentionClassRef) {
    case "PREVIEW_SHORT_LIVED":
      return "Preview short-lived";
    case "VERIFICATION_WINDOW":
      return "Verification window";
    case "RELEASE_LONG_TAIL":
      return "Release long tail";
    case "EVIDENCE_APPEND_ONLY":
      return "Evidence append-only";
  }
}

function packageCoordinatePreviewForFamily(
  family: ArtifactFamilyId,
  namespaces: RegistryNamespace[],
): string | null {
  const namespace = namespaces.find((row) => row.artifact_family_refs.includes(family));
  return namespace?.package_coordinate_template ?? null;
}

function targetsForFamily(
  catalog: BuildTargetCatalog,
  family: ArtifactFamilyId,
): BuildTargetRow[] {
  return catalog.target_rows.filter((target) =>
    target.artifact_family_refs.includes(family),
  );
}

function ribbonSegmentsForFamily(family: ArtifactFamilyId): SupplyChainRibbonSegment[] {
  const familyToken = family.toLowerCase();
  return [
    {
      segment_ref: `${familyToken}.digest-binding`,
      label: "Digest binding",
      detail: "Immutable digest is the durable subject. Tags remain discovery pointers only.",
      badges: ["Digest truth", "Immutable"],
      inspector_title: "Digest binding",
      inspector_lines: [
        "Promotion copies by digest only.",
        "Retagging does not change durable identity.",
      ],
    },
    {
      segment_ref: `${familyToken}.signature`,
      label: "Signature",
      detail: "Signature verification proves trust root, leaf identity, and digest agreement.",
      badges: ["Trust root", "Verifier"],
      inspector_title: "Signature verification",
      inspector_lines: [
        "Signature verification is mandatory for every promotable artifact and evidence bundle.",
      ],
    },
    {
      segment_ref: `${familyToken}.provenance`,
      label: "Provenance",
      detail: "In-toto provenance binds builder identity, workflow run, source revision, and dependency lock ref.",
      badges: ["Builder identity", "Workflow ref"],
      inspector_title: "Provenance binding",
      inspector_lines: [
        "Provenance must bind the same digest as the signature subject.",
      ],
    },
    {
      segment_ref: `${familyToken}.sbom`,
      label: "SBOM",
      detail: "CycloneDX bundle remains separately addressable and subject-bound.",
      badges: ["CycloneDX", "Evidence"],
      inspector_title: "SBOM binding",
      inspector_lines: [
        "SBOM presence alone is insufficient; completeness of the evidence set still matters.",
      ],
    },
    {
      segment_ref: `${familyToken}.candidate-admission`,
      label: "Candidate admission",
      detail: "Release admission rejects mixed candidate hashes and binds the full candidate tuple before promotion.",
      badges: ["candidate_hash", "Gate"],
      inspector_title: "Candidate admission",
      inspector_lines: [
        "candidate_hash, schema_bundle_hash, and provider_profile_set_hash remain part of durable release truth.",
      ],
    },
  ];
}

function familySummary(
  family: ArtifactFamilyId,
  targetRows: BuildTargetRow[],
): string {
  switch (family) {
    case "API":
      return "Server images release as immutable OCI digests with independent signature, provenance, and SBOM evidence.";
    case "WORKER":
      return "Worker images share server-grade release controls but keep a shorter rollback retention window.";
    case "WEB_BUNDLE":
      return "Retained browser bundles are signed build artifacts, not mutable deployment folders.";
    case "NATIVE_DESKTOP":
      return "Native macOS packages require signature, provenance, SBOM, and notarization before promotion.";
    case "SBOM":
      return "CycloneDX bundles stay independently addressable and bind back to the same candidate digest.";
    case "PROVENANCE":
      return "Provenance captures builder identity, workflow ref, source revision, and dependency lock state.";
    case "MANIFEST_INPUTS":
      return "Release manifest inputs serialize candidate admission truth instead of relying on CI dashboard folklore.";
  }
}

function createAtlasRowsForFamily(
  family: ArtifactFamilyId,
  catalog: BuildTargetCatalog,
  signingPolicy: SigningAndNotarizationPolicy,
  releaseAdmissionPack: ReleaseAdmissionInputPack,
): Omit<
  ReleaseSupplyChainAtlasFamily,
  | "family_ref"
  | "label"
  | "distribution_targets"
  | "target_refs"
  | "target_count"
  | "registry_summary"
  | "signature_summary"
  | "provenance_summary"
  | "retention_class_label"
  | "summary"
  | "inspector_notes"
> {
  const targets = targetsForFamily(catalog, family);
  const packagePreview = packageCoordinatePreviewForFamily(
    family,
    catalog.registry_namespaces,
  );
  const retentionSummary = retentionClassLabel(
    targets[0]?.retention_class_ref ?? "EVIDENCE_APPEND_ONLY",
  );
  const familyPolicy = signingPolicy.family_rows.find(
    (row) => row.artifact_family_ref === family,
  );
  const profileRefs = uniqueStrings(targets.map((target) => target.admission_profile_ref));

  const sourceBuildRows: SupplyChainAtlasRow[] = [
    {
      row_ref: `${family.toLowerCase()}.source-build`,
      label:
        family === "MANIFEST_INPUTS"
          ? "Assemble candidate tuple"
          : family === "SBOM"
            ? "Generate CycloneDX bundle"
            : family === "PROVENANCE"
              ? "Emit provenance statement"
              : family === "NATIVE_DESKTOP"
                ? "Build notarizable package"
                : "Build digest-bound artifact",
      detail:
        family === "MANIFEST_INPUTS"
          ? "Release manifest inputs capture candidate_hash, schema_bundle_hash, provider_profile_set_hash, and admitted digest refs."
          : "Build output is recorded with an immutable digest, source revision, workflow run ref, and dependency lock ref.",
      badges: ["Digest truth", "Workflow ref"],
      inspector_title:
        family === "MANIFEST_INPUTS" ? "Candidate tuple assembly" : "Source and build binding",
      inspector_lines: [
        "build_artifact_digest",
        "source_revision",
        "workflow_run_ref",
        "dependency_lock_ref",
        "schema_bundle_hash",
      ],
      trust_root_refs: [],
      retention_summary: retentionSummary,
      package_coordinate_preview_or_null: packagePreview,
    },
  ];

  const registryRows: SupplyChainAtlasRow[] = [
    {
      row_ref: `${family.toLowerCase()}.registry`,
      label: "Immutable registry namespace",
      detail:
        family === "SBOM" || family === "PROVENANCE" || family === "MANIFEST_INPUTS"
          ? "Evidence coordinates are append-only and stored separately from build outputs."
          : "Registry coordinates are environment-scoped and promoted by digest copy only.",
      badges: ["Immutable", "Digest copy"],
      inspector_title: "Registry topology",
      inspector_lines: [
        packagePreview ?? "No package coordinate preview available.",
        "Tags remain discovery pointers only.",
      ],
      trust_root_refs: [],
      retention_summary: retentionSummary,
      package_coordinate_preview_or_null: packagePreview,
    },
  ];

  const signNotarizeRows: SupplyChainAtlasRow[] = [
    {
      row_ref: `${family.toLowerCase()}.sign`,
      label: family === "NATIVE_DESKTOP" ? "Sign and notarize" : "Sign artifact",
      detail:
        family === "NATIVE_DESKTOP"
          ? "Developer ID Application signing and notarization ticket must bind to the exact dmg/pkg digest."
          : "Each artifact and evidence bundle is signed independently and verified against the declared trust root.",
      badges:
        family === "NATIVE_DESKTOP"
          ? ["Developer ID", "Notarization", "Trust root"]
          : ["Signature", "Trust root"],
      inspector_title:
        family === "NATIVE_DESKTOP"
          ? "Developer ID and notarization"
          : "Signature lineage",
      inspector_lines:
        family === "NATIVE_DESKTOP"
          ? [
              "trust_root.apple.developer-id",
              "Developer ID Application certificate",
              "notarization_ref",
              "Digest and ticket must match.",
            ]
          : [
              ...(familyPolicy?.trust_root_refs ?? []),
              "Signature verification is mandatory before promotion.",
            ],
      trust_root_refs: familyPolicy?.trust_root_refs ?? [],
      retention_summary: retentionSummary,
      package_coordinate_preview_or_null: packagePreview,
    },
  ];

  const attestSbomRows: SupplyChainAtlasRow[] = [
    {
      row_ref: `${family.toLowerCase()}.attest`,
      label:
        family === "SBOM"
          ? "SBOM publication"
          : family === "PROVENANCE"
            ? "Provenance publication"
            : "Provenance and SBOM",
      detail:
        family === "MANIFEST_INPUTS"
          ? "Release manifest inputs keep provenance even when the package itself is evidence material rather than a software payload."
          : "SBOM and provenance publish as separate evidence refs and must bind to the same subject digest.",
      badges: ["CycloneDX", "SLSA", "Append-only"],
      inspector_title: "Attestation and SBOM evidence",
      inspector_lines: [
        "registry.evidence.sbom",
        "registry.evidence.provenance",
        "builder_identity",
        "dependency_lock_ref",
      ],
      trust_root_refs: ["trust_root.github.artifact-attestations"],
      retention_summary: retentionSummary,
      package_coordinate_preview_or_null: "ghcr.io/taxat/evidence/<family>/<artifact>",
    },
  ];

  const promotionInputRows: SupplyChainAtlasRow[] = [
    {
      row_ref: `${family.toLowerCase()}.promotion-inputs`,
      label: "Release-admission inputs",
      detail:
        family === "NATIVE_DESKTOP"
          ? "Candidate admission includes notarization_ref in addition to digest, signature, provenance, SBOM, and vulnerability posture."
          : "Candidate admission requires digest, signature verification, provenance ref, SBOM ref, vulnerability posture, and candidate tuple binding.",
      badges: ["candidate_hash", "schema_bundle_hash", "Gate"],
      inspector_title: "Promotion inputs",
      inspector_lines: [
        ...profileRefs,
        "candidate_hash",
        "schema_bundle_hash",
        family === "NATIVE_DESKTOP" ? "notarization_ref" : "provider_profile_set_hash",
      ],
      trust_root_refs: [],
      retention_summary: retentionSummary,
      package_coordinate_preview_or_null:
        "ghcr.io/taxat/evidence/release-admission/<artifact>",
    },
  ];

  return {
    source_build_rows: sourceBuildRows,
    registry_rows: registryRows,
    sign_notarize_rows: signNotarizeRows,
    attest_sbom_rows: attestSbomRows,
    promotion_input_rows: promotionInputRows,
    chain_segments: ribbonSegmentsForFamily(family),
  };
}

export function createReleaseSupplyChainAtlasViewModel(): ReleaseSupplyChainAtlasViewModel {
  const catalog = createBuildTargetCatalog();
  const signingPolicy = createSigningAndNotarizationPolicy();
  const releaseAdmissionPack = createReleaseAdmissionInputPack();

  const families: ReleaseSupplyChainAtlasFamily[] = ARTIFACT_FAMILY_ORDER.map((family) => {
    const targets = targetsForFamily(catalog, family);
    const retentionClassRef = targets[0]?.retention_class_ref ?? "EVIDENCE_APPEND_ONLY";
    const registrySummary =
      family === "SBOM" || family === "PROVENANCE" || family === "MANIFEST_INPUTS"
        ? "Evidence bundles live in append-only evidence namespaces."
        : "Delivery artifacts live in environment-scoped OCI namespaces and promote by digest copy only.";
    const signatureSummary =
      family === "NATIVE_DESKTOP"
        ? "Signature plus Apple notarization required."
        : "Independent signature verification required.";
    const provenanceSummary =
      family === "MANIFEST_INPUTS"
        ? "Candidate tuple provenance is mandatory."
        : "Provenance and SBOM bind to the same subject digest.";

    return {
      family_ref: family,
      label: familyLabel(family),
      distribution_targets: uniqueStrings(
        targets.map((target) => target.distribution_target),
      ) as DistributionTarget[],
      target_refs: targets.map((target) => target.target_ref),
      target_count: targets.length,
      registry_summary: registrySummary,
      signature_summary: signatureSummary,
      provenance_summary: provenanceSummary,
      retention_class_label: retentionClassLabel(retentionClassRef),
      summary: familySummary(family, targets),
      inspector_notes: [
        `${targets.length} build target(s) currently map to this family.`,
        "Release truth stays separate from mutable CI and registry UI state.",
      ],
      ...createAtlasRowsForFamily(
        family,
        catalog,
        signingPolicy,
        releaseAdmissionPack,
      ),
    };
  });

  return {
    providerDisplayName: "Release supply chain",
    providerMonogram: "SC",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    postureChipLabel: "Digest truth only",
    policyVersion: SUPPLY_CHAIN_POLICY_VERSION,
    summary:
      "Chain of custody stays calm and explicit: immutable digest, independent signature, provenance, SBOM, and candidate admission inputs.",
    notes: [
      "The recommended stack is recorded, but provider selection remains explicitly unresolved for live adoption.",
      "The viewer is read-only and cannot push, sign, or promote artifacts.",
    ],
    environments: ENVIRONMENTS.map((entry) => ({
      environment_ref: entry.environment_ref,
      label: entry.label,
      topology_summary: entry.topology_summary,
      admission_lane_posture: entry.admission_lane_posture,
    })),
    families,
    selectedEnvironmentRef: "env_preproduction",
    selectedFamilyRef: "API",
    selectedFocusKind: null,
    selectedFocusRef: null,
  };
}

function createReleaseSupplyChainRunbookMarkdown(): string {
  const catalog = createBuildTargetCatalog();
  const signingPolicy = createSigningAndNotarizationPolicy();
  const releasePack = createReleaseAdmissionInputPack();

  return `# Release Supply Chain Runbook

## Purpose

This runbook declares the machine-readable release supply-chain topology for Taxat build artifacts.
It freezes namespace layout, trust roots, evidence classes, and release-admission inputs so later CI or release automation cannot improvise supply-chain truth.

## Recommended Portable Stack

- Recommended stack: \`${RECOMMENDED_PROVIDER_STACK_ID}\`
- Current selection posture: \`${catalog.selection_status}\`
- Official references:
  - [GitHub OIDC](${OFFICIAL_DOC_URLS.githubOidc})
  - [GitHub Container Registry](${OFFICIAL_DOC_URLS.ghcr})
  - [GitHub artifact attestations](${OFFICIAL_DOC_URLS.githubAttestations})
  - [Sigstore signing overview](${OFFICIAL_DOC_URLS.sigstoreSigning})
  - [Apple Developer ID](${OFFICIAL_DOC_URLS.appleDeveloperId})
  - [CycloneDX overview](${OFFICIAL_DOC_URLS.cyclonedx})

## Registry Topology

${catalog.registry_namespaces
  .map(
    (namespace) =>
      `- \`${namespace.namespace_ref}\` -> \`${namespace.package_coordinate_template}\` (${namespace.promotion_mode}, ${namespace.retention_class_ref})`,
  )
  .join("\n")}

## Signing And Notarization

${signingPolicy.family_rows
  .map(
    (row) =>
      `- \`${row.artifact_family_ref}\`: signature required = ${row.signature_required ? "yes" : "no"}, trust roots = ${row.trust_root_refs.join(", ")}${row.notarization_profile_ref_or_null ? `, notarization = ${row.notarization_profile_ref_or_null}` : ""}`,
  )
  .join("\n")}

## Release Admission Inputs

${releasePack.target_profiles
  .map(
    (profile) =>
      `- \`${profile.profile_ref}\`: fields = ${profile.required_fields.join(", ")}; evidence = ${profile.required_evidence.join(", ")}; notarization required = ${profile.notarization_required ? "yes" : "no"}`,
  )
  .join("\n")}

## Operational Rules

- Tags are discovery pointers only. Promotion copies digests.
- Signatures, provenance, SBOM bundles, and release manifests remain independently addressable artifacts.
- Mixed-candidate evidence is rejected.
- macOS delivery fails closed without current notarization evidence.
- Provider outages during signature or attestation publication leave the artifact inadmissible.
`;
}

export async function provisionRegistrySigningAndAttestation(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  existingInventoryPath?: string;
  providerStackSelection?: ProviderStackId;
}): Promise<ProvisionRegistrySigningAndAttestationResult> {
  const selectedProviderStackIdOrNull = options.providerStackSelection ?? null;
  const selectionStatus = selectionStatusFromProvider(selectedProviderStackIdOrNull);
  const schema = createBuildArtifactSupplyChainSchema();
  const buildTargetCatalog = createBuildTargetCatalog(selectedProviderStackIdOrNull);
  const signingAndNotarizationPolicy =
    createSigningAndNotarizationPolicy(selectedProviderStackIdOrNull);
  const attestationAndSbomPolicy = createAttestationAndSbomPolicy();
  const registryRetentionAndPromotionPolicy =
    createRegistryRetentionAndPromotionPolicy();
  const releaseAdmissionInputPack = createReleaseAdmissionInputPack();

  validateBuildTargetCatalog(buildTargetCatalog);
  validateSigningAndNotarizationPolicy(
    signingAndNotarizationPolicy,
    buildTargetCatalog,
  );
  validateReleaseAdmissionInputPack(releaseAdmissionInputPack, buildTargetCatalog);

  const inventory = createSupplyChainInventoryTemplate({
    runContext: options.runContext,
    selectedProviderStackIdOrNull,
  });

  let adoptionStep: ProvisionRegistrySigningAndAttestationStep = {
    step_id: "supplychain.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized supply-chain inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as SupplyChainInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "SUPPLY_CHAIN_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          schema,
          buildTargetCatalog,
          signingAndNotarizationPolicy,
          attestationAndSbomPolicy,
          registryRetentionAndPromotionPolicy,
          releaseAdmissionInputPack,
          inventory,
          atlasViewModel: createReleaseSupplyChainAtlasViewModel(),
          steps: [
            {
              step_id: "supplychain.resolve-provider-selection",
              title: "Resolve registry and signing provider stack",
              status: options.providerStackSelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
              reason: options.providerStackSelection
                ? `Provider stack ${options.providerStackSelection} was supplied explicitly.`
                : "Live registry, signing, and attestation adoption remain blocked until provider selection is approved.",
            },
            {
              step_id: "supplychain.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing supply-chain inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because supply-chain topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "supplychain.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen supply-chain topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "supplychain.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized supply-chain inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  return {
    outcome: options.providerStackSelection
      ? "SUPPLY_CHAIN_READY_FOR_PROVIDER_ADOPTION"
      : "SUPPLY_CHAIN_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    schema,
    buildTargetCatalog,
    signingAndNotarizationPolicy,
    attestationAndSbomPolicy,
    registryRetentionAndPromotionPolicy,
    releaseAdmissionInputPack,
    inventory,
    atlasViewModel: createReleaseSupplyChainAtlasViewModel(),
    steps: [
      {
        step_id: "supplychain.resolve-provider-selection",
        title: "Resolve registry and signing provider stack",
        status: options.providerStackSelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
        reason: options.providerStackSelection
          ? `Provider stack ${options.providerStackSelection} was supplied explicitly.`
          : "Hosting, registry, and signing remain explicitly unresolved, so the flow stays in portable blocked-contract mode.",
      },
      {
        step_id: "supplychain.freeze-registry-topology",
        title: "Freeze registry namespace topology",
        status: "SUCCEEDED",
        reason:
          "Environment-scoped namespaces, digest posture, retention classes, and promotion lanes are now machine-readable.",
      },
      {
        step_id: "supplychain.freeze-signing-lineage",
        title: "Freeze signing lineage and notarization posture",
        status: "SUCCEEDED",
        reason:
          "Trust roots, signing modes, verification checks, and macOS notarization requirements are now explicit.",
      },
      {
        step_id: "supplychain.freeze-attestation-policy",
        title: "Freeze attestation and SBOM policy",
        status: "SUCCEEDED",
        reason:
          "SBOM format, provenance facts, evidence namespaces, and vulnerability gate posture are now explicit.",
      },
      {
        step_id: "supplychain.freeze-release-admission-inputs",
        title: "Freeze release-admission inputs",
        status: "SUCCEEDED",
        reason:
          "Candidate-hash binding, digest truth, mixed-candidate rejection, and notarization evidence requirements are now explicit.",
      },
      adoptionStep,
      {
        step_id: "supplychain.persist-sanitized-inventory",
        title: "Persist sanitized inventory",
        status: "SUCCEEDED",
        reason:
          "Sanitized inventory persisted with topology refs, trust roots, and typed blockers only.",
      },
    ],
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const schema = createBuildArtifactSupplyChainSchema();
  const buildTargetCatalog = createBuildTargetCatalog();
  const signingAndNotarizationPolicy = createSigningAndNotarizationPolicy();
  const attestationAndSbomPolicy = createAttestationAndSbomPolicy();
  const registryRetentionAndPromotionPolicy =
    createRegistryRetentionAndPromotionPolicy();
  const releaseAdmissionInputPack = createReleaseAdmissionInputPack();
  const inventory = createSupplyChainInventoryTemplate();
  const atlasViewModel = createReleaseSupplyChainAtlasViewModel();
  const runbookMarkdown = createReleaseSupplyChainRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "infra/supplychain/contracts/build_artifact_supply_chain.schema.json",
      `${JSON.stringify(schema, null, 2)}\n`,
    ],
    [
      "config/supplychain/build_target_catalog.json",
      `${JSON.stringify(buildTargetCatalog, null, 2)}\n`,
    ],
    [
      "config/supplychain/signing_and_notarization_policy.json",
      `${JSON.stringify(signingAndNotarizationPolicy, null, 2)}\n`,
    ],
    [
      "config/supplychain/attestation_and_sbom_policy.json",
      `${JSON.stringify(attestationAndSbomPolicy, null, 2)}\n`,
    ],
    [
      "config/supplychain/registry_retention_and_promotion_policy.json",
      `${JSON.stringify(registryRetentionAndPromotionPolicy, null, 2)}\n`,
    ],
    [
      "config/supplychain/release_admission_input_pack.json",
      `${JSON.stringify(releaseAdmissionInputPack, null, 2)}\n`,
    ],
    [
      "data/provisioning/supply_chain_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/release_supply_chain_runbook.md", runbookMarkdown],
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
  sampleRun.releaseSupplyChainAtlas = atlasViewModel;
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
