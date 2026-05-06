import { expect, test } from "@playwright/test";

import {
  buildFailureInvestigation,
  buildFailureResolutionContract,
  FailureInvestigationRepository,
  openFailureInvestigation,
  resolveFailureInvestigation,
  updateFailureInvestigation,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseInvestigation(
  overrides: Partial<Parameters<typeof buildFailureInvestigation>[0]> = {},
) {
  return buildFailureInvestigation({
    audit_refs: ["audit://error-0154/investigation/open"],
    error_id: "error-0154",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "FAILURE_INVESTIGATION",
    }),
    investigation_class: "AUTHORITY_STATE_AMBIGUITY",
    investigation_id: "investigation-0154",
    investigation_steps_ref: "investigation-steps://error-0154/authority-state",
    manifest_id: "manifest-0154",
    opened_at: "2026-05-03T09:00:00Z",
    owner_ref: "reviewer://failure-team-1",
    owner_type: "REVIEWER",
    provenance_refs: ["provenance://error-0154/root"],
    root_manifest_id: "manifest-root-0154",
    ...overrides,
  });
}

test("builds an open failure investigation with role-specific resolution contract", () => {
  const investigation = baseInvestigation();

  expect(investigation.failure_resolution_contract.lifecycle_role).toBe("FAILURE_INVESTIGATION");
  expect(investigation.failure_resolution_contract.role_specific_binding_policy).toBe(
    "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE",
  );
  expect(investigation.investigation_state).toBe("OPEN");
  expect(investigation.resolved_at).toBeNull();
});

test("enforces investigation chronology and non-terminal closure emptiness", () => {
  expect(() =>
    baseInvestigation({
      due_at: "2026-05-03T08:59:00Z",
    }),
  ).toThrow(/due_at/i);

  expect(() =>
    baseInvestigation({
      closure_evidence_refs: ["evidence://error-0154/premature"],
    }),
  ).toThrow(/non-terminal/i);
});

test("terminal investigations require basis, evidence, and typed outcome linkage", () => {
  expect(() =>
    baseInvestigation({
      closure_evidence_refs: ["evidence://error-0154/remediation-needed"],
      investigation_state: "RESOLVED",
      last_activity_at: "2026-05-03T09:30:00Z",
      outcome: "REMEDIATION_SPAWNED",
      resolution_basis_ref: "resolution-basis://error-0154/root-cause",
      resolved_at: "2026-05-03T09:30:00Z",
    }),
  ).toThrow(/remediation_task_refs/i);

  const resolved = baseInvestigation({
    closure_evidence_refs: ["evidence://error-0154/remediation-needed"],
    investigation_state: "RESOLVED",
    last_activity_at: "2026-05-03T09:30:00Z",
    outcome: "REMEDIATION_SPAWNED",
    remediation_task_refs: ["remediation-task://task-0154"],
    resolution_basis_ref: "resolution-basis://error-0154/root-cause",
    resolved_at: "2026-05-03T09:30:00Z",
  });

  expect(resolved.remediation_task_refs).toEqual(["remediation-task://task-0154"]);
});

test("superseded investigations cannot self-reference", () => {
  expect(() =>
    baseInvestigation({
      closure_evidence_refs: ["evidence://error-0154/superseded"],
      investigation_state: "SUPERSEDED",
      outcome: "SUPERSEDED",
      resolution_basis_ref: "resolution-basis://error-0154/superseded",
      resolved_at: "2026-05-03T09:15:00Z",
      superseded_by_investigation_id: "investigation-0154",
    }),
  ).toThrow(/self-reference/i);
});

test("repository and services enforce explicit progress and terminal transitions", async () => {
  const repository = new FailureInvestigationRepository();
  const opened = await openFailureInvestigation({
    audit_refs: ["audit://error-0154/investigation/open"],
    error_id: "error-0154-flow",
    investigation_class: "AUTHORITY_STATE_AMBIGUITY",
    investigation_id: "investigation-0154-flow",
    investigation_steps_ref: "investigation-steps://error-0154-flow/authority-state",
    manifest_id: "manifest-0154",
    opened_at: "2026-05-03T09:00:00Z",
    owner_ref: "reviewer://failure-team-1",
    owner_type: "REVIEWER",
    provenance_refs: ["provenance://error-0154-flow/root"],
    repository,
    root_manifest_id: "manifest-root-0154",
  });

  const progressed = await updateFailureInvestigation({
    audit_refs: ["audit://error-0154/investigation/evidence"],
    investigation_id: opened.investigation_id,
    last_activity_at: "2026-05-03T09:15:00Z",
    provenance_refs: ["provenance://error-0154-flow/evidence"],
    repository,
    to_state: "EVIDENCE_GATHERING",
  });
  expect(progressed.investigation_state).toBe("EVIDENCE_GATHERING");

  const resolved = await resolveFailureInvestigation({
    audit_refs: ["audit://error-0154/investigation/accepted-risk"],
    accepted_risk_approval_ref: "accepted-risk-approval://risk-0154-flow",
    closure_evidence_refs: ["evidence://error-0154/accepted-risk"],
    investigation_id: opened.investigation_id,
    repository,
    resolution_basis_ref: "resolution-basis://error-0154/accepted-risk",
    resolved_at: "2026-05-03T09:45:00Z",
    to_state: "ACCEPTED_RISK",
  });
  expect(resolved.accepted_risk_approval_ref).toBe("accepted-risk-approval://risk-0154-flow");

  await expect(
    updateFailureInvestigation({
      audit_refs: ["audit://error-0154/investigation/reopen"],
      investigation_id: opened.investigation_id,
      last_activity_at: "2026-05-03T10:00:00Z",
      repository,
      to_state: "IN_REVIEW",
    }),
  ).rejects.toThrow(WorkflowModelError);
});
