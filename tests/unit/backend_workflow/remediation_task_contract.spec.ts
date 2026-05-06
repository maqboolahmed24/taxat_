import { expect, test } from "@playwright/test";

import {
  advanceRemediationTask,
  buildFailureResolutionContract,
  buildRemediationTask,
  createRemediationTask,
  RemediationTaskRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseTask(overrides: Partial<Parameters<typeof buildRemediationTask>[0]> = {}) {
  return buildRemediationTask({
    audit_refs: ["audit://error-0153/remediation/open"],
    created_at: "2026-05-03T09:00:00Z",
    error_id: "error-0153",
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "REMEDIATION_TASK",
    }),
    manifest_id: "manifest-0153",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153/root"],
    remediation_steps_ref: "remediation-steps://error-0153/fix",
    root_manifest_id: "manifest-root-0153",
    task_id: "remediation-task-0153",
    task_type: "FIX_DATA",
    ...overrides,
  });
}

test("builds an open remediation task with role-specific failure resolution contract", () => {
  const task = baseTask();

  expect(task.failure_resolution_contract.lifecycle_role).toBe("REMEDIATION_TASK");
  expect(task.failure_resolution_contract.role_specific_binding_policy).toBe(
    "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR",
  );
  expect(task.task_state).toBe("OPEN");
  expect(task.error_resolution_effect).toBe("ERROR_REMAINS_OPEN");
});

test("completed remediation requires basis, evidence, and lawful error effect", () => {
  expect(() =>
    baseTask({
      closure_outcome: "FIX_APPLIED",
      completed_at: "2026-05-03T10:00:00Z",
      error_resolution_effect: "ERROR_MOVES_TO_RESOLVED",
      started_at: "2026-05-03T09:05:00Z",
      task_state: "COMPLETED",
    }),
  ).toThrow(WorkflowModelError);

  const completed = baseTask({
    closure_evidence_refs: ["evidence://error-0153/fix-applied"],
    closure_outcome: "FIX_APPLIED",
    completed_at: "2026-05-03T10:00:00Z",
    error_resolution_effect: "ERROR_MOVES_TO_RESOLVED",
    resolution_basis_ref: "resolution-basis://error-0153/fix",
    started_at: "2026-05-03T09:05:00Z",
    task_state: "COMPLETED",
  });

  expect(completed.closure_evidence_refs).toEqual(["evidence://error-0153/fix-applied"]);
});

test("retention hold remediation forces retention linkage and workflow follow-up", () => {
  expect(() =>
    baseTask({
      blocking_class: "BLOCKS_REVIEW_PROGRESS",
      task_type: "CHECK_RETENTION_HOLD",
    }),
  ).toThrow(/CHECK_RETENTION_HOLD/i);

  const hold = baseTask({
    artifact_retention_ref: "artifact-retention://error-0153",
    blocking_class: "BLOCKS_ERASURE",
    retention_class: "regulated_record",
    task_type: "CHECK_RETENTION_HOLD",
    workflow_item_id: "workflow-item-0153",
  });

  expect(hold.blocking_class).toBe("BLOCKS_ERASURE");
});

test("repository and service enforce the remediation transition matrix", async () => {
  const repository = new RemediationTaskRepository();
  const task = await createRemediationTask({
    audit_refs: ["audit://error-0153/remediation/open"],
    created_at: "2026-05-03T09:00:00Z",
    error_id: "error-0153-flow",
    manifest_id: "manifest-0153",
    owner_ref: "operator://ops-1",
    owner_type: "SERVICE_OPERATOR",
    provenance_refs: ["provenance://error-0153/root"],
    remediation_steps_ref: "remediation-steps://error-0153/fix",
    repository,
    root_manifest_id: "manifest-root-0153",
    task_id: "remediation-task-0153-flow",
    task_type: "FIX_DATA",
  });

  await expect(
    repository.persistRemediationTask({
      task: {
        ...task,
        closure_evidence_refs: ["evidence://error-0153/closed"],
        closure_outcome: "FIX_APPLIED",
        completed_at: "2026-05-03T09:30:00Z",
        error_resolution_effect: "ERROR_MOVES_TO_RESOLVED",
        resolution_basis_ref: "resolution-basis://error-0153/fix",
        started_at: "2026-05-03T09:05:00Z",
        task_state: "COMPLETED",
      },
    }),
  ).rejects.toThrow(WorkflowModelError);

  const inProgress = await advanceRemediationTask({
    audit_refs: ["audit://error-0153/remediation/start"],
    repository,
    task_id: task.task_id,
    to_state: "IN_PROGRESS",
    transitioned_at: "2026-05-03T09:05:00Z",
  });
  expect(inProgress.started_at).toBe("2026-05-03T09:05:00Z");
});
