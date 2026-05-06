const binding = {
  access: "access-0152-preview",
  cache: "projection-cache://WORKSPACE_SNAPSHOT/preview-customer-visible",
  masking: "mask-0152-preview",
};

const candidate = {
  access_binding_hash: binding.access,
  artifact_type: "WorkspaceSnapshot",
  current_assignee_ref: "user://staff-owner",
  customer_safe_projection: {
    access_binding_hash: binding.access,
    boundary_scope: "WORKSPACE_CUSTOMER_REQUEST",
    masking_posture_fingerprint: binding.masking,
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    visibility_cache_partition_key: binding.cache,
  },
  internal_activity_module_badge_count_or_null: 4,
  internal_head_sequence_or_null: 17,
  internal_only_file_refs: ["attachment://internal-review-pack"],
  route_context: {
    active_module_code: "INTERNAL_ACTIVITY",
    active_route_ref: "/work/items/workflow-item-0152-preview",
  },
  title: "Upload payroll records",
  visibility_partition: {
    access_binding_hash: binding.access,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    cache_partition_key: binding.cache,
    masking_posture_fingerprint: binding.masking,
    partition_scope: "WORKSPACE_SNAPSHOT",
  },
};

const published = {
  access_binding_hash: binding.access,
  artifact_type: "WorkspaceSnapshot",
  customer_safe_projection: {
    access_binding_hash: binding.access,
    boundary_scope: "WORKSPACE_CUSTOMER_REQUEST",
    masking_posture_fingerprint: binding.masking,
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    visibility_cache_partition_key: binding.cache,
  },
  customer_request_workspace: {
    current_artifact_ref_or_null: "download://workflow-item-0152-preview/current",
    historical_artifact_refs: ["download://workflow-item-0152-preview/history"],
    primary_action_code_or_null: "RESPOND_TO_REQUEST_INFO",
    status_code: "ACTION_REQUIRED",
  },
  shell_family: "CLIENT_PORTAL_SHELL",
  title: "Upload payroll records",
  visibility_partition: {
    access_binding_hash: binding.access,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    cache_partition_key: binding.cache,
    masking_posture_fingerprint: binding.masking,
    partition_scope: "WORKSPACE_SNAPSHOT",
  },
  workspace_route_key: "/portal/requests/workflow-item-0152-preview",
};

const strippedFamilies = [
  "ASSIGNMENT_STATE",
  "INTERNAL_ACTIVITY",
  "INTERNAL_ATTACHMENTS",
  "INTERNAL_COUNTS",
  "STAFF_ROUTE_CONTEXT",
];

document.getElementById("access-binding").textContent = binding.access;
document.getElementById("masking").textContent = binding.masking;
document.getElementById("cache-partition").textContent = binding.cache;
document.getElementById("candidate-payload").textContent = JSON.stringify(candidate, null, 2);
document.getElementById("published-payload").textContent = JSON.stringify(published, null, 2);

const chipHost = document.getElementById("stripped-families");
for (const family of strippedFamilies) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.dataset.testid = "stripped-field-family-chip";
  chip.textContent = family;
  chipHost.append(chip);
}
