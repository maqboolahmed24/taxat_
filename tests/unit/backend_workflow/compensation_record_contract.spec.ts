import { expect, test } from "@playwright/test";

import {
  buildCompensationRecord,
  buildFailureResolutionContract,
  CompensationRecordRepository,
  recordCompensation,
  verifyOrSupersedeCompensation,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseRecord(overrides: Partial<Parameters<typeof buildCompensationRecord>[0]> = {}) {
  return buildCompensationRecord({
    audit_refs: ["audit://error-0153/compensation/open"],
    compensation_id: "compensation-0153",
    compensation_mode: "REVERT_DERIVED_ONLY",
    compensation_steps_ref: "compensation-steps://error-0153/revert",
    created_at: "2026-05-03T09:00:00Z",
    error_id: "error-0153",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "COMPENSATION_RECORD",
    }),
    manifest_id: "manifest-0153",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153/root"],
    root_manifest_id: "manifest-root-0153",
    target_object_refs: ["artifact://derived-state-1"],
    ...overrides,
  });
}

test("applied compensation requires closure basis, evidence, and non-regressing compensated_at", () => {
  expect(() =>
    baseRecord({
      compensated_at: "2026-05-03T08:59:00Z",
      compensation_status: "APPLIED",
      resolution_basis_ref: "resolution-basis://error-0153/compensation",
      closure_evidence_refs: ["evidence://error-0153/compensation"],
    }),
  ).toThrow(/compensated_at/i);

  const record = baseRecord({
    compensated_at: "2026-05-03T09:10:00Z",
    compensation_status: "APPLIED",
    resolution_basis_ref: "resolution-basis://error-0153/compensation",
    closure_evidence_refs: ["evidence://error-0153/compensation"],
  });

  expect(record.compensated_at).toBe("2026-05-03T09:10:00Z");
});

test("verified and superseded compensation enforce exact field posture", () => {
  expect(() =>
    baseRecord({
      compensated_at: "2026-05-03T09:10:00Z",
      compensation_status: "VERIFIED",
      resolution_basis_ref: "resolution-basis://error-0153/compensation",
      closure_evidence_refs: ["evidence://error-0153/compensation"],
    }),
  ).toThrow(/verification/i);

  expect(() =>
    baseRecord({
      compensation_status: "SUPERSEDED",
      resolution_basis_ref: "resolution-basis://error-0153/compensation",
      closure_evidence_refs: ["evidence://error-0153/compensation"],
      superseded_by_compensation_id: "compensation-0153",
    }),
  ).toThrow(/self-reference/i);
});

test("preserve-and-limit and manual compensation modes require linkage", () => {
  expect(() =>
    baseRecord({
      compensation_mode: "PRESERVE_AND_LIMIT",
    }),
  ).toThrow(/retention/i);

  expect(() =>
    baseRecord({
      compensation_mode: "OPEN_RECONCILIATION",
    }),
  ).toThrow(/workflow_item_id/i);
});

test("service verifies applied compensation without mutating immutable lineage", async () => {
  const repository = new CompensationRecordRepository();
  const applied = await recordCompensation({
    audit_refs: ["audit://error-0153/compensation/applied"],
    compensated_at: "2026-05-03T09:10:00Z",
    compensation_id: "compensation-0153-flow",
    compensation_mode: "REVERT_DERIVED_ONLY",
    compensation_status: "APPLIED",
    compensation_steps_ref: "compensation-steps://error-0153/revert",
    created_at: "2026-05-03T09:00:00Z",
    error_id: "error-0153-flow",
    manifest_id: "manifest-0153",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153/root"],
    repository,
    resolution_basis_ref: "resolution-basis://error-0153/compensation",
    closure_evidence_refs: ["evidence://error-0153/compensation"],
    root_manifest_id: "manifest-root-0153",
    target_object_refs: ["artifact://derived-state-1"],
  });

  const verified = await verifyOrSupersedeCompensation({
    action: "VERIFY",
    audit_refs: ["audit://error-0153/compensation/verified"],
    compensation_id: applied.compensation_id,
    repository,
    verification_ref: "verification://error-0153/compensation",
  });

  expect(verified.compensation_status).toBe("VERIFIED");
  await expect(
    verifyOrSupersedeCompensation({
      action: "SUPERSEDE",
      audit_refs: ["audit://error-0153/compensation/supersede"],
      closure_evidence_refs: ["evidence://error-0153/superseded"],
      compensation_id: verified.compensation_id,
      repository,
      resolution_basis_ref: "resolution-basis://error-0153/supersede",
      superseded_by_compensation_id: "compensation-successor",
    }),
  ).rejects.toThrow(WorkflowModelError);
});
