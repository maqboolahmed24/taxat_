import {
  assertFailureInvestigationTransition,
  cloneFailureInvestigation,
  failureInvestigationContentFingerprint,
  failureInvestigationRef,
  isFailureInvestigationTerminalState,
  normalizeFailureInvestigation,
  type FailureInvestigation,
  type FailureInvestigationState,
} from "../models/failure_investigation.ts";
import { failureCompanionStableEqual } from "../models/failure_companion_common.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type StoredFailureInvestigation = {
  content_fingerprint: string;
  error_id: string;
  investigation_id: string;
  investigation_ref: string;
  investigation_state: FailureInvestigationState;
  manifest_id: string;
  owner_ref: string | null;
  record: FailureInvestigation;
  root_manifest_id: string;
  row_version: number;
  workflow_item_id: string | null;
};

export type FailureInvestigationQuery = {
  error_id?: string | undefined;
  investigation_state?: FailureInvestigationState | undefined;
  manifest_id?: string | undefined;
  owner_ref?: string | null | undefined;
  root_manifest_id?: string | undefined;
  workflow_item_id?: string | null | undefined;
};

function cloneStored(stored: StoredFailureInvestigation) {
  return JSON.parse(JSON.stringify(stored)) as StoredFailureInvestigation;
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredFailureInvestigation, right: StoredFailureInvestigation) {
  return (
    left.error_id.localeCompare(right.error_id) ||
    left.record.opened_at.localeCompare(right.record.opened_at) ||
    left.investigation_id.localeCompare(right.investigation_id)
  );
}

function assertImmutableIdentity(
  existing: FailureInvestigation,
  next: FailureInvestigation,
) {
  const fields = [
    "investigation_id",
    "error_id",
    "manifest_id",
    "root_manifest_id",
    "investigation_class",
    "opened_at",
  ] as const;
  for (const field of fields) {
    if (existing[field] !== next[field]) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `failure investigation ${field} is immutable`,
      );
    }
  }
}

function matchesQuery(stored: StoredFailureInvestigation, query: FailureInvestigationQuery) {
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
    query.investigation_state !== undefined &&
    stored.investigation_state !== query.investigation_state
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

export class FailureInvestigationRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByError = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByOwner = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly idsByWorkflowItem = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFailureInvestigation>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByError.clear();
    this.idsByManifest.clear();
    this.idsByOwner.clear();
    this.idsByRootManifest.clear();
    this.idsByState.clear();
    this.idsByWorkflowItem.clear();

    for (const stored of this.records.values()) {
      this.idByRef.set(stored.investigation_ref, stored.investigation_id);
      pushIndex(this.idsByError, stored.error_id, stored.investigation_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.investigation_id);
      pushIndex(this.idsByRootManifest, stored.root_manifest_id, stored.investigation_id);
      pushIndex(this.idsByState, stored.investigation_state, stored.investigation_id);
      if (stored.workflow_item_id !== null) {
        pushIndex(this.idsByWorkflowItem, stored.workflow_item_id, stored.investigation_id);
      }
      if (stored.owner_ref !== null) {
        pushIndex(this.idsByOwner, stored.owner_ref, stored.investigation_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredFailureInvestigation => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFailureInvestigation(input: { investigation: FailureInvestigation }) {
    const investigation = normalizeFailureInvestigation(input.investigation);
    const existing = this.records.get(investigation.investigation_id);
    const investigationRef = failureInvestigationRef(investigation);
    const refOwner = this.idByRef.get(investigationRef);
    if (refOwner !== undefined && refOwner !== investigation.investigation_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `failure investigation ref ${investigationRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && failureCompanionStableEqual(existing.record, investigation)) {
      return cloneStored(existing);
    }
    if (existing !== undefined) {
      assertImmutableIdentity(existing.record, investigation);
      if (isFailureInvestigationTerminalState(existing.investigation_state)) {
        throw new WorkflowModelError(
          "WORKFLOW_STATE_TRANSITION_INVALID",
          `terminal failure investigation ${investigation.investigation_id} cannot mutate`,
        );
      }
      assertFailureInvestigationTransition({
        from_state: existing.investigation_state,
        to_state: investigation.investigation_state,
      });
    }

    const stored: StoredFailureInvestigation = {
      content_fingerprint: failureInvestigationContentFingerprint(investigation),
      error_id: investigation.error_id,
      investigation_id: investigation.investigation_id,
      investigation_ref: investigationRef,
      investigation_state: investigation.investigation_state,
      manifest_id: investigation.manifest_id,
      owner_ref: investigation.owner_ref,
      record: cloneFailureInvestigation(investigation),
      root_manifest_id: investigation.root_manifest_id,
      row_version: (existing?.row_version ?? 0) + 1,
      workflow_item_id: investigation.workflow_item_id,
    };
    this.records.set(stored.investigation_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFailureInvestigationById(investigationId: string) {
    const stored = this.records.get(investigationId);
    return stored ? cloneStored(stored) : null;
  }

  async getFailureInvestigationByRef(investigationRef: string) {
    const id = this.idByRef.get(investigationRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listFailureInvestigationsByError(errorId: string) {
    return this.listByIds(this.idsByError.get(errorId) ?? []);
  }

  async listFailureInvestigationsByWorkflowItem(workflowItemId: string) {
    return this.listByIds(this.idsByWorkflowItem.get(workflowItemId) ?? []);
  }

  async listFailureInvestigationsByState(state: FailureInvestigationState) {
    return this.listByIds(this.idsByState.get(state) ?? []);
  }

  async queryFailureInvestigations(query: FailureInvestigationQuery) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
