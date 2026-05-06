import { expect, test } from "@playwright/test";

import {
  buildRequestInfoRecord,
  closeRequestInfoRecord,
  recordRequestInfoResponse,
  RequestInfoRecordRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function openRequest() {
  return buildRequestInfoRecord({
    audit_event_refs: ["audit://request-info/open"],
    customer_due_at: "2026-05-05T17:00:00Z",
    item_id: "workflow-item-request-0148",
    opened_at: "2026-04-30T09:10:00Z",
    opened_notification_refs: ["notification://request-info/open"],
    prompt_body_ref: "body://request-prompt",
    prompt_entry_ref: "collaboration-entry://request-prompt",
    request_info_ordinal: 1,
    requested_by_ref: "user://staff-owner",
  });
}

test("open request-info records freeze version 1 and clear response and closure lineage", () => {
  const request = openRequest();

  expect(request.visibility_class).toBe("CUSTOMER_VISIBLE");
  expect(request.lifecycle_state).toBe("OPEN");
  expect(request.request_state_version).toBe(1);
  expect(request.response_entry_ref).toBeNull();
  expect(request.closure_reason_code).toBeNull();
  expect(request.audit_event_refs).toEqual(["audit://request-info/open"]);
});

test("records one exact response and accepted closure with versions 2 then 3", async () => {
  const repository = new RequestInfoRecordRepository();
  const opened = openRequest();
  await repository.persistRequestInfoRecord({ record: opened });

  const responded = await recordRequestInfoResponse({
    audit_event_ref: "audit://request-info/responded",
    repository,
    request_info_id: opened.request_info_id,
    responded_at: "2026-04-30T10:00:00Z",
    responded_by_ref: "client://client-0148",
    response_body_ref: "body://request-response",
    response_causal_parent_entry_ref: opened.prompt_entry_ref,
    response_entry_ref: "collaboration-entry://request-response",
    response_request_info_ref: opened.request_info_id,
  });
  expect(responded.request.lifecycle_state).toBe("RESPONDED");
  expect(responded.request.request_state_version).toBe(2);
  expect(responded.request.response_entry_ref).toBe("collaboration-entry://request-response");

  const closed = await closeRequestInfoRecord({
    audit_event_ref: "audit://request-info/closed",
    closed_at: "2026-04-30T10:10:00Z",
    closed_by_ref: "user://staff-owner",
    closure_entry_ref: "collaboration-entry://request-close",
    closure_reason_code: "CUSTOMER_REPLY_ACCEPTED",
    repository,
    request_info_id: opened.request_info_id,
  });
  expect(closed.request_state_version).toBe(3);
  expect(closed.response_body_ref).toBe("body://request-response");
  expect(closed.audit_event_refs).toEqual([
    "audit://request-info/closed",
    "audit://request-info/open",
    "audit://request-info/responded",
  ]);
});

test("cancels and supersedes open requests without fabricated response lineage", async () => {
  const repository = new RequestInfoRecordRepository();
  const opened = openRequest();
  await repository.persistRequestInfoRecord({ record: opened });

  const cancelled = await closeRequestInfoRecord({
    audit_event_ref: "audit://request-info/cancelled",
    closed_at: "2026-04-30T09:20:00Z",
    closed_by_ref: "user://staff-owner",
    closure_entry_ref: "collaboration-entry://request-cancelled",
    closure_reason_code: "CANCELLED",
    repository,
    request_info_id: opened.request_info_id,
  });
  expect(cancelled.request_state_version).toBe(2);
  expect(cancelled.response_entry_ref).toBeNull();
  expect(cancelled.responded_by_ref).toBeNull();
});

test("fails closed on floating response identity, accepted close without response, and version regression", async () => {
  const repository = new RequestInfoRecordRepository();
  const opened = openRequest();
  await repository.persistRequestInfoRecord({ record: opened });

  await expect(
    recordRequestInfoResponse({
      audit_event_ref: "audit://request-info/bad-response",
      repository,
      request_info_id: opened.request_info_id,
      responded_at: "2026-04-30T10:00:00Z",
      responded_by_ref: "client://client-0148",
      response_body_ref: "body://request-response",
      response_causal_parent_entry_ref: "collaboration-entry://other-prompt",
      response_entry_ref: "collaboration-entry://request-response",
      response_request_info_ref: opened.request_info_id,
    }),
  ).rejects.toThrow(WorkflowModelError);

  await expect(
    closeRequestInfoRecord({
      audit_event_ref: "audit://request-info/bad-close",
      closed_at: "2026-04-30T10:10:00Z",
      closed_by_ref: "user://staff-owner",
      closure_entry_ref: "collaboration-entry://request-close",
      closure_reason_code: "CUSTOMER_REPLY_ACCEPTED",
      repository,
      request_info_id: opened.request_info_id,
    }),
  ).rejects.toThrow(WorkflowModelError);

  await expect(
    recordRequestInfoResponse({
      audit_event_ref: "audit://request-info/stale-response",
      expected_request_state_version: 2,
      repository,
      request_info_id: opened.request_info_id,
      responded_at: "2026-04-30T10:00:00Z",
      responded_by_ref: "client://client-0148",
      response_body_ref: "body://request-response",
      response_causal_parent_entry_ref: opened.prompt_entry_ref,
      response_entry_ref: "collaboration-entry://request-response",
      response_request_info_ref: opened.request_info_id,
    }),
  ).rejects.toThrow(WorkflowModelError);
});
