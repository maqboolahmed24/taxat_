import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  RecoveryCheckpointModelError,
  RestorePrivacyReconciliationRepository,
  buildCompensatingReErasureWorkflow,
  buildRestorePrivacyReconciliationContract,
  classifyRestoreResurrectedDataPosture,
  persistRestorePrivacyReconciliation,
  runPostRestoreLimitationPass,
  type RestorePrivacyReconciliationState,
} from "../index.ts";

const checkpointRef = "checkpoint://pc0200/control-plane";
const restoreDrillRef = "restore-drill://pc0200/primary";
const outcomeRef = "privacy-reconciliation://pc0200/outcome";
const auditRef = "audit-chain://pc0200/restore";

function cleanClassification() {
  return classifyRestoreResurrectedDataPosture({
    reconciliation_completed: true,
    resurrected_restricted_data_subject_count_or_null: 0,
    resurrected_data_detection_basis_ref_or_null: "privacy-scan://pc0200/clean",
    evaluated_erasure_or_pseudonymisation_refs: [],
  });
}

function resurrectedClassification() {
  return classifyRestoreResurrectedDataPosture({
    reconciliation_completed: true,
    resurrected_restricted_data_subject_count_or_null: 2,
    resurrected_data_detection_basis_ref_or_null: "privacy-scan://pc0200/resurrected",
    evaluated_erasure_or_pseudonymisation_refs: [
      "erasure-request://pc0200/subject-a",
      "pseudonymisation://pc0200/subject-b",
    ],
  });
}

function verifiedLimitationPass(state: RestorePrivacyReconciliationState) {
  return runPostRestoreLimitationPass({
    privacy_reconciliation_state: state,
    audit_chain_continuity_state: "VERIFIED",
    replay: {
      verification_ref_or_null: "replay-limitation://pc0200/verified",
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
    enquiry: {
      verification_ref_or_null: "enquiry-limitation://pc0200/verified",
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
  });
}

function limitedLimitationPass(state: RestorePrivacyReconciliationState) {
  return runPostRestoreLimitationPass({
    privacy_reconciliation_state: state,
    audit_chain_continuity_state: "VERIFIED",
    replay: {
      verification_ref_or_null: null,
      limited_reconciliation_ref_or_null: "replay-limitation://pc0200/limited",
      failure_ref_or_null: null,
    },
    enquiry: {
      verification_ref_or_null: null,
      limited_reconciliation_ref_or_null: "enquiry-limitation://pc0200/limited",
      failure_ref_or_null: null,
    },
  });
}

function compensatingWorkflow(input: {
  state: "REQUIRED_PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  outcome_ref?: string;
  completed_at?: string | null;
}) {
  return buildCompensatingReErasureWorkflow({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: input.outcome_ref ?? outcomeRef,
    compensating_re_erasure_state: input.state,
    resurrected_subject_count_or_null: 2,
    compensating_re_erasure_workflow_ref_or_null: "workflow://pc0200/re-erasure",
    compensating_re_erasure_audit_ref_or_null: "audit://pc0200/re-erasure",
    workflow_started_at_or_null: "2026-05-05T09:21:00Z",
    re_erasure_completed_at_or_null: input.completed_at ?? null,
  });
}

test("builds and persists a schema-valid clean restore privacy contract", async () => {
  const contract = buildRestorePrivacyReconciliationContract({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: outcomeRef,
    privacy_reconciliation_state: "RECONCILED_NO_COMPENSATION_REQUIRED",
    resurrected_data: cleanClassification(),
    compensating_re_erasure_workflow_or_null: null,
    audit_chain_continuity_state: "VERIFIED",
    audit_chain_continuity_ref: auditRef,
    limitation_pass: verifiedLimitationPass("RECONCILED_NO_COMPENSATION_REQUIRED"),
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
  });

  await validateContractSchema("restore_privacy_reconciliation_contract", contract);
  expect(contract.reconciliation_scope_policy).toBe(
    "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF",
  );
  expect(contract.resurrected_subject_count_or_null).toBe(0);
  expect(contract.compensating_re_erasure_workflow_ref_or_null).toBeNull();
  expect(contract.reopen_access_state).toBe("READY_FOR_REOPEN");

  const repository = new RestorePrivacyReconciliationRepository();
  const stored = await persistRestorePrivacyReconciliation({
    repository,
    contract,
    persisted_at: "2026-05-05T09:21:00Z",
  });
  const storedAgain = await persistRestorePrivacyReconciliation({
    repository,
    contract,
    persisted_at: "2026-05-05T09:22:00Z",
  });
  expect(stored.restore_privacy_reconciliation_row_version).toBe(1);
  expect(storedAgain.updated_at).toBe(stored.updated_at);
  await expect(
    repository.listRestorePrivacyReconciliationsByCheckpointRef(checkpointRef),
  ).resolves.toHaveLength(1);
});

test("keeps compensating re-erasure lineage and appends contract history as material state changes", async () => {
  const required = buildRestorePrivacyReconciliationContract({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: outcomeRef,
    privacy_reconciliation_state: "COMPENSATING_RE_ERASURE_REQUIRED",
    resurrected_data: resurrectedClassification(),
    compensating_re_erasure_workflow_or_null: compensatingWorkflow({ state: "REQUIRED_PENDING" }),
    audit_chain_continuity_state: "VERIFIED",
    audit_chain_continuity_ref: auditRef,
    limitation_pass: verifiedLimitationPass("COMPENSATING_RE_ERASURE_REQUIRED"),
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
  });
  const completed = buildRestorePrivacyReconciliationContract({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: outcomeRef,
    privacy_reconciliation_state: "RECONCILED_WITH_COMPENSATING_RE_ERASURE",
    resurrected_data: resurrectedClassification(),
    compensating_re_erasure_workflow_or_null: compensatingWorkflow({
      state: "COMPLETED",
      completed_at: "2026-05-05T09:25:00Z",
    }),
    audit_chain_continuity_state: "VERIFIED",
    audit_chain_continuity_ref: auditRef,
    limitation_pass: verifiedLimitationPass("RECONCILED_WITH_COMPENSATING_RE_ERASURE"),
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
  });

  await validateContractSchema("restore_privacy_reconciliation_contract", completed);
  expect(required.reconciliation_contract_hash).not.toBe(completed.reconciliation_contract_hash);
  expect(completed.re_erasure_completed_at_or_null).toBe("2026-05-05T09:25:00Z");

  const repository = new RestorePrivacyReconciliationRepository();
  const storedRequired = await repository.persistRestorePrivacyReconciliation({
    contract: required,
    persisted_at: "2026-05-05T09:22:00Z",
  });
  const storedCompleted = await repository.compareAndSwapRestorePrivacyReconciliation({
    privacy_reconciliation_outcome_ref: outcomeRef,
    expected_restore_privacy_reconciliation_row_version:
      storedRequired.restore_privacy_reconciliation_row_version,
    contract: completed,
    persisted_at: "2026-05-05T09:26:00Z",
  });
  expect(storedCompleted.restore_privacy_reconciliation_row_version).toBe(2);
  await expect(repository.listRestorePrivacyReconciliationHistory(outcomeRef)).resolves.toHaveLength(2);
});

test("keeps legal, proof-preservation, and authority ambiguity blockers typed and limited", async () => {
  const blockedCases: Array<{
    state: RestorePrivacyReconciliationState;
    blocker_refs: Record<string, string>;
  }> = [
    {
      state: "BLOCKED_LEGAL_HOLD",
      blocker_refs: { legal_hold_ref_or_null: "legal-hold://pc0200/hold" },
    },
    {
      state: "BLOCKED_PROOF_PRESERVATION",
      blocker_refs: {
        proof_preservation_basis_ref_or_null: "proof-preservation://pc0200/basis",
      },
    },
    {
      state: "BLOCKED_AUTHORITY_AMBIGUITY",
      blocker_refs: {
        authority_ambiguity_ref_or_null: "authority-ambiguity://pc0200/case",
      },
    },
  ];

  for (const blockedCase of blockedCases) {
    const contract = buildRestorePrivacyReconciliationContract({
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: `${outcomeRef}/${blockedCase.state.toLowerCase()}`,
      privacy_reconciliation_state: blockedCase.state,
      resurrected_data: resurrectedClassification(),
      compensating_re_erasure_workflow_or_null: compensatingWorkflow({
        state: "BLOCKED",
        outcome_ref: `${outcomeRef}/${blockedCase.state.toLowerCase()}`,
      }),
      audit_chain_continuity_state: "VERIFIED",
      audit_chain_continuity_ref: auditRef,
      limitation_pass: limitedLimitationPass(blockedCase.state),
      blocker_refs: blockedCase.blocker_refs,
      reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
    });
    await validateContractSchema("restore_privacy_reconciliation_contract", contract);
    expect(contract.replay_limitation_state).toBe("LIMITED_RECONCILED");
    expect(contract.enquiry_limitation_state).toBe("LIMITED_RECONCILED");
    expect(contract.reopen_access_state).toBe("LIMITED");
  }
});

test("fails closed for missing completion, final limitation drift, audit failure, and blocker drift", () => {
  expect(() =>
    compensatingWorkflow({
      state: "COMPLETED",
      completed_at: null,
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const failedFinalPass = runPostRestoreLimitationPass({
    privacy_reconciliation_state: "RECONCILED_NO_COMPENSATION_REQUIRED",
    audit_chain_continuity_state: "VERIFIED",
    replay: {
      verification_ref_or_null: null,
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: "replay-limitation://pc0200/failure",
    },
    enquiry: {
      verification_ref_or_null: "enquiry-limitation://pc0200/verified",
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
  });
  expect(() =>
    buildRestorePrivacyReconciliationContract({
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: `${outcomeRef}/limitation-failure`,
      privacy_reconciliation_state: "RECONCILED_NO_COMPENSATION_REQUIRED",
      resurrected_data: cleanClassification(),
      compensating_re_erasure_workflow_or_null: null,
      audit_chain_continuity_state: "VERIFIED",
      audit_chain_continuity_ref: auditRef,
      limitation_pass: failedFinalPass,
      reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const auditFailedPass = runPostRestoreLimitationPass({
    privacy_reconciliation_state: "RECONCILED_WITH_COMPENSATING_RE_ERASURE",
    audit_chain_continuity_state: "FAILED",
    replay: {
      verification_ref_or_null: "replay-limitation://pc0200/verified",
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
    enquiry: {
      verification_ref_or_null: "enquiry-limitation://pc0200/verified",
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
  });
  expect(() =>
    buildRestorePrivacyReconciliationContract({
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: `${outcomeRef}/audit-failed`,
      privacy_reconciliation_state: "RECONCILED_WITH_COMPENSATING_RE_ERASURE",
      resurrected_data: resurrectedClassification(),
      compensating_re_erasure_workflow_or_null: compensatingWorkflow({
        state: "COMPLETED",
        outcome_ref: `${outcomeRef}/audit-failed`,
        completed_at: "2026-05-05T09:25:00Z",
      }),
      audit_chain_continuity_state: "FAILED",
      audit_chain_continuity_ref: "audit-chain://pc0200/failed",
      limitation_pass: auditFailedPass,
      reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const firstBlocker = buildRestorePrivacyReconciliationContract({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: `${outcomeRef}/blocker-a`,
    privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD",
    resurrected_data: resurrectedClassification(),
    compensating_re_erasure_workflow_or_null: compensatingWorkflow({
      state: "BLOCKED",
      outcome_ref: `${outcomeRef}/blocker-a`,
    }),
    audit_chain_continuity_state: "VERIFIED",
    audit_chain_continuity_ref: auditRef,
    limitation_pass: limitedLimitationPass("BLOCKED_LEGAL_HOLD"),
    blocker_refs: { legal_hold_ref_or_null: "legal-hold://pc0200/a" },
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
  });
  const secondBlocker = buildRestorePrivacyReconciliationContract({
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: `${outcomeRef}/blocker-b`,
    privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD",
    resurrected_data: resurrectedClassification(),
    compensating_re_erasure_workflow_or_null: compensatingWorkflow({
      state: "BLOCKED",
      outcome_ref: `${outcomeRef}/blocker-b`,
    }),
    audit_chain_continuity_state: "VERIFIED",
    audit_chain_continuity_ref: auditRef,
    limitation_pass: limitedLimitationPass("BLOCKED_LEGAL_HOLD"),
    blocker_refs: { legal_hold_ref_or_null: "legal-hold://pc0200/b" },
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
  });
  expect(firstBlocker.reconciliation_contract_hash).not.toBe(
    secondBlocker.reconciliation_contract_hash,
  );
});
