import {
  assertCompensationStatusTransition,
  cloneCompensationRecord,
  compensationRecordContentFingerprint,
  compensationRecordRef,
  isCompensationRecordTerminalStatus,
  normalizeCompensationRecord,
  type CompensationRecord,
  type CompensationStatus,
} from "../models/compensation_record.ts";
import { failureCompanionStableEqual } from "../models/failure_companion_common.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type StoredCompensationRecord = {
  compensation_id: string;
  compensation_ref: string;
  compensation_status: CompensationStatus;
  content_fingerprint: string;
  error_id: string;
  manifest_id: string;
  owner_ref: string | null;
  record: CompensationRecord;
  root_manifest_id: string;
  row_version: number;
  workflow_item_id: string | null;
};

export type CompensationRecordQuery = {
  compensation_status?: CompensationStatus | undefined;
  error_id?: string | undefined;
  manifest_id?: string | undefined;
  owner_ref?: string | null | undefined;
  root_manifest_id?: string | undefined;
  workflow_item_id?: string | null | undefined;
};

function cloneStored(stored: StoredCompensationRecord) {
  return JSON.parse(JSON.stringify(stored)) as StoredCompensationRecord;
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredCompensationRecord, right: StoredCompensationRecord) {
  return (
    left.error_id.localeCompare(right.error_id) ||
    left.record.created_at.localeCompare(right.record.created_at) ||
    left.compensation_id.localeCompare(right.compensation_id)
  );
}

function assertImmutableIdentity(existing: CompensationRecord, next: CompensationRecord) {
  const fields = [
    "compensation_id",
    "error_id",
    "manifest_id",
    "root_manifest_id",
    "compensation_mode",
    "compensation_steps_ref",
    "created_at",
  ] as const;
  for (const field of fields) {
    if (existing[field] !== next[field]) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `compensation record ${field} is immutable`,
      );
    }
  }
  if (!failureCompanionStableEqual(existing.target_object_refs, next.target_object_refs)) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "compensation target_object_refs are immutable",
    );
  }
}

function matchesQuery(stored: StoredCompensationRecord, query: CompensationRecordQuery) {
  if (query.error_id !== undefined && stored.error_id !== query.error_id) {
    return false;
  }
  if (query.manifest_id !== undefined && stored.manifest_id !== query.manifest_id) {
    return false;
  }
  if (query.root_manifest_id !== undefined && stored.root_manifest_id !== query.root_manifest_id) {
    return false;
  }
  if (
    query.compensation_status !== undefined &&
    stored.compensation_status !== query.compensation_status
  ) {
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

export class CompensationRecordRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByError = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByOwner = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly idsByStatus = new Map<string, string[]>();
  private readonly idsByWorkflowItem = new Map<string, string[]>();
  private readonly records = new Map<string, StoredCompensationRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByError.clear();
    this.idsByManifest.clear();
    this.idsByOwner.clear();
    this.idsByRootManifest.clear();
    this.idsByStatus.clear();
    this.idsByWorkflowItem.clear();

    for (const stored of this.records.values()) {
      this.idByRef.set(stored.compensation_ref, stored.compensation_id);
      pushIndex(this.idsByError, stored.error_id, stored.compensation_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.compensation_id);
      pushIndex(this.idsByRootManifest, stored.root_manifest_id, stored.compensation_id);
      pushIndex(this.idsByStatus, stored.compensation_status, stored.compensation_id);
      if (stored.workflow_item_id !== null) {
        pushIndex(this.idsByWorkflowItem, stored.workflow_item_id, stored.compensation_id);
      }
      if (stored.owner_ref !== null) {
        pushIndex(this.idsByOwner, stored.owner_ref, stored.compensation_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredCompensationRecord => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistCompensationRecord(input: { record: CompensationRecord }) {
    const record = normalizeCompensationRecord(input.record);
    const existing = this.records.get(record.compensation_id);
    const recordRef = compensationRecordRef(record);
    const refOwner = this.idByRef.get(recordRef);
    if (refOwner !== undefined && refOwner !== record.compensation_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `compensation record ref ${recordRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && failureCompanionStableEqual(existing.record, record)) {
      return cloneStored(existing);
    }
    if (existing !== undefined) {
      assertImmutableIdentity(existing.record, record);
      if (isCompensationRecordTerminalStatus(existing.compensation_status)) {
        throw new WorkflowModelError(
          "WORKFLOW_STATE_TRANSITION_INVALID",
          `terminal compensation record ${record.compensation_id} cannot mutate`,
        );
      }
      assertCompensationStatusTransition({
        from_status: existing.compensation_status,
        to_status: record.compensation_status,
      });
    }

    const stored: StoredCompensationRecord = {
      compensation_id: record.compensation_id,
      compensation_ref: recordRef,
      compensation_status: record.compensation_status,
      content_fingerprint: compensationRecordContentFingerprint(record),
      error_id: record.error_id,
      manifest_id: record.manifest_id,
      owner_ref: record.owner_ref,
      record: cloneCompensationRecord(record),
      root_manifest_id: record.root_manifest_id,
      row_version: (existing?.row_version ?? 0) + 1,
      workflow_item_id: record.workflow_item_id,
    };
    this.records.set(stored.compensation_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getCompensationRecordById(compensationId: string) {
    const stored = this.records.get(compensationId);
    return stored ? cloneStored(stored) : null;
  }

  async getCompensationRecordByRef(compensationRef: string) {
    const id = this.idByRef.get(compensationRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listCompensationRecordsByError(errorId: string) {
    return this.listByIds(this.idsByError.get(errorId) ?? []);
  }

  async listCompensationRecordsByWorkflowItem(workflowItemId: string) {
    return this.listByIds(this.idsByWorkflowItem.get(workflowItemId) ?? []);
  }

  async listCompensationRecordsByStatus(status: CompensationStatus) {
    return this.listByIds(this.idsByStatus.get(status) ?? []);
  }

  async queryCompensationRecords(query: CompensationRecordQuery) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
