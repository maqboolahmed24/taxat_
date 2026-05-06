import { expect, test } from "@playwright/test";

import {
  assertCustomerSafeProjectionAlignment,
  buildCustomerRequestListSnapshot,
  buildWorkspaceSnapshot,
  type CustomerRequestListSnapshot,
  stripInternalOnlyProjectionFields,
  validateCustomerSafeActionContract,
  type WorkspaceSnapshot,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  buildActionAuthorityContract,
  type CustomerSafeProjectionContract,
  type VisibilityPartitionContract,
} from "../../../packages/backend-workflow/src/projectors/projection_contract_helpers.ts";
import {
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "./workspace_projection_fixtures.ts";

function customerWorkspace() {
  const item = workflowProjectionItem({ item_id: "workflow-item-0152-safe" });
  const threads = workspaceThreads(item.item_id);
  return buildWorkspaceSnapshot({
    access_binding_hash: "access-0152",
    attachments: projectionAttachments(item.item_id),
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0152",
    participants: workspaceParticipants(item.item_id),
    request_info_record: openRequestInfo(item.item_id),
    viewer_scope: "CUSTOMER_VISIBLE",
  });
}

function customerRequestList() {
  const item = workflowProjectionItem({ item_id: "workflow-item-0152-list" });
  return buildCustomerRequestListSnapshot({
    access_binding_hash: "access-0152",
    attachments: projectionAttachments(item.item_id),
    client_id: item.client_id,
    items: [item],
    list_version: item.customer_workspace_version,
    masking_posture_fingerprint: "mask-0152",
    request_info_records: [openRequestInfo(item.item_id)],
    selected_item_ref_or_null: item.item_id,
    tenant_id: item.tenant_id,
    updated_at: "2026-04-30T12:00:00Z",
  });
}

test("customer workspace requires a non-null aligned customer-safe projection", () => {
  const snapshot = customerWorkspace();
  const boundary = assertCustomerSafeProjectionAlignment({
    artifact: snapshot as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    expected_boundary_scope: "WORKSPACE_CUSTOMER_REQUEST",
    expected_partition_scope: "WORKSPACE_SNAPSHOT",
    expected_projection_audience: "CUSTOMER_COLLABORATION",
    expected_visibility_audience_class: "CUSTOMER_COLLABORATION",
    requirement: "REQUIRED",
  });

  expect(boundary.customer_safe_projection?.visibility_cache_partition_key).toBe(
    snapshot.visibility_partition.cache_partition_key,
  );
  expect(boundary.customer_safe_projection?.blocked_staff_signal_classes).toContain(
    "INTERNAL_ACTIVITY",
  );
});

test("customer workspace fails closed when internal head sequence is exposed", () => {
  const snapshot = customerWorkspace();
  const leaking: WorkspaceSnapshot = {
    ...snapshot,
    internal_head_sequence_or_null: 2,
  };

  expect(() =>
    assertCustomerSafeProjectionAlignment({
      artifact: leaking as unknown as Record<string, unknown>,
      expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
      expected_boundary_scope: "WORKSPACE_CUSTOMER_REQUEST",
      expected_partition_scope: "WORKSPACE_SNAPSHOT",
      expected_projection_audience: "CUSTOMER_COLLABORATION",
      expected_visibility_audience_class: "CUSTOMER_COLLABORATION",
      requirement: "REQUIRED",
    }),
  ).toThrow(/internal-only field families/i);
});

test("request list fails closed on customer-safe binding or cache drift", () => {
  const snapshot = customerRequestList();
  const drifted: CustomerRequestListSnapshot = {
    ...snapshot,
    customer_safe_projection: {
      ...snapshot.customer_safe_projection,
      access_binding_hash: "different-access-binding",
    },
  };

  expect(() =>
    assertCustomerSafeProjectionAlignment({
      artifact: drifted as unknown as Record<string, unknown>,
      expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
      expected_boundary_scope: "CUSTOMER_REQUEST_LIST",
      expected_partition_scope: "CUSTOMER_REQUEST_LIST",
      expected_projection_audience: "CLIENT_PORTAL",
      expected_visibility_audience_class: "CLIENT_PORTAL",
      requirement: "REQUIRED",
    }),
  ).toThrow(/access binding/i);
});

test("stripper removes staff-only field families from internal candidates", () => {
  const stripped = stripInternalOnlyProjectionFields({
    audit_event_refs: ["audit://workflow-item/1"],
    current_assignee_ref: "user://staff-owner",
    detail: {
      internal_only_file_refs: ["attachment://internal"],
    },
    escalation_state: "ESCALATED_ACTIVE",
    queue_projection: {
      internal_unread_count_or_null: 3,
    },
    route_context: {
      active_route_ref: "/work/items/workflow-item-0152-safe",
    },
    title: "Upload payroll records",
  });

  expect(stripped.stripped_field_families).toEqual([
    "ASSIGNMENT_STATE",
    "AUDIT_LINEAGE",
    "ESCALATION_LOGIC",
    "INTERNAL_ATTACHMENTS",
    "INTERNAL_COUNTS",
    "STAFF_ROUTE_CONTEXT",
  ]);
  expect(JSON.stringify(stripped.payload)).not.toContain("audit://");
  expect(JSON.stringify(stripped.payload)).not.toContain("staff-owner");
  expect(JSON.stringify(stripped.payload)).not.toContain("attachment://internal");
});

test("customer-safe action contract rejects staff-only action vocabulary and routes", () => {
  const snapshot = customerRequestList();
  const safeAction = snapshot.rows[0]!.authoritative_action;
  validateCustomerSafeActionContract({
    action: safeAction,
    customer_safe_projection: snapshot.customer_safe_projection,
    visibility_partition: snapshot.visibility_partition,
  });

  const unsafeAction = buildActionAuthorityContract({
    access_binding_hash: snapshot.access_binding_hash,
    actionability_state: "ACTION_AVAILABLE",
    available_action_codes: ["ADD_INTERNAL_NOTE"],
    blocked_action_codes: [],
    blocking_reason_code_or_null: null,
    customer_safe_projection: true,
    machine_reason_codes: ["STAFF_ACTION_READY"],
    primary_action_code_or_null: "ADD_INTERNAL_NOTE",
    projection_route_key: "/work/items/workflow-item-0152-list",
    projection_scope: "CUSTOMER_REQUEST_ROW",
    projection_version: snapshot.list_version,
    recovery_focus_anchor_ref_or_null: null,
    recovery_route_ref_or_null: null,
    secondary_action_codes: [],
    suggested_module_code_or_null: "INTERNAL_ACTIVITY",
    visibility_cache_partition_key: snapshot.visibility_partition.cache_partition_key,
  });

  expect(() =>
    validateCustomerSafeActionContract({
      action: unsafeAction,
      customer_safe_projection: snapshot.customer_safe_projection as CustomerSafeProjectionContract,
      visibility_partition: snapshot.visibility_partition as VisibilityPartitionContract,
    }),
  ).toThrow(/customer-safe action vocabulary/i);
});
