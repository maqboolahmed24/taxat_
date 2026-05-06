import {
  assertNightlyBatchRun,
  buildNightlyBatchRunRecord,
  type NightlyBatchRunRecord,
  type NightlyBatchRunSelectionEntryRecord,
  type NightlyBatchRunShardPlanEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";

export type PlanNightlyShardsState = "PLANNED" | "REUSED_EXISTING_PLAN";

export type PlanNightlyShardsInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  planned_at: string;
};

export type PlanNightlyShardsResult = {
  planning_state: PlanNightlyShardsState;
  stored: StoredNightlyBatchRunRecord;
};

function isExecutionEntry(entry: NightlyBatchRunSelectionEntryRecord) {
  return (
    entry.selection_disposition === "EXECUTE_NEW_MANIFEST" ||
    entry.selection_disposition === "EXECUTE_CONTINUATION_CHILD"
  );
}

function stableEntryOrder(
  left: NightlyBatchRunSelectionEntryRecord,
  right: NightlyBatchRunSelectionEntryRecord,
) {
  return (
    (right.priority_tuple.priority_score ?? 0) - (left.priority_tuple.priority_score ?? 0) ||
    left.priority_tuple.stable_tie_break_key.localeCompare(
      right.priority_tuple.stable_tie_break_key,
    ) ||
    left.entry_id.localeCompare(right.entry_id)
  );
}

export function deriveStableNightlyShardPlan(input: {
  batch_run: NightlyBatchRunRecord;
  planned_at: string | null;
}) {
  const entriesByShard = new Map<string, NightlyBatchRunSelectionEntryRecord[]>();
  for (const entry of input.batch_run.selection_entries) {
    if (!isExecutionEntry(entry)) {
      continue;
    }
    if (entry.shard_key === null) {
      throw new Error(`execution entry ${entry.entry_id} is missing shard_key`);
    }
    const entries = entriesByShard.get(entry.shard_key) ?? [];
    entries.push(entry);
    entriesByShard.set(entry.shard_key, entries);
  }
  return [...entriesByShard.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardKey, entries]): NightlyBatchRunShardPlanEntryRecord => ({
      shard_key: shardKey,
      entry_refs: [...entries].sort(stableEntryOrder).map((entry) => entry.entry_id),
      max_concurrent_manifests:
        input.batch_run.global_concurrency_profile.per_shard_manifest_limit,
      shard_state: "PLANNED",
      blocked_entry_refs: [],
      failure_reason_codes: [],
      last_heartbeat_at: input.planned_at,
      current_owner_ref: null,
    }));
}

function equivalentShardPlan(
  left: readonly NightlyBatchRunShardPlanEntryRecord[],
  right: readonly NightlyBatchRunShardPlanEntryRecord[],
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function planNightlyShards(
  input: PlanNightlyShardsInput,
): Promise<PlanNightlyShardsResult> {
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const batch = assertNightlyBatchRun(stored.nightly_batch_run);
  if (batch.selection_completed_at === null) {
    throw new Error("nightly shard planning requires completed selection entries");
  }
  if (batch.lifecycle_state !== "PLANNED") {
    return {
      planning_state: "REUSED_EXISTING_PLAN",
      stored,
    };
  }
  const plannedShardPlan = deriveStableNightlyShardPlan({
    batch_run: batch,
    planned_at: batch.selection_completed_at ?? input.planned_at,
  });
  if (equivalentShardPlan(batch.shard_plan, plannedShardPlan)) {
    return {
      planning_state: "REUSED_EXISTING_PLAN",
      stored,
    };
  }
  const plannedBatch = buildNightlyBatchRunRecord({
    ...batch,
    shard_plan: plannedShardPlan,
  });
  return {
    planning_state: "PLANNED",
    stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
      batch_run: plannedBatch,
      expected_row_version: stored.nightly_batch_run_row_version,
      persisted_at: input.planned_at,
    }),
  };
}
