import {
  buildWorkflowItem,
  normalizeWorkflowItem,
  type WorkflowItem,
  type WorkflowItemInput,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import { WorkflowItemRepository } from "../repositories/workflow_item_repository.ts";

export type OpenOrReuseWorkflowItemResult = {
  item: WorkflowItem;
  reused: boolean;
  row_version: number;
};

export async function openOrReuseWorkflowItem(input: WorkflowItemInput & {
  repository: WorkflowItemRepository;
}) {
  const candidate = buildWorkflowItem({
    ...input,
    lifecycle_state: input.lifecycle_state ?? "OPEN",
  });
  if (candidate.lifecycle_state !== "OPEN") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "openOrReuseWorkflowItem only creates OPEN workflow items",
    );
  }
  const existing = await input.repository.findActiveWorkflowItemByDedupeKey({
    client_id: candidate.client_id,
    dedupe_key: candidate.dedupe_key,
    period: candidate.period,
    tenant_id: candidate.tenant_id,
    type: candidate.type,
  });
  if (existing !== null) {
    return {
      item: normalizeWorkflowItem(existing.record),
      reused: true,
      row_version: existing.row_version,
    } satisfies OpenOrReuseWorkflowItemResult;
  }
  const stored = await input.repository.persistWorkflowItem({ item: candidate });
  return {
    item: normalizeWorkflowItem(stored.record),
    reused: false,
    row_version: stored.row_version,
  } satisfies OpenOrReuseWorkflowItemResult;
}
