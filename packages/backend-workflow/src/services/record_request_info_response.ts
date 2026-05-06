import {
  buildRequestInfoRecord,
  normalizeRequestInfoRecord,
  type RequestInfoRecord,
} from "../models/request_info_record.ts";
import { normalizeWorkflowItem, type WorkflowItem, WorkflowModelError } from "../models/workflow_item.ts";
import type { RequestInfoRecordRepository } from "../repositories/request_info_record_repository.ts";
import { advanceWorkflowItem } from "./advance_workflow_item.ts";

export type RecordRequestInfoResponseInput = {
  audit_event_ref: string;
  expected_request_state_version?: number | undefined;
  item?: WorkflowItem | undefined;
  repository: RequestInfoRecordRepository;
  request_info_id: string;
  responded_at: string;
  responded_by_ref: string;
  response_body_ref: string;
  response_causal_parent_entry_ref?: string | null | undefined;
  response_entry_ref: string;
  response_request_info_ref?: string | null | undefined;
};

export type RecordRequestInfoResponseResult = {
  request: RequestInfoRecord;
  updated_item: WorkflowItem | null;
};

export async function recordRequestInfoResponse(
  input: RecordRequestInfoResponseInput,
): Promise<RecordRequestInfoResponseResult> {
  const stored = await input.repository.getRequestInfoRecordById(input.request_info_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request-info record must exist before response");
  }
  const current = normalizeRequestInfoRecord(stored.record);
  if (current.lifecycle_state !== "OPEN" || current.request_state_version !== 1) {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "only OPEN request-info records can accept a customer response",
    );
  }
  if (
    input.response_request_info_ref !== undefined &&
    input.response_request_info_ref !== null &&
    input.response_request_info_ref !== current.request_info_id
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "request-info response entry must carry the exact request_info_ref",
    );
  }
  if (
    input.response_causal_parent_entry_ref !== undefined &&
    input.response_causal_parent_entry_ref !== null &&
    input.response_causal_parent_entry_ref !== current.prompt_entry_ref
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "request-info response must bind to the exact prompt entry",
    );
  }

  const request = buildRequestInfoRecord({
    ...current,
    audit_event_refs: [...current.audit_event_refs, input.audit_event_ref],
    lifecycle_state: "RESPONDED",
    request_state_version: 2,
    responded_at: input.responded_at,
    responded_by_ref: input.responded_by_ref,
    response_body_ref: input.response_body_ref,
    response_entry_ref: input.response_entry_ref,
  });
  await input.repository.persistRequestInfoRecord({
    expected_request_state_version: input.expected_request_state_version ?? current.request_state_version,
    record: request,
  });

  let updatedItem: WorkflowItem | null = null;
  if (input.item !== undefined) {
    const item = normalizeWorkflowItem(input.item);
    updatedItem = advanceWorkflowItem({
      item,
      last_internal_event_ref: input.audit_event_ref,
      target_request_info_ref: request.request_info_id,
      to_state: "IN_PROGRESS",
      transition_applied_at: input.responded_at,
      transition_audit_ref: input.audit_event_ref,
      transition_event_code: "customer_reply_recorded",
    });
  }

  return { request, updated_item: updatedItem };
}
