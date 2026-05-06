import { expect, test } from "@playwright/test";

import { buildReleaseCandidateIdentityContract } from "../../../backend-manifest/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  aggregateNightlyBatchOutcome,
  allocateNightlyBatchRun,
  claimNightlyShardLease,
  loadNightlySimulationSourceBatchSet,
  NightlyBatchRunRepository,
  publishOperatorMorningDigest,
  replayNightlySelectionEntries,
  simulateNightlyPortfolioWhatIf,
  type NightlyPortfolioCandidateInput,
} from "../index.ts";

const candidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "whatif-auto",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.whatif-a",
    fairness_group_key: "HMRC|WHATIF|A",
    priority_tuple: {
      priority_score: 10,
      deadline_pressure: 0.9,
      risk_pressure: 0.2,
    },
  },
  {
    client_id: "whatif-authority",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.whatif-a",
    fairness_group_key: "HMRC|WHATIF|A",
    reason_codes: ["AUTHORITY_READY_CHECK_REQUIRED"],
    priority_tuple: {
      priority_score: 9,
      deadline_pressure: 0.95,
      risk_pressure: 0.8,
    },
  },
  {
    client_id: "whatif-retry",
    period: "2025-26",
    requested_scope: ["quarterly_update"],
    shard_key: "nightly-shard.whatif-b",
    fairness_group_key: "HMRC|WHATIF|B",
    priority_tuple: {
      priority_score: 8,
      deadline_pressure: 0.75,
      risk_pressure: 0.9,
    },
  },
  {
    client_id: "whatif-reused",
    period: "2025-26",
    requested_scope: ["estimate_only"],
    reusable_terminal_result: {
      prior_manifest_ref: "run-manifest://whatif-reused-terminal",
    },
  },
];

function allocationInput(repository: NightlyBatchRunRepository) {
  return {
    repository,
    tenant_id: "tenant.pc0208.whatif",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW" as const,
    release_verification_manifest_ref: "release-verification://pc0208/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0208",
    autopilot_policy_hash: "autopilot-policy-hash-pc0208",
    schema_bundle_hash: "schema-bundle-hash-pc0208",
    code_build_id: "build-pc0208",
    environment_ref: "PRODUCTION" as const,
    scheduled_for: "2026-05-05T22:00:00+00:00",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
    initiating_principal_context_ref: "principal://scheduler-service",
    candidates,
    global_concurrency_profile: {
      global_manifest_limit: 4,
      per_shard_manifest_limit: 2,
      authority_transmit_limit: 2,
      soft_stability_rho: 0.5,
      hard_stability_rho: 0.75,
      retry_capacity_fraction: 0.25,
    },
  };
}

async function quiescedBatch(repository: NightlyBatchRunRepository) {
  const allocated = await allocateNightlyBatchRun(allocationInput(repository));
  await claimNightlyShardLease({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    shard_key: "nightly-shard.whatif-a",
    owner_ref: "worker://pc0208/whatif-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });
  await claimNightlyShardLease({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    shard_key: "nightly-shard.whatif-b",
    owner_ref: "worker://pc0208/whatif-b",
    claimed_at: "2026-05-05T22:01:10+00:00",
  });
  const running = await repository.getNightlyBatchRunById(allocated.stored.batch_run_id);
  const byClient = new Map(
    running.nightly_batch_run.selection_entries.map((entry) => [entry.client_id, entry]),
  );
  const aggregated = await aggregateNightlyBatchOutcome({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    observed_at: "2026-05-05T23:00:00+00:00",
    outcome_updates: [
      {
        entry_id: byClient.get("whatif-auto")!.entry_id,
        outcome_bucket: "AUTO_COMPLETED",
        manifest_ref: "run-manifest://pc0208/whatif-auto",
      },
      {
        entry_id: byClient.get("whatif-authority")!.entry_id,
        outcome_bucket: "WAITING_ON_AUTHORITY",
        workflow_item_refs: ["workflow://pc0208/whatif-authority"],
        next_checkpoint_at: "2026-05-06T08:00:00+00:00",
      },
      {
        entry_id: byClient.get("whatif-retry")!.entry_id,
        outcome_bucket: "FAILED_RETRYABLE",
        workflow_item_refs: ["workflow://pc0208/whatif-retry"],
      },
    ],
  });
  await validateContractSchema("nightly_batch_run", aggregated.stored.nightly_batch_run);
  return aggregated.stored;
}

async function publishedDigest(repository: NightlyBatchRunRepository) {
  const quiesced = await quiescedBatch(repository);
  const published = await publishOperatorMorningDigest({
    repository,
    batch_run_id: quiesced.batch_run_id,
    generated_by_principal_ref: "principal://pc0208-digest",
    workflow_publication_settled_at: "2026-05-06T06:02:00+00:00",
    notification_publication_settled_at: "2026-05-06T06:03:00+00:00",
    publication_qa_completed_at: "2026-05-06T06:03:30+00:00",
    generated_at: "2026-05-06T06:04:00+00:00",
    published_at: "2026-05-06T06:05:00+00:00",
  });
  await validateContractSchema("operator_morning_digest", published.digest);
  return published;
}

function counterfactualReleaseIdentity() {
  return buildReleaseCandidateIdentityContract({
    candidate_environment_ref: "PRODUCTION",
    build_artifact_ref: "build-pc0208-counterfactual",
    artifact_digest: "artifact-digest-pc0208-counterfactual",
    schema_bundle_hash: "schema-bundle-hash-pc0208",
    config_bundle_hash: "config-hash-pc0208-counterfactual",
    migration_plan_ref_or_null: null,
    enabled_provider_profile_refs: ["hmrc-mtd-vat"],
    supported_client_window_ref_or_null: "client-window://pc0208-counterfactual",
  });
}

test("simulates release, authority, retry, and capacity counterfactuals without mutating nightly truth", async () => {
  const repository = new NightlyBatchRunRepository();
  const published = await publishedDigest(repository);
  const before = await repository.getNightlyBatchRunById(published.stored.batch_run_id);
  const byClient = new Map(
    before.nightly_batch_run.selection_entries.map((entry) => [entry.client_id, entry]),
  );
  const persisted: unknown[] = [];

  const result = await simulateNightlyPortfolioWhatIf({
    repository,
    tenant_id: "tenant.pc0208.whatif",
    nightly_window_key: "2026-05-05",
    baseline_digest: published.digest,
    counterfactual_release_verification_manifest_ref_or_null:
      "release-verification://pc0208/counterfactual",
    counterfactual_release_candidate_identity_contract_or_null: counterfactualReleaseIdentity(),
    counterfactual_global_concurrency_profile_or_null: {
      global_manifest_limit: 1,
      authority_transmit_limit: 1,
      retry_capacity_fraction: 0.1,
      hard_stability_rho: 0.6,
    },
    candidate_counterfactuals: [
      {
        selection_entry_ref: byClient.get("whatif-authority")!.entry_id,
        candidate_identity_hash: byClient.get("whatif-authority")!.candidate_identity_hash,
        counterfactual_policy_outcome: "ALLOW",
        counterfactual_authority_outcome: "AMBIGUOUS",
        counterfactual_retry_outcome: "READY",
        counterfactual_release_outcome: "ADMISSIBLE",
        reason_codes: [
          "SIMULATED_AUTHORITY_CHANGE",
          "SIMULATED_POLICY_CHANGE",
          "SIMULATED_RELEASE_ADMISSIBILITY_CHANGE",
          "SIMULATED_RETRY_BUDGET_CHANGE",
        ],
      },
      {
        selection_entry_ref: byClient.get("whatif-retry")!.entry_id,
        candidate_identity_hash: byClient.get("whatif-retry")!.candidate_identity_hash,
        counterfactual_policy_outcome: "BASELINE",
        counterfactual_authority_outcome: "BASELINE",
        counterfactual_retry_outcome: "READY",
        counterfactual_release_outcome: "BASELINE",
        reason_codes: ["SIMULATED_RETRY_BUDGET_CHANGE"],
      },
    ],
    simulated_by_principal_ref: "principal://pc0208-release-owner",
    simulated_at: "2026-05-06T09:00:00+00:00",
    persist_simulation: (simulation) => {
      persisted.push(simulation);
    },
  });

  const after = await repository.getNightlyBatchRunById(published.stored.batch_run_id);
  const authorityDiff = result.simulation.entry_diffs.find(
    (diff) => diff.selection_entry_ref === byClient.get("whatif-authority")!.entry_id,
  );
  const retryDiff = result.simulation.entry_diffs.find(
    (diff) => diff.selection_entry_ref === byClient.get("whatif-retry")!.entry_id,
  );

  expect(after.nightly_batch_run_row_version).toBe(before.nightly_batch_run_row_version);
  expect(after.nightly_batch_run).toEqual(before.nightly_batch_run);
  expect(result.persisted).toBe(true);
  expect(persisted).toHaveLength(1);
  expect(authorityDiff?.simulated_outcome_bucket).toBe("BLOCKED_INTERNAL");
  expect(authorityDiff?.movement_reason_codes).toContain("SIMULATED_AUTHORITY_CHANGE");
  expect(retryDiff?.movement_reason_codes).toContain("SIMULATED_CAPACITY_OR_RETRY_CHANGE");
  expect(result.simulation.simulated_stability_state).toBe("HARD_THROTTLE");
  expect(result.simulation.highlight_diffs.length).toBe(
    new Set([
      ...result.simulation.baseline_highlighted_selection_entry_refs,
      ...result.simulation.simulated_highlighted_selection_entry_refs,
    ]).size,
  );
  await validateContractSchema(
    "nightly_portfolio_simulation_basis_contract",
    result.simulation.basis_contract,
  );
  await validateContractSchema("nightly_portfolio_what_if_simulation", result.simulation);
});

test("captures null-baseline digest posture and still replays persisted selection entries", async () => {
  const repository = new NightlyBatchRunRepository();
  const quiesced = await quiescedBatch(repository);
  const sourceBatchSet = await loadNightlySimulationSourceBatchSet({
    repository,
    tenant_id: quiesced.tenant_id,
    nightly_window_key: quiesced.nightly_window_key,
  });
  const replayed = replayNightlySelectionEntries({ source_batch_set: sourceBatchSet });
  const authorityEntry = sourceBatchSet.selection_entries.find(
    (entry) => entry.client_id === "whatif-authority",
  )!;

  const result = await simulateNightlyPortfolioWhatIf({
    repository,
    tenant_id: quiesced.tenant_id,
    nightly_window_key: quiesced.nightly_window_key,
    baseline_digest: null,
    counterfactual_global_concurrency_profile_or_null: {
      global_manifest_limit: 1,
      retry_capacity_fraction: 0.1,
    },
    candidate_counterfactuals: [
      {
        selection_entry_ref: authorityEntry.entry_id,
        candidate_identity_hash: authorityEntry.candidate_identity_hash,
        counterfactual_policy_outcome: "BASELINE",
        counterfactual_authority_outcome: "AMBIGUOUS",
        counterfactual_retry_outcome: "BASELINE",
        counterfactual_release_outcome: "BASELINE",
        reason_codes: ["SIMULATED_AUTHORITY_CHANGE"],
      },
    ],
    simulated_by_principal_ref: "principal://pc0208-operator",
    simulated_at: "2026-05-06T09:30:00+00:00",
  });

  expect(replayed.map((entry) => entry.selection_entry_ref).sort()).toEqual(
    sourceBatchSet.covered_selection_entry_refs,
  );
  expect(result.simulation.baseline_digest_ref_or_null).toBeNull();
  expect(result.simulation.baseline_highlighted_selection_entry_refs).toEqual([]);
  expect(result.simulation.highlight_diffs.every((diff) => diff.diff_state === "ADDED")).toBe(
    true,
  );
  expect(
    result.simulation.entry_diffs.some((diff) =>
      diff.movement_reason_codes.includes("BASELINE_DIGEST_MISSING"),
    ),
  ).toBe(true);
  await validateContractSchema("nightly_portfolio_what_if_simulation", result.simulation);
});
