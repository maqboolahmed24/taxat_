import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  NightlyBatchRunRepository,
  allocateNightlyBatchRun,
  deriveNightlySelectionUniverseHashFromCandidateHashes,
} from "../index.ts";
import type { NightlyPortfolioCandidateInput } from "../index.ts";

const baseCandidates: NightlyPortfolioCandidateInput[] = [
  {
    client_id: "client-terminal",
    period: "2025-26",
    requested_scope: ["submit"],
    active_attempt_ref: "active-terminal-should-not-win",
    reusable_terminal_result: {
      prior_manifest_ref: "run-manifest://terminal/client-terminal",
    },
  },
  {
    client_id: "client-active",
    period: "2025-26",
    requested_scope: ["prepare_submission"],
    active_attempt_ref: "active-same-window",
    next_checkpoint_at: "2026-05-05T23:30:00+00:00",
  },
  {
    client_id: "client-continuation",
    period: "2025-26",
    requested_scope: ["quarterly_update"],
    stale_attempt_reclaim: {
      prior_manifest_ref: "run-manifest://prior/client-continuation",
      predecessor_selection_entry_ref: "nightly-entry://predecessor/client-continuation",
    },
  },
  {
    client_id: "client-escalate",
    period: "2025-26",
    requested_scope: ["estimate_only"],
    escalation: {
      workflow_item_refs: ["workflow://review/client-escalate"],
      outcome_bucket: "REQUEST_CLIENT_INFO",
    },
  },
  {
    client_id: "client-skip",
    period: "2025-26",
    requested_scope: ["submit"],
    ineligible_reason_codes: ["AUTHORITY_LINK_NOT_PROVEN"],
  },
  {
    client_id: "client-execute",
    period: "2025-26",
    requested_scope: ["submit", "prepare_submission"],
    authority_name: "HMRC",
    operation_family: "SUBMISSION",
    priority_tuple: {
      priority_score: 4.25,
      expected_service_minutes: 12.5,
      deadline_pressure: 0.8,
      checkpoint_pressure: 0.4,
      risk_pressure: 0.55,
      fairness_credit: 0.35,
      retry_success_probability: 0.6,
      retry_expected_gain: 0.7,
    },
  },
];

function allocationInput(repository: NightlyBatchRunRepository) {
  return {
    repository,
    tenant_id: "tenant.pc0206",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW" as const,
    release_verification_manifest_ref: "release-verification://pc0206/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0206",
    autopilot_policy_hash: "autopilot-policy-hash-pc0206",
    schema_bundle_hash: "schema-bundle-hash-pc0206",
    code_build_id: "build-pc0206",
    environment_ref: "PRODUCTION" as const,
    scheduled_for: "2026-05-05T22:00:00+00:00",
    trigger_observed_at: "2026-05-05T22:00:01+00:00",
    initiating_principal_context_ref: "principal://scheduler-service",
    candidates: baseCandidates,
  };
}

test("persists one complete nightly selection disposition row per frozen candidate", async () => {
  const repository = new NightlyBatchRunRepository();
  const result = await allocateNightlyBatchRun(allocationInput(repository));
  const batch = result.stored.nightly_batch_run;

  await validateContractSchema("nightly_batch_run", batch);
  expect(result.allocation_state).toBe("ALLOCATED");
  expect(batch.lifecycle_state).toBe("PLANNED");
  expect(batch.selection_entries).toHaveLength(baseCandidates.length);
  expect(batch.selection_universe_count).toBe(baseCandidates.length);
  expect(batch.selection_universe_hash).toBe(
    deriveNightlySelectionUniverseHashFromCandidateHashes(
      batch.selection_entries.map((entry) => entry.candidate_identity_hash),
    ),
  );

  const byClient = new Map(batch.selection_entries.map((entry) => [entry.client_id, entry]));
  expect(byClient.get("client-terminal")?.selection_disposition).toBe(
    "REUSE_EXISTING_TERMINAL_RESULT",
  );
  expect(byClient.get("client-terminal")?.manifest_ref).toBeNull();
  expect(byClient.get("client-terminal")?.prior_manifest_ref).toBe(
    "run-manifest://terminal/client-terminal",
  );
  expect(byClient.get("client-active")?.selection_disposition).toBe("DEFER_ACTIVE_ATTEMPT");
  expect(byClient.get("client-continuation")?.selection_disposition).toBe(
    "EXECUTE_CONTINUATION_CHILD",
  );
  expect(byClient.get("client-escalate")?.selection_disposition).toBe("ESCALATE_ONLY");
  expect(byClient.get("client-skip")?.selection_disposition).toBe("SKIP_INELIGIBLE");
  expect(byClient.get("client-execute")?.selection_disposition).toBe("EXECUTE_NEW_MANIFEST");
  expect(byClient.get("client-execute")?.fairness_group_key).toBe("HMRC|SUBMISSION");
  expect(byClient.get("client-execute")?.shard_key).toBeTruthy();

  for (const entry of batch.selection_entries) {
    if (
      entry.selection_disposition === "EXECUTE_NEW_MANIFEST" ||
      entry.selection_disposition === "EXECUTE_CONTINUATION_CHILD"
    ) {
      expect(entry.shard_key).toBeTruthy();
      continue;
    }
    expect(entry.fairness_group_key ?? null).toBeNull();
    expect(entry.shard_key).toBeNull();
    expect(entry.outcome_bucket).not.toBeNull();
  }
});

test("reuses duplicate scheduler deliveries and blocks unfrozen prerequisites", async () => {
  const repository = new NightlyBatchRunRepository();
  const first = await allocateNightlyBatchRun(allocationInput(repository));
  const second = await allocateNightlyBatchRun(allocationInput(repository));

  expect(second.allocation_state).toBe("REUSED_ACTIVE_BATCH");
  expect(second.stored.batch_run_id).toBe(first.stored.batch_run_id);
  expect(await repository.countNightlyBatchRuns()).toBe(1);

  const blockedRepository = new NightlyBatchRunRepository();
  const blocked = await allocateNightlyBatchRun({
    ...allocationInput(blockedRepository),
    nightly_window_key: "2026-05-06",
    prerequisites: {
      release_admissibility_frozen: false,
      policy_snapshot_frozen: true,
      tenant_schedule_scope_frozen: true,
    },
  });

  await validateContractSchema("nightly_batch_run", blocked.stored.nightly_batch_run);
  expect(blocked.stored.nightly_batch_run.lifecycle_state).toBe("BLOCKED");
  expect(blocked.stored.nightly_batch_run.selection_entries).toHaveLength(0);
});

test("freezes recovery predecessor lineage on successor reclaim batches", async () => {
  const repository = new NightlyBatchRunRepository();
  const result = await allocateNightlyBatchRun({
    ...allocationInput(repository),
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    reclaimed_predecessor_batch_run_ref: "nightly-batch-run://predecessor-pc0206",
    recovery_resume_state: "PREDECESSOR_SELECTION_REUSED_RESHARDED",
  });

  await validateContractSchema("nightly_batch_run", result.stored.nightly_batch_run);
  expect(result.stored.nightly_batch_run.reclaimed_predecessor_batch_run_ref).toBe(
    "nightly-batch-run://predecessor-pc0206",
  );
  expect(result.stored.nightly_batch_run.identity_contract.recovery_resume_state).toBe(
    "PREDECESSOR_SELECTION_REUSED_RESHARDED",
  );
});
