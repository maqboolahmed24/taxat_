import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const POSTGRES_PROVIDER_ID = "postgres-control-audit-store";
export const POSTGRES_FLOW_ID =
  "provision-primary-postgresql-control-store-and-append-only-audit-store";
export const POSTGRES_POLICY_VERSION = "1.0";
export const POSTGRES_LAST_VERIFIED_AT = "2026-04-18T12:45:00Z";

export type PostgresServiceType =
  | "MANAGED_POSTGRESQL"
  | "SELF_HOSTED_POSTGRESQL";

export type PostgresSelectionStatus =
  | "PROVIDER_SELECTION_REQUIRED"
  | "SERVICE_TYPE_SELECTED";

export type PostgresTopologyMode =
  "SINGLE_CLUSTER_TWO_DATABASES_HARD_BOUNDARY";

export interface SourceRef {
  source_file: string;
  source_heading_or_logical_block: string;
  source_ref: string;
  rationale: string;
}

export interface ProviderServiceOption {
  service_type: PostgresServiceType;
  selection_state:
    | "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION"
    | "SELF_HOST_DECISION_REQUIRED";
  summary: string;
  fit_notes: string[];
  docs_urls: string[];
  source_refs: SourceRef[];
}

export interface EnvironmentTopologyRow {
  environment_ref: string;
  label: string;
  cluster_alias: string;
  provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  region_selector_ref: string;
  region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION";
  residency_class:
    | "LOCAL_ONLY_NON_AUTHORITATIVE"
    | "UK_NON_PRODUCTION_PRIMARY"
    | "UK_PREPRODUCTION_PRIMARY"
    | "UK_PRODUCTION_PRIMARY"
    | "UK_RESTORE_DRILL_ISOLATED";
  ha_posture:
    | "LOCAL_SINGLE_NODE_ONLY"
    | "SINGLE_PRIMARY_WITH_STANDBY_REQUIRED"
    | "MULTI_ZONE_SYNCHRONOUS_STANDBY_REQUIRED"
    | "RESTORE_ONLY_NO_COMMIT_TRAFFIC";
  read_replica_posture:
    | "NONE"
    | "OPTIONAL_READ_ONLY_REPLICA"
    | "REQUIRED_READ_ONLY_REPLICA"
    | "RESTORE_READ_ONLY_UNTIL_GATES_PASS";
  control_secret_alias_ref: string;
  audit_secret_alias_ref: string;
  wal_archive_policy_ref: string;
  restore_profile_ref: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface StoreTopologyRow {
  store_ref: string;
  label: string;
  store_kind:
    | "CONTROL_STORE"
    | "AUDIT_STORE"
    | "READ_REPLICA_PROFILE"
    | "RESTORE_PROFILE";
  database_name_or_null: string | null;
  schema_names: string[];
  owner_role_ref: string;
  runtime_role_refs: string[];
  topology_posture: string;
  append_only_posture:
    | "NOT_APPLICABLE"
    | "TRIGGER_GUARDED_APPEND_ONLY_LEDGER";
  order_guarantee: string;
  retention_or_restore_posture: string;
  source_refs: SourceRef[];
  notes: string[];
}

export interface RolePrivilegeRow {
  role_ref: string;
  role_name: string;
  label: string;
  actor_class:
    | "OWNER"
    | "MIGRATION"
    | "RUNTIME_API"
    | "ORCHESTRATOR"
    | "WORKER"
    | "READ_MODEL_CONSUMER"
    | "AUDIT_INVESTIGATOR"
    | "BACKUP_RESTORE"
    | "BREAK_GLASS"
    | "PARTITION_MAINTAINER";
  login_posture: "NOLOGIN_GROUP_ROLE";
  store_refs: string[];
  privilege_band:
    | "CONTROL_MUTATION"
    | "CONTROL_READ_ONLY"
    | "AUDIT_APPEND_ONLY"
    | "AUDIT_READ_ONLY"
    | "DDL_AND_DEFAULT_PRIVILEGES"
    | "BACKUP_AND_RESTORE"
    | "EMERGENCY_BREAK_GLASS"
    | "PARTITION_RETENTION_MAINTENANCE";
  capabilities: string[];
  forbidden_capabilities: string[];
  schema_scopes: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface RoleMembershipRow {
  membership_ref: string;
  parent_role_ref: string;
  member_role_ref: string;
  set_option: boolean;
  inherit_option: boolean;
  admin_option: boolean;
  source_refs: SourceRef[];
  rationale: string;
}

export interface RoleAndPrivilegeMatrix {
  schema_version: "1.0";
  matrix_id: "postgres_role_and_privilege_matrix";
  selection_status: PostgresSelectionStatus;
  topology_mode: PostgresTopologyMode;
  summary: {
    role_count: number;
    membership_count: number;
    control_mutation_role_count: number;
    audit_append_only_role_count: number;
    backup_restore_role_count: number;
  };
  role_rows: RolePrivilegeRow[];
  membership_rows: RoleMembershipRow[];
  source_refs: SourceRef[];
  typed_gaps: string[];
}

export interface PitrEnvironmentPolicyRow {
  environment_ref: string;
  cluster_alias: string;
  recovery_tier_class: "TIER_0_CONTROL_PLANE";
  rpo_class: "RPO_15M";
  rto_class: "RTO_60M";
  wal_level: "replica";
  archive_mode: "on";
  archive_timeout_seconds: number;
  base_backup_cadence: string;
  wal_archive_readiness_rule: string;
  restore_validation_steps: string[];
  privacy_reconciliation_required: true;
  queue_rebuild_required: true;
  authority_rebuild_required: true;
  authority_binding_revalidation_required: true;
  source_refs: SourceRef[];
}

export interface RestoreGateRow {
  gate_ref: string;
  gate_code:
    | "RESTORE_EVIDENCE_BOUND"
    | "PRIVACY_RECONCILIATION_BOUND"
    | "AUDIT_CONTINUITY_VERIFIED"
    | "QUEUE_REBUILD_VERIFIED"
    | "AUTHORITY_REBUILD_VERIFIED"
    | "AUTHORITY_BINDING_REVALIDATED";
  requirement: string;
  source_refs: SourceRef[];
}

export interface PitrBackupRestorePolicy {
  schema_version: "1.0";
  policy_id: "postgres_pitr_backup_restore_policy";
  selection_status: PostgresSelectionStatus;
  topology_mode: PostgresTopologyMode;
  wal_policy: {
    wal_level: "replica";
    archive_mode: "on";
    archive_timeout_seconds: number;
    deficiency_outcome:
      "BLOCK_WAL_ARCHIVE_DEFICIENCY_AND_RECORD_RESTORE_NOT_READY";
    monitoring_requirements: string[];
    docs_urls: string[];
  };
  environment_rows: PitrEnvironmentPolicyRow[];
  restore_gate_rows: RestoreGateRow[];
  migration_window_policy: {
    posture_id: "expand_migrate_contract_restore_boundaries";
    expand_posture: string;
    backfill_posture: string;
    contract_posture: string;
    rollback_boundary_policy: string;
    fail_forward_policy: string;
    replay_restore_policy: string;
    source_refs: SourceRef[];
  };
  source_refs: SourceRef[];
  typed_gaps: string[];
}

export interface AuditAppendOnlyEnforcementPolicy {
  schema_version: "1.0";
  policy_id: "postgres_audit_append_only_enforcement";
  selection_status: PostgresSelectionStatus;
  enforcement_mode:
    "TRIGGER_GUARDED_RANGE_PARTITIONED_APPEND_ONLY_LEDGER";
  audit_table_ref: "audit_ledger.audit_event_stream";
  stream_head_table_ref: "audit_admin.audit_stream_head";
  partitioning: {
    strategy: "RANGE_RECORDED_AT_MONTHLY_PLUS_DEFAULT";
    maintenance_path:
      "DETACH_AND_DROP_EXPIRED_PARTITION_ONLY_NO_ROW_MUTATION";
    ordering_index_ref: "audit_event_stream_order_lookup";
  };
  grant_posture: {
    insert_allowed_role_refs: string[];
    select_allowed_role_refs: string[];
    update_allowed_role_refs: [];
    delete_allowed_role_refs: [];
  };
  immutable_columns: string[];
  stream_ordering: {
    canonical_merge_key: ["audit_stream_ref", "stream_sequence"];
    monotonic_insert_guard:
      "audit_admin.guard_audit_event_insert";
    prev_hash_guard: "audit_admin.guard_audit_event_insert";
    reasoning: string;
  };
  mutation_violation: {
    sqlstate: "P0001";
    reason_code: "AUDIT_APPEND_ONLY_VIOLATION";
    surfaced_as: string[];
  };
  maintenance_exception_path: {
    allowed_path:
      "PARTITION_RETENTION_MAINTENANCE_AFTER_RETENTION_EXPIRY_ONLY";
    row_update_allowed: false;
    row_delete_allowed: false;
    source_refs: SourceRef[];
    rationale: string;
  };
  source_refs: SourceRef[];
  typed_gaps: string[];
}

export interface PostgresStoreInventoryTemplate {
  schema_version: "1.0";
  inventory_id: "postgres_store_inventory";
  provider_id: typeof POSTGRES_PROVIDER_ID;
  flow_id: typeof POSTGRES_FLOW_ID;
  policy_version: typeof POSTGRES_POLICY_VERSION;
  run_id: string;
  workspace_id: string;
  operator_identity_alias: string;
  selection_status: PostgresSelectionStatus;
  selected_service_type_or_null: PostgresServiceType | null;
  topology_mode: PostgresTopologyMode;
  provider_resolution_posture:
    "PLATFORM_PROVIDER_SELECTION_REQUIRED";
  cluster_shape_rationale: string;
  provider_service_options: ProviderServiceOption[];
  environment_rows: EnvironmentTopologyRow[];
  store_rows: StoreTopologyRow[];
  role_matrix_ref: "config/postgres/role_and_privilege_matrix.json";
  pitr_policy_ref: "config/postgres/pitr_backup_restore_policy.json";
  audit_policy_ref:
    "config/postgres/audit_append_only_enforcement.json";
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ControlAndAuditStoreLedgerViewModel {
  providerDisplayName: string;
  providerMonogram: string;
  selectionPosture: PostgresSelectionStatus;
  topologyModeLabel: string;
  restoreReadinessLabel: string;
  policyVersion: string;
  summary: string;
  notes: string[];
  environments: Array<{
    environment_ref: string;
    label: string;
    cluster_alias: string;
    residency_class: string;
    ha_posture: string;
    restore_profile_ref: string;
  }>;
  stores: Array<{
    store_ref: string;
    label: string;
    store_kind: StoreTopologyRow["store_kind"];
    database_name_or_null: string | null;
    schema_names: string[];
    owner_role_ref: string;
    runtime_role_refs: string[];
    topology_posture: string;
    append_only_posture: StoreTopologyRow["append_only_posture"];
    order_guarantee: string;
    retention_or_restore_posture: string;
    notes: string[];
  }>;
  roles: Array<{
    role_ref: string;
    label: string;
    actor_class: string;
    privilege_band: string;
    store_refs: string[];
    capabilities: string[];
    forbidden_capabilities: string[];
    schema_scopes: string[];
    notes: string[];
  }>;
  restorePolicies: Array<{
    policy_ref: string;
    label: string;
    rpo_class: string;
    rto_class: string;
    wal_summary: string;
    gate_codes: string[];
    note: string;
  }>;
  selectedEnvironmentRef: string;
  selectedStoreRef: string;
  selectedRoleRef: string;
  selectedRestorePolicyRef: string;
}

export interface ProvisionPostgresStep {
  step_id: string;
  title: string;
  status:
    | "SUCCEEDED"
    | "BLOCKED_BY_POLICY"
    | "SKIPPED_AS_ALREADY_PRESENT"
    | "BLOCKED_BY_DRIFT";
  reason: string;
}

export interface MinimalRunContext {
  runId: string;
  workspaceId: string;
  operatorIdentityAlias: string;
}

export interface ProvisionPrimaryPostgresqlResult {
  outcome:
    | "POSTGRES_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED"
    | "POSTGRES_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
    | "POSTGRES_TOPOLOGY_DRIFT_REVIEW_REQUIRED";
  selection_status: PostgresSelectionStatus;
  inventory: PostgresStoreInventoryTemplate;
  roleAndPrivilegeMatrix: RoleAndPrivilegeMatrix;
  pitrBackupRestorePolicy: PitrBackupRestorePolicy;
  auditAppendOnlyEnforcement: AuditAppendOnlyEnforcementPolicy;
  ledgerViewModel: ControlAndAuditStoreLedgerViewModel;
  steps: ProvisionPostgresStep[];
  notes: string[];
}

const postgresDocUrls = {
  pitr: "https://www.postgresql.org/docs/18/continuous-archiving.html",
  rowSecurity: "https://www.postgresql.org/docs/18/ddl-rowsecurity.html",
  partitioning: "https://www.postgresql.org/docs/18/ddl-partitioning.html",
  grant: "https://www.postgresql.org/docs/18/sql-grant.html",
  createRole: "https://www.postgresql.org/docs/18/sql-createrole.html",
  defaultPrivileges:
    "https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html",
  membership: "https://www.postgresql.org/docs/18/role-membership.html",
} as const;

const algorithmSourceRefs: SourceRef[] = [
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "1. Reference runtime topology",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L22[1._Reference_runtime_topology]",
    rationale:
      "The reference runtime topology names the primary control store and append-only audit store as separate bounded components.",
  },
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "3. Schema and datastore migration rules",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L65[3._Schema_and_datastore_migration_rules]",
    rationale:
      "Expand, backfill, and contract rules must remain machine-readable in the bootstrap topology.",
  },
  {
    source_file: "Algorithm/deployment_and_resilience_contract.md",
    source_heading_or_logical_block: "5. Backup, restore, and DR rules",
    source_ref:
      "Algorithm/deployment_and_resilience_contract.md::L140[5._Backup_restore_and_DR_rules]",
    rationale:
      "Checkpoint, restore, queue rebuild, privacy reconciliation, and authority rebuild gates are mandatory for Tier 0 truth.",
  },
  {
    source_file: "Algorithm/observability_and_audit_contract.md",
    source_heading_or_logical_block: "14.5 Audit event contract",
    source_ref:
      "Algorithm/observability_and_audit_contract.md::L156[14.5_Audit_event_contract]",
    rationale:
      "Audit ordering, append-only posture, and stream/hash-chain fields are defined here.",
  },
  {
    source_file: "Algorithm/observability_and_audit_contract.md",
    source_heading_or_logical_block: "Deterministic ordering rule",
    source_ref:
      "Algorithm/observability_and_audit_contract.md::L193[Deterministic_ordering_rule]",
    rationale:
      "Canonical audit order must derive from audit_stream_ref and stream_sequence rather than wall-clock time.",
  },
  {
    source_file: "Algorithm/data_model.md",
    source_heading_or_logical_block:
      "RunManifest, AuthorityInteractionRecord, SubmissionRecord, AuditEvent",
    source_ref:
      "Algorithm/data_model.md::L1091[RunManifest] / Algorithm/data_model.md::L2509[AuthorityInteractionRecord] / Algorithm/data_model.md::L2893[SubmissionRecord] / Algorithm/data_model.md::L3023[AuditEvent]",
    rationale:
      "The control store has to leave room for manifest, authority, submission, and restore metadata while the audit store preserves append-only event evidence.",
  },
  {
    source_file: "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md",
    source_heading_or_logical_block: "Decision",
    source_ref:
      "docs/architecture/adr/ADR-002-storage-and-eventing-topology.md::Decision",
    rationale:
      "ADR-002 already chose a relational-first control plane with an append-only audit store and left the exact product deferred.",
  },
  {
    source_file: "data/analysis/dependency_register.json",
    source_heading_or_logical_block:
      "PRIMARY_TRANSACTIONAL_CONTROL_STORE dependency row",
    source_ref:
      "data/analysis/dependency_register.json::PRIMARY_TRANSACTIONAL_CONTROL_STORE",
    rationale:
      "The dependency register still marks PostgreSQL as a procurement or platform choice, so provider details must fail closed instead of being invented.",
  },
  {
    source_file: "config/secrets/secret_alias_catalog.json",
    source_heading_or_logical_block:
      "postgresql control-store and audit-store aliases",
    source_ref:
      "config/secrets/secret_alias_catalog.json::alias.runtime.postgresql.control-store.password / alias.runtime.postgresql.audit-store.password",
    rationale:
      "Separate control and audit credentials already exist and the store topology must align with them.",
  },
];

const restoreGateSourceRefs: SourceRef[] = [
  {
    source_file: "data/analysis/recovery_checkpoint_reopen_matrix.json",
    source_heading_or_logical_block: "Recovery checkpoint gates",
    source_ref:
      "data/analysis/recovery_checkpoint_reopen_matrix.json::recovery_checkpoint_gate_restore_evidence_bound",
    rationale:
      "Restore readiness remains blocked until restore, privacy, audit, queue, and authority gates all pass.",
  },
];

const providerServiceOptions: ProviderServiceOption[] = [
  {
    service_type: "MANAGED_POSTGRESQL",
    selection_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    summary:
      "Managed PostgreSQL remains the preferred default once the underlying cloud platform is selected, but the cloud choice is still unresolved.",
    fit_notes: [
      "Allows portable SQL and privilege posture now without inventing AWS, GCP, Azure, or another managed control plane prematurely.",
      "Must still support WAL archiving, base backup, PITR, strict least privilege, and per-environment isolation.",
    ],
    docs_urls: [
      postgresDocUrls.pitr,
      postgresDocUrls.partitioning,
      postgresDocUrls.grant,
    ],
    source_refs: algorithmSourceRefs,
  },
  {
    service_type: "SELF_HOSTED_POSTGRESQL",
    selection_state: "SELF_HOST_DECISION_REQUIRED",
    summary:
      "A self-hosted cluster remains lawful if managed provider choice is rejected, but that is an explicit later platform decision rather than a silent fallback.",
    fit_notes: [
      "Must provide the same PITR, restore rehearsal, and role separation guarantees as the managed path.",
      "Cannot weaken archive, backup, encryption, or restore-readiness gates simply because the platform is self-hosted.",
    ],
    docs_urls: [
      postgresDocUrls.pitr,
      postgresDocUrls.createRole,
      postgresDocUrls.membership,
    ],
    source_refs: algorithmSourceRefs,
  },
];

const environmentRows: EnvironmentTopologyRow[] = [
  {
    environment_ref: "env_local_provisioning_workstation",
    label: "Local provisioning workstation",
    cluster_alias: "pg-local-control-audit-shadow",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    region_selector_ref: "region.local.shadow",
    region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    residency_class: "LOCAL_ONLY_NON_AUTHORITATIVE",
    ha_posture: "LOCAL_SINGLE_NODE_ONLY",
    read_replica_posture: "NONE",
    control_secret_alias_ref: "alias.runtime.postgresql.control-store.password",
    audit_secret_alias_ref: "alias.runtime.postgresql.audit-store.password",
    wal_archive_policy_ref: "policy.postgres.wal.local-shadow",
    restore_profile_ref: "profile.postgres.restore.local-shadow",
    source_refs: algorithmSourceRefs,
    notes: [
      "Local developer databases are not authoritative truth and must never be mistaken for Tier 0 recovery evidence.",
    ],
  },
  {
    environment_ref: "env_shared_sandbox_integration",
    label: "Shared sandbox integration",
    cluster_alias: "pg-sandbox-control-audit",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    region_selector_ref: "region.uk.sandbox.primary",
    region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    residency_class: "UK_NON_PRODUCTION_PRIMARY",
    ha_posture: "SINGLE_PRIMARY_WITH_STANDBY_REQUIRED",
    read_replica_posture: "OPTIONAL_READ_ONLY_REPLICA",
    control_secret_alias_ref: "alias.runtime.postgresql.control-store.password",
    audit_secret_alias_ref: "alias.runtime.postgresql.audit-store.password",
    wal_archive_policy_ref: "policy.postgres.wal.sandbox",
    restore_profile_ref: "profile.postgres.restore.sandbox",
    source_refs: algorithmSourceRefs,
    notes: [
      "Sandbox still requires WAL archiving and restore drills because authority and release verification depend on deterministic replay-safe truth.",
    ],
  },
  {
    environment_ref: "env_preproduction_verification",
    label: "Preproduction verification",
    cluster_alias: "pg-preprod-control-audit",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    region_selector_ref: "region.uk.preprod.primary",
    region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    residency_class: "UK_PREPRODUCTION_PRIMARY",
    ha_posture: "MULTI_ZONE_SYNCHRONOUS_STANDBY_REQUIRED",
    read_replica_posture: "REQUIRED_READ_ONLY_REPLICA",
    control_secret_alias_ref: "alias.runtime.postgresql.control-store.password",
    audit_secret_alias_ref: "alias.runtime.postgresql.audit-store.password",
    wal_archive_policy_ref: "policy.postgres.wal.preprod",
    restore_profile_ref: "profile.postgres.restore.preprod",
    source_refs: algorithmSourceRefs,
    notes: [
      "Preproduction must mirror production restore, migration, and reader-window posture closely enough to block unsafe promotion early.",
    ],
  },
  {
    environment_ref: "env_production",
    label: "Production",
    cluster_alias: "pg-production-control-audit",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    region_selector_ref: "region.uk.production.primary",
    region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    residency_class: "UK_PRODUCTION_PRIMARY",
    ha_posture: "MULTI_ZONE_SYNCHRONOUS_STANDBY_REQUIRED",
    read_replica_posture: "REQUIRED_READ_ONLY_REPLICA",
    control_secret_alias_ref: "alias.runtime.postgresql.control-store.password",
    audit_secret_alias_ref: "alias.runtime.postgresql.audit-store.password",
    wal_archive_policy_ref: "policy.postgres.wal.production",
    restore_profile_ref: "profile.postgres.restore.production",
    source_refs: algorithmSourceRefs,
    notes: [
      "Production keeps the strongest standby, PITR, and read-only replica posture, but replicas remain explicitly non-authoritative for commit truth.",
    ],
  },
  {
    environment_ref: "env_disaster_recovery_drill",
    label: "Disaster recovery drill",
    cluster_alias: "pg-drill-control-audit",
    provider_binding_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    region_selector_ref: "region.uk.restore.drill",
    region_resolution_state: "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
    residency_class: "UK_RESTORE_DRILL_ISOLATED",
    ha_posture: "RESTORE_ONLY_NO_COMMIT_TRAFFIC",
    read_replica_posture: "RESTORE_READ_ONLY_UNTIL_GATES_PASS",
    control_secret_alias_ref: "alias.runtime.postgresql.control-store.password",
    audit_secret_alias_ref: "alias.runtime.postgresql.audit-store.password",
    wal_archive_policy_ref: "policy.postgres.wal.drill",
    restore_profile_ref: "profile.postgres.restore.drill",
    source_refs: algorithmSourceRefs,
    notes: [
      "Restore drills begin read-only and cannot reopen until privacy reconciliation, queue rebuild, and authority rebuild gates are verified.",
    ],
  },
];

const storeRows: StoreTopologyRow[] = [
  {
    store_ref: "store.control.primary",
    label: "Control Store",
    store_kind: "CONTROL_STORE",
    database_name_or_null: "taxat_control",
    schema_names: [
      "control_manifest",
      "control_workflow",
      "control_receipt",
      "control_upload",
      "control_authority",
      "control_retention",
      "control_support",
      "meta_migration",
      "restore_verification",
    ],
    owner_role_ref: "role.pg.control.owner",
    runtime_role_refs: [
      "role.pg.control.runtime_api",
      "role.pg.control.orchestrator",
      "role.pg.control.worker",
      "role.pg.control.projector_ro",
    ],
    topology_posture:
      "Transactional source of truth for manifests, workflow, receipts, upload state, authority state, retention controls, and migration metadata.",
    append_only_posture: "NOT_APPLICABLE",
    order_guarantee:
      "Row-level business ordering is domain-specific; cross-object legal truth remains in transactional control tables, not in the broker or projections.",
    retention_or_restore_posture:
      "Tier 0 direct backup required; restore evidence and reopen gates persist in restore_verification schema.",
    source_refs: algorithmSourceRefs,
    notes: [
      "Later phase tables land in the named control schemas instead of mixing mutable truth and restore metadata arbitrarily.",
    ],
  },
  {
    store_ref: "store.audit.append_only",
    label: "Audit Store",
    store_kind: "AUDIT_STORE",
    database_name_or_null: "taxat_audit",
    schema_names: ["audit_ledger", "audit_admin"],
    owner_role_ref: "role.pg.audit.owner",
    runtime_role_refs: [
      "role.pg.audit.append_writer",
      "role.pg.audit.investigator_ro",
      "role.pg.audit.partition_maintainer",
    ],
    topology_posture:
      "Append-only evidence ledger for audit events, ingress receipts, provenance, replay attestations, and erasure proof references.",
    append_only_posture: "TRIGGER_GUARDED_APPEND_ONLY_LEDGER",
    order_guarantee:
      "Canonical event order is enforced per stream through stream heads plus indexes on audit_stream_ref and stream_sequence.",
    retention_or_restore_posture:
      "Tier 0 direct backup required; retention acts by detaching expired partitions rather than mutating rows in place.",
    source_refs: algorithmSourceRefs,
    notes: [
      "Mutable admin metadata is limited to stream heads and partition-maintenance support; evidence rows themselves stay append-only.",
    ],
  },
  {
    store_ref: "profile.read_replica",
    label: "Read Replica Profile",
    store_kind: "READ_REPLICA_PROFILE",
    database_name_or_null: null,
    schema_names: [],
    owner_role_ref: "role.pg.control.backup_restore",
    runtime_role_refs: ["role.pg.control.projector_ro"],
    topology_posture:
      "Read replicas may feed projections, investigations, or restore verification reads, but they never become commit truth.",
    append_only_posture: "NOT_APPLICABLE",
    order_guarantee:
      "Replica lag is observable only and cannot replace control or audit primary ordering guarantees.",
    retention_or_restore_posture:
      "Replica freshness must remain below the allowed lag threshold before it can serve non-authoritative read workloads.",
    source_refs: algorithmSourceRefs,
    notes: [
      "The viewer and runbook make replica-lag non-authoritative explicitly to close the common truth-source confusion gap.",
    ],
  },
  {
    store_ref: "profile.restore_drill",
    label: "Restore Drill Profile",
    store_kind: "RESTORE_PROFILE",
    database_name_or_null: null,
    schema_names: [],
    owner_role_ref: "role.pg.control.backup_restore",
    runtime_role_refs: ["role.pg.break_glass.operator"],
    topology_posture:
      "Restore drills hydrate a new control plus audit pair from backup plus WAL and stay blocked until all reopen gates pass.",
    append_only_posture: "NOT_APPLICABLE",
    order_guarantee:
      "Restore validation checks audit continuity, queue rebuild, and authority rebuild against the restored stream heads and control metadata.",
    retention_or_restore_posture:
      "Read-only until restore evidence, privacy reconciliation, audit continuity, queue rebuild, authority rebuild, and authority binding revalidation are all verified.",
    source_refs: algorithmSourceRefs,
    notes: [
      "Restore drills are promotion evidence only when bound to the same release-candidate identity and schema-reader window posture.",
    ],
  },
];

const roleRows: RolePrivilegeRow[] = [
  {
    role_ref: "role.pg.control.owner",
    role_name: "pg_control_owner",
    label: "Control owner",
    actor_class: "OWNER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary"],
    privilege_band: "DDL_AND_DEFAULT_PRIVILEGES",
    capabilities: [
      "CONNECT",
      "CREATE_SCHEMA",
      "ALTER_DEFAULT_PRIVILEGES",
      "CREATE_TABLE",
      "ALTER_TABLE",
      "OWN_CONTROL_OBJECTS",
    ],
    forbidden_capabilities: ["UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS"],
    schema_scopes: storeRows[0].schema_names,
    source_refs: algorithmSourceRefs,
    notes: [
      "Object ownership is separated from runtime use so application login roles do not own mutable truth tables.",
    ],
  },
  {
    role_ref: "role.pg.control.migrator",
    role_name: "pg_control_migrator",
    label: "Control migrator",
    actor_class: "MIGRATION",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary"],
    privilege_band: "DDL_AND_DEFAULT_PRIVILEGES",
    capabilities: [
      "CONNECT",
      "USAGE",
      "CREATE",
      "ALTER",
      "INSERT_MIGRATION_METADATA",
      "UPDATE_MIGRATION_METADATA",
    ],
    forbidden_capabilities: ["BYPASS_RLS", "ALTER_AUDIT_LEDGER_ROWS"],
    schema_scopes: ["meta_migration", "restore_verification", "control_support"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Migration DDL stays explicit and phase-bound; contract phases are blocked until reader-window and restore posture allow them.",
    ],
  },
  {
    role_ref: "role.pg.control.runtime_api",
    role_name: "pg_control_runtime_api",
    label: "Runtime API",
    actor_class: "RUNTIME_API",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary"],
    privilege_band: "CONTROL_MUTATION",
    capabilities: [
      "CONNECT",
      "USAGE",
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
    ],
    forbidden_capabilities: ["CREATE", "ALTER", "UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS"],
    schema_scopes: [
      "control_manifest",
      "control_workflow",
      "control_receipt",
      "control_upload",
      "control_authority",
      "control_retention",
    ],
    source_refs: algorithmSourceRefs,
    notes: [
      "Runtime API may mutate control truth but cannot mutate audit evidence in place.",
    ],
  },
  {
    role_ref: "role.pg.control.orchestrator",
    role_name: "pg_control_orchestrator",
    label: "Manifest orchestrator",
    actor_class: "ORCHESTRATOR",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary"],
    privilege_band: "CONTROL_MUTATION",
    capabilities: ["CONNECT", "USAGE", "SELECT", "INSERT", "UPDATE"],
    forbidden_capabilities: ["DELETE_AUDIT_ROWS", "ALTER", "CREATE"],
    schema_scopes: ["control_manifest", "control_workflow", "control_receipt"],
    source_refs: algorithmSourceRefs,
    notes: [
      "The orchestrator coordinates lifecycle and receipts but remains separated from DDL ownership.",
    ],
  },
  {
    role_ref: "role.pg.control.worker",
    role_name: "pg_control_worker",
    label: "Stage worker",
    actor_class: "WORKER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary"],
    privilege_band: "CONTROL_MUTATION",
    capabilities: ["CONNECT", "USAGE", "SELECT", "INSERT", "UPDATE"],
    forbidden_capabilities: ["DELETE", "ALTER", "CREATE"],
    schema_scopes: [
      "control_workflow",
      "control_receipt",
      "control_upload",
      "control_authority",
    ],
    source_refs: algorithmSourceRefs,
    notes: [
      "Workers can advance durable state only through the specific control schemas they own operationally.",
    ],
  },
  {
    role_ref: "role.pg.control.projector_ro",
    role_name: "pg_control_projector_ro",
    label: "Projector read-only consumer",
    actor_class: "READ_MODEL_CONSUMER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary", "profile.read_replica"],
    privilege_band: "CONTROL_READ_ONLY",
    capabilities: ["CONNECT", "USAGE", "SELECT"],
    forbidden_capabilities: ["INSERT", "UPDATE", "DELETE", "ALTER"],
    schema_scopes: storeRows[0].schema_names.filter(
      (schemaName) => schemaName !== "meta_migration",
    ),
    source_refs: algorithmSourceRefs,
    notes: [
      "Read-side consumers rebuild projections from control truth but never write back guessed legal state.",
    ],
  },
  {
    role_ref: "role.pg.audit.owner",
    role_name: "pg_audit_owner",
    label: "Audit owner",
    actor_class: "OWNER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.audit.append_only"],
    privilege_band: "DDL_AND_DEFAULT_PRIVILEGES",
    capabilities: [
      "CONNECT",
      "CREATE_SCHEMA",
      "ALTER_DEFAULT_PRIVILEGES",
      "CREATE_TABLE",
      "ALTER_TABLE",
      "OWN_AUDIT_OBJECTS",
    ],
    forbidden_capabilities: [],
    schema_scopes: ["audit_ledger", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Audit ownership remains separate from append writers and investigators so evidence mutation paths stay closed.",
    ],
  },
  {
    role_ref: "role.pg.audit.append_writer",
    role_name: "pg_audit_append_writer",
    label: "Audit append writer",
    actor_class: "WORKER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.audit.append_only"],
    privilege_band: "AUDIT_APPEND_ONLY",
    capabilities: ["CONNECT", "USAGE", "SELECT_STREAM_HEAD", "INSERT_AUDIT_EVENT"],
    forbidden_capabilities: ["UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS", "ALTER"],
    schema_scopes: ["audit_ledger", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Append writers can only insert new audit rows and update stream heads via trigger-owned logic.",
    ],
  },
  {
    role_ref: "role.pg.audit.investigator_ro",
    role_name: "pg_audit_investigator_ro",
    label: "Audit investigator",
    actor_class: "AUDIT_INVESTIGATOR",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.audit.append_only", "profile.read_replica"],
    privilege_band: "AUDIT_READ_ONLY",
    capabilities: ["CONNECT", "USAGE", "SELECT"],
    forbidden_capabilities: ["INSERT", "UPDATE", "DELETE", "ALTER"],
    schema_scopes: ["audit_ledger", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Investigators can read append-only evidence and stream heads but cannot alter rows or sequence state.",
    ],
  },
  {
    role_ref: "role.pg.audit.partition_maintainer",
    role_name: "pg_audit_partition_maintainer",
    label: "Partition maintainer",
    actor_class: "PARTITION_MAINTAINER",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.audit.append_only"],
    privilege_band: "PARTITION_RETENTION_MAINTENANCE",
    capabilities: [
      "CONNECT",
      "USAGE",
      "CREATE_PARTITION",
      "DETACH_PARTITION",
      "DROP_EXPIRED_PARTITION",
    ],
    forbidden_capabilities: ["UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS"],
    schema_scopes: ["audit_ledger", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Retention acts at partition boundaries; row mutation remains forbidden even for maintenance operators.",
    ],
  },
  {
    role_ref: "role.pg.control.backup_restore",
    role_name: "pg_control_backup_restore",
    label: "Backup and restore operator",
    actor_class: "BACKUP_RESTORE",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: [
      "store.control.primary",
      "store.audit.append_only",
      "profile.read_replica",
      "profile.restore_drill",
    ],
    privilege_band: "BACKUP_AND_RESTORE",
    capabilities: [
      "CONNECT",
      "SELECT",
      "BASE_BACKUP",
      "RESTORE_VERIFY",
      "RECORD_RESTORE_GATES",
    ],
    forbidden_capabilities: ["CREATE_ROLE", "ALTER_SYSTEM", "UPDATE_AUDIT_ROWS"],
    schema_scopes: ["meta_migration", "restore_verification", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "This role exists for drill and recovery work and still cannot bypass privacy, queue, or authority reopen gates.",
    ],
  },
  {
    role_ref: "role.pg.break_glass.operator",
    role_name: "pg_break_glass_operator",
    label: "Break-glass operator",
    actor_class: "BREAK_GLASS",
    login_posture: "NOLOGIN_GROUP_ROLE",
    store_refs: ["store.control.primary", "store.audit.append_only"],
    privilege_band: "EMERGENCY_BREAK_GLASS",
    capabilities: ["CONNECT", "SELECT", "SET_ROLE_WITH_APPROVAL"],
    forbidden_capabilities: ["UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS"],
    schema_scopes: ["control_support", "restore_verification", "audit_ledger", "audit_admin"],
    source_refs: algorithmSourceRefs,
    notes: [
      "Break-glass is read-mostly and approval-bound; it does not create a silent mutable bypass around the audit ledger.",
    ],
  },
];

const membershipRows: RoleMembershipRow[] = [
  {
    membership_ref: "membership.pg.control.runtime_api.to.control_owner",
    parent_role_ref: "role.pg.control.owner",
    member_role_ref: "role.pg.control.migrator",
    set_option: true,
    inherit_option: false,
    admin_option: false,
    source_refs: algorithmSourceRefs,
    rationale:
      "Migrator may SET ROLE into the owner only during explicit migration windows; runtime roles do not inherit ownership privileges.",
  },
];

const restoreGateRows: RestoreGateRow[] = [
  {
    gate_ref: "gate.restore_evidence_bound",
    gate_code: "RESTORE_EVIDENCE_BOUND",
    requirement:
      "Checkpoint cannot claim VERIFIED without bound restore drill evidence and verification basis.",
    source_refs: restoreGateSourceRefs,
  },
  {
    gate_ref: "gate.privacy_reconciliation_bound",
    gate_code: "PRIVACY_RECONCILIATION_BOUND",
    requirement:
      "Checkpoint cannot reopen until privacy reconciliation evidence is bound and reopen-safe.",
    source_refs: restoreGateSourceRefs,
  },
  {
    gate_ref: "gate.audit_continuity_verified",
    gate_code: "AUDIT_CONTINUITY_VERIFIED",
    requirement: "Audit continuity must be verified before reopen.",
    source_refs: restoreGateSourceRefs,
  },
  {
    gate_ref: "gate.queue_rebuild_verified",
    gate_code: "QUEUE_REBUILD_VERIFIED",
    requirement: "Queues must be rebuilt from durable truth before reopen.",
    source_refs: restoreGateSourceRefs,
  },
  {
    gate_ref: "gate.authority_rebuild_verified",
    gate_code: "AUTHORITY_REBUILD_VERIFIED",
    requirement:
      "Outstanding authority work must be rebuilt from durable receipts and records.",
    source_refs: restoreGateSourceRefs,
  },
  {
    gate_ref: "gate.authority_binding_revalidated",
    gate_code: "AUTHORITY_BINDING_REVALIDATED",
    requirement:
      "Authority binding lineage must be revalidated before authority-facing work resumes.",
    source_refs: restoreGateSourceRefs,
  },
];

export function createRoleAndPrivilegeMatrix(
  selectionStatus: PostgresSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): RoleAndPrivilegeMatrix {
  return {
    schema_version: "1.0",
    matrix_id: "postgres_role_and_privilege_matrix",
    selection_status: selectionStatus,
    topology_mode: "SINGLE_CLUSTER_TWO_DATABASES_HARD_BOUNDARY",
    summary: {
      role_count: roleRows.length,
      membership_count: membershipRows.length,
      control_mutation_role_count: roleRows.filter(
        (row) => row.privilege_band === "CONTROL_MUTATION",
      ).length,
      audit_append_only_role_count: roleRows.filter(
        (row) => row.privilege_band === "AUDIT_APPEND_ONLY",
      ).length,
      backup_restore_role_count: roleRows.filter(
        (row) => row.privilege_band === "BACKUP_AND_RESTORE",
      ).length,
    },
    role_rows: roleRows,
    membership_rows: membershipRows,
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "PROVIDER_REGION_NAMES_UNRESOLVED_UNTIL_PLATFORM_SELECTION",
      "LOGIN_ROLE_BINDINGS_AND_PASSWORD_ROTATION_ATTACH_LATER_TO_SECRET_ROOT_ALIASES",
    ],
  };
}

export function createPitrBackupRestorePolicy(
  selectionStatus: PostgresSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): PitrBackupRestorePolicy {
  const sharedRestoreSteps = [
    "Restore latest base backup into an isolated drill cluster.",
    "Replay archived WAL to the requested recovery target.",
    "Verify control migration metadata and reader-window compatibility.",
    "Verify audit continuity, including stream-head monotonicity and hash-chain posture where present.",
    "Rebuild queue state from durable truth and verify no broker artifact is treated as legal truth.",
    "Rebuild outstanding authority work from control plus audit stores and revalidate authority bindings.",
    "Run restore privacy reconciliation before any non-operator reopen.",
  ];

  return {
    schema_version: "1.0",
    policy_id: "postgres_pitr_backup_restore_policy",
    selection_status: selectionStatus,
    topology_mode: "SINGLE_CLUSTER_TWO_DATABASES_HARD_BOUNDARY",
    wal_policy: {
      wal_level: "replica",
      archive_mode: "on",
      archive_timeout_seconds: 60,
      deficiency_outcome:
        "BLOCK_WAL_ARCHIVE_DEFICIENCY_AND_RECORD_RESTORE_NOT_READY",
      monitoring_requirements: [
        "Monitor archive success and lag continuously.",
        "Fail closed if WAL archiving is missing, disabled, or falling behind the allowed recovery window.",
        "Back up configuration files separately because PITR does not restore postgresql.conf, pg_hba.conf, or pg_ident.conf.",
      ],
      docs_urls: [postgresDocUrls.pitr],
    },
    environment_rows: environmentRows.map((environmentRow) => ({
      environment_ref: environmentRow.environment_ref,
      cluster_alias: environmentRow.cluster_alias,
      recovery_tier_class: "TIER_0_CONTROL_PLANE",
      rpo_class: "RPO_15M",
      rto_class: "RTO_60M",
      wal_level: "replica",
      archive_mode: "on",
      archive_timeout_seconds:
        environmentRow.environment_ref === "env_local_provisioning_workstation"
          ? 300
          : 60,
      base_backup_cadence:
        environmentRow.environment_ref === "env_production"
          ? "nightly_full_plus_continuous_wal"
          : environmentRow.environment_ref === "env_preproduction_verification"
            ? "daily_full_plus_continuous_wal"
            : "daily_or_before_suite_full_plus_continuous_wal",
      wal_archive_readiness_rule:
        "A continuous WAL sequence must extend back at least to the start time of the latest admissible base backup.",
      restore_validation_steps: sharedRestoreSteps,
      privacy_reconciliation_required: true,
      queue_rebuild_required: true,
      authority_rebuild_required: true,
      authority_binding_revalidation_required: true,
      source_refs: algorithmSourceRefs,
    })),
    restore_gate_rows: restoreGateRows,
    migration_window_policy: {
      posture_id: "expand_migrate_contract_restore_boundaries",
      expand_posture:
        "New schemas, columns, partitions, and roles may be added while prior readers still work.",
      backfill_posture:
        "Backfills are idempotent, recorded, and replay-safe; they must not close the reader window early.",
      contract_posture:
        "Contract/drop steps remain blocked until restore drills, replay readability, and supported reader windows all stay green.",
      rollback_boundary_policy:
        "Rollback is allowed only while the prior reader window remains open and the destructive contract phase has not closed it.",
      fail_forward_policy:
        "If destructive change or closed reader windows make rollback unsafe, the sanctioned path is a compensating forward fix.",
      replay_restore_policy:
        "Restore and replay must be able to read the protected historical schema bundle set for any still-admissible checkpoint or manifest.",
      source_refs: algorithmSourceRefs,
    },
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "EXACT_MANAGED_PLATFORM_BACKUP_SNAPSHOT_MECHANICS_DEFERRED_UNTIL_PROVIDER_SELECTION",
      "SECONDARY_REGION_NAMES_DEFERRED_UNTIL_PLATFORM_SELECTION",
    ],
  };
}

export function createAuditAppendOnlyEnforcementPolicy(
  selectionStatus: PostgresSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
): AuditAppendOnlyEnforcementPolicy {
  return {
    schema_version: "1.0",
    policy_id: "postgres_audit_append_only_enforcement",
    selection_status: selectionStatus,
    enforcement_mode:
      "TRIGGER_GUARDED_RANGE_PARTITIONED_APPEND_ONLY_LEDGER",
    audit_table_ref: "audit_ledger.audit_event_stream",
    stream_head_table_ref: "audit_admin.audit_stream_head",
    partitioning: {
      strategy: "RANGE_RECORDED_AT_MONTHLY_PLUS_DEFAULT",
      maintenance_path:
        "DETACH_AND_DROP_EXPIRED_PARTITION_ONLY_NO_ROW_MUTATION",
      ordering_index_ref: "audit_event_stream_order_lookup",
    },
    grant_posture: {
      insert_allowed_role_refs: ["role.pg.audit.append_writer"],
      select_allowed_role_refs: [
        "role.pg.audit.append_writer",
        "role.pg.audit.investigator_ro",
        "role.pg.control.backup_restore",
        "role.pg.break_glass.operator",
      ],
      update_allowed_role_refs: [],
      delete_allowed_role_refs: [],
    },
    immutable_columns: [
      "audit_event_id",
      "event_type",
      "event_time",
      "recorded_at",
      "audit_stream_ref",
      "stream_sequence",
      "tenant_id",
      "client_id",
      "manifest_id",
      "actor_ref",
      "service_ref",
      "object_refs",
      "reason_codes",
      "correlation_context",
      "event_payload_hash",
      "prev_event_hash",
      "visibility_class",
      "retention_class",
      "signature_ref",
      "retention_limited_explainability_contract",
      "retained_context",
    ],
    stream_ordering: {
      canonical_merge_key: ["audit_stream_ref", "stream_sequence"],
      monotonic_insert_guard: "audit_admin.guard_audit_event_insert",
      prev_hash_guard: "audit_admin.guard_audit_event_insert",
      reasoning:
        "The partitioned ledger keeps a stream-head register so inserts stay monotonic within each stream while time-based partitions remain drop-friendly for retention.",
    },
    mutation_violation: {
      sqlstate: "P0001",
      reason_code: "AUDIT_APPEND_ONLY_VIOLATION",
      surfaced_as: [
        "SQL trigger error",
        "audit investigation blocker",
        "restore verification blocker",
      ],
    },
    maintenance_exception_path: {
      allowed_path:
        "PARTITION_RETENTION_MAINTENANCE_AFTER_RETENTION_EXPIRY_ONLY",
      row_update_allowed: false,
      row_delete_allowed: false,
      source_refs: algorithmSourceRefs,
      rationale:
        "Retention acts by partition detach or drop after policy expiry; even maintenance operators do not mutate or delete individual evidence rows.",
    },
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "GLOBAL_UNIQUE_SEQUENCE_ENFORCEMENT_DEPENDS_ON_STREAM_HEAD_TRIGGER_NOT_PARTITION_KEY_UNIQUENESS",
    ],
  };
}

export function createPostgresStoreInventoryTemplate(
  runContext: MinimalRunContext = {
    runId: "run-template-postgres-store-001",
    workspaceId: "wk-template-postgres-store-topology",
    operatorIdentityAlias: "ops.database.template",
  },
  selectionStatus: PostgresSelectionStatus = "PROVIDER_SELECTION_REQUIRED",
  selectedServiceType: PostgresServiceType | null = null,
): PostgresStoreInventoryTemplate {
  return {
    schema_version: "1.0",
    inventory_id: "postgres_store_inventory",
    provider_id: POSTGRES_PROVIDER_ID,
    flow_id: POSTGRES_FLOW_ID,
    policy_version: POSTGRES_POLICY_VERSION,
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    operator_identity_alias: runContext.operatorIdentityAlias,
    selection_status: selectionStatus,
    selected_service_type_or_null: selectedServiceType,
    topology_mode: "SINGLE_CLUSTER_TWO_DATABASES_HARD_BOUNDARY",
    provider_resolution_posture:
      "PLATFORM_PROVIDER_SELECTION_REQUIRED",
    cluster_shape_rationale:
      "One PostgreSQL cluster per environment with two separately credentialed databases is the narrowest portable implementation that preserves control-vs-audit separation without inventing a specific managed vendor.",
    provider_service_options: providerServiceOptions,
    environment_rows: environmentRows,
    store_rows: storeRows,
    role_matrix_ref: "config/postgres/role_and_privilege_matrix.json",
    pitr_policy_ref: "config/postgres/pitr_backup_restore_policy.json",
    audit_policy_ref: "config/postgres/audit_append_only_enforcement.json",
    source_refs: algorithmSourceRefs,
    typed_gaps: [
      "EXACT_CLOUD_PROVIDER_AND_REGION_NAMES_REMAIN_BLOCKED_BY_PLATFORM_SELECTION",
      "READ_REPLICA_PRODUCT_MECHANICS_REMAIN_PROVIDER_SPECIFIC_AND_DEFERRED",
    ],
    notes: [
      "The topology freezes database names, schemas, role aliases, and restore gates now so later implementation work does not rename durable truth boundaries ad hoc.",
      "Control and audit credentials remain distinct even though the conceptual phase-01 topology shares a single cluster per environment.",
    ],
    last_verified_at: POSTGRES_LAST_VERIFIED_AT,
  };
}

export function createControlAndAuditStoreLedgerViewModel(): ControlAndAuditStoreLedgerViewModel {
  const roleMatrix = createRoleAndPrivilegeMatrix();
  const pitrPolicy = createPitrBackupRestorePolicy();
  return {
    providerDisplayName: "PostgreSQL control + audit stores",
    providerMonogram: "PG",
    selectionPosture: "PROVIDER_SELECTION_REQUIRED",
    topologyModeLabel: "Single cluster / two databases / hard role boundary",
    restoreReadinessLabel: "Restore policy frozen, provider unresolved",
    policyVersion: POSTGRES_POLICY_VERSION,
    summary:
      "The transactional control store and append-only audit store are frozen as two separately credentialed PostgreSQL databases per environment. Provider product names, regions, and exact managed features remain unresolved, but the durable truth boundary, role model, and PITR gates are now explicit.",
    notes: [
      "Read replicas and restore drills are explicitly non-authoritative for commit truth.",
      "Append-only evidence is protected by insert-only grants, update/delete rejection triggers, and stream-head monotonicity checks.",
      "Contract phases remain blocked until reader-window, restore, and fail-forward rules all stay green.",
    ],
    environments: environmentRows.map((row) => ({
      environment_ref: row.environment_ref,
      label: row.label,
      cluster_alias: row.cluster_alias,
      residency_class: row.residency_class,
      ha_posture: row.ha_posture,
      restore_profile_ref: row.restore_profile_ref,
    })),
    stores: storeRows.map((row) => ({
      store_ref: row.store_ref,
      label: row.label,
      store_kind: row.store_kind,
      database_name_or_null: row.database_name_or_null,
      schema_names: row.schema_names,
      owner_role_ref: row.owner_role_ref,
      runtime_role_refs: row.runtime_role_refs,
      topology_posture: row.topology_posture,
      append_only_posture: row.append_only_posture,
      order_guarantee: row.order_guarantee,
      retention_or_restore_posture: row.retention_or_restore_posture,
      notes: row.notes,
    })),
    roles: roleMatrix.role_rows.map((row) => ({
      role_ref: row.role_ref,
      label: row.label,
      actor_class: row.actor_class,
      privilege_band: row.privilege_band,
      store_refs: row.store_refs,
      capabilities: row.capabilities,
      forbidden_capabilities: row.forbidden_capabilities,
      schema_scopes: row.schema_scopes,
      notes: row.notes,
    })),
    restorePolicies: [
      {
        policy_ref: "policy.restore.gates",
        label: "Restore gates",
        rpo_class: "RPO_15M",
        rto_class: "RTO_60M",
        wal_summary: "WAL archive must be continuous and tested before base backups are treated as restorable.",
        gate_codes: restoreGateRows.map((row) => row.gate_code),
        note:
          "A checkpoint cannot claim VERIFIED or READY_FOR_REOPEN until every restore gate is explicitly satisfied.",
      },
      {
        policy_ref: "policy.pitr.wal",
        label: "PITR and WAL",
        rpo_class: "RPO_15M",
        rto_class: "RTO_60M",
        wal_summary:
          "wal_level=replica, archive_mode=on, archive_timeout=60s for authoritative environments.",
        gate_codes: ["RESTORE_EVIDENCE_BOUND", "AUDIT_CONTINUITY_VERIFIED"],
        note:
          "WAL deficiencies block reopen and must surface as restore-not-ready posture.",
      },
      {
        policy_ref: "policy.migration.window",
        label: "Migration window",
        rpo_class: "RPO_15M",
        rto_class: "RTO_60M",
        wal_summary: "Expand, backfill, and contract phases remain bound to reader-window and rollback safety.",
        gate_codes: ["RESTORE_EVIDENCE_BOUND", "PRIVACY_RECONCILIATION_BOUND"],
        note:
          "Destructive contract phases remain blocked until restore, replay, and rollback boundaries all stay lawful.",
      },
    ],
    selectedEnvironmentRef: "env_preproduction_verification",
    selectedStoreRef: "store.control.primary",
    selectedRoleRef: "role.pg.control.runtime_api",
    selectedRestorePolicyRef: "policy.restore.gates",
  };
}

export function validateRoleAndPrivilegeMatrix(
  matrix = createRoleAndPrivilegeMatrix(),
): void {
  const roleRefs = new Set<string>();
  for (const roleRow of matrix.role_rows) {
    if (roleRefs.has(roleRow.role_ref)) {
      throw new Error(`Duplicate postgres role ref detected: ${roleRow.role_ref}`);
    }
    roleRefs.add(roleRow.role_ref);
  }

  const auditWriter = matrix.role_rows.find(
    (row) => row.role_ref === "role.pg.audit.append_writer",
  );
  if (!auditWriter) {
    throw new Error("Audit append writer role is missing.");
  }
  if (
    auditWriter.forbidden_capabilities.includes("UPDATE_AUDIT_ROWS") !== true ||
    auditWriter.forbidden_capabilities.includes("DELETE_AUDIT_ROWS") !== true
  ) {
    throw new Error("Audit append writer must explicitly forbid update/delete.");
  }

  const projector = matrix.role_rows.find(
    (row) => row.role_ref === "role.pg.control.projector_ro",
  );
  if (!projector || projector.capabilities.includes("INSERT")) {
    throw new Error("Projection consumer must remain read-only.");
  }
}

export function validatePitrBackupRestorePolicy(
  policy = createPitrBackupRestorePolicy(),
): void {
  if (policy.wal_policy.archive_mode !== "on") {
    throw new Error("WAL archiving must remain enabled.");
  }
  if (policy.wal_policy.archive_timeout_seconds > 300) {
    throw new Error("Archive timeout exceeds the allowed bound.");
  }
  const requiredGates = new Set(
    policy.restore_gate_rows.map((row) => row.gate_code),
  );
  for (const gateCode of [
    "RESTORE_EVIDENCE_BOUND",
    "PRIVACY_RECONCILIATION_BOUND",
    "AUDIT_CONTINUITY_VERIFIED",
    "QUEUE_REBUILD_VERIFIED",
    "AUTHORITY_REBUILD_VERIFIED",
    "AUTHORITY_BINDING_REVALIDATED",
  ]) {
    if (!requiredGates.has(gateCode as RestoreGateRow["gate_code"])) {
      throw new Error(`Missing restore gate ${gateCode}.`);
    }
  }
}

export function validateAuditAppendOnlyEnforcement(
  policy = createAuditAppendOnlyEnforcementPolicy(),
): void {
  if (policy.grant_posture.update_allowed_role_refs.length > 0) {
    throw new Error("Audit append-only policy must not allow update grants.");
  }
  if (policy.grant_posture.delete_allowed_role_refs.length > 0) {
    throw new Error("Audit append-only policy must not allow delete grants.");
  }
  if (
    policy.maintenance_exception_path.row_update_allowed ||
    policy.maintenance_exception_path.row_delete_allowed
  ) {
    throw new Error("Maintenance path must not permit row mutation.");
  }
}

function stableInventoryComparable(
  inventory: PostgresStoreInventoryTemplate,
): Omit<
  PostgresStoreInventoryTemplate,
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

export async function provisionPrimaryPostgresqlControlStoreAndAppendOnlyAuditStore(
  options: {
    runContext: MinimalRunContext;
    inventoryPath: string;
    existingInventoryPath?: string;
    serviceTypeSelection?: PostgresServiceType | null;
  },
): Promise<ProvisionPrimaryPostgresqlResult> {
  const selectionStatus: PostgresSelectionStatus = options.serviceTypeSelection
    ? "SERVICE_TYPE_SELECTED"
    : "PROVIDER_SELECTION_REQUIRED";

  const roleAndPrivilegeMatrix = createRoleAndPrivilegeMatrix(selectionStatus);
  const pitrBackupRestorePolicy = createPitrBackupRestorePolicy(selectionStatus);
  const auditAppendOnlyEnforcement =
    createAuditAppendOnlyEnforcementPolicy(selectionStatus);
  validateRoleAndPrivilegeMatrix(roleAndPrivilegeMatrix);
  validatePitrBackupRestorePolicy(pitrBackupRestorePolicy);
  validateAuditAppendOnlyEnforcement(auditAppendOnlyEnforcement);

  const inventory = createPostgresStoreInventoryTemplate(
    options.runContext,
    selectionStatus,
    options.serviceTypeSelection ?? null,
  );

  let adoptionStep: ProvisionPostgresStep = {
    step_id: "postgres.adopt-or-verify-existing-topology",
    title: "Adopt or verify existing topology",
    status: "SUCCEEDED",
    reason:
      "No prior inventory was supplied; a sanitized topology record will be created.",
  };

  if (options.existingInventoryPath) {
    try {
      const existingInventory = JSON.parse(
        await readFile(options.existingInventoryPath, "utf8"),
      ) as PostgresStoreInventoryTemplate;
      const currentComparable = stableInventoryComparable(inventory);
      const existingComparable = stableInventoryComparable({
        ...inventory,
        ...existingInventory,
      });
      if (
        JSON.stringify(currentComparable) !== JSON.stringify(existingComparable)
      ) {
        return {
          outcome: "POSTGRES_TOPOLOGY_DRIFT_REVIEW_REQUIRED",
          selection_status: selectionStatus,
          inventory,
          roleAndPrivilegeMatrix,
          pitrBackupRestorePolicy,
          auditAppendOnlyEnforcement,
          ledgerViewModel: createControlAndAuditStoreLedgerViewModel(),
          steps: [
            {
              step_id: "postgres.resolve-provider-selection",
              title: "Resolve provider service type",
              status: options.serviceTypeSelection
                ? "SUCCEEDED"
                : "BLOCKED_BY_POLICY",
              reason: options.serviceTypeSelection
                ? `Provider service type ${options.serviceTypeSelection} was supplied explicitly.`
                : "Provider service type remains unresolved and the flow stays in portable-contract mode.",
            },
            {
              step_id: "postgres.adopt-or-verify-existing-topology",
              title: "Adopt or verify existing topology",
              status: "BLOCKED_BY_DRIFT",
              reason:
                "Existing inventory differs from the frozen topology signature. The flow stopped without overwriting the prior record.",
            },
          ],
          notes: [
            "No existing inventory file was overwritten because topology drift requires review.",
          ],
        };
      }
      adoptionStep = {
        step_id: "postgres.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SKIPPED_AS_ALREADY_PRESENT",
        reason:
          "Existing inventory matches the frozen topology signature and can be adopted without drift.",
      };
    } catch {
      adoptionStep = {
        step_id: "postgres.adopt-or-verify-existing-topology",
        title: "Adopt or verify existing topology",
        status: "SUCCEEDED",
        reason:
          "No prior inventory could be read; a sanitized topology record will be created.",
      };
    }
  }

  await mkdir(path.dirname(options.inventoryPath), { recursive: true });
  await writeFile(options.inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  const steps: ProvisionPostgresStep[] = [
    {
      step_id: "postgres.resolve-provider-selection",
      title: "Resolve provider service type",
      status: options.serviceTypeSelection ? "SUCCEEDED" : "BLOCKED_BY_POLICY",
      reason: options.serviceTypeSelection
        ? `Provider service type ${options.serviceTypeSelection} was supplied explicitly.`
        : "The dependency register still marks the PostgreSQL substrate as a platform choice, so provider-specific mechanics remain blocked.",
    },
    {
      step_id: "postgres.freeze-cluster-and-database-topology",
      title: "Freeze cluster and database topology",
      status: "SUCCEEDED",
      reason:
        "A single-cluster, two-database topology with hard role and schema separation was materialized for every authoritative environment.",
    },
    {
      step_id: "postgres.freeze-role-and-privilege-matrix",
      title: "Freeze role and privilege matrix",
      status: "SUCCEEDED",
      reason: `Least-privilege posture fixed across ${roleAndPrivilegeMatrix.role_rows.length} roles and ${roleAndPrivilegeMatrix.membership_rows.length} membership edges.`,
    },
    {
      step_id: "postgres.freeze-pitr-and-restore-policy",
      title: "Freeze PITR and restore policy",
      status: "SUCCEEDED",
      reason:
        "WAL archiving, base backup, restore verification, privacy reconciliation, and authority rebuild gates are now explicit and machine-readable.",
    },
    {
      step_id: "postgres.freeze-audit-append-only-policy",
      title: "Freeze audit append-only policy",
      status: "SUCCEEDED",
      reason:
        "Append-only evidence is protected by insert-only grants, stream-head monotonicity, and update/delete rejection triggers.",
    },
    adoptionStep,
    {
      step_id: "postgres.persist-sanitized-inventory",
      title: "Persist sanitized inventory",
      status: "SUCCEEDED",
      reason:
        "Sanitized inventory persisted with database names, role aliases, restore posture, and secret refs only.",
    },
  ];

  return {
    outcome: options.serviceTypeSelection
      ? "POSTGRES_TOPOLOGY_READY_FOR_PROVIDER_ADOPTION"
      : "POSTGRES_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
    selection_status: selectionStatus,
    inventory,
    roleAndPrivilegeMatrix,
    pitrBackupRestorePolicy,
    auditAppendOnlyEnforcement,
    ledgerViewModel: createControlAndAuditStoreLedgerViewModel(),
    steps,
    notes: [
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ],
  };
}

export async function emitCheckedInArtifacts(repoRoot: string): Promise<void> {
  const roleMatrix = createRoleAndPrivilegeMatrix();
  const pitrPolicy = createPitrBackupRestorePolicy();
  const auditPolicy = createAuditAppendOnlyEnforcementPolicy();
  const inventory = createPostgresStoreInventoryTemplate();
  const viewerModel = createControlAndAuditStoreLedgerViewModel();

  const writes: Array<[string, unknown]> = [
    ["config/postgres/role_and_privilege_matrix.json", roleMatrix],
    ["config/postgres/pitr_backup_restore_policy.json", pitrPolicy],
    ["config/postgres/audit_append_only_enforcement.json", auditPolicy],
    ["data/provisioning/postgres_store_inventory.template.json", inventory],
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
  sampleRun.controlAndAuditStoreLedger = viewerModel;
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
