import type { CollaborationAttachment } from "../models/collaboration_attachment.ts";
import type { RequestInfoRecord } from "../models/request_info_record.ts";
import type { WorkItemNotification } from "../models/work_item_notification.ts";
import { assertCustomerSafeProjectionAlignment } from "../services/assert_customer_safe_projection_alignment.ts";
import {
  stampRequestListContinuityMetadata,
  type ContinuityFallbackTarget,
} from "../services/stamp_request_list_continuity_metadata.ts";
import type { CanonicalCrossDeviceContinuityContract } from "../contracts/build_cross_device_continuity_contract.ts";
import type { CanonicalFocusRestorationContract } from "../contracts/build_focus_restoration_contract.ts";
import {
  cloneWorkflowRecord,
  normalizeWorkflowItem,
  type WorkflowItem,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import {
  assertCustomerSafeCopy,
  assertNonNegativeInteger,
  buildActionAuthorityContract,
  buildCacheIsolationContract,
  buildCustomerSafeProjectionContract,
  buildPortalInteractionLayer,
  buildPortalLanguageContract,
  buildVisibilityPartitionContract,
  customerStatusLabel,
  dueLabelForItem,
  normalizeProjectorTimestamp,
  projectionHash,
  requireProjectorString,
  statusCodeForItem,
  truncateCustomerCopy,
  CUSTOMER_REQUEST_DUE_PRIORITY,
  CUSTOMER_REQUEST_QUEUE_GROUP_ORDER,
  CUSTOMER_REQUEST_ROW_BAND_ORDER,
  type ActionAuthorityContract,
  type CacheIsolationContract,
  type CustomerRequestDueState,
  type CustomerRequestStatusCode,
  type CustomerSafeProjectionContract,
  type VisibilityPartitionContract,
  type WorkspaceRecoveryPosture,
  type WorkspaceSettlementState,
} from "./projection_contract_helpers.ts";

export type CustomerRequestListActiveFilters = {
  due_states: CustomerRequestDueState[];
  files_requested_only: boolean;
  status_codes: CustomerRequestStatusCode[];
  unread_only: boolean;
};

export type CustomerRequestListRow = {
  artifact_history_state: "NO_SHARED_FILES" | "CURRENT_ONLY" | "CURRENT_PLUS_HISTORY" | "HISTORY_ONLY" | "LIMITED";
  authoritative_action: ActionAuthorityContract;
  current_artifact_ref_or_null: string | null;
  due_at_or_null: string | null;
  due_label_ref_or_null: string | null;
  due_state: CustomerRequestDueState;
  files_requested: boolean;
  focus_anchor_ref: string;
  historical_artifact_refs: string[];
  item_id: string;
  last_staff_update_at_or_null: string | null;
  no_safe_action_reason_ref_or_null: string | null;
  primary_action_code_or_null: "REPLY" | "UPLOAD_FILE" | "RESPOND_TO_REQUEST_INFO" | null;
  primary_action_label_ref_or_null: string | null;
  status_code: CustomerRequestStatusCode;
  status_label_ref: string;
  title: string;
  unread_count: number;
};

export type CustomerRequestListSnapshot = {
  access_binding_hash: string;
  active_filters: CustomerRequestListActiveFilters;
  artifact_type: "CustomerRequestListSnapshot";
  cache_isolation_contract: CacheIsolationContract;
  client_id: string;
  continuity_fallback_order: ContinuityFallbackTarget[];
  cross_device_continuity_contract: CanonicalCrossDeviceContinuityContract;
  customer_safe_projection: CustomerSafeProjectionContract;
  dominant_question: string;
  focus_restoration: CanonicalFocusRestorationContract;
  interaction_layer: ReturnType<typeof buildPortalInteractionLayer>;
  language_contract: ReturnType<typeof buildPortalLanguageContract>;
  last_published_sequence: number;
  list_version: number;
  masking_posture_fingerprint: string;
  object_anchor_ref: string;
  queue_group_order: typeof CUSTOMER_REQUEST_QUEUE_GROUP_ORDER;
  recovery_posture: WorkspaceRecoveryPosture;
  request_list_route_key: "/portal/requests";
  resume_token: string;
  row_band_order: typeof CUSTOMER_REQUEST_ROW_BAND_ORDER;
  rows: CustomerRequestListRow[];
  selected_focus_anchor_ref_or_null: string | null;
  selected_item_ref_or_null: string | null;
  settlement_state: WorkspaceSettlementState;
  shell_family: "CLIENT_PORTAL_SHELL";
  tenant_id: string;
  updated_at: string;
  visibility_partition: VisibilityPartitionContract;
};

export type BuildCustomerRequestListSnapshotInput = {
  access_binding_hash: string;
  active_filters?: CustomerRequestListActiveFilters | undefined;
  attachments?: readonly CollaborationAttachment[] | undefined;
  cache_partition_key?: string | undefined;
  client_id: string;
  items: readonly WorkflowItem[];
  list_version?: number | undefined;
  masking_posture_fingerprint: string;
  notifications?: readonly WorkItemNotification[] | undefined;
  principal_class?: string | undefined;
  request_info_records?: readonly RequestInfoRecord[] | undefined;
  selected_item_ref_or_null?: string | null | undefined;
  session_binding_hash?: string | undefined;
  tenant_id: string;
  updated_at?: string | undefined;
};

function customerSafeTitle(item: WorkflowItem) {
  const title = truncateCustomerCopy(item.title, 72);
  try {
    assertCustomerSafeCopy("request title", title);
    return title;
  } catch (_error) {
    return `Request for ${item.period}`;
  }
}

function artifactState(input: {
  current_artifact_ref_or_null: string | null;
  historical_artifact_refs: readonly string[];
}) {
  if (input.current_artifact_ref_or_null === null && input.historical_artifact_refs.length === 0) {
    return "NO_SHARED_FILES" as const;
  }
  if (input.current_artifact_ref_or_null !== null && input.historical_artifact_refs.length === 0) {
    return "CURRENT_ONLY" as const;
  }
  if (input.current_artifact_ref_or_null !== null && input.historical_artifact_refs.length > 0) {
    return "CURRENT_PLUS_HISTORY" as const;
  }
  return "HISTORY_ONLY" as const;
}

function deriveDue(item: WorkflowItem): {
  due_at_or_null: string | null;
  due_label_ref_or_null: string | null;
  due_state: CustomerRequestDueState;
} {
  const dueAt = item.customer_due_at ?? item.due_at;
  if (dueAt === null) {
    return {
      due_at_or_null: null,
      due_label_ref_or_null: null,
      due_state: "NONE",
    };
  }
  const dueState =
    item.due_state === "OVERDUE" || item.due_state === "BREACHED"
      ? "OVERDUE"
      : item.due_state === "DUE_SOON"
        ? "DUE_SOON"
        : "ON_TRACK";
  return {
    due_at_or_null: dueAt,
    due_label_ref_or_null: dueLabelForItem({
      due_at_or_null: dueAt,
      due_state: dueState,
    }),
    due_state: dueState,
  };
}

function currentAndHistoricalArtifactRefs(input: {
  attachments: readonly CollaborationAttachment[];
  item_id: string;
}) {
  const shared = input.attachments
    .filter(
      (attachment) =>
        attachment.item_id === input.item_id &&
        attachment.visibility_class === "CUSTOMER_VISIBLE" &&
        attachment.publication_state === "AVAILABLE" &&
        attachment.download_state === "DOWNLOADABLE",
    )
    .sort(
      (left, right) =>
        right.published_at.localeCompare(left.published_at) ||
        right.attachment_id.localeCompare(left.attachment_id),
    );
  const current = shared[0]?.download_ref ?? shared[0]?.attachment_id ?? null;
  const historical = shared
    .slice(current === null ? 0 : 1)
    .map((attachment) => attachment.download_ref ?? attachment.attachment_id);
  return {
    current_artifact_ref_or_null: current,
    historical_artifact_refs: historical,
  };
}

function activeRequestForItem(input: {
  item: WorkflowItem;
  request_info_records: readonly RequestInfoRecord[];
}) {
  const byActiveRef = input.item.active_request_info_ref === null
    ? null
    : input.request_info_records.find(
        (record) =>
          record.item_id === input.item.item_id &&
          record.request_info_id === input.item.active_request_info_ref &&
          record.lifecycle_state === "OPEN",
      ) ?? null;
  return byActiveRef ??
    input.request_info_records.find(
      (record) => record.item_id === input.item.item_id && record.lifecycle_state === "OPEN",
    ) ??
    null;
}

function unreadNotificationCount(input: {
  item_id: string;
  notifications: readonly WorkItemNotification[];
}) {
  return input.notifications.filter(
    (notification) =>
      notification.item_id === input.item_id &&
      notification.visibility_class === "CUSTOMER_VISIBLE" &&
      notification.delivered_at !== null &&
      notification.read_at === null &&
      notification.suppressed_reason_codes.length === 0,
  ).length;
}

function deriveUpdatedAt(input: {
  items: readonly WorkflowItem[];
  updated_at?: string | undefined;
}) {
  if (input.updated_at !== undefined) {
    return normalizeProjectorTimestamp("updated_at", input.updated_at);
  }
  const candidates = input.items
    .flatMap((item) => [
      item.last_customer_activity_at,
      item.last_internal_activity_at,
      item.waiting_since_at,
      item.queue_entered_at,
    ])
    .filter((value): value is string => value !== null);
  const latest = candidates.sort().at(-1) ?? "1970-01-01T00:00:00Z";
  return normalizeProjectorTimestamp("updated_at", latest);
}

function normalizeActiveFilters(filters: CustomerRequestListActiveFilters | undefined): CustomerRequestListActiveFilters {
  return {
    due_states: [...(filters?.due_states ?? [])],
    files_requested_only: filters?.files_requested_only ?? false,
    status_codes: [...(filters?.status_codes ?? [])],
    unread_only: filters?.unread_only ?? false,
  };
}

function rowFocusAnchor(itemId: string) {
  return `customer-request-row://${itemId}`;
}

function rowRoute(itemId: string) {
  return `/portal/requests/${itemId}`;
}

function buildRow(input: {
  access_binding_hash: string;
  attachments: readonly CollaborationAttachment[];
  item: WorkflowItem;
  list_version: number;
  notifications: readonly WorkItemNotification[];
  request_info_records: readonly RequestInfoRecord[];
  request_list_route_key: "/portal/requests";
  visibility_cache_partition_key: string;
}): CustomerRequestListRow {
  const item = input.item;
  const statusCode = statusCodeForItem(item);
  const due = deriveDue(item);
  const activeRequest = activeRequestForItem({
    item,
    request_info_records: input.request_info_records,
  });
  const filesRequested = activeRequest !== null;
  const actionAvailable = statusCode === "ACTION_REQUIRED";
  const primaryActionCode = actionAvailable ? "RESPOND_TO_REQUEST_INFO" : null;
  const focusAnchor = rowFocusAnchor(item.item_id);
  const actionBasisHash = projectionHash({
    active_request_info_ref: activeRequest?.request_info_id ?? null,
    item_id: item.item_id,
    list_version: input.list_version,
    primary_action_code: primaryActionCode,
    status_code: statusCode,
  });
  const artifacts = currentAndHistoricalArtifactRefs({
    attachments: input.attachments,
    item_id: item.item_id,
  });
  return {
    artifact_history_state: artifactState(artifacts),
    authoritative_action: buildActionAuthorityContract({
      access_binding_hash: input.access_binding_hash,
      actionability_state: actionAvailable ? "ACTION_AVAILABLE" : "NO_SAFE_ACTION",
      available_action_codes: primaryActionCode === null ? [] : [primaryActionCode],
      basis_hash: actionBasisHash,
      blocked_action_codes: actionAvailable ? [] : ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"],
      blocking_reason_code_or_null: actionAvailable ? null : statusCode,
      customer_safe_projection: true,
      machine_reason_codes: actionAvailable ? ["CUSTOMER_ACTION_READY"] : [statusCode],
      primary_action_code_or_null: primaryActionCode,
      projection_route_key: input.request_list_route_key,
      projection_scope: "CUSTOMER_REQUEST_ROW",
      projection_version: input.list_version,
      recovery_focus_anchor_ref_or_null: actionAvailable ? null : focusAnchor,
      recovery_route_ref_or_null: actionAvailable ? null : rowRoute(item.item_id),
      secondary_action_codes: [],
      suggested_module_code_or_null: actionAvailable ? null : "CUSTOMER_ACTIVITY",
      visibility_cache_partition_key: input.visibility_cache_partition_key,
    }),
    current_artifact_ref_or_null: artifacts.current_artifact_ref_or_null,
    due_at_or_null: due.due_at_or_null,
    due_label_ref_or_null: due.due_label_ref_or_null,
    due_state: due.due_state,
    files_requested: filesRequested,
    focus_anchor_ref: focusAnchor,
    historical_artifact_refs: artifacts.historical_artifact_refs,
    item_id: item.item_id,
    last_staff_update_at_or_null: item.last_customer_activity_at,
    no_safe_action_reason_ref_or_null: actionAvailable ? null : customerStatusLabel(statusCode),
    primary_action_code_or_null: primaryActionCode,
    primary_action_label_ref_or_null: actionAvailable ? "Reply" : null,
    status_code: statusCode,
    status_label_ref: customerStatusLabel(statusCode),
    title: customerSafeTitle(item),
    unread_count: unreadNotificationCount({
      item_id: item.item_id,
      notifications: input.notifications,
    }),
  };
}

function rowMatchesFilters(row: CustomerRequestListRow, filters: CustomerRequestListActiveFilters) {
  if (filters.status_codes.length > 0 && !filters.status_codes.includes(row.status_code)) {
    return false;
  }
  if (filters.due_states.length > 0 && !filters.due_states.includes(row.due_state)) {
    return false;
  }
  if (filters.unread_only && row.unread_count === 0) {
    return false;
  }
  if (filters.files_requested_only && !row.files_requested) {
    return false;
  }
  return true;
}

function sortRows(left: CustomerRequestListRow, right: CustomerRequestListRow) {
  const leftStatus = CUSTOMER_REQUEST_QUEUE_GROUP_ORDER.indexOf(left.status_code);
  const rightStatus = CUSTOMER_REQUEST_QUEUE_GROUP_ORDER.indexOf(right.status_code);
  return (
    leftStatus - rightStatus ||
    CUSTOMER_REQUEST_DUE_PRIORITY[left.due_state] - CUSTOMER_REQUEST_DUE_PRIORITY[right.due_state] ||
    left.item_id.localeCompare(right.item_id)
  );
}

export function validateCustomerRequestListSnapshot(snapshot: CustomerRequestListSnapshot) {
  if (snapshot.shell_family !== "CLIENT_PORTAL_SHELL") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list must use portal shell");
  }
  if (snapshot.request_list_route_key !== "/portal/requests") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list route key must stay canonical");
  }
  if (snapshot.visibility_partition.partition_scope !== "CUSTOMER_REQUEST_LIST") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list visibility partition scope drifted");
  }
  if (
    snapshot.visibility_partition.audience_class !== "CLIENT_PORTAL" ||
    projectionHash(snapshot.visibility_partition.allowed_visibility_classes) !== projectionHash(["CUSTOMER_VISIBLE"])
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list visibility partition leaked");
  }
  if (
    snapshot.customer_safe_projection.boundary_scope !== "CUSTOMER_REQUEST_LIST" ||
    snapshot.customer_safe_projection.projection_audience !== "CLIENT_PORTAL"
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list customer-safe projection drifted");
  }
  if (snapshot.customer_safe_projection.visibility_cache_partition_key !== snapshot.visibility_partition.cache_partition_key) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list customer-safe cache partition drifted");
  }
  if (snapshot.cache_isolation_contract.cache_scope_class !== "CUSTOMER_REQUEST_LIST") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list cache isolation scope drifted");
  }
  if (
    snapshot.cross_device_continuity_contract.continuity_scope !== "CLIENT_PORTAL_ROUTE" ||
    snapshot.cross_device_continuity_contract.canonical_object_ref !== snapshot.object_anchor_ref ||
    snapshot.cross_device_continuity_contract.route_identity_ref !== snapshot.request_list_route_key ||
    snapshot.cross_device_continuity_contract.focus_anchor_ref_or_null !==
      snapshot.selected_focus_anchor_ref_or_null ||
    snapshot.cross_device_continuity_contract.access_scope_hash_or_null !== snapshot.access_binding_hash ||
    snapshot.cross_device_continuity_contract.masking_scope_fingerprint_or_null !==
      snapshot.masking_posture_fingerprint ||
    snapshot.cross_device_continuity_contract.visibility_cache_partition_key_or_null !==
      snapshot.visibility_partition.cache_partition_key
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list continuity metadata drifted");
  }
  if (
    snapshot.focus_restoration.restoration_disposition !== "EXACT_FOCUS" ||
    snapshot.focus_restoration.resolved_focus_anchor_ref_or_null !==
      snapshot.selected_focus_anchor_ref_or_null
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list focus restoration drifted");
  }
  if (
    snapshot.continuity_fallback_order.map((target) => target.target_kind).join(">") !==
    "EXACT_FOCUS>OBJECT_SUMMARY>PARENT_RETURN>NARROWEST_SURVIVING_LIST"
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list fallback order drifted");
  }
  assertCustomerSafeCopy("dominant question", snapshot.dominant_question);
  const seenRows = new Set<string>();
  const rowsById = new Map<string, CustomerRequestListRow>();
  let lastSort: [number, number] | null = null;
  for (const row of snapshot.rows) {
    if (seenRows.has(row.item_id)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list rows must be unique by item");
    }
    seenRows.add(row.item_id);
    rowsById.set(row.item_id, row);
    assertCustomerSafeCopy("request row title", row.title);
    assertCustomerSafeCopy("request row status", row.status_label_ref);
    if (row.due_label_ref_or_null !== null) {
      assertCustomerSafeCopy("request row due", row.due_label_ref_or_null);
    }
    if (row.primary_action_label_ref_or_null !== null) {
      assertCustomerSafeCopy("request row action label", row.primary_action_label_ref_or_null);
    }
    if (row.no_safe_action_reason_ref_or_null !== null) {
      assertCustomerSafeCopy("request row no-safe-action reason", row.no_safe_action_reason_ref_or_null);
    }
    if (row.authoritative_action.primary_action_code_or_null !== row.primary_action_code_or_null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "row action authority primary action drifted");
    }
    const expectedAvailable = row.primary_action_code_or_null === null ? [] : [row.primary_action_code_or_null];
    if (projectionHash(row.authoritative_action.available_action_codes) !== projectionHash(expectedAvailable)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "row action authority available actions drifted");
    }
    if (row.primary_action_code_or_null === null) {
      if (
        row.primary_action_label_ref_or_null !== null ||
        row.no_safe_action_reason_ref_or_null === null ||
        row.authoritative_action.recovery_route_ref_or_null !== rowRoute(row.item_id) ||
        row.authoritative_action.recovery_focus_anchor_ref_or_null !== row.focus_anchor_ref
      ) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "row no-safe-action posture drifted");
      }
    } else if (
      row.no_safe_action_reason_ref_or_null !== null ||
      row.authoritative_action.recovery_route_ref_or_null !== null ||
      row.authoritative_action.recovery_focus_anchor_ref_or_null !== null
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "row action recovery posture must clear when actionable");
    }
    const sortTuple: [number, number] = [
      CUSTOMER_REQUEST_QUEUE_GROUP_ORDER.indexOf(row.status_code),
      CUSTOMER_REQUEST_DUE_PRIORITY[row.due_state],
    ];
    if (lastSort !== null && (sortTuple[0] < lastSort[0] || (sortTuple[0] === lastSort[0] && sortTuple[1] < lastSort[1]))) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "request list rows must keep deterministic queue order");
    }
    lastSort = sortTuple;
  }
  if (snapshot.selected_item_ref_or_null === null) {
    if (snapshot.selected_focus_anchor_ref_or_null !== null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "selected focus must clear without selected row");
    }
  } else {
    const selectedRow = rowsById.get(snapshot.selected_item_ref_or_null);
    if (selectedRow === undefined || selectedRow.focus_anchor_ref !== snapshot.selected_focus_anchor_ref_or_null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "selected request row focus drifted");
    }
  }
}

export function customerRequestListSnapshotRef(snapshot: CustomerRequestListSnapshot) {
  return `customer-request-list-snapshot://${projectionHash({
    access_binding_hash: snapshot.access_binding_hash,
    client_id: snapshot.client_id,
    list_version: snapshot.list_version,
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    request_list_route_key: snapshot.request_list_route_key,
    tenant_id: snapshot.tenant_id,
  })}`;
}

export function customerRequestListSnapshotContentFingerprint(snapshot: CustomerRequestListSnapshot) {
  validateCustomerRequestListSnapshot(snapshot);
  return projectionHash(snapshot);
}

export function buildCustomerRequestListSnapshot(
  input: BuildCustomerRequestListSnapshotInput,
): CustomerRequestListSnapshot {
  const tenantId = requireProjectorString("tenant_id", input.tenant_id);
  const clientId = requireProjectorString("client_id", input.client_id);
  const accessBindingHash = requireProjectorString("access_binding_hash", input.access_binding_hash);
  const maskingPostureFingerprint = requireProjectorString(
    "masking_posture_fingerprint",
    input.masking_posture_fingerprint,
  );
  const items = input.items
    .map((item) => normalizeWorkflowItem(item))
    .filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.client_id === clientId &&
        item.collaboration_visibility === "CUSTOMER_SHARED",
    );
  const listVersion =
    input.list_version ?? Math.max(0, ...items.map((item) => item.customer_workspace_version));
  assertNonNegativeInteger("list_version", listVersion);
  const activeFilters = normalizeActiveFilters(input.active_filters);
  const requestListRouteKey = "/portal/requests" as const;
  const objectAnchorRef = `client://${clientId}/requests`;
  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: accessBindingHash,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    audience_class: "CLIENT_PORTAL",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    cache_partition_key: input.cache_partition_key,
    masking_posture_fingerprint: maskingPostureFingerprint,
    ordering_side_channel_policy: "CANONICAL_LIST_ONLY",
    partition_scope: "CUSTOMER_REQUEST_LIST",
    subject_ref: objectAnchorRef,
  });
  const rows = items
    .map((item) =>
      buildRow({
        access_binding_hash: accessBindingHash,
        attachments: input.attachments ?? [],
        item,
        list_version: listVersion,
        notifications: input.notifications ?? [],
        request_info_records: input.request_info_records ?? [],
        request_list_route_key: requestListRouteKey,
        visibility_cache_partition_key: visibilityPartition.cache_partition_key,
      }),
    )
    .filter((row) => rowMatchesFilters(row, activeFilters))
    .sort(sortRows);
  const selectedItemRef = input.selected_item_ref_or_null ?? null;
  const selectedRow = selectedItemRef === null ? null : rows.find((row) => row.item_id === selectedItemRef) ?? null;
  if (selectedItemRef !== null && selectedRow === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "selected request row is not in the returned list");
  }
  const updatedAt = deriveUpdatedAt({
    items,
    updated_at: input.updated_at,
  });
  const resumeToken = `customer-request-list-resume://${projectionHash({
    access_binding_hash: accessBindingHash,
    list_version: listVersion,
    masking_posture_fingerprint: maskingPostureFingerprint,
    request_list_route_key: requestListRouteKey,
    row_count: rows.length,
  })}`;
  const snapshot: CustomerRequestListSnapshot = stampRequestListContinuityMetadata({
    snapshot: {
    access_binding_hash: accessBindingHash,
    active_filters: activeFilters,
    artifact_type: "CustomerRequestListSnapshot",
    cache_isolation_contract: buildCacheIsolationContract({
      access_binding_hash: accessBindingHash,
      cache_partition_ref: visibilityPartition.cache_partition_key,
      cache_scope_class: "CUSTOMER_REQUEST_LIST",
      canonical_object_ref: objectAnchorRef,
      client_id_or_null: clientId,
      customer_safe_projection: true,
      masking_posture_fingerprint: maskingPostureFingerprint,
      principal_class: input.principal_class ?? "CLIENT_PORTAL_USER",
      projection_version_ref: String(listVersion),
      route_identity_ref: requestListRouteKey,
      session_binding_hash: input.session_binding_hash ?? `session-binding://client/${clientId}`,
      shell_family: "CLIENT_PORTAL_SHELL",
      shell_stability_ref_or_null: null,
      tenant_id: tenantId,
      visibility_cache_partition_key_or_null: visibilityPartition.cache_partition_key,
    }),
    client_id: clientId,
    customer_safe_projection: buildCustomerSafeProjectionContract({
      access_binding_hash: accessBindingHash,
      boundary_scope: "CUSTOMER_REQUEST_LIST",
      masking_posture_fingerprint: maskingPostureFingerprint,
      projection_audience: "CLIENT_PORTAL",
      visibility_cache_partition_key: visibilityPartition.cache_partition_key,
    }),
    dominant_question: "What needs your attention?",
    interaction_layer: buildPortalInteractionLayer(),
    language_contract: buildPortalLanguageContract(),
    last_published_sequence: listVersion,
    list_version: listVersion,
    masking_posture_fingerprint: maskingPostureFingerprint,
    object_anchor_ref: objectAnchorRef,
    queue_group_order: CUSTOMER_REQUEST_QUEUE_GROUP_ORDER,
    recovery_posture: "NONE",
    request_list_route_key: requestListRouteKey,
    resume_token: resumeToken,
    row_band_order: CUSTOMER_REQUEST_ROW_BAND_ORDER,
    rows: cloneWorkflowRecord(rows),
    selected_focus_anchor_ref_or_null: selectedRow?.focus_anchor_ref ?? null,
    selected_item_ref_or_null: selectedItemRef,
    settlement_state: "STEADY",
    shell_family: "CLIENT_PORTAL_SHELL",
    tenant_id: tenantId,
    updated_at: updatedAt,
      visibility_partition: visibilityPartition,
    },
  });
  validateCustomerRequestListSnapshot(snapshot);
  assertCustomerSafeProjectionAlignment({
    artifact: snapshot as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes: ["CUSTOMER_VISIBLE"],
    expected_boundary_scope: "CUSTOMER_REQUEST_LIST",
    expected_partition_scope: "CUSTOMER_REQUEST_LIST",
    expected_projection_audience: "CLIENT_PORTAL",
    expected_visibility_audience_class: "CLIENT_PORTAL",
    requirement: "REQUIRED",
  });
  return snapshot;
}
