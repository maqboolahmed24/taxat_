import { WorkflowModelError } from "../models/workflow_item.ts";
import type { CustomerSafeProjectionContract } from "../projectors/projection_contract_helpers.ts";

export type PortalSameShellNavigationContract = {
  cross_device_continuity_contract?: unknown;
  customer_safe_projection: CustomerSafeProjectionContract;
  fallback_route_ref?: unknown;
  return_route_ref?: unknown;
  route_context?: unknown;
  shell_family?: unknown;
  target_module_code?: unknown;
  target_route_ref?: unknown;
  workspace_route_key?: unknown;
};

const PORTAL_ROUTE_RE = /^\/portal(?:\/requests(?:\/[^\s]+)?|\/approvals|\/help)?$/;
const BLOCKED_PORTAL_MODULES = new Set(["INTERNAL_ACTIVITY", "LINKED_CONTEXT", "AUDIT_TRAIL"]);

function fail(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertPortalRoute(label: string, value: unknown) {
  if (value !== undefined && value !== null && (typeof value !== "string" || !PORTAL_ROUTE_RE.test(value))) {
    fail(`${label} must stay inside the portal same-shell route family`);
  }
}

function assertNoStaffModule(label: string, value: unknown) {
  if (typeof value === "string" && BLOCKED_PORTAL_MODULES.has(value)) {
    fail(`${label} must not point at a staff-only module`);
  }
}

export function validatePortalSameShellNavigationContract(
  input: PortalSameShellNavigationContract,
): PortalSameShellNavigationContract {
  if (input.customer_safe_projection.shell_family !== "CLIENT_PORTAL_SHELL") {
    fail("customer_safe_projection.shell_family must stay CLIENT_PORTAL_SHELL");
  }
  if (input.shell_family !== undefined && input.shell_family !== "CLIENT_PORTAL_SHELL") {
    fail("customer-visible artifact shell_family must stay CLIENT_PORTAL_SHELL");
  }

  assertPortalRoute("target_route_ref", input.target_route_ref);
  assertPortalRoute("return_route_ref", input.return_route_ref);
  assertPortalRoute("fallback_route_ref", input.fallback_route_ref);
  assertPortalRoute("workspace_route_key", input.workspace_route_key);
  assertNoStaffModule("target_module_code", input.target_module_code);

  if (isRecord(input.route_context)) {
    assertPortalRoute("route_context.active_route_ref", input.route_context.active_route_ref);
    assertPortalRoute("route_context.return_route_ref", input.route_context.return_route_ref);
    assertPortalRoute("route_context.fallback_route_ref", input.route_context.fallback_route_ref);
    assertNoStaffModule("route_context.active_module_code", input.route_context.active_module_code);
  }

  if (isRecord(input.cross_device_continuity_contract)) {
    const continuity = input.cross_device_continuity_contract;
    if (continuity.shell_family !== "CLIENT_PORTAL_SHELL") {
      fail("cross_device_continuity_contract.shell_family must stay CLIENT_PORTAL_SHELL");
    }
    assertPortalRoute(
      "cross_device_continuity_contract.route_identity_ref",
      continuity.route_identity_ref,
    );
    assertPortalRoute(
      "cross_device_continuity_contract.parent_context_ref_or_null",
      continuity.parent_context_ref_or_null,
    );
  }

  return input;
}
