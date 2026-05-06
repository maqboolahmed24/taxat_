import { expect, test } from "@playwright/test";

import {
  buildCollaborationActivitySlice,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  customerActivityEntries,
  workflowProjectionItem,
  workspaceThreads,
} from "./workspace_projection_fixtures.ts";

test("pages customer-visible activity backward without lane drift", () => {
  const item = workflowProjectionItem();
  const threads = workspaceThreads(item.item_id);
  const entries = customerActivityEntries(item.item_id);
  const slice = buildCollaborationActivitySlice({
    access_binding_hash: "access-0150",
    entries,
    item_id: item.item_id,
    limit: 2,
    masking_posture_fingerprint: "mask-0150",
    shell_stability_token: "workspace-shell://0150",
    thread: threads.customer,
    viewer_scope: "CUSTOMER_VISIBLE",
    workspace_route_key: `/portal/requests/${item.item_id}`,
    workspace_version: item.customer_workspace_version,
  });

  expect(slice.thread_visibility_class).toBe("CUSTOMER_VISIBLE");
  expect(slice.entry_refs).toEqual([
    `entry://${item.item_id}/customer/4`,
    `entry://${item.item_id}/customer/3`,
  ]);
  expect(slice.newest_returned_sequence_or_null).toBe(4);
  expect(slice.oldest_returned_sequence_or_null).toBe(3);
  expect(slice.has_more_before).toBe(true);
  expect(slice.next_before_sequence_or_null).toBe(2);
  expect(slice.customer_safe_projection?.boundary_scope).toBe("COLLABORATION_ACTIVITY_SLICE");
});

test("rejects customer-visible reads against the internal lane", () => {
  const item = workflowProjectionItem();
  const threads = workspaceThreads(item.item_id);
  expect(() =>
    buildCollaborationActivitySlice({
      access_binding_hash: "access-0150",
      entries: [],
      item_id: item.item_id,
      masking_posture_fingerprint: "mask-0150",
      shell_stability_token: "workspace-shell://0150",
      thread: threads.internal,
      viewer_scope: "CUSTOMER_VISIBLE",
      workspace_route_key: `/portal/requests/${item.item_id}`,
      workspace_version: item.customer_workspace_version,
    }),
  ).toThrow(WorkflowModelError);
});
