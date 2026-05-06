import {
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  type NightlyBatchOutcomeBucket,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
  type NightlyBatchRunShardPlanEntryRecord,
} from "../models/nightly_batch_run.ts";
import { isFailureOrHandoffOutcome } from "../models/operator_morning_digest.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";
import {
  deriveNightlySelectionBasisHash,
  deriveNightlyStableTieBreakKey,
} from "./derive_nightly_selection_universe_hash.ts";

export type NightlyBatchEntryOutcomeUpdate = {
  entry_id: string;
  outcome_bucket: NightlyBatchOutcomeBucket;
  manifest_ref?: string | null;
  executed_at?: string | null;
  workflow_item_refs?: readonly string[];
  next_checkpoint_at?: string | null;
};

export type NightlyShardFailureUpdate = {
  shard_key: string;
  blocked_entry_refs: readonly string[];
  failure_reason_codes: readonly string[];
  outcome_bucket?: Extract<NightlyBatchOutcomeBucket, "FAILED_RETRYABLE" | "FAILED_NON_RETRYABLE">;
};

export type AggregateNightlyBatchOutcomeInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  observed_at: string;
  outcome_updates?: readonly NightlyBatchEntryOutcomeUpdate[];
  failed_shards?: readonly NightlyShardFailureUpdate[];
};

export type AggregateNightlyBatchOutcomeResult = {
  aggregation_state: "UPDATED_RUNNING" | "QUIESCING";
  stored: StoredNightlyBatchRunRecord;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function workflowRefForOutcome(batchRunId: string, entryId: string, outcome: string) {
  return `workflow://nightly-handoff/${batchRunId}/${entryId}/${outcome.toLowerCase()}`;
}

function isExecutionEntry(entry: NightlyBatchRunSelectionEntryRecord) {
  return (
    entry.selection_disposition === "EXECUTE_NEW_MANIFEST" ||
    entry.selection_disposition === "EXECUTE_CONTINUATION_CHILD"
  );
}

function applyOutcomeUpdate(input: {
  batch_run_id: string;
  observed_at: string;
  entry: NightlyBatchRunSelectionEntryRecord;
  update: NightlyBatchEntryOutcomeUpdate;
}) {
  const outcomeBucket = input.update.outcome_bucket;
  if (outcomeBucket === "DEFERRED" && isExecutionEntry(input.entry)) {
    throw new Error("execution entries cannot be aggregated to DEFERRED");
  }
  const workflowItemRefs = isFailureOrHandoffOutcome(outcomeBucket)
    ? uniqueSorted(
        input.update.workflow_item_refs?.length
          ? input.update.workflow_item_refs
          : input.entry.workflow_item_refs.length
            ? input.entry.workflow_item_refs
            : [workflowRefForOutcome(input.batch_run_id, input.entry.entry_id, outcomeBucket)],
      )
    : uniqueSorted(input.update.workflow_item_refs ?? []);
  const needsCheckpoint =
    outcomeBucket === "WAITING_ON_AUTHORITY" ||
    outcomeBucket === "WAITING_ON_LATE_DATA" ||
    outcomeBucket === "DEFERRED";
  const manifestRef =
    outcomeBucket === "AUTO_COMPLETED"
      ? input.update.manifest_ref ??
        input.entry.manifest_ref ??
        `run-manifest://nightly/${input.batch_run_id}/${input.entry.entry_id}`
      : input.update.manifest_ref === undefined
        ? input.entry.manifest_ref
        : input.update.manifest_ref;
  return {
    ...input.entry,
    outcome_bucket: outcomeBucket,
    manifest_ref: manifestRef,
    executed_at:
      outcomeBucket === "AUTO_COMPLETED"
        ? input.update.executed_at ?? input.observed_at
        : input.update.executed_at === undefined
          ? input.entry.executed_at
          : input.update.executed_at,
    workflow_item_refs: workflowItemRefs,
    next_checkpoint_at: needsCheckpoint
      ? input.update.next_checkpoint_at ?? input.entry.next_checkpoint_at ?? input.observed_at
      : input.update.next_checkpoint_at === undefined
        ? input.entry.next_checkpoint_at
        : input.update.next_checkpoint_at,
  } satisfies NightlyBatchRunSelectionEntryRecord;
}

function aggregateAuditRef(input: AggregateNightlyBatchOutcomeInput) {
  return `audit://nightly-batch/${input.batch_run_id}/quiescence/${input.observed_at}`;
}

function updateShardStates(input: {
  batch: NightlyBatchRunRecord;
  entries: readonly NightlyBatchRunSelectionEntryRecord[];
  failed_shards: readonly NightlyShardFailureUpdate[];
}) {
  const failedByShard = new Map(input.failed_shards.map((failure) => [failure.shard_key, failure]));
  return input.batch.shard_plan.map((shard): NightlyBatchRunShardPlanEntryRecord => {
    const failure = failedByShard.get(shard.shard_key);
    if (failure) {
      const entryRefSet = new Set(shard.entry_refs);
      for (const blockedRef of failure.blocked_entry_refs) {
        if (!entryRefSet.has(blockedRef)) {
          throw new Error(`blocked entry ${blockedRef} is not part of shard ${shard.shard_key}`);
        }
      }
      return {
        ...shard,
        shard_state: "FAILED_ISOLATED",
        blocked_entry_refs: uniqueSorted(failure.blocked_entry_refs),
        failure_reason_codes: uniqueSorted(failure.failure_reason_codes),
        current_owner_ref: null,
      };
    }
    const entries = input.entries.filter((entry) => shard.entry_refs.includes(entry.entry_id));
    if (entries.length > 0 && entries.every((entry) => entry.outcome_bucket !== null)) {
      return {
        ...shard,
        shard_state: "COMPLETED",
        blocked_entry_refs: [],
        failure_reason_codes: [],
        current_owner_ref: null,
      };
    }
    return shard;
  });
}

function hasCompleteOutcomes(entries: readonly NightlyBatchRunSelectionEntryRecord[]) {
  return entries.every((entry) => entry.outcome_bucket !== null);
}

function rederiveSelectionEntry(
  batch: NightlyBatchRunRecord,
  entry: NightlyBatchRunSelectionEntryRecord,
) {
  const nextEntry: NightlyBatchRunSelectionEntryRecord = {
    ...entry,
    selection_basis_hash: "",
    priority_tuple: {
      ...entry.priority_tuple,
      stable_tie_break_key: "pending",
    },
  };
  const selectionBasisHash = deriveNightlySelectionBasisHash({
    batch,
    entry: nextEntry,
  });
  return {
    ...nextEntry,
    selection_basis_hash: selectionBasisHash,
    priority_tuple: {
      ...nextEntry.priority_tuple,
      stable_tie_break_key: deriveNightlyStableTieBreakKey({
        client_id: nextEntry.client_id,
        period: nextEntry.period,
        requested_scope: nextEntry.requested_scope,
        selection_basis_hash: selectionBasisHash,
      }),
    },
  } satisfies NightlyBatchRunSelectionEntryRecord;
}

export async function aggregateNightlyBatchOutcome(
  input: AggregateNightlyBatchOutcomeInput,
): Promise<AggregateNightlyBatchOutcomeResult> {
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const batch = stored.nightly_batch_run;
  if (batch.lifecycle_state !== "RUNNING") {
    throw new Error(`cannot aggregate batch while lifecycle_state is ${batch.lifecycle_state}`);
  }
  const updatesByEntryId = new Map(
    (input.outcome_updates ?? []).map((update) => [update.entry_id, update]),
  );
  const failureByEntryId = new Map<string, NightlyShardFailureUpdate>();
  for (const failure of input.failed_shards ?? []) {
    for (const entryRef of failure.blocked_entry_refs) {
      failureByEntryId.set(entryRef, failure);
    }
  }

  const entries = batch.selection_entries.map((entry) => {
    const explicitUpdate = updatesByEntryId.get(entry.entry_id);
    if (explicitUpdate) {
      return applyOutcomeUpdate({
        batch_run_id: batch.batch_run_id,
        observed_at: input.observed_at,
        entry,
        update: explicitUpdate,
      });
    }
    const failure = failureByEntryId.get(entry.entry_id);
    if (failure && entry.outcome_bucket === null) {
      return applyOutcomeUpdate({
        batch_run_id: batch.batch_run_id,
        observed_at: input.observed_at,
        entry,
        update: {
          entry_id: entry.entry_id,
          outcome_bucket: failure.outcome_bucket ?? "FAILED_RETRYABLE",
        },
      });
    }
    return entry;
  }).map((entry) => rederiveSelectionEntry(batch, entry));

  const complete = hasCompleteOutcomes(entries);
  const auditRef = aggregateAuditRef(input);
  const nextBatch = buildNightlyBatchRunRecord({
    ...batch,
    lifecycle_state: complete ? "QUIESCING" : batch.lifecycle_state,
    state_transition_contract: complete
      ? buildNightlyBatchStateTransitionContract({
          current_state: "QUIESCING",
          previous_state_or_null: "RUNNING",
          transition_event_code: "quiescence_reached",
          transition_applied_at: input.observed_at,
          transition_audit_ref: auditRef,
        })
      : batch.state_transition_contract,
    selection_entries: entries,
    shard_plan: updateShardStates({
      batch,
      entries,
      failed_shards: input.failed_shards ?? [],
    }),
    started_at: batch.started_at ?? input.observed_at,
    last_heartbeat_at: batch.last_heartbeat_at ?? input.observed_at,
    quiesced_at: complete ? input.observed_at : batch.quiesced_at,
    operator_digest_publication_state: complete
      ? "WORKFLOW_PUBLICATION_PENDING"
      : batch.operator_digest_publication_state,
    audit_refs: complete ? [...new Set([...batch.audit_refs, auditRef])].sort() : batch.audit_refs,
  });

  return {
    aggregation_state: complete ? "QUIESCING" : "UPDATED_RUNNING",
    stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
      batch_run: nextBatch,
      expected_row_version: stored.nightly_batch_run_row_version,
      persisted_at: input.observed_at,
    }),
  };
}
