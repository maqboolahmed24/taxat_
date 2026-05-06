import { WorkflowModelError } from "../models/workflow_item.ts";
import type {
  ActionAuthorityContract,
  CustomerSafeProjectionContract,
  VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";

const CUSTOMER_SAFE_ACTION_CODES = new Set([
  "REPLY",
  "UPLOAD_FILE",
  "RESPOND_TO_REQUEST_INFO",
]);
const CUSTOMER_SAFE_MODULE_CODES = new Set(["CUSTOMER_ACTIVITY", "FILES"]);
const CUSTOMER_SAFE_STATUS_OR_REASON_CODES = new Set([
  "ACTION_REQUIRED",
  "COMPLETED",
  "CUSTOMER_ACTION_READY",
  "DUE_SOON",
  "IN_REVIEW",
  "NO_SAFE_ACTION",
  "NONE",
  "ON_TRACK",
  "OVERDUE",
  "WAITING_ON_AUTHORITY",
  "WAITING_ON_US",
]);
const PORTAL_ROUTE_RE = /^\/portal(?:\/requests(?:\/[^\s]+)?|\/approvals|\/help)?$/;

export type ValidateCustomerSafeActionContractInput = {
  action: ActionAuthorityContract;
  customer_safe_projection: CustomerSafeProjectionContract;
  visibility_partition: VisibilityPartitionContract;
};

function fail(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function assertCustomerActionCode(label: string, value: string | null) {
  if (value !== null && !CUSTOMER_SAFE_ACTION_CODES.has(value)) {
    fail(`${label} must use the customer-safe action vocabulary`);
  }
}

function assertCustomerActionCodes(label: string, values: readonly string[]) {
  for (const value of values) {
    assertCustomerActionCode(label, value);
  }
}

function assertPortalRoute(label: string, value: string | null) {
  if (value !== null && !PORTAL_ROUTE_RE.test(value)) {
    fail(`${label} must stay inside the portal same-shell route family`);
  }
}

function assertCustomerReasonCodes(label: string, values: readonly string[]) {
  for (const value of values) {
    if (!CUSTOMER_SAFE_STATUS_OR_REASON_CODES.has(value)) {
      fail(`${label} contains customer-unsafe reason code ${value}`);
    }
  }
}

export function validateCustomerSafeActionContract(
  input: ValidateCustomerSafeActionContractInput,
): ActionAuthorityContract {
  const action = input.action;
  if (!action.customer_safe_projection) {
    fail("customer-safe action contract must declare customer_safe_projection=true");
  }
  if (action.access_binding_hash !== input.customer_safe_projection.access_binding_hash) {
    fail("customer-safe action access binding must mirror customer_safe_projection");
  }
  if (action.visibility_cache_partition_key !== input.visibility_partition.cache_partition_key) {
    fail("customer-safe action visibility cache partition must mirror visibility_partition");
  }
  assertCustomerActionCode("primary_action_code_or_null", action.primary_action_code_or_null);
  assertCustomerActionCodes("available_action_codes", action.available_action_codes);
  assertCustomerActionCodes("blocked_action_codes", action.blocked_action_codes);
  assertCustomerActionCodes("secondary_action_codes", action.secondary_action_codes);
  assertCustomerReasonCodes("machine_reason_codes", action.machine_reason_codes);
  if (
    action.blocking_reason_code_or_null !== null &&
    !CUSTOMER_SAFE_STATUS_OR_REASON_CODES.has(action.blocking_reason_code_or_null)
  ) {
    fail("blocking_reason_code_or_null must use customer-safe status vocabulary");
  }
  if (
    action.suggested_module_code_or_null !== null &&
    !CUSTOMER_SAFE_MODULE_CODES.has(action.suggested_module_code_or_null)
  ) {
    fail("customer-safe action suggested module must stay customer-visible");
  }
  assertPortalRoute("projection_route_key", action.projection_route_key);
  assertPortalRoute("recovery_route_ref_or_null", action.recovery_route_ref_or_null);
  return action;
}
