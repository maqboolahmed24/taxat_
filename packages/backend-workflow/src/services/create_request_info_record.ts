import {
  buildRequestInfoRecord,
  requestInfoRecordId,
  type RequestInfoRecord,
} from "../models/request_info_record.ts";
import { normalizeWorkflowItem, type WorkflowItem, WorkflowModelError } from "../models/workflow_item.ts";
import type { RequestInfoRecordRepository } from "../repositories/request_info_record_repository.ts";
import { advanceWorkflowItem } from "./advance_workflow_item.ts";

export type CreateRequestInfoRecordInput = {
  allow_multiple_open_requests?: boolean | undefined;
  audit_event_ref: string;
  customer_due_at?: string | null | undefined;
  expected_customer_workspace_version?: number | undefined;
  expected_staff_workspace_version?: number | undefined;
  item: WorkflowItem;
  opened_at: string;
  opened_notification_refs?: readonly string[] | undefined;
  prompt_body_ref: string;
  prompt_entry_ref: string;
  repository: RequestInfoRecordRepository;
  request_info_id?: string | undefined;
  request_info_ordinal?: number | undefined;
  requested_by_ref: string;
};

export type CreateRequestInfoRecordResult = {
  request: RequestInfoRecord;
  updated_item: WorkflowItem;
};

export async function createRequestInfoRecord(
  input: CreateRequestInfoRecordInput,
): Promise<CreateRequestInfoRecordResult> {
  const item = normalizeWorkflowItem(input.item);
  if (item.collaboration_visibility !== "CUSTOMER_SHARED") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "request-info records require a customer-shared workflow item",
    );
  }
  if (item.lifecycle_state !== "IN_PROGRESS") {
    throw new WorkflowModelError(
      "WORKFLOW_STATE_TRANSITION_INVALID",
      "request-info creation requires an IN_PROGRESS workflow item",
    );
  }

  const openRequests = await input.repository.listOpenRequestInfoRecordsByItem(item.item_id);
  if (openRequests.length > 0 && input.allow_multiple_open_requests !== true) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "a second open request-info record requires explicit multiple-open policy",
    );
  }

  const requestInfoOrdinal = input.request_info_ordinal ?? item.next_request_info_ordinal;
  if (requestInfoOrdinal !== item.next_request_info_ordinal) {
    throw new WorkflowModelError(
      "WORKFLOW_STALE_VERSION",
      "request_info_ordinal must match the workflow item's next_request_info_ordinal",
    );
  }
  const requestInfoId =
    input.request_info_id ??
    requestInfoRecordId({
      item_id: item.item_id,
      request_info_ordinal: requestInfoOrdinal,
    });
  const request = buildRequestInfoRecord({
    audit_event_refs: [input.audit_event_ref],
    customer_due_at: input.customer_due_at ?? item.customer_due_at,
    item_id: item.item_id,
    opened_at: input.opened_at,
    opened_notification_refs: [...(input.opened_notification_refs ?? [])],
    prompt_body_ref: input.prompt_body_ref,
    prompt_entry_ref: input.prompt_entry_ref,
    request_info_id: requestInfoId,
    request_info_ordinal: requestInfoOrdinal,
    requested_by_ref: input.requested_by_ref,
  });
  await input.repository.persistRequestInfoRecord({ record: request });

  const updatedItem = advanceWorkflowItem({
    active_request_info_ref: request.request_info_id,
    customer_due_at: request.customer_due_at,
    expected_customer_workspace_version: input.expected_customer_workspace_version,
    expected_staff_workspace_version: input.expected_staff_workspace_version,
    item,
    last_internal_event_ref: request.prompt_entry_ref,
    to_state: "WAITING_ON_CLIENT",
    transition_applied_at: request.opened_at,
    transition_audit_ref: input.audit_event_ref,
    transition_event_code: "request_info_sent",
  });
  return { request, updated_item: updatedItem };
}
