import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  RecoveryCheckpointModelError,
  transitionRecoveryCheckpoint,
} from "../../../backend-recovery/src/index.ts";
import {
  createdCheckpointFixture,
  restoreDrillRef,
  restorePrivacyContractFixture,
} from "../../../backend-recovery/src/tests/recovery_checkpoint_test_fixtures.ts";
import {
  assertCheckpointReadyForReopen,
  validateCheckpointReopenReadiness,
} from "../index.ts";

test("preserves explicit blocker posture before restore and privacy gates are complete", async () => {
  const created = createdCheckpointFixture();
  const report = validateCheckpointReopenReadiness(created);

  expect(report).toMatchObject({
    actual_reopen_readiness_state: "BLOCKED_PENDING_RESTORE_DRILL",
    blocker_state_or_null: "BLOCKED_PENDING_RESTORE_DRILL",
    checkpoint_state: "CREATED",
    reopen_allowed: false,
  });
  await validateContractSchema("recovery_checkpoint", created);
  expect(() => assertCheckpointReadyForReopen(created)).toThrow(
    RecoveryCheckpointModelError,
  );
});

test("allows reopen only for verified checkpoints with every durable safety gate satisfied", async () => {
  const verified = transitionRecoveryCheckpoint({
    audit_continuity_verified: true,
    authority_binding_revalidation_verified: true,
    authority_rebuild_verified: true,
    checkpoint: createdCheckpointFixture(),
    event_code: "restore_drill_passed",
    privacy_reconciliation_contract: restorePrivacyContractFixture(),
    queue_rebuild_verified: true,
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0226",
    transition_applied_at: "2026-05-05T09:30:00Z",
    transition_audit_ref: "audit://pc0226/restore-drill-passed",
  });

  const report = assertCheckpointReadyForReopen(verified);
  expect(report).toMatchObject({
    actual_reopen_readiness_state: "READY_FOR_REOPEN",
    blocker_state_or_null: null,
    checkpoint_state: "VERIFIED",
    reopen_allowed: true,
  });
  await validateContractSchema("recovery_checkpoint", verified);
});

test("rejects verified checkpoint posture when privacy or authority gates are missing", () => {
  const verified = transitionRecoveryCheckpoint({
    audit_continuity_verified: true,
    authority_binding_revalidation_verified: true,
    authority_rebuild_verified: true,
    checkpoint: createdCheckpointFixture(),
    event_code: "restore_drill_passed",
    privacy_reconciliation_contract: restorePrivacyContractFixture(),
    queue_rebuild_verified: true,
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0226",
    transition_applied_at: "2026-05-05T09:30:00Z",
    transition_audit_ref: "audit://pc0226/restore-drill-passed",
  });

  expect(() =>
    validateCheckpointReopenReadiness({
      ...verified,
      authority_binding_revalidation_verified: false,
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const createdWithBlockedPrivacy = {
    ...createdCheckpointFixture(),
    audit_continuity_verified: true,
    authority_binding_revalidation_verified: true,
    authority_rebuild_verified: true,
    privacy_reconciliation_contract: restorePrivacyContractFixture({
      privacy_reconciliation_state: "BLOCKED_PROOF_PRESERVATION",
    }),
    privacy_reconciliation_outcome_ref:
      "privacy-reconciliation://pc0199/outcome",
    queue_rebuild_verified: true,
    reopen_readiness_state: "BLOCKED_PROOF_PRESERVATION_REVIEW" as const,
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0226",
  };
  const report = validateCheckpointReopenReadiness(createdWithBlockedPrivacy);
  expect(report.blocker_state_or_null).toBe("BLOCKED_PROOF_PRESERVATION_REVIEW");
  expect(report.reopen_allowed).toBe(false);
});
