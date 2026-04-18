import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SECRET_ROOT_PROVIDER_ID = "platform-secret-root";
export const SECRET_ROOT_FLOW_ID =
  "provision-secrets-manager-kms-or-hsm-roots-and-access-policies";
export const SECRET_ROOT_POLICY_VERSION = "1.0";
export const SECRET_ROOT_LAST_VERIFIED_AT = "2026-04-18T12:00:00Z";

export type ProviderStackId =
  | "AWS_SECRETS_MANAGER_KMS_CLOUDHSM"
  | "GCP_SECRET_MANAGER_CLOUD_KMS_HSM"
  | "AZURE_KEY_VAULT_MANAGED_HSM"
  | "HASHICORP_VAULT_AUTO_UNSEAL";

export type SecretRootSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_STACK_SELECTED";

export type SecretValueMode =
  | "VALUE_BEARING"
  | "METADATA_ONLY"
  | "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE";

export type PermissionCell = "ALLOW" | "ALLOW_METADATA_ONLY" | "DENY";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ProviderStackOption {
  stack_id: ProviderStackId;
  provider_label: string;
  selection_state:
    | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    | "SELF_HOST_DECISION_REQUIRED";
  secret_store_summary: string;
  key_root_summary: string;
  hsm_summary: string;
  soft_delete_summary: string;
  docs_urls: string[];
  source_refs: SourceRef[];
  fit_notes: string[];
}

export interface NamespaceRoot {
  namespace_ref: string;
  environment_refs: string[];
  provider_environment_refs: string[];
  partition_label: string;
  secret_mount_ref: string;
  metadata_mount_ref: string;
  wrapping_key_family_ref: string;
  hardware_root_requirement:
    | "KMS_ONLY_ACCEPTABLE"
    | "OPTIONAL_HSM_CAPABLE_ROOT";
  adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED";
  emergency_revoke_posture:
    "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE";
}

export interface SecretAliasRow {
  alias_ref: string;
  alias_name: string;
  secret_class:
    | "RUNTIME_DATABASE_PASSWORD"
    | "RUNTIME_CACHE_CREDENTIAL"
    | "TOKEN_SEALING_METADATA"
    | "AUTHORITY_CLIENT_SECRET"
    | "IDP_CLIENT_SECRET"
    | "EMAIL_DELIVERY_TOKEN"
    | "PROVIDER_WEBHOOK_SIGNING_SECRET"
    | "MONITORING_TOKEN"
    | "MONITORING_DSN"
    | "PUSH_PROVIDER_KEY"
    | "SUPPORT_ADAPTER_SECRET"
    | "DOCUMENT_EXTRACTION_PROVIDER_SECRET"
    | "MALWARE_SCANNING_PROVIDER_SECRET"
    | "BOOTSTRAP_OPERATOR_TOKEN"
    | "BREAK_GLASS_RECOVERY_MATERIAL"
    | "PROVISIONING_REDACTION_DICTIONARY";
  owning_service: string;
  rotation_owner_role: string;
  consumer_role_refs: string[];
  namespace_refs: string[];
  value_mode: SecretValueMode;
  store_ref_template: string;
  metadata_ref_template: string;
  key_family_ref: string;
  rotation_policy_ref: string;
  lineage_posture:
    | "APPEND_ONLY_SECRET_VERSION"
    | "METADATA_VERSION_ONLY"
    | "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY";
  notes: string[];
}

export interface RootKeyFamily {
  key_family_ref: string;
  family_label: string;
  family_kind:
    | "PROVIDER_MANAGED_DEFAULT"
    | "CUSTOMER_MANAGED_KMS"
    | "OPTIONAL_HSM_CAPABLE_ROOT"
    | "WRAPPING_KEY";
  protection_posture: string;
  lifecycle_posture: string;
  namespace_refs: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface EnvelopePolicyRow {
  envelope_ref: string;
  alias_ref: string;
  root_key_family_ref: string;
  data_key_policy:
    | "SERVICE_ISSUED_PER_VERSION"
    | "WRAP_ONLY_METADATA_LINEAGE"
    | "NO_DATA_KEY_ONE_TIME_PROVIDER_CAPTURE";
  import_or_export_restriction:
    | "EXPORT_FORBIDDEN"
    | "EXPORT_FORBIDDEN_IMPORT_BY_APPROVAL_ONLY";
  hsm_requirement:
    | "NOT_REQUIRED_THIS_PHASE"
    | "HSM_CAPABLE_ROOT_FOR_PRODUCTION_AND_BREAK_GLASS";
  notes: string[];
}

export interface AccessRoleRow {
  role_ref: string;
  label: string;
  actor_class: string;
  notes: string[];
}

export interface AccessGrantRow {
  grant_ref: string;
  role_ref: string;
  alias_refs: string[];
  namespace_refs: string[];
  dual_control_required: boolean;
  capabilities: {
    list_metadata: PermissionCell;
    write_secret: PermissionCell;
    read_secret: PermissionCell;
    decrypt_unwrap: PermissionCell;
    rotate_version: PermissionCell;
    disable_or_revoke: PermissionCell;
    manage_policy: PermissionCell;
    attest_audit: PermissionCell;
  };
  notes: string[];
}

export interface RotationPolicyRow {
  rotation_policy_ref: string;
  secret_class: SecretAliasRow["secret_class"];
  cadence_days_or_null: number | null;
  max_active_versions: number;
  overlap_window_hours: number;
  capture_posture:
    | "GENERATED_INSIDE_BOUNDARY"
    | "ONE_TIME_PROVIDER_REVEAL"
    | "METADATA_ONLY"
    | "BREAK_GLASS_DUAL_CONTROL";
  revoke_posture:
    | "DISABLE_NOW_RETAIN_AUDIT_LINEAGE"
    | "REVOKE_AFTER_CUTOVER"
    | "PURGE_NOT_REQUIRED_METADATA_ONLY";
  provider_soft_delete_conflict_posture:
    | "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW"
    | "METADATA_ONLY_NO_PROVIDER_DELETE_PATH";
  attestation_requirements: string[];
  notes: string[];
}

export interface SecretRootInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "secret_root_inventory";
  provider_id: typeof SECRET_ROOT_PROVIDER_ID;
  flow_id: typeof SECRET_ROOT_FLOW_ID;
  policy_version: typeof SECRET_ROOT_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: SecretRootSelectionStatus;
  selected_provider_stack_id_or_null: ProviderStackId | null;
  root_posture:
    "LOGICAL_TOPOLOGY_FROZEN_PROVIDER_UNRESOLVED";
  phase_hsm_requirement:
    "CLOUD_KMS_OR_MANAGED_HSM_CAPABLE_ROOT_SATISFIES_PHASE_01";
  provider_stack_options: ProviderStackOption[];
  namespace_roots: NamespaceRoot[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SecretRootTopologyLedgerViewModel {
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: SecretRootSelectionStatus;
  rootPostureLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    namespace_refs: string[];
    root_requirement: string;
  }>;
  aliases: Array<{
    alias_ref: string;
    label: string;
    secret_class: string;
    namespace_refs: string[];
    store_ref_preview: string;
    metadata_ref_preview: string;
    value_mode: SecretValueMode;
    rotation_policy_ref: string;
    key_family_ref: string;
    consumer_role_refs: string[];
    lineage_posture: string;
    notes: string[];
  }>;
  keyNodes: Array<{
    node_ref: string;
    label: string;
    node_kind: string;
    parent_ref: string | null;
    namespace_refs: string[];
    hardware_posture: string;
    rotation_mode: string;
  }>;
  accessRoles: AccessRoleRow[];
  accessGrants: AccessGrantRow[];
  selectedEnvironmentRef: string;
  selectedAliasRef: string;
}

export interface ProvisionSecretRootsStep {
  step_id: string;
  title: string;
  status: "SUCCEEDED" | "BLOCKED_BY_POLICY";
  reason: string;
}

export interface ProvisionSecretsManagerKmsOrHsmRootsResult {
  outcome:
    | "SECRET_ROOT_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "SECRET_ROOT_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION";
  selection_status: SecretRootSelectionStatus;
  inventory: SecretRootInventoryTemplate;
  aliasCatalog: ReturnType<typeof createSecretAliasCatalog>;
  keyHierarchyAndEnvelopePolicy: ReturnType<
    typeof createKeyHierarchyAndEnvelopePolicy
  >;
  accessPolicyMatrix: ReturnType<typeof createAccessPolicyMatrix>;
  rotationAndRevocationPolicy: ReturnType<
    typeof createRotationAndRevocationPolicy
  >;
  ledgerViewModel: SecretRootTopologyLedgerViewModel;
  steps: ProvisionSecretRootsStep[];
  notes: string[];
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

const algorithmSourceRefs: SourceRef[] = [
  {
    source_ref: "Algorithm/security_and_runtime_hardening_contract.md::secret-law",
    rationale:
      "Secret, key, and token handling requires least privilege, no raw secret leakage, and explicit runtime hardening boundaries.",
  },
  {
    source_ref: "Algorithm/deployment_and_resilience_contract.md::token-vault-kms-hsm",
    rationale:
      "Recovery, restore, and operational emergency handling requires a governed token-vault and key-root boundary.",
  },
  {
    source_ref: "Algorithm/observability_and_audit_contract.md::audit-redaction",
    rationale:
      "Audit evidence must remain lineage-bound while logs and telemetry stay free of raw secrets.",
  },
  {
    source_ref: "Algorithm/manifest_and_config_freeze_contract.md::deterministic-config",
    rationale:
      "Provider, environment, and config identity must remain deterministic and machine-readable.",
  },
  {
    source_ref: "Algorithm/schemas/secret_version.schema.json",
    rationale:
      "Supersession and lineage must remain append-only instead of mutating a single active secret record in place.",
  },
  {
    source_ref: "docs/security/33_provisioning_credential_capture_rotation_and_secret_storage_policy.md",
    rationale:
      "The provisioning secret pack already fixed capture, redaction, and cutover law that this root topology must now enforce structurally.",
  },
];

const externalDocRefs = {
  aws: [
    "https://docs.aws.amazon.com/secretsmanager/latest/userguide/data-protection.html",
    "https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html",
    "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html",
  ],
  gcp: [
    "https://docs.cloud.google.com/secret-manager/docs/cmek",
    "https://docs.cloud.google.com/kms/docs/hsm",
    "https://docs.cloud.google.com/kms/docs/use-keys-google-cloud",
  ],
  azure: [
    "https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys",
    "https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/",
    "https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview",
  ],
  vault: [
    "https://developer.hashicorp.com/vault/docs/about-vault/how-vault-works",
    "https://developer.hashicorp.com/vault/docs/secrets",
    "https://developer.hashicorp.com/vault/docs/secrets/kv",
  ],
} as const;

const runtimeNamespaces = [
  "sec_sandbox_runtime",
  "sec_preprod_runtime",
  "sec_production_runtime",
  "sec_drill_runtime",
] as const;
const authorityWebNamespaces = [
  "sec_sandbox_web_authority",
  "sec_preprod_web_authority",
  "sec_production_web_authority",
] as const;
const authorityDesktopNamespaces = [
  "sec_sandbox_desktop_authority",
  "sec_preprod_desktop_authority",
  "sec_production_desktop_authority",
] as const;
const authorityBatchNamespaces = [
  "sec_sandbox_batch_authority",
  "sec_preprod_batch_authority",
  "sec_production_batch_authority",
] as const;

const namespaceRoots: NamespaceRoot[] = [
  {
    namespace_ref: "sec_local_authoring",
    environment_refs: ["env_local_authoring"],
    provider_environment_refs: [],
    partition_label: "Local authoring and deterministic analysis",
    secret_mount_ref: "vault://kv/sec_local_authoring",
    metadata_mount_ref: "vault://metadata/sec_local_authoring",
    wrapping_key_family_ref: "key.wrap.bootstrap-and-tooling",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_local_provisioning_sandbox",
    environment_refs: ["env_local_provisioning_workstation"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Local provisioning sandbox capture boundary",
    secret_mount_ref: "vault://kv/sec_local_provisioning_sandbox",
    metadata_mount_ref: "vault://metadata/sec_local_provisioning_sandbox",
    wrapping_key_family_ref: "key.wrap.provider-ingest",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_ci_ephemeral",
    environment_refs: ["env_ci_ephemeral_validation"],
    provider_environment_refs: [],
    partition_label: "CI validation boundary",
    secret_mount_ref: "vault://kv/sec_ci_ephemeral",
    metadata_mount_ref: "vault://metadata/sec_ci_ephemeral",
    wrapping_key_family_ref: "key.wrap.bootstrap-and-tooling",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_ephemeral_review",
    environment_refs: ["env_ephemeral_review_preview"],
    provider_environment_refs: [],
    partition_label: "Ephemeral preview boundary",
    secret_mount_ref: "vault://kv/sec_ephemeral_review",
    metadata_mount_ref: "vault://metadata/sec_ephemeral_review",
    wrapping_key_family_ref: "key.wrap.bootstrap-and-tooling",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_sandbox_runtime",
    environment_refs: ["env_shared_sandbox_integration"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Sandbox runtime boundary",
    secret_mount_ref: "vault://kv/sec_sandbox_runtime",
    metadata_mount_ref: "vault://metadata/sec_sandbox_runtime",
    wrapping_key_family_ref: "key.wrap.runtime-config",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_sandbox_web_authority",
    environment_refs: ["env_shared_sandbox_integration"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Sandbox web-authority boundary",
    secret_mount_ref: "vault://kv/sec_sandbox_web_authority",
    metadata_mount_ref: "vault://metadata/sec_sandbox_web_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_sandbox_desktop_authority",
    environment_refs: ["env_shared_sandbox_integration"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Sandbox desktop-authority boundary",
    secret_mount_ref: "vault://kv/sec_sandbox_desktop_authority",
    metadata_mount_ref: "vault://metadata/sec_sandbox_desktop_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_sandbox_batch_authority",
    environment_refs: ["env_shared_sandbox_integration"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Sandbox batch-authority boundary",
    secret_mount_ref: "vault://kv/sec_sandbox_batch_authority",
    metadata_mount_ref: "vault://metadata/sec_sandbox_batch_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "KMS_ONLY_ACCEPTABLE",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_preprod_runtime",
    environment_refs: ["env_preproduction_verification"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Preproduction runtime boundary",
    secret_mount_ref: "vault://kv/sec_preprod_runtime",
    metadata_mount_ref: "vault://metadata/sec_preprod_runtime",
    wrapping_key_family_ref: "key.wrap.runtime-config",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_preprod_web_authority",
    environment_refs: ["env_preproduction_verification"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Preproduction web-authority boundary",
    secret_mount_ref: "vault://kv/sec_preprod_web_authority",
    metadata_mount_ref: "vault://metadata/sec_preprod_web_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_preprod_desktop_authority",
    environment_refs: ["env_preproduction_verification"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Preproduction desktop-authority boundary",
    secret_mount_ref: "vault://kv/sec_preprod_desktop_authority",
    metadata_mount_ref: "vault://metadata/sec_preprod_desktop_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_preprod_batch_authority",
    environment_refs: ["env_preproduction_verification"],
    provider_environment_refs: ["sandbox"],
    partition_label: "Preproduction batch-authority boundary",
    secret_mount_ref: "vault://kv/sec_preprod_batch_authority",
    metadata_mount_ref: "vault://metadata/sec_preprod_batch_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_production_runtime",
    environment_refs: ["env_production"],
    provider_environment_refs: ["production"],
    partition_label: "Production runtime boundary",
    secret_mount_ref: "vault://kv/sec_production_runtime",
    metadata_mount_ref: "vault://metadata/sec_production_runtime",
    wrapping_key_family_ref: "key.wrap.runtime-config",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_production_web_authority",
    environment_refs: ["env_production"],
    provider_environment_refs: ["production"],
    partition_label: "Production web-authority boundary",
    secret_mount_ref: "vault://kv/sec_production_web_authority",
    metadata_mount_ref: "vault://metadata/sec_production_web_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_production_desktop_authority",
    environment_refs: ["env_production"],
    provider_environment_refs: ["production"],
    partition_label: "Production desktop-authority boundary",
    secret_mount_ref: "vault://kv/sec_production_desktop_authority",
    metadata_mount_ref: "vault://metadata/sec_production_desktop_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_production_batch_authority",
    environment_refs: ["env_production"],
    provider_environment_refs: ["production"],
    partition_label: "Production batch-authority boundary",
    secret_mount_ref: "vault://kv/sec_production_batch_authority",
    metadata_mount_ref: "vault://metadata/sec_production_batch_authority",
    wrapping_key_family_ref: "key.wrap.authority-credentials",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_drill_runtime",
    environment_refs: ["env_disaster_recovery_drill"],
    provider_environment_refs: [],
    partition_label: "Disaster-recovery runtime boundary",
    secret_mount_ref: "vault://kv/sec_drill_runtime",
    metadata_mount_ref: "vault://metadata/sec_drill_runtime",
    wrapping_key_family_ref: "key.wrap.runtime-config",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
  {
    namespace_ref: "sec_drill_restore_material",
    environment_refs: ["env_disaster_recovery_drill"],
    provider_environment_refs: [],
    partition_label: "Disaster-recovery restore-material boundary",
    secret_mount_ref: "vault://kv/sec_drill_restore_material",
    metadata_mount_ref: "vault://metadata/sec_drill_restore_material",
    wrapping_key_family_ref: "key.wrap.break-glass",
    hardware_root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
    adoption_disposition: "TOPOLOGY_DECLARED_PROVIDER_UNRESOLVED",
    emergency_revoke_posture:
      "REVOKE_ALIAS_IMMEDIATELY_PROVIDER_SOFT_DELETE_IS_NOT_ACTIVE_STATE",
  },
];

function runtimeStorePath(pathSuffix: string): string {
  return `vault://secret/{namespace}/${pathSuffix}`;
}

function runtimeMetadataPath(pathSuffix: string): string {
  return `vault://metadata/{namespace}/${pathSuffix}`;
}

export function createProviderStackOptions(): ProviderStackOption[] {
  return [
    {
      stack_id: "AWS_SECRETS_MANAGER_KMS_CLOUDHSM",
      provider_label: "AWS Secrets Manager + AWS KMS + optional CloudHSM",
      selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      secret_store_summary:
        "Secrets Manager stores values under KMS-backed envelope encryption and supports customer-managed KMS keys.",
      key_root_summary:
        "AWS KMS customer-managed symmetric keys can protect secret data keys and support rotation; CloudHSM remains a stricter option for exceptional requirements.",
      hsm_summary:
        "Dedicated CloudHSM is available but not required by the current corpus before a platform decision exists.",
      soft_delete_summary:
        "Secret deletion and recovery windows must be treated as provider recovery features, not as evidence that a revoked alias is still active.",
      docs_urls: [...externalDocRefs.aws],
      source_refs: algorithmSourceRefs,
      fit_notes: [
        "Strong fit if the later storage/eventing platform resolves to AWS.",
        "KMS and CloudHSM separation matches the required distinction between secret storage, key wrapping, and hardware roots.",
      ],
    },
    {
      stack_id: "GCP_SECRET_MANAGER_CLOUD_KMS_HSM",
      provider_label: "Google Secret Manager + Cloud KMS + Cloud HSM",
      selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      secret_store_summary:
        "Secret Manager supports CMEK and uses the primary Cloud KMS key version for new encrypted secret versions.",
      key_root_summary:
        "Cloud KMS provides customer-managed keys and can use HSM-backed protection levels when required.",
      hsm_summary:
        "Cloud HSM-backed keys satisfy the current phase without forcing a separate dedicated HSM decision now.",
      soft_delete_summary:
        "Rotation creates new primary key versions but does not retroactively rewrite every historical secret version, so lineage must stay explicit.",
      docs_urls: [...externalDocRefs.gcp],
      source_refs: algorithmSourceRefs,
      fit_notes: [
        "Strong fit if the future platform resolves to GCP.",
        "CMEK location matching must remain explicit for runtime and authority partitions.",
      ],
    },
    {
      stack_id: "AZURE_KEY_VAULT_MANAGED_HSM",
      provider_label: "Azure Key Vault + Managed HSM",
      selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
      secret_store_summary:
        "Key Vault supports secret storage with soft-delete defaults and separate key material handling.",
      key_root_summary:
        "Managed HSM provides a distinct hardware-backed boundary for keys while Key Vault keeps the secret namespace layer separate.",
      hsm_summary:
        "Managed HSM is a valid way to satisfy stronger hardware-root expectations without forcing that choice before Azure is selected.",
      soft_delete_summary:
        "Soft-delete and purge protection require an explicit revoke-vs-recovery posture so revoked versions never regain active use.",
      docs_urls: [...externalDocRefs.azure],
      source_refs: algorithmSourceRefs,
      fit_notes: [
        "Strong fit if the platform later resolves to Azure.",
        "Recovery windows and purge authorization need explicit break-glass governance.",
      ],
    },
    {
      stack_id: "HASHICORP_VAULT_AUTO_UNSEAL",
      provider_label: "HashiCorp Vault with cloud KMS/HSM auto-unseal",
      selection_state: "SELF_HOST_DECISION_REQUIRED",
      secret_store_summary:
        "Vault can provide a dedicated logical secret boundary with separate policies, leases, and audit devices.",
      key_root_summary:
        "Vault auto-unseal can delegate the root unseal boundary to a cloud KMS or HSM while preserving Vault policy isolation.",
      hsm_summary:
        "A self-hosted stack adds operational burden and is lawful only if later platform work explicitly chooses it.",
      soft_delete_summary:
        "Version retention and revocation posture stay under Taxat policy rather than a cloud secret-service default.",
      docs_urls: [...externalDocRefs.vault],
      source_refs: algorithmSourceRefs,
      fit_notes: [
        "This is the portable fallback if a dedicated multi-cloud secret boundary is later required.",
        "The current roadmap has not chosen the hosting/control plane needed to make this the default.",
      ],
    },
  ];
}

export function createSecretAliasCatalog() {
  const aliases: SecretAliasRow[] = [
    {
      alias_ref: "alias.runtime.postgresql.control-store.password",
      alias_name: "postgresql/control-store/password",
      secret_class: "RUNTIME_DATABASE_PASSWORD",
      owning_service: "control-plane-api",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: [
        "role.runtime_api",
        "role.runtime_worker",
        "role.break_glass_operator",
      ],
      namespace_refs: [...runtimeNamespaces],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath(
        "postgresql/control-store/password/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "postgresql/control-store/password/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.runtime-database-password",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Runtime write paths may read this secret; projections and support tools may not.",
      ],
    },
    {
      alias_ref: "alias.runtime.postgresql.audit-store.password",
      alias_name: "postgresql/audit-store/password",
      secret_class: "RUNTIME_DATABASE_PASSWORD",
      owning_service: "append-only-audit-store",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: [
        "role.runtime_api",
        "role.runtime_worker",
        "role.break_glass_operator",
      ],
      namespace_refs: [...runtimeNamespaces],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath(
        "postgresql/audit-store/password/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "postgresql/audit-store/password/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.runtime-database-password",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Audit retention law applies to metadata, not to plaintext password re-exposure.",
      ],
    },
    {
      alias_ref: "alias.runtime.cache.resume-token",
      alias_name: "cache/resume/auth-token",
      secret_class: "RUNTIME_CACHE_CREDENTIAL",
      owning_service: "resume-and-continuity-cache",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_api", "role.runtime_worker"],
      namespace_refs: [...runtimeNamespaces],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("cache/resume/auth-token/current"),
      metadata_ref_template: runtimeMetadataPath(
        "cache/resume/auth-token/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.runtime-cache-credential",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Cache credentials stay separate from database credentials to bound blast radius.",
      ],
    },
    {
      alias_ref: "alias.runtime.token-sealing.metadata",
      alias_name: "token-sealing/active-kek-metadata",
      secret_class: "TOKEN_SEALING_METADATA",
      owning_service: "session-and-token-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: [
        "role.runtime_api",
        "role.runtime_worker",
        "role.projection_service",
      ],
      namespace_refs: [...runtimeNamespaces, "sec_drill_restore_material"],
      value_mode: "METADATA_ONLY",
      store_ref_template: runtimeMetadataPath(
        "token-sealing/active-kek-metadata/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "token-sealing/active-kek-metadata/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.token-sealing-metadata",
      lineage_posture: "METADATA_VERSION_ONLY",
      notes: [
        "Carries key identity and rotation lineage only; no raw data key material belongs in repo-tracked artifacts.",
      ],
    },
    {
      alias_ref: "alias.authority.hmrc.web.client-secret",
      alias_name: "hmrc/client-secret/web-app-via-server",
      secret_class: "AUTHORITY_CLIENT_SECRET",
      owning_service: "authority-gateway",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker", "role.break_glass_operator"],
      namespace_refs: [...authorityWebNamespaces],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath(
        "hmrc/client-secret/web-app-via-server/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "hmrc/client-secret/web-app-via-server/current",
      ),
      key_family_ref: "key.wrap.authority-credentials",
      rotation_policy_ref: "rotation.authority-client-secret",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Plaintext may be seen only during provider reveal and immediate ingestion.",
      ],
    },
    {
      alias_ref: "alias.authority.hmrc.desktop.client-secret",
      alias_name: "hmrc/client-secret/desktop-app-via-server",
      secret_class: "AUTHORITY_CLIENT_SECRET",
      owning_service: "authority-gateway",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker", "role.break_glass_operator"],
      namespace_refs: [...authorityDesktopNamespaces],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath(
        "hmrc/client-secret/desktop-app-via-server/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "hmrc/client-secret/desktop-app-via-server/current",
      ),
      key_family_ref: "key.wrap.authority-credentials",
      rotation_policy_ref: "rotation.authority-client-secret",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Native operator auth still terminates through the governed gateway boundary.",
      ],
    },
    {
      alias_ref: "alias.authority.hmrc.batch.client-secret",
      alias_name: "hmrc/client-secret/application-restricted",
      secret_class: "AUTHORITY_CLIENT_SECRET",
      owning_service: "authority-gateway",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker", "role.break_glass_operator"],
      namespace_refs: [...authorityBatchNamespaces],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath(
        "hmrc/client-secret/application-restricted/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "hmrc/client-secret/application-restricted/current",
      ),
      key_family_ref: "key.wrap.authority-credentials",
      rotation_policy_ref: "rotation.authority-client-secret",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Application-restricted credentials remain separate from user-restricted app registrations.",
      ],
    },
    {
      alias_ref: "alias.identity.idp.browser.client-secret",
      alias_name: "idp/browser-client-secret",
      secret_class: "IDP_CLIENT_SECRET",
      owning_service: "identity-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_api", "role.runtime_worker"],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("idp/browser-client-secret/current"),
      metadata_ref_template: runtimeMetadataPath(
        "idp/browser-client-secret/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.idp-client-secret",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Browser client secrets are runtime-held only for confidential web clients; public native clients remain metadata-only.",
      ],
    },
    {
      alias_ref: "alias.identity.idp.machine.client-secret",
      alias_name: "idp/machine-client-secret",
      secret_class: "IDP_CLIENT_SECRET",
      owning_service: "identity-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker"],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("idp/machine-client-secret/current"),
      metadata_ref_template: runtimeMetadataPath(
        "idp/machine-client-secret/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.idp-client-secret",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Machine client secrets must never be copied into projection or support surfaces.",
      ],
    },
    {
      alias_ref: "alias.notifications.email.server-token",
      alias_name: "email/server-token",
      secret_class: "EMAIL_DELIVERY_TOKEN",
      owning_service: "notification-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker", "role.support_adapter"],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        ...runtimeNamespaces.slice(0, 3),
      ],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("email/server-token/current"),
      metadata_ref_template: runtimeMetadataPath("email/server-token/current"),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.email-delivery-token",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Local provisioning keeps only the bootstrap capture alias; shared runtime holds the active server token.",
      ],
    },
    {
      alias_ref: "alias.notifications.email.webhook-signing-secret",
      alias_name: "email/webhooks/header-secret",
      secret_class: "PROVIDER_WEBHOOK_SIGNING_SECRET",
      owning_service: "notification-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_api", "role.runtime_worker"],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("email/webhooks/header-secret/current"),
      metadata_ref_template: runtimeMetadataPath(
        "email/webhooks/header-secret/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.provider-webhook-signing-secret",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Transport evidence may reference this alias, but delivery callbacks never become workflow truth.",
      ],
    },
    {
      alias_ref: "alias.monitoring.sentry.org-automation-token",
      alias_name: "monitoring/sentry/org-automation-token",
      secret_class: "MONITORING_TOKEN",
      owning_service: "observability-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.observability_agent", "role.runtime_worker"],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        ...runtimeNamespaces.slice(0, 3),
      ],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath(
        "monitoring/sentry/org-automation-token/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "monitoring/sentry/org-automation-token/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.monitoring-token",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Automation tokens remain distinct from DSN references and never cross into audit truth.",
      ],
    },
    {
      alias_ref: "alias.monitoring.sentry.ingest-dsn",
      alias_name: "monitoring/sentry/ingest-dsn",
      secret_class: "MONITORING_DSN",
      owning_service: "observability-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: [
        "role.runtime_api",
        "role.runtime_worker",
        "role.projection_service",
        "role.observability_agent",
      ],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        ...runtimeNamespaces.slice(0, 3),
      ],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("monitoring/sentry/ingest-dsn/current"),
      metadata_ref_template: runtimeMetadataPath(
        "monitoring/sentry/ingest-dsn/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.monitoring-dsn",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "DSN rotation may be rare, but the alias remains governed and environment-partitioned.",
      ],
    },
    {
      alias_ref: "alias.push.native.key-bundle",
      alias_name: "push/native-provider-key-bundle",
      secret_class: "PUSH_PROVIDER_KEY",
      owning_service: "notification-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker"],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath("push/native-provider-key-bundle/current"),
      metadata_ref_template: runtimeMetadataPath(
        "push/native-provider-key-bundle/current",
      ),
      key_family_ref: "key.wrap.provider-ingest",
      rotation_policy_ref: "rotation.push-provider-key",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "APNs and FCM material stays inside the same governed boundary but remains logically distinct from email and monitoring secrets.",
      ],
    },
    {
      alias_ref: "alias.support.adapter.shared-secret",
      alias_name: "support/adapter/shared-secret",
      secret_class: "SUPPORT_ADAPTER_SECRET",
      owning_service: "support-adapter",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.support_adapter", "role.runtime_api"],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("support/adapter/shared-secret/current"),
      metadata_ref_template: runtimeMetadataPath(
        "support/adapter/shared-secret/current",
      ),
      key_family_ref: "key.wrap.runtime-config",
      rotation_policy_ref: "rotation.support-adapter-secret",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "The repository currently freezes this as future-safe adapter posture, not a selected external helpdesk runtime.",
      ],
    },
    {
      alias_ref: "alias.provider.document-extraction.api-key",
      alias_name: "evidence/document-extraction/provider-api-key",
      secret_class: "DOCUMENT_EXTRACTION_PROVIDER_SECRET",
      owning_service: "evidence-ingest-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker"],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        "sec_sandbox_runtime",
        "sec_preprod_runtime",
        "sec_production_runtime",
      ],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath(
        "evidence/document-extraction/provider-api-key/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "evidence/document-extraction/provider-api-key/current",
      ),
      key_family_ref: "key.wrap.provider-ingest",
      rotation_policy_ref: "rotation.document-extraction-provider-secret",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Provider remains unselected; this alias family is frozen to prevent ad hoc names later.",
      ],
    },
    {
      alias_ref: "alias.provider.malware-scanning.api-key",
      alias_name: "uploads/malware-scanning/provider-api-key",
      secret_class: "MALWARE_SCANNING_PROVIDER_SECRET",
      owning_service: "upload-safety-boundary",
      rotation_owner_role: "role.security_rotation",
      consumer_role_refs: ["role.runtime_worker"],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        "sec_sandbox_runtime",
        "sec_preprod_runtime",
        "sec_production_runtime",
      ],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath(
        "uploads/malware-scanning/provider-api-key/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "uploads/malware-scanning/provider-api-key/current",
      ),
      key_family_ref: "key.wrap.provider-ingest",
      rotation_policy_ref: "rotation.malware-scanning-provider-secret",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Provider remains unselected; this alias family is frozen to prevent namespace drift later.",
      ],
    },
    {
      alias_ref: "alias.bootstrap.operator-token",
      alias_name: "bootstrap/operator-token",
      secret_class: "BOOTSTRAP_OPERATOR_TOKEN",
      owning_service: "bootstrap-and-rotation-control",
      rotation_owner_role: "role.bootstrap_operator",
      consumer_role_refs: ["role.bootstrap_operator"],
      namespace_refs: ["sec_local_authoring", "sec_local_provisioning_sandbox"],
      value_mode: "VALUE_BEARING",
      store_ref_template: runtimeStorePath("bootstrap/operator-token/current"),
      metadata_ref_template: runtimeMetadataPath(
        "bootstrap/operator-token/current",
      ),
      key_family_ref: "key.wrap.bootstrap-and-tooling",
      rotation_policy_ref: "rotation.bootstrap-operator-token",
      lineage_posture: "APPEND_ONLY_SECRET_VERSION",
      notes: [
        "Bootstrap credentials remain short-lived and never enter CI or shared runtime namespaces.",
      ],
    },
    {
      alias_ref: "alias.break-glass.recovery.material",
      alias_name: "break-glass/recovery-material",
      secret_class: "BREAK_GLASS_RECOVERY_MATERIAL",
      owning_service: "platform-security",
      rotation_owner_role: "role.break_glass_operator",
      consumer_role_refs: ["role.break_glass_operator"],
      namespace_refs: ["sec_production_runtime", "sec_drill_restore_material"],
      value_mode: "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      store_ref_template: runtimeStorePath("break-glass/recovery-material/current"),
      metadata_ref_template: runtimeMetadataPath(
        "break-glass/recovery-material/current",
      ),
      key_family_ref: "key.wrap.break-glass",
      rotation_policy_ref: "rotation.break-glass-recovery-material",
      lineage_posture: "ONE_TIME_CAPTURE_THEN_REFERENCE_ONLY",
      notes: [
        "Break-glass remains dual-control, auditable, and absent from day-to-day runtime grants.",
      ],
    },
    {
      alias_ref: "alias.provisioning.redaction-dictionary",
      alias_name: "provisioning/redaction-dictionary",
      secret_class: "PROVISIONING_REDACTION_DICTIONARY",
      owning_service: "bootstrap-and-rotation-control",
      rotation_owner_role: "role.bootstrap_operator",
      consumer_role_refs: [
        "role.bootstrap_operator",
        "role.audit_reader",
      ],
      namespace_refs: ["sec_local_authoring", "sec_local_provisioning_sandbox"],
      value_mode: "METADATA_ONLY",
      store_ref_template: runtimeMetadataPath(
        "provisioning/redaction-dictionary/current",
      ),
      metadata_ref_template: runtimeMetadataPath(
        "provisioning/redaction-dictionary/current",
      ),
      key_family_ref: "key.wrap.bootstrap-and-tooling",
      rotation_policy_ref: "rotation.provisioning-redaction-dictionary",
      lineage_posture: "METADATA_VERSION_ONLY",
      notes: [
        "This is governed metadata rather than a bearer secret, but it still belongs in the same auditable boundary.",
      ],
    },
  ];

  return {
    schema_version: "1.0" as const,
    catalog_id: "secret_alias_catalog" as const,
    selection_status: "PROVIDER_SELECTION_REQUIRED" as const,
    summary: {
      alias_count: aliases.length,
      namespace_partition_count: new Set(
        aliases.flatMap((row) => row.namespace_refs),
      ).size,
      value_bearing_alias_count: aliases.filter(
        (row) => row.value_mode === "VALUE_BEARING",
      ).length,
      one_time_capture_alias_count: aliases.filter(
        (row) => row.value_mode === "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE",
      ).length,
    },
    aliases,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "PROVIDER_STACK_UNRESOLVED_SO_ALIASS_AND_NAMESPACES_ARE_FROZEN_WITHOUT_LIVE_RESOURCE_IDS",
      "PC_0038_PREDECLARED_VAULT_BINDINGS_PRECEDE_THIS_ROOT_BOOTSTRAP_AND_REMAIN_ORDERED_EXPLICITLY",
    ],
    notes: [
      "Alias families are canonical even where provider stacks remain unresolved.",
      "Every multi-environment alias keeps the namespace placeholder in its path template so sandbox and production never share a concrete store path.",
    ],
  };
}

export function createKeyHierarchyAndEnvelopePolicy() {
  const root_families: RootKeyFamily[] = [
    {
      key_family_ref: "key.root.provider-managed-default",
      family_label: "Provider-managed default secret-store key",
      family_kind: "PROVIDER_MANAGED_DEFAULT",
      protection_posture:
        "Allowed only for local, CI, and temporary bootstrap scenarios when customer-managed roots are not yet adopted.",
      lifecycle_posture: "Never the steady-state production-like default.",
      namespace_refs: [
        "sec_local_authoring",
        "sec_ci_ephemeral",
        "sec_ephemeral_review",
      ],
      source_refs: algorithmSourceRefs,
      notes: [
        "This row exists to make explicit that provider-managed defaults are not equivalent to the desired long-lived posture.",
      ],
    },
    {
      key_family_ref: "key.root.customer-managed-kms",
      family_label: "Customer-managed secret-store KEK",
      family_kind: "CUSTOMER_MANAGED_KMS",
      protection_posture:
        "Primary phase-01 root for sandbox, preprod, production, and drill partitions.",
      lifecycle_posture:
        "Rotate under provider KMS cadence with append-only lineage and explicit cutover attestation.",
      namespace_refs: namespaceRoots
        .filter((row) => row.namespace_ref !== "sec_ci_ephemeral")
        .map((row) => row.namespace_ref),
      source_refs: algorithmSourceRefs,
      notes: [
        "This is the phase-01 default recommendation until a later compliance or platform decision requires a stricter dedicated HSM posture.",
      ],
    },
    {
      key_family_ref: "key.root.hsm-capable-root",
      family_label: "Optional HSM-capable wrapping root",
      family_kind: "OPTIONAL_HSM_CAPABLE_ROOT",
      protection_posture:
        "Reserved for production-like, authority, and break-glass partitions where later compliance work may require hardware-backed wrapping.",
      lifecycle_posture:
        "Enabled by provider/platform choice, not by default before that choice exists.",
      namespace_refs: namespaceRoots
        .filter(
          (row) => row.hardware_root_requirement === "OPTIONAL_HSM_CAPABLE_ROOT",
        )
        .map((row) => row.namespace_ref),
      source_refs: algorithmSourceRefs,
      notes: [
        "This preserves the distinction between 'KMS-capable root is enough now' and 'dedicated HSM is mandated later'.",
      ],
    },
    {
      key_family_ref: "key.wrap.runtime-config",
      family_label: "Runtime configuration wrapping key",
      family_kind: "WRAPPING_KEY",
      protection_posture:
        "Wraps service secrets for runtime stores, monitoring tokens, and operational callbacks.",
      lifecycle_posture: "Versioned, overlapping cutover window allowed.",
      namespace_refs: [...runtimeNamespaces.slice(0, 3), "sec_drill_runtime"],
      source_refs: algorithmSourceRefs,
      notes: [
        "Read and decrypt rights must remain separate from policy and audit rights.",
      ],
    },
    {
      key_family_ref: "key.wrap.authority-credentials",
      family_label: "Authority credential wrapping key",
      family_kind: "WRAPPING_KEY",
      protection_posture:
        "Exclusive to HMRC and similar authority credentials, isolated from ordinary runtime configuration.",
      lifecycle_posture: "One-time capture followed by append-only secret-version lineage.",
      namespace_refs: [
        ...authorityWebNamespaces,
        ...authorityDesktopNamespaces,
        ...authorityBatchNamespaces,
      ],
      source_refs: algorithmSourceRefs,
      notes: [
        "Authority credentials must not share wrapping families with general runtime service passwords.",
      ],
    },
    {
      key_family_ref: "key.wrap.provider-ingest",
      family_label: "Provider one-time-ingest wrapping key",
      family_kind: "WRAPPING_KEY",
      protection_posture:
        "Protects secrets that are revealed once by providers and then stored only as governed refs and versions.",
      lifecycle_posture: "Capture once, attest immediately, suppress plaintext thereafter.",
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        "sec_sandbox_runtime",
        "sec_preprod_runtime",
        "sec_production_runtime",
      ],
      source_refs: algorithmSourceRefs,
      notes: [
        "Used for push provider keys and the later OCR/malware provider choices if selected.",
      ],
    },
    {
      key_family_ref: "key.wrap.bootstrap-and-tooling",
      family_label: "Bootstrap and tooling wrapping key",
      family_kind: "WRAPPING_KEY",
      protection_posture:
        "Contains local/bootstrap-only material and governed redaction metadata.",
      lifecycle_posture: "Short-lived tokens, metadata-only refs, and explicit purge after bootstrap windows.",
      namespace_refs: [
        "sec_local_authoring",
        "sec_local_provisioning_sandbox",
        "sec_ci_ephemeral",
        "sec_ephemeral_review",
      ],
      source_refs: algorithmSourceRefs,
      notes: [
        "This is never promotable into runtime or authority namespaces.",
      ],
    },
    {
      key_family_ref: "key.wrap.break-glass",
      family_label: "Break-glass and restore-material wrapping key",
      family_kind: "WRAPPING_KEY",
      protection_posture:
        "Reserved for dual-control recovery bundles and restore-material references.",
      lifecycle_posture: "Annual drill and immediate post-use revoke posture.",
      namespace_refs: ["sec_drill_restore_material", "sec_production_runtime"],
      source_refs: algorithmSourceRefs,
      notes: [
        "All access must be explicit, auditable, and dual-control gated.",
      ],
    },
  ];

  const aliasCatalog = createSecretAliasCatalog();
  const envelope_rows: EnvelopePolicyRow[] = aliasCatalog.aliases.map((alias) => ({
    envelope_ref: `envelope.${alias.alias_ref.replace(/^alias\./, "")}`,
    alias_ref: alias.alias_ref,
    root_key_family_ref:
      alias.key_family_ref === "key.wrap.authority-credentials" ||
      alias.key_family_ref === "key.wrap.break-glass"
        ? "key.root.hsm-capable-root"
        : "key.root.customer-managed-kms",
    data_key_policy:
      alias.value_mode === "METADATA_ONLY"
        ? "WRAP_ONLY_METADATA_LINEAGE"
        : alias.value_mode === "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE"
          ? "NO_DATA_KEY_ONE_TIME_PROVIDER_CAPTURE"
          : "SERVICE_ISSUED_PER_VERSION",
    import_or_export_restriction:
      alias.value_mode === "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE"
        ? "EXPORT_FORBIDDEN_IMPORT_BY_APPROVAL_ONLY"
        : "EXPORT_FORBIDDEN",
    hsm_requirement:
      alias.key_family_ref === "key.wrap.authority-credentials" ||
      alias.key_family_ref === "key.wrap.break-glass"
        ? "HSM_CAPABLE_ROOT_FOR_PRODUCTION_AND_BREAK_GLASS"
        : "NOT_REQUIRED_THIS_PHASE",
    notes: alias.notes,
  }));

  return {
    schema_version: "1.0" as const,
    policy_id: "key_hierarchy_and_envelope_policy" as const,
    selection_status: "PROVIDER_SELECTION_REQUIRED" as const,
    phase_hsm_requirement:
      "CLOUD_KMS_OR_MANAGED_HSM_CAPABLE_ROOT_SATISFIES_PHASE_01" as const,
    root_families,
    envelope_rows,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "NO_PLATFORM_PROVIDER_SELECTED_SO_REAL_KEY_ARNS_OR_RESOURCE_IDS_ARE_NOT_FROZEN_YET",
    ],
    notes: [
      "KMS/HSM-backed roots inside the eventual provider stack satisfy phase 01.",
      "A dedicated single-tenant HSM fleet is deferred until later compliance or provider work explicitly demands it.",
    ],
  };
}

export function createAccessPolicyMatrix() {
  const roles: AccessRoleRow[] = [
    {
      role_ref: "role.bootstrap_operator",
      label: "Bootstrap operator",
      actor_class: "BOOTSTRAP_OPERATOR",
      notes: [
        "Seeds or adopts the boundary, but must not rely on general-purpose read-back of stored secrets.",
      ],
    },
    {
      role_ref: "role.ci_deploy",
      label: "CI deploy role",
      actor_class: "CI_DEPLOY_ROLE",
      notes: ["May inspect metadata and attest config identity only."],
    },
    {
      role_ref: "role.runtime_api",
      label: "Runtime API",
      actor_class: "RUNTIME_API",
      notes: [
        "May consume runtime config and callback verification secrets required for interactive request handling.",
      ],
    },
    {
      role_ref: "role.runtime_worker",
      label: "Runtime worker",
      actor_class: "WORKER",
      notes: [
        "Handles authority exchange, provider callbacks, notifications, and upload pipeline tasks.",
      ],
    },
    {
      role_ref: "role.projection_service",
      label: "Projection service",
      actor_class: "PROJECTION_SERVICE",
      notes: [
        "Projection builders do not need plaintext secrets and remain metadata-only.",
      ],
    },
    {
      role_ref: "role.support_adapter",
      label: "Support adapter",
      actor_class: "SUPPORT_TOOLS",
      notes: [
        "May consume only the future-safe adapter secret and metadata required for webhook validation.",
      ],
    },
    {
      role_ref: "role.observability_agent",
      label: "Observability agent",
      actor_class: "OBSERVABILITY",
      notes: [
        "May consume monitoring-specific tokens or DSNs but not broader runtime or authority credentials.",
      ],
    },
    {
      role_ref: "role.security_rotation",
      label: "Security rotation automation",
      actor_class: "SECURITY_ROTATION",
      notes: [
        "Can write, rotate, disable, and attest versions but should not serve as a general read client.",
      ],
    },
    {
      role_ref: "role.audit_reader",
      label: "Audit reader",
      actor_class: "AUDIT_READER",
      notes: [
        "Read-model and audit tooling remains metadata-only.",
      ],
    },
    {
      role_ref: "role.break_glass_operator",
      label: "Break-glass operator",
      actor_class: "BREAK_GLASS_ROLE",
      notes: [
        "Dual-control, production-bound, and explicitly auditable.",
      ],
    },
  ];

  const grants: AccessGrantRow[] = [
    {
      grant_ref: "grant.bootstrap.local-seed-and-policy",
      role_ref: "role.bootstrap_operator",
      alias_refs: [
        "alias.bootstrap.operator-token",
        "alias.provisioning.redaction-dictionary",
        "alias.provider.document-extraction.api-key",
        "alias.provider.malware-scanning.api-key",
      ],
      namespace_refs: ["sec_local_authoring", "sec_local_provisioning_sandbox"],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "ALLOW",
        read_secret: "DENY",
        decrypt_unwrap: "DENY",
        rotate_version: "ALLOW",
        disable_or_revoke: "DENY",
        manage_policy: "ALLOW",
        attest_audit: "ALLOW",
      },
      notes: [
        "Bootstrap creates placeholders and policies but does not serve as a routine secret reader.",
      ],
    },
    {
      grant_ref: "grant.ci.metadata-only",
      role_ref: "role.ci_deploy",
      alias_refs: createSecretAliasCatalog().aliases.map((row) => row.alias_ref),
      namespace_refs: namespaceRoots.map((row) => row.namespace_ref),
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "DENY",
        decrypt_unwrap: "DENY",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "CI may prove deterministic config identity but must never receive raw or decryptable secrets.",
      ],
    },
    {
      grant_ref: "grant.runtime.api.runtime-config",
      role_ref: "role.runtime_api",
      alias_refs: [
        "alias.runtime.postgresql.control-store.password",
        "alias.runtime.postgresql.audit-store.password",
        "alias.runtime.cache.resume-token",
        "alias.runtime.token-sealing.metadata",
        "alias.identity.idp.browser.client-secret",
        "alias.notifications.email.webhook-signing-secret",
        "alias.support.adapter.shared-secret",
        "alias.monitoring.sentry.ingest-dsn",
      ],
      namespace_refs: [...runtimeNamespaces.slice(0, 3), "sec_drill_runtime"],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "ALLOW",
        decrypt_unwrap: "ALLOW",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Interactive runtime may consume only runtime-bound config and callback verification secrets.",
      ],
    },
    {
      grant_ref: "grant.runtime.worker.authority-and-provider",
      role_ref: "role.runtime_worker",
      alias_refs: [
        "alias.runtime.postgresql.control-store.password",
        "alias.runtime.postgresql.audit-store.password",
        "alias.runtime.cache.resume-token",
        "alias.authority.hmrc.web.client-secret",
        "alias.authority.hmrc.desktop.client-secret",
        "alias.authority.hmrc.batch.client-secret",
        "alias.identity.idp.machine.client-secret",
        "alias.notifications.email.server-token",
        "alias.notifications.email.webhook-signing-secret",
        "alias.monitoring.sentry.org-automation-token",
        "alias.monitoring.sentry.ingest-dsn",
        "alias.push.native.key-bundle",
        "alias.provider.document-extraction.api-key",
        "alias.provider.malware-scanning.api-key",
      ],
      namespace_refs: [
        ...runtimeNamespaces.slice(0, 3),
        ...authorityWebNamespaces,
        ...authorityDesktopNamespaces,
        ...authorityBatchNamespaces,
      ],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "ALLOW",
        decrypt_unwrap: "ALLOW",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Workers are the only routine non-break-glass path allowed to consume authority and provider secrets.",
      ],
    },
    {
      grant_ref: "grant.projection.metadata-only",
      role_ref: "role.projection_service",
      alias_refs: [
        "alias.runtime.token-sealing.metadata",
        "alias.monitoring.sentry.ingest-dsn",
      ],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "DENY",
        decrypt_unwrap: "DENY",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Projection flows are explicitly denied secret reads even where they can inspect non-sensitive metadata.",
      ],
    },
    {
      grant_ref: "grant.support.adapter-limited",
      role_ref: "role.support_adapter",
      alias_refs: [
        "alias.support.adapter.shared-secret",
        "alias.notifications.email.webhook-signing-secret",
      ],
      namespace_refs: [...runtimeNamespaces.slice(0, 3)],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "ALLOW",
        decrypt_unwrap: "ALLOW",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Support tooling is limited to the explicit adapter and callback boundary.",
      ],
    },
    {
      grant_ref: "grant.observability.monitoring-only",
      role_ref: "role.observability_agent",
      alias_refs: [
        "alias.monitoring.sentry.org-automation-token",
        "alias.monitoring.sentry.ingest-dsn",
      ],
      namespace_refs: [
        "sec_local_provisioning_sandbox",
        ...runtimeNamespaces.slice(0, 3),
      ],
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "ALLOW",
        decrypt_unwrap: "ALLOW",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Observability remains fenced to observability-specific secrets.",
      ],
    },
    {
      grant_ref: "grant.security.rotation-no-routine-read",
      role_ref: "role.security_rotation",
      alias_refs: createSecretAliasCatalog().aliases
        .filter((row) => row.secret_class !== "PROVISIONING_REDACTION_DICTIONARY")
        .map((row) => row.alias_ref),
      namespace_refs: namespaceRoots.map((row) => row.namespace_ref),
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "ALLOW",
        read_secret: "DENY",
        decrypt_unwrap: "DENY",
        rotate_version: "ALLOW",
        disable_or_revoke: "ALLOW",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Rotation automation acts through versioned write and revoke operations instead of standing read access.",
      ],
    },
    {
      grant_ref: "grant.audit.reader-metadata-only",
      role_ref: "role.audit_reader",
      alias_refs: createSecretAliasCatalog().aliases.map((row) => row.alias_ref),
      namespace_refs: namespaceRoots.map((row) => row.namespace_ref),
      dual_control_required: false,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "DENY",
        decrypt_unwrap: "DENY",
        rotate_version: "DENY",
        disable_or_revoke: "DENY",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Audit readers may inspect refs, lineage, and receipts but not secret values.",
      ],
    },
    {
      grant_ref: "grant.break-glass.production-and-drill",
      role_ref: "role.break_glass_operator",
      alias_refs: [
        "alias.runtime.postgresql.control-store.password",
        "alias.runtime.postgresql.audit-store.password",
        "alias.runtime.cache.resume-token",
        "alias.authority.hmrc.web.client-secret",
        "alias.authority.hmrc.desktop.client-secret",
        "alias.authority.hmrc.batch.client-secret",
        "alias.break-glass.recovery.material",
      ],
      namespace_refs: [
        "sec_production_runtime",
        "sec_production_web_authority",
        "sec_production_desktop_authority",
        "sec_production_batch_authority",
        "sec_drill_restore_material",
      ],
      dual_control_required: true,
      capabilities: {
        list_metadata: "ALLOW",
        write_secret: "DENY",
        read_secret: "ALLOW",
        decrypt_unwrap: "ALLOW",
        rotate_version: "DENY",
        disable_or_revoke: "ALLOW",
        manage_policy: "DENY",
        attest_audit: "ALLOW",
      },
      notes: [
        "Break-glass is deliberately narrow, production-scoped, and dual-control bound.",
      ],
    },
  ];

  return {
    schema_version: "1.0" as const,
    policy_id: "access_policy_matrix" as const,
    selection_status: "PROVIDER_SELECTION_REQUIRED" as const,
    roles,
    grants,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "PROVIDER_SPECIFIC_IAM_OR_POLICY_DOCUMENT_IDS_DEFERRED_UNTIL_PROVIDER_SELECTION",
    ],
    notes: [
      "Read, decrypt, rotate, revoke, and policy management remain explicitly separate capabilities.",
      "No routine role receives both broad policy administration and general plaintext read access.",
    ],
  };
}

export function createRotationAndRevocationPolicy() {
  const rows: RotationPolicyRow[] = [
    {
      rotation_policy_ref: "rotation.runtime-database-password",
      secret_class: "RUNTIME_DATABASE_PASSWORD",
      cadence_days_or_null: 90,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: [
        "vault_write_receipt_ref",
        "cutover_verification_ref",
        "supersession_ref",
      ],
      notes: ["Short overlap only; runtime and worker verification must complete before old version retirement."],
    },
    {
      rotation_policy_ref: "rotation.runtime-cache-credential",
      secret_class: "RUNTIME_CACHE_CREDENTIAL",
      cadence_days_or_null: 90,
      max_active_versions: 2,
      overlap_window_hours: 8,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["vault_write_receipt_ref", "cutover_verification_ref"],
      notes: ["Cache credentials use a shorter overlap window than databases."],
    },
    {
      rotation_policy_ref: "rotation.token-sealing-metadata",
      secret_class: "TOKEN_SEALING_METADATA",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 72,
      capture_posture: "METADATA_ONLY",
      revoke_posture: "PURGE_NOT_REQUIRED_METADATA_ONLY",
      provider_soft_delete_conflict_posture:
        "METADATA_ONLY_NO_PROVIDER_DELETE_PATH",
      attestation_requirements: ["key_version_ref", "re-encryption_wave_ref"],
      notes: ["Metadata survives longer than active wrapping status for restore explainability."],
    },
    {
      rotation_policy_ref: "rotation.authority-client-secret",
      secret_class: "AUTHORITY_CLIENT_SECRET",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 336,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: [
        "provider_generation_receipt_ref",
        "vault_write_receipt_ref",
        "token_exchange_verification_ref",
      ],
      notes: ["Mirrors the stricter HMRC cutover posture already fixed in pc_0033 and pc_0038."],
    },
    {
      rotation_policy_ref: "rotation.idp-client-secret",
      secret_class: "IDP_CLIENT_SECRET",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 168,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["vault_write_receipt_ref", "tenant_client_verification_ref"],
      notes: ["Separate browser and machine clients but one uniform rotation doctrine."],
    },
    {
      rotation_policy_ref: "rotation.email-delivery-token",
      secret_class: "EMAIL_DELIVERY_TOKEN",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 168,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["provider_token_issue_ref", "delivery_probe_ref"],
      notes: ["Server-token rotation stays separate from email template and webhook metadata."],
    },
    {
      rotation_policy_ref: "rotation.provider-webhook-signing-secret",
      secret_class: "PROVIDER_WEBHOOK_SIGNING_SECRET",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["webhook_probe_ref", "signature_validation_ref"],
      notes: ["Short overlap because callback authenticity must remain unambiguous."],
    },
    {
      rotation_policy_ref: "rotation.monitoring-token",
      secret_class: "MONITORING_TOKEN",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["provider_token_issue_ref", "project_access_probe_ref"],
      notes: ["Observability tokens are governed but never become audit truth."],
    },
    {
      rotation_policy_ref: "rotation.monitoring-dsn",
      secret_class: "MONITORING_DSN",
      cadence_days_or_null: 365,
      max_active_versions: 2,
      overlap_window_hours: 168,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["release_health_probe_ref"],
      notes: ["Low-change but still environment-partitioned and versioned."],
    },
    {
      rotation_policy_ref: "rotation.push-provider-key",
      secret_class: "PUSH_PROVIDER_KEY",
      cadence_days_or_null: 365,
      max_active_versions: 2,
      overlap_window_hours: 336,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["provider_key_receipt_ref", "device_delivery_probe_ref"],
      notes: ["APNs and FCM material may require longer overlap for device rollout cutover."],
    },
    {
      rotation_policy_ref: "rotation.support-adapter-secret",
      secret_class: "SUPPORT_ADAPTER_SECRET",
      cadence_days_or_null: 180,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "REVOKE_AFTER_CUTOVER",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["adapter_signature_probe_ref"],
      notes: ["Future-safe adapter posture still gets a concrete rotation contract."],
    },
    {
      rotation_policy_ref: "rotation.document-extraction-provider-secret",
      secret_class: "DOCUMENT_EXTRACTION_PROVIDER_SECRET",
      cadence_days_or_null: null,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "DISABLE_NOW_RETAIN_AUDIT_LINEAGE",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["selection_record_ref", "provider_probe_ref"],
      notes: ["Provider remains unselected, so cadence is blocked pending that decision."],
    },
    {
      rotation_policy_ref: "rotation.malware-scanning-provider-secret",
      secret_class: "MALWARE_SCANNING_PROVIDER_SECRET",
      cadence_days_or_null: null,
      max_active_versions: 2,
      overlap_window_hours: 24,
      capture_posture: "ONE_TIME_PROVIDER_REVEAL",
      revoke_posture: "DISABLE_NOW_RETAIN_AUDIT_LINEAGE",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["selection_record_ref", "provider_probe_ref"],
      notes: ["Provider remains unselected, so cadence is blocked pending that decision."],
    },
    {
      rotation_policy_ref: "rotation.bootstrap-operator-token",
      secret_class: "BOOTSTRAP_OPERATOR_TOKEN",
      cadence_days_or_null: 1,
      max_active_versions: 1,
      overlap_window_hours: 0,
      capture_posture: "GENERATED_INSIDE_BOUNDARY",
      revoke_posture: "DISABLE_NOW_RETAIN_AUDIT_LINEAGE",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["bootstrap_run_ref", "revocation_receipt_ref"],
      notes: ["Short-lived and never promotable into CI or shared runtime."],
    },
    {
      rotation_policy_ref: "rotation.break-glass-recovery-material",
      secret_class: "BREAK_GLASS_RECOVERY_MATERIAL",
      cadence_days_or_null: 365,
      max_active_versions: 1,
      overlap_window_hours: 0,
      capture_posture: "BREAK_GLASS_DUAL_CONTROL",
      revoke_posture: "DISABLE_NOW_RETAIN_AUDIT_LINEAGE",
      provider_soft_delete_conflict_posture:
        "MARK_REVOKED_IMMEDIATELY_AND_ALLOW_PROVIDER_RECOVERY_WINDOW",
      attestation_requirements: ["dual_control_attestation_ref", "drill_completion_ref"],
      notes: ["Must be rotated after any actual use, not only on schedule."],
    },
    {
      rotation_policy_ref: "rotation.provisioning-redaction-dictionary",
      secret_class: "PROVISIONING_REDACTION_DICTIONARY",
      cadence_days_or_null: null,
      max_active_versions: 1,
      overlap_window_hours: 0,
      capture_posture: "METADATA_ONLY",
      revoke_posture: "PURGE_NOT_REQUIRED_METADATA_ONLY",
      provider_soft_delete_conflict_posture:
        "METADATA_ONLY_NO_PROVIDER_DELETE_PATH",
      attestation_requirements: ["rulepack_version_ref"],
      notes: ["Metadata-only lineage, not a bearer secret rotation path."],
    },
  ];

  return {
    schema_version: "1.0" as const,
    policy_id: "rotation_and_revocation_policy" as const,
    selection_status: "PROVIDER_SELECTION_REQUIRED" as const,
    summary: {
      policy_count: rows.length,
      scheduled_rotation_count: rows.filter(
        (row) => row.cadence_days_or_null !== null,
      ).length,
      one_time_capture_policy_count: rows.filter(
        (row) => row.capture_posture === "ONE_TIME_PROVIDER_REVEAL",
      ).length,
    },
    policies: rows,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "REAL_PROVIDER_RETENTION_OR_RECOVERY_SETTING_IDS_DEFERRED_UNTIL_PROVIDER_SELECTION",
    ],
    notes: [
      "Provider soft-delete or recovery does not restore an alias to active use once Taxat marks it revoked.",
      "Every superseded version remains auditable even after active use ends.",
    ],
  };
}

export function createSecretRootInventoryTemplate(
  runContext: MinimalRunContext = {
    runId: "run-template-secret-root-001",
    workspaceId: "wk-template-secret-root-topology",
    operatorIdentityAlias: "ops.security.template",
  },
): SecretRootInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "secret_root_inventory",
    provider_id: SECRET_ROOT_PROVIDER_ID,
    flow_id: SECRET_ROOT_FLOW_ID,
    policy_version: SECRET_ROOT_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: "PROVIDER_SELECTION_REQUIRED",
    selected_provider_stack_id_or_null: null,
    root_posture: "LOGICAL_TOPOLOGY_FROZEN_PROVIDER_UNRESOLVED",
    phase_hsm_requirement:
      "CLOUD_KMS_OR_MANAGED_HSM_CAPABLE_ROOT_SATISFIES_PHASE_01",
    provider_stack_options: createProviderStackOptions(),
    namespace_roots: namespaceRoots,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "DEPENDENCY_REGISTER_STILL_REPORTS_SECRET_STORE_AND_KMS_PROVIDER_CHOICE_AS_UNRESOLVED",
      "PC_0038_VAULT_BINDING_RECORDS_EXIST_BEFORE_THIS_ROOT_TOPOLOGY_AND_THAT_ORDERING_TENSION_REMAINS_EXPLICIT",
    ],
    notes: [
      "The logical store boundary is frozen now so later provider provisioning can adopt rather than rename.",
      "No real cloud account, project, or subscription IDs are committed until the platform stack is selected.",
    ],
    last_verified_at: SECRET_ROOT_LAST_VERIFIED_AT,
  };
}

export function createSecretRootTopologyLedgerViewModel(): SecretRootTopologyLedgerViewModel {
  const aliasCatalog = createSecretAliasCatalog();
  const keyPolicy = createKeyHierarchyAndEnvelopePolicy();
  const access = createAccessPolicyMatrix();
  return {
    providerDisplayName: "Secret root topology",
    providerMonogram: "KEY",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    rootPostureLabel: "Logical topology frozen, provider unresolved",
    policyVersion: SECRET_ROOT_POLICY_VERSION,
    summary:
      "One authoritative ledger for alias families, key hierarchy, environment partitions, and least-privilege grants. Provider selection remains blocked on the later platform choice, but names, namespaces, and permissions are now frozen.",
    notes: [
      "Sandbox, preprod, and production use the same alias families but never the same concrete namespace.",
      "Authority credentials remain under a distinct wrapping family from general runtime secrets.",
      "Break-glass access is explicit, production-scoped, and dual-control bound.",
    ],
    environments: [
      {
        environment_ref: "env_local_provisioning_workstation",
        label: "Local provisioning sandbox",
        namespace_refs: ["sec_local_provisioning_sandbox"],
        root_requirement: "KMS_ONLY_ACCEPTABLE",
      },
      {
        environment_ref: "env_shared_sandbox_integration",
        label: "Shared sandbox integration",
        namespace_refs: [
          "sec_sandbox_runtime",
          "sec_sandbox_web_authority",
          "sec_sandbox_desktop_authority",
          "sec_sandbox_batch_authority",
        ],
        root_requirement: "KMS_ONLY_ACCEPTABLE",
      },
      {
        environment_ref: "env_preproduction_verification",
        label: "Preproduction verification",
        namespace_refs: [
          "sec_preprod_runtime",
          "sec_preprod_web_authority",
          "sec_preprod_desktop_authority",
          "sec_preprod_batch_authority",
        ],
        root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
      },
      {
        environment_ref: "env_production",
        label: "Production",
        namespace_refs: [
          "sec_production_runtime",
          "sec_production_web_authority",
          "sec_production_desktop_authority",
          "sec_production_batch_authority",
        ],
        root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
      },
      {
        environment_ref: "env_disaster_recovery_drill",
        label: "Restore and break-glass drill",
        namespace_refs: ["sec_drill_runtime", "sec_drill_restore_material"],
        root_requirement: "OPTIONAL_HSM_CAPABLE_ROOT",
      },
    ],
    aliases: aliasCatalog.aliases.map((alias) => ({
      alias_ref: alias.alias_ref,
      label: alias.alias_name,
      secret_class: alias.secret_class,
      namespace_refs: alias.namespace_refs,
      store_ref_preview: alias.store_ref_template.replace(
        "{namespace}",
        alias.namespace_refs[0] ?? "namespace",
      ),
      metadata_ref_preview: alias.metadata_ref_template.replace(
        "{namespace}",
        alias.namespace_refs[0] ?? "namespace",
      ),
      value_mode: alias.value_mode,
      rotation_policy_ref: alias.rotation_policy_ref,
      key_family_ref: alias.key_family_ref,
      consumer_role_refs: alias.consumer_role_refs,
      lineage_posture: alias.lineage_posture,
      notes: alias.notes,
    })),
    keyNodes: keyPolicy.root_families.map((family) => ({
      node_ref: family.key_family_ref,
      label: family.family_label,
      node_kind: family.family_kind,
      parent_ref:
        family.family_kind === "WRAPPING_KEY"
          ? family.key_family_ref === "key.wrap.authority-credentials" ||
            family.key_family_ref === "key.wrap.break-glass"
            ? "key.root.hsm-capable-root"
            : "key.root.customer-managed-kms"
          : null,
      namespace_refs: family.namespace_refs,
      hardware_posture: family.protection_posture,
      rotation_mode: family.lifecycle_posture,
    })),
    accessRoles: access.roles,
    accessGrants: access.grants,
    selectedEnvironmentRef: "env_shared_sandbox_integration",
    selectedAliasRef: "alias.authority.hmrc.web.client-secret",
  };
}

export function validateSecretAliasCatalog(
  catalog = createSecretAliasCatalog(),
): void {
  const aliasRefs = new Set<string>();
  const aliasNames = new Set<string>();
  for (const alias of catalog.aliases) {
    if (aliasRefs.has(alias.alias_ref)) {
      throw new Error(`Duplicate alias ref detected: ${alias.alias_ref}`);
    }
    aliasRefs.add(alias.alias_ref);

    if (aliasNames.has(alias.alias_name)) {
      throw new Error(`Duplicate alias name detected: ${alias.alias_name}`);
    }
    aliasNames.add(alias.alias_name);

    if (alias.namespace_refs.length > 1 && !alias.store_ref_template.includes("{namespace}")) {
      throw new Error(
        `Alias ${alias.alias_ref} spans multiple namespaces but its store path is not environment-partitioned.`,
      );
    }
  }
}

export function validateAccessPolicyMatrix(
  matrix = createAccessPolicyMatrix(),
  catalog = createSecretAliasCatalog(),
): void {
  const validRoles = new Set(matrix.roles.map((row) => row.role_ref));
  const validAliases = new Set(catalog.aliases.map((row) => row.alias_ref));

  for (const grant of matrix.grants) {
    if (!validRoles.has(grant.role_ref)) {
      throw new Error(`Unknown role ref in grant ${grant.grant_ref}`);
    }
    for (const aliasRef of grant.alias_refs) {
      if (!validAliases.has(aliasRef)) {
        throw new Error(`Unknown alias ref ${aliasRef} in grant ${grant.grant_ref}`);
      }
    }
  }

  const ciGrant = matrix.grants.find((row) => row.role_ref === "role.ci_deploy");
  if (
    !ciGrant ||
    ciGrant.capabilities.read_secret !== "DENY" ||
    ciGrant.capabilities.decrypt_unwrap !== "DENY" ||
    ciGrant.capabilities.write_secret !== "DENY"
  ) {
    throw new Error("CI deploy grant violates least-privilege secret-read policy.");
  }

  const projectionGrant = matrix.grants.find(
    (row) => row.role_ref === "role.projection_service",
  );
  if (
    !projectionGrant ||
    projectionGrant.capabilities.read_secret !== "DENY" ||
    projectionGrant.capabilities.decrypt_unwrap !== "DENY"
  ) {
    throw new Error("Projection grant must remain metadata-only.");
  }

  const supportGrant = matrix.grants.find(
    (row) => row.role_ref === "role.support_adapter",
  );
  if (
    !supportGrant ||
    supportGrant.alias_refs.some((aliasRef) => aliasRef.includes("authority.hmrc"))
  ) {
    throw new Error("Support adapter grant must not include authority client secrets.");
  }

  const breakGlassGrant = matrix.grants.find(
    (row) => row.role_ref === "role.break_glass_operator",
  );
  if (!breakGlassGrant?.dual_control_required) {
    throw new Error("Break-glass grant must require dual control.");
  }
}

export async function provisionSecretsManagerKmsOrHsmRoots(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  providerStackSelection?: ProviderStackId | null;
}): Promise<ProvisionSecretsManagerKmsOrHsmRootsResult> {
  const selection_status: SecretRootSelectionStatus = options.providerStackSelection
    ? "PROVIDER_STACK_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";

  const aliasCatalog = createSecretAliasCatalog();
  const keyHierarchyAndEnvelopePolicy = createKeyHierarchyAndEnvelopePolicy();
  const accessPolicyMatrix = createAccessPolicyMatrix();
  const rotationAndRevocationPolicy = createRotationAndRevocationPolicy();
  validateSecretAliasCatalog(aliasCatalog);
  validateAccessPolicyMatrix(accessPolicyMatrix, aliasCatalog);

  const inventory = createSecretRootInventoryTemplate(options.runContext);
  inventory.selection_status = selection_status;
  inventory.selected_provider_stack_id_or_null = options.providerStackSelection ?? null;

  const steps: ProvisionSecretRootsStep[] = [
    {
      step_id: "secret-root.reconcile-provider-selection",
      title: "Reconcile provider stack selection",
      status: options.providerStackSelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.providerStackSelection
        ? `Provider stack ${options.providerStackSelection} was supplied explicitly.`
        : "Dependency register still marks secret-manager and KMS/HSM provider choice unresolved, so this flow fails closed into a declared topology only.",
    },
    {
      step_id: "secret-root.freeze-namespace-topology",
      title: "Freeze namespace topology",
      status: "SUCCEEDED",
      reason: "Canonical namespace, mount, and wrapping-key families were materialized without exposing raw secret values.",
    },
    {
      step_id: "secret-root.freeze-alias-catalog",
      title: "Freeze alias catalog",
      status: "SUCCEEDED",
      reason: `Canonical alias families fixed across ${aliasCatalog.summary.namespace_partition_count} namespace partitions.`,
    },
    {
      step_id: "secret-root.freeze-access-policy",
      title: "Freeze least-privilege access policy",
      status: "SUCCEEDED",
      reason: `Least-privilege role and grant matrix fixed across ${accessPolicyMatrix.grants.length} grants.`,
    },
    {
      step_id: "secret-root.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason: "Sanitized inventory persisted with no raw secret material, only refs, aliases, and posture metadata.",
    },
  ];

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  return {
    outcome: options.providerStackSelection
      ? "SECRET_ROOT_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "SECRET_ROOT_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status,
    inventory,
    aliasCatalog,
    keyHierarchyAndEnvelopePolicy,
    accessPolicyMatrix,
    rotationAndRevocationPolicy,
    ledgerViewModel: createSecretRootTopologyLedgerViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only rewrites sanitized inventory.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const aliasCatalog = createSecretAliasCatalog();
  const keyHierarchy = createKeyHierarchyAndEnvelopePolicy();
  const accessMatrix = createAccessPolicyMatrix();
  const rotationPolicy = createRotationAndRevocationPolicy();
  const inventory = createSecretRootInventoryTemplate();
  const viewerModel = createSecretRootTopologyLedgerViewModel();

  const writes: Array<[string, unknown]> = [
    ["config/secrets/secret_alias_catalog.json", aliasCatalog],
    ["config/secrets/key_hierarchy_and_envelope_policy.json", keyHierarchy],
    ["config/secrets/access_policy_matrix.json", accessMatrix],
    ["config/secrets/rotation_and_revocation_policy.json", rotationPolicy],
    ["data/provisioning/secret_root_inventory.template.json", inventory],
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
  sampleRun.secretRootTopologyLedger = viewerModel;
  await writeFile(sampleRunPath, `${JSON.stringify(sampleRun, null, 2)}\n`, "utf8");
}

async function main() {
  const invokedPath = process.argv[1]
    ? path.resolve(process.argv[1])
    : null;
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
