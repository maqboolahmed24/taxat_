import {
  cloneWorkflowRecord,
  isWorkflowItemActiveState,
  isWorkflowItemTerminalState,
  normalizeWorkflowItem,
  workflowItemActiveDedupeKey,
  workflowItemContentFingerprint,
  workflowItemRef,
  workflowStableEqual,
  type WorkflowItem,
  type WorkflowItemLifecycleState,
  type WorkflowAuthorityTruthState,
  type WorkflowDueState,
  WorkflowModelError,
} from "../models/workflow_item.ts";

export type StoredWorkflowItem = {
  active_dedupe_key: string | null;
  client_id: string;
  content_fingerprint: string;
  current_assignee_ref: string | null;
  due_state: WorkflowDueState;
  item_id: string;
  item_ref: string;
  lifecycle_state: WorkflowItemLifecycleState;
  period: string;
  record: WorkflowItem;
  routing_queue_ref: string;
  row_version: number;
  tenant_id: string;
  truth_state: WorkflowAuthorityTruthState;
  type: string;
};

export type WorkflowItemQuery = {
  active_only?: boolean;
  authority_truth_state?: WorkflowAuthorityTruthState | undefined;
  client_id?: string | undefined;
  current_assignee_ref?: string | null | undefined;
  due_state?: WorkflowDueState | undefined;
  lifecycle_state?: WorkflowItemLifecycleState | undefined;
  period?: string | undefined;
  routing_queue_ref?: string | undefined;
  tenant_id?: string | undefined;
};

function cloneStored(stored: StoredWorkflowItem) {
  return cloneWorkflowRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredWorkflowItem, right: StoredWorkflowItem) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.period.localeCompare(right.period) ||
    left.routing_queue_ref.localeCompare(right.routing_queue_ref) ||
    left.record.queue_entered_at.localeCompare(right.record.queue_entered_at) ||
    left.item_id.localeCompare(right.item_id)
  );
}

function matchesQuery(stored: StoredWorkflowItem, query: WorkflowItemQuery) {
  if (query.tenant_id !== undefined && stored.tenant_id !== query.tenant_id) {
    return false;
  }
  if (query.client_id !== undefined && stored.client_id !== query.client_id) {
    return false;
  }
  if (query.period !== undefined && stored.period !== query.period) {
    return false;
  }
  if (query.lifecycle_state !== undefined && stored.lifecycle_state !== query.lifecycle_state) {
    return false;
  }
  if (query.authority_truth_state !== undefined && stored.truth_state !== query.authority_truth_state) {
    return false;
  }
  if (query.routing_queue_ref !== undefined && stored.routing_queue_ref !== query.routing_queue_ref) {
    return false;
  }
  if (query.current_assignee_ref !== undefined && stored.current_assignee_ref !== query.current_assignee_ref) {
    return false;
  }
  if (query.due_state !== undefined && stored.due_state !== query.due_state) {
    return false;
  }
  if (query.active_only === true && !isWorkflowItemActiveState(stored.lifecycle_state)) {
    return false;
  }
  return true;
}

export class WorkflowItemRepository {
  private readonly activeItemIdByDedupeKey = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByAssignee = new Map<string, string[]>();
  private readonly idsByAuthorityTruth = new Map<string, string[]>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByDueState = new Map<string, string[]>();
  private readonly idsByLifecycle = new Map<string, string[]>();
  private readonly idsByQueue = new Map<string, string[]>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkflowItem>();

  private rebuildIndexes() {
    this.activeItemIdByDedupeKey.clear();
    this.idByRef.clear();
    this.idsByAssignee.clear();
    this.idsByAuthorityTruth.clear();
    this.idsByClient.clear();
    this.idsByDueState.clear();
    this.idsByLifecycle.clear();
    this.idsByQueue.clear();
    this.idsByTenant.clear();

    for (const stored of this.records.values()) {
      this.idByRef.set(stored.item_ref, stored.item_id);
      pushIndex(this.idsByTenant, stored.tenant_id, stored.item_id);
      pushIndex(this.idsByClient, `${stored.tenant_id}:${stored.client_id}`, stored.item_id);
      pushIndex(this.idsByLifecycle, stored.lifecycle_state, stored.item_id);
      pushIndex(this.idsByAuthorityTruth, stored.truth_state, stored.item_id);
      pushIndex(this.idsByQueue, stored.routing_queue_ref, stored.item_id);
      pushIndex(this.idsByDueState, String(stored.due_state), stored.item_id);
      if (stored.current_assignee_ref !== null) {
        pushIndex(this.idsByAssignee, stored.current_assignee_ref, stored.item_id);
      }
      if (stored.active_dedupe_key !== null) {
        const owner = this.activeItemIdByDedupeKey.get(stored.active_dedupe_key);
        if (owner !== undefined && owner !== stored.item_id) {
          throw new WorkflowModelError(
            "WORKFLOW_CONTRACT_INVALID",
            `duplicate active workflow dedupe key ${stored.active_dedupe_key}`,
          );
        }
        this.activeItemIdByDedupeKey.set(stored.active_dedupe_key, stored.item_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkflowItem => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistWorkflowItem(input: {
    expected_customer_workspace_version?: number | undefined;
    expected_staff_workspace_version?: number | undefined;
    item: WorkflowItem;
  }) {
    const item = normalizeWorkflowItem(input.item);
    const existing = this.records.get(item.item_id);
    if (
      input.expected_staff_workspace_version !== undefined &&
      existing?.record.staff_workspace_version !== input.expected_staff_workspace_version
    ) {
      throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "if_match staff workspace version is stale");
    }
    if (
      input.expected_customer_workspace_version !== undefined &&
      existing?.record.customer_workspace_version !== input.expected_customer_workspace_version
    ) {
      throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "if_match customer workspace version is stale");
    }
    const ref = workflowItemRef(item);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== item.item_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `workflow item ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && isWorkflowItemTerminalState(existing.lifecycle_state) && !workflowStableEqual(existing.record, item)) {
      throw new WorkflowModelError(
        "WORKFLOW_ITEM_IMMUTABLE",
        `terminal workflow item ${item.item_id} cannot mutate in place`,
      );
    }
    if (existing !== undefined) {
      if (item.staff_workspace_version < existing.record.staff_workspace_version) {
        throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "staff_workspace_version must not regress");
      }
      if (item.customer_workspace_version < existing.record.customer_workspace_version) {
        throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "customer_workspace_version must not regress");
      }
    }
    const activeDedupeKey = isWorkflowItemActiveState(item.lifecycle_state)
      ? workflowItemActiveDedupeKey(item)
      : null;
    if (activeDedupeKey !== null) {
      const owner = this.activeItemIdByDedupeKey.get(activeDedupeKey);
      if (owner !== undefined && owner !== item.item_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `active workflow dedupe key ${activeDedupeKey} already belongs to ${owner}`,
        );
      }
    }
    if (existing !== undefined && workflowStableEqual(existing.record, item)) {
      return cloneStored(existing);
    }

    const stored: StoredWorkflowItem = {
      active_dedupe_key: activeDedupeKey,
      client_id: item.client_id,
      content_fingerprint: workflowItemContentFingerprint(item),
      current_assignee_ref: item.current_assignee_ref,
      due_state: item.due_state,
      item_id: item.item_id,
      item_ref: ref,
      lifecycle_state: item.lifecycle_state,
      period: item.period,
      record: cloneWorkflowRecord(item),
      routing_queue_ref: item.routing_queue_ref,
      row_version: (existing?.row_version ?? 0) + 1,
      tenant_id: item.tenant_id,
      truth_state: item.authority_truth_state,
      type: item.type,
    };
    this.records.set(stored.item_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getWorkflowItemById(itemId: string) {
    const stored = this.records.get(itemId);
    return stored ? cloneStored(stored) : null;
  }

  async getWorkflowItemByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async findActiveWorkflowItemByDedupeKey(input: {
    client_id: string;
    dedupe_key: string;
    period: string;
    tenant_id: string;
    type: string;
  }) {
    const id = this.activeItemIdByDedupeKey.get(workflowItemActiveDedupeKey(input));
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listWorkflowItemsByTenant(tenantId: string) {
    return this.listByIds(this.idsByTenant.get(tenantId) ?? []);
  }

  async listWorkflowItemsByClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listWorkflowItemsByQueue(routingQueueRef: string) {
    return this.listByIds(this.idsByQueue.get(routingQueueRef) ?? []);
  }

  async queryWorkflowItems(query: WorkflowItemQuery = {}) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
