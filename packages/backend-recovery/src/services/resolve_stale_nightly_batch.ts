import {
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  buildNightlySchemaReaderWindowContract,
  nightlyBatchRunRef,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
  type NightlyBatchRunShardPlanEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  buildNightlyBatchIdentityContract,
  deriveNightlySchedulerDedupeKey,
} from "../models/nightly_batch_identity_contract.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";
import {
  deriveNightlyBatchRunId,
  deriveNightlySelectionBasisHash,
  deriveNightlyStableTieBreakKey,
} from "./derive_nightly_selection_universe_hash.ts";
import { deriveStableNightlyShardPlan } from "./plan_nightly_shards.ts";

export type ResolveStaleNightlyBatchInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  observed_at: string;
  reclaiming_principal_ref: string;
  durable_cursor_recovered: boolean;
  active_manifest_lease_posture_checked: boolean;
  persisted_attempt_recovery_checked: boolean;
  recovery_resume_state?: "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" | "PREDECESSOR_SELECTION_REUSED_RESHARDED";
};

export type ResolveStaleNightlyBatchResult = {
  reclaim_state: "RECLAIMED" | "ALREADY_RECLAIMED";
  predecessor: StoredNightlyBatchRunRecord;
  successor: StoredNightlyBatchRunRecord;
};

function parseInstant(label: string, value: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be a valid instant`);
  }
  return time;
}

function assertStale(input: { batch: NightlyBatchRunRecord; observed_at: string }) {
  if (input.batch.last_heartbeat_at === null) {
    throw new Error("stale reclaim requires a persisted last_heartbeat_at proof");
  }
  const elapsedSeconds =
    (parseInstant("observed_at", input.observed_at) -
      parseInstant("last_heartbeat_at", input.batch.last_heartbeat_at)) /
    1000;
  if (elapsedSeconds <= input.batch.global_concurrency_profile.stale_heartbeat_after_seconds) {
    throw new Error("nightly batch heartbeat is not stale enough for reclaim");
  }
}

function recoveryAuditRef(input: ResolveStaleNightlyBatchInput, event: string) {
  return `audit://nightly-batch/${input.batch_run_id}/${event}/${input.observed_at}`;
}

function workflowRefForReclaimedEntry(batchRunId: string, entryId: string) {
  return `workflow://nightly-reclaim/${batchRunId}/${entryId}`;
}

function abandonSelectionEntry(
  batch: NightlyBatchRunRecord,
  entry: NightlyBatchRunSelectionEntryRecord,
) {
  if (entry.outcome_bucket !== null) {
    return entry;
  }
  return {
    ...entry,
    outcome_bucket: "FAILED_RETRYABLE",
    workflow_item_refs: entry.workflow_item_refs.length
      ? entry.workflow_item_refs
      : [workflowRefForReclaimedEntry(batch.batch_run_id, entry.entry_id)],
  } satisfies NightlyBatchRunSelectionEntryRecord;
}

function reclaimShardPlan(
  batch: NightlyBatchRunRecord,
  abandonedEntries: readonly NightlyBatchRunSelectionEntryRecord[],
) {
  const abandonedByEntryId = new Map(
    abandonedEntries.map((entry) => [entry.entry_id, entry.outcome_bucket]),
  );
  return batch.shard_plan.map((shard): NightlyBatchRunShardPlanEntryRecord => {
    const blockedEntryRefs = shard.entry_refs.filter((entryRef) => {
      const prior = batch.selection_entries.find((entry) => entry.entry_id === entryRef);
      return prior?.outcome_bucket === null && abandonedByEntryId.get(entryRef) !== null;
    });
    if (blockedEntryRefs.length === 0) {
      return shard;
    }
    return {
      ...shard,
      shard_state: "RECLAIM_REQUIRED",
      blocked_entry_refs: blockedEntryRefs.sort((left, right) => left.localeCompare(right)),
      failure_reason_codes: ["STALE_HEARTBEAT_RECLAIMED"],
      current_owner_ref: null,
    };
  });
}

function rederiveSuccessorSelectionEntries(input: {
  successor_batch: Pick<
    NightlyBatchRunRecord,
    | "batch_run_id"
    | "tenant_id"
    | "nightly_window_key"
    | "trigger_class"
    | "recovery_resume_state"
    | "policy_snapshot_hash"
    | "autopilot_policy_hash"
    | "release_verification_manifest_ref"
    | "schema_bundle_hash"
    | "code_build_id"
    | "environment_ref"
    | "selection_universe_hash"
    | "global_concurrency_profile"
  >;
  predecessor_entries: readonly NightlyBatchRunSelectionEntryRecord[];
}) {
  return input.predecessor_entries.map((entry) => {
    const nextEntry: NightlyBatchRunSelectionEntryRecord = {
      ...entry,
      selection_basis_hash: "",
      priority_tuple: {
        ...entry.priority_tuple,
        stable_tie_break_key: "pending",
      },
    };
    const selectionBasisHash = deriveNightlySelectionBasisHash({
      batch: input.successor_batch,
      entry: nextEntry,
    });
    nextEntry.selection_basis_hash = selectionBasisHash;
    nextEntry.priority_tuple = {
      ...nextEntry.priority_tuple,
      stable_tie_break_key: deriveNightlyStableTieBreakKey({
        client_id: nextEntry.client_id,
        period: nextEntry.period,
        requested_scope: nextEntry.requested_scope,
        selection_basis_hash: selectionBasisHash,
      }),
    };
    return nextEntry;
  });
}

function buildSuccessorBatch(input: {
  predecessor: NightlyBatchRunRecord;
  successor_batch_run_id: string;
  successor_scheduler_dedupe_key: string;
  predecessor_ref: string;
  observed_at: string;
  reclaiming_principal_ref: string;
  recovery_resume_state: "PREDECESSOR_SELECTION_AND_SHARDS_RESUMED" | "PREDECESSOR_SELECTION_REUSED_RESHARDED";
}) {
  const identityContract = buildNightlyBatchIdentityContract({
    tenant_id: input.predecessor.tenant_id,
    nightly_window_key: input.predecessor.nightly_window_key,
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    release_verification_manifest_ref: input.predecessor.release_verification_manifest_ref,
    policy_snapshot_hash: input.predecessor.policy_snapshot_hash,
    autopilot_policy_hash: input.predecessor.autopilot_policy_hash,
    scheduler_dedupe_key: input.successor_scheduler_dedupe_key,
    schema_bundle_hash: input.predecessor.schema_bundle_hash,
    code_build_id: input.predecessor.code_build_id,
    environment_ref: input.predecessor.environment_ref,
    selection_universe_hash: input.predecessor.selection_universe_hash,
    selection_universe_count: input.predecessor.selection_universe_count,
    reclaimed_predecessor_batch_run_ref_or_null: input.predecessor_ref,
    recovery_resume_state: input.recovery_resume_state,
  });
  const successorBasis = {
    batch_run_id: input.successor_batch_run_id,
    tenant_id: input.predecessor.tenant_id,
    nightly_window_key: input.predecessor.nightly_window_key,
    trigger_class: "RECOVERY_RECLAIM_WINDOW" as const,
    recovery_resume_state: input.recovery_resume_state,
    policy_snapshot_hash: input.predecessor.policy_snapshot_hash,
    autopilot_policy_hash: input.predecessor.autopilot_policy_hash,
    release_verification_manifest_ref: input.predecessor.release_verification_manifest_ref,
    schema_bundle_hash: input.predecessor.schema_bundle_hash,
    code_build_id: input.predecessor.code_build_id,
    environment_ref: input.predecessor.environment_ref,
    selection_universe_hash: input.predecessor.selection_universe_hash,
    global_concurrency_profile: input.predecessor.global_concurrency_profile,
  };
  const selectionEntries = rederiveSuccessorSelectionEntries({
    successor_batch: successorBasis,
    predecessor_entries: input.predecessor.selection_entries,
  });
  const auditRef = `audit://nightly-batch/${input.successor_batch_run_id}/recovery_successor_planned/${input.observed_at}`;
  const successor = buildNightlyBatchRunRecord({
    batch_run_id: input.successor_batch_run_id,
    tenant_id: input.predecessor.tenant_id,
    execution_mode_boundary_contract: input.predecessor.execution_mode_boundary_contract,
    nightly_window_key: input.predecessor.nightly_window_key,
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    reclaimed_predecessor_batch_run_ref: input.predecessor_ref,
    lifecycle_state: "PLANNED",
    state_transition_contract: buildNightlyBatchStateTransitionContract({
      current_state: "PLANNED",
      previous_state_or_null: "SELECTING",
      transition_event_code: "selection_completed",
      transition_applied_at: input.observed_at,
      transition_audit_ref: auditRef,
    }),
    identity_contract: identityContract,
    scheduler_dedupe_key: input.successor_scheduler_dedupe_key,
    scheduled_for: input.predecessor.scheduled_for,
    trigger_observed_at: input.observed_at,
    initiating_principal_context_ref: input.reclaiming_principal_ref,
    policy_snapshot_hash: input.predecessor.policy_snapshot_hash,
    autopilot_policy_hash: input.predecessor.autopilot_policy_hash,
    release_verification_manifest_ref: input.predecessor.release_verification_manifest_ref,
    schema_bundle_hash: input.predecessor.schema_bundle_hash,
    schema_reader_window_contract: buildNightlySchemaReaderWindowContract({
      schema_bundle_hash: input.predecessor.schema_bundle_hash,
      compatibility_window_ref:
        input.predecessor.schema_reader_window_contract.compatibility_window_ref,
      supported_reader_schema_bundle_hashes:
        input.predecessor.schema_reader_window_contract.supported_reader_schema_bundle_hashes,
      protected_historical_schema_bundle_hashes:
        input.predecessor.schema_reader_window_contract
          .protected_historical_schema_bundle_hashes,
    }),
    code_build_id: input.predecessor.code_build_id,
    environment_ref: input.predecessor.environment_ref,
    global_concurrency_profile: input.predecessor.global_concurrency_profile,
    selection_universe_hash: input.predecessor.selection_universe_hash,
    selection_universe_count: input.predecessor.selection_universe_count,
    recovery_resume_state: input.recovery_resume_state,
    backlog_pressure: input.predecessor.backlog_pressure,
    portfolio_tail_risk: input.predecessor.portfolio_tail_risk,
    stability_state: input.predecessor.stability_state,
    selection_entries: selectionEntries,
    shard_plan: deriveStableNightlyShardPlan({
      batch_run: {
        ...input.predecessor,
        ...successorBasis,
        selection_entries: selectionEntries,
      },
      planned_at: input.observed_at,
    }),
    selection_started_at: input.observed_at,
    selection_completed_at: input.observed_at,
    started_at: null,
    last_heartbeat_at: null,
    quiesced_at: null,
    completed_at: null,
    abandoned_at: null,
    successor_batch_run_ref: null,
    operator_digest_publication_state: "NOT_READY",
    operator_digest_derivation_contract_or_null: null,
    operator_digest_ref: null,
    audit_refs: [auditRef],
    provenance_refs: [...new Set([...input.predecessor.provenance_refs, input.predecessor_ref])].sort(),
  });
  return successor;
}

export async function resolveStaleNightlyBatch(
  input: ResolveStaleNightlyBatchInput,
): Promise<ResolveStaleNightlyBatchResult> {
  if (
    !input.durable_cursor_recovered ||
    !input.active_manifest_lease_posture_checked ||
    !input.persisted_attempt_recovery_checked
  ) {
    throw new Error(
      "stale reclaim requires durable cursor, manifest lease, and persisted attempt recovery checks",
    );
  }
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const predecessor = stored.nightly_batch_run;
  if (predecessor.lifecycle_state === "ABANDONED") {
    if (predecessor.successor_batch_run_ref === null) {
      throw new Error("abandoned predecessor is missing successor linkage");
    }
    const successor = await input.repository.findNightlyBatchRunByRef(
      predecessor.successor_batch_run_ref,
    );
    if (!successor) {
      throw new Error("abandoned predecessor successor linkage is dangling");
    }
    return {
      reclaim_state: "ALREADY_RECLAIMED",
      predecessor: stored,
      successor,
    };
  }
  if (!["RUNNING", "QUIESCING", "BLOCKED", "FAILED"].includes(predecessor.lifecycle_state)) {
    throw new Error(`cannot reclaim lifecycle_state ${predecessor.lifecycle_state}`);
  }
  assertStale({ batch: predecessor, observed_at: input.observed_at });

  const predecessorRef = nightlyBatchRunRef(predecessor);
  const recoveryResumeState =
    input.recovery_resume_state ?? "PREDECESSOR_SELECTION_REUSED_RESHARDED";
  const successorSchedulerDedupeKey = deriveNightlySchedulerDedupeKey({
    tenant_id: predecessor.tenant_id,
    nightly_window_key: predecessor.nightly_window_key,
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    release_verification_manifest_ref: predecessor.release_verification_manifest_ref,
    policy_snapshot_hash: predecessor.policy_snapshot_hash,
    autopilot_policy_hash: predecessor.autopilot_policy_hash,
  });
  const existingSuccessor = await input.repository.findNightlyBatchRunBySchedulerDedupeKey(
    successorSchedulerDedupeKey,
  );
  const successorBatchRunId =
    existingSuccessor?.batch_run_id ??
    deriveNightlyBatchRunId({
      tenant_id: predecessor.tenant_id,
      nightly_window_key: predecessor.nightly_window_key,
      scheduler_dedupe_key: successorSchedulerDedupeKey,
      reclaimed_predecessor_batch_run_ref: predecessorRef,
    });
  const successorRef =
    existingSuccessor?.nightly_batch_run_ref ??
    nightlyBatchRunRef({ batch_run_id: successorBatchRunId });
  const abandonedEntries = predecessor.selection_entries.map((entry) =>
    abandonSelectionEntry(predecessor, entry),
  );
  const reclaimAuditRef = recoveryAuditRef(input, "reclaimed_by_successor");
  const abandonedPredecessor = buildNightlyBatchRunRecord({
    ...predecessor,
    lifecycle_state: "ABANDONED",
    state_transition_contract: buildNightlyBatchStateTransitionContract({
      current_state: "ABANDONED",
      previous_state_or_null: predecessor.lifecycle_state,
      transition_event_code: "reclaimed_by_successor",
      transition_applied_at: input.observed_at,
      transition_audit_ref: reclaimAuditRef,
    }),
    selection_entries: abandonedEntries,
    shard_plan: reclaimShardPlan(predecessor, abandonedEntries),
    abandoned_at: input.observed_at,
    successor_batch_run_ref: successorRef,
    audit_refs: [...new Set([...predecessor.audit_refs, reclaimAuditRef])].sort(),
  });
  const predecessorStored = await input.repository.upsertNightlyBatchRunIfRowVersion({
    batch_run: abandonedPredecessor,
    expected_row_version: stored.nightly_batch_run_row_version,
    persisted_at: input.observed_at,
  });

  if (existingSuccessor) {
    return {
      reclaim_state: "RECLAIMED",
      predecessor: predecessorStored,
      successor: existingSuccessor,
    };
  }
  const successor = buildSuccessorBatch({
    predecessor,
    successor_batch_run_id: successorBatchRunId,
    successor_scheduler_dedupe_key: successorSchedulerDedupeKey,
    predecessor_ref: predecessorRef,
    observed_at: input.observed_at,
    reclaiming_principal_ref: input.reclaiming_principal_ref,
    recovery_resume_state: recoveryResumeState,
  });
  return {
    reclaim_state: "RECLAIMED",
    predecessor: predecessorStored,
    successor: await input.repository.persistNightlyBatchRun({
      batch_run: successor,
      persisted_at: input.observed_at,
    }),
  };
}
