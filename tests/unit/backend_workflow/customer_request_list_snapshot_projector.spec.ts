import { expect, test } from "@playwright/test";

import {
  buildCustomerRequestListSnapshot,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
} from "./workspace_projection_fixtures.ts";

test("builds a client-safe request list with selected-row focus and row action authority", () => {
  const actionRequired = workflowProjectionItem({
    item_id: "workflow-item-0150-action",
    lifecycle_state: "WAITING_ON_CLIENT",
    waiting_on_actor: "CUSTOMER",
  });
  const inReview = workflowProjectionItem({
    item_id: "workflow-item-0150-review",
    lifecycle_state: "IN_PROGRESS",
    title: "Manifest gate staff detail",
    waiting_on_actor: "STAFF",
  });

  const snapshot = buildCustomerRequestListSnapshot({
    access_binding_hash: "access-0150",
    attachments: projectionAttachments(actionRequired.item_id),
    client_id: "client-0150",
    items: [inReview, actionRequired],
    list_version: 3,
    masking_posture_fingerprint: "mask-0150",
    request_info_records: [openRequestInfo(actionRequired.item_id)],
    selected_item_ref_or_null: actionRequired.item_id,
    tenant_id: "tenant-0150",
    updated_at: "2026-04-30T11:00:00Z",
  });

  expect(snapshot.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(snapshot.rows.map((row) => row.status_code)).toEqual(["ACTION_REQUIRED", "WAITING_ON_US"]);
  expect(snapshot.selected_focus_anchor_ref_or_null).toBe(`customer-request-row://${actionRequired.item_id}`);
  const row = snapshot.rows[0]!;
  expect(row.primary_action_code_or_null).toBe("RESPOND_TO_REQUEST_INFO");
  expect(row.authoritative_action.available_action_codes).toEqual(["RESPOND_TO_REQUEST_INFO"]);
  expect(row.artifact_history_state).toBe("CURRENT_PLUS_HISTORY");
  expect(snapshot.rows[1]!.title).toBe("Request for 2026-Q1");
});

test("fails closed when selected row is filtered out", () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0150-filtered" });
  expect(() =>
    buildCustomerRequestListSnapshot({
      access_binding_hash: "access-0150",
      active_filters: {
        due_states: [],
        files_requested_only: false,
        status_codes: ["COMPLETED"],
        unread_only: false,
      },
      client_id: "client-0150",
      items: [item],
      masking_posture_fingerprint: "mask-0150",
      selected_item_ref_or_null: item.item_id,
      tenant_id: "tenant-0150",
      updated_at: "2026-04-30T11:00:00Z",
    }),
  ).toThrow(WorkflowModelError);
});
