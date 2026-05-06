import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  aggregateNightlyBatchOutcome,
  allocateNightlyBatchRun,
  claimNightlyShardLease,
  NightlyBatchRunRepository,
  publishOperatorMorningDigest,
  type NightlyPortfolioCandidateInput,
} from "../index.ts";

const digestCandidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "digest-auto",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.digest-a",
    fairness_group_key: "HMRC|DIGEST|A",
    priority_tuple: {
      priority_score: 5,
      deadline_pressure: 0.8,
      risk_pressure: 0.2,
    },
  },
  {
    client_id: "digest-authority",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.digest-a",
    fairness_group_key: "HMRC|DIGEST|A",
    priority_tuple: {
      priority_score: 7,
      deadline_pressure: 0.9,
      risk_pressure: 0.6,
    },
  },
  {
    client_id: "digest-failure",
    period: "2025-26",
    requested_scope: ["quarterly_update"],
    shard_key: "nightly-shard.digest-b",
    fairness_group_key: "HMRC|DIGEST|B",
    priority_tuple: {
      priority_score: 6,
      deadline_pressure: 0.7,
      risk_pressure: 0.9,
    },
  },
  {
    client_id: "digest-deferred",
    period: "2025-26",
    requested_scope: ["prepare_submission"],
    active_attempt_ref: "active-digest-deferred",
    next_checkpoint_at: "2026-05-06T09:30:00+00:00",
  },
];

function allocationInput(repository: NightlyBatchRunRepository) {
  return {
    repository,
    tenant_id: "tenant.pc0207.digest",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW" as const,
    release_verification_manifest_ref: "release-verification://pc0207-digest/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0207-digest",
    autopilot_policy_hash: "autopilot-policy-hash-pc0207-digest",
    schema_bundle_hash: "schema-bundle-hash-pc0207-digest",
    code_build_id: "build-pc0207-digest",
    environment_ref: "PRODUCTION" as const,
    scheduled_for: "2026-05-05T22:00:00+00:00",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
    initiating_principal_context_ref: "principal://scheduler-service",
    candidates: digestCandidates,
  };
}

async function quiescedBatch(repository: NightlyBatchRunRepository) {
  const allocated = await allocateNightlyBatchRun(allocationInput(repository));
  await claimNightlyShardLease({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    shard_key: "nightly-shard.digest-a",
    owner_ref: "worker://nightly/digest-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });
  await claimNightlyShardLease({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    shard_key: "nightly-shard.digest-b",
    owner_ref: "worker://nightly/digest-b",
    claimed_at: "2026-05-05T22:01:10+00:00",
  });
  const running = await repository.getNightlyBatchRunById(allocated.stored.batch_run_id);
  const byClient = new Map(
    running.nightly_batch_run.selection_entries.map((entry) => [entry.client_id, entry]),
  );
  const aggregated = await aggregateNightlyBatchOutcome({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    observed_at: "2026-05-05T23:10:00+00:00",
    outcome_updates: [
      {
        entry_id: byClient.get("digest-auto")!.entry_id,
        outcome_bucket: "AUTO_COMPLETED",
        manifest_ref: "run-manifest://digest-auto",
      },
      {
        entry_id: byClient.get("digest-authority")!.entry_id,
        outcome_bucket: "WAITING_ON_AUTHORITY",
        workflow_item_refs: ["workflow://digest-authority"],
        next_checkpoint_at: "2026-05-06T08:30:00+00:00",
      },
      {
        entry_id: byClient.get("digest-failure")!.entry_id,
        outcome_bucket: "FAILED_NON_RETRYABLE",
        workflow_item_refs: ["workflow://digest-failure"],
      },
    ],
  });
  await validateContractSchema("nightly_batch_run", aggregated.stored.nightly_batch_run);
  return aggregated.stored;
}

test("publishes morning digest only after workflow, notification, and QA settlement", async () => {
  const repository = new NightlyBatchRunRepository();
  const quiesced = await quiescedBatch(repository);

  const workflowPending = await publishOperatorMorningDigest({
    repository,
    batch_run_id: quiesced.batch_run_id,
    generated_by_principal_ref: "principal://operator-digest",
    generated_at: "2026-05-06T06:00:00+00:00",
    published_at: "2026-05-06T06:01:00+00:00",
  });
  expect(workflowPending.publication_state).toBe("WORKFLOW_PUBLICATION_PENDING");
  expect(workflowPending.digest).toBeNull();
  expect(workflowPending.stored.nightly_batch_run.operator_digest_ref).toBeNull();

  const notificationPending = await publishOperatorMorningDigest({
    repository,
    batch_run_id: quiesced.batch_run_id,
    generated_by_principal_ref: "principal://operator-digest",
    workflow_publication_settled_at: "2026-05-06T06:02:00+00:00",
    generated_at: "2026-05-06T06:04:00+00:00",
    published_at: "2026-05-06T06:05:00+00:00",
  });
  expect(notificationPending.publication_state).toBe("NOTIFICATION_PUBLICATION_PENDING");
  expect(notificationPending.digest).toBeNull();

  const published = await publishOperatorMorningDigest({
    repository,
    batch_run_id: quiesced.batch_run_id,
    generated_by_principal_ref: "principal://operator-digest",
    workflow_publication_settled_at: "2026-05-06T06:02:00+00:00",
    notification_publication_settled_at: "2026-05-06T06:03:00+00:00",
    publication_qa_completed_at: "2026-05-06T06:03:30+00:00",
    generated_at: "2026-05-06T06:04:00+00:00",
    published_at: "2026-05-06T06:05:00+00:00",
  });

  expect(published.publication_state).toBe("PUBLISHED_COMPLETE");
  expect(published.stored.nightly_batch_run.lifecycle_state).toBe("COMPLETED_WITH_FAILURES");
  expect(published.digest.summary_counts.auto_completed).toBe(1);
  expect(published.digest.summary_counts.waiting_on_authority).toBe(1);
  expect(published.digest.summary_counts.failed_non_retryable).toBe(1);
  expect(published.digest.summary_counts.deferred).toBe(1);
  expect(published.digest.published_workflow_item_refs).toHaveLength(3);
  expect(published.digest.queue_summaries.flatMap((queue) => queue.item_refs).sort()).toEqual(
    published.digest.published_workflow_item_refs,
  );

  await validateContractSchema("operator_digest_derivation_contract", published.digest.derivation_contract);
  await validateContractSchema("operator_morning_digest", published.digest);
  await validateContractSchema("nightly_batch_run", published.stored.nightly_batch_run);

  const drifted = {
    ...published.digest,
    derivation_contract: {
      ...published.digest.derivation_contract,
      queue_partition_hash: "drifted-queue-partition-hash",
    },
  };
  await expect(validateContractSchema("operator_morning_digest", drifted)).rejects.toThrow(
    /queue_partition_hash/,
  );
});

test("recovery digest supersession keeps monotonic publication lineage", async () => {
  const repository = new NightlyBatchRunRepository();
  const quiesced = await quiescedBatch(repository);
  const published = await publishOperatorMorningDigest({
    repository,
    batch_run_id: quiesced.batch_run_id,
    generated_by_principal_ref: "principal://operator-digest",
    workflow_publication_settled_at: "2026-05-06T06:02:00+00:00",
    notification_publication_settled_at: "2026-05-06T06:03:00+00:00",
    publication_qa_completed_at: "2026-05-06T06:03:30+00:00",
    generated_at: "2026-05-06T06:04:00+00:00",
    published_at: "2026-05-06T06:05:00+00:00",
    supersedes_digest_id: "operator-digest.previous",
    supersession_root_digest_id: "operator-digest.root",
    supersession_reason_codes: ["RECOVERY_BATCH_COMPLETED_PUBLICATION"],
  });

  expect(published.digest.supersedes_digest_id).toBe("operator-digest.previous");
  expect(published.digest.derivation_contract.supersession_state).toBe("RECOVERY_SUPERSESSION");
  expect(published.digest.derivation_contract.supersession_root_digest_id).toBe(
    "operator-digest.root",
  );
  expect(published.digest.derivation_contract.publication_generation).toBe(2);
  await validateContractSchema("operator_morning_digest", published.digest);
});
