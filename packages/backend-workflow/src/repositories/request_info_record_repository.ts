import {
  normalizeRequestInfoRecord,
  requestInfoRecordContentFingerprint,
  type RequestInfoLifecycleState,
  type RequestInfoRecord,
} from "../models/request_info_record.ts";
import { cloneWorkflowRecord, workflowStableEqual, WorkflowModelError } from "../models/workflow_item.ts";

export type StoredRequestInfoRecord = {
  content_fingerprint: string;
  item_id: string;
  lifecycle_state: RequestInfoLifecycleState;
  record: RequestInfoRecord;
  request_info_id: string;
  request_info_ordinal: number;
  request_state_version: number;
};

function cloneStored(stored: StoredRequestInfoRecord) {
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

function sortStored(left: StoredRequestInfoRecord, right: StoredRequestInfoRecord) {
  return (
    left.item_id.localeCompare(right.item_id) ||
    left.request_info_ordinal - right.request_info_ordinal ||
    left.request_info_id.localeCompare(right.request_info_id)
  );
}

function allowedRequestTransition(existing: RequestInfoRecord, next: RequestInfoRecord) {
  if (workflowStableEqual(existing, next)) {
    return true;
  }
  if (existing.item_id !== next.item_id || existing.request_info_ordinal !== next.request_info_ordinal) {
    return false;
  }
  if (next.request_state_version < existing.request_state_version) {
    return false;
  }
  if (existing.lifecycle_state === "OPEN") {
    return (
      next.lifecycle_state === "RESPONDED" ||
      (next.lifecycle_state === "CLOSED" &&
        (next.closure_reason_code === "CANCELLED" || next.closure_reason_code === "SUPERSEDED"))
    );
  }
  if (existing.lifecycle_state === "RESPONDED") {
    return (
      next.lifecycle_state === "CLOSED" &&
      next.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" &&
      existing.response_entry_ref === next.response_entry_ref &&
      existing.response_body_ref === next.response_body_ref &&
      existing.responded_by_ref === next.responded_by_ref &&
      existing.responded_at === next.responded_at
    );
  }
  return false;
}

export class RequestInfoRecordRepository {
  private readonly idByItemOrdinal = new Map<string, string>();
  private readonly idsByItem = new Map<string, string[]>();
  private readonly idsByLifecycle = new Map<string, string[]>();
  private readonly records = new Map<string, StoredRequestInfoRecord>();

  private rebuildIndexes() {
    this.idByItemOrdinal.clear();
    this.idsByItem.clear();
    this.idsByLifecycle.clear();

    for (const stored of this.records.values()) {
      const ordinalKey = `${stored.item_id}:${stored.request_info_ordinal}`;
      const ordinalOwner = this.idByItemOrdinal.get(ordinalKey);
      if (ordinalOwner !== undefined && ordinalOwner !== stored.request_info_id) {
        throw new WorkflowModelError(
          "WORKFLOW_CONTRACT_INVALID",
          `request-info ordinal ${ordinalKey} already belongs to ${ordinalOwner}`,
        );
      }
      this.idByItemOrdinal.set(ordinalKey, stored.request_info_id);
      pushIndex(this.idsByItem, stored.item_id, stored.request_info_id);
      pushIndex(this.idsByLifecycle, stored.lifecycle_state, stored.request_info_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredRequestInfoRecord => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistRequestInfoRecord(input: {
    expected_request_state_version?: number | undefined;
    record: RequestInfoRecord;
  }) {
    const record = normalizeRequestInfoRecord(input.record);
    const existing = this.records.get(record.request_info_id);
    if (
      input.expected_request_state_version !== undefined &&
      existing?.request_state_version !== input.expected_request_state_version
    ) {
      throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "request_info state version is stale");
    }

    const ordinalKey = `${record.item_id}:${record.request_info_ordinal}`;
    const ordinalOwner = this.idByItemOrdinal.get(ordinalKey);
    if (ordinalOwner !== undefined && ordinalOwner !== record.request_info_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `request-info ordinal ${ordinalKey} already belongs to ${ordinalOwner}`,
      );
    }
    if (existing !== undefined && !allowedRequestTransition(existing.record, record)) {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "illegal request-info lifecycle transition",
      );
    }
    if (existing !== undefined && workflowStableEqual(existing.record, record)) {
      return cloneStored(existing);
    }

    const stored: StoredRequestInfoRecord = {
      content_fingerprint: requestInfoRecordContentFingerprint(record),
      item_id: record.item_id,
      lifecycle_state: record.lifecycle_state,
      record: cloneWorkflowRecord(record),
      request_info_id: record.request_info_id,
      request_info_ordinal: record.request_info_ordinal,
      request_state_version: record.request_state_version,
    };
    this.records.set(stored.request_info_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getRequestInfoRecordById(requestInfoId: string) {
    const stored = this.records.get(requestInfoId);
    return stored ? cloneStored(stored) : null;
  }

  async findRequestInfoRecordByItemOrdinal(input: { item_id: string; request_info_ordinal: number }) {
    const id = this.idByItemOrdinal.get(`${input.item_id}:${input.request_info_ordinal}`);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listRequestInfoRecordsByItem(itemId: string) {
    return this.listByIds(this.idsByItem.get(itemId) ?? []);
  }

  async listOpenRequestInfoRecordsByItem(itemId: string) {
    return (await this.listRequestInfoRecordsByItem(itemId)).filter(
      (stored) => stored.lifecycle_state === "OPEN",
    );
  }

  async listRequestInfoRecordsByLifecycle(lifecycleState: RequestInfoLifecycleState) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }
}
