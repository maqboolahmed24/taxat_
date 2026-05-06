import { buildApiCommandReceipt } from "../../../../apps/control-plane-api/src/northbound/build_api_command_receipt.ts";
import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type { NorthboundRouteState } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";
import type { ApiCommandReceiptRepository } from "../repositories/api_command_receipt_repository.ts";

export type CommandReceiptAnchorPlan = {
  activity_refs: string[];
  audit_event_refs: string[];
  notification_refs: string[];
  projection_ref: string | null;
  projection_sequence: number | null;
  result_ref: string;
  semantic_action_id: string;
};

function routeProjectionRef(parsed: ParsedCommandEnvelope, routeState: NorthboundRouteState | null) {
  if (routeState === null) {
    return null;
  }
  switch (parsed.commandFamily.projection_stream_class) {
    case "MANIFEST_EXPERIENCE":
      return routeState.latest_refs.decision_bundle_ref_or_null ?? routeState.latest_refs.approval_pack_ref_or_null;
    case "WORKSPACE":
      return routeState.latest_refs.workspace_snapshot_ref_or_null;
    case "NONE":
      return null;
  }
}

export function buildAcceptedCommandReceiptAnchorPlan(input: {
  parsed: ParsedCommandEnvelope;
  requestHash: string;
  routeState: NorthboundRouteState | null;
}): CommandReceiptAnchorPlan {
  const actionStem = `${input.parsed.command.command_type.toLowerCase()}.${input.parsed.command.command_id}`;
  return {
    activity_refs:
      input.parsed.commandFamily.projection_stream_class === "WORKSPACE"
        ? [`activity.${actionStem}`]
        : [],
    audit_event_refs: [`audit-event.${input.requestHash}`],
    notification_refs: [],
    projection_ref: routeProjectionRef(input.parsed, input.routeState),
    projection_sequence:
      input.parsed.commandFamily.projection_stream_class === "NONE"
        ? null
        : input.routeState?.last_published_sequence_or_null ?? null,
    result_ref: `command-result.${input.requestHash}`,
    semantic_action_id: `semantic-action.${actionStem}`,
  };
}

export async function persistCommandReceiptBeforeDispatch(input: {
  acceptedAt: string;
  duplicateSuppressionKey: string;
  expiresAt: string;
  parsed: ParsedCommandEnvelope;
  receiptRepository: ApiCommandReceiptRepository;
  requestHash: string;
  routeState: NorthboundRouteState | null;
}): Promise<ApiCommandReceipt> {
  const anchors = buildAcceptedCommandReceiptAnchorPlan({
    parsed: input.parsed,
    requestHash: input.requestHash,
    routeState: input.routeState,
  });
  const receipt = buildApiCommandReceipt({
    acceptedAt: input.acceptedAt,
    acceptanceState: "ACCEPTED",
    activityRefs: anchors.activity_refs,
    auditEventRefs: anchors.audit_event_refs,
    expiresAt: input.expiresAt,
    notificationRefs: anchors.notification_refs,
    parsed: input.parsed,
    projectionRefOrNull: anchors.projection_ref,
    projectionSequenceOrNull: anchors.projection_sequence,
    requestHash: input.requestHash,
    resultRefOrNull: anchors.result_ref,
    semanticActionId: anchors.semantic_action_id,
  });

  await input.receiptRepository.persistApiCommandReceipt({
    command: input.parsed.command,
    duplicate_suppression_key: input.duplicateSuppressionKey,
    persisted_at: input.acceptedAt,
    receipt,
  });

  return receipt;
}
