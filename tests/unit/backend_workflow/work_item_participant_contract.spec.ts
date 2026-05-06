import { expect, test } from "@playwright/test";

import {
  buildWorkItemParticipant,
  buildWorkflowItem,
  upsertWorkItemParticipants,
  validateCustomerParticipantMapping,
  WorkItemParticipantRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

function item(visibility: "CUSTOMER_SHARED" | "INTERNAL_ONLY") {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0148-participant",
    collaboration_visibility: visibility,
    current_assignee_ref: "user://staff-owner",
    dedupe_key: `client-0148-participant:${visibility}`,
    item_id: `workflow-item-participant-${visibility}`,
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-30T09:00:00Z",
    period: "2026-Q1",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0148-participant",
    title: "Participant mapping",
    type: "PARTICIPANT_MAPPING",
  });
}

test("binds customer roles to CUSTOMER_PARTICIPANT and clears internal unread cursors", () => {
  const customer = buildWorkItemParticipant({
    item_id: "workflow-item-participant",
    notification_preferences_ref: "notification-pref://client",
    participant_ref: "client://client-0148",
    participant_role: "CLIENT_CONTRIBUTOR",
  });
  expect(customer.watch_state).toBe("CUSTOMER_PARTICIPANT");
  expect(customer.last_read_internal_sequence).toBeNull();

  expect(() =>
    buildWorkItemParticipant({
      item_id: "workflow-item-participant",
      last_read_internal_sequence: 4,
      notification_preferences_ref: "notification-pref://client",
      participant_ref: "client://client-0148",
      participant_role: "CLIENT_CONTRIBUTOR",
    }),
  ).toThrow(WorkflowModelError);
});

test("updates duplicate participant upserts when watch state changes", async () => {
  const repository = new WorkItemParticipantRepository();
  const workflowItem = item("CUSTOMER_SHARED");

  const first = await upsertWorkItemParticipants({
    item: workflowItem,
    participants: [
      {
        item_id: workflowItem.item_id,
        notification_preferences_ref: "notification-pref://staff",
        participant_ref: "user://staff-owner",
        participant_role: "PREPARER",
        watch_state: "WATCHER",
      },
    ],
    repository,
  });
  expect(first.changed_participant_refs).toEqual(["user://staff-owner"]);

  const second = await upsertWorkItemParticipants({
    item: workflowItem,
    participants: [
      {
        item_id: workflowItem.item_id,
        notification_preferences_ref: "notification-pref://staff",
        participant_ref: "user://staff-owner",
        participant_role: "PREPARER",
        watch_state: "PRIMARY_OWNER",
      },
    ],
    repository,
  });
  expect(second.changed_participant_refs).toEqual(["user://staff-owner"]);
  expect(second.participants.find((row) => row.participant_ref === "user://staff-owner")?.watch_state).toBe(
    "PRIMARY_OWNER",
  );
});

test("rejects customer-visible projections that include staff rows", () => {
  const customer = buildWorkItemParticipant({
    item_id: "workflow-item-participant",
    notification_preferences_ref: "notification-pref://client",
    participant_ref: "client://client-0148",
    participant_role: "CLIENT_VIEWER",
  });
  const staff = buildWorkItemParticipant({
    item_id: "workflow-item-participant",
    notification_preferences_ref: "notification-pref://staff",
    participant_ref: "user://staff-owner",
    participant_role: "PREPARER",
    watch_state: "PRIMARY_OWNER",
  });

  expect(() =>
    validateCustomerParticipantMapping({
      item_id: "workflow-item-participant",
      item_visibility: "CUSTOMER_SHARED",
      participants: [customer, staff],
      scope: "CUSTOMER_VISIBLE_PROJECTION",
    }),
  ).toThrow(WorkflowModelError);
});

test("internal-only sync removes retained customer rows and rejects new customer participants", async () => {
  const repository = new WorkItemParticipantRepository();
  const shared = item("CUSTOMER_SHARED");
  const internal = item("INTERNAL_ONLY");
  const retainedCustomer = buildWorkItemParticipant({
    item_id: internal.item_id,
    notification_preferences_ref: "notification-pref://client",
    participant_ref: "client://client-0148",
    participant_role: "CLIENT_VIEWER",
  });
  await repository.upsertWorkItemParticipant({ participant: retainedCustomer });

  const sync = await upsertWorkItemParticipants({
    item: internal,
    participants: [
      {
        item_id: internal.item_id,
        notification_preferences_ref: "notification-pref://staff",
        participant_ref: "user://staff-owner",
        participant_role: "PREPARER",
        watch_state: "PRIMARY_OWNER",
      },
    ],
    repository,
  });
  expect(sync.removed_customer_participant_refs).toEqual(["client://client-0148"]);
  expect(sync.participants.map((row) => row.participant_ref)).toEqual(["user://staff-owner"]);

  await expect(
    upsertWorkItemParticipants({
      item: internal,
      participants: [
        {
          item_id: shared.item_id,
          notification_preferences_ref: "notification-pref://client",
          participant_ref: "client://client-0148",
          participant_role: "CLIENT_VIEWER",
        },
      ],
      repository,
    }),
  ).rejects.toThrow(WorkflowModelError);
});
