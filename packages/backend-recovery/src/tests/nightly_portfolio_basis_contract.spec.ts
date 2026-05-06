import { expect, test } from "@playwright/test";

import { buildReleaseCandidateIdentityContract } from "../../../backend-manifest/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  allocateNightlyBatchRun,
  buildNightlyExecutionModeBoundaryContract,
  buildNightlyPortfolioSimulationBasisContract,
  claimNightlyShardLease,
  aggregateNightlyBatchOutcome,
  loadNightlySimulationSourceBatchSet,
  NightlyBatchRunRepository,
  nightlyBatchRunRef,
  resolveStaleNightlyBatch,
  type NightlyPortfolioCandidateInput,
} from "../index.ts";

const replayableCandidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "basis-reused",
    period: "2025-26",
    requested_scope: ["estimate_only"],
    reusable_terminal_result: {
      prior_manifest_ref: "run-manifest://basis/reused",
    },
  },
  {
    client_id: "basis-authority",
    period: "2025-26",
    requested_scope: ["submit"],
    escalation: {
      workflow_item_refs: ["workflow://basis/authority"],
      outcome_bucket: "BLOCKED_INTERNAL",
      reason_codes: ["AUTHORITY_AMBIGUITY"],
    },
    priority_tuple: {
      priority_score: 8,
      deadline_pressure: 0.9,
      risk_pressure: 0.8,
    },
  },
];

const executionCandidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "basis-successor-execute",
    period: "2025-26",
    requested_scope: ["submit"],
    shard_key: "nightly-shard.basis-successor",
    fairness_group_key: "HMRC|SUCCESSOR",
    priority_tuple: {
      priority_score: 9,
      deadline_pressure: 0.9,
      risk_pressure: 0.9,
    },
  },
];

function allocationInput(input: {
  repository: NightlyBatchRunRepository;
  tenant_id?: string;
  nightly_window_key?: string;
  candidates?: readonly NightlyPortfolioCandidateInput[];
}) {
  return {
    repository: input.repository,
    tenant_id: input.tenant_id ?? "tenant.pc0208.basis",
    nightly_window_key: input.nightly_window_key ?? "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW" as const,
    release_verification_manifest_ref: "release-verification://pc0208/baseline",
    policy_snapshot_hash: "policy-snapshot-hash-pc0208-basis",
    autopilot_policy_hash: "autopilot-policy-hash-pc0208-basis",
    schema_bundle_hash: "schema-bundle-hash-pc0208-basis",
    code_build_id: "build-pc0208-basis",
    environment_ref: "PRODUCTION" as const,
    scheduled_for: "2026-05-05T22:00:00+00:00",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
    initiating_principal_context_ref: "principal://scheduler-service",
    candidates: input.candidates ?? replayableCandidates,
  };
}

async function allocateReplayableBatch(repository: NightlyBatchRunRepository) {
  const allocated = await allocateNightlyBatchRun(allocationInput({ repository }));
  await validateContractSchema("nightly_batch_run", allocated.stored.nightly_batch_run);
  return allocated.stored;
}

function analysisBoundary() {
  return buildNightlyExecutionModeBoundaryContract({
    execution_mode: "ANALYSIS",
    analysis_only: true,
    non_compliance_config_refs: ["nightly-what-if-simulator"],
    counterfactual_basis: "NIGHTLY_PORTFOLIO_WHAT_IF",
    execution_posture: "LIVE_ANALYSIS",
    legal_effect_boundary: "MODELED_READ_ONLY",
    disclosure_reason_codes: ["ANALYSIS_ONLY_POSTURE", "MODELED_WHAT_IF_ONLY"],
  });
}

test("builds canonical basis hash from one persisted source batch and exact release identity", async () => {
  const repository = new NightlyBatchRunRepository();
  const stored = await allocateReplayableBatch(repository);
  const sourceBatchSet = await loadNightlySimulationSourceBatchSet({
    repository,
    tenant_id: stored.tenant_id,
    nightly_window_key: stored.nightly_window_key,
    source_batch_run_refs: [nightlyBatchRunRef(stored.nightly_batch_run)],
  });
  const releaseIdentity = buildReleaseCandidateIdentityContract({
    candidate_environment_ref: "PRODUCTION",
    build_artifact_ref: "build-pc0208-release-what-if",
    artifact_digest: "artifact-digest-pc0208-release-what-if",
    schema_bundle_hash: stored.nightly_batch_run.schema_bundle_hash,
    config_bundle_hash: "config-hash-pc0208-release-what-if",
    migration_plan_ref_or_null: null,
    enabled_provider_profile_refs: ["hmrc-mtd-vat"],
    supported_client_window_ref_or_null: "client-window://pc0208",
  });
  const coveredEntry = sourceBatchSet.selection_entries[0]!;
  const basis = buildNightlyPortfolioSimulationBasisContract({
    execution_mode_boundary_contract: analysisBoundary(),
    tenant_id: sourceBatchSet.tenant_id,
    nightly_window_key: sourceBatchSet.nightly_window_key,
    source_batch_run_refs: sourceBatchSet.source_batch_run_refs,
    covered_selection_entry_refs: sourceBatchSet.covered_selection_entry_refs,
    baseline_selection_universe_hash: stored.nightly_batch_run.selection_universe_hash,
    baseline_policy_snapshot_hash: stored.nightly_batch_run.policy_snapshot_hash,
    baseline_autopilot_policy_hash: stored.nightly_batch_run.autopilot_policy_hash,
    baseline_release_verification_manifest_ref:
      stored.nightly_batch_run.release_verification_manifest_ref,
    baseline_schema_bundle_hash: stored.nightly_batch_run.schema_bundle_hash,
    baseline_code_build_id: stored.nightly_batch_run.code_build_id,
    baseline_environment_ref: stored.nightly_batch_run.environment_ref,
    baseline_global_concurrency_profile: stored.nightly_batch_run.global_concurrency_profile,
    counterfactual_release_verification_manifest_ref_or_null:
      "release-verification://pc0208/counterfactual",
    counterfactual_release_candidate_identity_contract_or_null: releaseIdentity,
    candidate_counterfactuals: [
      {
        selection_entry_ref: coveredEntry.entry_id,
        candidate_identity_hash: coveredEntry.candidate_identity_hash,
        counterfactual_policy_outcome: "BASELINE",
        counterfactual_authority_outcome: "BASELINE",
        counterfactual_retry_outcome: "BASELINE",
        counterfactual_release_outcome: "INADMISSIBLE",
        reason_codes: ["SIMULATED_RELEASE_ADMISSIBILITY_CHANGE"],
      },
    ],
  });

  expect(basis.source_batch_recovery_state).toBe("SINGLE_BATCH");
  expect(basis.source_batch_set_hash).toBe(sourceBatchSet.source_batch_set_hash);
  expect(basis.counterfactual_reason_codes).toEqual([
    "SIMULATED_RELEASE_ADMISSIBILITY_CHANGE",
  ]);
  expect(basis.counterfactual_release_candidate_identity_contract_or_null?.candidate_environment_ref).toBe(
    "PRODUCTION",
  );
  await validateContractSchema("nightly_portfolio_simulation_basis_contract", basis);
});

test("loads only one nightly window and rejects unrelated source batch refs", async () => {
  const repository = new NightlyBatchRunRepository();
  const first = await allocateReplayableBatch(repository);
  const other = await allocateNightlyBatchRun(
    allocationInput({
      repository,
      nightly_window_key: "2026-05-06",
      candidates: replayableCandidates,
    }),
  );

  await expect(
    loadNightlySimulationSourceBatchSet({
      repository,
      tenant_id: first.tenant_id,
      nightly_window_key: first.nightly_window_key,
      source_batch_run_refs: [
        nightlyBatchRunRef(first.nightly_batch_run),
        nightlyBatchRunRef(other.stored.nightly_batch_run),
      ],
    }),
  ).rejects.toThrow(/outside tenant\/window/);
});

test("accepts a lawful same-window successor recovery chain as one source batch set", async () => {
  const repository = new NightlyBatchRunRepository();
  const allocated = await allocateNightlyBatchRun(
    allocationInput({
      repository,
      tenant_id: "tenant.pc0208.successor",
      candidates: executionCandidates,
    }),
  );
  const claimed = await claimNightlyShardLease({
    repository,
    batch_run_id: allocated.stored.batch_run_id,
    shard_key: "nightly-shard.basis-successor",
    owner_ref: "worker://pc0208/successor-a",
    claimed_at: "2026-05-05T22:01:00+00:00",
  });
  const reclaimed = await resolveStaleNightlyBatch({
    repository,
    batch_run_id: claimed.stored.batch_run_id,
    observed_at: "2026-05-05T22:05:01+00:00",
    reclaiming_principal_ref: "principal://pc0208-recovery",
    durable_cursor_recovered: true,
    active_manifest_lease_posture_checked: true,
    persisted_attempt_recovery_checked: true,
  });
  await claimNightlyShardLease({
    repository,
    batch_run_id: reclaimed.successor.batch_run_id,
    shard_key: "nightly-shard.basis-successor",
    owner_ref: "worker://pc0208/successor-b",
    claimed_at: "2026-05-05T22:06:00+00:00",
  });
  const successorEntry = reclaimed.successor.nightly_batch_run.selection_entries[0]!;
  await aggregateNightlyBatchOutcome({
    repository,
    batch_run_id: reclaimed.successor.batch_run_id,
    observed_at: "2026-05-05T22:20:00+00:00",
    outcome_updates: [
      {
        entry_id: successorEntry.entry_id,
        outcome_bucket: "AUTO_COMPLETED",
        manifest_ref: "run-manifest://pc0208/successor-completed",
      },
    ],
  });

  const sourceBatchSet = await loadNightlySimulationSourceBatchSet({
    repository,
    tenant_id: "tenant.pc0208.successor",
    nightly_window_key: "2026-05-05",
  });

  expect(sourceBatchSet.source_batch_recovery_state).toBe("SUCCESSOR_RECOVERY_CHAIN");
  expect(sourceBatchSet.source_batch_count).toBe(2);
  expect(sourceBatchSet.effective_batch.batch_run_id).toBe(reclaimed.successor.batch_run_id);
  expect(sourceBatchSet.covered_selection_entry_refs).toEqual([successorEntry.entry_id]);
});
