import { buildApiCommandReceipt } from "../../../../apps/control-plane-api/src/northbound/build_api_command_receipt.ts";
import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type { ApiCommandReceipt } from "../models/api_command_receipt.ts";
import type { StoredApiCommandReceipt } from "../repositories/api_command_receipt_repository.ts";

export function buildDuplicateReplayReceipt(input: {
  existing: StoredApiCommandReceipt;
  parsed: ParsedCommandEnvelope;
}): ApiCommandReceipt {
  const original = input.existing.receipt;
  return buildApiCommandReceipt({
    acceptedAt: original.accepted_at,
    acceptanceState: "DUPLICATE_REPLAY",
    activityRefs: original.activity_refs,
    auditEventRefs: original.audit_event_refs,
    duplicateOfReceiptId: original.duplicate_of_receipt_id ?? original.receipt_id,
    expiresAt: original.expires_at,
    notificationRefs: original.notification_refs,
    parsed: input.parsed,
    projectionRefOrNull: original.latest_projection_ref,
    projectionSequenceOrNull: original.latest_projection_sequence,
    requestHash: original.request_hash,
    resultRefOrNull: original.result_ref,
    semanticActionId: original.semantic_action_id,
  });
}
