import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildCanonicalCrossDeviceContinuityContract,
  buildCustomerRequestListSnapshot,
  buildWorkItemNotification,
  buildWorkspaceSnapshot,
  stampNotificationOpenContinuityMetadata,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";
import {
  openRequestInfo,
  projectionAttachments,
  workflowProjectionItem,
  workspaceParticipants,
  workspaceThreads,
} from "./workspace_projection_fixtures.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import CUSTOM_VALIDATORS, Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

test("stamps schema-valid continuity contracts onto workspace, request-list, and notification artifacts", async () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0155-continuity" });
  const threads = workspaceThreads(item.item_id);
  const participants = workspaceParticipants(item.item_id);
  const request = openRequestInfo(item.item_id);

  const staff = buildWorkspaceSnapshot({
    access_binding_hash: "access-0155",
    attachments: projectionAttachments(item.item_id),
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0155",
    participants,
    request_info_record: request,
    viewer_scope: "STAFF_FULL",
  });
  expect(staff.cross_device_continuity_contract.continuity_scope).toBe("WORKSPACE_ROUTE");
  expect(staff.cross_device_continuity_contract.allowed_embodiments).toContain(
    "NATIVE_SUPPORT_WINDOW",
  );
  expect(staff.cross_device_continuity_contract.supported_invalidation_reason_codes).toContain(
    "SESSION_REVOKED",
  );
  await validatePayloadAgainstSchema(
    "cross_device_continuity_contract.schema.json",
    staff.cross_device_continuity_contract,
  );

  const customer = buildWorkspaceSnapshot({
    access_binding_hash: "access-0155",
    customer_thread: threads.customer,
    internal_thread: threads.internal,
    item,
    masking_posture_fingerprint: "mask-0155",
    participants,
    request_info_record: request,
    return_focus_anchor_ref: `customer-request-row://${item.item_id}`,
    return_route_ref: "/portal/requests",
    viewer_scope: "CUSTOMER_VISIBLE",
  });
  expect(customer.cross_device_continuity_contract.continuity_scope).toBe("WORKSPACE_ROUTE");
  expect(customer.cross_device_continuity_contract.parent_context_ref_or_null).toBe(
    "/portal/requests",
  );
  expect(customer.cross_device_continuity_contract.allowed_embodiments).toEqual([
    "BROWSER_WIDE",
    "BROWSER_NARROW_STACKED",
  ]);
  await validatePayloadAgainstSchema(
    "cross_device_continuity_contract.schema.json",
    customer.cross_device_continuity_contract,
  );

  const requestList = buildCustomerRequestListSnapshot({
    access_binding_hash: "access-0155",
    client_id: item.client_id,
    items: [item],
    list_version: 7,
    masking_posture_fingerprint: "mask-0155",
    selected_item_ref_or_null: item.item_id,
    tenant_id: item.tenant_id,
    updated_at: "2026-05-03T09:00:00Z",
  });
  expect(requestList.cross_device_continuity_contract.canonical_object_ref).toBe(
    `client://${item.client_id}/requests`,
  );
  expect(requestList.cross_device_continuity_contract.focus_anchor_ref_or_null).toBe(
    `customer-request-row://${item.item_id}`,
  );
  expect(requestList.continuity_fallback_order.map((target) => target.target_kind)).toEqual([
    "EXACT_FOCUS",
    "OBJECT_SUMMARY",
    "PARENT_RETURN",
    "NARROWEST_SURVIVING_LIST",
  ]);
  await validatePayloadAgainstSchema(
    "cross_device_continuity_contract.schema.json",
    requestList.cross_device_continuity_contract,
  );

  const notification = buildWorkItemNotification({
    access_binding_hash: "access-0155",
    delivery_channel: "IN_APP",
    item,
    masking_posture_fingerprint: "mask-0155",
    notification_type: "REQUEST_INFO_OPENED",
    queued_at: "2026-05-03T09:10:00Z",
    recipient_ref: "client://client-0150",
    request_info_ref: request.request_info_id,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  expect(notification.cross_device_continuity_contract.continuity_scope).toBe(
    "WORK_ITEM_NOTIFICATION",
  );
  expect(notification.cross_device_continuity_contract.supported_invalidation_reason_codes).toEqual(
    ["ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "VIEW_GUARD_CHANGE", "OBJECT_GONE"],
  );
  await validatePayloadAgainstSchema(
    "cross_device_continuity_contract.schema.json",
    notification.cross_device_continuity_contract,
  );
});

test("fails closed on illegal continuity compatibility, return, and embodiment combinations", () => {
  expect(() =>
    buildCanonicalCrossDeviceContinuityContract({
      access_scope_hash_or_null: "access",
      canonical_object_ref: "object",
      compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
      continuity_scope: "CLIENT_PORTAL_ROUTE",
      masking_scope_fingerprint_or_null: "mask",
      parent_context_ref_or_null: null,
      return_focus_anchor_ref_or_null: "row://object",
      route_identity_ref: "/portal/requests/object",
      shell_family: "CLIENT_PORTAL_SHELL",
      stability_guard_hash_or_null: "guard",
      visibility_cache_partition_key_or_null: "cache",
    }),
  ).toThrow(WorkflowModelError);

  expect(() =>
    buildCanonicalCrossDeviceContinuityContract({
      access_scope_hash_or_null: "access",
      allowed_embodiments: ["BROWSER_WIDE", "BROWSER_NARROW_STACKED"],
      canonical_object_ref: "object",
      compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
      continuity_scope: "WORKSPACE_ROUTE",
      masking_scope_fingerprint_or_null: "mask",
      parent_context_ref_or_null: "/work",
      return_focus_anchor_ref_or_null: "row://object",
      route_identity_ref: "/work/items/object",
      secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND",
      shell_family: "CALM_SHELL",
      stability_guard_hash_or_null: "guard",
      visibility_cache_partition_key_or_null: "cache",
    }),
  ).toThrow(WorkflowModelError);
});

test("notification-open continuity degrades to object summary before parent return and invalidates typed drift", () => {
  const item = workflowProjectionItem({ item_id: "workflow-item-0155-notification" });
  const notification = buildWorkItemNotification({
    access_binding_hash: "access-0155",
    delivery_channel: "IN_APP",
    item,
    masking_posture_fingerprint: "mask-0155",
    notification_type: "CUSTOMER_VISIBLE_COMMENT",
    queued_at: "2026-05-03T09:20:00Z",
    recipient_ref: "client://client-0150",
    visibility_class: "CUSTOMER_VISIBLE",
  });

  const fallback = stampNotificationOpenContinuityMetadata({
    focus_anchor_available: false,
    notification,
  });
  expect(fallback.open_state).toBe("FALLBACK_OBJECT_SUMMARY");
  expect(fallback.focus_restoration.restoration_disposition).toBe("OBJECT_SUMMARY");
  expect(fallback.continuity_fallback_order.map((target) => target.target_kind)).toEqual([
    "EXACT_FOCUS",
    "OBJECT_SUMMARY",
    "PARENT_RETURN",
    "NARROWEST_SURVIVING_LIST",
  ]);

  const invalidated = stampNotificationOpenContinuityMetadata({
    current_access_binding_hash: "access-new",
    notification,
    object_exists: false,
    session_revoked: true,
  });
  expect(invalidated.open_state).toBe("SUPPRESSED");
  expect(invalidated.invalidation_reason_codes).toEqual([
    "ACCESS_BINDING_CHANGE",
    "SESSION_REVOKED",
    "OBJECT_GONE",
  ]);
  expect(invalidated.focus_restoration.restoration_disposition).toBe("INVALIDATED");
});
