import { expect, test } from "@playwright/test";

import {
  buildDecisionBundleRecord,
  computeDecisionBundleDeterministicOutcomeHash,
  finalizeTerminalOutcome,
  DecisionBundleRepository,
  TerminalRefSetValidationError,
  validateTerminalRefSet,
} from "../../../packages/backend-compute/src/index.ts";

test("authority postures drive terminal status and truth posture", () => {
  const confirmed = buildDecisionBundleRecord({
    authority_posture: "AUTHORITY_CONFIRMED",
    manifest_id: "manifest-0127-authority-confirmed",
    persisted_at: "2026-04-28T13:00:00Z",
    reason_codes: ["FINAL_SUCCESS"],
    submission_record_id: "submission-record://confirmed",
  });

  expect(confirmed.decision_status).toBe("COMPLETED");
  expect(confirmed.outcome_class).toBe("FINAL_SUCCESS");
  expect(confirmed.checkpoint_state).toBe("CONFIRMED");
  expect(confirmed.truth_state).toBe("AUTHORITY_CONFIRMED");
  expect(confirmed.waiting_on).toBe("NONE");

  const rejected = buildDecisionBundleRecord({
    authority_posture: "REJECTED",
    manifest_id: "manifest-0127-authority-rejected",
    persisted_at: "2026-04-28T13:01:00Z",
    reason_codes: ["AUTHORITY_REJECTED"],
    submission_record_id: "submission-record://rejected",
  });

  expect(rejected.decision_status).toBe("BLOCKED");
  expect(rejected.outcome_class).toBe("FINAL_BLOCKED");
  expect(rejected.checkpoint_state).toBe("REJECTED");
  expect(rejected.truth_state).toBe("AUTHORITY_REJECTED");
});

test("pre-start blocked ref validation rejects child artifacts and gate records", () => {
  const preStart = buildDecisionBundleRecord({
    decision_status: "BLOCKED",
    manifest_id: "manifest-0127-prestart",
    outcome_class: "FINAL_BLOCKED",
    persisted_at: "2026-04-28T13:05:00Z",
    snapshot_id: "snapshot://forbidden",
  });

  expect(() =>
    validateTerminalRefSet({
      decision_bundle: preStart,
      pre_start_blocked: true,
    }),
  ).toThrow(TerminalRefSetValidationError);
});

test("deterministic outcome hash is byte-stable and pure finalization persists bundles", async () => {
  const repository = new DecisionBundleRepository();
  const bundle = buildDecisionBundleRecord({
    manifest_id: "manifest-0127-deterministic",
    outcome_class: "FINAL_SUCCESS",
    persisted_at: "2026-04-28T13:10:00Z",
    reason_codes: ["FINAL_SUCCESS"],
  });

  const first = computeDecisionBundleDeterministicOutcomeHash({ decision_bundle: bundle });
  const second = computeDecisionBundleDeterministicOutcomeHash({ decision_bundle: bundle });
  expect(second.deterministic_outcome_hash).toBe(first.deterministic_outcome_hash);

  const finalized = await finalizeTerminalOutcome({
    decision_bundle: bundle,
    repository,
  });
  expect(finalized.stored_decision_bundle.decision_bundle_hash).toBe(
    bundle.contract.artifact_content_hash,
  );
  expect(finalized.deterministic_outcome_hash).toBe(first.deterministic_outcome_hash);
  await expect(
    repository.listDecisionBundlesByManifestId(bundle.manifest_id),
  ).resolves.toHaveLength(1);
});
