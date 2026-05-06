import {
  buildRequestInfoRecord,
  normalizeRequestInfoRecord,
  type RequestInfoClosureReason,
  type RequestInfoRecord,
} from "../models/request_info_record.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { RequestInfoRecordRepository } from "../repositories/request_info_record_repository.ts";

export type CloseRequestInfoRecordInput = {
  audit_event_ref: string;
  closed_at: string;
  closed_by_ref: string;
  closure_entry_ref: string;
  closure_reason_code: RequestInfoClosureReason;
  expected_request_state_version?: number | undefined;
  repository: RequestInfoRecordRepository;
  request_info_id: string;
};

export async function closeRequestInfoRecord(
  input: CloseRequestInfoRecordInput,
): Promise<RequestInfoRecord> {
  const stored = await input.repository.getRequestInfoRecordById(input.request_info_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request-info record must exist before closure");
  }
  const current = normalizeRequestInfoRecord(stored.record);
  if (current.lifecycle_state === "CLOSED") {
    throw new WorkflowModelError("WORKFLOW_ITEM_IMMUTABLE", "closed request-info records are terminal");
  }

  if (input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED") {
    if (current.lifecycle_state !== "RESPONDED") {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "CUSTOMER_REPLY_ACCEPTED closure requires prior response lineage",
      );
    }
  } else if (current.lifecycle_state !== "OPEN") {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "CANCELLED and SUPERSEDED closures are response-free terminal paths",
    );
  }

  const request = buildRequestInfoRecord({
    ...current,
    audit_event_refs: [...current.audit_event_refs, input.audit_event_ref],
    closed_at: input.closed_at,
    closed_by_ref: input.closed_by_ref,
    closure_entry_ref: input.closure_entry_ref,
    closure_reason_code: input.closure_reason_code,
    lifecycle_state: "CLOSED",
    request_state_version: input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" ? 3 : 2,
    responded_at:
      input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" ? current.responded_at : null,
    responded_by_ref:
      input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" ? current.responded_by_ref : null,
    response_body_ref:
      input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" ? current.response_body_ref : null,
    response_entry_ref:
      input.closure_reason_code === "CUSTOMER_REPLY_ACCEPTED" ? current.response_entry_ref : null,
  });
  await input.repository.persistRequestInfoRecord({
    expected_request_state_version: input.expected_request_state_version ?? current.request_state_version,
    record: request,
  });
  return request;
}
