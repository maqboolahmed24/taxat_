import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  NightlyBatchRun as GeneratedNightlyBatchRun,
  NightlyBatchRunGlobalConcurrencyProfile as GeneratedNightlyBatchRunGlobalConcurrencyProfile,
  NightlyBatchRunPriorityTuple as GeneratedNightlyBatchRunPriorityTuple,
  NightlyBatchRunSelectionEntry as GeneratedNightlyBatchRunSelectionEntry,
  NightlyBatchRunShardPlanEntry as GeneratedNightlyBatchRunShardPlanEntry,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { ExecutionModeBoundaryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  SchemaReaderWindowContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  assertNightlyBatchIdentityContract,
  buildNightlyBatchIdentityContract,
  deriveNightlyBatchIdentityContractHash,
  type NightlyBatchIdentityContract,
} from "./nightly_batch_identity_contract.ts";
import {
  deriveNightlySelectionBasisHash,
  deriveNightlySelectionCandidateIdentityHash,
  deriveNightlySelectionUniverseHashFromCandidateHashes,
  deriveNightlyStableTieBreakKey,
  nightlySelectionDerivationTrace,
} from "../services/derive_nightly_selection_universe_hash.ts";

type NullableInstant = string | null;

export type NightlyBatchRunGlobalConcurrencyProfileRecord =
  GeneratedNightlyBatchRunGlobalConcurrencyProfile;
export type NightlyBatchRunPriorityTupleRecord = GeneratedNightlyBatchRunPriorityTuple;
export type NightlyBatchRunSelectionEntryRecord = Omit<
  GeneratedNightlyBatchRunSelectionEntry,
  "next_checkpoint_at" | "executed_at"
> & {
  next_checkpoint_at: NullableInstant;
  fairness_group_key?: string | null;
  executed_at: NullableInstant;
};
export type NightlyBatchRunShardPlanEntryRecord = Omit<
  GeneratedNightlyBatchRunShardPlanEntry,
  "last_heartbeat_at"
> & {
  last_heartbeat_at: NullableInstant;
};
export type NightlyBatchRunRecord = Omit<
  GeneratedNightlyBatchRun,
  | "selection_entries"
  | "shard_plan"
  | "selection_started_at"
  | "selection_completed_at"
  | "started_at"
  | "last_heartbeat_at"
  | "quiesced_at"
  | "completed_at"
  | "abandoned_at"
> & {
  selection_entries: NightlyBatchRunSelectionEntryRecord[];
  shard_plan: NightlyBatchRunShardPlanEntryRecord[];
  selection_started_at: NullableInstant;
  selection_completed_at: NullableInstant;
  started_at: NullableInstant;
  last_heartbeat_at: NullableInstant;
  quiesced_at: NullableInstant;
  completed_at: NullableInstant;
  abandoned_at: NullableInstant;
};

export type NightlyBatchRunLifecycleState = NightlyBatchRunRecord["lifecycle_state"];
export type NightlyBatchSelectionDisposition =
  NightlyBatchRunSelectionEntryRecord["selection_disposition"];
export type NightlyBatchOutcomeBucket =
  NonNullable<NightlyBatchRunSelectionEntryRecord["outcome_bucket"]>;

export const NIGHTLY_BATCH_RUN_ARTIFACT_TYPE = "NightlyBatchRun" as const;
export const NIGHTLY_BATCH_RUN_MACHINE_CODE = "NIGHTLY_BATCH_RUN_LIFECYCLE_V1" as const;
export const NIGHTLY_BATCH_RUN_STATE_FIELD = "lifecycle_state" as const;
export const NIGHTLY_BATCH_RUN_INITIAL_EVENT = "batch_allocated" as const;

export const NIGHTLY_EXECUTION_SELECTION_DISPOSITIONS = [
  "EXECUTE_NEW_MANIFEST",
  "EXECUTE_CONTINUATION_CHILD",
] as const satisfies readonly NightlyBatchSelectionDisposition[];

export const NIGHTLY_TERMINAL_LIFECYCLE_STATES = [
  "COMPLETED",
  "COMPLETED_WITH_FAILURES",
  "BLOCKED",
  "FAILED",
  "ABANDONED",
] as const satisfies readonly NightlyBatchRunLifecycleState[];

export const NIGHTLY_SELECTION_ACCOUNTING_REQUIRED_STATES = [
  "QUIESCING",
  "COMPLETED",
  "COMPLETED_WITH_FAILURES",
  "BLOCKED",
  "FAILED",
  "ABANDONED",
] as const satisfies readonly NightlyBatchRunLifecycleState[];

export const NIGHTLY_SHARD_PLAN_REQUIRED_STATES = [
  "PLANNED",
  "RUNNING",
  "QUIESCING",
  "COMPLETED",
  "COMPLETED_WITH_FAILURES",
  "BLOCKED",
  "FAILED",
  "ABANDONED",
] as const satisfies readonly NightlyBatchRunLifecycleState[];

export type NightlyBatchRunModelErrorCode =
  | "NIGHTLY_BATCH_RUN_FIELD_INVALID"
  | "NIGHTLY_BATCH_RUN_IDENTITY_INVALID"
  | "NIGHTLY_BATCH_RUN_HASH_INVALID"
  | "NIGHTLY_BATCH_RUN_SELECTION_INVALID"
  | "NIGHTLY_BATCH_RUN_STATE_INVALID"
  | "NIGHTLY_BATCH_RUN_SHARD_INVALID"
  | "NIGHTLY_BATCH_RUN_ACCOUNTING_INVALID";

export class NightlyBatchRunModelError extends Error {
  readonly code: NightlyBatchRunModelErrorCode;
  readonly trace: string;

  constructor(code: NightlyBatchRunModelErrorCode, detail: string, traceSubject?: unknown) {
    super(`${code}: ${detail}`);
    this.name = "NightlyBatchRunModelError";
    this.code = code;
    this.trace = nightlySelectionDerivationTrace(traceSubject ?? detail);
  }
}

function assertNightlyBatchRunCondition(
  condition: unknown,
  code: NightlyBatchRunModelErrorCode,
  detail: string,
  traceSubject?: unknown,
): asserts condition {
  if (!condition) {
    throw new NightlyBatchRunModelError(code, detail, traceSubject);
  }
}

function isExecutionDisposition(disposition: NightlyBatchSelectionDisposition) {
  return (NIGHTLY_EXECUTION_SELECTION_DISPOSITIONS as readonly string[]).includes(disposition);
}

function sortStrings(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function uniqueSorted(values: readonly string[]) {
  return sortStrings([...new Set(values)]);
}

function assertNonEmptyString(label: string, value: unknown, traceSubject: unknown) {
  assertNightlyBatchRunCondition(
    typeof value === "string" && value.length > 0,
    "NIGHTLY_BATCH_RUN_FIELD_INVALID",
    `${label} must be a non-empty string`,
    traceSubject,
  );
}

function assertUnique(label: string, values: readonly string[], traceSubject: unknown) {
  assertNightlyBatchRunCondition(
    new Set(values).size === values.length,
    "NIGHTLY_BATCH_RUN_FIELD_INVALID",
    `${label} must not contain duplicates`,
    traceSubject,
  );
}

export function nightlyBatchRunRef(batch: Pick<NightlyBatchRunRecord, "batch_run_id">) {
  return `nightly-batch-run://${batch.batch_run_id}`;
}

export function deriveExecutionModeBoundaryContractHash(
  contract: ExecutionModeBoundaryContract,
) {
  return stableJsonHash({
    contract_version: contract.contract_version,
    run_kind: contract.run_kind,
    replay_class_or_null: contract.replay_class_or_null,
    execution_mode: contract.execution_mode,
    analysis_only: contract.analysis_only,
    non_compliance_config_refs: sortStrings(contract.non_compliance_config_refs),
    counterfactual_basis: contract.counterfactual_basis,
    execution_posture: contract.execution_posture,
    legal_effect_boundary: contract.legal_effect_boundary,
    disclosure_reason_codes: sortStrings(contract.disclosure_reason_codes),
  }) as string;
}

export function buildNightlyExecutionModeBoundaryContract(
  overrides: Partial<ExecutionModeBoundaryContract> = {},
): ExecutionModeBoundaryContract {
  const contract: ExecutionModeBoundaryContract = {
    contract_version: "EXECUTION_MODE_BOUNDARY_V1",
    boundary_hash: "",
    run_kind: "NIGHTLY",
    replay_class_or_null: null,
    execution_mode: "COMPLIANCE",
    analysis_only: false,
    non_compliance_config_refs: [],
    counterfactual_basis: null,
    execution_posture: "LIVE_COMPLIANCE",
    legal_effect_boundary: "COMPLIANCE_CAPABLE",
    disclosure_reason_codes: [],
    ...overrides,
  };
  contract.non_compliance_config_refs = uniqueSorted(contract.non_compliance_config_refs);
  contract.disclosure_reason_codes = uniqueSorted(contract.disclosure_reason_codes);
  contract.boundary_hash = deriveExecutionModeBoundaryContractHash(contract);
  return contract;
}

export function buildNightlySchemaReaderWindowContract(input: {
  schema_bundle_hash: string;
  compatibility_window_ref?: string;
  supported_reader_schema_bundle_hashes?: readonly string[];
  protected_historical_schema_bundle_hashes?: readonly string[];
  window_state?: SchemaReaderWindowContract["window_state"];
}): SchemaReaderWindowContract {
  const supported = uniqueSorted([
    input.schema_bundle_hash,
    ...(input.supported_reader_schema_bundle_hashes ?? []),
  ]);
  const protectedHistorical = uniqueSorted(
    (input.protected_historical_schema_bundle_hashes ?? []).filter(
      (hash) => hash !== input.schema_bundle_hash,
    ),
  );
  return {
    contract_version: "SCHEMA_READER_WINDOW_CONTRACT_V1",
    compatibility_window_ref:
      input.compatibility_window_ref ?? `schema-window://${input.schema_bundle_hash}`,
    writer_schema_bundle_hash: input.schema_bundle_hash,
    supported_reader_schema_bundle_hashes: supported,
    protected_historical_schema_bundle_hashes: protectedHistorical.filter((hash) =>
      supported.includes(hash),
    ),
    window_state: input.window_state ?? "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    historical_manifest_policy:
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  };
}

export function buildNightlyBatchStateTransitionContract(input: {
  current_state: NightlyBatchRunLifecycleState;
  previous_state_or_null: NightlyBatchRunLifecycleState | null;
  transition_event_code: string;
  transition_applied_at: string;
  transition_audit_ref: string;
}): StateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "NIGHTLY_BATCH_RUN",
    machine_code: NIGHTLY_BATCH_RUN_MACHINE_CODE,
    state_field_name: NIGHTLY_BATCH_RUN_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

export function defaultNightlyGlobalConcurrencyProfile(
  overrides: Partial<NightlyBatchRunGlobalConcurrencyProfileRecord> = {},
): NightlyBatchRunGlobalConcurrencyProfileRecord {
  return {
    global_manifest_limit: 40,
    per_shard_manifest_limit: 8,
    authority_transmit_limit: 10,
    per_client_serialization: true,
    heartbeat_interval_seconds: 30,
    stale_heartbeat_after_seconds: 180,
    soft_stability_rho: 0.7,
    hard_stability_rho: 0.9,
    retry_capacity_fraction: 0.25,
    base_deficit_quantum_minutes: 15.5,
    ...overrides,
  };
}

export function deriveNightlyBatchOutcomeCounters(
  entries: readonly NightlyBatchRunSelectionEntryRecord[],
) {
  const count = (bucket: NightlyBatchOutcomeBucket) =>
    entries.filter((entry) => entry.outcome_bucket === bucket).length;
  const failedCount = count("FAILED_RETRYABLE") + count("FAILED_NON_RETRYABLE");
  return {
    execution_count: entries.filter((entry) => entry.executed_at !== null).length,
    reused_result_count: count("REUSED_RESULT"),
    deferred_count: count("DEFERRED"),
    escalated_count: count("REVIEW_REQUIRED") + count("REQUEST_CLIENT_INFO") + count("BLOCKED_INTERNAL"),
    skipped_count: count("SKIPPED"),
    waiting_on_authority_count: count("WAITING_ON_AUTHORITY"),
    waiting_on_late_data_count: count("WAITING_ON_LATE_DATA"),
    completed_count: count("AUTO_COMPLETED"),
    completed_with_failures_count: failedCount,
    failed_count: failedCount,
  };
}

export function buildNightlyShardPlan(input: {
  entries: readonly NightlyBatchRunSelectionEntryRecord[];
  global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
  planned_at: string | null;
}): NightlyBatchRunShardPlanEntryRecord[] {
  const executionEntries = input.entries.filter((entry) =>
    isExecutionDisposition(entry.selection_disposition),
  );
  const entriesByShard = new Map<string, NightlyBatchRunSelectionEntryRecord[]>();
  for (const entry of executionEntries) {
    assertNonEmptyString("selection_entries[].shard_key", entry.shard_key, entry);
    const rows = entriesByShard.get(entry.shard_key) ?? [];
    rows.push(entry);
    entriesByShard.set(entry.shard_key, rows);
  }
  return [...entriesByShard.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardKey, rows]) => ({
      shard_key: shardKey,
      entry_refs: sortStrings(rows.map((entry) => entry.entry_id)),
      max_concurrent_manifests: input.global_concurrency_profile.per_shard_manifest_limit,
      shard_state: "PLANNED",
      blocked_entry_refs: [],
      failure_reason_codes: [],
      last_heartbeat_at: input.planned_at,
      current_owner_ref: null,
    }));
}

export type BuildNightlyBatchRunInput = Omit<
  NightlyBatchRunRecord,
  | "artifact_type"
  | "execution_mode_boundary_contract"
  | "state_transition_contract"
  | "identity_contract"
  | "schema_reader_window_contract"
  | "selected_count"
  | "execution_count"
  | "reused_result_count"
  | "deferred_count"
  | "escalated_count"
  | "skipped_count"
  | "waiting_on_authority_count"
  | "waiting_on_late_data_count"
  | "completed_count"
  | "completed_with_failures_count"
  | "failed_count"
  | "operator_digest_publication_state"
  | "operator_digest_derivation_contract_or_null"
  | "operator_digest_ref"
> & {
  execution_mode_boundary_contract?: ExecutionModeBoundaryContract;
  state_transition_contract: StateTransitionContract;
  identity_contract?: NightlyBatchIdentityContract;
  schema_reader_window_contract?: SchemaReaderWindowContract;
  operator_digest_publication_state?: NightlyBatchRunRecord["operator_digest_publication_state"];
  operator_digest_derivation_contract_or_null?: NightlyBatchRunRecord["operator_digest_derivation_contract_or_null"];
  operator_digest_ref?: string | null;
};

export function buildNightlyBatchRunRecord(
  input: BuildNightlyBatchRunInput,
): NightlyBatchRunRecord {
  const counters = deriveNightlyBatchOutcomeCounters(input.selection_entries);
  const identityContract =
    input.identity_contract ??
    buildNightlyBatchIdentityContract({
      tenant_id: input.tenant_id,
      nightly_window_key: input.nightly_window_key,
      trigger_class: input.trigger_class,
      release_verification_manifest_ref: input.release_verification_manifest_ref,
      policy_snapshot_hash: input.policy_snapshot_hash,
      autopilot_policy_hash: input.autopilot_policy_hash,
      scheduler_dedupe_key: input.scheduler_dedupe_key,
      schema_bundle_hash: input.schema_bundle_hash,
      code_build_id: input.code_build_id,
      environment_ref: input.environment_ref,
      selection_universe_hash: input.selection_universe_hash,
      selection_universe_count: input.selection_universe_count,
      reclaimed_predecessor_batch_run_ref_or_null:
        input.reclaimed_predecessor_batch_run_ref,
      recovery_resume_state: input.recovery_resume_state,
    });

  const record: NightlyBatchRunRecord = {
    ...input,
    artifact_type: NIGHTLY_BATCH_RUN_ARTIFACT_TYPE,
    execution_mode_boundary_contract:
      input.execution_mode_boundary_contract ?? buildNightlyExecutionModeBoundaryContract(),
    state_transition_contract: input.state_transition_contract,
    identity_contract: identityContract,
    schema_reader_window_contract:
      input.schema_reader_window_contract ??
      buildNightlySchemaReaderWindowContract({ schema_bundle_hash: input.schema_bundle_hash }),
    selected_count: input.selection_entries.length,
    ...counters,
    operator_digest_publication_state: input.operator_digest_publication_state ?? "NOT_READY",
    operator_digest_derivation_contract_or_null:
      input.operator_digest_derivation_contract_or_null ?? null,
    operator_digest_ref: input.operator_digest_ref ?? null,
  };
  return assertNightlyBatchRun(record);
}

function assertExecutionModeBoundary(contract: ExecutionModeBoundaryContract) {
  assertNightlyBatchRunCondition(
    contract.run_kind === "NIGHTLY" &&
      contract.execution_mode === "COMPLIANCE" &&
      contract.analysis_only === false &&
      contract.execution_posture === "LIVE_COMPLIANCE" &&
      contract.legal_effect_boundary === "COMPLIANCE_CAPABLE" &&
      contract.boundary_hash === deriveExecutionModeBoundaryContractHash(contract),
    "NIGHTLY_BATCH_RUN_IDENTITY_INVALID",
    "execution_mode_boundary_contract must freeze live NIGHTLY compliance posture",
    contract,
  );
}

function assertStateTransitionContract(batch: NightlyBatchRunRecord) {
  const contract = batch.state_transition_contract;
  assertNightlyBatchRunCondition(
    contract.object_family === "NIGHTLY_BATCH_RUN" &&
      contract.machine_code === NIGHTLY_BATCH_RUN_MACHINE_CODE &&
      contract.state_field_name === NIGHTLY_BATCH_RUN_STATE_FIELD &&
      contract.current_state === batch.lifecycle_state,
    "NIGHTLY_BATCH_RUN_STATE_INVALID",
    "state_transition_contract must mirror NightlyBatchRun lifecycle state machine identity",
    { batch, contract },
  );
  if (batch.audit_refs.length > 0) {
    assertNightlyBatchRunCondition(
      batch.audit_refs.includes(contract.transition_audit_ref),
      "NIGHTLY_BATCH_RUN_STATE_INVALID",
      "state_transition_contract.transition_audit_ref must be included in audit_refs",
      { batch, contract },
    );
  }
}

function assertSchemaReaderWindowContract(batch: NightlyBatchRunRecord) {
  const contract = batch.schema_reader_window_contract;
  assertNightlyBatchRunCondition(
    contract.writer_schema_bundle_hash === batch.schema_bundle_hash &&
      contract.supported_reader_schema_bundle_hashes.includes(batch.schema_bundle_hash),
    "NIGHTLY_BATCH_RUN_IDENTITY_INVALID",
    "schema_reader_window_contract must mirror schema_bundle_hash and include the writer in supported readers",
    { batch, contract },
  );
}

function assertIdentityMirror(batch: NightlyBatchRunRecord) {
  const identity = assertNightlyBatchIdentityContract(batch.identity_contract);
  const expected = buildNightlyBatchIdentityContract({
    tenant_id: batch.tenant_id,
    nightly_window_key: batch.nightly_window_key,
    trigger_class: batch.trigger_class,
    release_verification_manifest_ref: batch.release_verification_manifest_ref,
    policy_snapshot_hash: batch.policy_snapshot_hash,
    autopilot_policy_hash: batch.autopilot_policy_hash,
    scheduler_dedupe_key: batch.scheduler_dedupe_key,
    schema_bundle_hash: batch.schema_bundle_hash,
    code_build_id: batch.code_build_id,
    environment_ref: batch.environment_ref,
    selection_universe_hash: batch.selection_universe_hash,
    selection_universe_count: batch.selection_universe_count,
    reclaimed_predecessor_batch_run_ref_or_null: batch.reclaimed_predecessor_batch_run_ref,
    recovery_resume_state: batch.recovery_resume_state,
  });
  assertNightlyBatchRunCondition(
    identity.identity_contract_hash === expected.identity_contract_hash &&
      deriveNightlyBatchIdentityContractHash(identity) === expected.identity_contract_hash,
    "NIGHTLY_BATCH_RUN_IDENTITY_INVALID",
    "identity_contract must mirror the enclosing nightly batch identity tuple",
    { batch, expected },
  );
}

function assertRecoveryPosture(batch: NightlyBatchRunRecord) {
  if (batch.trigger_class === "RECOVERY_RECLAIM_WINDOW") {
    assertNonEmptyString(
      "reclaimed_predecessor_batch_run_ref",
      batch.reclaimed_predecessor_batch_run_ref,
      batch,
    );
    assertNightlyBatchRunCondition(
      batch.recovery_resume_state === "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" ||
        batch.recovery_resume_state === "PREDECESSOR_SELECTION_REUSED_RESHARDED",
      "NIGHTLY_BATCH_RUN_IDENTITY_INVALID",
      "recovery batches must retain explicit predecessor resume state",
      batch,
    );
  } else {
    assertNightlyBatchRunCondition(
      batch.reclaimed_predecessor_batch_run_ref === null &&
        batch.recovery_resume_state === "NOT_APPLICABLE",
      "NIGHTLY_BATCH_RUN_IDENTITY_INVALID",
      "non-recovery batches must keep predecessor linkage null and recovery_resume_state NOT_APPLICABLE",
      batch,
    );
  }
}

function assertSelectionEntry(batch: NightlyBatchRunRecord, entry: NightlyBatchRunSelectionEntryRecord) {
  const expectedCandidateHash = deriveNightlySelectionCandidateIdentityHash({
    tenant_id: batch.tenant_id,
    nightly_window_key: batch.nightly_window_key,
    client_id: entry.client_id,
    period: entry.period,
    requested_scope: entry.requested_scope,
  });
  assertNightlyBatchRunCondition(
    entry.candidate_identity_hash === expectedCandidateHash,
    "NIGHTLY_BATCH_RUN_HASH_INVALID",
    "selection_entries[].candidate_identity_hash must derive from tenant/window/client/period/scope",
    { batch, entry, expectedCandidateHash },
  );

  const expectedBasisHash = deriveNightlySelectionBasisHash({ batch, entry });
  assertNightlyBatchRunCondition(
    entry.selection_basis_hash === expectedBasisHash,
    "NIGHTLY_BATCH_RUN_HASH_INVALID",
    "selection_entries[].selection_basis_hash must derive from the frozen nightly selection basis",
    { batch, entry, expectedBasisHash },
  );

  const expectedTieBreakKey = deriveNightlyStableTieBreakKey({
    client_id: entry.client_id,
    period: entry.period,
    requested_scope: entry.requested_scope,
    selection_basis_hash: entry.selection_basis_hash,
  });
  assertNightlyBatchRunCondition(
    entry.priority_tuple.stable_tie_break_key === expectedTieBreakKey,
    "NIGHTLY_BATCH_RUN_HASH_INVALID",
    "priority_tuple.stable_tie_break_key must derive from client/period/scope/selection_basis_hash",
    { batch, entry, expectedTieBreakKey },
  );

  if (isExecutionDisposition(entry.selection_disposition)) {
    assertNonEmptyString("selection_entries[].fairness_group_key", entry.fairness_group_key, entry);
    assertNonEmptyString("selection_entries[].shard_key", entry.shard_key, entry);
  } else {
    assertNightlyBatchRunCondition(
      (entry.fairness_group_key ?? null) === null && entry.shard_key === null,
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "non-execution selection entries must remain off-shard",
      entry,
    );
  }

  if (entry.selection_disposition === "REUSE_EXISTING_TERMINAL_RESULT") {
    assertNightlyBatchRunCondition(
      entry.terminal_result_reuse_state === "REUSED_TERMINAL_RESULT" &&
        entry.active_attempt_resolution_state === "NO_ACTIVE_ATTEMPT" &&
        entry.manifest_ref === null &&
        entry.prior_manifest_ref !== null &&
        entry.outcome_bucket === "REUSED_RESULT" &&
        entry.executed_at === null,
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "terminal-result reuse must win before new allocation and retain prior-manifest lineage",
      entry,
    );
  }

  if (entry.selection_disposition === "EXECUTE_NEW_MANIFEST") {
    assertNightlyBatchRunCondition(
      entry.terminal_result_reuse_state !== "REUSED_TERMINAL_RESULT" &&
        entry.active_attempt_resolution_state === "NO_ACTIVE_ATTEMPT",
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "fresh execution cannot coexist with terminal-result reuse or active-attempt ownership",
      entry,
    );
  }

  if (entry.selection_disposition === "EXECUTE_CONTINUATION_CHILD") {
    assertNightlyBatchRunCondition(
      entry.prior_manifest_ref !== null &&
        entry.predecessor_selection_entry_ref_or_null !== null &&
        entry.active_attempt_resolution_state === "STALE_ATTEMPT_RECLAIM_REQUIRED",
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "continuation children must retain prior manifest and predecessor selection lineage",
      entry,
    );
  } else {
    assertNightlyBatchRunCondition(
      entry.predecessor_selection_entry_ref_or_null === null,
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "predecessor_selection_entry_ref_or_null is only legal for continuation children",
      entry,
    );
  }

  if (entry.selection_disposition === "DEFER_ACTIVE_ATTEMPT") {
    assertNightlyBatchRunCondition(
      entry.active_attempt_resolution_state === "ACTIVE_ATTEMPT_DEFERRED",
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "same-window active attempts must be explicitly deferred",
      entry,
    );
  }

  if (
    entry.selection_disposition === "DEFER_ACTIVE_ATTEMPT" ||
    entry.selection_disposition === "DEFER_RETRY_WINDOW"
  ) {
    assertNightlyBatchRunCondition(
      entry.next_checkpoint_at !== null &&
        entry.workflow_item_refs.length > 0 &&
        entry.outcome_bucket === "DEFERRED" &&
        entry.executed_at === null,
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "deferred nightly entries must retain checkpoint, workflow, and DEFERRED outcome posture",
      entry,
    );
  }

  if (entry.selection_disposition === "ESCALATE_ONLY") {
    assertNightlyBatchRunCondition(
      entry.workflow_item_refs.length > 0 &&
        (entry.outcome_bucket === "REVIEW_REQUIRED" ||
          entry.outcome_bucket === "REQUEST_CLIENT_INFO" ||
          entry.outcome_bucket === "BLOCKED_INTERNAL") &&
        entry.executed_at === null,
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "escalation-only entries must retain workflow refs and operator-handoff outcome",
      entry,
    );
  }

  if (entry.selection_disposition === "SKIP_INELIGIBLE") {
    assertNightlyBatchRunCondition(
      entry.manifest_ref === null && entry.executed_at === null && entry.outcome_bucket === "SKIPPED",
      "NIGHTLY_BATCH_RUN_SELECTION_INVALID",
      "skipped entries must retain explicit SKIPPED outcome without manifest allocation",
      entry,
    );
  }
}

function assertSelectionAccounting(batch: NightlyBatchRunRecord) {
  assertNightlyBatchRunCondition(
    batch.selection_universe_count === batch.selection_entries.length &&
      batch.selected_count === batch.selection_entries.length,
    "NIGHTLY_BATCH_RUN_ACCOUNTING_INVALID",
    "selection_universe_count and selected_count must equal persisted selection_entries length",
    batch,
  );
  assertUnique(
    "selection_entries[].entry_id",
    batch.selection_entries.map((entry) => entry.entry_id),
    batch,
  );
  assertUnique(
    "selection_entries[].candidate_identity_hash",
    batch.selection_entries.map((entry) => entry.candidate_identity_hash),
    batch,
  );
  const candidateHashes = batch.selection_entries.map((entry) => entry.candidate_identity_hash);
  const expectedUniverseHash = deriveNightlySelectionUniverseHashFromCandidateHashes(candidateHashes);
  assertNightlyBatchRunCondition(
    batch.selection_universe_hash === expectedUniverseHash,
    "NIGHTLY_BATCH_RUN_HASH_INVALID",
    "selection_universe_hash must equal the canonical hash of persisted candidate identities",
    { batch, expectedUniverseHash },
  );

  for (const entry of batch.selection_entries) {
    assertSelectionEntry(batch, entry);
  }

  const counters = deriveNightlyBatchOutcomeCounters(batch.selection_entries);
  for (const [field, expected] of Object.entries(counters)) {
    assertNightlyBatchRunCondition(
      batch[field as keyof typeof counters] === expected,
      "NIGHTLY_BATCH_RUN_ACCOUNTING_INVALID",
      `${field} must match persisted selection-entry outcomes`,
      { batch, field, expected },
    );
  }

  if (
    (NIGHTLY_SELECTION_ACCOUNTING_REQUIRED_STATES as readonly string[]).includes(
      batch.lifecycle_state,
    ) &&
    batch.selection_completed_at !== null
  ) {
    const missingOutcomeEntries = batch.selection_entries.filter(
      (entry) => entry.outcome_bucket === null,
    );
    assertNightlyBatchRunCondition(
      missingOutcomeEntries.length === 0,
      "NIGHTLY_BATCH_RUN_ACCOUNTING_INVALID",
      "accounting-required nightly batches must retain one explicit outcome for every entry",
      { batch, missingOutcomeEntries },
    );
  }
}

function assertShardPlan(batch: NightlyBatchRunRecord) {
  assertUnique(
    "shard_plan[].shard_key",
    batch.shard_plan.map((shard) => shard.shard_key),
    batch,
  );
  const executionEntryIds = new Set(
    batch.selection_entries
      .filter((entry) => isExecutionDisposition(entry.selection_disposition))
      .map((entry) => entry.entry_id),
  );
  const shardByEntry = new Map<string, string>();
  for (const shard of batch.shard_plan) {
    assertUnique(`shard_plan[${shard.shard_key}].entry_refs`, shard.entry_refs, shard);
    for (const entryRef of shard.entry_refs) {
      assertNightlyBatchRunCondition(
        executionEntryIds.has(entryRef),
        "NIGHTLY_BATCH_RUN_SHARD_INVALID",
        "shard_plan entry_refs may reference only execution-capable selection entries",
        { batch, shard, entryRef },
      );
      assertNightlyBatchRunCondition(
        !shardByEntry.has(entryRef),
        "NIGHTLY_BATCH_RUN_SHARD_INVALID",
        "shard_plan entry_refs must partition execution-capable entries without duplication",
        { batch, entryRef },
      );
      shardByEntry.set(entryRef, shard.shard_key);
    }
    if (
      shard.shard_state === "FAILED_ISOLATED" ||
      shard.shard_state === "TENANT_WIDE_BLOCKED" ||
      shard.shard_state === "RECLAIM_REQUIRED"
    ) {
      assertNightlyBatchRunCondition(
        shard.blocked_entry_refs.length > 0 && shard.failure_reason_codes.length > 0,
        "NIGHTLY_BATCH_RUN_SHARD_INVALID",
        "failure or reclaim shard states must retain blocked entries and reason codes",
        shard,
      );
    } else {
      assertNightlyBatchRunCondition(
        shard.blocked_entry_refs.length === 0 && shard.failure_reason_codes.length === 0,
        "NIGHTLY_BATCH_RUN_SHARD_INVALID",
        "non-failure shard states must clear blocked entries and failure reason codes",
        shard,
      );
    }
  }

  if (
    (NIGHTLY_SHARD_PLAN_REQUIRED_STATES as readonly string[]).includes(batch.lifecycle_state) &&
    batch.selection_completed_at !== null
  ) {
    const missing = [...executionEntryIds].filter((entryId) => !shardByEntry.has(entryId));
    assertNightlyBatchRunCondition(
      missing.length === 0,
      "NIGHTLY_BATCH_RUN_SHARD_INVALID",
      "shard_plan must cover every execution-capable entry after selection completion",
      { batch, missing },
    );
  }

  for (const entry of batch.selection_entries) {
    if (!isExecutionDisposition(entry.selection_disposition)) {
      continue;
    }
    assertNightlyBatchRunCondition(
      shardByEntry.get(entry.entry_id) === entry.shard_key,
      "NIGHTLY_BATCH_RUN_SHARD_INVALID",
      "selection_entries[].shard_key must mirror the owning shard_plan entry",
      { batch, entry },
    );
  }
}

function assertDigestState(batch: NightlyBatchRunRecord) {
  if (batch.operator_digest_publication_state === "PUBLISHED_COMPLETE") {
    assertNightlyBatchRunCondition(
      batch.operator_digest_ref !== null &&
        batch.operator_digest_derivation_contract_or_null !== null &&
        ["QUIESCING", "COMPLETED", "COMPLETED_WITH_FAILURES"].includes(batch.lifecycle_state),
      "NIGHTLY_BATCH_RUN_STATE_INVALID",
      "published-complete digest state requires a quiescence-safe lifecycle, digest ref, and derivation contract",
      batch,
    );
  } else {
    assertNightlyBatchRunCondition(
      batch.operator_digest_ref === null &&
        batch.operator_digest_derivation_contract_or_null === null,
      "NIGHTLY_BATCH_RUN_STATE_INVALID",
      "digest refs and derivation contract must stay null until publication is complete",
      batch,
    );
  }
}

export function assertNightlyBatchRun(batch: NightlyBatchRunRecord) {
  assertNightlyBatchRunCondition(
    batch.artifact_type === NIGHTLY_BATCH_RUN_ARTIFACT_TYPE,
    "NIGHTLY_BATCH_RUN_FIELD_INVALID",
    "artifact_type must be NightlyBatchRun",
    batch,
  );
  for (const field of [
    "batch_run_id",
    "tenant_id",
    "nightly_window_key",
    "scheduler_dedupe_key",
    "scheduled_for",
    "trigger_observed_at",
    "initiating_principal_context_ref",
    "policy_snapshot_hash",
    "autopilot_policy_hash",
    "release_verification_manifest_ref",
    "schema_bundle_hash",
    "code_build_id",
    "environment_ref",
    "selection_universe_hash",
  ] as const) {
    assertNonEmptyString(field, batch[field], batch);
  }
  assertExecutionModeBoundary(batch.execution_mode_boundary_contract);
  assertStateTransitionContract(batch);
  assertSchemaReaderWindowContract(batch);
  assertIdentityMirror(batch);
  assertRecoveryPosture(batch);
  assertSelectionAccounting(batch);
  assertShardPlan(batch);
  assertDigestState(batch);
  return batch;
}

export function cloneNightlyBatchRun(batch: NightlyBatchRunRecord) {
  return structuredClone(assertNightlyBatchRun(batch));
}
