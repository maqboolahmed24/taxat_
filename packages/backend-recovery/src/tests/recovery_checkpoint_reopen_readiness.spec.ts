import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  RecoveryCheckpointModelError,
  bindRestoreDrillEvidence,
  computeRecoveryCheckpointReopenReadinessState,
  transitionRecoveryCheckpoint,
  type RestorePrivacyReconciliationContract,
} from "../index.ts";
import {
  createdCheckpointFixture,
  restoreDrillRef,
  restorePrivacyContractFixture,
} from "./recovery_checkpoint_test_fixtures.ts";

function checkpointWithEvidence(
  privacyContract: RestorePrivacyReconciliationContract,
  overrides: {
    audit_continuity_verified?: boolean;
    queue_rebuild_verified?: boolean;
    authority_rebuild_verified?: boolean;
    authority_binding_revalidation_verified?: boolean;
  } = {},
) {
  return {
    ...createdCheckpointFixture(),
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0199",
    privacy_reconciliation_contract: privacyContract,
    privacy_reconciliation_outcome_ref: privacyContract.privacy_reconciliation_outcome_ref,
    audit_continuity_verified: overrides.audit_continuity_verified ?? false,
    queue_rebuild_verified: overrides.queue_rebuild_verified ?? false,
    authority_rebuild_verified: overrides.authority_rebuild_verified ?? false,
    authority_binding_revalidation_verified:
      overrides.authority_binding_revalidation_verified ?? false,
  };
}

test("derives reopen readiness with the validator blocker precedence", () => {
  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(
        restorePrivacyContractFixture({ privacy_reconciliation_state: "PENDING_RECONCILIATION" }),
      ),
    ),
  ).toBe("BLOCKED_PENDING_PRIVACY_RECONCILIATION");

  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(
        restorePrivacyContractFixture({
          privacy_reconciliation_state: "COMPENSATING_RE_ERASURE_REQUIRED",
        }),
        { audit_continuity_verified: false },
      ),
    ),
  ).toBe("BLOCKED_PENDING_COMPENSATING_RE_ERASURE");

  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(
        restorePrivacyContractFixture({ privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD" }),
      ),
    ),
  ).toBe("BLOCKED_LEGAL_HOLD_REVIEW");

  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(restorePrivacyContractFixture(), {
        audit_continuity_verified: false,
      }),
    ),
  ).toBe("BLOCKED_PENDING_AUDIT_CONTINUITY");

  const limitationDrift = {
    ...restorePrivacyContractFixture(),
    replay_limitation_state: "FAILED",
    reopen_access_state: "BLOCKED",
  } as RestorePrivacyReconciliationContract;
  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(limitationDrift, {
        audit_continuity_verified: true,
      }),
    ),
  ).toBe("BLOCKED_PENDING_LIMITATION_RECONCILIATION");

  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(restorePrivacyContractFixture(), {
        audit_continuity_verified: true,
        queue_rebuild_verified: false,
      }),
    ),
  ).toBe("BLOCKED_PENDING_QUEUE_REBUILD");

  expect(
    computeRecoveryCheckpointReopenReadinessState(
      checkpointWithEvidence(restorePrivacyContractFixture(), {
        audit_continuity_verified: true,
        queue_rebuild_verified: true,
        authority_rebuild_verified: false,
      }),
    ),
  ).toBe("BLOCKED_PENDING_AUTHORITY_REVALIDATION");
});

test("binds restore evidence without allowing restore drill, hash, snapshot, or privacy lineage drift", async () => {
  const created = createdCheckpointFixture();
  const bound = bindRestoreDrillEvidence({
    checkpoint: created,
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0199",
    privacy_reconciliation_contract: restorePrivacyContractFixture({
      privacy_reconciliation_state: "PENDING_RECONCILIATION",
    }),
  });
  await validateContractSchema("recovery_checkpoint", bound);
  expect(bound.checkpoint_state).toBe("CREATED");
  expect(bound.reopen_readiness_state).toBe("BLOCKED_PENDING_PRIVACY_RECONCILIATION");
  expect(bound.restore_verification_hash).toBe("restore-verification-hash-pc0199");

  expect(() =>
    bindRestoreDrillEvidence({
      checkpoint: created,
      restore_drill_ref: restoreDrillRef,
      restore_tested_at: "2026-05-05T09:15:00Z",
      restore_verification_hash: "restore-verification-hash-pc0199",
      privacy_reconciliation_contract: restorePrivacyContractFixture({
        restore_drill_ref: "restore-drill://pc0199/drifted",
        privacy_reconciliation_state: "PENDING_RECONCILIATION",
      }),
    }),
  ).toThrow(RecoveryCheckpointModelError);

  expect(() =>
    bindRestoreDrillEvidence({
      checkpoint: created,
      restore_drill_ref: restoreDrillRef,
      restore_tested_at: "2026-05-05T09:04:59Z",
      restore_verification_hash: "restore-verification-hash-pc0199",
      privacy_reconciliation_contract: restorePrivacyContractFixture({
        privacy_reconciliation_state: "PENDING_RECONCILIATION",
      }),
    }),
  ).toThrow(RecoveryCheckpointModelError);
});

test("quarantines failed restore evidence and expires without erasing inventory visibility", async () => {
  const created = createdCheckpointFixture();
  const quarantined = transitionRecoveryCheckpoint({
    checkpoint: created,
    event_code: "restore_drill_failed",
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-failed-pc0199",
    privacy_reconciliation_contract: restorePrivacyContractFixture({
      privacy_reconciliation_state: "PENDING_RECONCILIATION",
    }),
    quarantine_reason_code: "RESTORE_DRILL_FAILED",
    transition_applied_at: "2026-05-05T09:16:00Z",
    transition_audit_ref: "audit://pc0199/restore-drill-failed",
  });
  await validateContractSchema("recovery_checkpoint", quarantined);
  expect(quarantined.checkpoint_state).toBe("QUARANTINED");
  expect(quarantined.reopen_readiness_state).toBe("QUARANTINED");
  expect(quarantined.restore_verification_hash).toBe("restore-verification-hash-failed-pc0199");

  const expired = transitionRecoveryCheckpoint({
    checkpoint: quarantined,
    event_code: "retention_elapsed",
    transition_applied_at: "2026-06-05T09:16:00Z",
    transition_audit_ref: "audit://pc0199/retention-elapsed",
  });
  await validateContractSchema("recovery_checkpoint", expired);
  expect(expired.checkpoint_state).toBe("EXPIRED");
  expect(expired.reopen_readiness_state).toBe("EXPIRED");
  expect(expired.checkpoint_inventory_ref).toBe(quarantined.checkpoint_inventory_ref);
  expect(expired.snapshot_time).toBe(quarantined.snapshot_time);
  expect(expired.restore_verification_hash).toBe(quarantined.restore_verification_hash);
  expect(expired.quarantine_reason_code).toBeNull();
});
