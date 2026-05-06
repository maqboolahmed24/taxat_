import { syntheticReceiptClientId } from "./policy.ts";
import type { ParsedCommandEnvelope } from "./parse_command_envelope.ts";
import type { ApiCommandReceipt } from "../../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildMessageIdempotencyIdentity,
  classifyIdempotencyCollision,
  type ComparableIdentityContract,
  type MessageIdentityContract,
} from "../../../../packages/domain-kernel/src/messaging/idempotency.ts";
import { stableJsonHash } from "../../../../packages/domain-kernel/src/primitives/hash.ts";

export type NorthboundComparableIdentity = ComparableIdentityContract & {
  derivedIdentity: MessageIdentityContract;
};

export type NorthboundIdempotencyRecord = {
  comparableIdentity: NorthboundComparableIdentity;
  receipt: ApiCommandReceipt;
};

export type CommandIdempotencyDecision =
  | {
      outcome: "ACCEPT_NEW";
      comparableIdentity: NorthboundComparableIdentity;
      requestHash: string;
    }
  | {
      outcome: "RETURN_EXISTING_RECEIPT";
      comparableIdentity: NorthboundComparableIdentity;
      existingReceipt: ApiCommandReceipt;
      requestHash: string;
    }
  | {
      outcome: "IDEMPOTENCY_COLLISION";
      comparableIdentity: NorthboundComparableIdentity;
      requestHash: string;
      reasonCodes: string[];
      existingReceiptRefOrNull: string | null;
    };

function semanticTargetRef(parsed: ParsedCommandEnvelope) {
  switch (parsed.command.target_scope_class) {
    case "MANIFEST":
      return `manifest.${parsed.command.manifest_id}`;
    case "WORK_ITEM":
      return `work-item.${parsed.command.work_item_id}`;
    case "GOVERNANCE":
      return `governance.${parsed.command.governance_target_ref}`;
  }
}

function commandSemanticPayload(parsed: ParsedCommandEnvelope) {
  return {
    command_type: parsed.command.command_type,
    mutation_precondition_binding: parsed.command.mutation_precondition_binding,
    payload: parsed.command.payload,
    requested_scope: parsed.command.requested_scope,
    target_scope_class: parsed.command.target_scope_class,
    target_tuple: {
      client_id: syntheticReceiptClientId(parsed.command, parsed.actorContext),
      governance_target_ref: parsed.command.governance_target_ref,
      manifest_id: parsed.command.manifest_id,
      tenant_id: parsed.command.tenant_id,
      work_item_id: parsed.command.work_item_id,
    },
    guard_bundle: {
      if_match_approval_pack_hash: parsed.command.if_match_approval_pack_hash,
      if_match_client_portal_workspace_version: parsed.command.if_match_client_portal_workspace_version,
      if_match_customer_head_sequence: parsed.command.if_match_customer_head_sequence,
      if_match_decision_bundle_hash: parsed.command.if_match_decision_bundle_hash,
      if_match_dependency_topology_hash: parsed.command.if_match_dependency_topology_hash,
      if_match_frame_epoch: parsed.command.if_match_frame_epoch,
      if_match_internal_head_sequence: parsed.command.if_match_internal_head_sequence,
      if_match_policy_snapshot_hash: parsed.command.if_match_policy_snapshot_hash,
      if_match_request_state_version: parsed.command.if_match_request_state_version,
      if_match_shell_stability_token: parsed.command.if_match_shell_stability_token,
      if_match_work_item_version: parsed.command.if_match_work_item_version,
      mutation_basis_contract_hash:
        parsed.command.mutation_basis_contract?.basis_contract_hash ?? null,
      simulation_basis_hash: parsed.command.simulation_basis_hash,
    },
  };
}

export function buildNorthboundComparableIdentity(
  parsed: ParsedCommandEnvelope,
): NorthboundComparableIdentity {
  const semanticPayload = commandSemanticPayload(parsed);
  const derivedIdentity = buildMessageIdempotencyIdentity({
    actingPartyRefOrNull: parsed.actorContext.principal_ref,
    businessPartitionRefs: parsed.command.period ? [parsed.command.period] : parsed.command.requested_scope,
    channelRef: "channel.api.command.admission",
    consumerRef: "control-plane-api.northbound-boundary",
    familyRef: "ApiCommandReceipt",
    headerProfileRefs: [parsed.command.mutation_precondition_binding.profile_code],
    payload: semanticPayload,
    policyRefOrNull: parsed.command.if_match_policy_snapshot_hash,
    producerRef: "control-plane-api.command-handler",
    scopeRef: "NORTHBOUND_COMMAND",
    semanticOperationRef: parsed.command.command_type,
    semanticTargetRef: semanticTargetRef(parsed),
    sourceRecordRef: `command.${parsed.command.command_type}.${semanticTargetRef(parsed)}`,
    sourceRecordVersionHash: stableJsonHash(semanticPayload),
    subjectRefOrNull: parsed.actorContext.session_ref,
    tenantId: parsed.command.tenant_id,
  });

  return {
    derivedIdentity,
    duplicateMeaningKey: derivedIdentity.duplicateMeaningKey,
    idempotencyKey: parsed.command.idempotency_key,
    namespaceTuple: derivedIdentity.namespaceTuple,
    requestBodyHash: derivedIdentity.requestBodyHash,
    requestHash: derivedIdentity.requestHash,
  };
}

export function evaluateCommandIdempotency(
  parsed: ParsedCommandEnvelope,
  existingRecord: NorthboundIdempotencyRecord | null,
): CommandIdempotencyDecision {
  const comparableIdentity = buildNorthboundComparableIdentity(parsed);

  if (!existingRecord) {
    return {
      outcome: "ACCEPT_NEW",
      comparableIdentity,
      requestHash: comparableIdentity.requestHash,
    };
  }

  const collision = classifyIdempotencyCollision(
    existingRecord.comparableIdentity,
    comparableIdentity,
  );
  if (
    existingRecord.comparableIdentity.idempotencyKey === comparableIdentity.idempotencyKey &&
    existingRecord.comparableIdentity.requestHash === comparableIdentity.requestHash &&
    collision === "NONE"
  ) {
    return {
      outcome: "RETURN_EXISTING_RECEIPT",
      comparableIdentity,
      existingReceipt: existingRecord.receipt,
      requestHash: comparableIdentity.requestHash,
    };
  }

  if (collision === "BODY_COLLISION") {
    return {
      outcome: "IDEMPOTENCY_COLLISION",
      comparableIdentity,
      requestHash: comparableIdentity.requestHash,
      reasonCodes: ["IDEMPOTENCY_BODY_COLLISION"],
      existingReceiptRefOrNull: existingRecord.receipt.receipt_id,
    };
  }

  if (collision === "IDENTITY_NAMESPACE_COLLISION") {
    return {
      outcome: "IDEMPOTENCY_COLLISION",
      comparableIdentity,
      requestHash: comparableIdentity.requestHash,
      reasonCodes: ["IDEMPOTENCY_NAMESPACE_COLLISION"],
      existingReceiptRefOrNull: existingRecord.receipt.receipt_id,
    };
  }

  return {
    outcome: "ACCEPT_NEW",
    comparableIdentity,
    requestHash: comparableIdentity.requestHash,
  };
}
