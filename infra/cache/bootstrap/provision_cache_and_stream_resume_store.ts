import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CACHE_PROVIDER_ID = "cache-and-stream-resume-store";
export const CACHE_FLOW_ID = "provision-cache-and-stream-resume-store";
export const CACHE_POLICY_VERSION = "1.0";
export const CACHE_LAST_VERIFIED_AT = "2026-04-18T20:40:00Z";

export type CacheProviderFamily =
  | "AWS_ELASTICACHE_SERVERLESS_VALKEY"
  | "GCP_MEMORYSTORE_REDIS_CLUSTER"
  | "AZURE_MANAGED_REDIS"
  | "SELF_HOSTED_REDIS_CLUSTER";

export type CacheSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "PROVIDER_SELECTED";

export type CacheManagedDefaultStatus =
  | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
  | "READY_TO_ADOPT_PLATFORM_CACHE";

export type CacheTopologyMode =
  "DISPOSABLE_SHARED_CACHE_PLUS_ROUTE_BOUND_RESUME_METADATA_WITH_STRICT_PARTITION_ISOLATION";

export type LocalPersistencePolicy =
  | "NO_LOCAL_PERSISTENCE"
  | "BROWSER_SESSION_EPHEMERAL_ONLY"
  | "BROWSER_MEMORY_ONLY"
  | "NATIVE_DISK_WITH_PURGE_ONLY";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderOptionRow {
  provider_family: CacheProviderFamily;
  selection_state:
    | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    | "SELF_HOST_DECISION_REQUIRED";
  provider_label: string;
  docs_urls: string[];
  topology_summary: string;
  isolation_summary: string;
  acl_tls_summary: string;
  persistence_summary: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentCacheRow {
  environment_ref: string;
  label: string;
  namespace_prefix: string;
  runtime_secret_alias_ref: string;
  admin_secret_alias_ref: string;
  local_resume_namespace_ref: string;
  provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  recovery_posture:
    | "FIXTURE_ONLY_NO_AUTHORITATIVE_RECOVERY"
    | "WARM_REBUILD_FROM_DURABLE_TRUTH_ONLY"
    | "RESTORE_DRILL_REBUILD_FROM_DURABLE_TRUTH_ONLY";
  notes: string[];
  source_refs: SourceRef[];
}

export interface CacheFamilyRow {
  family_ref: string;
  label: string;
  cache_scope_class_or_null: string | null;
  stream_scope_class_or_null: string | null;
  route_identity_pattern: string;
  canonical_object_pattern: string;
  visibility_partition_required: boolean;
  local_resume_allowed: boolean;
  notes: string[];
  source_refs: SourceRef[];
}

export interface CachePartitionKeyRow {
  partition_ref: string;
  label: string;
  family_ref: string;
  cache_scope_class_or_null: string | null;
  key_template: string;
  key_segments: string[];
  visibility_partition_required: boolean;
  preview_subject_required: boolean;
  shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY";
  local_persistence_policy: LocalPersistencePolicy;
  notes: string[];
  source_refs: SourceRef[];
}

export interface CachePartitionKeyContract {
  schema_version: "1.0";
  contract_id: "cache_partition_key_contract";
  selection_status: CacheSelectionStatus;
  topology_mode: CacheTopologyMode;
  key_rows: CachePartitionKeyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface ResumeTokenBindingRow {
  policy_ref: string;
  label: string;
  family_ref: string;
  stream_scope_class_or_null: string | null;
  raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN";
  envelope_fields: string[];
  required_binding_dimensions: string[];
  delivery_window_states: string[];
  local_persistence_policy: LocalPersistencePolicy;
  shared_store_role: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface ResumeTokenBindingPolicy {
  schema_version: "1.0";
  policy_id: "resume_token_binding_policy";
  selection_status: CacheSelectionStatus;
  topology_mode: CacheTopologyMode;
  binding_rows: ResumeTokenBindingRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface FamilyTtlRow {
  ttl_ref: string;
  family_ref: string;
  label: string;
  shared_ttl_seconds: number;
  local_ttl_seconds_or_null: number | null;
  stale_render_posture: string;
  mutation_gate_policy: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface InvalidationRow {
  trigger_ref: string;
  label: string;
  affected_family_refs: string[];
  shared_cache_action: string;
  local_cache_action: string;
  resume_action: string;
  stale_render_posture: string;
  mutation_gate: string;
  severity: "warning" | "danger";
  notes: string[];
  source_refs: SourceRef[];
}

export interface TtlAndInvalidationMatrix {
  schema_version: "1.0";
  matrix_id: "ttl_and_invalidation_matrix";
  selection_status: CacheSelectionStatus;
  topology_mode: CacheTopologyMode;
  family_ttl_rows: FamilyTtlRow[];
  invalidation_rows: InvalidationRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface LocalSharedPolicyRow {
  class_ref: string;
  label: string;
  applicable_family_refs: string[];
  shared_store_policy: string;
  local_store_policy: string;
  never_local: boolean;
  never_shared: boolean;
  notes: string[];
  source_refs: SourceRef[];
}

export interface LocalVsSharedCachePolicy {
  schema_version: "1.0";
  policy_id: "local_vs_shared_cache_policy";
  selection_status: CacheSelectionStatus;
  topology_mode: CacheTopologyMode;
  class_rows: LocalSharedPolicyRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface StreamResumeContractRow {
  contract_row_ref: string;
  label: string;
  family_ref: string;
  stream_scope_class_or_null: string | null;
  primary_contract_refs: string[];
  schema_refs: string[];
  recovery_mode: string;
  notes: string[];
  source_refs: SourceRef[];
}

export interface StreamResumeContractMap {
  schema_version: "1.0";
  map_id: "stream_resume_contract_map";
  selection_status: CacheSelectionStatus;
  topology_mode: CacheTopologyMode;
  rows: StreamResumeContractRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface CacheInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "cache_resume_inventory";
  provider_id: typeof CACHE_PROVIDER_ID;
  flow_id: typeof CACHE_FLOW_ID;
  policy_version: typeof CACHE_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: CacheSelectionStatus;
  managed_default_status: CacheManagedDefaultStatus;
  selected_provider_family_or_null: CacheProviderFamily | null;
  topology_mode: CacheTopologyMode;
  provider_option_rows: ProviderOptionRow[];
  environment_rows: EnvironmentCacheRow[];
  family_rows: CacheFamilyRow[];
  cache_partition_key_contract_ref: "config/cache/cache_partition_key_contract.json";
  resume_token_binding_policy_ref:
    "config/cache/resume_token_binding_policy.json";
  ttl_and_invalidation_matrix_ref:
    "config/cache/ttl_and_invalidation_matrix.json";
  local_vs_shared_cache_policy_ref:
    "config/cache/local_vs_shared_cache_policy.json";
  stream_resume_contract_map_ref:
    "config/cache/stream_resume_contract_map.json";
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ResumeIsolationAtlasViewModel {
  routeId: "resume-isolation-atlas";
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: CacheSelectionStatus;
  managedDefaultStatus: CacheManagedDefaultStatus;
  isolationChipLabel: string;
  topologyModeLabel: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    namespace_prefix: string;
    recovery_posture: string;
  }>;
  families: Array<{
    family_ref: string;
    label: string;
    route_identity_pattern: string;
    visibility_label: string;
    ttl_summary: string;
    local_policy_summary: string;
    description: string;
  }>;
  partitionRows: Array<{
    partition_ref: string;
    family_ref: string;
    label: string;
    key_template: string;
    key_segments: string[];
    visibility_partition_required: boolean;
    preview_subject_required: boolean;
    local_persistence_policy: LocalPersistencePolicy;
    note: string;
  }>;
  resumeRows: Array<{
    policy_ref: string;
    family_ref: string;
    label: string;
    envelope_fields: string[];
    required_binding_dimensions: string[];
    delivery_window_states: string[];
    local_persistence_policy: LocalPersistencePolicy;
    note: string;
  }>;
  invalidationRows: Array<{
    trigger_ref: string;
    label: string;
    affected_family_refs: string[];
    shared_cache_action: string;
    local_cache_action: string;
    resume_action: string;
    stale_render_posture: string;
    mutation_gate: string;
    severity: "warning" | "danger";
    note: string;
  }>;
  localSharedRows: Array<{
    class_ref: string;
    label: string;
    applicable_family_refs: string[];
    shared_store_policy: string;
    local_store_policy: string;
    never_local: boolean;
    never_shared: boolean;
    note: string;
  }>;
  contractRows: Array<{
    contract_row_ref: string;
    family_ref: string;
    label: string;
    primary_contract_refs: string[];
    schema_refs: string[];
    recovery_mode: string;
    note: string;
  }>;
  selectedEnvironmentRef: string;
  selectedFamilyRef: string;
  selectedFocusKind: "family" | "trigger" | "class" | "contract";
  selectedFocusRef: string;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionCacheStep {
  step_id: string;
  title: string;
  status:
    | "SUCCEEDED"
    | "BLOCKED_BY_POLICY"
    | "SKIPPED_AS_ALREADY_PRESENT"
    | "BLOCKED_BY_DRIFT";
  reason: string;
}

export interface ProvisionCacheResult {
  outcome:
    | "CACHE_RESUME_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "CACHE_RESUME_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
    | "CACHE_RESUME_TOPOLOGY_DRIFT_REVIEW_REQUIRED";
  selection_status: CacheSelectionStatus;
  inventory: CacheInventoryTemplate;
  cachePartitionKeyContract: CachePartitionKeyContract;
  resumeTokenBindingPolicy: ResumeTokenBindingPolicy;
  ttlAndInvalidationMatrix: TtlAndInvalidationMatrix;
  localVsSharedCachePolicy: LocalVsSharedCachePolicy;
  streamResumeContractMap: StreamResumeContractMap;
  atlasViewModel: ResumeIsolationAtlasViewModel;
  steps: ProvisionCacheStep[];
  notes: string[];
}

const docsUrls = {
  awsCreateServerlessCache:
    "https://docs.aws.amazon.com/AmazonElastiCache/latest/APIReference/API_CreateServerlessCache.html",
  awsEncryption:
    "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html",
  awsRbac:
    "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Clusters.RBAC.html",
  awsDataSecurity:
    "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-security.html",
  gcpOverview:
    "https://cloud.google.com/memorystore/docs/cluster/memorystore-for-redis-cluster-overview",
  gcpIamAuth:
    "https://cloud.google.com/memorystore/docs/cluster/manage-iam-auth",
  gcpTransitEncryption:
    "https://cloud.google.com/memorystore/docs/cluster/manage-in-transit-encryption",
  gcpPersistence:
    "https://cloud.google.com/memorystore/docs/cluster/about-persistence",
  gcpCmek: "https://cloud.google.com/memorystore/docs/cluster/about-cmek",
  azureOverview: "https://learn.microsoft.com/en-us/azure/redis/overview",
  azureSecure:
    "https://learn.microsoft.com/en-us/azure/redis/secure-azure-managed-redis",
  azureEntra:
    "https://learn.microsoft.com/en-us/azure/redis/entra-for-authentication",
  azureTls:
    "https://learn.microsoft.com/en-us/azure/redis/tls-configuration",
  azurePersistence:
    "https://learn.microsoft.com/en-us/azure/redis/how-to-persistence",
  redisSecurity:
    "https://redis.io/docs/latest/operate/oss_and_stack/management/security/",
  redisAcl:
    "https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/",
  redisTls:
    "https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/",
  redisPersistence:
    "https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/",
} as const;

const sourceRefs: SourceRef[] = [
  {
    source_file: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md",
    source_heading_or_logical_block: "Decision",
    source_ref: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md::Decision",
    rationale:
      "ADR-002 fixed caches and resume stores as disposable accelerators rather than durable workflow truth.",
  },
  {
    source_file: "docs/architecture/adr/ADR-003-identity-step-up-and-session-model.md",
    source_heading_or_logical_block: "Decision",
    source_ref:
      "docs/architecture/adr/ADR-003-identity-step-up-and-session-model.md::Decision",
    rationale:
      "Session revocation, step-up rotation, and bounded interactive scope govern whether resume lineage remains lawful.",
  },
  {
    source_file: "Algorithm/cache_isolation_and_secure_reuse_contract.md",
    source_heading_or_logical_block: "Contract Fields / Reuse Law / Scope Rules",
    source_ref:
      "Algorithm/cache_isolation_and_secure_reuse_contract.md::Contract_Fields_Reuse_Law_Scope_Rules",
    rationale:
      "Cache identity must bind tenant, client, principal, session, access, masking, route, object, projection version, visibility partition, and preview selection together.",
  },
  {
    source_file: "Algorithm/stream_resume_and_catch_up_ordering_contract.md",
    source_heading_or_logical_block: "Purpose / Required rules",
    source_ref:
      "Algorithm/stream_resume_and_catch_up_ordering_contract.md::Purpose_Required_rules",
    rationale:
      "Resume tokens are exact-route objects and catch-up ordering is monotonic, gap-free, and rebound to session, access, and masking context.",
  },
  {
    source_file: "Algorithm/native_cache_hydration_purge_and_rebase_contract.md",
    source_heading_or_logical_block: "Required rules / Coverage requirements",
    source_ref:
      "Algorithm/native_cache_hydration_purge_and_rebase_contract.md::Required_rules_Coverage_requirements",
    rationale:
      "Native hydration requires compatibility-before-render, selective purge, lineage invalidation, and cache-only restore that remains read-only until live legality returns.",
  },
  {
    source_file: "Algorithm/northbound_api_and_session_contract.md",
    source_heading_or_logical_block: "8. Session, browser, and native-client rules / FE-25 Cache Isolation",
    source_ref:
      "Algorithm/northbound_api_and_session_contract.md::8._Session_browser_and_native-client_rules_FE-25",
    rationale:
      "Browser and native caches are derivable, invalidated on drift, and never lawful bearer-credential stores.",
  },
  {
    source_file: "data/analysis/route_landmark_and_focus_order_registry.json",
    source_heading_or_logical_block: "calm_manifest_workspace / portal_request_detail",
    source_ref:
      "data/analysis/route_landmark_and_focus_order_registry.json::calm_manifest_workspace_portal_request_detail",
    rationale:
      "The route atlas already froze stable manifest and portal route identities that cache keys must reuse exactly.",
  },
  {
    source_file: "data/analysis/native_scene_window_topology.json",
    source_heading_or_logical_block: "primary_scenes / secondary windows",
    source_ref:
      "data/analysis/native_scene_window_topology.json::primary_scenes_secondary_windows",
    rationale:
      "The native scene topology already freezes scene identity, preview subject bounds, and restoration law for primary and detached windows.",
  },
  {
    source_file: "config/messaging/outbox_inbox_channel_matrix.json",
    source_heading_or_logical_block: "restore and ingress channel rows",
    source_ref:
      "config/messaging/outbox_inbox_channel_matrix.json::restore_and_ingress_channel_rows",
    rationale:
      "Resume and cache policy must stay subordinate to the transport-only broker and the durable inbox or outbox boundaries established in pc_0052.",
  },
];

const source_refs = sourceRefs;

const topologyMode: CacheTopologyMode =
  "DISPOSABLE_SHARED_CACHE_PLUS_ROUTE_BOUND_RESUME_METADATA_WITH_STRICT_PARTITION_ISOLATION";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function managedDefaultStatusFor(
  selectionStatus: CacheSelectionStatus,
): CacheManagedDefaultStatus {
  return selectionStatus === "PROVIDER_SELECTED"
    ? "READY_TO_ADOPT_PLATFORM_CACHE"
    : "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
}

const providerOptionRows: ProviderOptionRow[] = [
  {
    provider_family: "AWS_ELASTICACHE_SERVERLESS_VALKEY",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Amazon ElastiCache Serverless (Valkey / Redis OSS)",
    docs_urls: [
      docsUrls.awsCreateServerlessCache,
      docsUrls.awsEncryption,
      docsUrls.awsRbac,
      docsUrls.awsDataSecurity,
    ],
    topology_summary:
      "Serverless ElastiCache provides a managed shared-cache plane with TLS, RBAC, and network isolation while keeping cache state operational rather than authoritative.",
    isolation_summary:
      "Key design still has to encode tenant, session, masking, route, object, and preview dimensions because provider partitioning does not create lawful reuse by itself.",
    acl_tls_summary:
      "TLS and RBAC exist, but runtime aliases and environment namespaces must still remain environment-bound and least-privilege.",
    persistence_summary:
      "Durability and replication can reduce cold-start pain, but Taxat must still treat the cache as disposable and rebuildable from durable truth.",
    notes: [
      "This is a lawful managed default only if the broader platform later picks AWS explicitly.",
    ],
    source_refs,
  },
  {
    provider_family: "GCP_MEMORYSTORE_REDIS_CLUSTER",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Google Cloud Memorystore for Redis Cluster",
    docs_urls: [
      docsUrls.gcpOverview,
      docsUrls.gcpIamAuth,
      docsUrls.gcpTransitEncryption,
      docsUrls.gcpPersistence,
      docsUrls.gcpCmek,
    ],
    topology_summary:
      "Memorystore Cluster offers managed sharding, IAM auth, TLS, persistence, and CMEK support without changing the disposable-cache posture.",
    isolation_summary:
      "Identity-rich keys and namespace discipline remain mandatory because cluster partitioning only optimizes transport and memory layout.",
    acl_tls_summary:
      "IAM auth and in-transit encryption reduce platform risk but do not make raw resume tokens or credentials lawful cache contents.",
    persistence_summary:
      "Persistence helps operational recovery, but authoritative visibility and legality still rebuild from server truth after cache loss.",
    notes: [
      "This option fits a GCP-first runtime but remains blocked until the broader platform provider is selected.",
    ],
    source_refs,
  },
  {
    provider_family: "AZURE_MANAGED_REDIS",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    provider_label: "Azure Managed Redis",
    docs_urls: [
      docsUrls.azureOverview,
      docsUrls.azureSecure,
      docsUrls.azureEntra,
      docsUrls.azureTls,
      docsUrls.azurePersistence,
    ],
    topology_summary:
      "Azure Managed Redis provides managed cache nodes, security hardening guidance, Entra auth, TLS, and persistence options suitable for a disposable shared cache tier.",
    isolation_summary:
      "Application-level partition keys still have to carry client, masking, route, object, and preview dimensions because key broadening is a product-law failure, not a broker feature gap.",
    acl_tls_summary:
      "Identity-based auth and TLS are useful guardrails, but local restore legality and resume lineage remain product rules outside provider features.",
    persistence_summary:
      "Persistence and replication are availability features only. They never make Redis the legal source of session, stream, or route currentness.",
    notes: [
      "Azure cache adoption remains blocked until the platform decision is explicit and recorded.",
    ],
    source_refs,
  },
  {
    provider_family: "SELF_HOSTED_REDIS_CLUSTER",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    provider_label: "Self-hosted Redis Cluster",
    docs_urls: [
      docsUrls.redisSecurity,
      docsUrls.redisAcl,
      docsUrls.redisTls,
      docsUrls.redisPersistence,
    ],
    topology_summary:
      "Self-hosted Redis can satisfy the runtime pattern, but cluster ownership, TLS, ACLs, backup, and restore drills become first-party operational duties.",
    isolation_summary:
      "Self-hosting does not relax partition-key law; it increases the need for deterministic namespaces, selective purge, and disciplined local-versus-shared boundaries.",
    acl_tls_summary:
      "ACL and TLS must be managed directly, and the runtime still cannot store raw resume tokens or credential material at rest.",
    persistence_summary:
      "Persistence is optional and operational only. Even with AOF or snapshots, caches remain disposable and resumability remains subordinate to durable truth.",
    notes: [
      "Self-host is lawful only with an explicit ownership decision and recovery evidence; this card does not silently make that choice.",
    ],
    source_refs,
  },
];

const environmentRows: EnvironmentCacheRow[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    label: "Local provisioning workstation",
    namespace_prefix: "taxat-local-cache",
    runtime_secret_alias_ref: "cache/runtime-client/local",
    admin_secret_alias_ref: "cache/admin-bootstrap/local",
    local_resume_namespace_ref: "cache/local-resume/local",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "FIXTURE_ONLY_NO_AUTHORITATIVE_RECOVERY",
    notes: [
      "Local cache is fixture-only and exists to verify key composition, purge semantics, and atlas rendering.",
    ],
    source_refs,
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Shared sandbox integration",
    namespace_prefix: "taxat-sbx-cache",
    runtime_secret_alias_ref: "cache/runtime-client/sandbox",
    admin_secret_alias_ref: "cache/admin-bootstrap/sandbox",
    local_resume_namespace_ref: "cache/local-resume/sandbox",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "WARM_REBUILD_FROM_DURABLE_TRUTH_ONLY",
    notes: [
      "Sandbox proves partition isolation and purge rules under controlled reconnect and step-up scenarios without reusing production namespaces.",
    ],
    source_refs,
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Preproduction verification",
    namespace_prefix: "taxat-pre-cache",
    runtime_secret_alias_ref: "cache/runtime-client/preprod",
    admin_secret_alias_ref: "cache/admin-bootstrap/preprod",
    local_resume_namespace_ref: "cache/local-resume/preprod",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "WARM_REBUILD_FROM_DURABLE_TRUTH_ONLY",
    notes: [
      "Preproduction must prove cache loss, resume rebase, and schema-drift purge before any release candidate can claim continuity readiness.",
    ],
    source_refs,
  },
  {
    environment_ref: "env_production",
    label: "Production",
    namespace_prefix: "taxat-prod-cache",
    runtime_secret_alias_ref: "cache/runtime-client/production",
    admin_secret_alias_ref: "cache/admin-bootstrap/production",
    local_resume_namespace_ref: "cache/local-resume/production",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "WARM_REBUILD_FROM_DURABLE_TRUTH_ONLY",
    notes: [
      "Production cache warmup is valuable, but legal correctness and route legitimacy cannot depend on a populated cache existing.",
    ],
    source_refs,
  },
  {
    environment_ref: "env_disaster_recovery_drill",
    label: "Disaster recovery drill",
    namespace_prefix: "taxat-drill-cache",
    runtime_secret_alias_ref: "cache/runtime-client/drill",
    admin_secret_alias_ref: "cache/admin-bootstrap/drill",
    local_resume_namespace_ref: "cache/local-resume/drill",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    recovery_posture: "RESTORE_DRILL_REBUILD_FROM_DURABLE_TRUTH_ONLY",
    notes: [
      "Restore drills prove cache cold-start, snapshot fallback, and explicit rebase instead of assuming persisted Redis state remains trustworthy.",
    ],
    source_refs,
  },
];

const familyRows: CacheFamilyRow[] = [
  {
    family_ref: "family.manifest_experience",
    label: "Manifest experience",
    cache_scope_class_or_null: "LOW_NOISE_FRAME",
    stream_scope_class_or_null: "MANIFEST_EXPERIENCE",
    route_identity_pattern: "/manifests/{manifest_id}",
    canonical_object_pattern: "manifest:{manifest_id}",
    visibility_partition_required: false,
    local_resume_allowed: true,
    notes: [
      "Manifest continuity binds shell stability, route identity, and same-object posture before any cached frame may render as current.",
    ],
    source_refs,
  },
  {
    family_ref: "family.collaboration_workspace",
    label: "Collaboration workspace",
    cache_scope_class_or_null: "WORKSPACE_SNAPSHOT",
    stream_scope_class_or_null: "WORKSPACE",
    route_identity_pattern: "/manifests/{manifest_id}?focus=workflow:{item_id}",
    canonical_object_pattern: "work-item:{item_id}",
    visibility_partition_required: true,
    local_resume_allowed: true,
    notes: [
      "Workspace snapshots require visibility partition identity and read-only downgrade whenever access or masking posture drifts.",
    ],
    source_refs,
  },
  {
    family_ref: "family.client_portal_workspace",
    label: "Client portal workspace",
    cache_scope_class_or_null: "CLIENT_PORTAL_WORKSPACE",
    stream_scope_class_or_null: "WORKSPACE",
    route_identity_pattern: "/portal/requests/{item_id}",
    canonical_object_pattern: "portal-request:{item_id}",
    visibility_partition_required: true,
    local_resume_allowed: true,
    notes: [
      "Customer-safe portal continuity is route- and masking-bound and may never replay broader staff visibility into a narrower session.",
    ],
    source_refs,
  },
  {
    family_ref: "family.upload_session_recovery",
    label: "Upload-session recovery",
    cache_scope_class_or_null: null,
    stream_scope_class_or_null: null,
    route_identity_pattern: "/portal/documents?upload_session_id={upload_session_id}",
    canonical_object_pattern: "upload-session:{upload_session_id}",
    visibility_partition_required: false,
    local_resume_allowed: true,
    notes: [
      "Upload-session restore is request-binding- and rebase-bound; a stale cached lane may restore view context only, never mutation authority.",
    ],
    source_refs,
  },
  {
    family_ref: "family.native_operator_hydration",
    label: "Native hydration",
    cache_scope_class_or_null: "NATIVE_OPERATOR_WORKSPACE_SCENE",
    stream_scope_class_or_null: "WORKSPACE",
    route_identity_pattern: "scene:native_primary_work_item_scene:{item_id}",
    canonical_object_pattern: "work-item:{item_id}",
    visibility_partition_required: false,
    local_resume_allowed: true,
    notes: [
      "Native hydration binds session lineage, projection guard, schema compatibility, and optional preview subject before first paint or scene restore.",
    ],
    source_refs,
  },
];

const partitionKeyRows: CachePartitionKeyRow[] = [
  {
    partition_ref: "partition.manifest_experience",
    label: "Manifest frame partition",
    family_ref: "family.manifest_experience",
    cache_scope_class_or_null: "LOW_NOISE_FRAME",
    key_template:
      "{namespace_prefix}:manifest-frame:{tenant_id}:{client_id_or_null}:{principal_class}:{session_binding_hash}:{access_binding_hash_or_null}:{masking_posture_fingerprint_or_null}:{route_identity_ref}:{canonical_object_ref}:{shell_stability_ref_or_null}:{projection_version_ref}:{delivery_binding_hash}",
    key_segments: [
      "namespace_prefix",
      "tenant_id",
      "client_id_or_null",
      "principal_class",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "shell_stability_ref_or_null",
      "projection_version_ref",
      "delivery_binding_hash",
    ],
    visibility_partition_required: false,
    preview_subject_required: false,
    shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    notes: [
      "Manifest speed paths remain same-object and same-shell only; no object-id-only shortcut is lawful.",
    ],
    source_refs,
  },
  {
    partition_ref: "partition.collaboration_workspace",
    label: "Workspace snapshot partition",
    family_ref: "family.collaboration_workspace",
    cache_scope_class_or_null: "WORKSPACE_SNAPSHOT",
    key_template:
      "{namespace_prefix}:workspace:{tenant_id}:{client_id_or_null}:{principal_class}:{session_binding_hash}:{access_binding_hash_or_null}:{masking_posture_fingerprint_or_null}:{visibility_cache_partition_key_or_null}:{route_identity_ref}:{canonical_object_ref}:{projection_version_ref}:{delivery_binding_hash}",
    key_segments: [
      "namespace_prefix",
      "tenant_id",
      "client_id_or_null",
      "principal_class",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "visibility_cache_partition_key_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "projection_version_ref",
      "delivery_binding_hash",
    ],
    visibility_partition_required: true,
    preview_subject_required: false,
    shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    notes: [
      "Workspace caching carries visibility partition identity so staff workspace deltas never leak across support, customer-safe, or narrower access slices.",
    ],
    source_refs,
  },
  {
    partition_ref: "partition.client_portal_workspace",
    label: "Portal workspace partition",
    family_ref: "family.client_portal_workspace",
    cache_scope_class_or_null: "CLIENT_PORTAL_WORKSPACE",
    key_template:
      "{namespace_prefix}:portal:{tenant_id}:{client_id_or_null}:{principal_class}:{session_binding_hash}:{access_binding_hash_or_null}:{masking_posture_fingerprint_or_null}:{visibility_cache_partition_key_or_null}:{route_identity_ref}:{canonical_object_ref}:{projection_version_ref}:{customer_safe_projection_ref}",
    key_segments: [
      "namespace_prefix",
      "tenant_id",
      "client_id_or_null",
      "principal_class",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "visibility_cache_partition_key_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "projection_version_ref",
      "customer_safe_projection_ref",
    ],
    visibility_partition_required: true,
    preview_subject_required: false,
    shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    notes: [
      "Portal caches remain customer-safe and route-bound; they cannot be widened into staff-visible or broader request context.",
    ],
    source_refs,
  },
  {
    partition_ref: "partition.upload_session_recovery",
    label: "Upload-session recovery partition",
    family_ref: "family.upload_session_recovery",
    cache_scope_class_or_null: null,
    key_template:
      "{namespace_prefix}:upload-session:{tenant_id}:{client_id_or_null}:{principal_class}:{session_binding_hash}:{access_binding_hash_or_null}:{masking_posture_fingerprint_or_null}:{route_identity_ref}:{canonical_object_ref}:{request_binding_hash}:{schema_compatibility_ref}:{request_rebase_generation}",
    key_segments: [
      "namespace_prefix",
      "tenant_id",
      "client_id_or_null",
      "principal_class",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "request_binding_hash",
      "schema_compatibility_ref",
      "request_rebase_generation",
    ],
    visibility_partition_required: false,
    preview_subject_required: false,
    shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    notes: [
      "Upload-session restore binds to request rebase lineage and schema compatibility rather than optimistic browser memory alone.",
    ],
    source_refs,
  },
  {
    partition_ref: "partition.native_operator_hydration",
    label: "Native hydration partition",
    family_ref: "family.native_operator_hydration",
    cache_scope_class_or_null: "NATIVE_OPERATOR_WORKSPACE_SCENE",
    key_template:
      "{namespace_prefix}:native-scene:{tenant_id}:{principal_class}:{session_binding_hash}:{session_lineage_ref_or_null}:{access_binding_hash_or_null}:{masking_posture_fingerprint_or_null}:{route_identity_ref}:{canonical_object_ref}:{schema_compatibility_ref}:{projection_guard_ref}:{preview_subject_ref_or_null}",
    key_segments: [
      "namespace_prefix",
      "tenant_id",
      "principal_class",
      "session_binding_hash",
      "session_lineage_ref_or_null",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "schema_compatibility_ref",
      "projection_guard_ref",
      "preview_subject_ref_or_null",
    ],
    visibility_partition_required: false,
    preview_subject_required: false,
    shared_cache_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    local_persistence_policy: "NATIVE_DISK_WITH_PURGE_ONLY",
    notes: [
      "Native restore must carry the exact legality envelope, including session lineage and projection guard, before cached state may render.",
    ],
    source_refs,
  },
];

const resumeBindingRows: ResumeTokenBindingRow[] = [
  {
    policy_ref: "resume.manifest_experience",
    label: "Manifest experience resume binding",
    family_ref: "family.manifest_experience",
    stream_scope_class_or_null: "MANIFEST_EXPERIENCE",
    raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    envelope_fields: [
      "resume_binding_hash_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "shell_stability_token",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
      "publication_generation",
      "frame_epoch",
      "last_published_sequence",
      "compaction_floor_sequence_or_null",
      "delivery_window_state",
      "rebase_reason_code_or_null",
      "expires_at",
    ],
    required_binding_dimensions: [
      "route_identity_ref",
      "canonical_object_ref",
      "shell_stability_token",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
      "publication_generation",
      "frame_epoch",
    ],
    delivery_window_states: [
      "LIVE_RESUMABLE",
      "REBASE_REQUIRED",
      "ACCESS_REBIND_REQUIRED",
      "SNAPSHOT_ONLY",
    ],
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    shared_store_role: "SHARED_RESUME_METADATA_NAMESPACE",
    notes: [
      "Raw tokens remain transport-only. Cached manifest resume state stores hashes, frontier, and legality posture only.",
    ],
    source_refs,
  },
  {
    policy_ref: "resume.collaboration_workspace",
    label: "Workspace resume binding",
    family_ref: "family.collaboration_workspace",
    stream_scope_class_or_null: "WORKSPACE",
    raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    envelope_fields: [
      "resume_binding_hash_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "visibility_cache_partition_key_or_null",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
      "publication_generation",
      "frame_epoch",
      "last_published_sequence",
      "delivery_window_state",
      "rebase_reason_code_or_null",
      "expires_at",
    ],
    required_binding_dimensions: [
      "route_identity_ref",
      "canonical_object_ref",
      "visibility_cache_partition_key_or_null",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
      "publication_generation",
    ],
    delivery_window_states: [
      "LIVE_RESUMABLE",
      "REBASE_REQUIRED",
      "ACCESS_REBIND_REQUIRED",
      "SNAPSHOT_ONLY",
    ],
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    shared_store_role: "SHARED_RESUME_METADATA_NAMESPACE",
    notes: [
      "Workspace resume stays bound to visibility partition and read-only downgrade posture; replay cannot outrun narrower access.",
    ],
    source_refs,
  },
  {
    policy_ref: "resume.client_portal_workspace",
    label: "Portal workspace resume binding",
    family_ref: "family.client_portal_workspace",
    stream_scope_class_or_null: "WORKSPACE",
    raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    envelope_fields: [
      "resume_binding_hash_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "visibility_cache_partition_key_or_null",
      "customer_safe_projection_ref",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
      "publication_generation",
      "last_published_sequence",
      "delivery_window_state",
      "rebase_reason_code_or_null",
      "expires_at",
    ],
    required_binding_dimensions: [
      "route_identity_ref",
      "canonical_object_ref",
      "visibility_cache_partition_key_or_null",
      "customer_safe_projection_ref",
      "session_ref",
      "session_binding_hash",
      "access_binding_hash",
      "masking_context_hash",
    ],
    delivery_window_states: [
      "LIVE_RESUMABLE",
      "REBASE_REQUIRED",
      "ACCESS_REBIND_REQUIRED",
      "SNAPSHOT_ONLY",
    ],
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    shared_store_role: "SHARED_RESUME_METADATA_NAMESPACE",
    notes: [
      "Portal resume law stays customer-safe and session-bound; a prior token cannot widen visibility after invite upgrade, masking drift, or session reissue.",
    ],
    source_refs,
  },
  {
    policy_ref: "resume.upload_session_recovery",
    label: "Upload-session recovery binding",
    family_ref: "family.upload_session_recovery",
    stream_scope_class_or_null: null,
    raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    envelope_fields: [
      "resume_binding_hash_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "request_binding_hash",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_context_hash_or_null",
      "request_rebase_generation",
      "schema_compatibility_ref",
      "delivery_window_state",
      "invalidation_reason_code_or_null",
      "expires_at",
    ],
    required_binding_dimensions: [
      "route_identity_ref",
      "canonical_object_ref",
      "request_binding_hash",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "request_rebase_generation",
      "schema_compatibility_ref",
    ],
    delivery_window_states: [
      "LIVE_RESUMABLE",
      "REBASE_REQUIRED",
      "ACCESS_REBIND_REQUIRED",
      "SNAPSHOT_ONLY",
    ],
    local_persistence_policy: "BROWSER_SESSION_EPHEMERAL_ONLY",
    shared_store_role: "SHARED_UPLOAD_RECOVERY_NAMESPACE",
    notes: [
      "Upload-session recovery may restore view context only. Mutation and attachment remain blocked until live request legality is re-established.",
    ],
    source_refs,
  },
  {
    policy_ref: "resume.native_operator_hydration",
    label: "Native hydration cursor binding",
    family_ref: "family.native_operator_hydration",
    stream_scope_class_or_null: "WORKSPACE",
    raw_resume_token_policy: "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
    envelope_fields: [
      "resume_binding_hash_or_null",
      "route_identity_ref",
      "canonical_object_ref",
      "session_binding_hash",
      "session_lineage_ref_or_null",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint",
      "schema_compatibility_ref",
      "projection_guard_ref",
      "preview_subject_ref_or_null",
      "delivery_window_state",
      "invalidation_reason_code_or_null",
      "expires_at",
    ],
    required_binding_dimensions: [
      "route_identity_ref",
      "canonical_object_ref",
      "session_binding_hash",
      "session_lineage_ref_or_null",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint",
      "schema_compatibility_ref",
      "projection_guard_ref",
    ],
    delivery_window_states: [
      "LIVE_RESUMABLE",
      "REBASE_REQUIRED",
      "ACCESS_REBIND_REQUIRED",
      "SNAPSHOT_ONLY",
    ],
    local_persistence_policy: "NATIVE_DISK_WITH_PURGE_ONLY",
    shared_store_role: "SHARED_RESUME_METADATA_NAMESPACE",
    notes: [
      "Native hydration persists hashes and legality guards, never raw resume tokens, and must purge local derivatives together on drift.",
    ],
    source_refs,
  },
];

const familyTtlRows: FamilyTtlRow[] = [
  {
    ttl_ref: "ttl.manifest_experience",
    family_ref: "family.manifest_experience",
    label: "Manifest experience TTL",
    shared_ttl_seconds: 180,
    local_ttl_seconds_or_null: 45,
    stale_render_posture: "ALLOW_SAME_OBJECT_READ_ONLY_RENDER_WITH_REFRESH_BANNER",
    mutation_gate_policy: "MUTATIONS_BLOCKED_UNTIL_LIVE_STREAM_RECOVERS",
    notes: [
      "Manifest shells may render briefly from cache while reconnecting, but commands remain blocked until live legality is re-established.",
    ],
    source_refs,
  },
  {
    ttl_ref: "ttl.collaboration_workspace",
    family_ref: "family.collaboration_workspace",
    label: "Workspace TTL",
    shared_ttl_seconds: 180,
    local_ttl_seconds_or_null: 60,
    stale_render_posture: "ALLOW_READ_ONLY_SNAPSHOT_WITH_STALE_GUARD",
    mutation_gate_policy: "MUTATIONS_BLOCKED_UNTIL_LIVE_REBASE_OR_FRESH_SNAPSHOT",
    notes: [
      "Workspace caches may support continuity, but stale command lanes must downgrade inline before the user can act.",
    ],
    source_refs,
  },
  {
    ttl_ref: "ttl.client_portal_workspace",
    family_ref: "family.client_portal_workspace",
    label: "Portal TTL",
    shared_ttl_seconds: 240,
    local_ttl_seconds_or_null: 90,
    stale_render_posture: "ALLOW_CUSTOMER_SAFE_READ_ONLY_RESTORE_WITH_REFRESH_NOTICE",
    mutation_gate_policy: "CUSTOMER_ACTIONS_BLOCKED_UNTIL_FRESH_BINDING",
    notes: [
      "Portal restore stays customer-safe and read-only until current visibility and request legality are proven again.",
    ],
    source_refs,
  },
  {
    ttl_ref: "ttl.upload_session_recovery",
    family_ref: "family.upload_session_recovery",
    label: "Upload-session TTL",
    shared_ttl_seconds: 120,
    local_ttl_seconds_or_null: 30,
    stale_render_posture: "ALLOW_PROGRESS_RESTORE_ONLY_WITH_REQUEST_REBASE_HINT",
    mutation_gate_policy: "UPLOAD_MUTATION_BLOCKED_UNTIL_REQUEST_REBASE_AND_SERVER_ACK",
    notes: [
      "Upload-session recovery is intentionally short-lived because request binding and object lineage drift quickly.",
    ],
    source_refs,
  },
  {
    ttl_ref: "ttl.native_operator_hydration",
    family_ref: "family.native_operator_hydration",
    label: "Native hydration TTL",
    shared_ttl_seconds: 300,
    local_ttl_seconds_or_null: 1800,
    stale_render_posture: "ALLOW_CACHE_ONLY_READ_RESTORE_AFTER_COMPATIBILITY_CHECK",
    mutation_gate_policy: "NO_MUTATION_OR_FILING_AFTER_CACHE_ONLY_RESTORE",
    notes: [
      "Native disk cache can survive longer to support relaunch, but compatibility and lineage checks still run before first paint.",
    ],
    source_refs,
  },
];

const invalidationRows: InvalidationRow[] = [
  {
    trigger_ref: "trigger.tenant_switch",
    label: "Tenant switch",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "PURGE_ALL_ENTRIES_FOR_PREVIOUS_TENANT_NAMESPACE",
    local_cache_action: "PURGE_ALL_LOCAL_VARIANTS_AND_RESTORE_PAYLOADS",
    resume_action: "CLEAR_ALL_RESUME_BINDINGS",
    stale_render_posture: "NO_REUSE_ACROSS_TENANT_BOUNDARY",
    mutation_gate: "BLOCK_UNTIL_FRESH_TENANT_SCOPE_ESTABLISHED",
    severity: "danger",
    notes: [
      "Cross-tenant reuse is never lawful, even when the same principal identity appears in both tenants.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.client_switch",
    label: "Client switch",
    affected_family_refs: [
      "family.manifest_experience",
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.upload_session_recovery",
      "family.native_operator_hydration",
    ],
    shared_cache_action: "PURGE_PREVIOUS_CLIENT_VARIANTS",
    local_cache_action: "PURGE_CLIENT_SCOPED_LOCAL_VARIANTS",
    resume_action: "CLEAR_CLIENT_SCOPED_RESUME_BINDINGS",
    stale_render_posture: "NO_REUSE_ACROSS_CLIENT_BOUNDARY",
    mutation_gate: "BLOCK_UNTIL_CLIENT_SCOPE_REBOUND",
    severity: "danger",
    notes: [
      "Client scope narrowing must not leave broader cached variants mounted behind the same tenant shell.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.privilege_downgrade",
    label: "Privilege downgrade",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "PURGE_BROADER_ACCESS_VARIANTS",
    local_cache_action: "PURGE_AND_DOWNGRADE_ANY_BROADER_LOCAL_SNAPSHOT",
    resume_action: "ACCESS_REBIND_REQUIRED",
    stale_render_posture: "ALLOW_ONLY_NARROWER_OR_READ_ONLY_SURFACES",
    mutation_gate: "BLOCK_UNTIL_AUTHORIZATION_RECHECK_COMPLETES",
    severity: "danger",
    notes: [
      "Access narrowing must clear broader variants immediately rather than waiting for TTL expiry.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.masking_tightening",
    label: "Masking tightening",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "PURGE_BROADER_MASKING_VARIANTS",
    local_cache_action: "PURGE_PREVIEWS_EXPORTS_AND_LOCAL_VARIANTS",
    resume_action: "ACCESS_REBIND_REQUIRED",
    stale_render_posture: "ALLOW_ONLY_NEW_MASKING_POSTURE_AFTER_REFRESH",
    mutation_gate: "BLOCK_UNTIL_MASKING_REVALIDATED",
    severity: "danger",
    notes: [
      "Masking drift is a first-class invalidation event because weaker cached views can leak broader evidence or customer detail.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.route_or_object_drift",
    label: "Route or object drift",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "REJECT_REUSE_FOR_MISMATCHED_ROUTE_OR_OBJECT",
    local_cache_action: "PURGE_MISMATCHED_ROUTE_AND_PREVIEW_VARIANTS",
    resume_action: "REBASE_REQUIRED",
    stale_render_posture: "NO_SILENT_ROOT_REMOUNT",
    mutation_gate: "BLOCK_UNTIL_SAME_OBJECT_CONTEXT_RESTORED",
    severity: "warning",
    notes: [
      "Same-shell continuity requires same-object continuity; a new route or object cannot inherit a stale cache envelope.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.session_revoked",
    label: "Session revoked",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "PURGE_SESSION_SCOPED_SHARED_VARIANTS",
    local_cache_action: "PURGE_ALL_LOCAL_CACHE_AND_RESTORE_ARTIFACTS",
    resume_action: "CLEAR_ALL_RESUME_BINDINGS",
    stale_render_posture: "REVOKED_SESSION_BANNER_ONLY",
    mutation_gate: "BLOCK_ALL_ACTIONS_UNTIL_REAUTHENTICATION",
    severity: "danger",
    notes: [
      "Revocation clears structured cache, resume metadata, NSUserActivity, previews, temp exports, and local indices together.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.step_up_completed",
    label: "Step-up completed",
    affected_family_refs: [
      "family.manifest_experience",
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.native_operator_hydration",
    ],
    shared_cache_action: "ROTATE_EFFECTIVE_CHALLENGE_VARIANTS",
    local_cache_action: "PURGE_PRE_STEP_UP_RESUME_METADATA",
    resume_action: "ACCESS_REBIND_REQUIRED",
    stale_render_posture: "ALLOW_REFRESH_ONLY_AFTER_CHALLENGE_ROTATION",
    mutation_gate: "BLOCK_PRE_STEP_UP_COMMAND_REUSE",
    severity: "warning",
    notes: [
      "Step-up completion changes the effective session challenge state, so cached command or resume lineage from before the challenge cannot be replayed.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.request_rebase",
    label: "Request rebase",
    affected_family_refs: ["family.upload_session_recovery"],
    shared_cache_action: "PURGE_UPLOAD_SESSION_VARIANTS_FOR_OLD_BINDING",
    local_cache_action: "PURGE_UPLOAD_SESSION_LOCAL_PROGRESS_VARIANTS",
    resume_action: "REBASE_REQUIRED",
    stale_render_posture: "SHOW_REBASE_REQUIRED_WITHOUT_REPLAYING_STALE_PROGRESS",
    mutation_gate: "BLOCK_UPLOAD_MUTATION_UNTIL_NEW_REQUEST_BINDING_ACK",
    severity: "warning",
    notes: [
      "Upload-session recovery must fail closed when request binding or base generation changes underneath the cached shell.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.schema_incompatible",
    label: "Schema incompatible",
    affected_family_refs: familyRows.map((row) => row.family_ref),
    shared_cache_action: "PURGE_SCHEMA_MISMATCHED_VARIANTS",
    local_cache_action: "PURGE_LOCAL_CACHE_AND_RESTORE_PAYLOADS",
    resume_action: "ACCESS_REBIND_REQUIRED",
    stale_render_posture: "NO_RENDER_UNTIL_COMPATIBLE_SNAPSHOT_AVAILABLE",
    mutation_gate: "BLOCK_ALL_MUTATIONS_UNTIL_FRESH_COMPATIBLE_STATE",
    severity: "danger",
    notes: [
      "Schema incompatibility triggers purge or rebase rather than optimistic render because stale contracts can imply false legality.",
    ],
    source_refs,
  },
  {
    trigger_ref: "trigger.cache_only_restore",
    label: "Cache-only restoration",
    affected_family_refs: [
      "family.manifest_experience",
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.upload_session_recovery",
      "family.native_operator_hydration",
    ],
    shared_cache_action: "NO_SHARED_MUTATION_FROM_CACHE_ONLY_POSTURE",
    local_cache_action: "ALLOW_BOUNDED_READ_ONLY_RESTORE_IF_COMPATIBLE",
    resume_action: "LIVE_REBASE_OR_REFRESH_REQUIRED_BEFORE_MUTATION",
    stale_render_posture: "READ_ONLY_CACHE_RESTORE_ONLY",
    mutation_gate: "BLOCK_MUTATION_UNTIL_LIVE_LEGALITY_REESTABLISHED",
    severity: "warning",
    notes: [
      "Cache-only restore is lawful only as bounded visual continuity. It never reopens a mutation-capable posture by itself.",
    ],
    source_refs,
  },
];

const localSharedPolicyRows: LocalSharedPolicyRow[] = [
  {
    class_ref: "class.shared_projection_snapshot",
    label: "Shared projection snapshot",
    applicable_family_refs: [
      "family.manifest_experience",
      "family.collaboration_workspace",
      "family.client_portal_workspace",
    ],
    shared_store_policy: "ALLOWED_IN_SHARED_CACHE_WITH_FULL_PARTITION_IDENTITY",
    local_store_policy: "BOUNDED_LOCAL_EPHEMERAL_COPY_ONLY",
    never_local: false,
    never_shared: false,
    notes: [
      "Projection snapshots are the main shared-cache acceleration target, but still require exact security-context keys.",
    ],
    source_refs,
  },
  {
    class_ref: "class.resume_envelope_hashed",
    label: "Hashed resume envelope",
    applicable_family_refs: familyRows.map((row) => row.family_ref),
    shared_store_policy: "ALLOWED_IN_SHARED_CACHE_AS_HASHED_ENVELOPE_ONLY",
    local_store_policy: "ALLOWED_ONLY_AS_HASHED_EPHEMERAL_METADATA",
    never_local: false,
    never_shared: false,
    notes: [
      "Resume metadata may persist as hashes, frontier, and legality posture only. Raw tokens never qualify.",
    ],
    source_refs,
  },
  {
    class_ref: "class.upload_session_rebase_envelope",
    label: "Upload-session rebase envelope",
    applicable_family_refs: ["family.upload_session_recovery"],
    shared_store_policy: "ALLOWED_IN_SHARED_CACHE_WITH_REQUEST_BINDING_HASH",
    local_store_policy: "ALLOWED_IN_BROWSER_SESSION_ONLY",
    never_local: false,
    never_shared: false,
    notes: [
      "Upload progress may restore within one request-binding window only; broader persistence is forbidden.",
    ],
    source_refs,
  },
  {
    class_ref: "class.native_hydration_snapshot",
    label: "Native hydration snapshot",
    applicable_family_refs: ["family.native_operator_hydration"],
    shared_store_policy: "ALLOWED_AS_SERVER_AUTHORED_SNAPSHOT_HINT_ONLY",
    local_store_policy: "ALLOWED_ON_DISK_WITH_PURGE_AND_COMPATIBILITY_GUARDS",
    never_local: false,
    never_shared: false,
    notes: [
      "Native disk cache exists only for lawful relaunch and restoration, never as an offline authority for mutation.",
    ],
    source_refs,
  },
  {
    class_ref: "class.browser_restore_hint",
    label: "Browser restore hint",
    applicable_family_refs: [
      "family.manifest_experience",
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.upload_session_recovery",
    ],
    shared_store_policy: "NOT_REQUIRED_IN_SHARED_CACHE",
    local_store_policy: "ALLOWED_IN_BROWSER_SESSION_ONLY",
    never_local: false,
    never_shared: false,
    notes: [
      "Browser restore hints stay ephemeral and session-bound so refresh continuity does not become sticky local history.",
    ],
    source_refs,
  },
  {
    class_ref: "class.visibility_invalidation_tombstone",
    label: "Visibility invalidation tombstone",
    applicable_family_refs: [
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.native_operator_hydration",
    ],
    shared_store_policy: "ALLOWED_IN_SHARED_CACHE_TO_FORCE_FAIL_CLOSED_REFRESH",
    local_store_policy: "NOT_STORED_LOCALLY",
    never_local: true,
    never_shared: false,
    notes: [
      "Shared invalidation tombstones help fail closed after access or masking drift without preserving stale content locally.",
    ],
    source_refs,
  },
  {
    class_ref: "class.temp_preview_or_export_artifact",
    label: "Temporary preview or export artifact",
    applicable_family_refs: [
      "family.collaboration_workspace",
      "family.client_portal_workspace",
      "family.native_operator_hydration",
    ],
    shared_store_policy: "NOT_STORED_IN_SHARED_CACHE",
    local_store_policy: "EPHEMERAL_ONLY_WITH_ROUTE_AND_SELECTION_BINDING",
    never_local: false,
    never_shared: true,
    notes: [
      "Temporary previews and exports are local derivatives only and must purge on route, masking, or preview-subject drift.",
    ],
    source_refs,
  },
  {
    class_ref: "class.raw_resume_token",
    label: "Raw resume token",
    applicable_family_refs: familyRows.map((row) => row.family_ref),
    shared_store_policy: "FORBIDDEN_AT_REST",
    local_store_policy: "FORBIDDEN_AT_REST",
    never_local: true,
    never_shared: true,
    notes: [
      "A raw resume token is transport material only and may never become a cache key, local blob, or shared record.",
    ],
    source_refs,
  },
  {
    class_ref: "class.session_cookie_or_bearer",
    label: "Session cookie or bearer credential",
    applicable_family_refs: familyRows.map((row) => row.family_ref),
    shared_store_policy: "FORBIDDEN_IN_CACHE",
    local_store_policy: "FORBIDDEN_IN_CACHE",
    never_local: true,
    never_shared: true,
    notes: [
      "Interactive session material belongs in browser cookie handling or Keychain-class storage, not in the cache or resume store.",
    ],
    source_refs,
  },
  {
    class_ref: "class.authority_or_provider_credential",
    label: "Authority or provider credential",
    applicable_family_refs: familyRows.map((row) => row.family_ref),
    shared_store_policy: "FORBIDDEN_IN_CACHE",
    local_store_policy: "FORBIDDEN_IN_CACHE",
    never_local: true,
    never_shared: true,
    notes: [
      "Authority credentials, DSNs, provider secrets, and similar material remain outside the cache boundary entirely.",
    ],
    source_refs,
  },
];

const contractMapRows: StreamResumeContractRow[] = [
  {
    contract_row_ref: "contract.manifest_experience",
    label: "Manifest experience continuity",
    family_ref: "family.manifest_experience",
    stream_scope_class_or_null: "MANIFEST_EXPERIENCE",
    primary_contract_refs: [
      "Algorithm/stream_resume_and_catch_up_ordering_contract.md",
      "Algorithm/cache_isolation_and_secure_reuse_contract.md",
      "Algorithm/northbound_api_and_session_contract.md",
    ],
    schema_refs: [
      "Algorithm/schemas/stream_recovery_contract.schema.json",
      "Algorithm/schemas/cache_isolation_contract.schema.json",
      "Algorithm/schemas/experience_cursor.schema.json",
    ],
    recovery_mode: "STREAM_RECOVERY_PLUS_CACHE_ISOLATION",
    notes: [
      "Manifest continuity is governed by stream recovery plus cache isolation; the cache never invents freshness or current route legality.",
    ],
    source_refs,
  },
  {
    contract_row_ref: "contract.collaboration_workspace",
    label: "Workspace continuity",
    family_ref: "family.collaboration_workspace",
    stream_scope_class_or_null: "WORKSPACE",
    primary_contract_refs: [
      "Algorithm/stream_resume_and_catch_up_ordering_contract.md",
      "Algorithm/cache_isolation_and_secure_reuse_contract.md",
      "Algorithm/frontend_shell_and_interaction_law.md",
    ],
    schema_refs: [
      "Algorithm/schemas/stream_recovery_contract.schema.json",
      "Algorithm/schemas/cache_isolation_contract.schema.json",
      "Algorithm/schemas/workspace_stream_event.schema.json",
    ],
    recovery_mode: "WORKSPACE_STREAM_RECOVERY_PLUS_VISIBILITY_PARTITION",
    notes: [
      "Workspace continuity requires exact visibility partition identity and stream catch-up before live delivery is current again.",
    ],
    source_refs,
  },
  {
    contract_row_ref: "contract.client_portal_workspace",
    label: "Client portal continuity",
    family_ref: "family.client_portal_workspace",
    stream_scope_class_or_null: "WORKSPACE",
    primary_contract_refs: [
      "Algorithm/customer_client_portal_experience_contract.md",
      "Algorithm/cache_isolation_and_secure_reuse_contract.md",
      "Algorithm/northbound_api_and_session_contract.md",
    ],
    schema_refs: [
      "Algorithm/schemas/cache_isolation_contract.schema.json",
      "Algorithm/schemas/customer_safe_projection_contract.schema.json",
      "Algorithm/schemas/stream_recovery_contract.schema.json",
    ],
    recovery_mode: "CUSTOMER_SAFE_STREAM_RECOVERY_PLUS_CACHE_ISOLATION",
    notes: [
      "Portal continuity stays customer-safe and exact-context only; broader staff state may not bleed through cache reuse.",
    ],
    source_refs,
  },
  {
    contract_row_ref: "contract.upload_session_recovery",
    label: "Upload-session recovery",
    family_ref: "family.upload_session_recovery",
    stream_scope_class_or_null: null,
    primary_contract_refs: [
      "Algorithm/upload_session_request_binding_and_rebase_contract.md",
      "Algorithm/upload_session_recovery_harness_contract.md",
      "Algorithm/northbound_api_and_session_contract.md",
    ],
    schema_refs: [
      "Algorithm/schemas/upload_session_recovery_harness.schema.json",
      "Algorithm/schemas/cache_isolation_contract.schema.json",
    ],
    recovery_mode: "REQUEST_REBASE_AND_ROUTE_BOUND_PROGRESS_RESTORE",
    notes: [
      "Upload continuity is request-binding- and rebase-driven rather than a free-form stream token cache.",
    ],
    source_refs,
  },
  {
    contract_row_ref: "contract.native_operator_hydration",
    label: "Native hydration continuity",
    family_ref: "family.native_operator_hydration",
    stream_scope_class_or_null: "WORKSPACE",
    primary_contract_refs: [
      "Algorithm/native_cache_hydration_purge_and_rebase_contract.md",
      "Algorithm/cache_isolation_and_secure_reuse_contract.md",
      "Algorithm/stream_resume_and_catch_up_ordering_contract.md",
    ],
    schema_refs: [
      "Algorithm/schemas/native_cache_hydration_contract.schema.json",
      "Algorithm/schemas/cache_isolation_contract.schema.json",
      "Algorithm/schemas/stream_recovery_contract.schema.json",
    ],
    recovery_mode: "NATIVE_CACHE_HYDRATION_PLUS_STREAM_RECOVERY",
    notes: [
      "Native restore requires compatibility-before-render and same-object same-shell legality even when local disk cache exists.",
    ],
    source_refs,
  },
];

export function createCachePartitionKeyContract(
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): CachePartitionKeyContract {
  return {
    schema_version: "1.0",
    contract_id: "cache_partition_key_contract",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    key_rows: clone(partitionKeyRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Provider-specific hot-key sharding or memory-tier tuning remains intentionally unresolved until the platform cache product is selected.",
    ],
    notes: [
      "No cache key is lawful if it drops tenant, session, route, or masking identity for convenience.",
    ],
  };
}

export function createResumeTokenBindingPolicy(
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): ResumeTokenBindingPolicy {
  return {
    schema_version: "1.0",
    policy_id: "resume_token_binding_policy",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    binding_rows: clone(resumeBindingRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Exact resume expiry TTL and store-level eviction knobs remain platform-specific and are deferred until provider adoption.",
    ],
    notes: [
      "Resume lineage is authoritative only as a hashed envelope plus legality posture. Raw tokens are never cache identity.",
    ],
  };
}

export function createTtlAndInvalidationMatrix(
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): TtlAndInvalidationMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "ttl_and_invalidation_matrix",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    family_ttl_rows: clone(familyTtlRows),
    invalidation_rows: clone(invalidationRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Provider eviction-policy mechanics remain deferred because TTL law here is semantic and platform-neutral first.",
    ],
    notes: [
      "TTL never overrides purge law. Any scope, masking, or session invalidation event beats the clock immediately.",
    ],
  };
}

export function createLocalVsSharedCachePolicy(
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): LocalVsSharedCachePolicy {
  return {
    schema_version: "1.0",
    policy_id: "local_vs_shared_cache_policy",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    class_rows: clone(localSharedPolicyRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Concrete browser storage APIs and native persistence adapters remain implementation-specific and are intentionally not frozen as provider choices here.",
    ],
    notes: [
      "Local speed is lawful only when bounded, purgeable, and subordinate to the same identity envelope as the shared cache.",
    ],
  };
}

export function createStreamResumeContractMap(
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): StreamResumeContractMap {
  return {
    schema_version: "1.0",
    map_id: "stream_resume_contract_map",
    selection_status: selectionStatus,
    topology_mode: topologyMode,
    rows: clone(contractMapRows),
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Upload-session recovery does not use one generic stream scope, so its contract bridge remains intentionally specialized.",
    ],
    notes: [
      "The map exists so later shell, portal, and native workers can bind to explicit recovery law instead of inferring it from cache code.",
    ],
  };
}

export function createCacheInventoryTemplate(
  runContext: Partial<MinimalRunContext> = {},
  selectionStatus: CacheSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  providerFamilySelection: CacheProviderFamily | null = null,
): CacheInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "cache_resume_inventory",
    provider_id: CACHE_PROVIDER_ID,
    flow_id: CACHE_FLOW_ID,
    policy_version: CACHE_POLICY_VERSION,
    run_id: runContext.runId ?? "run-template-cache-resume-topology-001",
    workspace_id:
      runContext.workspaceId ?? "wk-local-provisioning-cache-resume-topology",
    operator_identity_alias:
      runContext.operatorIdentityAlias ?? "ops.cache.bootstrap",
    selection_status: selectionStatus,
    managed_default_status: managedDefaultStatusFor(selectionStatus),
    selected_provider_family_or_null: providerFamilySelection,
    topology_mode: topologyMode,
    provider_option_rows: clone(providerOptionRows),
    environment_rows: clone(environmentRows),
    family_rows: clone(familyRows),
    cache_partition_key_contract_ref: "config/cache/cache_partition_key_contract.json",
    resume_token_binding_policy_ref: "config/cache/resume_token_binding_policy.json",
    ttl_and_invalidation_matrix_ref: "config/cache/ttl_and_invalidation_matrix.json",
    local_vs_shared_cache_policy_ref: "config/cache/local_vs_shared_cache_policy.json",
    stream_resume_contract_map_ref: "config/cache/stream_resume_contract_map.json",
    source_refs: clone(sourceRefs),
    typed_gaps: [
      "Platform provider selection is unresolved, so live namespace creation, ACL application, and encryption binding remain blocked while the logical topology is still frozen.",
      "Concrete runtime secret aliases remain logical refs only until provider adoption and environment binding occur.",
    ],
    notes: [
      "No raw resume token, session cookie, bearer credential, or authority credential appears in this inventory.",
      "Cache loss, warm restart, and namespace recreation must remain operationally survivable because durable truth lives elsewhere.",
    ],
    last_verified_at: CACHE_LAST_VERIFIED_AT,
  };
}

export function createResumeIsolationAtlasViewModel(): ResumeIsolationAtlasViewModel {
  return {
    routeId: "resume-isolation-atlas",
    providerDisplayName: "Cache / Resume Isolation Store",
    providerMonogram: "CAC",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    managedDefaultStatus: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    isolationChipLabel: "Disposable Cache / Durable Truth",
    topologyModeLabel:
      "Disposable shared cache + route-bound resume envelopes + strict partition isolation",
    summary:
      "The shared cache accelerates server-authored projections and hashed resume envelopes, but every reuse path stays subordinate to route, session, access, masking, and object identity. Cache loss is tolerable; cache broadening is not.",
    notes: [
      "Caches and resume stores are rebuildable accelerators, never the legal source of route or visibility truth.",
      "Raw resume tokens remain transport material only. Persisted state stores hashed envelopes, frontier, and invalidation posture.",
      "Tenant, client, access, masking, route, object, and preview drift all beat TTL immediately.",
    ],
    environments: clone(environmentRows).map((row) => ({
      environment_ref: row.environment_ref,
      label: row.label,
      namespace_prefix: row.namespace_prefix,
      recovery_posture: row.recovery_posture,
    })),
    families: clone(familyRows).map((family) => {
      const ttlRow = familyTtlRows.find((row) => row.family_ref === family.family_ref);
      const partitionRow = partitionKeyRows.find(
        (row) => row.family_ref === family.family_ref,
      );
      return {
        family_ref: family.family_ref,
        label: family.label,
        route_identity_pattern: family.route_identity_pattern,
        visibility_label: family.visibility_partition_required
          ? "Visibility partition required"
          : "Visibility partition cleared",
        ttl_summary: ttlRow
          ? `${ttlRow.shared_ttl_seconds}s shared / ${ttlRow.local_ttl_seconds_or_null ?? 0}s local`
          : "No TTL defined",
        local_policy_summary:
          partitionRow?.local_persistence_policy ?? "NO_LOCAL_PERSISTENCE",
        description: family.notes[0] ?? family.label,
      };
    }),
    partitionRows: clone(partitionKeyRows).map((row) => ({
      partition_ref: row.partition_ref,
      family_ref: row.family_ref,
      label: row.label,
      key_template: row.key_template,
      key_segments: row.key_segments,
      visibility_partition_required: row.visibility_partition_required,
      preview_subject_required: row.preview_subject_required,
      local_persistence_policy: row.local_persistence_policy,
      note: row.notes[0] ?? row.key_template,
    })),
    resumeRows: clone(resumeBindingRows).map((row) => ({
      policy_ref: row.policy_ref,
      family_ref: row.family_ref,
      label: row.label,
      envelope_fields: row.envelope_fields,
      required_binding_dimensions: row.required_binding_dimensions,
      delivery_window_states: row.delivery_window_states,
      local_persistence_policy: row.local_persistence_policy,
      note: row.notes[0] ?? row.shared_store_role,
    })),
    invalidationRows: clone(invalidationRows).map((row) => ({
      trigger_ref: row.trigger_ref,
      label: row.label,
      affected_family_refs: row.affected_family_refs,
      shared_cache_action: row.shared_cache_action,
      local_cache_action: row.local_cache_action,
      resume_action: row.resume_action,
      stale_render_posture: row.stale_render_posture,
      mutation_gate: row.mutation_gate,
      severity: row.severity,
      note: row.notes[0] ?? row.stale_render_posture,
    })),
    localSharedRows: clone(localSharedPolicyRows).map((row) => ({
      class_ref: row.class_ref,
      label: row.label,
      applicable_family_refs: row.applicable_family_refs,
      shared_store_policy: row.shared_store_policy,
      local_store_policy: row.local_store_policy,
      never_local: row.never_local,
      never_shared: row.never_shared,
      note: row.notes[0] ?? row.local_store_policy,
    })),
    contractRows: clone(contractMapRows).map((row) => ({
      contract_row_ref: row.contract_row_ref,
      family_ref: row.family_ref,
      label: row.label,
      primary_contract_refs: row.primary_contract_refs,
      schema_refs: row.schema_refs,
      recovery_mode: row.recovery_mode,
      note: row.notes[0] ?? row.recovery_mode,
    })),
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedFamilyRef: "family.client_portal_workspace",
    selectedFocusKind: "family",
    selectedFocusRef: "family.client_portal_workspace",
  };
}

function stableInventoryComparable(
  inventory: CacheInventoryTemplate,
): Record<string, unknown> {
  return {
    ...inventory,
    run_id: "__RUN__",
    workspace_id: "__WORKSPACE__",
    operator_identity_alias: "__OPERATOR__",
    last_verified_at: "__VERIFIED_AT__",
  };
}

export function validateCachePartitionKeyContract(
  contract: CachePartitionKeyContract,
): void {
  const familyRefs = new Set(familyRows.map((row) => row.family_ref));
  const seen = new Set<string>();

  contract.key_rows.forEach((row) => {
    assert(!seen.has(row.partition_ref), `Duplicate partition ref ${row.partition_ref}`);
    seen.add(row.partition_ref);
    assert(
      familyRefs.has(row.family_ref),
      `Unknown family ref ${row.family_ref} on ${row.partition_ref}`,
    );
    [
      "tenant_id",
      "session_binding_hash",
      "route_identity_ref",
      "canonical_object_ref",
    ].forEach((dimension) => {
      assert(
        row.key_segments.includes(dimension),
        `Partition ${row.partition_ref} is missing required dimension ${dimension}`,
      );
    });
    if (row.visibility_partition_required) {
      assert(
        row.key_segments.includes("visibility_cache_partition_key_or_null"),
        `Partition ${row.partition_ref} requires visibility partition identity`,
      );
    }
    if (row.family_ref === "family.upload_session_recovery") {
      assert(
        row.key_segments.includes("request_binding_hash") &&
          row.key_segments.includes("request_rebase_generation"),
        "Upload-session partition must bind request hash and rebase generation",
      );
    }
    if (row.family_ref === "family.native_operator_hydration") {
      assert(
        row.key_segments.includes("session_lineage_ref_or_null") &&
          row.key_segments.includes("schema_compatibility_ref") &&
          row.key_segments.includes("projection_guard_ref"),
        "Native hydration partition must bind session lineage, schema compatibility, and projection guard",
      );
    }
  });
}

export function validateResumeTokenBindingPolicy(
  policy: ResumeTokenBindingPolicy,
): void {
  const familyRefs = new Set(familyRows.map((row) => row.family_ref));

  policy.binding_rows.forEach((row) => {
    assert(
      familyRefs.has(row.family_ref),
      `Unknown family ref ${row.family_ref} on ${row.policy_ref}`,
    );
    assert(
      row.raw_resume_token_policy === "TRANSPORT_ONLY_NEVER_PERSIST_RAW_TOKEN",
      `Resume policy ${row.policy_ref} must keep raw tokens transport-only`,
    );
    assert(
      !row.envelope_fields.includes("raw_resume_token") &&
        !row.envelope_fields.includes("resume_token"),
      `Resume policy ${row.policy_ref} must not persist raw token fields`,
    );
    [
      "route_identity_ref",
      "canonical_object_ref",
      "session_binding_hash",
    ].forEach((dimension) => {
      assert(
        row.required_binding_dimensions.includes(dimension),
        `Resume policy ${row.policy_ref} is missing ${dimension}`,
      );
    });
    assert(
      row.delivery_window_states.includes("REBASE_REQUIRED") &&
        row.delivery_window_states.includes("ACCESS_REBIND_REQUIRED"),
      `Resume policy ${row.policy_ref} must express both rebase and access-rebind posture`,
    );
  });
}

export function validateTtlAndInvalidationMatrix(
  matrix: TtlAndInvalidationMatrix,
): void {
  const familyRefs = new Set(familyRows.map((row) => row.family_ref));
  const ttlFamilyRefs = new Set(matrix.family_ttl_rows.map((row) => row.family_ref));

  familyRefs.forEach((familyRef) => {
    assert(
      ttlFamilyRefs.has(familyRef),
      `TTL matrix is missing family ${familyRef}`,
    );
  });

  const requiredTriggers = [
    "trigger.tenant_switch",
    "trigger.client_switch",
    "trigger.privilege_downgrade",
    "trigger.masking_tightening",
    "trigger.route_or_object_drift",
    "trigger.session_revoked",
    "trigger.step_up_completed",
    "trigger.request_rebase",
    "trigger.schema_incompatible",
    "trigger.cache_only_restore",
  ];

  requiredTriggers.forEach((triggerRef) => {
    assert(
      matrix.invalidation_rows.some((row) => row.trigger_ref === triggerRef),
      `TTL matrix is missing invalidation trigger ${triggerRef}`,
    );
  });
}

export function validateLocalVsSharedCachePolicy(
  policy: LocalVsSharedCachePolicy,
): void {
  const rawToken = policy.class_rows.find(
    (row) => row.class_ref === "class.raw_resume_token",
  );
  const sessionCred = policy.class_rows.find(
    (row) => row.class_ref === "class.session_cookie_or_bearer",
  );
  const providerCred = policy.class_rows.find(
    (row) => row.class_ref === "class.authority_or_provider_credential",
  );

  [rawToken, sessionCred, providerCred].forEach((row) => {
    assert(row, "Forbidden cache class row is missing");
    assert(row.never_local, `${row.class_ref} must never persist locally`);
    assert(row.never_shared, `${row.class_ref} must never persist in shared cache`);
  });
}

export function validateStreamResumeContractMap(
  map: StreamResumeContractMap,
): void {
  const familyRefs = new Set(familyRows.map((row) => row.family_ref));
  map.rows.forEach((row) => {
    assert(
      familyRefs.has(row.family_ref),
      `Unknown family ref ${row.family_ref} on ${row.contract_row_ref}`,
    );
    assert(
      row.primary_contract_refs.length >= 2,
      `Contract row ${row.contract_row_ref} must bind multiple law sources`,
    );
    assert(
      row.schema_refs.length >= 1,
      `Contract row ${row.contract_row_ref} must point to schema-level law`,
    );
  });
}

function createCacheResumeStoreRunbookMarkdown(): string {
  const providerLines = providerOptionRows
    .map(
      (row) =>
        `- \`${row.provider_family}\` (${row.provider_label}): ${row.docs_urls
          .map((url) => `<${url}>`)
          .join(", ")}`,
    )
    .join("\n");

  return `# Cache And Resume Store Runbook

- Last verified: ${CACHE_LAST_VERIFIED_AT}
- Flow ID: \`${CACHE_FLOW_ID}\`
- Provider posture: \`PROVIDER_SELECTION_REQUIRED\`
- Topology mode: \`${topologyMode}\`

## Purpose

Freeze the disposable shared-cache and route-bound resume topology for manifest shells, workspace continuity,
portal continuity, upload-session recovery, and native hydration without letting cache speed outrun legal visibility.

## Non-negotiable boundaries

- Caches and resume stores are accelerators only. They are never the legal source of route, session, visibility, or workflow truth.
- Raw resume tokens are transport material only. Persisted state stores hashed envelopes, frontier, and invalidation posture only.
- Tenant, client, session, access, masking, route, object, and preview drift all invalidate reuse immediately even if TTL remains.
- Cache-only restoration may restore bounded read-only context only. Mutation remains blocked until fresh legality is re-established.
- Structured cache purge also clears local derivatives that could leak stale legal posture: scene restoration payloads, previews, temp exports, and local indices.

## Surface families

- Manifest experience
- Collaboration workspace
- Client portal workspace
- Upload-session recovery
- Native hydration

## Provider options reviewed

${providerLines}

## Bootstrap sequence

1. Resolve whether the platform has selected a cache provider family. If not, keep the topology in portable blocked-contract mode.
2. Materialize or adopt the sanitized inventory under \`data/provisioning/cache_inventory.template.json\`.
3. Freeze the partition-key contract, resume-token binding policy, TTL plus invalidation matrix, local-versus-shared policy, and contract-map bridge.
4. Wire the atlas payload into the provisioning viewer so operators can inspect identity, resume law, TTL, and purge posture without using provider-console vocabulary.
5. When a cache provider is later selected, bind namespaces, ACLs, and runtime aliases without altering the logical family refs, key law, or invalidation semantics.

## Recovery posture

- Shared-cache loss is recoverable by re-reading durable projections, snapshots, and stream fronts from server truth.
- Resume metadata loss is recoverable by issuing a fresh snapshot or explicit rebase rather than replaying guessed local continuity.
- Native disk cache loss is acceptable; relaunch falls back to fresh snapshot and live legality.
- Restore drills must prove cold-cache behavior, schema-drift purge, access-rebind posture, and cache-only restoration gates before promotion.

## Typed gaps

- Concrete cache product, namespace creation, ACL surface, and encryption binding remain blocked by platform/provider selection.
- Runtime secret aliases remain logical refs only; live credentials are deferred to the future provider-adoption pass.
`;
}

export async function provisionCacheAndStreamResumeStore(options: {
  runContext: MinimalRunContext;
  inventoryPath: string;
  existingInventoryPath?: string;
  providerFamilySelection?: CacheProviderFamily | null;
}): Promise<ProvisionCacheResult> {
  const selectionStatus: CacheSelectionStatus = options.providerFamilySelection
    ? "PROVIDER_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";

  const cachePartitionKeyContract = createCachePartitionKeyContract(selectionStatus);
  const resumeTokenBindingPolicy = createResumeTokenBindingPolicy(selectionStatus);
  const ttlAndInvalidationMatrix = createTtlAndInvalidationMatrix(selectionStatus);
  const localVsSharedCachePolicy = createLocalVsSharedCachePolicy(selectionStatus);
  const streamResumeContractMap = createStreamResumeContractMap(selectionStatus);

  validateCachePartitionKeyContract(cachePartitionKeyContract);
  validateResumeTokenBindingPolicy(resumeTokenBindingPolicy);
  validateTtlAndInvalidationMatrix(ttlAndInvalidationMatrix);
  validateLocalVsSharedCachePolicy(localVsSharedCachePolicy);
  validateStreamResumeContractMap(streamResumeContractMap);

  const inventory = createCacheInventoryTemplate(
    options.runContext,
    selectionStatus,
    options.providerFamilySelection ?? null,
  );

  let adoptionStep: ProvisionCacheStep = {
    step_id: "cache.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized cache and resume inventory will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as CacheInventoryTemplate;
      if (
        JSON.stringify(stableInventoryComparable(existingInventory)) !==
        JSON.stringify(stableInventoryComparable(inventory))
      ) {
        return {
          outcome: "CACHE_RESUME_TOPOLOGY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          inventory,
          cachePartitionKeyContract,
          resumeTokenBindingPolicy,
          ttlAndInvalidationMatrix,
          localVsSharedCachePolicy,
          streamResumeContractMap,
          atlasViewModel: createResumeIsolationAtlasViewModel(),
          steps: [
            {
              step_id: "cache.resolve-provider-selection",
              title: "Resolve cache provider family",
              status: options.providerFamilySelection
                ? "SUCCEEDED"
                : "BLOCKED_BY_POLICY",
              reason: options.providerFamilySelection
                ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
                : "Provider family remains unresolved, so the flow stays in portable blocked-contract mode.",
            },
            {
              step_id: "cache.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing cache inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because cache topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "cache.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "cache.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized cache and resume inventory will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  const steps: ProvisionCacheStep[] = [
    {
      step_id: "cache.resolve-provider-selection",
      title: "Resolve cache provider family",
      status: options.providerFamilySelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.providerFamilySelection
        ? `Provider family ${options.providerFamilySelection} was supplied explicitly.`
        : "The dependency and infrastructure cards still leave the cache product as a platform choice, so live namespace creation remains blocked.",
    },
    {
      step_id: "cache.freeze-partition-identity",
      title: "Freeze partition-key identity contract",
      status: "SUCCEEDED",
      reason:
        "Partition-key law now binds tenant, session, access, masking, route, object, and preview scope explicitly for every cache family.",
    },
    {
      step_id: "cache.freeze-resume-binding",
      title: "Freeze resume-token binding policy",
      status: "SUCCEEDED",
      reason:
        "Resume envelopes now expose hashed bindings, frontier, delivery-window posture, and raw-token transport-only rules for every governed family.",
    },
    {
      step_id: "cache.freeze-ttl-and-invalidation",
      title: "Freeze TTL and invalidation matrix",
      status: "SUCCEEDED",
      reason:
        "Tenant switch, access drift, masking change, session revocation, request rebase, schema incompatibility, and cache-only restore posture are now machine-readable.",
    },
    {
      step_id: "cache.freeze-local-shared-boundaries",
      title: "Freeze local versus shared boundaries",
      status: "SUCCEEDED",
      reason:
        "The cache pack now distinguishes shared snapshot classes, local restore hints, native disk cache, temp artifacts, and forbidden credential or token material.",
    },
    adoptionStep,
    {
      step_id: "cache.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason:
        "Sanitized inventory persisted with logical refs, namespace prefixes, and provider-option rows only.",
    },
  ];

  return {
    outcome: options.providerFamilySelection
      ? "CACHE_RESUME_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "CACHE_RESUME_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    inventory,
    cachePartitionKeyContract,
    resumeTokenBindingPolicy,
    ttlAndInvalidationMatrix,
    localVsSharedCachePolicy,
    streamResumeContractMap,
    atlasViewModel: createResumeIsolationAtlasViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const cachePartitionKeyContract = createCachePartitionKeyContract();
  const resumeTokenBindingPolicy = createResumeTokenBindingPolicy();
  const ttlAndInvalidationMatrix = createTtlAndInvalidationMatrix();
  const localVsSharedCachePolicy = createLocalVsSharedCachePolicy();
  const streamResumeContractMap = createStreamResumeContractMap();
  const inventory = createCacheInventoryTemplate();
  const atlasViewModel = createResumeIsolationAtlasViewModel();
  const runbookMarkdown = createCacheResumeStoreRunbookMarkdown();

  const writes: Array<[string, string]> = [
    [
      "config/cache/cache_partition_key_contract.json",
      `${JSON.stringify(cachePartitionKeyContract, null, 2)}\n`,
    ],
    [
      "config/cache/resume_token_binding_policy.json",
      `${JSON.stringify(resumeTokenBindingPolicy, null, 2)}\n`,
    ],
    [
      "config/cache/ttl_and_invalidation_matrix.json",
      `${JSON.stringify(ttlAndInvalidationMatrix, null, 2)}\n`,
    ],
    [
      "config/cache/local_vs_shared_cache_policy.json",
      `${JSON.stringify(localVsSharedCachePolicy, null, 2)}\n`,
    ],
    [
      "config/cache/stream_resume_contract_map.json",
      `${JSON.stringify(streamResumeContractMap, null, 2)}\n`,
    ],
    [
      "data/provisioning/cache_inventory.template.json",
      `${JSON.stringify(inventory, null, 2)}\n`,
    ],
    ["docs/provisioning/cache_and_resume_store_runbook.md", runbookMarkdown],
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
  sampleRun.resumeIsolationAtlas = atlasViewModel;
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
