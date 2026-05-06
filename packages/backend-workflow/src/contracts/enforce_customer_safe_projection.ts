import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  projectionHash,
  type ActionAuthorityContract,
  type CustomerSafeProjectionContract,
  type VisibilityPartitionContract,
} from "../projectors/projection_contract_helpers.ts";
import {
  findInternalOnlyProjectionFieldFamilies,
  type InternalOnlyProjectionFieldFamily,
} from "./strip_internal_only_projection_fields.ts";
import { validateCustomerSafeActionContract } from "./validate_customer_safe_action_contract.ts";
import { validatePortalSameShellNavigationContract } from "./validate_portal_same_shell_navigation_contract.ts";

export type CustomerSafeProjectionRequirement = "REQUIRED" | "FORBIDDEN" | "OPTIONAL";

export type EnforceCustomerSafeProjectionInput = {
  artifact: Record<string, unknown>;
  artifact_label?: string | undefined;
  expected_boundary_scope?: CustomerSafeProjectionContract["boundary_scope"] | undefined;
  expected_projection_audience?: CustomerSafeProjectionContract["projection_audience"] | undefined;
  requirement?: CustomerSafeProjectionRequirement | undefined;
  visibility_partition?: VisibilityPartitionContract | undefined;
};

const BLOCKED_STAFF_SIGNAL_CLASSES: InternalOnlyProjectionFieldFamily[] = [
  "ASSIGNMENT_STATE",
  "ESCALATION_LOGIC",
  "RAW_GATE_STATE",
  "STAFF_REASON_CODES",
  "AUDIT_LINEAGE",
  "INTERNAL_ACTIVITY",
  "INTERNAL_ATTACHMENTS",
  "INTERNAL_PARTICIPANTS",
  "INTERNAL_COUNTS",
  "STAFF_ROUTE_CONTEXT",
];

function fail(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(label: string, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireExact<T extends string>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    fail(`${label} must be ${expected}`);
  }
  return expected;
}

function normalizeCustomerSafeProjection(value: unknown): CustomerSafeProjectionContract {
  const input = requireRecord("customer_safe_projection", value);
  return {
    access_binding_hash: requireString(
      "customer_safe_projection.access_binding_hash",
      input.access_binding_hash,
    ),
    artifact_history_policy: requireExact(
      "customer_safe_projection.artifact_history_policy",
      input.artifact_history_policy,
      "CURRENT_VERSUS_HISTORY_EXPLICIT",
    ),
    attachment_visibility_policy: requireExact(
      "customer_safe_projection.attachment_visibility_policy",
      input.attachment_visibility_policy,
      "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    ),
    blocked_staff_signal_classes: normalizeBlockedSignalClasses(
      input.blocked_staff_signal_classes,
    ),
    boundary_scope: requireString(
      "customer_safe_projection.boundary_scope",
      input.boundary_scope,
    ) as CustomerSafeProjectionContract["boundary_scope"],
    contract_version: requireExact(
      "customer_safe_projection.contract_version",
      input.contract_version,
      "CUSTOMER_SAFE_PROJECTION_V1",
    ),
    draft_placeholder_policy: requireExact(
      "customer_safe_projection.draft_placeholder_policy",
      input.draft_placeholder_policy,
      "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    ),
    export_visibility_policy: requireExact(
      "customer_safe_projection.export_visibility_policy",
      input.export_visibility_policy,
      "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    ),
    hidden_activity_policy: requireExact(
      "customer_safe_projection.hidden_activity_policy",
      input.hidden_activity_policy,
      "NO_HIDDEN_ACTIVITY_DERIVATION",
    ),
    limitation_notice_policy: requireExact(
      "customer_safe_projection.limitation_notice_policy",
      input.limitation_notice_policy,
      "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    ),
    live_update_visibility_policy: requireExact(
      "customer_safe_projection.live_update_visibility_policy",
      input.live_update_visibility_policy,
      "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    ),
    masking_posture_fingerprint: requireString(
      "customer_safe_projection.masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    module_projection_policy: requireExact(
      "customer_safe_projection.module_projection_policy",
      input.module_projection_policy,
      "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    ),
    notification_navigation_policy: requireExact(
      "customer_safe_projection.notification_navigation_policy",
      input.notification_navigation_policy,
      "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    ),
    plain_language_action_policy: requireExact(
      "customer_safe_projection.plain_language_action_policy",
      input.plain_language_action_policy,
      "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    ),
    plain_language_status_policy: requireExact(
      "customer_safe_projection.plain_language_status_policy",
      input.plain_language_status_policy,
      "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    ),
    projection_audience: requireString(
      "customer_safe_projection.projection_audience",
      input.projection_audience,
    ) as CustomerSafeProjectionContract["projection_audience"],
    recovery_explanation_policy: requireExact(
      "customer_safe_projection.recovery_explanation_policy",
      input.recovery_explanation_policy,
      "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    ),
    shell_family: requireExact(
      "customer_safe_projection.shell_family",
      input.shell_family,
      "CLIENT_PORTAL_SHELL",
    ),
    staff_field_dependency_policy: requireExact(
      "customer_safe_projection.staff_field_dependency_policy",
      input.staff_field_dependency_policy,
      "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    ),
    status_derivation_policy: requireExact(
      "customer_safe_projection.status_derivation_policy",
      input.status_derivation_policy,
      "CUSTOMER_SAFE_BLOCKS_ONLY",
    ),
    visibility_cache_partition_key: requireString(
      "customer_safe_projection.visibility_cache_partition_key",
      input.visibility_cache_partition_key,
    ),
  };
}

function normalizeBlockedSignalClasses(value: unknown): InternalOnlyProjectionFieldFamily[] {
  if (!Array.isArray(value)) {
    fail("customer_safe_projection.blocked_staff_signal_classes must be an array");
  }
  const normalized = value.map((entry) => {
    if (!BLOCKED_STAFF_SIGNAL_CLASSES.includes(entry as InternalOnlyProjectionFieldFamily)) {
      fail("customer_safe_projection.blocked_staff_signal_classes contains an unknown family");
    }
    return entry as InternalOnlyProjectionFieldFamily;
  });
  if (
    normalized.length !== BLOCKED_STAFF_SIGNAL_CLASSES.length ||
    new Set(normalized).size !== normalized.length
  ) {
    fail("customer_safe_projection.blocked_staff_signal_classes must contain each blocked family once");
  }
  if (projectionHash(normalized.sort()) !== projectionHash([...BLOCKED_STAFF_SIGNAL_CLASSES].sort())) {
    fail("customer_safe_projection.blocked_staff_signal_classes drifted");
  }
  return normalized;
}

function inferRequirement(artifact: Record<string, unknown>): CustomerSafeProjectionRequirement {
  if (artifact.artifact_type === "CustomerRequestListSnapshot") {
    return "REQUIRED";
  }
  if (artifact.artifact_type === "WorkspaceSnapshot") {
    return artifact.viewer_scope === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN";
  }
  if (artifact.artifact_type === "CollaborationActivitySlice") {
    return artifact.viewer_scope === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN";
  }
  if (artifact.artifact_type === "CollaborationAttachmentSlice") {
    return artifact.viewer_scope === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN";
  }
  if (artifact.artifact_type === "WorkspaceStreamEvent") {
    return artifact.visibility_class === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN";
  }
  if (artifact.visibility_class === "CUSTOMER_VISIBLE") {
    return "REQUIRED";
  }
  if (artifact.visibility_class === "INTERNAL_ONLY" || artifact.viewer_scope === "STAFF_FULL") {
    return "FORBIDDEN";
  }
  return "OPTIONAL";
}

function validateTopLevelMirror(input: {
  artifact: Record<string, unknown>;
  customerSafeProjection: CustomerSafeProjectionContract;
  visibilityPartition?: VisibilityPartitionContract | undefined;
}) {
  if (
    input.artifact.access_binding_hash !== undefined &&
    input.artifact.access_binding_hash !== input.customerSafeProjection.access_binding_hash
  ) {
    fail("customer_safe_projection.access_binding_hash must mirror artifact access binding");
  }
  if (
    input.artifact.masking_posture_fingerprint !== undefined &&
    input.artifact.masking_posture_fingerprint !==
      input.customerSafeProjection.masking_posture_fingerprint
  ) {
    fail("customer_safe_projection.masking_posture_fingerprint must mirror artifact masking posture");
  }
  if (input.visibilityPartition !== undefined) {
    if (
      input.customerSafeProjection.access_binding_hash !==
        input.visibilityPartition.access_binding_hash ||
      input.customerSafeProjection.masking_posture_fingerprint !==
        input.visibilityPartition.masking_posture_fingerprint ||
      input.customerSafeProjection.visibility_cache_partition_key !==
        input.visibilityPartition.cache_partition_key
    ) {
      fail("customer_safe_projection must mirror visibility access, masking, and cache partition");
    }
  }
}

function validateCustomerVisibleFieldFamilies(
  artifact: Record<string, unknown>,
  artifactLabel: string,
) {
  const leakage = findInternalOnlyProjectionFieldFamilies(artifact);
  if (leakage.field_families.length > 0) {
    fail(
      `${artifactLabel} leaked internal-only field families: ${leakage.field_families.join(", ")} at ${leakage.paths.join(", ")}`,
    );
  }
}

function validateEmbeddedActions(input: {
  artifact: Record<string, unknown>;
  customerSafeProjection: CustomerSafeProjectionContract;
  visibilityPartition: VisibilityPartitionContract | undefined;
}) {
  if (input.visibilityPartition === undefined) {
    return;
  }
  const actions: ActionAuthorityContract[] = [];
  const actionStrip = input.artifact.action_strip;
  if (isRecord(actionStrip) && isRecord(actionStrip.authoritative_action)) {
    actions.push(actionStrip.authoritative_action as ActionAuthorityContract);
  }
  const requestWorkspace = input.artifact.customer_request_workspace;
  if (isRecord(requestWorkspace) && isRecord(requestWorkspace.authoritative_action)) {
    actions.push(requestWorkspace.authoritative_action as ActionAuthorityContract);
  }
  const rows = input.artifact.rows;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (isRecord(row) && isRecord(row.authoritative_action)) {
        actions.push(row.authoritative_action as ActionAuthorityContract);
      }
    }
  }
  for (const action of actions) {
    validateCustomerSafeActionContract({
      action,
      customer_safe_projection: input.customerSafeProjection,
      visibility_partition: input.visibilityPartition,
    });
  }
}

export function enforceCustomerSafeProjection(
  input: EnforceCustomerSafeProjectionInput,
): CustomerSafeProjectionContract | null {
  const label = input.artifact_label ?? String(input.artifact.artifact_type ?? "artifact");
  const requirement = input.requirement ?? inferRequirement(input.artifact);
  const rawProjection = input.artifact.customer_safe_projection;

  if (requirement === "FORBIDDEN") {
    if (rawProjection !== null && rawProjection !== undefined) {
      fail(`${label} must not publish customer_safe_projection`);
    }
    return null;
  }
  if (rawProjection === null || rawProjection === undefined) {
    if (requirement === "REQUIRED") {
      fail(`${label} requires customer_safe_projection`);
    }
    return null;
  }

  const customerSafeProjection = normalizeCustomerSafeProjection(rawProjection);
  if (
    input.expected_boundary_scope !== undefined &&
    customerSafeProjection.boundary_scope !== input.expected_boundary_scope
  ) {
    fail(`${label} customer_safe_projection.boundary_scope drifted`);
  }
  if (
    input.expected_projection_audience !== undefined &&
    customerSafeProjection.projection_audience !== input.expected_projection_audience
  ) {
    fail(`${label} customer_safe_projection.projection_audience drifted`);
  }
  validateTopLevelMirror({
    artifact: input.artifact,
    customerSafeProjection,
    visibilityPartition: input.visibility_partition,
  });
  validatePortalSameShellNavigationContract({
    cross_device_continuity_contract: input.artifact.cross_device_continuity_contract,
    customer_safe_projection: customerSafeProjection,
    fallback_route_ref: input.artifact.fallback_route_ref,
    return_route_ref: input.artifact.return_route_ref,
    route_context: input.artifact.route_context,
    shell_family: input.artifact.shell_family,
    target_module_code: input.artifact.target_module_code,
    target_route_ref: input.artifact.target_route_ref,
    workspace_route_key: input.artifact.workspace_route_key,
  });
  validateEmbeddedActions({
    artifact: input.artifact,
    customerSafeProjection,
    visibilityPartition: input.visibility_partition,
  });
  validateCustomerVisibleFieldFamilies(input.artifact, label);

  return customerSafeProjection;
}
