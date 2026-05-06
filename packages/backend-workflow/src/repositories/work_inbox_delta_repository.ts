import {
  validateWorkInboxDelta,
  workInboxDeltaContentFingerprint,
  workInboxDeltaRef,
  type WorkInboxDelta,
} from "../projectors/build_work_inbox_delta.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredWorkInboxDelta = {
  causal_semantic_action_id: string | null;
  content_fingerprint: string;
  delta_ref: string;
  inbox_route_key: string;
  inbox_sequence: number;
  inbox_version: number;
  record: WorkInboxDelta;
  tenant_id: string;
};

function cloneStored(stored: StoredWorkInboxDelta) {
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

function sortStored(left: StoredWorkInboxDelta, right: StoredWorkInboxDelta) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.inbox_route_key.localeCompare(right.inbox_route_key) ||
    left.inbox_sequence - right.inbox_sequence ||
    left.delta_ref.localeCompare(right.delta_ref)
  );
}

export class WorkInboxDeltaRepository {
  private readonly deltaRefByCausalAction = new Map<string, string>();
  private readonly idsByRoute = new Map<string, string[]>();
  private readonly idsByTenant = new Map<string, string[]>();
  private readonly records = new Map<string, StoredWorkInboxDelta>();

  private rebuildIndexes() {
    this.deltaRefByCausalAction.clear();
    this.idsByRoute.clear();
    this.idsByTenant.clear();
    for (const stored of this.records.values()) {
      pushIndex(this.idsByTenant, stored.tenant_id, stored.delta_ref);
      pushIndex(this.idsByRoute, `${stored.tenant_id}:${stored.inbox_route_key}`, stored.delta_ref);
      if (stored.causal_semantic_action_id !== null) {
        const owner = this.deltaRefByCausalAction.get(stored.causal_semantic_action_id);
        if (owner !== undefined && owner !== stored.delta_ref) {
          throw new WorkflowModelError(
            "WORKFLOW_CONTRACT_INVALID",
            `causal semantic action ${stored.causal_semantic_action_id} already owns a work inbox delta`,
          );
        }
        this.deltaRefByCausalAction.set(stored.causal_semantic_action_id, stored.delta_ref);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredWorkInboxDelta => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistWorkInboxDelta(input: { delta: WorkInboxDelta }) {
    validateWorkInboxDelta(input.delta);
    const deltaRef = workInboxDeltaRef(input.delta);
    const existing = this.records.get(deltaRef);
    if (existing !== undefined) {
      if (!workflowStableEqual(existing.record, input.delta)) {
        throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "work inbox deltas are immutable by ref");
      }
      return cloneStored(existing);
    }
    if (input.delta.causal_semantic_action_id !== null) {
      const owner = this.deltaRefByCausalAction.get(input.delta.causal_semantic_action_id);
      if (owner !== undefined) {
        const stored = this.records.get(owner);
        if (stored !== undefined) {
          return cloneStored(stored);
        }
      }
    }
    const stored: StoredWorkInboxDelta = {
      causal_semantic_action_id: input.delta.causal_semantic_action_id,
      content_fingerprint: workInboxDeltaContentFingerprint(input.delta),
      delta_ref: deltaRef,
      inbox_route_key: input.delta.inbox_route_key,
      inbox_sequence: input.delta.inbox_sequence,
      inbox_version: input.delta.inbox_version,
      record: cloneWorkflowRecord(input.delta),
      tenant_id: input.delta.tenant_id,
    };
    this.records.set(stored.delta_ref, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getWorkInboxDeltaByRef(deltaRef: string) {
    const stored = this.records.get(deltaRef);
    return stored ? cloneStored(stored) : null;
  }

  async findWorkInboxDeltaByCausalSemanticActionId(causalSemanticActionId: string) {
    const deltaRef = this.deltaRefByCausalAction.get(causalSemanticActionId);
    const stored = deltaRef === undefined ? undefined : this.records.get(deltaRef);
    return stored ? cloneStored(stored) : null;
  }

  async listWorkInboxDeltasByRoute(input: { inbox_route_key: string; tenant_id: string }) {
    return this.listByIds(this.idsByRoute.get(`${input.tenant_id}:${input.inbox_route_key}`) ?? []);
  }

  async listWorkInboxDeltasAfterSequence(input: {
    inbox_route_key: string;
    tenant_id: string;
    after_sequence: number;
  }) {
    return (await this.listWorkInboxDeltasByRoute(input)).filter(
      (stored) => stored.inbox_sequence > input.after_sequence,
    );
  }
}
