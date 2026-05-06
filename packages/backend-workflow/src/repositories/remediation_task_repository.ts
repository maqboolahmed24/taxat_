import {
  assertRemediationTaskTransition,
  cloneRemediationTask,
  isRemediationTaskTerminalState,
  normalizeRemediationTask,
  remediationTaskContentFingerprint,
  remediationTaskRef,
  type RemediationTask,
  type RemediationTaskState,
} from "../models/remediation_task.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import { failureCompanionStableEqual } from "../models/failure_companion_common.ts";

export type StoredRemediationTask = {
  content_fingerprint: string;
  error_id: string;
  manifest_id: string;
  owner_ref: string | null;
  record: RemediationTask;
  root_manifest_id: string;
  row_version: number;
  task_id: string;
  task_ref: string;
  task_state: RemediationTaskState;
  workflow_item_id: string | null;
};

export type RemediationTaskQuery = {
  error_id?: string | undefined;
  manifest_id?: string | undefined;
  owner_ref?: string | null | undefined;
  root_manifest_id?: string | undefined;
  task_state?: RemediationTaskState | undefined;
  workflow_item_id?: string | null | undefined;
};

function cloneStored(stored: StoredRemediationTask) {
  return JSON.parse(JSON.stringify(stored)) as StoredRemediationTask;
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredRemediationTask, right: StoredRemediationTask) {
  return (
    left.error_id.localeCompare(right.error_id) ||
    left.record.created_at.localeCompare(right.record.created_at) ||
    left.task_id.localeCompare(right.task_id)
  );
}

function assertImmutableIdentity(existing: RemediationTask, next: RemediationTask) {
  const fields = [
    "task_id",
    "error_id",
    "manifest_id",
    "root_manifest_id",
    "task_type",
    "created_at",
    "remediation_steps_ref",
  ] as const;
  for (const field of fields) {
    if (existing[field] !== next[field]) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `remediation task ${field} is immutable`,
      );
    }
  }
}

function matchesQuery(stored: StoredRemediationTask, query: RemediationTaskQuery) {
  if (query.error_id !== undefined && stored.error_id !== query.error_id) {
    return false;
  }
  if (query.manifest_id !== undefined && stored.manifest_id !== query.manifest_id) {
    return false;
  }
  if (query.root_manifest_id !== undefined && stored.root_manifest_id !== query.root_manifest_id) {
    return false;
  }
  if (query.task_state !== undefined && stored.task_state !== query.task_state) {
    return false;
  }
  if (query.workflow_item_id !== undefined && stored.workflow_item_id !== query.workflow_item_id) {
    return false;
  }
  if (query.owner_ref !== undefined && stored.owner_ref !== query.owner_ref) {
    return false;
  }
  return true;
}

export class RemediationTaskRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByError = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByOwner = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly idsByWorkflowItem = new Map<string, string[]>();
  private readonly records = new Map<string, StoredRemediationTask>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByError.clear();
    this.idsByManifest.clear();
    this.idsByOwner.clear();
    this.idsByRootManifest.clear();
    this.idsByState.clear();
    this.idsByWorkflowItem.clear();

    for (const stored of this.records.values()) {
      this.idByRef.set(stored.task_ref, stored.task_id);
      pushIndex(this.idsByError, stored.error_id, stored.task_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.task_id);
      pushIndex(this.idsByRootManifest, stored.root_manifest_id, stored.task_id);
      pushIndex(this.idsByState, stored.task_state, stored.task_id);
      if (stored.workflow_item_id !== null) {
        pushIndex(this.idsByWorkflowItem, stored.workflow_item_id, stored.task_id);
      }
      if (stored.owner_ref !== null) {
        pushIndex(this.idsByOwner, stored.owner_ref, stored.task_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredRemediationTask => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistRemediationTask(input: { task: RemediationTask }) {
    const task = normalizeRemediationTask(input.task);
    const existing = this.records.get(task.task_id);
    const taskRef = remediationTaskRef(task);
    const refOwner = this.idByRef.get(taskRef);
    if (refOwner !== undefined && refOwner !== task.task_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `remediation task ref ${taskRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && failureCompanionStableEqual(existing.record, task)) {
      return cloneStored(existing);
    }
    if (existing !== undefined) {
      assertImmutableIdentity(existing.record, task);
      if (isRemediationTaskTerminalState(existing.task_state)) {
        throw new WorkflowModelError(
          "WORKFLOW_STATE_TRANSITION_INVALID",
          `terminal remediation task ${task.task_id} cannot mutate`,
        );
      }
      assertRemediationTaskTransition({
        from_state: existing.task_state,
        to_state: task.task_state,
      });
    }

    const stored: StoredRemediationTask = {
      content_fingerprint: remediationTaskContentFingerprint(task),
      error_id: task.error_id,
      manifest_id: task.manifest_id,
      owner_ref: task.owner_ref,
      record: cloneRemediationTask(task),
      root_manifest_id: task.root_manifest_id,
      row_version: (existing?.row_version ?? 0) + 1,
      task_id: task.task_id,
      task_ref: taskRef,
      task_state: task.task_state,
      workflow_item_id: task.workflow_item_id,
    };
    this.records.set(stored.task_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getRemediationTaskById(taskId: string) {
    const stored = this.records.get(taskId);
    return stored ? cloneStored(stored) : null;
  }

  async getRemediationTaskByRef(taskRef: string) {
    const id = this.idByRef.get(taskRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listRemediationTasksByError(errorId: string) {
    return this.listByIds(this.idsByError.get(errorId) ?? []);
  }

  async listRemediationTasksByWorkflowItem(workflowItemId: string) {
    return this.listByIds(this.idsByWorkflowItem.get(workflowItemId) ?? []);
  }

  async listRemediationTasksByState(taskState: RemediationTaskState) {
    return this.listByIds(this.idsByState.get(taskState) ?? []);
  }

  async queryRemediationTasks(query: RemediationTaskQuery) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
