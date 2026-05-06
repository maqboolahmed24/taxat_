import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  aggregateNightlyBatchOutcome,
  allocateNightlyBatchRun,
  buildOperatorMorningDigestFromBatch,
  claimNightlyShardLease,
  NightlyBatchRunRepository,
  nightlyBatchRunRef,
  publishOperatorMorningDigest,
  type NightlyPortfolioCandidateInput,
} from "../../../backend-recovery/src/index.ts";
import {
  getOperatorMorningDigest,
  listOperatorMorningDigests,
  OperatorMorningDigestRepository,
} from "../index.ts";

const tenantId = "tenant.pc0218.digest";
const coverageDate = "2026-05-05";

const candidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "pc0218-auto",
    fairness_group_key: "HMRC|PC0218|A",
    period: "2025-26",
    priority_tuple: {
      deadline_pressure: 0.1,
      priority_score: 4,
      risk_pressure: 0.1,
    },
    requested_scope: ["submit"],
    shard_key: "nightly-shard.pc0218-a",
  },
  {
    client_id: "pc0218-authority",
    fairness_group_key: "HMRC|PC0218|A",
    period: "2025-26",
    priority_tuple: {
      deadline_pressure: 0.9,
      priority_score: 10,
      risk_pressure: 0.7,
    },
    requested_scope: ["submit"],
    shard_key: "nightly-shard.pc0218-a",
  },
  {
    client_id: "pc0218-late-data",
    fairness_group_key: "HMRC|PC0218|B",
    period: "2025-26",
    priority_tuple: {
      deadline_pressure: 0.8,
      priority_score: 8,
      risk_pressure: 0.5,
    },
    requested_scope: ["quarterly_update"],
    shard_key: "nightly-shard.pc0218-b",
  },
  {
    client_id: "pc0218-review",
    fairness_group_key: "HMRC|PC0218|B",
    period: "2025-26",
    priority_tuple: {
      deadline_pressure: 0.6,
      priority_score: 7,
      risk_pressure: 0.9,
    },
    requested_scope: ["prepare_submission"],
    shard_key: "nightly-shard.pc0218-b",
  },
];

async function quiescedDigestBatch(repository: NightlyBatchRunRepository) {
  const allocated = await allocateNightlyBatchRun({
    autopilot_policy_hash: "autopilot-policy-hash-pc0218",
    candidates,
    code_build_id: "build-pc0218-digest",
    environment_ref: "PRODUCTION",
    initiating_principal_context_ref: "principal://scheduler-service",
    nightly_window_key: coverageDate,
    policy_snapshot_hash: "policy-snapshot-hash-pc0218",
    release_verification_manifest_ref: "release-verification://pc0218/green",
    repository,
    schema_bundle_hash: "schema-bundle-hash-pc0218",
    scheduled_for: "2026-05-05T22:00:00+00:00",
    tenant_id: tenantId,
    trigger_class: "SCHEDULED_WINDOW",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
  });
  const shardKeys = [
    ...new Set(
      candidates
        .map((candidate) => candidate.shard_key)
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
  for (const shardKey of shardKeys) {
    await claimNightlyShardLease({
      batch_run_id: allocated.stored.batch_run_id,
      claimed_at: "2026-05-05T22:01:00+00:00",
      owner_ref: `worker://nightly/${shardKey}`,
      repository,
      shard_key: shardKey,
    });
  }
  const running = await repository.getNightlyBatchRunById(allocated.stored.batch_run_id);
  const byClient = new Map(
    running.nightly_batch_run.selection_entries.map((entry) => [entry.client_id, entry]),
  );
  return aggregateNightlyBatchOutcome({
    batch_run_id: allocated.stored.batch_run_id,
    observed_at: "2026-05-05T23:10:00+00:00",
    outcome_updates: [
      {
        entry_id: byClient.get("pc0218-auto")!.entry_id,
        manifest_ref: "run-manifest://pc0218-auto",
        outcome_bucket: "AUTO_COMPLETED",
      },
      {
        entry_id: byClient.get("pc0218-authority")!.entry_id,
        next_checkpoint_at: "2026-05-06T08:30:00+00:00",
        outcome_bucket: "WAITING_ON_AUTHORITY",
        workflow_item_refs: ["workflow://pc0218-authority"],
      },
      {
        entry_id: byClient.get("pc0218-late-data")!.entry_id,
        next_checkpoint_at: "2026-05-06T09:00:00+00:00",
        outcome_bucket: "WAITING_ON_LATE_DATA",
        workflow_item_refs: ["workflow://pc0218-late-data"],
      },
      {
        entry_id: byClient.get("pc0218-review")!.entry_id,
        outcome_bucket: "REVIEW_REQUIRED",
        workflow_item_refs: ["workflow://pc0218-review"],
      },
    ],
    repository,
  });
}

async function persistedDigestRepository() {
  const recoveryRepository = new NightlyBatchRunRepository();
  const digestRepository = new OperatorMorningDigestRepository();
  const quiesced = await quiescedDigestBatch(recoveryRepository);
  const initial = await publishOperatorMorningDigest({
    batch_run_id: quiesced.stored.batch_run_id,
    generated_at: "2026-05-06T06:04:00+00:00",
    generated_by_principal_ref: "principal://operator-digest",
    notification_publication_settled_at: "2026-05-06T06:03:00+00:00",
    publication_qa_completed_at: "2026-05-06T06:03:30+00:00",
    published_at: "2026-05-06T06:05:00+00:00",
    published_notification_refs: ["notification://pc0218/digest-ready"],
    repository: recoveryRepository,
    workflow_publication_settled_at: "2026-05-06T06:02:00+00:00",
  });
  if (initial.digest === null) {
    throw new Error("expected initial digest publication");
  }
  const recovery = buildOperatorMorningDigestFromBatch({
    batch_run: initial.stored.nightly_batch_run,
    generated_at: "2026-05-06T07:04:00+00:00",
    generated_by_principal_ref: "principal://operator-digest",
    notification_publication_settled_at: "2026-05-06T07:03:00+00:00",
    publication_generation: 2,
    publication_qa_completed_at: "2026-05-06T07:03:30+00:00",
    published_at: "2026-05-06T07:05:00+00:00",
    published_notification_refs: ["notification://pc0218/digest-ready-recovery"],
    source_batch_run_refs: [
      nightlyBatchRunRef(initial.stored.nightly_batch_run),
      "nightly-batch://pc0218/recovery",
    ],
    supersedes_digest_id: initial.digest.digest_id,
    supersession_reason_codes: ["RECOVERY_BATCH_COMPLETED_PUBLICATION"],
    supersession_root_digest_id: initial.digest.digest_id,
    workflow_publication_settled_at: "2026-05-06T07:02:00+00:00",
  });
  await digestRepository.persistOperatorMorningDigest({ digest: initial.digest });
  await digestRepository.persistOperatorMorningDigest({ digest: recovery });
  return {
    digestRepository,
    initialDigest: initial.digest,
    recoveryDigest: recovery,
  };
}

test("gets the current digest by tenant and coverage date while preserving superseded lineage", async () => {
  const { digestRepository, initialDigest, recoveryDigest } = await persistedDigestRepository();

  const current = await getOperatorMorningDigest({
    coverage_date: coverageDate,
    repository: digestRepository,
    tenant_id: tenantId,
  });
  const superseded = await getOperatorMorningDigest({
    coverage_date: coverageDate,
    digest_id: initialDigest.digest_id,
    repository: digestRepository,
    tenant_id: tenantId,
  });

  expect(current.digest.digest_id).toBe(recoveryDigest.digest_id);
  expect(current.publication_posture).toMatchObject({
    current_digest_id: recoveryDigest.digest_id,
    publication_state: "CURRENT_AUTHORITATIVE",
    supersedes_digest_id_or_null: initialDigest.digest_id,
  });
  expect(superseded.publication_posture).toMatchObject({
    current_digest_id: recoveryDigest.digest_id,
    publication_state: "SUPERSEDED",
    superseded_by_digest_id_or_null: recoveryDigest.digest_id,
  });
  expect(superseded.publication_posture.lineage_digest_ids_in_order).toEqual([
    initialDigest.digest_id,
    recoveryDigest.digest_id,
  ]);
  await validateContractSchema("operator_morning_digest", current.digest);
  await validateContractSchema("operator_morning_digest", superseded.digest);
});

test("lists current and superseded digest publications with queue and highlight partitions intact", async () => {
  const { digestRepository, recoveryDigest } = await persistedDigestRepository();

  const currentOnly = await listOperatorMorningDigests({
    coverage_date: coverageDate,
    repository: digestRepository,
    tenant_id: tenantId,
  });
  const withSuperseded = await listOperatorMorningDigests({
    coverage_date: coverageDate,
    include_superseded: true,
    limit: 1,
    repository: digestRepository,
    tenant_id: tenantId,
  });

  expect(currentOnly.digests).toHaveLength(1);
  expect(currentOnly.digests[0]?.digest.digest_id).toBe(recoveryDigest.digest_id);
  expect(withSuperseded.page.total_count).toBe(2);
  expect(withSuperseded.page.next_cursor_offset_or_null).toBe(1);
  const currentDigest = currentOnly.digests[0]!.digest;
  expect(currentDigest.covered_selection_entry_refs).toEqual(
    Object.values(currentDigest.outcome_entry_refs).flat().sort(),
  );
  expect(currentDigest.queue_summaries.flatMap((queue) => queue.item_refs).sort()).toEqual(
    currentDigest.published_workflow_item_refs,
  );
  expect(currentDigest.highlighted_client_outcomes.map((outcome) => outcome.highlight_rank)).toEqual([
    1,
    2,
    3,
    4,
  ]);
  expect(currentDigest.waiting_on_authority_refs).toHaveLength(1);
  expect(currentDigest.late_data_hold_refs).toHaveLength(1);
  await validateContractSchema("operator_morning_digest", currentDigest);
});
