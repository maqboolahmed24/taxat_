import { expect, test } from "@playwright/test";

import {
  buildWorkspaceSnapshot,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "./workspace_projection_fixtures.ts";

test("builds staff and customer workspace snapshots with lawful visibility families", () => {
  const item = workflowProjectionItem();
  const threads = workspaceThreads(item.item_id);
  const participants = workspaceParticipants(item.item_id);
  const attachments = projectionAttachments(item.item_id);
  const request = openRequestInfo(item.item_id);

  const staff = buildWorkspaceSnapshot({
    access_binding_hash: "access-0150",
    attachments,
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0150",
    participants,
    request_info_record: request,
    viewer_scope: "STAFF_FULL",
  });
  expect(staff.shell_family).toBe("CALM_SHELL");
  expect(staff.experience_profile).toBe("LOW_NOISE");
  expect(staff.detail_drawer.modules.map((module) => module.module_code)).toEqual([
    "CUSTOMER_ACTIVITY",
    "INTERNAL_ACTIVITY",
    "FILES",
    "LINKED_CONTEXT",
    "AUDIT_TRAIL",
  ]);
  expect(staff.detail_drawer.modules.find((module) => module.module_code === "FILES")?.internal_only_file_refs).toHaveLength(1);

  const customer = buildWorkspaceSnapshot({
    access_binding_hash: "access-0150",
    attachments,
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0150",
    participants,
    request_info_record: request,
    viewer_scope: "CUSTOMER_VISIBLE",
  });
  expect(customer.shell_family).toBe("CLIENT_PORTAL_SHELL");
  expect(customer.internal_head_sequence_or_null).toBeNull();
  expect(customer.customer_safe_projection?.boundary_scope).toBe("WORKSPACE_CUSTOMER_REQUEST");
  expect(customer.detail_drawer.modules.map((module) => module.module_code)).toEqual([
    "CUSTOMER_ACTIVITY",
    "FILES",
  ]);
  expect(customer.participants.map((participant) => participant.participant_ref)).toEqual(["client://client-0150"]);
  expect(customer.detail_drawer.modules.find((module) => module.module_code === "FILES")?.internal_only_file_refs).toEqual([]);
  expect(customer.customer_request_workspace?.visible_action_codes).toEqual(["RESPOND_TO_REQUEST_INFO"]);
  expect(customer.customer_request_workspace?.authoritative_action.primary_action_code_or_null).toBe(
    customer.action_strip.primary_action_code,
  );
});

test("fails closed when a customer workspace lacks the customer-visible thread", () => {
  const item = workflowProjectionItem();
  const threads = workspaceThreads(item.item_id);
  expect(() =>
    buildWorkspaceSnapshot({
      access_binding_hash: "access-0150",
      customer_thread: null,
      internal_thread: threads.internal,
      item,
      masking_posture_fingerprint: "mask-0150",
      viewer_scope: "CUSTOMER_VISIBLE",
    }),
  ).toThrow(WorkflowModelError);
});
