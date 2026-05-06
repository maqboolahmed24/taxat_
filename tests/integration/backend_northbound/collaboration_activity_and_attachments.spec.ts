import { expect, test } from "@playwright/test";

import {
  getCollaborationActivityEndpoint,
  getCollaborationAttachmentsEndpoint,
} from "../../../packages/backend-northbound/src/index.ts";
import { persistedWorkspaceFixture } from "../../unit/backend_northbound/workspace_read_fixtures.ts";

test("activity reads preserve explicit customer/internal lane separation and paging", async () => {
  const customer = await persistedWorkspaceFixture({ viewerScope: "CUSTOMER_VISIBLE" });

  const customerSlice = await getCollaborationActivityEndpoint(
    {
      actorContext: customer.actorContext,
      beforeSequence: 3,
      itemId: customer.itemId,
      method: "GET",
      thread: "customer",
      viewerScope: "CUSTOMER_VISIBLE",
    },
    {
      entryRepository: customer.entryRepository,
      threadRepository: customer.threadRepository,
      workspaceSnapshotRepository: customer.workspaceSnapshotRepository,
    },
  );
  expect(customerSlice.status).toBe(200);
  if (customerSlice.status !== 200) {
    throw new Error(customerSlice.body.problem_code);
  }
  expect(customerSlice.body.thread_visibility_class).toBe("CUSTOMER_VISIBLE");
  expect(customerSlice.body.active_filters.before_sequence_or_null).toBe(3);
  expect(customerSlice.body.entry_refs).toEqual([
    `entry://${customer.itemId}/customer/3`,
    `entry://${customer.itemId}/customer/2`,
    `entry://${customer.itemId}/customer/1`,
  ]);
  expect(customerSlice.body.customer_safe_projection?.boundary_scope).toBe(
    "COLLABORATION_ACTIVITY_SLICE",
  );

  const internalAttempt = await getCollaborationActivityEndpoint(
    {
      actorContext: customer.actorContext,
      itemId: customer.itemId,
      method: "GET",
      thread: "internal",
      viewerScope: "CUSTOMER_VISIBLE",
    },
    {
      entryRepository: customer.entryRepository,
      threadRepository: customer.threadRepository,
      workspaceSnapshotRepository: customer.workspaceSnapshotRepository,
    },
  );
  expect(internalAttempt.status).toBe(404);
  expect(internalAttempt.body.problem_code).toBe("WORKSPACE_READ_NOT_VISIBLE");
});

test("attachment reads preserve current-versus-history posture and customer-safe filtering", async () => {
  const staff = await persistedWorkspaceFixture({ viewerScope: "STAFF_FULL" });
  const customer = await persistedWorkspaceFixture({ viewerScope: "CUSTOMER_VISIBLE" });

  const customerFiles = await getCollaborationAttachmentsEndpoint(
    {
      actorContext: customer.actorContext,
      includeHistory: false,
      includePendingPlaceholders: true,
      itemId: customer.itemId,
      method: "GET",
      viewerScope: "CUSTOMER_VISIBLE",
      visibility: "customer",
    },
    {
      attachmentRepository: customer.attachmentRepository,
      workspaceSnapshotRepository: customer.workspaceSnapshotRepository,
    },
  );
  expect(customerFiles.status).toBe(200);
  if (customerFiles.status !== 200) {
    throw new Error(customerFiles.body.problem_code);
  }
  expect(customerFiles.body.visibility_class).toBe("CUSTOMER_VISIBLE");
  expect(customerFiles.body.active_filters.include_history).toBe(false);
  expect(customerFiles.body.active_filters.include_pending_placeholders).toBe(false);
  expect(customerFiles.body.historical_attachment_refs).toEqual([]);
  expect(customerFiles.body.current_attachment_refs).toHaveLength(1);
  expect(customerFiles.body.current_attachment_refs[0]).not.toContain("internal");
  expect(customerFiles.body.customer_safe_projection?.boundary_scope).toBe(
    "COLLABORATION_ATTACHMENT_SLICE",
  );

  const staffInternalFiles = await getCollaborationAttachmentsEndpoint(
    {
      actorContext: staff.actorContext,
      itemId: staff.itemId,
      method: "GET",
      viewerScope: "STAFF_FULL",
      visibility: "internal",
    },
    {
      attachmentRepository: staff.attachmentRepository,
      workspaceSnapshotRepository: staff.workspaceSnapshotRepository,
    },
  );
  expect(staffInternalFiles.status).toBe(200);
  if (staffInternalFiles.status !== 200) {
    throw new Error(staffInternalFiles.body.problem_code);
  }
  expect(staffInternalFiles.body.visibility_class).toBe("INTERNAL_ONLY");
  expect(staffInternalFiles.body.customer_safe_projection).toBeNull();
  expect(staffInternalFiles.body.current_attachment_refs).toHaveLength(1);
});
