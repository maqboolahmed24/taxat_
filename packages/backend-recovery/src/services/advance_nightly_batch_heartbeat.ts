import {
  buildNightlyBatchRunRecord,
  type NightlyBatchRunShardPlanEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";

export type AdvanceNightlyBatchHeartbeatInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  shard_key: string;
  owner_ref: string;
  heartbeat_at: string;
};

export type AdvanceNightlyBatchHeartbeatResult = {
  heartbeat_state: "ADVANCED";
  stored: StoredNightlyBatchRunRecord;
};

function replaceShard(
  shards: readonly NightlyBatchRunShardPlanEntryRecord[],
  shardKey: string,
  ownerRef: string,
  heartbeatAt: string,
) {
  let found = false;
  const next = shards.map((shard) => {
    if (shard.shard_key !== shardKey) {
      return shard;
    }
    found = true;
    if (shard.shard_state !== "RUNNING") {
      throw new Error(`cannot heartbeat shard ${shardKey} from state ${shard.shard_state}`);
    }
    if (shard.current_owner_ref !== ownerRef) {
      throw new Error(
        `cannot heartbeat shard ${shardKey}; owner ${ownerRef} does not match ${shard.current_owner_ref}`,
      );
    }
    return {
      ...shard,
      last_heartbeat_at: heartbeatAt,
    };
  });
  if (!found) {
    throw new Error(`shard ${shardKey} does not exist`);
  }
  return next;
}

export async function advanceNightlyBatchHeartbeat(
  input: AdvanceNightlyBatchHeartbeatInput,
): Promise<AdvanceNightlyBatchHeartbeatResult> {
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const batch = stored.nightly_batch_run;
  if (batch.lifecycle_state !== "RUNNING") {
    throw new Error(`cannot heartbeat batch while lifecycle_state is ${batch.lifecycle_state}`);
  }
  const nextBatch = buildNightlyBatchRunRecord({
    ...batch,
    shard_plan: replaceShard(
      batch.shard_plan,
      input.shard_key,
      input.owner_ref,
      input.heartbeat_at,
    ),
    last_heartbeat_at: input.heartbeat_at,
  });
  return {
    heartbeat_state: "ADVANCED",
    stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
      batch_run: nextBatch,
      expected_row_version: stored.nightly_batch_run_row_version,
      persisted_at: input.heartbeat_at,
    }),
  };
}
