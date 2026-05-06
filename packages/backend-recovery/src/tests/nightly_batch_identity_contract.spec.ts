import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  NightlyBatchIdentityContractError,
  buildNightlyBatchIdentityContract,
  deriveNightlyBatchIdentityContractHash,
  deriveNightlySchedulerDedupeKey,
  deriveNightlySelectionCandidateIdentityHash,
  deriveNightlySelectionUniverseHashFromCandidateHashes,
} from "../index.ts";

function identityFixture() {
  const candidateHash = deriveNightlySelectionCandidateIdentityHash({
    tenant_id: "tenant.pc0206",
    nightly_window_key: "2026-05-05",
    client_id: "client-1",
    period: "2025-26",
    requested_scope: ["submit", "prepare_submission"],
  });
  const scheduler_dedupe_key = deriveNightlySchedulerDedupeKey({
    tenant_id: "tenant.pc0206",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW",
    release_verification_manifest_ref: "release-verification://pc0206/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0206",
    autopilot_policy_hash: "autopilot-policy-hash-pc0206",
  });
  return buildNightlyBatchIdentityContract({
    tenant_id: "tenant.pc0206",
    nightly_window_key: "2026-05-05",
    trigger_class: "SCHEDULED_WINDOW",
    release_verification_manifest_ref: "release-verification://pc0206/green",
    policy_snapshot_hash: "policy-snapshot-hash-pc0206",
    autopilot_policy_hash: "autopilot-policy-hash-pc0206",
    scheduler_dedupe_key,
    schema_bundle_hash: "schema-bundle-hash-pc0206",
    code_build_id: "build-pc0206",
    environment_ref: "PRODUCTION",
    selection_universe_hash: deriveNightlySelectionUniverseHashFromCandidateHashes([
      candidateHash,
    ]),
    selection_universe_count: 1,
    reclaimed_predecessor_batch_run_ref_or_null: null,
    recovery_resume_state: "NOT_APPLICABLE",
  });
}

test("builds a schema-valid nightly identity envelope with canonical hash and dedupe tuple", async () => {
  const contract = identityFixture();

  await validateContractSchema("nightly_batch_identity_contract", contract);
  expect(contract.scheduler_dedupe_key).toBe(
    deriveNightlySchedulerDedupeKey({
      tenant_id: contract.tenant_id,
      nightly_window_key: contract.nightly_window_key,
      trigger_class: contract.trigger_class,
      release_verification_manifest_ref: contract.release_verification_manifest_ref,
      policy_snapshot_hash: contract.policy_snapshot_hash,
      autopilot_policy_hash: contract.autopilot_policy_hash,
    }),
  );
  expect(contract.identity_contract_hash).toBe(
    deriveNightlyBatchIdentityContractHash(contract),
  );
});

test("rejects non-recovery predecessor drift and preserves recovery successor lineage", async () => {
  const scheduled = identityFixture();

  expect(() =>
    buildNightlyBatchIdentityContract({
      ...scheduled,
      reclaimed_predecessor_batch_run_ref_or_null: "nightly-batch-run://predecessor",
    }),
  ).toThrow(NightlyBatchIdentityContractError);

  const recoverySchedulerKey = deriveNightlySchedulerDedupeKey({
    tenant_id: scheduled.tenant_id,
    nightly_window_key: scheduled.nightly_window_key,
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    release_verification_manifest_ref: scheduled.release_verification_manifest_ref,
    policy_snapshot_hash: scheduled.policy_snapshot_hash,
    autopilot_policy_hash: scheduled.autopilot_policy_hash,
  });
  const recovery = buildNightlyBatchIdentityContract({
    ...scheduled,
    trigger_class: "RECOVERY_RECLAIM_WINDOW",
    scheduler_dedupe_key: recoverySchedulerKey,
    reclaimed_predecessor_batch_run_ref_or_null: "nightly-batch-run://predecessor",
    recovery_resume_state: "PREDECESSOR_SELECTION_REUSED_RESHARDED",
  });

  await validateContractSchema("nightly_batch_identity_contract", recovery);
  expect(recovery.reclaimed_predecessor_batch_run_ref_or_null).toBe(
    "nightly-batch-run://predecessor",
  );
});
