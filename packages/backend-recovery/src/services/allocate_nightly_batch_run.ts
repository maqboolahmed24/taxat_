import {
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  buildNightlyExecutionModeBoundaryContract,
  buildNightlySchemaReaderWindowContract,
  buildNightlyShardPlan,
  defaultNightlyGlobalConcurrencyProfile,
  NIGHTLY_TERMINAL_LIFECYCLE_STATES,
  type NightlyBatchRunGlobalConcurrencyProfileRecord,
  type NightlyBatchRunRecord,
} from "../models/nightly_batch_run.ts";
import {
  buildNightlyBatchIdentityContract,
  deriveNightlySchedulerDedupeKey,
  type NightlyBatchEnvironmentRef,
  type NightlyBatchRecoveryResumeState,
  type NightlyBatchTriggerClass,
} from "../models/nightly_batch_identity_contract.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";
import {
  deriveNightlyBatchRunId,
  deriveNightlySelectionCandidateIdentityHash,
  deriveNightlySelectionUniverseHashFromCandidateHashes,
} from "./derive_nightly_selection_universe_hash.ts";
import {
  selectNightlyPortfolio,
  type NightlyPortfolioCandidateInput,
} from "./select_nightly_portfolio.ts";
import { persistNightlySelectionDispositions } from "./persist_nightly_selection_dispositions.ts";

export type NightlyBatchAllocationState =
  | "ALLOCATED"
  | "REUSED_ACTIVE_BATCH"
  | "BATCH_ALREADY_TERMINAL";

export type AllocateNightlyBatchRunInput = {
  repository: NightlyBatchRunRepository;
  tenant_id: string;
  nightly_window_key: string;
  trigger_class: NightlyBatchTriggerClass;
  release_verification_manifest_ref: string;
  policy_snapshot_hash: string;
  autopilot_policy_hash: string;
  schema_bundle_hash: string;
  code_build_id: string;
  environment_ref: NightlyBatchEnvironmentRef;
  scheduled_for: string;
  trigger_observed_at: string;
  initiating_principal_context_ref: string;
  candidates?: readonly NightlyPortfolioCandidateInput[];
  global_concurrency_profile?: Partial<NightlyBatchRunGlobalConcurrencyProfileRecord>;
  prerequisites?: {
    release_admissibility_frozen: boolean;
    policy_snapshot_frozen: boolean;
    tenant_schedule_scope_frozen: boolean;
  };
  reclaimed_predecessor_batch_run_ref?: string | null;
  recovery_resume_state?: NightlyBatchRecoveryResumeState;
  compatibility_window_ref?: string;
  supported_reader_schema_bundle_hashes?: readonly string[];
  protected_historical_schema_bundle_hashes?: readonly string[];
  audit_refs?: readonly string[];
  provenance_refs?: readonly string[];
};

export type AllocateNightlyBatchRunResult = {
  allocation_state: NightlyBatchAllocationState;
  stored: StoredNightlyBatchRunRecord;
};

function allPrerequisitesFrozen(input: AllocateNightlyBatchRunInput) {
  const prerequisites = input.prerequisites ?? {
    release_admissibility_frozen: true,
    policy_snapshot_frozen: true,
    tenant_schedule_scope_frozen: true,
  };
  return (
    prerequisites.release_admissibility_frozen &&
    prerequisites.policy_snapshot_frozen &&
    prerequisites.tenant_schedule_scope_frozen
  );
}

function isTerminal(batch: NightlyBatchRunRecord) {
  return (NIGHTLY_TERMINAL_LIFECYCLE_STATES as readonly string[]).includes(
    batch.lifecycle_state,
  );
}

function recoveryResumeState(input: AllocateNightlyBatchRunInput): NightlyBatchRecoveryResumeState {
  if (input.trigger_class === "RECOVERY_RECLAIM_WINDOW") {
    return input.recovery_resume_state ?? "PREDECESSOR_SELECTION_REUSED_RESHARDED";
  }
  return "NOT_APPLICABLE";
}

function predecessorRef(input: AllocateNightlyBatchRunInput) {
  return input.trigger_class === "RECOVERY_RECLAIM_WINDOW"
    ? input.reclaimed_predecessor_batch_run_ref ?? null
    : null;
}

function transitionAuditRef(input: {
  batch_run_id: string;
  event: string;
  observed_at: string;
}) {
  return `audit://nightly-batch/${input.batch_run_id}/${input.event}/${input.observed_at}`;
}

function buildBlockedBatch(input: AllocateNightlyBatchRunInput & {
  scheduler_dedupe_key: string;
  batch_run_id: string;
  global_concurrency_profile: NightlyBatchRunGlobalConcurrencyProfileRecord;
}) {
  const emptyUniverseHash = deriveNightlySelectionUniverseHashFromCandidateHashes([]);
  const auditRef = transitionAuditRef({
    batch_run_id: input.batch_run_id,
    event: "global_block",
    observed_at: input.trigger_observed_at,
  });
  return buildNightlyBatchRunRecord({
    batch_run_id: input.batch_run_id,
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    trigger_class: input.trigger_class,
    reclaimed_predecessor_batch_run_ref: predecessorRef(input),
    lifecycle_state: "BLOCKED",
    state_transition_contract: buildNightlyBatchStateTransitionContract({
      current_state: "BLOCKED",
      previous_state_or_null: "ALLOCATED",
      transition_event_code: "global_block",
      transition_applied_at: input.trigger_observed_at,
      transition_audit_ref: auditRef,
    }),
    scheduler_dedupe_key: input.scheduler_dedupe_key,
    scheduled_for: input.scheduled_for,
    trigger_observed_at: input.trigger_observed_at,
    initiating_principal_context_ref: input.initiating_principal_context_ref,
    policy_snapshot_hash: input.policy_snapshot_hash,
    autopilot_policy_hash: input.autopilot_policy_hash,
    release_verification_manifest_ref: input.release_verification_manifest_ref,
    schema_bundle_hash: input.schema_bundle_hash,
    schema_reader_window_contract: buildNightlySchemaReaderWindowContract({
      schema_bundle_hash: input.schema_bundle_hash,
      compatibility_window_ref: input.compatibility_window_ref,
      supported_reader_schema_bundle_hashes: input.supported_reader_schema_bundle_hashes,
      protected_historical_schema_bundle_hashes:
        input.protected_historical_schema_bundle_hashes,
    }),
    code_build_id: input.code_build_id,
    environment_ref: input.environment_ref,
    global_concurrency_profile: input.global_concurrency_profile,
    selection_universe_hash: emptyUniverseHash,
    selection_universe_count: 0,
    recovery_resume_state: recoveryResumeState(input),
    backlog_pressure: null,
    portfolio_tail_risk: null,
    stability_state: null,
    selection_entries: [],
    shard_plan: [],
    selection_started_at: input.trigger_observed_at,
    selection_completed_at: input.trigger_observed_at,
    started_at: null,
    last_heartbeat_at: null,
    quiesced_at: null,
    completed_at: null,
    abandoned_at: null,
    successor_batch_run_ref: null,
    audit_refs: uniqueSorted([...(input.audit_refs ?? []), auditRef]),
    provenance_refs: uniqueSorted(input.provenance_refs ?? []),
  });
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export async function allocateNightlyBatchRun(
  input: AllocateNightlyBatchRunInput,
): Promise<AllocateNightlyBatchRunResult> {
  const schedulerDedupeKey = deriveNightlySchedulerDedupeKey({
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    trigger_class: input.trigger_class,
    release_verification_manifest_ref: input.release_verification_manifest_ref,
    policy_snapshot_hash: input.policy_snapshot_hash,
    autopilot_policy_hash: input.autopilot_policy_hash,
  });
  const existing = await input.repository.findNightlyBatchRunBySchedulerDedupeKey(
    schedulerDedupeKey,
  );
  if (existing) {
    return {
      allocation_state: isTerminal(existing.nightly_batch_run)
        ? "BATCH_ALREADY_TERMINAL"
        : "REUSED_ACTIVE_BATCH",
      stored: existing,
    };
  }

  const reclaimedPredecessorBatchRunRef = predecessorRef(input);
  const batchRunId = deriveNightlyBatchRunId({
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    scheduler_dedupe_key: schedulerDedupeKey,
    reclaimed_predecessor_batch_run_ref: reclaimedPredecessorBatchRunRef,
  });
  const globalConcurrencyProfile = defaultNightlyGlobalConcurrencyProfile(
    input.global_concurrency_profile,
  );

  if (!allPrerequisitesFrozen(input)) {
    const blocked = buildBlockedBatch({
      ...input,
      scheduler_dedupe_key: schedulerDedupeKey,
      batch_run_id: batchRunId,
      global_concurrency_profile: globalConcurrencyProfile,
    });
    return {
      allocation_state: "ALLOCATED",
      stored: await input.repository.persistNightlyBatchRun({
        batch_run: blocked,
        persisted_at: input.trigger_observed_at,
      }),
    };
  }

  const candidates = input.candidates ?? [];
  const candidateIdentityHashes = candidates.map((candidate) =>
    deriveNightlySelectionCandidateIdentityHash({
      tenant_id: input.tenant_id,
      nightly_window_key: input.nightly_window_key,
      client_id: candidate.client_id,
      period: candidate.period,
      requested_scope: candidate.requested_scope,
    }),
  );
  const selectionUniverseHash =
    deriveNightlySelectionUniverseHashFromCandidateHashes(candidateIdentityHashes);
  const selectionUniverseCount = candidates.length;
  const selectionStartedAuditRef = transitionAuditRef({
    batch_run_id: batchRunId,
    event: "selection_started",
    observed_at: input.trigger_observed_at,
  });
  const selectionCompletedAuditRef = transitionAuditRef({
    batch_run_id: batchRunId,
    event: "selection_completed",
    observed_at: input.trigger_observed_at,
  });
  const identityContract = buildNightlyBatchIdentityContract({
    tenant_id: input.tenant_id,
    nightly_window_key: input.nightly_window_key,
    trigger_class: input.trigger_class,
    release_verification_manifest_ref: input.release_verification_manifest_ref,
    policy_snapshot_hash: input.policy_snapshot_hash,
    autopilot_policy_hash: input.autopilot_policy_hash,
    scheduler_dedupe_key: schedulerDedupeKey,
    schema_bundle_hash: input.schema_bundle_hash,
    code_build_id: input.code_build_id,
    environment_ref: input.environment_ref,
    selection_universe_hash: selectionUniverseHash,
    selection_universe_count: selectionUniverseCount,
    reclaimed_predecessor_batch_run_ref_or_null: reclaimedPredecessorBatchRunRef,
    recovery_resume_state: recoveryResumeState(input),
  });
  const selectionEntries = selectNightlyPortfolio({
    batch_run: {
      batch_run_id: batchRunId,
      tenant_id: input.tenant_id,
      nightly_window_key: input.nightly_window_key,
      trigger_class: input.trigger_class,
      recovery_resume_state: recoveryResumeState(input),
      policy_snapshot_hash: input.policy_snapshot_hash,
      autopilot_policy_hash: input.autopilot_policy_hash,
      release_verification_manifest_ref: input.release_verification_manifest_ref,
      schema_bundle_hash: input.schema_bundle_hash,
      code_build_id: input.code_build_id,
      environment_ref: input.environment_ref,
      selection_universe_hash: selectionUniverseHash,
      global_concurrency_profile: globalConcurrencyProfile,
    },
    candidates,
  });
  const selectingBatch = buildNightlyBatchRunRecord({
    batch_run_id: batchRunId,
    tenant_id: input.tenant_id,
    execution_mode_boundary_contract: buildNightlyExecutionModeBoundaryContract(),
    nightly_window_key: input.nightly_window_key,
    trigger_class: input.trigger_class,
    reclaimed_predecessor_batch_run_ref: reclaimedPredecessorBatchRunRef,
    lifecycle_state: "SELECTING",
    state_transition_contract: buildNightlyBatchStateTransitionContract({
      current_state: "SELECTING",
      previous_state_or_null: "ALLOCATED",
      transition_event_code: "selection_started",
      transition_applied_at: input.trigger_observed_at,
      transition_audit_ref: selectionStartedAuditRef,
    }),
    identity_contract: identityContract,
    scheduler_dedupe_key: schedulerDedupeKey,
    scheduled_for: input.scheduled_for,
    trigger_observed_at: input.trigger_observed_at,
    initiating_principal_context_ref: input.initiating_principal_context_ref,
    policy_snapshot_hash: input.policy_snapshot_hash,
    autopilot_policy_hash: input.autopilot_policy_hash,
    release_verification_manifest_ref: input.release_verification_manifest_ref,
    schema_bundle_hash: input.schema_bundle_hash,
    schema_reader_window_contract: buildNightlySchemaReaderWindowContract({
      schema_bundle_hash: input.schema_bundle_hash,
      compatibility_window_ref: input.compatibility_window_ref,
      supported_reader_schema_bundle_hashes: input.supported_reader_schema_bundle_hashes,
      protected_historical_schema_bundle_hashes:
        input.protected_historical_schema_bundle_hashes,
    }),
    code_build_id: input.code_build_id,
    environment_ref: input.environment_ref,
    global_concurrency_profile: globalConcurrencyProfile,
    selection_universe_hash: selectionUniverseHash,
    selection_universe_count: selectionUniverseCount,
    recovery_resume_state: recoveryResumeState(input),
    backlog_pressure: null,
    portfolio_tail_risk: null,
    stability_state: null,
    selection_entries: selectionEntries,
    shard_plan: buildNightlyShardPlan({
      entries: selectionEntries,
      global_concurrency_profile: globalConcurrencyProfile,
      planned_at: null,
    }),
    selection_started_at: input.trigger_observed_at,
    selection_completed_at: null,
    started_at: null,
    last_heartbeat_at: null,
    quiesced_at: null,
    completed_at: null,
    abandoned_at: null,
    successor_batch_run_ref: null,
    audit_refs: uniqueSorted([...(input.audit_refs ?? []), selectionStartedAuditRef]),
    provenance_refs: uniqueSorted(input.provenance_refs ?? []),
  });
  const plannedBatch = persistNightlySelectionDispositions({
    batch_run: selectingBatch,
    selection_entries: selectionEntries,
    selection_started_at: input.trigger_observed_at,
    selection_completed_at: input.trigger_observed_at,
    transition_audit_ref: selectionCompletedAuditRef,
    backlog_pressure:
      selectionEntries.length === 0
        ? 0
        : selectionEntries.length / globalConcurrencyProfile.global_manifest_limit,
    portfolio_tail_risk: Math.max(
      0,
      ...selectionEntries.map((entry) => entry.priority_tuple.risk_pressure ?? 0),
    ),
    stability_state: "NORMAL",
  });

  return {
    allocation_state: "ALLOCATED",
    stored: await input.repository.persistNightlyBatchRun({
      batch_run: plannedBatch,
      persisted_at: input.trigger_observed_at,
    }),
  };
}
