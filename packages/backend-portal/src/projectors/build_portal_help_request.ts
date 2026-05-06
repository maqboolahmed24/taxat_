import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { buildHelpCaseContextRefs } from "../services/build_help_case_context_refs.ts";
import { deriveHelpRequestRouteAndReasonBinding } from "../services/derive_help_request_route_and_reason_binding.ts";
import {
  PortalHelpRequestProjectionError,
  type PortalHelpRequestLifecycleState,
  type PortalHelpRequestReasonFamily,
  type PortalHelpRequestRecord,
  type PortalHelpRequestSourceRoute,
  type PortalHelpRequestSupportChannel,
} from "../types.ts";

export type BuildPortalHelpRequestInput = {
  acknowledgedAt?: string | null | undefined;
  additionalCaseContextRefs?: readonly (string | null | undefined)[] | undefined;
  bodyRef: string;
  caseContextRefLimit?: number | undefined;
  clientId: string;
  closedAt?: string | null | undefined;
  helpRequestId?: string | null | undefined;
  itemId?: string | null | undefined;
  lifecycleState?: PortalHelpRequestLifecycleState | string | null | undefined;
  linkedObjectRef?: string | null | undefined;
  manifestId?: string | null | undefined;
  openedAt: string;
  openedByRef: string;
  reasonFamily?: PortalHelpRequestReasonFamily | string | null | undefined;
  requestInfoRef?: string | null | undefined;
  respondedAt?: string | null | undefined;
  responseRef?: string | null | undefined;
  sourceFocusAnchorRef: string;
  sourceRoute: PortalHelpRequestSourceRoute | string;
  subjectLine?: string | null | undefined;
  supportChannel?: PortalHelpRequestSupportChannel | string | null | undefined;
  tenantId: string;
  workspaceId?: string | null | undefined;
};

const lifecycleStates = new Set<PortalHelpRequestLifecycleState>([
  "ACKNOWLEDGED",
  "CLOSED",
  "OPEN",
  "RESPONDED",
]);

const defaultSubjectByReasonFamily = {
  ACCESS_HELP: "Help with portal access",
  APPROVAL_HELP: "Help with an approval",
  DOCUMENT_HELP: "Help with a document request",
  GENERAL_HELP: "Help with this filing",
  ONBOARDING_HELP: "Help with onboarding",
  STATUS_QUESTION: "Question about filing status",
} as const satisfies Record<PortalHelpRequestReasonFamily, string>;

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new PortalHelpRequestProjectionError(message, reasonCodes);
}

function requiredRef(value: string | null | undefined, label: string) {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) {
    fail(`${label} must be a non-empty string`, ["PORTAL_HELP_REQUIRED_REF_MISSING"]);
  }
  return normalized;
}

function optionalRef(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function normalizeOptionalInstant(
  value: string | null | undefined,
  fieldName: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    fail(`${fieldName} must be an ISO date-time`, ["PORTAL_HELP_TIMESTAMP_INVALID"]);
  }
}

function normalizeRequiredInstant(value: string, fieldName: string) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    fail(`${fieldName} must be an ISO date-time`, ["PORTAL_HELP_TIMESTAMP_INVALID"]);
  }
}

function normalizeLifecycleState(
  value: string | null | undefined,
): PortalHelpRequestLifecycleState | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  if (lifecycleStates.has(normalized as PortalHelpRequestLifecycleState)) {
    return normalized as PortalHelpRequestLifecycleState;
  }
  fail(`Unknown portal help lifecycle state ${value}`, [
    "PORTAL_HELP_LIFECYCLE_INVALID",
  ]);
}

function deriveLifecycle(input: {
  acknowledgedAt: string | null;
  closedAt: string | null;
  explicitLifecycleState: PortalHelpRequestLifecycleState | null;
  respondedAt: string | null;
  responseRef: string | null;
}) {
  const derived: PortalHelpRequestLifecycleState =
    input.closedAt !== null
      ? "CLOSED"
      : input.respondedAt !== null || input.responseRef !== null
        ? "RESPONDED"
        : input.acknowledgedAt !== null
          ? "ACKNOWLEDGED"
          : "OPEN";
  if (input.explicitLifecycleState !== null && input.explicitLifecycleState !== derived) {
    fail("Portal help lifecycle_state does not match lifecycle timestamps", [
      "PORTAL_HELP_LIFECYCLE_TIMESTAMP_MISMATCH",
    ]);
  }
  return derived;
}

function validateLifecycleFields(input: {
  acknowledgedAt: string | null;
  closedAt: string | null;
  lifecycleState: PortalHelpRequestLifecycleState;
  openedAt: string;
  respondedAt: string | null;
  responseRef: string | null;
}) {
  if (input.lifecycleState === "OPEN") {
    if (
      input.acknowledgedAt !== null ||
      input.responseRef !== null ||
      input.respondedAt !== null ||
      input.closedAt !== null
    ) {
      fail("OPEN portal help requests must clear acknowledgement and response fields", [
        "PORTAL_HELP_OPEN_FIELDS_PRESENT",
      ]);
    }
    return;
  }

  if (input.acknowledgedAt === null) {
    fail("Acknowledged, responded, and closed help requests require acknowledged_at", [
      "PORTAL_HELP_ACKNOWLEDGED_AT_REQUIRED",
    ]);
  }

  if (input.lifecycleState === "ACKNOWLEDGED") {
    if (input.responseRef !== null || input.respondedAt !== null || input.closedAt !== null) {
      fail("ACKNOWLEDGED portal help requests must clear response and closure fields", [
        "PORTAL_HELP_ACKNOWLEDGED_FIELDS_PRESENT",
      ]);
    }
    return;
  }

  if (input.responseRef === null || input.respondedAt === null) {
    fail("Responded and closed help requests require response_ref and responded_at", [
      "PORTAL_HELP_RESPONSE_FIELDS_REQUIRED",
    ]);
  }

  if (input.lifecycleState === "RESPONDED" && input.closedAt !== null) {
    fail("closed_at may only be present for CLOSED portal help requests", [
      "PORTAL_HELP_CLOSED_AT_WITHOUT_CLOSED_STATE",
    ]);
  }
  if (input.lifecycleState === "CLOSED" && input.closedAt === null) {
    fail("CLOSED portal help requests require closed_at", [
      "PORTAL_HELP_CLOSED_AT_REQUIRED",
    ]);
  }
}

function assertChronology(input: {
  acknowledgedAt: string | null;
  closedAt: string | null;
  openedAt: string;
  respondedAt: string | null;
}) {
  const opened = Date.parse(input.openedAt);
  const acknowledged = input.acknowledgedAt === null ? null : Date.parse(input.acknowledgedAt);
  const responded = input.respondedAt === null ? null : Date.parse(input.respondedAt);
  const closed = input.closedAt === null ? null : Date.parse(input.closedAt);

  if (acknowledged !== null && acknowledged < opened) {
    fail("acknowledged_at must not be earlier than opened_at", [
      "PORTAL_HELP_ACKNOWLEDGED_BEFORE_OPENED",
    ]);
  }
  if (responded !== null && responded < opened) {
    fail("responded_at must not be earlier than opened_at", [
      "PORTAL_HELP_RESPONDED_BEFORE_OPENED",
    ]);
  }
  if (acknowledged !== null && responded !== null && responded < acknowledged) {
    fail("responded_at must not be earlier than acknowledged_at", [
      "PORTAL_HELP_RESPONDED_BEFORE_ACKNOWLEDGED",
    ]);
  }
  if (closed !== null && closed < opened) {
    fail("closed_at must not be earlier than opened_at", [
      "PORTAL_HELP_CLOSED_BEFORE_OPENED",
    ]);
  }
  if (responded !== null && closed !== null && closed < responded) {
    fail("closed_at must not be earlier than responded_at", [
      "PORTAL_HELP_CLOSED_BEFORE_RESPONDED",
    ]);
  }
}

function defaultHelpRequestId(input: {
  bodyRef: string;
  clientId: string;
  itemId: string | null;
  manifestId: string | null;
  openedAt: string;
  openedByRef: string;
  requestInfoRef: string | null;
  sourceFocusAnchorRef: string;
  sourceRoute: PortalHelpRequestSourceRoute;
  tenantId: string;
}) {
  return `portal-help.${stableJsonHash(input).slice(0, 24)}`;
}

export function buildPortalHelpRequest(
  input: BuildPortalHelpRequestInput,
): PortalHelpRequestRecord {
  const tenantId = requiredRef(input.tenantId, "tenant_id");
  const clientId = requiredRef(input.clientId, "client_id");
  const manifestId = optionalRef(input.manifestId);
  const itemId = optionalRef(input.itemId);
  const requestInfoRef = optionalRef(input.requestInfoRef);
  const sourceFocusAnchorRef = requiredRef(
    input.sourceFocusAnchorRef,
    "source_focus_anchor_ref",
  );
  const bodyRef = requiredRef(input.bodyRef, "body_ref");
  const openedByRef = requiredRef(input.openedByRef, "opened_by_ref");
  const openedAt = normalizeRequiredInstant(input.openedAt, "opened_at");
  const acknowledgedAt = normalizeOptionalInstant(input.acknowledgedAt, "acknowledged_at");
  const responseRef = optionalRef(input.responseRef);
  const respondedAt = normalizeOptionalInstant(input.respondedAt, "responded_at");
  const closedAt = normalizeOptionalInstant(input.closedAt, "closed_at");
  const binding = deriveHelpRequestRouteAndReasonBinding({
    itemId,
    reasonFamily: input.reasonFamily,
    requestInfoRef,
    sourceFocusAnchorRef,
    sourceRoute: input.sourceRoute,
    supportChannel: input.supportChannel,
  });
  const lifecycleState = deriveLifecycle({
    acknowledgedAt,
    closedAt,
    explicitLifecycleState: normalizeLifecycleState(input.lifecycleState),
    respondedAt,
    responseRef,
  });
  validateLifecycleFields({
    acknowledgedAt,
    closedAt,
    lifecycleState,
    openedAt,
    respondedAt,
    responseRef,
  });
  assertChronology({
    acknowledgedAt,
    closedAt,
    openedAt,
    respondedAt,
  });

  const subjectLine =
    optionalRef(input.subjectLine) ?? defaultSubjectByReasonFamily[binding.reason_family];
  if (subjectLine.length > 120) {
    fail("subject_line must be at most 120 characters", [
      "PORTAL_HELP_SUBJECT_LINE_TOO_LONG",
    ]);
  }
  const caseContextRefs = buildHelpCaseContextRefs({
    additionalContextRefs: input.additionalCaseContextRefs,
    clientId,
    itemId,
    linkedObjectRef: input.linkedObjectRef,
    manifestId,
    maxRefs: input.caseContextRefLimit,
    requestInfoRef,
    sourceFocusAnchorRef,
    sourceRoute: binding.source_route,
    tenantId,
    workspaceId: input.workspaceId,
  });
  const helpRequestId =
    optionalRef(input.helpRequestId) ??
    defaultHelpRequestId({
      bodyRef,
      clientId,
      itemId,
      manifestId,
      openedAt,
      openedByRef,
      requestInfoRef,
      sourceFocusAnchorRef,
      sourceRoute: binding.source_route,
      tenantId,
    });

  return {
    acknowledged_at: acknowledgedAt,
    artifact_type: "PortalHelpRequest",
    body_ref: bodyRef,
    case_context_refs: caseContextRefs,
    client_id: clientId,
    closed_at: closedAt,
    help_request_id: helpRequestId,
    item_id: itemId,
    lifecycle_state: lifecycleState,
    manifest_id: manifestId,
    opened_at: openedAt,
    opened_by_ref: openedByRef,
    reason_family: binding.reason_family,
    request_info_ref: requestInfoRef,
    responded_at: respondedAt,
    response_ref: responseRef,
    source_focus_anchor_ref: sourceFocusAnchorRef,
    source_route: binding.source_route,
    subject_line: subjectLine,
    support_channel: binding.support_channel,
    tenant_id: tenantId,
  };
}
