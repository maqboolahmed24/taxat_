import {
  normalizeAcceptedRiskApproval,
  type AcceptedRiskApproval,
  withAcceptedRiskApprovalLineage,
} from "../models/accepted_risk_approval.ts";
import { normalizeFailureTimestamp } from "../models/failure_companion_common.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { AcceptedRiskApprovalRepository } from "../repositories/accepted_risk_approval_repository.ts";

export type RevokeAcceptedRiskApprovalInput = {
  action: "REVOKE";
  accepted_risk_approval_id: string;
  audit_refs: readonly string[];
  provenance_refs?: readonly string[] | undefined;
  repository: AcceptedRiskApprovalRepository;
  revoked_at: string;
};

export type ExpireAcceptedRiskApprovalInput = {
  action: "EXPIRE";
  accepted_risk_approval_id: string;
  audit_refs: readonly string[];
  expired_at: string;
  provenance_refs?: readonly string[] | undefined;
  repository: AcceptedRiskApprovalRepository;
};

export type SupersedeAcceptedRiskApprovalInput = {
  action: "SUPERSEDE";
  accepted_risk_approval_id: string;
  audit_refs: readonly string[];
  provenance_refs?: readonly string[] | undefined;
  repository: AcceptedRiskApprovalRepository;
  superseded_by_approval_id: string;
};

export async function revokeOrExpireAcceptedRiskApproval(
  input:
    | RevokeAcceptedRiskApprovalInput
    | ExpireAcceptedRiskApprovalInput
    | SupersedeAcceptedRiskApprovalInput,
): Promise<AcceptedRiskApproval> {
  const stored = await input.repository.getAcceptedRiskApprovalById(
    input.accepted_risk_approval_id,
  );
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "accepted-risk approval was not found");
  }
  const current = normalizeAcceptedRiskApproval(stored.record);

  if (input.action === "EXPIRE" && normalizeFailureTimestamp("expired_at", input.expired_at) < current.expires_at) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "accepted-risk approval cannot expire before expires_at",
    );
  }

  const next = withAcceptedRiskApprovalLineage({
    approval:
      input.action === "REVOKE"
        ? {
            ...current,
            approval_state: "REVOKED",
            revoked_at: input.revoked_at,
            superseded_by_approval_id: null,
          }
        : input.action === "EXPIRE"
          ? {
              ...current,
              approval_state: "EXPIRED",
              revoked_at: null,
              superseded_by_approval_id: null,
            }
          : {
              ...current,
              approval_state: "SUPERSEDED",
              revoked_at: null,
              superseded_by_approval_id: input.superseded_by_approval_id,
            },
    audit_refs: input.audit_refs,
    provenance_refs: input.provenance_refs,
  });
  const persisted = await input.repository.persistAcceptedRiskApproval({ approval: next });
  return persisted.record;
}
