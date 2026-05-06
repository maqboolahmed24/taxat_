import { expect, test } from "@playwright/test";

import {
  advanceWorkflowItem,
  buildWorkflowItem,
  validateWorkflowItemTransition,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function baseItem() {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0145",
    dedupe_key: "client-0145:2026-q1:transition",
    item_id: "workflow-item-transition-0145",
    opened_at: "2026-04-29T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0145",
    title: "Transition check",
    type: "TRANSITION_CHECK",
  });
}

test("accepts the canonical WORKFLOW_ITEM transition matrix and documented aliases", () => {
  expect(
    validateWorkflowItemTransition({
      from_state: "OPEN",
      to_state: "IN_PROGRESS",
      transition_event_code: "pick_up",
    }),
  ).toBe("picked_up");
  expect(
    validateWorkflowItemTransition({
      from_state: "IN_PROGRESS",
      to_state: "WAITING_ON_CLIENT",
      transition_event_code: "request_info_sent",
    }),
  ).toBe("needs_client_input");
  expect(
    validateWorkflowItemTransition({
      from_state: "WAITING_ON_AUTHORITY",
      to_state: "IN_PROGRESS",
      transition_event_code: "authority_response_recorded",
    }),
  ).toBe("authority_response");
});

test("rejects hidden direct transitions outside the state machine", () => {
  expect(() =>
    validateWorkflowItemTransition({
      from_state: "OPEN",
      to_state: "DONE",
      transition_event_code: "resolved",
    }),
  ).toThrow(WorkflowModelError);
  expect(() =>
    validateWorkflowItemTransition({
      from_state: "BLOCKED",
      to_state: "DONE",
      transition_event_code: "resolved",
    }),
  ).toThrow(WorkflowModelError);
});

test("requires exact request-info lineage when client response advances an item", () => {
  const inProgress = advanceWorkflowItem({
    item: baseItem(),
    to_state: "IN_PROGRESS",
    transition_applied_at: "2026-04-29T09:05:00Z",
    transition_audit_ref: "audit://workflow-item-transition-0145/picked-up",
    transition_event_code: "picked_up",
  });
  const waiting = advanceWorkflowItem({
    active_request_info_ref: "request-info://workflow-item-transition-0145/1",
    item: inProgress,
    to_state: "WAITING_ON_CLIENT",
    transition_applied_at: "2026-04-29T09:10:00Z",
    transition_audit_ref: "audit://workflow-item-transition-0145/request-info",
    transition_event_code: "needs_client_input",
  });

  expect(() =>
    advanceWorkflowItem({
      item: waiting,
      target_request_info_ref: "request-info://workflow-item-transition-0145/2",
      to_state: "IN_PROGRESS",
      transition_applied_at: "2026-04-29T09:30:00Z",
      transition_audit_ref: "audit://workflow-item-transition-0145/client-response-wrong",
      transition_event_code: "client_response",
    }),
  ).toThrow(WorkflowModelError);
});

test("terminal workflow items reject ordinary collaboration mutation", () => {
  const inProgress = advanceWorkflowItem({
    item: baseItem(),
    to_state: "IN_PROGRESS",
    transition_applied_at: "2026-04-29T09:05:00Z",
    transition_audit_ref: "audit://workflow-item-transition-0145/picked-up",
    transition_event_code: "picked_up",
  });
  const done = advanceWorkflowItem({
    item: inProgress,
    to_state: "DONE",
    transition_applied_at: "2026-04-29T10:00:00Z",
    transition_audit_ref: "audit://workflow-item-transition-0145/done",
    transition_event_code: "resolved",
  });

  expect(() =>
    advanceWorkflowItem({
      item: done,
      to_state: "IN_PROGRESS",
      transition_applied_at: "2026-04-29T10:05:00Z",
      transition_audit_ref: "audit://workflow-item-transition-0145/reopen",
      transition_event_code: "picked_up",
    }),
  ).toThrow(WorkflowModelError);
});
