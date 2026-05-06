import {
  buildNightlyBatchRunRecord,
  buildNightlyBatchStateTransitionContract,
  type NightlyBatchRunRecord,
  type NightlyBatchRunShardPlanEntryRecord,
} from "../models/nightly_batch_run.ts";
import {
  NightlyBatchRunRepository,
  type StoredNightlyBatchRunRecord,
} from "../repositories/nightly_batch_run_repository.ts";

export type ClaimNightlyShardLeaseState = "CLAIMED" | "ALREADY_OWNED";

export type ClaimNightlyShardLeaseInput = {
  repository: NightlyBatchRunRepository;
  batch_run_id: string;
  shard_key: string;
  owner_ref: string;
  claimed_at: string;
};

export type ClaimNightlyShardLeaseResult = {
  claim_state: ClaimNightlyShardLeaseState;
  stored: StoredNightlyBatchRunRecord;
};

function claimAuditRef(input: ClaimNightlyShardLeaseInput) {
  return `audit://nightly-shard/${input.batch_run_id}/${input.shard_key}/claimed/${input.claimed_at}`;
}

function replaceShard(
  batch: NightlyBatchRunRecord,
  shardKey: string,
  update: (shard: NightlyBatchRunShardPlanEntryRecord) => NightlyBatchRunShardPlanEntryRecord,
) {
  let found = false;
  const shardPlan = batch.shard_plan.map((shard) => {
    if (shard.shard_key !== shardKey) {
      return shard;
    }
    found = true;
    return update(shard);
  });
  if (!found) {
    throw new Error(`shard ${shardKey} does not exist on batch ${batch.batch_run_id}`);
  }
  return shardPlan;
}

export async function claimNightlyShardLease(
  input: ClaimNightlyShardLeaseInput,
): Promise<ClaimNightlyShardLeaseResult> {
  const stored = await input.repository.getNightlyBatchRunById(input.batch_run_id);
  const batch = stored.nightly_batch_run;
  if (batch.lifecycle_state !== "PLANNED" && batch.lifecycle_state !== "RUNNING") {
    throw new Error(`cannot claim shard while batch is ${batch.lifecycle_state}`);
  }

  let claimState: ClaimNightlyShardLeaseState = "CLAIMED";
  const shardPlan = replaceShard(batch, input.shard_key, (shard) => {
    if (shard.shard_state === "RUNNING" && shard.current_owner_ref === input.owner_ref) {
      claimState = "ALREADY_OWNED";
      return {
        ...shard,
        last_heartbeat_at: input.claimed_at,
      };
    }
    if (shard.shard_state !== "PLANNED") {
      throw new Error(
        `shard ${input.shard_key} cannot be claimed from state ${shard.shard_state}`,
      );
    }
    if (shard.current_owner_ref !== null) {
      throw new Error(`shard ${input.shard_key} already has owner ${shard.current_owner_ref}`);
    }
    return {
      ...shard,
      shard_state: "RUNNING",
      current_owner_ref: input.owner_ref,
      last_heartbeat_at: input.claimed_at,
    };
  });

  const auditRef = claimAuditRef(input);
  const nextBatch = buildNightlyBatchRunRecord({
    ...batch,
    lifecycle_state: "RUNNING",
    state_transition_contract:
      batch.lifecycle_state === "PLANNED"
        ? buildNightlyBatchStateTransitionContract({
            current_state: "RUNNING",
            previous_state_or_null: "PLANNED",
            transition_event_code: "batch_started",
            transition_applied_at: input.claimed_at,
            transition_audit_ref: auditRef,
          })
        : batch.state_transition_contract,
    shard_plan: shardPlan,
    started_at: batch.started_at ?? input.claimed_at,
    last_heartbeat_at: input.claimed_at,
    audit_refs: [...new Set([...batch.audit_refs, auditRef])].sort(),
  });

  return {
    claim_state: claimState,
    stored: await input.repository.upsertNightlyBatchRunIfRowVersion({
      batch_run: nextBatch,
      expected_row_version: stored.nightly_batch_run_row_version,
      persisted_at: input.claimed_at,
    }),
  };
}
