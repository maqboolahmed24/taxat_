import { expect, test } from "@playwright/test";

import {
  AcceptedRiskApprovalRepository,
  buildAcceptedRiskApproval,
  buildFailureResolutionContract,
  recordAcceptedRiskApproval,
  revokeOrExpireAcceptedRiskApproval,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseApproval(overrides: Partial<Parameters<typeof buildAcceptedRiskApproval>[0]> = {}) {
  return buildAcceptedRiskApproval({
    accepted_risk_approval_id: "accepted-risk-0153",
    approved_at: "2026-05-03T09:00:00Z",
    approver_ref: "approver://tenant-admin-1",
    approver_type: "TENANT_ADMIN",
    audit_refs: ["audit://error-0153/accepted-risk/approved"],
    bounded_scope_refs: ["error://error-0153", "manifest://manifest-0153"],
    decision_basis: "EXPLICIT_APPROVAL",
    error_id: "error-0153",
    expires_at: "2026-06-03T09:00:00Z",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "ACCEPTED_RISK_APPROVAL",
    }),
    manifest_id: "manifest-0153",
    provenance_refs: ["provenance://error-0153/root"],
    rationale_ref: "rationale://error-0153/accepted-risk",
    root_manifest_id: "manifest-root-0153",
    ...overrides,
  });
}

test("active accepted risk requires bounded scope, explicit owner, and future expiry", () => {
  const approval = baseApproval();

  expect(approval.failure_resolution_contract.lifecycle_role).toBe("ACCEPTED_RISK_APPROVAL");
  expect(approval.bounded_scope_refs).toEqual(["error://error-0153", "manifest://manifest-0153"]);
  expect(() =>
    baseApproval({
      expires_at: "2026-05-03T09:00:00Z",
    }),
  ).toThrow(/expires_at/i);
});

test("accepted risk rejects chronology drift and self supersession", () => {
  expect(() =>
    baseApproval({
      approval_state: "REVOKED",
      revoked_at: "2026-05-03T08:59:00Z",
    }),
  ).toThrow(/revoked_at/i);

  expect(() =>
    baseApproval({
      approval_state: "SUPERSEDED",
      superseded_by_approval_id: "accepted-risk-0153",
    }),
  ).toThrow(/self-reference/i);
});

test("policy-basis accepted risk requires system policy basis rather than a human approver", () => {
  const policy = baseApproval({
    approver_ref: null,
    approver_type: "SYSTEM_POLICY",
    decision_basis: "POLICY_BASIS",
    policy_basis_ref: "policy://accepted-risk/system-basis",
  });

  expect(policy.policy_basis_ref).toBe("policy://accepted-risk/system-basis");
  expect(() =>
    baseApproval({
      approver_type: "SYSTEM_POLICY",
      decision_basis: "EXPLICIT_APPROVAL",
    }),
  ).toThrow(/explicit/i);
});

test("service revokes active approvals and rejects expiry before the review instant", async () => {
  const repository = new AcceptedRiskApprovalRepository();
  const approval = await recordAcceptedRiskApproval({
    accepted_risk_approval_id: "accepted-risk-0153-flow",
    approved_at: "2026-05-03T09:00:00Z",
    approver_ref: "approver://tenant-admin-1",
    approver_type: "TENANT_ADMIN",
    audit_refs: ["audit://error-0153/accepted-risk/approved"],
    bounded_scope_refs: ["error://error-0153"],
    decision_basis: "EXPLICIT_APPROVAL",
    error_id: "error-0153-flow",
    expires_at: "2026-06-03T09:00:00Z",
    manifest_id: "manifest-0153",
    provenance_refs: ["provenance://error-0153/root"],
    rationale_ref: "rationale://error-0153/accepted-risk",
    repository,
    root_manifest_id: "manifest-root-0153",
  });

  await expect(
    revokeOrExpireAcceptedRiskApproval({
      accepted_risk_approval_id: approval.accepted_risk_approval_id,
      action: "EXPIRE",
      audit_refs: ["audit://error-0153/accepted-risk/early-expiry"],
      expired_at: "2026-05-04T09:00:00Z",
      repository,
    }),
  ).rejects.toThrow(WorkflowModelError);

  const revoked = await revokeOrExpireAcceptedRiskApproval({
    accepted_risk_approval_id: approval.accepted_risk_approval_id,
    action: "REVOKE",
    audit_refs: ["audit://error-0153/accepted-risk/revoked"],
    repository,
    revoked_at: "2026-05-05T09:00:00Z",
  });

  expect(revoked.approval_state).toBe("REVOKED");
});
