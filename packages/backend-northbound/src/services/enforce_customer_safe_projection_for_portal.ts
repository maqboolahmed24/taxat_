import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type ClientPortalRouteCode = "APPROVALS" | "DOCUMENTS" | "HELP" | "HOME" | "ONBOARDING";

export type ClientPortalWorkspaceRecord = Record<string, unknown> & {
  activity_timeline: Array<Record<string, unknown>>;
  approval_center: Record<string, unknown>;
  artifact_type: "ClientPortalWorkspace";
  client_id: string;
  customer_safe_projection: Record<string, unknown>;
  document_center: Record<string, unknown>;
  freshness_state: "DEGRADED" | "FRESH" | "STALE_REVIEW_REQUIRED";
  navigation_tabs: Array<Record<string, unknown>>;
  object_anchor_ref: string;
  onboarding_journey: null | Record<string, unknown>;
  route: ClientPortalRouteCode;
  route_context: Record<string, unknown>;
  shell_family: "CLIENT_PORTAL_SHELL";
  stability_contract: RouteStabilityContract;
  tenant_id: string;
  updated_at: string;
  view_guard_ref: string;
  visibility_partition: Record<string, unknown>;
  workspace_id: string;
  workspace_posture: Record<string, unknown>;
  workspace_version: number;
};

export type ClientPortalReadRouteSurface =
  | "CLIENT_PORTAL_ACTIVITY"
  | "CLIENT_PORTAL_APPROVALS"
  | "CLIENT_PORTAL_DOCUMENTS"
  | "CLIENT_PORTAL_ONBOARDING"
  | "CLIENT_PORTAL_WORKSPACE";

export type ClientPortalReadAuthorization =
  | {
      authorized: true;
      principalClass: string;
      reasonCodes: string[];
    }
  | {
      authorized: false;
      hidden: true;
      principalClass: string | null;
      reasonCodes: string[];
    };

export type ClientPortalReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  clientId: string;
  principalClass?: string | null;
  routeSurface: ClientPortalReadRouteSurface;
  tenantId: string;
}) => ClientPortalReadAuthorization | Promise<ClientPortalReadAuthorization>;

export type ClientPortalPublicationErrorCode =
  | "CLIENT_PORTAL_AUTHORIZATION_INVALID"
  | "CLIENT_PORTAL_WORKSPACE_FIELD_REQUIRED"
  | "CLIENT_PORTAL_WORKSPACE_INVALID"
  | "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE";

export class ClientPortalWorkspacePublicationError extends Error {
  readonly code: ClientPortalPublicationErrorCode;
  readonly reasonCodes: string[];

  constructor(
    code: ClientPortalPublicationErrorCode,
    detail: string,
    reasonCodes: readonly string[],
  ) {
    super(`${code}: ${detail}`);
    this.name = "ClientPortalWorkspacePublicationError";
    this.code = code;
    this.reasonCodes = [...reasonCodes];
  }
}

const clientPortalPrincipalClasses = new Set([
  "CLIENT_CONTRIBUTOR",
  "CLIENT_PORTAL",
  "CLIENT_SIGNATORY",
  "CLIENT_USER",
  "CLIENT_VIEWER",
  "CUSTOMER",
  "CUSTOMER_PORTAL",
]);

const staffOnlyPrincipalClasses = new Set([
  "GOVERNANCE_ADMIN",
  "OPERATOR",
  "SERVICE",
  "STAFF",
  "STAFF_FULL",
  "STAFF_SUPPORT",
]);

const requiredBlockedStaffSignals = [
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
] as const;

const openDocumentStatuses = new Set(["OPEN", "UPLOADING", "UNDER_REVIEW", "REJECTED"]);
const outstandingApprovalStatuses = new Set([
  "READY_FOR_CLIENT",
  "VIEWED",
  "ACKNOWLEDGED",
  "STEP_UP_REQUIRED",
]);
const portalRoutes = new Set<ClientPortalRouteCode>([
  "APPROVALS",
  "DOCUMENTS",
  "HELP",
  "HOME",
  "ONBOARDING",
]);
const portalActivityEventKinds = new Set([
  "APPROVAL_READY",
  "APPROVAL_SIGNED",
  "ONBOARDING_STEP_COMPLETED",
  "STATUS_UPDATED",
  "SUBMISSION_SENT",
  "UPLOAD_RECEIVED",
  "UPLOAD_REJECTED",
]);
const confirmingAuthorityCopyMarkers = [
  "accepted",
  "approved",
  "complete",
  "completed",
  "confirmed",
  "filed",
  "settled",
  "successful",
  "successfully",
] as const;

const tabLabels = {
  APPROVALS: "Approvals",
  DOCUMENTS: "Documents",
  HELP: "Help",
  HOME: "Home",
  ONBOARDING: "Onboarding",
} as const satisfies Record<ClientPortalRouteCode, string>;

const leakFieldNames = new Set([
  "assignment_state",
  "audit_event_ref",
  "audit_lineage_ref",
  "gate_state",
  "internal_activity_refs",
  "internal_participant_refs",
  "internal_reason_codes",
  "internal_thread_refs",
  "raw_gate_state",
  "staff_reason_codes",
]);

function fail(
  code: ClientPortalPublicationErrorCode,
  detail: string,
  reasonCodes: readonly string[],
): never {
  throw new ClientPortalWorkspacePublicationError(code, detail, reasonCodes);
}

function assertNonEmptyString(
  label: string,
  value: unknown,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("CLIENT_PORTAL_WORKSPACE_FIELD_REQUIRED", `${label} is required`, [
      "CLIENT_PORTAL_FIELD_REQUIRED",
    ]);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail("CLIENT_PORTAL_WORKSPACE_FIELD_REQUIRED", `${label} must be a non-negative integer`, [
      "CLIENT_PORTAL_FIELD_REQUIRED",
    ]);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.flatMap((entry) => asRecord(entry) ?? []) : [];
}

function actorPrincipalClass(actorContext: NorthboundActorContext, explicit?: string | null) {
  const actorWithOptionalClass = actorContext as NorthboundActorContext & {
    principalClass?: unknown;
    principal_class?: unknown;
  };
  const value =
    explicit ??
    (typeof actorWithOptionalClass.principal_class === "string"
      ? actorWithOptionalClass.principal_class
      : typeof actorWithOptionalClass.principalClass === "string"
        ? actorWithOptionalClass.principalClass
        : null);
  return value?.trim() || "CLIENT_VIEWER";
}

export function authorizeClientPortalReadScope(input: {
  actorContext: NorthboundActorContext;
  clientId: string;
  principalClass?: string | null;
  routeSurface: ClientPortalReadRouteSurface;
  tenantId: string;
}): ClientPortalReadAuthorization {
  const principalClass = actorPrincipalClass(input.actorContext, input.principalClass);
  if (input.actorContext.tenant_id !== input.tenantId) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "CLIENT_PORTAL_READ_TENANT_MISMATCH",
        `${input.routeSurface}_NOT_VISIBLE`,
      ],
    };
  }
  if (input.actorContext.client_id_or_null === null) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "CLIENT_PORTAL_READ_CLIENT_SCOPE_REQUIRED",
        `${input.routeSurface}_CLIENT_SCOPE_REQUIRED`,
      ],
    };
  }
  if (input.actorContext.client_id_or_null !== input.clientId) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "CLIENT_PORTAL_READ_CLIENT_MISMATCH",
        `${input.routeSurface}_NOT_VISIBLE`,
      ],
    };
  }
  if (staffOnlyPrincipalClasses.has(principalClass)) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "CLIENT_PORTAL_READ_STAFF_SESSION_BLOCKED",
        `${input.routeSurface}_CUSTOMER_SCOPE_REQUIRED`,
      ],
    };
  }
  if (!clientPortalPrincipalClasses.has(principalClass)) {
    return {
      authorized: false,
      hidden: true,
      principalClass,
      reasonCodes: [
        "CLIENT_PORTAL_READ_UNKNOWN_PRINCIPAL_CLASS",
        `${input.routeSurface}_CUSTOMER_SCOPE_REQUIRED`,
      ],
    };
  }
  return {
    authorized: true,
    principalClass,
    reasonCodes: ["CLIENT_PORTAL_READ_SCOPE_AUTHORIZED", `${input.routeSurface}_VISIBLE`],
  };
}

function validateNavigation(workspace: ClientPortalWorkspaceRecord) {
  if (!portalRoutes.has(workspace.route)) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "route must be a known client portal route", [
      "CLIENT_PORTAL_ROUTE_INVALID",
    ]);
  }
  const activeTabs = workspace.navigation_tabs.filter((tab) => tab.active === true);
  if (activeTabs.length !== 1 || activeTabs[0]?.route !== workspace.route) {
    fail(
      "CLIENT_PORTAL_WORKSPACE_INVALID",
      "navigation_tabs must contain exactly one active entry matching route",
      ["CLIENT_PORTAL_ACTIVE_TAB_ROUTE_DRIFT"],
    );
  }
  for (const tab of workspace.navigation_tabs) {
    if (typeof tab.route === "string" && portalRoutes.has(tab.route as ClientPortalRouteCode)) {
      const expectedLabel = tabLabels[tab.route as ClientPortalRouteCode];
      if (tab.label !== expectedLabel) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "navigation tab label drifted", [
          "CLIENT_PORTAL_NAV_LABEL_DRIFT",
        ]);
      }
      if ((tab.route === "HOME" || tab.route === "HELP") && tab.badge_count !== null) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "home and help tabs must not publish badges", [
          "CLIENT_PORTAL_NAV_BADGE_DRIFT",
        ]);
      }
    }
  }
}

function validateStability(workspace: ClientPortalWorkspaceRecord) {
  const stability = workspace.stability_contract;
  if (stability.route_scope_class !== "CLIENT_PORTAL_ROUTE") {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "stability_contract route scope drifted", [
      "CLIENT_PORTAL_STABILITY_SCOPE_INVALID",
    ]);
  }
  if (stability.resume_capability !== "SNAPSHOT_ONLY") {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "portal reads must be snapshot-only", [
      "CLIENT_PORTAL_STABILITY_RESUME_CAPABILITY_INVALID",
    ]);
  }
  if (
    stability.guard_vector_components.client_portal_workspace_version_or_null !==
    workspace.workspace_version
  ) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "workspace version must mirror stability guard", [
      "CLIENT_PORTAL_WORKSPACE_VERSION_GUARD_DRIFT",
    ]);
  }
  if (stability.guard_vector_components.view_guard_ref_or_null !== workspace.view_guard_ref) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "view guard must mirror stability guard", [
      "CLIENT_PORTAL_VIEW_GUARD_DRIFT",
    ]);
  }
}

function validateProjectionContracts(workspace: ClientPortalWorkspaceRecord) {
  const visibility = workspace.visibility_partition;
  const customerSafe = workspace.customer_safe_projection;
  if (visibility.partition_scope !== "CLIENT_PORTAL_WORKSPACE") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "visibility scope drifted", [
      "CLIENT_PORTAL_VISIBILITY_SCOPE_INVALID",
    ]);
  }
  if (visibility.audience_class !== "CLIENT_PORTAL") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "visibility audience drifted", [
      "CLIENT_PORTAL_VISIBILITY_AUDIENCE_INVALID",
    ]);
  }
  if (
    !Array.isArray(visibility.allowed_visibility_classes) ||
    visibility.allowed_visibility_classes.length !== 1 ||
    visibility.allowed_visibility_classes[0] !== "CUSTOMER_VISIBLE"
  ) {
    fail(
      "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE",
      "portal visibility must stay customer-visible only",
      ["CLIENT_PORTAL_VISIBILITY_CLASS_INVALID"],
    );
  }
  if (customerSafe.boundary_scope !== "CLIENT_PORTAL_WORKSPACE") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "customer-safe boundary drifted", [
      "CLIENT_PORTAL_CUSTOMER_SAFE_SCOPE_INVALID",
    ]);
  }
  if (customerSafe.projection_audience !== "CLIENT_PORTAL") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "customer-safe audience drifted", [
      "CLIENT_PORTAL_CUSTOMER_SAFE_AUDIENCE_INVALID",
    ]);
  }
  if (customerSafe.staff_field_dependency_policy !== "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "staff fields were not filtered at source", [
      "CLIENT_PORTAL_STAFF_FIELD_POLICY_INVALID",
    ]);
  }
  if (customerSafe.hidden_activity_policy !== "NO_HIDDEN_ACTIVITY_DERIVATION") {
    fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "hidden activity policy drifted", [
      "CLIENT_PORTAL_HIDDEN_ACTIVITY_POLICY_INVALID",
    ]);
  }
  if (
    customerSafe.access_binding_hash !== visibility.access_binding_hash ||
    customerSafe.masking_posture_fingerprint !== visibility.masking_posture_fingerprint ||
    customerSafe.visibility_cache_partition_key !== visibility.cache_partition_key
  ) {
    fail(
      "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE",
      "customer-safe projection must mirror visibility partition",
      ["CLIENT_PORTAL_CUSTOMER_SAFE_VISIBILITY_DRIFT"],
    );
  }
  const blockedSignals = Array.isArray(customerSafe.blocked_staff_signal_classes)
    ? customerSafe.blocked_staff_signal_classes
    : [];
  for (const signal of requiredBlockedStaffSignals) {
    if (!blockedSignals.includes(signal)) {
      fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "staff-only signal blocklist is incomplete", [
        "CLIENT_PORTAL_STAFF_SIGNAL_BLOCKLIST_INCOMPLETE",
      ]);
    }
  }
}

function expectedPortalUploadPhase(
  upload: Record<string, unknown>,
  requestStatus: unknown,
  isCurrentUpload: boolean,
) {
  const transferState = upload.transfer_state;
  if (transferState === "QUEUED" || transferState === "UPLOADING") {
    return "TRANSFER";
  }
  if (transferState === "SCANNING") {
    return "SCAN";
  }
  if (transferState === "REJECTED") {
    return "REJECTION";
  }
  if (transferState === "FAILED") {
    return "RETRY";
  }
  if (transferState === "ACCEPTED") {
    if (
      upload.next_action_code === "CONFIRM_ATTACHMENT" ||
      upload.next_action_code === "RECONFIRM_REQUEST" ||
      upload.next_action_code === "CONTACT_SUPPORT"
    ) {
      return "VALIDATION";
    }
    return isCurrentUpload && requestStatus === "UNDER_REVIEW" ? "VALIDATION" : "ACCEPTANCE";
  }
  return null;
}

function expectedCurrentUploadTransfers(requestStatus: unknown) {
  if (requestStatus === "UPLOADING") {
    return new Set(["QUEUED", "SCANNING", "UPLOADING"]);
  }
  if (requestStatus === "UNDER_REVIEW" || requestStatus === "ACCEPTED") {
    return new Set(["ACCEPTED"]);
  }
  if (requestStatus === "REJECTED") {
    return new Set(["FAILED", "REJECTED"]);
  }
  return null;
}

function validateDocumentCenter(workspace: ClientPortalWorkspaceRecord) {
  const requests = asArray(workspace.document_center.requests);
  const openCount = requests.filter((request) =>
    openDocumentStatuses.has(String(request.status)),
  ).length;
  if (workspace.document_center.open_request_count !== openCount) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "document open count must match serialized cards", [
      "CLIENT_PORTAL_DOCUMENT_COUNT_DRIFT",
    ]);
  }
  const documentsTab = workspace.navigation_tabs.find((tab) => tab.route === "DOCUMENTS");
  if (documentsTab !== undefined && documentsTab.badge_count !== openCount) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "documents badge must match open request count", [
      "CLIENT_PORTAL_DOCUMENT_BADGE_DRIFT",
    ]);
  }
  for (const request of requests) {
    assertNonEmptyString("document request_id", request.request_id);
    assertNonEmptyString("document request_version_ref", request.request_version_ref);
    const uploads = asArray(request.uploads);
    const uploadIds = new Set<string>();
    for (const upload of uploads) {
      assertNonEmptyString("upload_session_id", upload.upload_session_id);
      if (uploadIds.has(upload.upload_session_id)) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "upload ids must be unique per request card", [
          "CLIENT_PORTAL_DOCUMENT_UPLOAD_DUPLICATE",
        ]);
      }
      uploadIds.add(upload.upload_session_id);
      if (
        (upload.request_binding_state === "ORIGINAL_CURRENT" ||
          upload.request_binding_state === "RECONFIRMED_CURRENT") &&
        upload.request_version_ref !== request.request_version_ref
      ) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "current upload request version must mirror request card", [
          "CLIENT_PORTAL_DOCUMENT_UPLOAD_REQUEST_VERSION_DRIFT",
        ]);
      }
      const expectedPhase = expectedPortalUploadPhase(
        upload,
        request.status,
        upload.upload_session_id === request.current_upload_ref,
      );
      if (expectedPhase !== null && upload.status_phase !== expectedPhase) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "upload status phase drifted from transfer state", [
          "CLIENT_PORTAL_DOCUMENT_UPLOAD_PHASE_DRIFT",
        ]);
      }
      if (
        (upload.next_action_code === "NONE" || upload.next_action_code === "CONFIRM_ATTACHMENT") &&
        (upload.recovery_posture !== "NONE" || upload.dominant_hazard_code !== null)
      ) {
        fail("CLIENT_PORTAL_WORKSPACE_INVALID", "safe upload actions must clear recovery hazards", [
          "CLIENT_PORTAL_DOCUMENT_UPLOAD_RECOVERY_DRIFT",
        ]);
      }
    }
    if (request.current_upload_ref !== null && !uploadIds.has(String(request.current_upload_ref))) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "current_upload_ref must point to an upload in the same request card",
        ["CLIENT_PORTAL_DOCUMENT_CURRENT_UPLOAD_DANGLING"],
      );
    }
    if (
      request.current_artifact_upload_ref !== null &&
      !uploadIds.has(String(request.current_artifact_upload_ref))
    ) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "current_artifact_upload_ref must point to an upload in the same request card",
        ["CLIENT_PORTAL_DOCUMENT_CURRENT_ARTIFACT_DANGLING"],
      );
    }
    if (
      (request.status === "OPEN" || request.status === "EXPIRED") &&
      request.current_upload_ref !== null
    ) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "open document cards must clear current upload", [
        "CLIENT_PORTAL_DOCUMENT_CURRENT_UPLOAD_STATUS_DRIFT",
      ]);
    }
    if (
      (request.status === "OPEN" || request.status === "EXPIRED" || request.status === "REJECTED") &&
      request.current_artifact_upload_ref !== null
    ) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "non-current document cards must clear current artifact", [
        "CLIENT_PORTAL_DOCUMENT_CURRENT_ARTIFACT_STATUS_DRIFT",
      ]);
    }
    const currentUpload = uploads.find(
      (upload) => upload.upload_session_id === request.current_upload_ref,
    );
    const expectedTransfers = expectedCurrentUploadTransfers(request.status);
    if (
      expectedTransfers !== null &&
      (currentUpload === undefined || !expectedTransfers.has(String(currentUpload.transfer_state)))
    ) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "request-card status must agree with current upload transfer posture",
        ["CLIENT_PORTAL_DOCUMENT_CURRENT_UPLOAD_TRANSFER_DRIFT"],
      );
    }
    const currentArtifact = uploads.find(
      (upload) => upload.upload_session_id === request.current_artifact_upload_ref,
    );
    if (
      currentArtifact !== undefined &&
      (currentArtifact.transfer_state !== "ACCEPTED" ||
        currentArtifact.history_state !== "CURRENT" ||
        currentArtifact.request_binding_state === "SUPERSEDED" ||
        currentArtifact.request_binding_state === "RECONFIRMATION_REQUIRED")
    ) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "current_artifact_upload_ref must remain an accepted current artifact",
        ["CLIENT_PORTAL_DOCUMENT_CURRENT_ARTIFACT_POSTURE_DRIFT"],
      );
    }
  }
}

function validateApprovalCenter(workspace: ClientPortalWorkspaceRecord) {
  const packs = asArray(workspace.approval_center.packs);
  const outstandingCount = packs.filter((pack) =>
    outstandingApprovalStatuses.has(String(pack.status)),
  ).length;
  if (workspace.approval_center.outstanding_count !== outstandingCount) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "approval count must match serialized packs", [
      "CLIENT_PORTAL_APPROVAL_COUNT_DRIFT",
    ]);
  }
  const approvalsTab = workspace.navigation_tabs.find((tab) => tab.route === "APPROVALS");
  if (approvalsTab !== undefined && approvalsTab.badge_count !== outstandingCount) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "approvals badge must match outstanding count", [
      "CLIENT_PORTAL_APPROVAL_BADGE_DRIFT",
    ]);
  }
  const packIds = new Set(packs.map((pack) => pack.approval_pack_id));
  if (
    workspace.approval_center.latest_pack_ref !== null &&
    !packIds.has(workspace.approval_center.latest_pack_ref)
  ) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "latest_pack_ref must resolve to one pack", [
      "CLIENT_PORTAL_APPROVAL_LATEST_PACK_DANGLING",
    ]);
  }
  for (const pack of packs) {
    assertNonEmptyString("approval_pack_id", pack.approval_pack_id);
    const primaryAction = asRecord(pack.primary_action);
    if (primaryAction?.route !== "APPROVALS") {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "approval primary action must stay on APPROVALS", [
        "CLIENT_PORTAL_APPROVAL_PRIMARY_ACTION_ROUTE_DRIFT",
      ]);
    }
    if (primaryAction?.context_object_ref !== pack.approval_pack_id) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "approval primary action must stay anchored to the approval pack",
        ["CLIENT_PORTAL_APPROVAL_PRIMARY_ACTION_CONTEXT_DRIFT"],
      );
    }
    if (
      pack.status === "STEP_UP_REQUIRED" &&
      (pack.requires_step_up !== true || primaryAction?.requires_step_up !== true)
    ) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "step-up packs must keep step-up posture", [
        "CLIENT_PORTAL_APPROVAL_STEP_UP_POSTURE_DRIFT",
      ]);
    }
    if (
      pack.sign_off_state === "READY_TO_SIGN" &&
      (typeof pack.approval_readiness_score !== "number" ||
        pack.approval_readiness_score < 85 ||
        pack.stale_protection_state !== "CURRENT")
    ) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_INVALID",
        "ready-to-sign packs must keep current stale protection and readiness",
        ["CLIENT_PORTAL_APPROVAL_READINESS_DRIFT"],
      );
    }
  }
}

function validateActivity(workspace: ClientPortalWorkspaceRecord) {
  if (workspace.route === "HOME" && workspace.activity_timeline.length > 6) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "home activity timeline must stay bounded", [
      "CLIENT_PORTAL_ACTIVITY_HOME_LIMIT_EXCEEDED",
    ]);
  }
  const seen = new Set<string>();
  let previousEpoch = Number.POSITIVE_INFINITY;
  for (const event of workspace.activity_timeline) {
    assertNonEmptyString("activity event_id", event.event_id);
    if (!portalActivityEventKinds.has(String(event.event_kind))) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "activity event kind is not customer-safe", [
        "CLIENT_PORTAL_ACTIVITY_EVENT_KIND_INVALID",
      ]);
    }
    if (seen.has(event.event_id)) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "activity event ids must be unique", [
        "CLIENT_PORTAL_ACTIVITY_DUPLICATE_EVENT",
      ]);
    }
    seen.add(event.event_id);
    assertNonEmptyString("activity occurred_at", event.occurred_at);
    const epoch = Date.parse(event.occurred_at);
    if (!Number.isFinite(epoch) || epoch > previousEpoch) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "activity timeline must be newest-first", [
        "CLIENT_PORTAL_ACTIVITY_ORDER_DRIFT",
      ]);
    }
    previousEpoch = epoch;
    const text = `${String(event.headline ?? "")} ${String(event.detail ?? "")}`.toLowerCase();
    if (
      text.includes("gate") ||
      text.includes("audit") ||
      text.includes("escalat") ||
      text.includes("staff")
    ) {
      fail("CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE", "activity copy leaks internal language", [
        "CLIENT_PORTAL_ACTIVITY_INTERNAL_LANGUAGE",
      ]);
    }
    const hasConfirmingAuthorityCopy = confirmingAuthorityCopyMarkers.some((marker) =>
      text.includes(marker),
    );
    if (event.event_kind === "SUBMISSION_SENT" && hasConfirmingAuthorityCopy) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE",
        "activity copy implies authority confirmation without explicit confirmed posture",
        ["CLIENT_PORTAL_ACTIVITY_AUTHORITY_COPY_OVERSTATED"],
      );
    }
    if (
      event.event_kind === "STATUS_UPDATED" &&
      hasConfirmingAuthorityCopy &&
      !text.includes("authority confirmed")
    ) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE",
        "activity copy implies authority confirmation without explicit confirmed posture",
        ["CLIENT_PORTAL_ACTIVITY_AUTHORITY_COPY_OVERSTATED"],
      );
    }
  }
}

function validateOnboarding(workspace: ClientPortalWorkspaceRecord) {
  const journey = workspace.onboarding_journey;
  if (journey === null) {
    return;
  }
  assertNonEmptyString("onboarding journey_id", journey.journey_id);
  assertNonNegativeInteger(
    "onboarding completed_step_count",
    journey.completed_step_count,
  );
  assertNonNegativeInteger("onboarding total_step_count", journey.total_step_count);
  if ((journey.completed_step_count as number) > (journey.total_step_count as number)) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "onboarding completed count exceeds total", [
      "CLIENT_PORTAL_ONBOARDING_COUNT_DRIFT",
    ]);
  }
  if (
    journey.state === "COMPLETED" &&
    journey.completed_step_count !== journey.total_step_count
  ) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "completed onboarding must complete all steps", [
      "CLIENT_PORTAL_ONBOARDING_COMPLETION_DRIFT",
    ]);
  }
  if (
    journey.resume_state === "RECONFIRMATION_REQUIRED" &&
    !Array.isArray(journey.reconfirmation_step_codes)
  ) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "reconfirmation onboarding needs step refs", [
      "CLIENT_PORTAL_ONBOARDING_RECONFIRMATION_DRIFT",
    ]);
  }
}

function validateRouteContext(workspace: ClientPortalWorkspaceRecord) {
  const routeContext = workspace.route_context;
  if (routeContext.context_route === "NONE") {
    if (workspace.object_anchor_ref !== workspace.workspace_id) {
      fail("CLIENT_PORTAL_WORKSPACE_INVALID", "top-level routes must anchor on workspace_id", [
        "CLIENT_PORTAL_OBJECT_ANCHOR_DRIFT",
      ]);
    }
    return;
  }
  if (routeContext.context_object_ref !== workspace.object_anchor_ref) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "contextual route object anchor drifted", [
      "CLIENT_PORTAL_CONTEXT_OBJECT_ANCHOR_DRIFT",
    ]);
  }
  if (routeContext.return_route !== workspace.route) {
    fail("CLIENT_PORTAL_WORKSPACE_INVALID", "contextual return route must match active tab", [
      "CLIENT_PORTAL_CONTEXT_RETURN_ROUTE_DRIFT",
    ]);
  }
  assertNonEmptyString(
    "route_context.return_focus_anchor_ref_or_null",
    routeContext.return_focus_anchor_ref_or_null,
  );
  assertNonEmptyString("route_context.fallback_reason_ref_or_null", routeContext.fallback_reason_ref_or_null);
}

function scanForInternalLeak(value: unknown, path: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForInternalLeak(entry, [...path, String(index)]));
    return;
  }
  const record = asRecord(value);
  if (record === null) {
    return;
  }
  for (const [key, nested] of Object.entries(record)) {
    if (leakFieldNames.has(key)) {
      fail(
        "CLIENT_PORTAL_WORKSPACE_NOT_CUSTOMER_SAFE",
        `customer-safe workspace leaked ${[...path, key].join(".")}`,
        ["CLIENT_PORTAL_STAFF_ONLY_FIELD_LEAK"],
      );
    }
    scanForInternalLeak(nested, [...path, key]);
  }
}

export function enforceCustomerSafeProjectionForPortal(
  workspace: ClientPortalWorkspaceRecord,
) {
  if (workspace.artifact_type !== "ClientPortalWorkspace") {
    fail("CLIENT_PORTAL_WORKSPACE_FIELD_REQUIRED", "artifact_type must be ClientPortalWorkspace", [
      "CLIENT_PORTAL_ARTIFACT_TYPE_INVALID",
    ]);
  }
  if (workspace.shell_family !== "CLIENT_PORTAL_SHELL") {
    fail("CLIENT_PORTAL_WORKSPACE_FIELD_REQUIRED", "shell_family must be CLIENT_PORTAL_SHELL", [
      "CLIENT_PORTAL_SHELL_FAMILY_INVALID",
    ]);
  }
  assertNonEmptyString("workspace_id", workspace.workspace_id);
  assertNonEmptyString("tenant_id", workspace.tenant_id);
  assertNonEmptyString("client_id", workspace.client_id);
  assertNonEmptyString("object_anchor_ref", workspace.object_anchor_ref);
  assertNonEmptyString("dominant_question", workspace.dominant_question);
  assertNonEmptyString("view_guard_ref", workspace.view_guard_ref);
  assertNonNegativeInteger("workspace_version", workspace.workspace_version);
  validateNavigation(workspace);
  validateStability(workspace);
  validateProjectionContracts(workspace);
  validateRouteContext(workspace);
  validateDocumentCenter(workspace);
  validateApprovalCenter(workspace);
  validateOnboarding(workspace);
  validateActivity(workspace);
  scanForInternalLeak({
    activity_timeline: workspace.activity_timeline,
    approval_center: workspace.approval_center,
    document_center: workspace.document_center,
    onboarding_journey: workspace.onboarding_journey,
    support_panel: workspace.support_panel,
  });
  return workspace;
}
