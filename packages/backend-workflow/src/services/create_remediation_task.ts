import {
  buildRemediationTask,
  type RemediationTask,
  type RemediationTaskInput,
} from "../models/remediation_task.ts";
import type { RemediationTaskRepository } from "../repositories/remediation_task_repository.ts";
import { buildFailureResolutionContract } from "./build_failure_resolution_contract.ts";

export type CreateRemediationTaskInput = Omit<
  RemediationTaskInput,
  "failure_resolution_contract"
> & {
  repository: RemediationTaskRepository;
};

export async function createRemediationTask(
  input: CreateRemediationTaskInput,
): Promise<RemediationTask> {
  const task = buildRemediationTask({
    ...input,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "REMEDIATION_TASK",
    }),
  });
  const stored = await input.repository.persistRemediationTask({ task });
  return stored.record;
}
