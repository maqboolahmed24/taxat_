import { expect, test } from "@playwright/test";

import {
  RecoveryCheckpointModelError,
  runPostRestoreLimitationPass,
  type RestorePrivacyAuditChainState,
  type RestorePrivacyReconciliationState,
} from "../index.ts";

function verifiedRails(
  state: RestorePrivacyReconciliationState,
  audit: RestorePrivacyAuditChainState = "VERIFIED",
) {
  return runPostRestoreLimitationPass({
    privacy_reconciliation_state: state,
    audit_chain_continuity_state: audit,
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

test("marks final reconciled privacy posture ready only when replay and enquiry rails are verified", () => {
  const clean = verifiedRails("RECONCILED_NO_COMPENSATION_REQUIRED");
  expect(clean.replay_limitation_state).toBe("VERIFIED");
  expect(clean.enquiry_limitation_state).toBe("VERIFIED");
  expect(clean.reopen_access_state).toBe("READY_FOR_REOPEN");

  const compensated = verifiedRails("RECONCILED_WITH_COMPENSATING_RE_ERASURE");
  expect(compensated.reopen_access_state).toBe("READY_FOR_REOPEN");
});

test("maps legal, proof, and authority blocked states to limited rails and limited reopen", () => {
  for (const state of [
    "BLOCKED_LEGAL_HOLD",
    "BLOCKED_PROOF_PRESERVATION",
    "BLOCKED_AUTHORITY_AMBIGUITY",
  ] as const) {
    const pass = runPostRestoreLimitationPass({
      privacy_reconciliation_state: state,
      audit_chain_continuity_state: "VERIFIED",
      replay: {
        verification_ref_or_null: null,
        limited_reconciliation_ref_or_null: `replay-limitation://pc0200/${state}`,
        failure_ref_or_null: null,
      },
      enquiry: {
        verification_ref_or_null: null,
        limited_reconciliation_ref_or_null: `enquiry-limitation://pc0200/${state}`,
        failure_ref_or_null: null,
      },
    });
    expect(pass.replay_limitation_state).toBe("LIMITED_RECONCILED");
    expect(pass.enquiry_limitation_state).toBe("LIMITED_RECONCILED");
    expect(pass.reopen_access_state).toBe("LIMITED");
  }
});

test("keeps pending and open compensation blocked without letting verified rails imply reopen", () => {
  const pending = verifiedRails("PENDING_RECONCILIATION");
  expect(pending.replay_limitation_state).toBe("FAILED");
  expect(pending.enquiry_limitation_state).toBe("FAILED");
  expect(pending.reopen_access_state).toBe("BLOCKED");

  const required = verifiedRails("COMPENSATING_RE_ERASURE_REQUIRED");
  expect(required.replay_limitation_state).toBe("VERIFIED");
  expect(required.enquiry_limitation_state).toBe("VERIFIED");
  expect(required.reopen_access_state).toBe("BLOCKED");
});

test("blocks reopen when audit continuity or either limitation rail fails", () => {
  expect(verifiedRails("RECONCILED_NO_COMPENSATION_REQUIRED", "FAILED").reopen_access_state).toBe(
    "BLOCKED",
  );

  const failedReplay = runPostRestoreLimitationPass({
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
  expect(failedReplay.replay_limitation_state).toBe("FAILED");
  expect(failedReplay.enquiry_limitation_state).toBe("VERIFIED");
  expect(failedReplay.reopen_access_state).toBe("BLOCKED");
  expect(failedReplay.limitation_failure_refs).toEqual(["replay-limitation://pc0200/failure"]);
});

test("fails deterministic rail classification on ambiguous or missing evidence", () => {
  expect(() =>
    runPostRestoreLimitationPass({
      privacy_reconciliation_state: "RECONCILED_NO_COMPENSATION_REQUIRED",
      audit_chain_continuity_state: "VERIFIED",
      replay: {
        verification_ref_or_null: "replay-limitation://pc0200/verified",
        limited_reconciliation_ref_or_null: "replay-limitation://pc0200/limited",
        failure_ref_or_null: null,
      },
      enquiry: {
        verification_ref_or_null: "enquiry-limitation://pc0200/verified",
        limited_reconciliation_ref_or_null: null,
        failure_ref_or_null: null,
      },
    }),
  ).toThrow(RecoveryCheckpointModelError);

  const missingLimited = runPostRestoreLimitationPass({
    privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD",
    audit_chain_continuity_state: "VERIFIED",
    replay: {
      verification_ref_or_null: null,
      limited_reconciliation_ref_or_null: null,
      failure_ref_or_null: null,
    },
    enquiry: {
      verification_ref_or_null: null,
      limited_reconciliation_ref_or_null: "enquiry-limitation://pc0200/limited",
      failure_ref_or_null: null,
    },
  });
  expect(missingLimited.replay_limitation_state).toBe("FAILED");
  expect(missingLimited.enquiry_limitation_state).toBe("LIMITED_RECONCILED");
  expect(missingLimited.reopen_access_state).toBe("BLOCKED");
});
