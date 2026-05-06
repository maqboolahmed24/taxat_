import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildPortalHelpRequest,
  type BuildPortalHelpRequestInput,
} from "../projectors/build_portal_help_request.ts";
import {
  PortalHelpRequestProjectionError,
  type PortalHelpBoundaryHandoffRecord,
  type PortalHelpRequestLifecycleState,
  type PortalHelpRequestRecord,
} from "../types.ts";

export type PortalHelpLifecycleUpdateInput = {
  acknowledgedAt?: string | null | undefined;
  closedAt?: string | null | undefined;
  lifecycleState?: PortalHelpRequestLifecycleState | string | null | undefined;
  respondedAt?: string | null | undefined;
  responseRef?: string | null | undefined;
};

export type TrackPortalHelpBoundaryHandoffInput = {
  handoffAt?: string | null | undefined;
  handoffId?: string | null | undefined;
  lifecycleUpdate?: PortalHelpLifecycleUpdateInput | undefined;
  newHelpRequest?: BuildPortalHelpRequestInput | undefined;
  priorHelpRequest?: PortalHelpRequestRecord | null | undefined;
  supportBoundaryRef?: string | null | undefined;
};

export type TrackPortalHelpBoundaryHandoffResult = {
  handoff: PortalHelpBoundaryHandoffRecord;
  helpRequest: PortalHelpRequestRecord;
};

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new PortalHelpRequestProjectionError(message, reasonCodes);
}

function optionalRef(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function normalizeHandoffAt(value: string | null | undefined, fallback: string) {
  try {
    return normalizeUtcInstantString(value ?? fallback);
  } catch (error) {
    fail("handoff_at must be an ISO date-time", ["PORTAL_HELP_HANDOFF_AT_INVALID"]);
  }
}

function stringField(
  record: PortalHelpRequestRecord,
  field: keyof PortalHelpRequestRecord,
) {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`priorHelpRequest.${String(field)} must be a non-empty string`, [
      "PORTAL_HELP_PRIOR_RECORD_INVALID",
    ]);
  }
  return value;
}

function nullableStringField(
  record: PortalHelpRequestRecord,
  field: keyof PortalHelpRequestRecord,
) {
  const value = record[field];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`priorHelpRequest.${String(field)} must be a string or null`, [
      "PORTAL_HELP_PRIOR_RECORD_INVALID",
    ]);
  }
  return value;
}

function workspaceRefFromPrior(record: PortalHelpRequestRecord) {
  return record.case_context_refs.find((ref) => ref.startsWith("portal.workspace.")) ?? null;
}

function buildFromPrior(
  prior: PortalHelpRequestRecord,
  lifecycleUpdate: PortalHelpLifecycleUpdateInput | undefined,
): BuildPortalHelpRequestInput {
  const lifecycleState =
    lifecycleUpdate === undefined
      ? prior.lifecycle_state
      : lifecycleUpdate.lifecycleState;
  return {
    acknowledgedAt: lifecycleUpdate?.acknowledgedAt ?? prior.acknowledged_at,
    additionalCaseContextRefs: prior.case_context_refs,
    bodyRef: stringField(prior, "body_ref"),
    clientId: stringField(prior, "client_id"),
    closedAt: lifecycleUpdate?.closedAt ?? prior.closed_at,
    helpRequestId: stringField(prior, "help_request_id"),
    itemId: nullableStringField(prior, "item_id"),
    lifecycleState,
    linkedObjectRef: nullableStringField(prior, "item_id"),
    manifestId: nullableStringField(prior, "manifest_id"),
    openedAt: stringField(prior, "opened_at"),
    openedByRef: stringField(prior, "opened_by_ref"),
    reasonFamily: prior.reason_family,
    requestInfoRef: nullableStringField(prior, "request_info_ref"),
    respondedAt: lifecycleUpdate?.respondedAt ?? prior.responded_at,
    responseRef: lifecycleUpdate?.responseRef ?? prior.response_ref,
    sourceFocusAnchorRef: stringField(prior, "source_focus_anchor_ref"),
    sourceRoute: prior.source_route,
    subjectLine: stringField(prior, "subject_line"),
    supportChannel: prior.support_channel,
    tenantId: stringField(prior, "tenant_id"),
    workspaceId: workspaceRefFromPrior(prior),
  };
}

function defaultHandoffId(helpRequest: PortalHelpRequestRecord, handoffAt: string) {
  return `portal-help-handoff.${stableJsonHash({
    handoffAt,
    helpRequestId: helpRequest.help_request_id,
    lifecycleState: helpRequest.lifecycle_state,
  }).slice(0, 24)}`;
}

export function trackPortalHelpBoundaryHandoff(
  input: TrackPortalHelpBoundaryHandoffInput,
): TrackPortalHelpBoundaryHandoffResult {
  if (input.priorHelpRequest === undefined && input.newHelpRequest === undefined) {
    fail("trackPortalHelpBoundaryHandoff requires newHelpRequest or priorHelpRequest", [
      "PORTAL_HELP_HANDOFF_INPUT_REQUIRED",
    ]);
  }
  if (input.priorHelpRequest !== undefined && input.newHelpRequest !== undefined) {
    fail("trackPortalHelpBoundaryHandoff accepts one help request source at a time", [
      "PORTAL_HELP_HANDOFF_INPUT_AMBIGUOUS",
    ]);
  }

  const helpRequest =
    input.priorHelpRequest !== undefined && input.priorHelpRequest !== null
      ? buildPortalHelpRequest(buildFromPrior(input.priorHelpRequest, input.lifecycleUpdate))
      : input.newHelpRequest === undefined
        ? fail("priorHelpRequest cannot be null without newHelpRequest", [
            "PORTAL_HELP_HANDOFF_INPUT_REQUIRED",
          ])
        : buildPortalHelpRequest(input.newHelpRequest);
  const handoffAt = normalizeHandoffAt(
    input.handoffAt,
    helpRequest.closed_at ??
      helpRequest.responded_at ??
      helpRequest.acknowledged_at ??
      helpRequest.opened_at,
  );
  const handoffId =
    optionalRef(input.handoffId) ?? defaultHandoffId(helpRequest, handoffAt);
  const supportBoundaryRef =
    optionalRef(input.supportBoundaryRef) ??
    `support-boundary.${helpRequest.help_request_id}`;

  return {
    handoff: {
      artifact_type: "PortalHelpBoundaryHandoff",
      case_context_refs: [...helpRequest.case_context_refs],
      handoff_at: handoffAt,
      handoff_id: handoffId,
      handoff_state: helpRequest.lifecycle_state,
      help_request_ref: helpRequest.help_request_id,
      return_target: {
        focus_anchor_ref: helpRequest.source_focus_anchor_ref,
        item_id: helpRequest.item_id,
        request_info_ref: helpRequest.request_info_ref,
        source_route: helpRequest.source_route,
      },
      support_boundary_ref: supportBoundaryRef,
    },
    helpRequest,
  };
}
