import {
  acceptedRiskApprovalContentFingerprint,
  acceptedRiskApprovalRef,
  assertAcceptedRiskApprovalTransition,
  cloneAcceptedRiskApproval,
  isAcceptedRiskApprovalTerminalState,
  normalizeAcceptedRiskApproval,
  type AcceptedRiskApproval,
  type AcceptedRiskApprovalState,
} from "../models/accepted_risk_approval.ts";
import { failureCompanionStableEqual } from "../models/failure_companion_common.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type StoredAcceptedRiskApproval = {
  accepted_risk_approval_id: string;
  accepted_risk_approval_ref: string;
  approval_state: AcceptedRiskApprovalState;
  content_fingerprint: string;
  error_id: string;
  manifest_id: string;
  record: AcceptedRiskApproval;
  root_manifest_id: string;
  row_version: number;
  workflow_item_id: string | null;
};

export type AcceptedRiskApprovalQuery = {
  approval_state?: AcceptedRiskApprovalState | undefined;
  error_id?: string | undefined;
  manifest_id?: string | undefined;
  root_manifest_id?: string | undefined;
  workflow_item_id?: string | null | undefined;
};

function cloneStored(stored: StoredAcceptedRiskApproval) {
  return JSON.parse(JSON.stringify(stored)) as StoredAcceptedRiskApproval;
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredAcceptedRiskApproval, right: StoredAcceptedRiskApproval) {
  return (
    left.error_id.localeCompare(right.error_id) ||
    left.record.approved_at.localeCompare(right.record.approved_at) ||
    left.accepted_risk_approval_id.localeCompare(right.accepted_risk_approval_id)
  );
}

function assertImmutableIdentity(existing: AcceptedRiskApproval, next: AcceptedRiskApproval) {
  const fields = [
    "accepted_risk_approval_id",
    "error_id",
    "manifest_id",
    "root_manifest_id",
    "decision_basis",
    "approver_type",
    "approver_ref",
    "policy_basis_ref",
    "rationale_ref",
    "approved_at",
    "expires_at",
  ] as const;
  for (const field of fields) {
    if (existing[field] !== next[field]) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `accepted-risk approval ${field} is immutable`,
      );
    }
  }
  if (!failureCompanionStableEqual(existing.bounded_scope_refs, next.bounded_scope_refs)) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "accepted-risk approval bounded_scope_refs are immutable",
    );
  }
}

function matchesQuery(stored: StoredAcceptedRiskApproval, query: AcceptedRiskApprovalQuery) {
  if (query.error_id !== undefined && stored.error_id !== query.error_id) {
    return false;
  }
  if (query.manifest_id !== undefined && stored.manifest_id !== query.manifest_id) {
    return false;
  }
  if (query.root_manifest_id !== undefined && stored.root_manifest_id !== query.root_manifest_id) {
    return false;
  }
  if (query.approval_state !== undefined && stored.approval_state !== query.approval_state) {
    return false;
  }
  if (query.workflow_item_id !== undefined && stored.workflow_item_id !== query.workflow_item_id) {
    return false;
  }
  return true;
}

export class AcceptedRiskApprovalRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByError = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly idsByState = new Map<string, string[]>();
  private readonly idsByWorkflowItem = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAcceptedRiskApproval>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByError.clear();
    this.idsByManifest.clear();
    this.idsByRootManifest.clear();
    this.idsByState.clear();
    this.idsByWorkflowItem.clear();

    for (const stored of this.records.values()) {
      this.idByRef.set(stored.accepted_risk_approval_ref, stored.accepted_risk_approval_id);
      pushIndex(this.idsByError, stored.error_id, stored.accepted_risk_approval_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.accepted_risk_approval_id);
      pushIndex(this.idsByRootManifest, stored.root_manifest_id, stored.accepted_risk_approval_id);
      pushIndex(this.idsByState, stored.approval_state, stored.accepted_risk_approval_id);
      if (stored.workflow_item_id !== null) {
        pushIndex(this.idsByWorkflowItem, stored.workflow_item_id, stored.accepted_risk_approval_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredAcceptedRiskApproval => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAcceptedRiskApproval(input: { approval: AcceptedRiskApproval }) {
    const approval = normalizeAcceptedRiskApproval(input.approval);
    const existing = this.records.get(approval.accepted_risk_approval_id);
    const approvalRef = acceptedRiskApprovalRef(approval);
    const refOwner = this.idByRef.get(approvalRef);
    if (refOwner !== undefined && refOwner !== approval.accepted_risk_approval_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        `accepted-risk approval ref ${approvalRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined && failureCompanionStableEqual(existing.record, approval)) {
      return cloneStored(existing);
    }
    if (existing !== undefined) {
      assertImmutableIdentity(existing.record, approval);
      if (isAcceptedRiskApprovalTerminalState(existing.approval_state)) {
        throw new WorkflowModelError(
          "WORKFLOW_STATE_TRANSITION_INVALID",
          `terminal accepted-risk approval ${approval.accepted_risk_approval_id} cannot mutate`,
        );
      }
      assertAcceptedRiskApprovalTransition({
        from_state: existing.approval_state,
        to_state: approval.approval_state,
      });
    }

    const stored: StoredAcceptedRiskApproval = {
      accepted_risk_approval_id: approval.accepted_risk_approval_id,
      accepted_risk_approval_ref: approvalRef,
      approval_state: approval.approval_state,
      content_fingerprint: acceptedRiskApprovalContentFingerprint(approval),
      error_id: approval.error_id,
      manifest_id: approval.manifest_id,
      record: cloneAcceptedRiskApproval(approval),
      root_manifest_id: approval.root_manifest_id,
      row_version: (existing?.row_version ?? 0) + 1,
      workflow_item_id: approval.workflow_item_id,
    };
    this.records.set(stored.accepted_risk_approval_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAcceptedRiskApprovalById(approvalId: string) {
    const stored = this.records.get(approvalId);
    return stored ? cloneStored(stored) : null;
  }

  async getAcceptedRiskApprovalByRef(approvalRef: string) {
    const id = this.idByRef.get(approvalRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAcceptedRiskApprovalsByError(errorId: string) {
    return this.listByIds(this.idsByError.get(errorId) ?? []);
  }

  async listAcceptedRiskApprovalsByWorkflowItem(workflowItemId: string) {
    return this.listByIds(this.idsByWorkflowItem.get(workflowItemId) ?? []);
  }

  async listAcceptedRiskApprovalsByState(state: AcceptedRiskApprovalState) {
    return this.listByIds(this.idsByState.get(state) ?? []);
  }

  async queryAcceptedRiskApprovals(query: AcceptedRiskApprovalQuery) {
    return [...this.records.values()]
      .filter((stored) => matchesQuery(stored, query))
      .sort(sortStored)
      .map(cloneStored);
  }
}
