import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  RecoveryCheckpointLifecycleError,
  RecoveryCheckpointModelError,
  RecoveryCheckpointRepository,
  buildRecoveryCheckpointStateTransitionContract,
  transitionRecoveryCheckpoint,
} from "../index.ts";
import {
  checkpointId,
  createdCheckpointFixture,
  requestedCheckpointFixture,
  restoreDrillRef,
  restorePrivacyContractFixture,
} from "./recovery_checkpoint_test_fixtures.ts";

test("registers and transitions schema-valid recovery checkpoints through requested, created, and verified states", async () => {
  const repository = new RecoveryCheckpointRepository();
  const requested = requestedCheckpointFixture();
  await validateContractSchema("recovery_checkpoint", requested);

  const storedRequested = await repository.persistRecoveryCheckpoint({
    checkpoint: requested,
    persisted_at: "2026-05-05T09:00:00Z",
  });
  expect(storedRequested.recovery_checkpoint_row_version).toBe(1);
  expect(storedRequested.recovery_tier_class).toBe("TIER_0_CONTROL_PLANE");
  expect(storedRequested.rpo_class).toBe("RPO_15M");

  const created = createdCheckpointFixture();
  await validateContractSchema("recovery_checkpoint", created);
  expect(created.checkpoint_state).toBe("CREATED");
  expect(created.reopen_readiness_state).toBe("BLOCKED_PENDING_RESTORE_DRILL");

  const storedCreated = await repository.compareAndSwapRecoveryCheckpoint({
    checkpoint_id: checkpointId,
    expected_recovery_checkpoint_row_version: 1,
    checkpoint: created,
    persisted_at: "2026-05-05T09:06:00Z",
  });
  expect(storedCreated.recovery_checkpoint_row_version).toBe(2);
  await expect(repository.listRecoveryCheckpointsByDatastoreRef(created.datastore_ref)).resolves.toHaveLength(1);
  await expect(repository.listRecoveryCheckpointsByState("CREATED")).resolves.toHaveLength(1);

  const expiredWithSnapshotDrift = {
    ...transitionRecoveryCheckpoint({
      checkpoint: created,
      event_code: "retention_elapsed",
      transition_applied_at: "2026-06-05T09:06:00Z",
      transition_audit_ref: "audit://pc0199/snapshot-drift-attempt",
    }),
    snapshot_time: "2026-05-05T09:07:00Z",
  };
  await expect(
    repository.compareAndSwapRecoveryCheckpoint({
      checkpoint_id: checkpointId,
      expected_recovery_checkpoint_row_version: storedCreated.recovery_checkpoint_row_version,
      checkpoint: expiredWithSnapshotDrift,
      persisted_at: "2026-06-05T09:06:00Z",
    }),
  ).rejects.toMatchObject({ code: "RECOVERY_CHECKPOINT_COMPARE_AND_SWAP_CONFLICT" });

  const verified = transitionRecoveryCheckpoint({
    checkpoint: created,
    event_code: "restore_drill_passed",
    restore_drill_ref: restoreDrillRef,
    restore_tested_at: "2026-05-05T09:15:00Z",
    restore_verification_hash: "restore-verification-hash-pc0199",
    privacy_reconciliation_contract: restorePrivacyContractFixture(),
    audit_continuity_verified: true,
    queue_rebuild_verified: true,
    authority_rebuild_verified: true,
    authority_binding_revalidation_verified: true,
    transition_applied_at: "2026-05-05T09:30:00Z",
    transition_audit_ref: "audit://pc0199/restore-drill-passed",
  });
  await validateContractSchema("recovery_checkpoint", verified);
  expect(verified.checkpoint_state).toBe("VERIFIED");
  expect(verified.reopen_readiness_state).toBe("READY_FOR_REOPEN");

  const storedVerified = await repository.compareAndSwapRecoveryCheckpoint({
    checkpoint_id: checkpointId,
    expected_recovery_checkpoint_row_version: storedCreated.recovery_checkpoint_row_version,
    checkpoint: verified,
    persisted_at: "2026-05-05T09:30:00Z",
  });
  expect(storedVerified.recovery_checkpoint_row_version).toBe(3);
  await expect(repository.listRecoveryCheckpointsByState("VERIFIED")).resolves.toHaveLength(1);
  await expect(repository.listRecoveryCheckpointTransitions(checkpointId)).resolves.toHaveLength(2);
});

test("rejects illegal recovery checkpoint transition tuples and premature verified posture", async () => {
  const requested = requestedCheckpointFixture();
  expect(() =>
    transitionRecoveryCheckpoint({
      checkpoint: requested,
      event_code: "restore_drill_passed",
      restore_drill_ref: restoreDrillRef,
      restore_tested_at: "2026-05-05T09:15:00Z",
      restore_verification_hash: "restore-verification-hash-pc0199",
      privacy_reconciliation_contract: restorePrivacyContractFixture(),
      audit_continuity_verified: true,
      queue_rebuild_verified: true,
      authority_rebuild_verified: true,
      authority_binding_revalidation_verified: true,
      transition_applied_at: "2026-05-05T09:30:00Z",
      transition_audit_ref: "audit://pc0199/illegal",
    }),
  ).toThrow(RecoveryCheckpointLifecycleError);

  const created = createdCheckpointFixture();
  expect(() =>
    transitionRecoveryCheckpoint({
      checkpoint: created,
      event_code: "restore_drill_passed",
      restore_drill_ref: restoreDrillRef,
      restore_tested_at: "2026-05-05T09:15:00Z",
      restore_verification_hash: "restore-verification-hash-pc0199",
      privacy_reconciliation_contract: restorePrivacyContractFixture({
        privacy_reconciliation_state: "PENDING_RECONCILIATION",
      }),
      audit_continuity_verified: true,
      queue_rebuild_verified: true,
      authority_rebuild_verified: true,
      authority_binding_revalidation_verified: true,
      transition_applied_at: "2026-05-05T09:30:00Z",
      transition_audit_ref: "audit://pc0199/premature-verified",
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const illegalContract = buildRecoveryCheckpointStateTransitionContract({
    current_state: "VERIFIED",
    previous_state_or_null: "REQUESTED",
    transition_event_code: "restore_drill_passed",
    transition_applied_at: "2026-05-05T09:30:00Z",
    transition_audit_ref: "audit://pc0199/illegal-tuple",
  });
  await expect(validateContractSchema("state_transition_contract", illegalContract)).rejects.toThrow(
    /legal `RECOVERY_CHECKPOINT` transition/,
  );
});
