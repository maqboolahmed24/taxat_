import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  advanceNightlyBatchHeartbeat,
  aggregateNightlyBatchOutcome,
  allocateNightlyBatchRun,
  claimNightlyShardLease,
  NightlyBatchRunRepository,
  nightlyBatchRunRef,
  planNightlyShards,
  resolveStaleNightlyBatch,
  type NightlyPortfolioCandidateInput,
} from "../index.ts";

const candidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "client-auto",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.alpha",
    fairness_group_key: "HMRC|SUBMISSION|A",
    priority_tuple: {
      priority_score: 5,
      deadline_pressure: 0.9,
      risk_pressure: 0.4,
    },
  },
  {
    client_id: "client-wait",
    period: "2025-26",
    requested_scope: ["prepare_submission"],
    shard_key: "nightly-shard.alpha",
    fairness_group_key: "HMRC|SUBMISSION|A",
    priority_tuple: {
      priority_score: 3,
      deadline_pressure: 0.5,
      risk_pressure: 0.7,
    },
  },
  {
    client_id: "client-fail",
    period: "2025-26",
    requested_scope: ["quarterly_update"],
    shard_key: "nightly-shard.beta",
    fairness_group_key: "HMRC|SUBMISSION|B",
    priority_tuple: {
      priority_score: 4,
      deadline_pressure: 0.6,
      risk_pressure: 0.8,
    },
  },
  {
    client_id: "client-reused",
    period: "2025-26",
    requested_scope: ["estimate_only"],
    reusable_terminal_result: {
      prior_manifest_ref: "run-manifest://terminal/client-reused",
    },
  },
  {
    client_id: "client-deferred",
    period: "2025-26",
    requested_scope: ["submit"],
    active_attempt_ref: "active-attempt-client-deferred",
    next_checkpoint_at: "2026-05-06T01:00:00+00:00",
  },
];

function allocationInput(repository: NightlyBatchRunRepository) {
  return {
    repository,
    tenant_id: "tenant.pc0207",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW" as const,
    release_verification_manifest_ref: "release-verification://pc0207/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0207",
    autopilot_policy_hash: "autopilot-policy-hash-pc0207",
    schema_bundle_hash: "schema-bundle-hash-pc0207",
    code_build_id: "build-pc0207",
    environment_ref: "PRODUCTION" as const,
    scheduled_for: "2026-05-05T22:00:00+00:00",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
    initiating_principal_context_ref: "principal://scheduler-service",
    candidates,
    global_concurrency_profile: {
      stale_heartbeat_after_seconds: 180,
      heartbeat_interval_seconds: 30,
      per_shard_manifest_limit: 2,
    },
  };
}

async function allocatePlannedBatch(repository: NightlyBatchRunRepository) {
  const allocated = await allocateNightlyBatchRun(allocationInput(repository));
  await validateContractSchema("nightly_batch_run", allocated.stored.nightly_batch_run);
  return allocated.stored;
}

test("plans stable shards once, claims by durable owner, and advances heartbeat with row-version fencing", async () => {
  const repository = new NightlyBatchRunRepository();
  const planned = await allocatePlannedBatch(repository);
  const firstPlan = await planNightlyShards({
    repository,
    batch_run_id: planned.batch_run_id,
    planned_at: "2026-05-05T22:00:02+00:00",
  });
  const secondPlan = await planNightlyShards({
    repository,
    batch_run_id: planned.batch_run_id,
    planned_at: "2026-05-05T22:00:03+00:00",
  });

  expect(firstPlan.planning_state).toBe("REUSED_EXISTING_PLAN");
  expect(secondPlan.planning_state).toBe("REUSED_EXISTING_PLAN");
  expect(secondPlan.stored.nightly_batch_run.shard_plan.map((shard) => shard.shard_key)).toEqual([
    "nightly-shard.alpha",
    "nightly-shard.beta",
  ]);

  const claimed = await claimNightlyShardLease({
    repository,
    batch_run_id: planned.batch_run_id,
    shard_key: "nightly-shard.alpha",
    owner_ref: "worker://nightly/autopilot-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });
  await validateContractSchema("nightly_batch_run", claimed.stored.nightly_batch_run);
  expect(claimed.claim_state).toBe("CLAIMED");
  expect(claimed.stored.nightly_batch_run.lifecycle_state).toBe("RUNNING");
  expect(
    claimed.stored.nightly_batch_run.shard_plan.find(
      (shard) => shard.shard_key === "nightly-shard.alpha",
    )?.current_owner_ref,
  ).toBe("worker://nightly/autopilot-a");

  const heartbeat = await advanceNightlyBatchHeartbeat({
    repository,
    batch_run_id: planned.batch_run_id,
    shard_key: "nightly-shard.alpha",
    owner_ref: "worker://nightly/autopilot-a",
    heartbeat_at: "2026-05-05T22:01:30+00:00",
  });
  expect(heartbeat.stored.nightly_batch_run.last_heartbeat_at).toBe(
    "2026-05-05T22:01:30+00:00",
  );
  await expect(
    advanceNightlyBatchHeartbeat({
      repository,
      batch_run_id: planned.batch_run_id,
      shard_key: "nightly-shard.alpha",
      owner_ref: "worker://nightly/other",
      heartbeat_at: "2026-05-05T22:02:00+00:00",
    }),
  ).rejects.toThrow(/owner/);
});

test("isolated shard failure preserves unrelated outcomes and reaches quiescence with explicit accounting", async () => {
  const repository = new NightlyBatchRunRepository();
  const planned = await allocatePlannedBatch(repository);
  await claimNightlyShardLease({
    repository,
    batch_run_id: planned.batch_run_id,
    shard_key: "nightly-shard.alpha",
    owner_ref: "worker://nightly/autopilot-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });
  await claimNightlyShardLease({
    repository,
    batch_run_id: planned.batch_run_id,
    shard_key: "nightly-shard.beta",
    owner_ref: "worker://nightly/autopilot-b",
    claimed_at: "2026-05-05T22:01:10+00:00",
  });
  const running = await repository.getNightlyBatchRunById(planned.batch_run_id);
  const byClient = new Map(
    running.nightly_batch_run.selection_entries.map((entry) => [entry.client_id, entry]),
  );
  const aggregated = await aggregateNightlyBatchOutcome({
    repository,
    batch_run_id: planned.batch_run_id,
    observed_at: "2026-05-05T22:20:00+00:00",
    outcome_updates: [
      {
        entry_id: byClient.get("client-auto")!.entry_id,
        outcome_bucket: "AUTO_COMPLETED",
        manifest_ref: "run-manifest://nightly/client-auto",
      },
      {
        entry_id: byClient.get("client-wait")!.entry_id,
        outcome_bucket: "WAITING_ON_AUTHORITY",
        workflow_item_refs: ["workflow://authority/client-wait"],
        next_checkpoint_at: "2026-05-06T08:00:00+00:00",
      },
    ],
    failed_shards: [
      {
        shard_key: "nightly-shard.beta",
        blocked_entry_refs: [byClient.get("client-fail")!.entry_id],
        failure_reason_codes: ["AUTHORITY_EDGE_TIMEOUT"],
        outcome_bucket: "FAILED_RETRYABLE",
      },
    ],
  });

  await validateContractSchema("nightly_batch_run", aggregated.stored.nightly_batch_run);
  expect(aggregated.aggregation_state).toBe("QUIESCING");
  expect(aggregated.stored.nightly_batch_run.lifecycle_state).toBe("QUIESCING");
  expect(
    aggregated.stored.nightly_batch_run.selection_entries.find(
      (entry) => entry.client_id === "client-auto",
    )?.outcome_bucket,
  ).toBe("AUTO_COMPLETED");
  expect(
    aggregated.stored.nightly_batch_run.shard_plan.find(
      (shard) => shard.shard_key === "nightly-shard.beta",
    )?.blocked_entry_refs,
  ).toEqual([byClient.get("client-fail")!.entry_id]);
});

test("stale reclaim rejects non-stale owners and records predecessor-successor lineage", async () => {
  const repository = new NightlyBatchRunRepository();
  const planned = await allocatePlannedBatch(repository);
  const claimed = await claimNightlyShardLease({
    repository,
    batch_run_id: planned.batch_run_id,
    shard_key: "nightly-shard.alpha",
    owner_ref: "worker://nightly/autopilot-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });

  await expect(
    resolveStaleNightlyBatch({
      repository,
      batch_run_id: planned.batch_run_id,
      observed_at: "2026-05-05T22:02:00+00:00",
      reclaiming_principal_ref: "principal://nightly-recovery",
      durable_cursor_recovered: true,
      active_manifest_lease_posture_checked: true,
      persisted_attempt_recovery_checked: true,
    }),
  ).rejects.toThrow(/not stale/);

  const reclaimed = await resolveStaleNightlyBatch({
    repository,
    batch_run_id: planned.batch_run_id,
    observed_at: "2026-05-05T22:05:01+00:00",
    reclaiming_principal_ref: "principal://nightly-recovery",
    durable_cursor_recovered: true,
    active_manifest_lease_posture_checked: true,
    persisted_attempt_recovery_checked: true,
  });

  await validateContractSchema("nightly_batch_run", reclaimed.predecessor.nightly_batch_run);
  await validateContractSchema("nightly_batch_run", reclaimed.successor.nightly_batch_run);
  expect(claimed.stored.nightly_batch_run.last_heartbeat_at).toBe(
    "2026-05-05T22:01:00+00:00",
  );
  expect(reclaimed.predecessor.nightly_batch_run.lifecycle_state).toBe("ABANDONED");
  expect(reclaimed.predecessor.nightly_batch_run.successor_batch_run_ref).toBe(
    nightlyBatchRunRef(reclaimed.successor.nightly_batch_run),
  );
  expect(reclaimed.successor.nightly_batch_run.trigger_class).toBe("RECOVERY_RECLAIM_WINDOW");
  expect(reclaimed.successor.nightly_batch_run.reclaimed_predecessor_batch_run_ref).toBe(
    nightlyBatchRunRef(reclaimed.predecessor.nightly_batch_run),
  );
});
